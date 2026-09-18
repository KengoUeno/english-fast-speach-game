import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeAccuracyPercent, getPraiseMessage, PRAISE_TIERS } from './result.ts';

test('computeAccuracyPercent matches correct/(correct+skip) as a percentage', () => {
  assert.equal(computeAccuracyPercent(3, 1), 75);
  assert.equal(computeAccuracyPercent(1, 1), 50);
  assert.equal(computeAccuracyPercent(0, 4), 0);
  assert.equal(computeAccuracyPercent(4, 0), 100);
});

test('computeAccuracyPercent never returns NaN or Infinity when no cards were played', () => {
  const result = computeAccuracyPercent(0, 0);
  assert.equal(Number.isNaN(result), false);
  assert.equal(Number.isFinite(result), true);
  assert.equal(result, 0);
});

test('computeAccuracyPercent rounds to the nearest whole percent', () => {
  assert.equal(computeAccuracyPercent(1, 2), 33);
  assert.equal(computeAccuracyPercent(2, 1), 67);
});

test('getPraiseMessage returns a non-empty, positive message for a score of 0', () => {
  const message = getPraiseMessage(0);
  assert.ok(message.length > 0);
  assert.doesNotMatch(message, /だめ|失敗|残念|ダメ/);
});

test('getPraiseMessage differs between a high score and a score of 0', () => {
  assert.notEqual(getPraiseMessage(0), getPraiseMessage(12));
});

test('getPraiseMessage covers every documented tier with a distinct message', () => {
  const messages = new Set(PRAISE_TIERS.map((tier) => tier.message));
  assert.equal(messages.size, PRAISE_TIERS.length);
  assert.equal(PRAISE_TIERS.length, 5);
});

test('getPraiseMessage never returns an empty string for any non-negative score', () => {
  for (const score of [0, 1, 2, 3, 5, 6, 9, 10, 50]) {
    assert.ok(getPraiseMessage(score).length > 0);
  }
});
