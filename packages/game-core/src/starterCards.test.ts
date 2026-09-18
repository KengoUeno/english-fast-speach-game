import { test } from 'node:test';
import assert from 'node:assert/strict';
import { starterCards } from './starterCards.ts';
import { splitWords } from './flow.ts';

test('starter pack has at least 30 cards', () => {
  assert.ok(starterCards.length >= 30, `expected >=30 cards, got ${starterCards.length}`);
});

test('every card has a targetWord and a description', () => {
  for (const card of starterCards) {
    assert.ok(card.targetWord && card.targetWord.trim().length > 0, `card ${card.id} has no targetWord`);
    assert.ok(card.description && card.description.trim().length > 0, `card ${card.id} has no description`);
  }
});

test('every description is between 8 and 20 words', () => {
  for (const card of starterCards) {
    const n = splitWords(card.description).length;
    assert.ok(n >= 8 && n <= 20, `card ${card.id} (${card.targetWord}) has ${n} words: "${card.description}"`);
  }
});

test('at least 3 short descriptions (<10 words) and 3 long descriptions (>=16 words)', () => {
  const counts = starterCards.map((card) => splitWords(card.description).length);
  const shortCount = counts.filter((n) => n < 10).length;
  const longCount = counts.filter((n) => n >= 16).length;
  assert.ok(shortCount >= 3, `expected >=3 short descriptions, got ${shortCount}`);
  assert.ok(longCount >= 3, `expected >=3 long descriptions, got ${longCount}`);
});

test('no description contains the target English word (or its simple plural)', () => {
  for (const card of starterCards) {
    const parts = card.targetWord.split('/').map((s) => s.trim());
    const englishWord = parts[parts.length - 1];
    const base = englishWord.toLowerCase().replace(/[^a-z]/g, '');
    const forbidden = new Set([base, `${base}s`, `${base}es`]);
    if (base.endsWith('y')) forbidden.add(`${base.slice(0, -1)}ies`);

    const descWords = card.description
      .toLowerCase()
      .replace(/[^a-z\s]/g, '')
      .split(/\s+/)
      .filter(Boolean);

    for (const word of descWords) {
      assert.ok(
        !forbidden.has(word),
        `card ${card.id} description contains the target word form "${word}": "${card.description}"`
      );
    }
  }
});

test('card ids are unique', () => {
  const ids = starterCards.map((card) => card.id);
  assert.equal(new Set(ids).size, ids.length);
});
