import type { Card } from './types/card.ts';

/**
 * 無料スターターパック（日常会話・身の回りの単語 30問）。
 * 各説明文は8〜20語。単語数のばらつき（短文/長文）を意図的に混在させ、
 * 「流れる説明文」の速度計算を様々なパターンで検証できるようにしている。
 * どの説明文にも、そのお題の英単語（および単純な複数形・活用形）を含めていない。
 */
export const starterCards: Card[] = [
  {
    id: 1,
    targetWord: 'ゾウ / Elephant',
    description:
      'This enormous gray animal has a long trunk, huge floppy ears, and roams in herds across Africa or Asia.',
  },
  {
    id: 2,
    targetWord: 'ペンギン / Penguin',
    description: 'This black and white bird cannot fly at all.',
  },
  {
    id: 3,
    targetWord: 'ピザ / Pizza',
    description: 'This round Italian dish is topped with cheese, tomato sauce, and many other tasty ingredients.',
  },
  {
    id: 4,
    targetWord: '寿司 / Sushi',
    description: 'This Japanese dish combines vinegared rice with raw fish.',
  },
  {
    id: 5,
    targetWord: 'ギター / Guitar',
    description: 'This wooden instrument has six strings you pluck or strum to make music.',
  },
  {
    id: 6,
    targetWord: '自転車 / Bicycle',
    description: 'This two wheeled vehicle is powered by pedaling with your own two feet.',
  },
  {
    id: 7,
    targetWord: '傘 / Umbrella',
    description: 'You open this to stay dry in the rain.',
  },
  {
    id: 8,
    targetWord: '虹 / Rainbow',
    description: 'This colorful arc appears in the sky after rain when sunlight bends through water droplets.',
  },
  {
    id: 9,
    targetWord: '火山 / Volcano',
    description:
      'This mountain sometimes explodes violently, sending hot melted rock and thick ash high into the sky.',
  },
  {
    id: 10,
    targetWord: '宇宙飛行士 / Astronaut',
    description: 'This person wears a special suit and travels far beyond Earth to explore outer space.',
  },
  {
    id: 11,
    targetWord: '医者 / Doctor',
    description: 'This person examines sick patients, diagnoses illness, and helps people get better at a hospital.',
  },
  {
    id: 12,
    targetWord: '先生 / Teacher',
    description:
      'This person stands in front of a classroom and helps students learn new subjects every day.',
  },
  {
    id: 13,
    targetWord: 'シェフ / Chef',
    description: 'This person wears a tall white hat while cooking delicious meals in a restaurant kitchen.',
  },
  {
    id: 14,
    targetWord: '消防士 / Firefighter',
    description:
      'This brave person rushes into burning buildings wearing heavy gear to rescue people and put out flames.',
  },
  {
    id: 15,
    targetWord: '高層ビル / Skyscraper',
    description: 'This extremely tall building rises high above a busy city, filled with countless offices.',
  },
  {
    id: 16,
    targetWord: '滝 / Waterfall',
    description: 'Water rushes down from a tall cliff, crashing loudly into a pool far below.',
  },
  {
    id: 17,
    targetWord: '砂漠 / Desert',
    description: 'This dry sandy area gets very little rain and can feel extremely hot during the day.',
  },
  {
    id: 18,
    targetWord: '雪だるま / Snowman',
    description: 'Children build this round figure out of packed snow, giving it a carrot nose.',
  },
  {
    id: 19,
    targetWord: 'チョウ / Butterfly',
    description: 'This colorful insect starts life as a caterpillar before growing delicate wings and flying away.',
  },
  {
    id: 20,
    targetWord: 'イルカ / Dolphin',
    description: 'This intelligent sea creature swims in pods and often jumps playfully above the waves.',
  },
  {
    id: 21,
    targetWord: 'クモ / Spider',
    description: 'This eight legged creature spins webs to catch prey.',
  },
  {
    id: 22,
    targetWord: 'カンガルー / Kangaroo',
    description: 'This Australian animal hops on strong back legs and carries its baby in a pouch.',
  },
  {
    id: 23,
    targetWord: '灯台 / Lighthouse',
    description: 'This tall tower stands near the coast, flashing a bright light to guide ships safely.',
  },
  {
    id: 24,
    targetWord: 'コンパス / Compass',
    description: 'This small tool has a needle that always points toward magnetic north.',
  },
  {
    id: 25,
    targetWord: '望遠鏡 / Telescope',
    description: 'This long tube uses lenses to make faraway stars and planets look much closer.',
  },
  {
    id: 26,
    targetWord: 'サンドイッチ / Sandwich',
    description: 'This simple meal is made by placing fillings between two slices of bread.',
  },
  {
    id: 27,
    targetWord: 'パンケーキ / Pancake',
    description: 'This flat round breakfast food is cooked in a pan and often topped with syrup.',
  },
  {
    id: 28,
    targetWord: 'リュック / Backpack',
    description: 'You wear this on your back to carry things.',
  },
  {
    id: 29,
    targetWord: 'ヘリコプター / Helicopter',
    description: 'This flying machine has spinning blades on top and can hover in one place in the air.',
  },
  {
    id: 30,
    targetWord: '潜水艦 / Submarine',
    description: 'This vessel travels underwater and can dive deep beneath the ocean to explore hidden places.',
  },
];
