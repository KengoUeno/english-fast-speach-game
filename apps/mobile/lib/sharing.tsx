import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getPackById,
  generateShareCode,
  verifyShareCode,
  getNowMs,
  setDebugTimeOffsetMs,
  getDebugTimeOffsetMs,
  subscribeDebugTimeOffset,
  temporaryAccessStore,
  type OwnedPackIds,
  type TemporaryUnlocks,
} from 'game-core';

/**
 * パックの一時共有（Sprint 4）。RevenueCat連携(`lib/iap.tsx`)とは完全に独立したProviderにし、
 * 「一時解放の状態は購入状態と混ざらない」という契約を、コード構造の面からも保証する。
 *
 * - 一時解放の状態(`temporaryAccessStore`)は購入状態(`ownershipStore`)とは別のストア・
 *   別の永続化キー(`TEMP_UNLOCKS_STORAGE_KEY`)に保存する。
 * - 期限判定そのもの（`verifyShareCode` / `temporaryAccessStore.isUnlocked`）は
 *   現在時刻(nowMs)を引数で受け取る純粋関数（game-core側）。ここではその引数として
 *   渡す「今」を作り、開発時のみ有効な時刻オフセット機能（Evaluatorが期限切れを
 *   実操作で再現する手段）をグローバル関数として公開する。
 */

// RN/Expoのビルド（Metroのbabelトランスフォーム）がネイティブ・Web双方で
// 実行時グローバルとして提供する定数。@types/react-native経由で型がある場合もあるが、
// 環境差異で解決できないケースに備えてここで明示的に宣言しておく。
declare const __DEV__: boolean;

/** 一時解放の永続化キー。購入状態(iap.tsxのデバッグキー含む)とは別の名前空間にする */
const TEMP_UNLOCKS_STORAGE_KEY = 'oitsuke.temporaryUnlocks';

/**
 * 開発用の時刻オフセットを永続化するキー。
 * オフセット自体はJSモジュール内のメモリ変数（clock.ts）だが、Evaluatorがフルページ
 * 遷移・リロードを挟んで「期限切れ後」を確認するケースに備え、この画面側で
 * AsyncStorage（Web上はlocalStorage）にも保存し、起動のたびに復元する。
 */
const DEBUG_TIME_OFFSET_STORAGE_KEY = 'oitsuke.debugTimeOffsetMs';

/** UIが定期的に「今」を更新する間隔。残り時間の表示をなめらかに進める */
const CLOCK_TICK_MS = 15_000;

/** コードに含めた（含まれていた）パック1件分の表示用情報 */
export interface SharedPackInfo {
  id: string;
  title: string;
  emoji: string;
}

export interface ShareIssueSuccess {
  ok: true;
  code: string;
  expiresAtMs: number;
  /** このコードに実際に含まれた全パック（発行時点でホストが購入済みの全パック） */
  packs: SharedPackInfo[];
}
export interface ShareIssueFailure {
  ok: false;
  message: string;
}
export type ShareIssueResult = ShareIssueSuccess | ShareIssueFailure;

export interface RedeemSuccess {
  ok: true;
  /** コードに含まれていた全パック（1回の入力で一括解放される） */
  packs: SharedPackInfo[];
  expiresAtMs: number;
}
export interface RedeemFailure {
  ok: false;
  message: string;
  errorCode: string;
}
export type RedeemResult = RedeemSuccess | RedeemFailure;

interface SharingContextValue {
  /** 永続化された一時解放状態の読み込みが完了したか */
  ready: boolean;
  /** UIが表示・判定に使う「今」(ms)。開発用オフセットを反映済み */
  now: number;
  /** packId -> 有効期限(ms) の生データ（購入状態とは別ストア） */
  tempUnlocks: TemporaryUnlocks;
  /** 現在(nowMs時点で)有効な一時解放パックID集合 */
  tempUnlockedPackIds: ReadonlySet<string>;
  /**
   * 共有コードを発行する（ホスト側）。パックを選ぶ操作はなく、`ownedPackIds`
   * （購入状態のみ。一時解放中というだけのパックは対象外）に含まれる全パックを
   * まとめて1つのコードにする単一の操作。
   */
  issueShareCode: (ownedPackIds: OwnedPackIds) => ShareIssueResult;
  /** コードを検証し、成功時はこの端末を一時解放する（ゲスト側） */
  redeemCode: (rawInput: string) => RedeemResult;
}

/** packIdから表示用の{id,title,emoji}を作る。未知のIDでもクラッシュしないようフォールバックする */
function toSharedPackInfo(packId: string): SharedPackInfo {
  const pack = getPackById(packId);
  return { id: packId, title: pack?.title ?? packId, emoji: pack?.emoji ?? '🎁' };
}

const SharingContext = createContext<SharingContextValue | null>(null);

export function SharingProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [tempUnlocks, setTempUnlocks] = useState<TemporaryUnlocks>(new Map());
  const [now, setNow] = useState<number>(() => getNowMs());

  // 起動時: 永続化された一時解放状態を読み込む（購入状態とは完全に別のストレージキー）。
  // 読み込み失敗・壊れた保存値はゲーム進行に影響させず無視する。
  // あわせて、開発用の時刻オフセット（Evaluatorがフルページ遷移・リロードを挟んでも
  // 「期限切れ後」の状態を保てるようにするための永続化）も同時に復元する。
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const stored = await AsyncStorage.getItem(TEMP_UNLOCKS_STORAGE_KEY);
        if (stored && !cancelled) {
          const raw: unknown = JSON.parse(stored);
          if (Array.isArray(raw)) {
            const entries = raw.filter(
              (entry): entry is [string, number] =>
                Array.isArray(entry) &&
                entry.length === 2 &&
                typeof entry[0] === 'string' &&
                typeof entry[1] === 'number'
            );
            temporaryAccessStore.replaceAll(entries);
          }
        }
      } catch {
        // 壊れた保存値は無視する
      }

      if (__DEV__) {
        try {
          const storedOffset = await AsyncStorage.getItem(DEBUG_TIME_OFFSET_STORAGE_KEY);
          if (storedOffset && !cancelled) {
            const parsed = parseInt(storedOffset, 10);
            if (Number.isFinite(parsed)) {
              setDebugTimeOffsetMs(parsed);
            }
          }
        } catch {
          // 壊れた保存値は無視する（オフセット0のまま=実時刻で動作する）
        }
      }

      if (!cancelled) {
        setReady(true);
        setNow(getNowMs());
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // temporaryAccessStoreの変化をReactの状態に反映し、変わるたびに永続化する
  useEffect(() => {
    const unsubscribe = temporaryAccessStore.subscribe((entries) => {
      setTempUnlocks(entries);
      AsyncStorage.setItem(TEMP_UNLOCKS_STORAGE_KEY, JSON.stringify([...entries])).catch(() => {
        // 保存失敗はReact stateへの即時反映には影響させない
      });
    });
    return unsubscribe;
  }, []);

  // 「今」を定期的に更新する（残り時間表示のカウントダウン・期限到来による自動再ロックの反映）。
  // 加えて開発用の時刻オフセット変更（Evaluatorが期限切れを再現する手段）が起きた瞬間にも
  // 即座に再計算し、ナビゲーションなしで画面が再ロック状態を反映するようにする。
  // オフセットが変わるたびに永続化もする（フルページ遷移・リロードを挟んでも維持するため）。
  useEffect(() => {
    const tick = (offsetMs: number) => {
      setNow(getNowMs());
      if (__DEV__) {
        AsyncStorage.setItem(DEBUG_TIME_OFFSET_STORAGE_KEY, String(offsetMs)).catch(() => {
          // 保存失敗はReact stateへの即時反映には影響させない
        });
      }
    };
    const interval = setInterval(() => setNow(getNowMs()), CLOCK_TICK_MS);
    const unsubscribeOffset = subscribeDebugTimeOffset(tick);
    return () => {
      clearInterval(interval);
      unsubscribeOffset();
    };
  }, []);

  // Evaluator用の時刻オフセット注入口（開発時のみ）。
  // Expo Web の開発者コンソールから `window.__oitsukeAdvanceTimeMs(3 * 60 * 60 * 1000 + 60000)`
  // のように呼べば、実際に3時間待たずに「発行から3時間経過後」を再現できる。
  useEffect(() => {
    if (!__DEV__) return undefined;

    const target = globalThis as unknown as {
      __oitsukeAdvanceTimeMs?: (ms: number) => void;
      __oitsukeSetTimeOffsetMs?: (ms: number) => void;
      __oitsukeGetTimeOffsetMs?: () => number;
    };

    // 現在のオフセットに加算して進める（「発行時刻から3時間+α」を素直に指定できる）
    target.__oitsukeAdvanceTimeMs = (ms: number) => {
      setDebugTimeOffsetMs(getDebugTimeOffsetMs() + ms);
      setNow(getNowMs());
    };
    // オフセットを絶対値として指定したい場合用
    target.__oitsukeSetTimeOffsetMs = (ms: number) => {
      setDebugTimeOffsetMs(ms);
      setNow(getNowMs());
    };
    target.__oitsukeGetTimeOffsetMs = () => getDebugTimeOffsetMs();

    return () => {
      delete target.__oitsukeAdvanceTimeMs;
      delete target.__oitsukeSetTimeOffsetMs;
      delete target.__oitsukeGetTimeOffsetMs;
    };
  }, []);

  const tempUnlockedPackIds = useMemo(
    () => temporaryAccessStore.getActivePackIds(now),
    [tempUnlocks, now]
  );

  const issueShareCode = useCallback((ownedPackIds: OwnedPackIds): ShareIssueResult => {
    // 発行可否・発行内容は購入状態(ownedPackIds)のみを見る。一時解放中というだけのパックは
    // 対象に含めない（呼び出し側は購入状態(useIAPContextのownedPackIds)を渡すこと）。
    // 無料パックはそもそも共有の意味がないため、generateShareCode側で自動的に除外される。
    try {
      const { code, expiresAtMs, packIds } = generateShareCode(ownedPackIds, getNowMs());
      const packs = packIds.map((id) => toSharedPackInfo(id));
      return { ok: true, code, expiresAtMs, packs };
    } catch {
      // 呼び出し側(store.tsx)は購入済みパックが0件のときに発行導線自体を出さない設計だが、
      // 万一呼ばれても画面がクラッシュしないよう安全に失敗を返す
      return { ok: false, message: '購入済みのパックがないため発行できません。(APP-33)' };
    }
  }, []);

  const redeemCode = useCallback((rawInput: string): RedeemResult => {
    const result = verifyShareCode(rawInput, getNowMs());

    if (!result.ok) {
      const message =
        result.reason === 'expired'
          ? `このコードは有効期限が切れています。(${result.errorCode})`
          : result.reason === 'invalid-format'
            ? `コードの形式が正しくありません。(${result.errorCode})`
            : `無効なコードです。(${result.errorCode})`;
      return { ok: false, message, errorCode: result.errorCode };
    }

    // 一時解放状態(temporaryAccessStore)にのみ書き込む。購入状態(ownershipStore)は一切触らない。
    // コードに含まれていた全パックを1回のredemptionで一括解放する（パックごとの個別入力はしない）。
    for (const packId of result.packIds) {
      temporaryAccessStore.unlock(packId, result.expiresAtMs);
    }

    return {
      ok: true,
      packs: result.packIds.map((id) => toSharedPackInfo(id)),
      expiresAtMs: result.expiresAtMs,
    };
  }, []);

  const value = useMemo<SharingContextValue>(
    () => ({ ready, now, tempUnlocks, tempUnlockedPackIds, issueShareCode, redeemCode }),
    [ready, now, tempUnlocks, tempUnlockedPackIds, issueShareCode, redeemCode]
  );

  return <SharingContext.Provider value={value}>{children}</SharingContext.Provider>;
}

export function useSharingContext(): SharingContextValue {
  const ctx = useContext(SharingContext);
  if (!ctx) {
    throw new Error('useSharingContext must be used within a SharingProvider');
  }
  return ctx;
}
