import type { Card } from './card.ts';

/**
 * テーマ別パック（Sprint 3 機能A）。
 * 無料スターターパックと有料パック（旅行/ビジネス/動物/食べ物）の両方をこの型で表す。
 *
 * 収録問題数は `cards.length` を常に正とする（別フィールドに複製すると
 * 実データとの食い違い＝バグの温床になるため、意図的に持たせていない）。
 */
export interface Pack {
  /** パックの一意な識別子。所有状態の判定・出題対象パックの選択に使う */
  id: string;
  /** ストア・スタート設定画面に表示するパック名 */
  title: string;
  /** テーマを表す絵文字 */
  emoji: string;
  /** 無料パックかどうか */
  isFree: boolean;
  /**
   * 有料パックのみ。iOS/Android共通のRevenueCat商品ID。
   * この値がパック定義の唯一の記述場所であり、画面コードには一切ハードコードしない。
   */
  productId?: string;
  /** 有料パックのみ。円単位の表示価格 */
  priceJPY?: number;
  /** このパックに収録されたお題カード */
  cards: Card[];
}
