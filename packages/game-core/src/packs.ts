import type { Pack } from './types/pack.ts';
import { starterCards } from './starterCards.ts';
import { travelCards } from './packs/travelCards.ts';
import { businessCards } from './packs/businessCards.ts';
import { animalCards } from './packs/animalCards.ts';
import { foodCards } from './packs/foodCards.ts';

/**
 * 全パックの一覧（Sprint 3 機能A）。表示順＝ストア・スタート設定画面での表示順。
 * 有料パックの商品IDはここ1箇所にのみ記述する（画面コードにハードコードしない）。
 * 前作の教訓6（画面に出す商品は初回審査でまとめて提出する）を踏まえ、
 * このスプリントの完了をもってラインナップを凍結する初回4パック構成。
 */
export const PACKS: Pack[] = [
  {
    id: 'starter',
    title: 'スターター',
    emoji: '🎈',
    isFree: true,
    cards: starterCards,
  },
  {
    id: 'travel',
    title: '旅行',
    emoji: '✈️',
    isFree: false,
    productId: 'travel_pack_1',
    priceJPY: 100,
    cards: travelCards,
  },
  {
    id: 'business',
    title: 'ビジネス',
    emoji: '💼',
    isFree: false,
    productId: 'business_pack_1',
    priceJPY: 100,
    cards: businessCards,
  },
  {
    id: 'animals',
    title: '動物',
    emoji: '🐾',
    isFree: false,
    productId: 'animals_pack_1',
    priceJPY: 100,
    cards: animalCards,
  },
  {
    id: 'food',
    title: '食べ物',
    emoji: '🍔',
    isFree: false,
    productId: 'food_pack_1',
    priceJPY: 100,
    cards: foodCards,
  },
];

/** 何も所有していない状態で既定選択されるパック */
export const DEFAULT_PACK_ID = 'starter';

export function getPackById(id: string): Pack | undefined {
  return PACKS.find((pack) => pack.id === id);
}

/** 有料パックの商品ID一覧（RevenueCatのgetOfferings結果から該当パッケージを探す際に使う） */
export function getPaidProductIds(): string[] {
  return PACKS.filter((pack): pack is Pack & { productId: string } => Boolean(pack.productId)).map(
    (pack) => pack.productId
  );
}

/** RevenueCatの商品IDから、対応するパックを引く */
export function findPackByProductId(productId: string): Pack | undefined {
  return PACKS.find((pack) => pack.productId === productId);
}
