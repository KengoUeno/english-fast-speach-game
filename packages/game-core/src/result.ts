/**
 * リザルト画面の演出（Sprint 2 機能C）に必要な純粋計算ロジック。
 * ゲームエンジン本体（gameEngine.ts / useGameEngine.ts）のスコアリングやフロー計算には
 * 手を加えず、リザルト表示のために正解数・スキップ数から導出する値だけをここに切り出す。
 */

/**
 * 正解数とスキップ数から正答率(%, 0〜100の整数)を計算する。
 * 1問も出題されなかった場合（正解0・スキップ0）は NaN/Infinity を避けるため 0 を返す。
 */
export function computeAccuracyPercent(correctCount: number, skipCount: number): number {
  const total = correctCount + skipCount;
  if (total <= 0) return 0;
  return Math.round((correctCount / total) * 100);
}

/**
 * スコアに応じた称賛メッセージの段階。0点でも否定的にならない前向きな文言にする。
 * スコアが高いほど熱量の高いメッセージになるよう5段階に分ける。
 */
export const PRAISE_TIERS = [
  { min: 0, max: 0, message: 'まずは1周お疲れさま！次はきっと読み切れる！' },
  { min: 1, max: 2, message: 'ナイストライ！声に出す感覚がつかめてきた！' },
  { min: 3, max: 5, message: 'いい調子！息もぴったり合ってきた！' },
  { min: 6, max: 9, message: 'かなり読めてる！息つく間もない好ペース！' },
  { min: 10, max: Infinity, message: 'スゴイ！読みのスピード、プロ級！' },
] as const;

/** スコアに応じた称賛メッセージを返す。負のスコアは0点扱いにフォールバックする。 */
export function getPraiseMessage(score: number): string {
  const safeScore = Number.isFinite(score) && score > 0 ? score : 0;
  const tier = PRAISE_TIERS.find((t) => safeScore >= t.min && safeScore <= t.max);
  return (tier ?? PRAISE_TIERS[PRAISE_TIERS.length - 1]).message;
}
