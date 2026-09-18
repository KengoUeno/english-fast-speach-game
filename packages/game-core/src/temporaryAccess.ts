import { isPackOwned, type OwnedPackIds } from './ownership.ts';

/**
 * 一時解放（Sprint 4 機能B/C/D）の状態を、購入状態（`ownershipStore`）とは完全に分離して
 * 保持するストア。
 *
 * - 保存内容: packId -> 有効期限(絶対時刻ms)
 * - 判定は常に「現在時刻(nowMs)を引数で受け取る」形にし、内部でDate.now()を読まない
 * - ここに乗る値はあくまで「一時解放中」であり「所有している」ではない。
 *   ストア画面の購入済み表示・購入の復元・共有コードの発行可否の判定は、この状態を
 *   一切参照せず `ownershipStore`（購入済み ∪ デバッグ注入）のみを見ること。
 * - アプリのストレージをクリアすれば（永続化層側の責務で）この状態も消え、
 *   対象パックは再びロックされる。
 */
export type TemporaryUnlocks = ReadonlyMap<string, number>;

type Listener = (entries: TemporaryUnlocks) => void;

class TemporaryAccessStore {
  private entries = new Map<string, number>();
  private listeners = new Set<Listener>();

  /** コード検証成功時に呼ぶ: packIdを有効期限(絶対時刻ms)つきで一時解放する */
  unlock(packId: string, expiresAtMs: number): void {
    this.entries.set(packId, expiresAtMs);
    this.emit();
  }

  /** 永続化層からの読み込み用: 保存済みの複数エントリを一括で反映する */
  replaceAll(entries: Iterable<readonly [string, number]>): void {
    this.entries = new Map(entries);
    this.emit();
  }

  getAll(): TemporaryUnlocks {
    return new Map(this.entries);
  }

  /** 現在時刻(nowMs)を引数で受け取る純粋な期限判定（Date.now()は読まない） */
  isUnlocked(packId: string, nowMs: number): boolean {
    const expiresAtMs = this.entries.get(packId);
    return expiresAtMs !== undefined && isTemporaryUnlockValid(expiresAtMs, nowMs);
  }

  /** 現在(nowMs時点で)有効な一時解放パックID集合 */
  getActivePackIds(nowMs: number): ReadonlySet<string> {
    const active = new Set<string>();
    for (const [packId, expiresAtMs] of this.entries) {
      if (isTemporaryUnlockValid(expiresAtMs, nowMs)) active.add(packId);
    }
    return active;
  }

  /** アプリのストレージをクリア（再インストール相当）した状態を模して全消去する */
  clear(): void {
    this.entries = new Map();
    this.emit();
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    listener(this.getAll());
    return () => {
      this.listeners.delete(listener);
    };
  }

  private emit(): void {
    const snapshot = this.getAll();
    for (const listener of this.listeners) listener(snapshot);
  }
}

/** アプリ全体で単一のインスタンスを共有する */
export const temporaryAccessStore = new TemporaryAccessStore();

/**
 * 現在時刻(nowMs)を引数で受け取る純粋関数。単体テストで「期限内は有効／期限後は無効」の
 * 両方を検証する（sprint-4.md 契約: 機能Cの中心）。
 */
export function isTemporaryUnlockValid(expiresAtMs: number, nowMs: number): boolean {
  return nowMs < expiresAtMs;
}

/** 残り時間(ms)。期限切れの場合は0 */
export function getRemainingMs(expiresAtMs: number, nowMs: number): number {
  return Math.max(0, expiresAtMs - nowMs);
}

/**
 * プレイ可否 = 購入済み(ownedPackIds) ∪ 一時解放中(有効期限内のtempUnlockedPackIds) の和。
 * ストア画面の表示・購入の復元・共有コード発行可否の判定にはこの関数を使わないこと
 * （それらは購入状態のみを見る `isPackOwned` を直接使う）。
 */
export function isPackPlayable(
  pack: { id: string; isFree: boolean },
  ownedPackIds: OwnedPackIds,
  tempUnlockedPackIds: ReadonlySet<string>
): boolean {
  return isPackOwned(pack, ownedPackIds) || tempUnlockedPackIds.has(pack.id);
}
