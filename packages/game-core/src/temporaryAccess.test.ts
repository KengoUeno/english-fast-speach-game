import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  temporaryAccessStore,
  isTemporaryUnlockValid,
  getRemainingMs,
  isPackPlayable,
} from './temporaryAccess.ts';
import { ownershipStore } from './ownership.ts';

test('isTemporaryUnlockValid: pure function, valid before expiry and invalid at/after expiry', () => {
  const expiresAtMs = 1_000_000;
  assert.equal(isTemporaryUnlockValid(expiresAtMs, expiresAtMs - 1), true);
  assert.equal(isTemporaryUnlockValid(expiresAtMs, expiresAtMs), false);
  assert.equal(isTemporaryUnlockValid(expiresAtMs, expiresAtMs + 1), false);
});

test('getRemainingMs never goes negative', () => {
  assert.equal(getRemainingMs(1000, 500), 500);
  assert.equal(getRemainingMs(1000, 1000), 0);
  assert.equal(getRemainingMs(1000, 2000), 0);
});

test('temporaryAccessStore.unlock/isUnlocked/getActivePackIds respect nowMs, not wall-clock time', () => {
  temporaryAccessStore.clear();
  const now = 10_000_000;
  temporaryAccessStore.unlock('travel', now + 60_000);

  assert.equal(temporaryAccessStore.isUnlocked('travel', now), true);
  assert.equal(temporaryAccessStore.isUnlocked('travel', now + 60_000), false);
  assert.equal(temporaryAccessStore.isUnlocked('travel', now + 120_000), false);
  assert.equal(temporaryAccessStore.isUnlocked('unknown-pack', now), false);

  assert.ok(temporaryAccessStore.getActivePackIds(now).has('travel'));
  assert.ok(!temporaryAccessStore.getActivePackIds(now + 60_000).has('travel'));

  temporaryAccessStore.clear();
});

test('temporaryAccessStore.clear() removes all entries (storage-clear equivalent re-locks everything)', () => {
  temporaryAccessStore.unlock('food', Date.now() + 1_000_000);
  assert.ok(temporaryAccessStore.getAll().size > 0);
  temporaryAccessStore.clear();
  assert.equal(temporaryAccessStore.getAll().size, 0);
});

test('temporaryAccessStore.replaceAll loads persisted entries in bulk', () => {
  temporaryAccessStore.clear();
  temporaryAccessStore.replaceAll([
    ['travel', 5000],
    ['food', 6000],
  ]);
  const all = temporaryAccessStore.getAll();
  assert.equal(all.get('travel'), 5000);
  assert.equal(all.get('food'), 6000);
  temporaryAccessStore.clear();
});

test('temporaryAccessStore.subscribe delivers current snapshot immediately and future updates', () => {
  temporaryAccessStore.clear();
  const seen: number[] = [];
  const unsubscribe = temporaryAccessStore.subscribe((entries) => seen.push(entries.size));

  assert.deepEqual(seen, [0]);
  temporaryAccessStore.unlock('animals', Date.now() + 1_000_000);
  assert.deepEqual(seen, [0, 1]);

  unsubscribe();
  temporaryAccessStore.unlock('business', Date.now() + 1_000_000);
  assert.deepEqual(seen, [0, 1]); // 購読解除後は通知されない

  temporaryAccessStore.clear();
});

test('isPackPlayable: purchase-state (ownershipStore) is entirely separate from temporary unlocks, and playability is their union', () => {
  ownershipStore.setPurchasedPackIds([]);
  ownershipStore.setDebugOwnedPackIds([]);

  const freePack = { id: 'starter', isFree: true };
  const paidPack = { id: 'travel', isFree: false };

  // 何も所有せず、一時解放もされていない：無料のみプレイ可
  assert.equal(isPackPlayable(freePack, ownershipStore.getOwnedPackIds(), new Set()), true);
  assert.equal(isPackPlayable(paidPack, ownershipStore.getOwnedPackIds(), new Set()), false);

  // 一時解放のみ：プレイは可能だが、購入状態(ownershipStore)には一切反映されない
  const tempUnlocked = new Set(['travel']);
  assert.equal(isPackPlayable(paidPack, ownershipStore.getOwnedPackIds(), tempUnlocked), true);
  assert.equal(ownershipStore.getOwnedPackIds().has('travel'), false);

  ownershipStore.setPurchasedPackIds([]);
  ownershipStore.setDebugOwnedPackIds([]);
});
