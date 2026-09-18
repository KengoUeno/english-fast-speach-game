import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  generateShareCode,
  verifyShareCode,
  normalizeShareCode,
  formatRemainingDuration,
  SHARE_CODE_DURATION_MS,
} from './sharing.ts';
import { PACKS } from './packs.ts';

const paidPacks = PACKS.filter((pack) => !pack.isFree);
const [singlePack, secondPack] = paidPacks;
const NOW = Date.UTC(2026, 5, 1, 12, 0, 0);

test('generateShareCode produces an 8-character code from the expected alphabet', () => {
  const { code } = generateShareCode([singlePack.id], NOW);
  assert.equal(code.length, 8);
  assert.ok(/^[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{8}$/.test(code), `unexpected characters in code: ${code}`);
});

test('generateShareCode reports an expiry approximately 3 hours after issuance (quantization tolerance)', () => {
  const { expiresAtMs } = generateShareCode([singlePack.id], NOW);
  const delta = expiresAtMs - (NOW + SHARE_CODE_DURATION_MS);
  // 10分刻みに切り上げているため、実際の期限は「発行+3時間」からわずかに後ろにずれ得るが、
  // 手前にずれることは無い（ゲストの実利用時間が3時間を下回らない）。
  assert.ok(delta >= 0, `expiry should never be earlier than issuedAt+3h, got delta=${delta}`);
  assert.ok(delta < 10 * 60 * 1000, `expiry drifted too far from issuedAt+3h: delta=${delta}ms`);
});

test('generateShareCode with a single owned pack encodes exactly that one pack', () => {
  const generated = generateShareCode([singlePack.id], NOW);
  assert.deepEqual(generated.packIds, [singlePack.id]);

  const verified = verifyShareCode(generated.code, generated.expiresAtMs - 1);
  assert.equal(verified.ok, true);
  if (verified.ok) {
    assert.deepEqual(verified.packIds, [singlePack.id]);
    assert.equal(verified.expiresAtMs, generated.expiresAtMs);
  }
});

test('generateShareCode with multiple owned packs encodes all of them into a single code, redeemed in one shot', () => {
  const ownedIds = paidPacks.map((pack) => pack.id);
  const generated = generateShareCode(ownedIds, NOW);

  // PACKS配列の順序で、購入していた全パックが1つのコードに含まれる
  assert.deepEqual(generated.packIds, ownedIds);

  const verified = verifyShareCode(generated.code, generated.expiresAtMs - 1);
  assert.equal(verified.ok, true);
  if (verified.ok) {
    assert.deepEqual(new Set(verified.packIds), new Set(ownedIds));
    assert.equal(verified.packIds.length, ownedIds.length);
  }
});

test('generateShareCode ignores free packs and unknown ids when building the pack set', () => {
  const freePack = PACKS.find((pack) => pack.isFree)!;
  const generated = generateShareCode([singlePack.id, freePack.id, 'not-a-real-pack'], NOW);
  assert.deepEqual(generated.packIds, [singlePack.id]);
});

test('generateShareCode throws if the host owns no shareable packs (caller must guard the UI instead)', () => {
  const freePack = PACKS.find((pack) => pack.isFree)!;
  assert.throws(() => generateShareCode([], NOW));
  assert.throws(() => generateShareCode([freePack.id], NOW));
});

test('verifyShareCode: valid code is accepted while nowMs is before the expiry (pure function, no timers)', () => {
  const { code, expiresAtMs } = generateShareCode([singlePack.id], NOW);

  const justBefore = verifyShareCode(code, expiresAtMs - 1);
  assert.equal(justBefore.ok, true);
  if (justBefore.ok) {
    assert.deepEqual(justBefore.packIds, [singlePack.id]);
    assert.equal(justBefore.expiresAtMs, expiresAtMs);
  }
});

test('verifyShareCode: the same code becomes invalid once nowMs reaches/passes the expiry', () => {
  const { code, expiresAtMs } = generateShareCode([singlePack.id, secondPack.id], NOW);

  const atExpiry = verifyShareCode(code, expiresAtMs);
  assert.equal(atExpiry.ok, false);
  if (!atExpiry.ok) {
    assert.equal(atExpiry.reason, 'expired');
    assert.match(atExpiry.errorCode, /^APP-/);
  }

  const wellAfter = verifyShareCode(code, expiresAtMs + 60_000);
  assert.equal(wellAfter.ok, false);
  if (!wellAfter.ok) assert.equal(wellAfter.reason, 'expired');
});

test('verifyShareCode: normalizes case, surrounding whitespace and hyphens before checking', () => {
  const { code, expiresAtMs } = generateShareCode([singlePack.id], NOW);
  const before = expiresAtMs - 1000;

  const messy = `  ${code.slice(0, 4).toLowerCase()}-${code.slice(4).toLowerCase()}  `;
  const result = verifyShareCode(messy, before);
  assert.equal(result.ok, true);
});

test('normalizeShareCode strips whitespace/hyphens and uppercases', () => {
  assert.equal(normalizeShareCode('  ab-cd EF-gh '), 'ABCDEFGH');
});

test('verifyShareCode: a single tampered character is rejected as invalid, not accepted', () => {
  const { code, expiresAtMs } = generateShareCode([singlePack.id, secondPack.id], NOW);
  const before = expiresAtMs - 1000;

  // ALPHABET内の別の文字に1文字だけ差し替える
  const alphabet = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
  const originalChar = code[0];
  const replacement = alphabet[(alphabet.indexOf(originalChar) + 1) % alphabet.length];
  const tampered = replacement + code.slice(1);

  assert.notEqual(tampered, code);
  const result = verifyShareCode(tampered, before);
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.reason, 'invalid-signature');
    assert.match(result.errorCode, /^APP-/);
  }
});

test('verifyShareCode: a random garbage 8-character string is rejected', () => {
  const result = verifyShareCode('ZZZZZZZZ', NOW);
  assert.equal(result.ok, false);
  if (!result.ok) assert.match(result.errorCode, /^APP-/);
});

test('verifyShareCode: empty string, too-short strings, and disallowed characters are rejected without throwing', () => {
  for (const bad of ['', '   ', 'ABC', 'ABCDEFGHI', 'ABCD-EF', '0O1IL2345', '!!!!!!!!']) {
    assert.doesNotThrow(() => verifyShareCode(bad, NOW));
    const result = verifyShareCode(bad, NOW);
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.reason, 'invalid-format');
      assert.match(result.errorCode, /^APP-/);
    }
  }
});

test('generateShareCode called repeatedly for the same packs always succeeds (no issuance limit)', () => {
  const first = generateShareCode([singlePack.id], NOW);
  const second = generateShareCode([singlePack.id], NOW + 1000);
  assert.equal(first.code.length, 8);
  assert.equal(second.code.length, 8);
});

test('formatRemainingDuration renders hours+minutes / minutes-only / zero without throwing', () => {
  assert.equal(formatRemainingDuration(0), '0分');
  assert.equal(formatRemainingDuration(45 * 60 * 1000), '45分');
  assert.equal(formatRemainingDuration(60 * 60 * 1000), '1時間');
  assert.equal(formatRemainingDuration(2 * 60 * 60 * 1000 + 58 * 60 * 1000), '2時間58分');
});
