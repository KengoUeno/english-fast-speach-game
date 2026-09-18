import type { Card } from '../types/card.ts';

/**
 * 有料パックのお題データを定義するための1件分の素材。
 * 本作のtaboo的な設計（説明文にお題の英単語そのものを含めない）を保つため、
 * factには対象の名前（en）やその活用形を含めないこと。
 */
export interface CardSeed {
  /** お題の日本語表記 */
  ja: string;
  /** お題の英語表記（targetWordの右側にそのまま入る） */
  en: string;
  /** 説明文中で使う一般名詞（単数形1語。"animal" "food" "country" など） */
  category: string;
  /**
   * 特徴を表す3〜5語の短い句。対象の名前（en）やその活用形を含めないこと。
   * この語数を守ることで、buildPackCardsが生成する説明文が必ず8〜20語に収まる
   * （SHORT: 5+fact語数 → 8〜10語 / MID: 9+fact語数 → 12〜14語 / LONG: 15+fact語数 → 18〜20語。
   * categoryが1語であることが前提）。
   */
  fact: string;
}

/**
 * CardSeedから実際の説明文を組み立てる3種類の文型。
 * どれも「category(1語) + fact(3〜5語)」を差し込む形で、
 * 出来上がる説明文の語数が必ず8〜20語の範囲に収まるよう設計されている。
 */
function describeShort(category: string, fact: string): string {
  return `This ${category} is known for ${fact}.`;
}

function describeMid(category: string, fact: string): string {
  return `Most people think of ${fact} when they imagine this ${category}.`;
}

function describeLong(category: string, fact: string): string {
  return `This ${category} is well known around the world for ${fact}, especially among people who love it.`;
}

const FRAMES = [describeShort, describeMid, describeLong];

/**
 * パック1つぶんのCardSeed配列から、実際に出題するCard[]を組み立てる。
 * idはパック内で1から連番になる（パックをまたいだ一意性は要求されない。
 * 出題時に使うのは常に単一パック内のカードのみのため）。
 *
 * factの語数が3〜5語の範囲から外れている場合は、生成される説明文が
 * 8〜20語の範囲を外れうるため、データ作成ミスとして早期にエラーにする。
 */
export function buildPackCards(seeds: CardSeed[]): Card[] {
  return seeds.map((seed, index) => {
    const factWordCount = seed.fact.trim().split(/\s+/).filter(Boolean).length;
    if (factWordCount < 3 || factWordCount > 5) {
      throw new Error(
        `CardSeed "${seed.en}" has a fact with ${factWordCount} words ("${seed.fact}"). ` +
          'fact must be 3-5 words so the generated description stays within 8-20 words.'
      );
    }
    if (!seed.category || /\s/.test(seed.category.trim())) {
      throw new Error(`CardSeed "${seed.en}" has a category that is not a single word: "${seed.category}".`);
    }

    const frame = FRAMES[index % FRAMES.length];
    return {
      id: index + 1,
      targetWord: `${seed.ja} / ${seed.en}`,
      description: frame(seed.category, seed.fact),
    };
  });
}
