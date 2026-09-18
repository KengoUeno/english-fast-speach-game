import type { TextStyle } from 'react-native';

/**
 * ブランドトークン（docs/design-tokens.md 準拠）。
 * シリーズ第1弾「察してEnglish」と配色・フォントを完全に共有し、
 * 一目で同じシリーズとわかる状態を保つ。
 */
export const COLORS = {
  navy: '#18243a',
  cream: '#fff9ee',
  creamCard: '#fffdf7',
  orange: '#ff6f47',
  yellow: '#ffc83d',
  green: '#3dae62',
  hairline: '#e8dcc0',
} as const;

/**
 * 「押せる駒」のような立体感を作るための沈み込み色。
 * ベース色をそのまま暗くした値で、新しい色相は増やさない（トークンの拡張ではなく陰影）。
 */
export const SHADES = {
  navy: '#0a1220',
  orange: '#d2472a',
  yellow: '#c98f14',
  green: '#26793e',
  hairline: '#d8c79f',
} as const;

export const FONTS = {
  display: 'Fredoka_700Bold',
  heading: 'MPLUSRounded1c_700Bold',
  bodyRegular: 'ZenKakuGothicNew_400Regular',
  bodyBold: 'ZenKakuGothicNew_700Bold',
} as const;

/** 角丸: カードは16〜24px、バッジ・ピルは9999px */
export const RADIUS = {
  card: 24,
  panel: 20,
  box: 16,
  pill: 9999,
} as const;

/** 枠線: 太めの2〜2.5pxで輪郭のはっきりしたポップな印象を作る */
export const BORDER = {
  thin: 2,
  thick: 2.5,
} as const;

/** 幅の広いWeb/タブレットでも間延びしないよう、コンテンツ幅に上限を設ける */
export const CONTENT_MAX_WIDTH = 460;

/** 半透明のnavy（薄いラベル・非活性テキスト用）。独自色を増やさずに階調だけを作る */
export const INK = {
  strong: COLORS.navy,
  muted: 'rgba(24,36,58,0.55)',
  soft: 'rgba(24,36,58,0.38)',
  ghost: 'rgba(24,36,58,0.24)',
} as const;

/** 全画面共通の小さなラベル（SCORE / TIME / DESCRIPTION など） */
export const LABEL: TextStyle = {
  fontFamily: FONTS.heading,
  fontSize: 10,
  letterSpacing: 2,
  color: INK.muted,
};

/**
 * パックごとのアクセント色。
 * トークンの4色（yellow / orange / navy / green）を配り分けるだけで、新しい色相は増やさない。
 * 「同じ形のカードが5枚並ぶ」単調さを、色の違いだけで崩すのが目的。
 */
const PACK_ACCENTS: Record<string, string> = {
  starter: COLORS.yellow,
  travel: COLORS.orange,
  business: COLORS.navy,
  animals: COLORS.green,
  food: COLORS.yellow,
};

export function packAccent(packId: string): string {
  return PACK_ACCENTS[packId] ?? COLORS.orange;
}

/* ------------------------------------------------------------------ *
 * ロック中のパックの色調
 * ------------------------------------------------------------------ */

function hexToHsl(hex: string): { h: number; s: number; l: number } {
  const int = parseInt(hex.replace('#', ''), 16);
  const r = ((int >> 16) & 255) / 255;
  const g = ((int >> 8) & 255) / 255;
  const b = (int & 255) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;
  const l = (max + min) / 2;
  if (delta === 0) return { h: 0, s: 0, l };
  const s = delta / (1 - Math.abs(2 * l - 1));
  let h: number;
  if (max === r) h = 60 * (((g - b) / delta) % 6);
  else if (max === g) h = 60 * ((b - r) / delta + 2);
  else h = 60 * ((r - g) / delta + 4);
  return { h: (h + 360) % 360, s, l };
}

function hslToHex(h: number, s: number, l: number): string {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  const [r1, g1, b1] =
    h < 60
      ? [c, x, 0]
      : h < 120
        ? [x, c, 0]
        : h < 180
          ? [0, c, x]
          : h < 240
            ? [0, x, c]
            : h < 300
              ? [x, 0, c]
              : [c, 0, x];
  const to255 = (v: number) =>
    Math.round((v + m) * 255)
      .toString(16)
      .padStart(2, '0');
  return `#${to255(r1)}${to255(g1)}${to255(b1)}`;
}

/**
 * アクセント色の「色相はそのまま／明度と彩度だけを動かす」ヘルパー。
 * 色相を一切触らないので、パレットに新しい色が増えることはない
 * （SHADES が「同じ色を暗くした陰影」であるのと対になる、明るい側の階調）。
 */
function toneOf(hex: string, lightness: number, maxSaturation: number): string {
  const { h, s } = hexToHsl(hex);
  return hslToHex(h, Math.min(s, maxSaturation), lightness);
}

export type LockedPackTones = {
  /** カード全体の輪郭（タイルよりさらに一段淡い） */
  cardBorder: string;
  /** カードの地色。cream にごく薄くアクセントを混ぜた面 */
  cardFill: string;
  /** 絵文字タイルの輪郭。ロック中の色の主役 */
  tileBorder: string;
  /** 絵文字タイルの地色 */
  tileFill: string;
  /** 南京錠の線色 */
  glyph: string;
};

/**
 * ロック中のパックに使う色調一式。
 *
 * ロック中を「無彩色のグレー」で表すと、未所有のパックが全部同じ顔になり、
 * グリッドから色の情報が消えてしまう。そこで各パック本来のアクセント色を
 * 明度だけ持ち上げて薄く残し、「どのパックか」は色で、「まだ開いていないか」は
 * 南京錠と INK.muted の文字で伝える、という役割分担にしている。
 */
const LOCKED_TONE_CACHE = new Map<string, LockedPackTones>();

export function lockedPackTones(accent: string): LockedPackTones {
  const cached = LOCKED_TONE_CACHE.get(accent);
  if (cached) return cached;
  // 色を持たせる役はタイル（輪郭＋地色）に集約し、面積の大きいカードの地色は
  // cream とほぼ見分けがつかない一息だけにしてある。カード全体を淡く塗ると、
  // 未所有のパックが遊べるパックより目立ってしまい、優先順位が逆転するため。
  const tones: LockedPackTones = {
    cardBorder: toneOf(accent, 0.82, 0.42),
    cardFill: toneOf(accent, 0.975, 0.55),
    tileBorder: toneOf(accent, 0.7, 0.62),
    tileFill: toneOf(accent, 0.93, 0.8),
    glyph: toneOf(accent, 0.5, 0.62),
  };
  LOCKED_TONE_CACHE.set(accent, tones);
  return tones;
}

/**
 * トークン色をそのまま薄めた地色。新しい色相を足さずに「淡い面」を作るための係数。
 * （MessageBanner の info / error / success の地色に使う）
 */
export const TINT = {
  orange: 'rgba(255,111,71,0.10)',
  green: 'rgba(61,174,98,0.12)',
  navy: 'rgba(24,36,58,0.05)',
} as const;

export const LINK = {
  fontFamily: FONTS.bodyRegular,
  fontSize: 13,
  color: INK.muted,
  textDecorationLine: 'underline' as const,
};
