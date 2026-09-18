/**
 * 所有パックの判定をRevenueCatの呼び出しから切り離すための最小限の状態ストア（Sprint 3 指針2）。
 *
 * - RevenueCatから取得した購入済み商品ID→パックIDへの変換結果（`setPurchasedPackIds`）
 * - デバッグ/テスト用に外部から直接注入する所有パックID（`setDebugOwnedPackIds`）
 *
 * の2つのソースをマージして「実際に所有しているパックID集合」を1箇所で管理する。
 * RevenueCatが未設定・未初期化・Web環境で動かせない場合でも、後者の注入経路だけで
 * Evaluator（Playwright/Expo Web）が購入後の画面・パック選択・出題を検証できる。
 *
 * Sprint 4のパック一時共有（コード入力による一時解放）も、購入とは別の第3のソースとして
 * この層に乗せる想定（例: `setTemporarilyUnlockedPackIds`）。
 */
export type OwnedPackIds = ReadonlySet<string>;

type Listener = (ids: OwnedPackIds) => void;

class OwnershipStore {
  private purchased = new Set<string>();
  private debugOverride = new Set<string>();
  private listeners = new Set<Listener>();

  /** 現在「所有している」と判定されるパックID集合（購入済み ∪ デバッグ注入） */
  getOwnedPackIds(): OwnedPackIds {
    return new Set([...this.purchased, ...this.debugOverride]);
  }

  /** RevenueCatの購入状態（購入済み商品IDから変換したパックID集合）を反映する */
  setPurchasedPackIds(ids: Iterable<string>): void {
    this.purchased = new Set(ids);
    this.emit();
  }

  /**
   * テスト/デバッグ用: 外部から所有パックIDを直接注入する。
   * RevenueCatの実際の購入状態には一切影響しない（別ソースとして保持し、和集合で判定する）。
   */
  setDebugOwnedPackIds(ids: Iterable<string>): void {
    this.debugOverride = new Set(ids);
    this.emit();
  }

  /** 現在値を即座に受け取り、以後の変化も購読する。戻り値の関数で購読解除する */
  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    listener(this.getOwnedPackIds());
    return () => {
      this.listeners.delete(listener);
    };
  }

  private emit(): void {
    const snapshot = this.getOwnedPackIds();
    for (const listener of this.listeners) listener(snapshot);
  }
}

/** アプリ全体で単一のインスタンスを共有する（React再レンダーをまたいで状態を保持するため） */
export const ownershipStore = new OwnershipStore();

/** パックが「所有している」と扱えるかどうか（無料パックは常にtrue） */
export function isPackOwned(pack: { isFree: boolean; id: string }, ownedPackIds: OwnedPackIds): boolean {
  return pack.isFree || ownedPackIds.has(pack.id);
}
