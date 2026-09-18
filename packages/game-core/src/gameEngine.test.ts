import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  applyCorrectAnswer,
  computeRemainingSeconds,
  formatTime,
  pickRandomCard,
  STARTING_SCORE,
  CORRECT_ANSWER_POINTS,
} from './gameEngine.ts';
import type { Card } from './types/card.ts';

const CARDS: Card[] = [
  { id: 1, targetWord: 'A', description: 'a a a a a a a a' },
  { id: 2, targetWord: 'B', description: 'b b b b b b b b' },
  { id: 3, targetWord: 'C', description: 'c c c c c c c c' },
];

test('starting score is 0 and a correct answer adds exactly 1 point', () => {
  assert.equal(STARTING_SCORE, 0);
  assert.equal(CORRECT_ANSWER_POINTS, 1);
  assert.equal(applyCorrectAnswer(0), 1);
  assert.equal(applyCorrectAnswer(5), 6);
});

test('pickRandomCard never returns an excluded card while alternatives remain', () => {
  for (let i = 0; i < 50; i++) {
    const excluded = new Set([1, 2]);
    const card = pickRandomCard(CARDS, excluded);
    assert.equal(card?.id, 3);
  }
});

test('pickRandomCard returns null for an empty pool', () => {
  assert.equal(pickRandomCard([]), null);
});

test('pickRandomCard falls back to the full pool once every card is excluded', () => {
  const excluded = new Set([1, 2, 3]);
  const card = pickRandomCard(CARDS, excluded);
  assert.ok(card !== null);
  assert.ok([1, 2, 3].includes(card!.id));
});

test('computeRemainingSeconds counts down from the configured duration', () => {
  const start = 1_000_000;
  assert.equal(computeRemainingSeconds(start, 60, start), 60);
  assert.equal(computeRemainingSeconds(start, 60, start + 30_000), 30);
  assert.equal(computeRemainingSeconds(start, 60, start + 60_000), 0);
  // never goes negative
  assert.equal(computeRemainingSeconds(start, 60, start + 120_000), 0);
});

test('formatTime pads seconds to two digits', () => {
  assert.equal(formatTime(0), '0:00');
  assert.equal(formatTime(9), '0:09');
  assert.equal(formatTime(65), '1:05');
  assert.equal(formatTime(180), '3:00');
});
