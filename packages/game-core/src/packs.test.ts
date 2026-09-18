import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PACKS, DEFAULT_PACK_ID, getPackById, getPaidProductIds, findPackByProductId } from './packs.ts';
import { splitWords } from './flow.ts';

test('at least 4 paid packs exist, each with >=100 cards, a productId and a priceJPY', () => {
  const paidPacks = PACKS.filter((pack) => !pack.isFree);
  assert.ok(paidPacks.length >= 4, `expected >=4 paid packs, got ${paidPacks.length}`);
  for (const pack of paidPacks) {
    assert.ok(pack.cards.length >= 100, `pack ${pack.id} has ${pack.cards.length} cards, expected >=100`);
    assert.ok(typeof pack.productId === 'string' && pack.productId.length > 0, `pack ${pack.id} missing productId`);
    assert.ok(typeof pack.priceJPY === 'number' && pack.priceJPY > 0, `pack ${pack.id} missing priceJPY`);
  }
});

test('free starter pack still has >=30 cards and no productId', () => {
  const starter = getPackById(DEFAULT_PACK_ID);
  assert.ok(starter, 'starter pack not found');
  assert.ok(starter!.isFree);
  assert.ok(starter!.cards.length >= 30);
  assert.equal(starter!.productId, undefined);
});

test('paid product ids are unique across packs and resolve back to the right pack', () => {
  const ids = getPaidProductIds();
  assert.equal(new Set(ids).size, ids.length, 'duplicate productId found across packs');
  for (const pack of PACKS.filter((p) => p.productId)) {
    assert.equal(findPackByProductId(pack.productId!)?.id, pack.id);
  }
});

test('pack ids are unique', () => {
  const ids = PACKS.map((pack) => pack.id);
  assert.equal(new Set(ids).size, ids.length);
});

for (const pack of PACKS) {
  test(`pack "${pack.id}": every description is 8-20 words`, () => {
    for (const card of pack.cards) {
      const n = splitWords(card.description).length;
      assert.ok(
        n >= 8 && n <= 20,
        `pack ${pack.id} card ${card.id} (${card.targetWord}) has ${n} words: "${card.description}"`
      );
    }
  });

  test(`pack "${pack.id}": no description contains the target English word (or a simple plural/verb form)`, () => {
    for (const card of pack.cards) {
      const parts = card.targetWord.split('/').map((s) => s.trim());
      const englishWord = parts[parts.length - 1];
      const base = englishWord.toLowerCase().replace(/[^a-z]/g, '');
      const forbidden = new Set([base, `${base}s`, `${base}es`, `${base}ing`, `${base}ed`]);
      if (base.endsWith('y')) forbidden.add(`${base.slice(0, -1)}ies`);

      const descWords = card.description
        .toLowerCase()
        .replace(/[^a-z\s]/g, '')
        .split(/\s+/)
        .filter(Boolean);

      for (const word of descWords) {
        assert.ok(
          !forbidden.has(word),
          `pack ${pack.id} card ${card.id} description contains the target word form "${word}": "${card.description}"`
        );
      }
    }
  });

  test(`pack "${pack.id}": no duplicate target word within the pack`, () => {
    const words = pack.cards.map((card) => card.targetWord);
    assert.equal(new Set(words).size, words.length, `pack ${pack.id} has duplicate target words`);
  });

  test(`pack "${pack.id}": card ids are unique within the pack`, () => {
    const ids = pack.cards.map((card) => card.id);
    assert.equal(new Set(ids).size, ids.length, `pack ${pack.id} has duplicate card ids`);
  });
}
