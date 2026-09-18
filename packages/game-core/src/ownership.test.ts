import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ownershipStore, isPackOwned } from './ownership.ts';

test('ownershipStore starts empty', () => {
  // 他のテストの実行順で状態が残らないよう、まずリセットしてから検証する
  ownershipStore.setPurchasedPackIds([]);
  ownershipStore.setDebugOwnedPackIds([]);
  assert.equal(ownershipStore.getOwnedPackIds().size, 0);
});

test('setPurchasedPackIds and setDebugOwnedPackIds are merged (union), not overwritten', () => {
  ownershipStore.setPurchasedPackIds(['travel']);
  ownershipStore.setDebugOwnedPackIds(['food']);
  const owned = ownershipStore.getOwnedPackIds();
  assert.ok(owned.has('travel'));
  assert.ok(owned.has('food'));
  assert.equal(owned.size, 2);

  // 片方をリセットしてもfindable、もう片方には影響しない
  ownershipStore.setDebugOwnedPackIds([]);
  const afterReset = ownershipStore.getOwnedPackIds();
  assert.ok(afterReset.has('travel'));
  assert.ok(!afterReset.has('food'));

  // 後片付け（他のテストへの影響を避ける）
  ownershipStore.setPurchasedPackIds([]);
});

test('subscribe receives the current snapshot immediately and future updates', () => {
  ownershipStore.setPurchasedPackIds([]);
  ownershipStore.setDebugOwnedPackIds([]);

  const seen: string[][] = [];
  const unsubscribe = ownershipStore.subscribe((ids) => {
    seen.push([...ids].sort());
  });

  assert.deepEqual(seen[0], []);

  ownershipStore.setDebugOwnedPackIds(['animals']);
  assert.deepEqual(seen[seen.length - 1], ['animals']);

  unsubscribe();
  ownershipStore.setDebugOwnedPackIds(['business']);
  // 購読解除後は通知が来ない
  assert.deepEqual(seen[seen.length - 1], ['animals']);

  // 後片付け
  ownershipStore.setDebugOwnedPackIds([]);
});

test('isPackOwned: free packs are always owned; paid packs require membership in ownedPackIds', () => {
  const freePack = { id: 'starter', isFree: true };
  const paidPack = { id: 'travel', isFree: false };

  assert.ok(isPackOwned(freePack, new Set()));
  assert.ok(!isPackOwned(paidPack, new Set()));
  assert.ok(isPackOwned(paidPack, new Set(['travel'])));
  assert.ok(!isPackOwned(paidPack, new Set(['food'])));
});
