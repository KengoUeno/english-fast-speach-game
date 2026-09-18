import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Purchases, { type PurchasesError } from 'react-native-purchases';
import { PACKS, findPackByProductId, getPaidProductIds, ownershipStore, type OwnedPackIds } from 'game-core';
import type { BannerMessage } from '../components/MessageBanner';

/**
 * RevenueCat連携（Sprint 3 機能B）。前作 `taboo-english-game` の `apps/mobile/lib/iap.tsx` の
 * パターンを踏襲する。
 *
 * react-native-purchasesはExpo Webにネイティブ実装を持たないが、パッケージ自体が
 * Platform.OS==='web'を検出して「ブラウザモード」（ネイティブモジュールを一切呼ばない
 * スタブ実装）に自動的に切り替わるため、この静的importだけではクラッシュしない
 * （node_modules/react-native-purchases/dist/utils/environment.js の shouldUseBrowserMode 参照）。
 * その上で、APIキー未設定時は configure() 自体を呼ばずに安全に停止する（指針1）。
 *
 * 所有パックの判定はRevenueCatの呼び出しから完全に切り離し、game-core の
 * `ownershipStore` という1箇所の状態ストアに集約している（指針2）。
 * このProviderの役割は「RevenueCatの結果をownershipStoreに書き込むこと」と
 * 「ownershipStoreの値をReactコンポーネントに配ること」だけであり、
 * Evaluator/テストはownershipStoreへ直接（またはデバッグ注入経路経由で）値を注入できる。
 */

const REVENUECAT_API_KEY_IOS = process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY ?? '';
const REVENUECAT_API_KEY_ANDROID = process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY ?? '';

/** デバッグ/テスト用: 所有パックIDを永続化するストレージキー（Web上はlocalStorageにマップされる） */
const DEBUG_OWNED_PACKS_KEY = 'oitsuke.debugOwnedPackIds';

function currentApiKey(): string {
  return Platform.OS === 'ios' ? REVENUECAT_API_KEY_IOS : REVENUECAT_API_KEY_ANDROID;
}

/** RevenueCatエラーから `RC-<code>` 形式の短いエラーコードを作る（教訓9） */
function revenueCatErrorCode(e: unknown): string {
  const code = (e as PurchasesError | undefined)?.code;
  return typeof code === 'number' ? `RC-${code}` : 'RC-00';
}

/** `MessageBanner` が受け取る形と同じ（Sprint 4でコード入力画面にも同じバナーを再利用するため一般化） */
export type StoreMessage = BannerMessage;

interface IAPContextValue {
  /** RevenueCatの初期化（またはキー未設定によるスキップ判定）が完了したか */
  ready: boolean;
  /** 現在所有していると判定されるパックID集合（購入済み ∪ デバッグ注入。starterなど無料パックは含まない） */
  ownedPackIds: OwnedPackIds;
  /** 現在購入処理中のパックID（ボタンのローディング表示・二重購入防止用） */
  purchasingPackId: string | null;
  /** 購入の復元処理中かどうか */
  restoring: boolean;
  /** 直近の操作結果メッセージ（「準備中」「RC-xx」などのエラーコードを含む） */
  message: StoreMessage | null;
  purchasePack: (packId: string) => Promise<void>;
  restorePurchases: () => Promise<void>;
  clearMessage: () => void;
}

const IAPContext = createContext<IAPContextValue | null>(null);

export function IAPProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [ownedPackIds, setOwnedPackIds] = useState<OwnedPackIds>(new Set());
  const [purchasingPackId, setPurchasingPackId] = useState<string | null>(null);
  const [restoring, setRestoring] = useState(false);
  const [message, setMessage] = useState<StoreMessage | null>(null);
  // 連打で購入処理が二重に始まらないようにする同期ガード（setStateは非同期なため）
  const purchasingRef = useRef(false);

  // ownershipStore（購入済み ∪ デバッグ注入の和集合）を購読し、Reactの状態に反映する
  useEffect(() => {
    const unsubscribe = ownershipStore.subscribe((ids) => setOwnedPackIds(ids));
    return unsubscribe;
  }, []);

  // 起動時: (1) デバッグ注入の永続値をロードし、(2) RevenueCatキーが設定されていれば
  // 購入状態を取得する。キー未設定なら安全に何もせず ready=true にする（指針1）。
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const stored = await AsyncStorage.getItem(DEBUG_OWNED_PACKS_KEY);
        if (stored && !cancelled) {
          const ids: unknown = JSON.parse(stored);
          if (Array.isArray(ids)) {
            ownershipStore.setDebugOwnedPackIds(ids.filter((id): id is string => typeof id === 'string'));
          }
        }
      } catch {
        // 壊れた保存値は無視する（ゲーム進行に影響させない）
      }

      const apiKey = currentApiKey();
      if (!apiKey) {
        console.warn(
          'RevenueCat APIキーが未設定です（EXPO_PUBLIC_REVENUECAT_IOS_KEY / _ANDROID_KEY）。課金機能は準備中として動作します。'
        );
        if (!cancelled) setReady(true);
        return;
      }

      try {
        Purchases.configure({ apiKey });
        const info = await Purchases.getCustomerInfo();
        if (!cancelled) applyPurchasedProductIds(info.allPurchasedProductIdentifiers);
      } catch {
        // 起動時の取得失敗はゲーム進行を妨げない（無料パックはこの状態でも遊べる）
      } finally {
        if (!cancelled) setReady(true);
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // テスト/デバッグ用のグローバル注入口（Sprint 3 指針2）。
  // Playwright等から `window.__oitsukeSetOwnedPacks(['travel'])` を呼ぶと即座に反映され、
  // AsyncStorage（Web上はlocalStorage）にも保存されるため再読み込み後も維持される。
  useEffect(() => {
    const target = globalThis as unknown as {
      __oitsukeSetOwnedPacks?: (ids: string[]) => Promise<void>;
      __oitsukeGetOwnedPacks?: () => string[];
    };
    target.__oitsukeSetOwnedPacks = async (ids: string[]) => {
      const list = Array.isArray(ids) ? ids.filter((id) => typeof id === 'string') : [];
      ownershipStore.setDebugOwnedPackIds(list);
      try {
        await AsyncStorage.setItem(DEBUG_OWNED_PACKS_KEY, JSON.stringify(list));
      } catch {
        // 保存失敗はテスト用注入の即時反映には影響しない
      }
    };
    target.__oitsukeGetOwnedPacks = () => [...ownershipStore.getOwnedPackIds()];
    return () => {
      delete target.__oitsukeSetOwnedPacks;
      delete target.__oitsukeGetOwnedPacks;
    };
  }, []);

  const applyPurchasedProductIds = useCallback((productIds: readonly string[]) => {
    const packIds = new Set<string>();
    for (const id of productIds) {
      const pack = findPackByProductId(id);
      if (pack) packIds.add(pack.id);
    }
    ownershipStore.setPurchasedPackIds(packIds);
  }, []);

  const clearMessage = useCallback(() => setMessage(null), []);

  const purchasePack = useCallback(
    async (packId: string) => {
      if (purchasingRef.current || restoring) return;

      const pack = PACKS.find((p) => p.id === packId);
      if (!pack || pack.isFree || !pack.productId) {
        setMessage({ tone: 'error', text: 'このパックは購入できません。(APP-01)' });
        return;
      }

      const apiKey = currentApiKey();
      if (getPaidProductIds().length === 0 || !apiKey) {
        setMessage({ tone: 'info', text: 'この機能はまだ準備中です。' });
        return;
      }

      purchasingRef.current = true;
      setPurchasingPackId(packId);
      setMessage(null);

      try {
        const offerings = await Purchases.getOfferings();
        const pkg = Object.values(offerings.all)
          .flatMap((offering) => offering.availablePackages)
          .find((candidate) => candidate.product.identifier === pack.productId);

        if (!pkg) {
          setMessage({ tone: 'error', text: 'この商品は現在購入できません。(APP-02)' });
          return;
        }

        const { customerInfo } = await Purchases.purchasePackage(pkg);
        applyPurchasedProductIds(customerInfo.allPurchasedProductIdentifiers);
        setMessage({ tone: 'success', text: `「${pack.title}」を購入しました！` });
      } catch (e) {
        const err = e as PurchasesError;
        if (!err.userCancelled) {
          setMessage({
            tone: 'error',
            text: `購入に失敗しました。しばらくしてからもう一度お試しください。(${revenueCatErrorCode(e)})`,
          });
        }
      } finally {
        purchasingRef.current = false;
        setPurchasingPackId(null);
      }
    },
    [applyPurchasedProductIds, restoring]
  );

  const restorePurchases = useCallback(async () => {
    if (restoring || purchasingRef.current) return;

    const apiKey = currentApiKey();
    if (!apiKey) {
      setMessage({ tone: 'info', text: 'この機能はまだ準備中です。' });
      return;
    }

    setRestoring(true);
    setMessage(null);
    try {
      const info = await Purchases.restorePurchases();
      applyPurchasedProductIds(info.allPurchasedProductIdentifiers);
      setMessage({ tone: 'success', text: '購入済みのパックを復元しました。' });
    } catch (e) {
      setMessage({
        tone: 'error',
        text: `復元に失敗しました。しばらくしてからもう一度お試しください。(${revenueCatErrorCode(e)})`,
      });
    } finally {
      setRestoring(false);
    }
  }, [applyPurchasedProductIds, restoring]);

  const value = useMemo(
    () => ({
      ready,
      ownedPackIds,
      purchasingPackId,
      restoring,
      message,
      purchasePack,
      restorePurchases,
      clearMessage,
    }),
    [ready, ownedPackIds, purchasingPackId, restoring, message, purchasePack, restorePurchases, clearMessage]
  );

  return <IAPContext.Provider value={value}>{children}</IAPContext.Provider>;
}

export function useIAPContext(): IAPContextValue {
  const ctx = useContext(IAPContext);
  if (!ctx) {
    throw new Error('useIAPContext must be used within an IAPProvider');
  }
  return ctx;
}
