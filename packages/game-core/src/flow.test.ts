import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  computeFlowDurationMs,
  computeFlowProgress,
  splitWords,
  LEAD_IN_MS,
  MS_PER_WORD,
  MIN_FLOW_MS,
  SPEED_OPTIONS,
  DEFAULT_MS_PER_WORD,
} from './flow.ts';

test('splitWords splits on whitespace and ignores extra spaces', () => {
  assert.deepEqual(splitWords('This  is   a test'), ['This', 'is', 'a', 'test']);
  assert.deepEqual(splitWords('  leading and trailing  '), ['leading', 'and', 'trailing']);
});

test('computeFlowDurationMs matches the documented formula for 8/12/20 words', () => {
  assert.equal(computeFlowDurationMs(8), LEAD_IN_MS + 8 * MS_PER_WORD); // 4200ms
  assert.equal(computeFlowDurationMs(12), LEAD_IN_MS + 12 * MS_PER_WORD); // 5800ms
  assert.equal(computeFlowDurationMs(20), LEAD_IN_MS + 20 * MS_PER_WORD); // 9000ms
});

test('computeFlowDurationMs never goes below MIN_FLOW_MS', () => {
  assert.equal(computeFlowDurationMs(0), MIN_FLOW_MS);
  assert.equal(computeFlowDurationMs(1), MIN_FLOW_MS);
});

test('12-word and 20-word cards have clearly different flow durations', () => {
  const twelve = computeFlowDurationMs(12);
  const twenty = computeFlowDurationMs(20);
  assert.ok(twenty > twelve, 'a 20-word description must take longer than a 12-word one');
  assert.ok(twenty - twelve >= 3000, 'the difference should be substantial (>=3s) and measurable');
});

test('a longer description always takes at least as long as a shorter one', () => {
  for (let n = 8; n < 20; n++) {
    assert.ok(computeFlowDurationMs(n + 1) > computeFlowDurationMs(n));
  }
});

test('computeFlowProgress stays at 0 during the lead-in period', () => {
  const total = computeFlowDurationMs(10);
  assert.equal(computeFlowProgress(0, total), 0);
  assert.equal(computeFlowProgress(LEAD_IN_MS - 1, total), 0);
  assert.equal(computeFlowProgress(LEAD_IN_MS, total), 0);
});

test('computeFlowProgress increases monotonically from 0 to 1 after lead-in', () => {
  const total = computeFlowDurationMs(10); // 5000ms
  const quarter = LEAD_IN_MS + (total - LEAD_IN_MS) * 0.25;
  const half = LEAD_IN_MS + (total - LEAD_IN_MS) * 0.5;

  const pQuarter = computeFlowProgress(quarter, total);
  const pHalf = computeFlowProgress(half, total);
  const pEnd = computeFlowProgress(total, total);

  assert.ok(pQuarter > 0 && pQuarter < pHalf);
  assert.ok(pHalf > pQuarter && pHalf < pEnd);
  assert.ok(Math.abs(pQuarter - 0.25) < 0.01);
  assert.ok(Math.abs(pHalf - 0.5) < 0.01);
  assert.equal(pEnd, 1);
});

test('computeFlowProgress clamps to 1 once the flow duration has elapsed', () => {
  const total = computeFlowDurationMs(10);
  assert.equal(computeFlowProgress(total * 999, total), 1);
});

test('computeFlowProgress never exceeds the 0..1 range', () => {
  const total = computeFlowDurationMs(15);
  for (let elapsed = -500; elapsed <= total + 5000; elapsed += 250) {
    const progress = computeFlowProgress(elapsed, total);
    assert.ok(progress >= 0 && progress <= 1, `progress out of range at elapsed=${elapsed}: ${progress}`);
  }
});

// --- スクロール速度選択（簡単/普通/難しい） ---

test('computeFlowDurationMs defaults to MS_PER_WORD ("普通") when no speed is given, for backward compatibility', () => {
  assert.equal(computeFlowDurationMs(12), computeFlowDurationMs(12, MS_PER_WORD));
  assert.equal(DEFAULT_MS_PER_WORD, MS_PER_WORD);
});

test('SPEED_OPTIONS has exactly 3 levels (easy/normal/hard) with the documented MS_PER_WORD values', () => {
  assert.equal(SPEED_OPTIONS.length, 3);
  const byLabel = Object.fromEntries(SPEED_OPTIONS.map((option) => [option.label, option.value]));
  assert.equal(byLabel['簡単'], 900);
  assert.equal(byLabel['普通'], 650);
  assert.equal(byLabel['難しい'], 480);
});

test('a slower speed level (higher msPerWord) always takes longer for the same word count', () => {
  const easy = SPEED_OPTIONS.find((o) => o.label === '簡単')!.value;
  const normal = SPEED_OPTIONS.find((o) => o.label === '普通')!.value;
  const hard = SPEED_OPTIONS.find((o) => o.label === '難しい')!.value;

  for (const wordCount of [8, 12, 20]) {
    const easyMs = computeFlowDurationMs(wordCount, easy);
    const normalMs = computeFlowDurationMs(wordCount, normal);
    const hardMs = computeFlowDurationMs(wordCount, hard);

    assert.ok(easyMs > normalMs, `easy(${easyMs}) should be slower than normal(${normalMs}) at ${wordCount} words`);
    assert.ok(normalMs > hardMs, `normal(${normalMs}) should be slower than hard(${hardMs}) at ${wordCount} words`);
  }
});

test('easy vs normal and normal vs hard differ clearly (>=500ms) at 12 words, matching the documented table', () => {
  const easy = SPEED_OPTIONS.find((o) => o.label === '簡単')!.value;
  const normal = SPEED_OPTIONS.find((o) => o.label === '普通')!.value;
  const hard = SPEED_OPTIONS.find((o) => o.label === '難しい')!.value;

  const easyMs = computeFlowDurationMs(12, easy); // 11800ms
  const normalMs = computeFlowDurationMs(12, normal); // 8800ms
  const hardMs = computeFlowDurationMs(12, hard); // 6760ms

  assert.equal(easyMs, LEAD_IN_MS + 12 * easy);
  assert.equal(normalMs, LEAD_IN_MS + 12 * normal);
  assert.equal(hardMs, LEAD_IN_MS + 12 * hard);

  assert.ok(easyMs - normalMs >= 500);
  assert.ok(normalMs - hardMs >= 500);
});

test('the MIN_FLOW_MS floor still applies at the fastest speed level for very short descriptions', () => {
  const hard = SPEED_OPTIONS.find((o) => o.label === '難しい')!.value;
  assert.equal(computeFlowDurationMs(1, hard), MIN_FLOW_MS);
});
