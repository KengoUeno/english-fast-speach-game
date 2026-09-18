import type { Card } from './types/card.ts';

export const STARTING_SCORE = 0;
export const CORRECT_ANSWER_POINTS = 1;
export const COUNTDOWN_SECONDS = 3;

/** スタート設定画面で選べる制限時間（秒） */
export const TIME_OPTIONS = [
  { value: 60, label: '1 min' },
  { value: 180, label: '3 min' },
  { value: 300, label: '5 min' },
] as const;

export const DEFAULT_GAME_TIME_SEC = TIME_OPTIONS[0].value;

/**
 * ランダムにカードを1枚選ぶ。excludeIdsで既出のカードを除外することで、
 * 同じゲーム内で同じカードが重複して出ないようにする。
 * 全カードを出し切った場合は除外を無視して全体から選び直す（周回）。
 */
export function pickRandomCard(cards: Card[], excludeIds: ReadonlySet<number> = new Set()): Card | null {
  if (cards.length === 0) return null;

  const available = cards.filter((card) => !excludeIds.has(card.id));
  const pool = available.length > 0 ? available : cards;

  const randomIndex = Math.floor(Math.random() * pool.length);
  return pool[randomIndex];
}

export function applyCorrectAnswer(score: number): number {
  return score + CORRECT_ANSWER_POINTS;
}

export function computeRemainingSeconds(
  startedAt: number,
  durationSec: number,
  now: number = Date.now()
): number {
  const elapsed = Math.floor((now - startedAt) / 1000);
  return Math.max(durationSec - elapsed, 0);
}

export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
