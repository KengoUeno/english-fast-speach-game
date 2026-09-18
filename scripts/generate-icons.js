#!/usr/bin/env node
/**
 * アプリアイコン・スプラッシュ・favicon の生成スクリプト（Sprint 5 成果物A）。
 *
 * `apps/mobile/components/Mascot.tsx` が React Native の View の角丸だけで描いている
 * マスコット（丸顔＋黒目二つ＋大きく開けた口＋声の波線）を、同じジオメトリの考え方で
 * SVG として書き起こし、sharp で PNG にラスタライズする。
 *
 * 配色・表情の方向性は docs/design-tokens.md の「マスコットの方向性」、
 * シリーズ統一感は docs/design-references/satteenglish-icon.png に準拠する
 * （ネイビー背景・クリームの顔・オレンジの口）。
 *
 * 見た目の最終調整（配色の微調整・バランス等）は Designer フェーズの担当。
 * ここでは「要件を満たす実在のPNGファイルが揃っている」状態を作ることを目的とする。
 *
 * 実行: `node scripts/generate-icons.js`（リポジトリルートで実行する前提。sharp はルートの devDependency）
 */

const path = require('path');
const fs = require('fs');
const sharp = require('sharp');

const OUT_DIR = path.join(__dirname, '..', 'apps', 'mobile', 'assets');
const SITE_DIR = path.join(__dirname, '..', 'site', 'assets');

const COLORS = {
  navy: '#18243a',
  cream: '#fff9ee',
  creamCard: '#fffdf7',
  orange: '#ff6f47',
  yellow: '#ffc83d',
};

const CANVAS = 1024;
const CENTER = CANVAS / 2; // 512

// --- マスコットのジオメトリ（Mascot.tsx の比率をベースに1024キャンバス用へ書き起こし） ---
//
// 構図の方針（Designer フェーズで調整）:
//   1024 の正方形に対して顔をキャンバス中心（512, 512）へ正確に据え、
//   声の波線を顔の左右へ対称に配して重心を中央に置く。
//   波線は上下に余白（開き角±52°）を残すことで「輪」ではなく「声が左右に広がる」形に見せる。
const FACE_RADIUS = 262; // 直径524 = キャンバスの51.2%。66%セーフゾーン(半径338)に余裕をもって収まる
const FACE_BORDER = 20;
const EYE_RADIUS = 31;
const EYE_OFFSET_X = 92;
const EYE_OFFSET_Y = 54; // 中心よりやや上
const MOUTH_CENTER_Y = CENTER + 158;
const MOUTH_RX = 128; // 縦より横を広くとり、鼻ではなく「開いた口」として読ませる
const MOUTH_RY = 112;
const MOUTH_BORDER = 12;

// 声の波線。顔の輪郭から等間隔で外側へ広がる2本を左右対称に配置する
const WAVE_ARC_DEGREES = 52; // 水平線からの開き角（上下に余白が残り、シルエットが「輪」に見えない）
const WAVES = [
  { radius: FACE_RADIUS + 72, color: COLORS.orange, width: 30 },
  { radius: FACE_RADIUS + 152, color: COLORS.yellow, width: 26 },
];

/** 水平方向を中心に ±WAVE_ARC_DEGREES だけ開いた円弧。side: 1=右、-1=左 */
function arcPath(radius, side) {
  const rad = (WAVE_ARC_DEGREES * Math.PI) / 180;
  const dx = side * radius * Math.cos(rad);
  const dy = radius * Math.sin(rad);
  const x = (CENTER + dx).toFixed(2);
  const sweep = side > 0 ? 1 : 0; // 上端から下端へ、顔から見て外側に膨らむ向き
  return `M ${x} ${(CENTER - dy).toFixed(2)} A ${radius} ${radius} 0 0 ${sweep} ${x} ${(CENTER + dy).toFixed(2)}`;
}

/** 声を表す波線。1024キャンバス全体を使う「メインアイコン」「スプラッシュ」にのみ使う（セーフゾーン外にはみ出すため、アダプティブアイコンのフォアグラウンド/モノクロには含めない） */
function wavesSvg() {
  return WAVES.flatMap(({ radius, color, width }) =>
    [1, -1].map(
      (side) =>
        `<path d="${arcPath(radius, side)}" fill="none" stroke="${color}" stroke-width="${width}" stroke-linecap="round" />`
    )
  ).join('\n');
}

/**
 * 丸顔＋黒目二つ＋大きく開けた口。faceFill/borderColor/mouthFillを差し替えることでフォアグラウンド用にも流用する。
 * 口は顔の円で clip しており、前作アイコンと同じ「口が顔の下端まで届いている」シルエットになる。
 * clip の後に輪郭線だけをもう一度重ねることで、口が輪郭を割らないようにしている。
 */
function faceGroup({ faceFill, borderColor, eyeColor, mouthFill, mouthBorder }) {
  return `
    <defs>
      <clipPath id="faceClip">
        <circle cx="${CENTER}" cy="${CENTER}" r="${FACE_RADIUS}" />
      </clipPath>
    </defs>
    <circle cx="${CENTER}" cy="${CENTER}" r="${FACE_RADIUS}" fill="${faceFill}" />
    <g clip-path="url(#faceClip)">
      <ellipse cx="${CENTER}" cy="${MOUTH_CENTER_Y}" rx="${MOUTH_RX}" ry="${MOUTH_RY}" fill="${mouthFill}" ${
        mouthBorder ? `stroke="${borderColor}" stroke-width="${mouthBorder}"` : ''
      } />
    </g>
    <circle cx="${CENTER - EYE_OFFSET_X}" cy="${CENTER - EYE_OFFSET_Y}" r="${EYE_RADIUS}" fill="${eyeColor}" />
    <circle cx="${CENTER + EYE_OFFSET_X}" cy="${CENTER - EYE_OFFSET_Y}" r="${EYE_RADIUS}" fill="${eyeColor}" />
    <circle cx="${CENTER}" cy="${CENTER}" r="${FACE_RADIUS}" fill="none" stroke="${borderColor}" stroke-width="${FACE_BORDER}" />
  `;
}

function svgDoc(inner, { transparent = false } = {}) {
  const bg = transparent ? '' : `<rect x="0" y="0" width="${CANVAS}" height="${CANVAS}" fill="${COLORS.navy}" />`;
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${CANVAS}" height="${CANVAS}" viewBox="0 0 ${CANVAS} ${CANVAS}" xmlns="http://www.w3.org/2000/svg">
  ${bg}
  ${inner}
</svg>`;
}

/** メインアプリアイコン: ネイビー全面背景 + 顔 + 波線。透過なし(不透明)で書き出す */
function mainIconSvg() {
  const face = faceGroup({
    faceFill: COLORS.creamCard,
    borderColor: COLORS.navy,
    eyeColor: COLORS.navy,
    mouthFill: COLORS.orange,
  });
  return svgDoc(`${wavesSvg()}\n${face}`);
}

/** favicon: メインアイコンと同じ配色だが波線なしのシンプル版（小サイズでも視認できるように） */
function faviconSvg() {
  const face = faceGroup({
    faceFill: COLORS.creamCard,
    borderColor: COLORS.navy,
    eyeColor: COLORS.navy,
    mouthFill: COLORS.orange,
  });
  return svgDoc(face);
}

/**
 * スプラッシュ: メインアイコンと同じ絵柄（背景色は app.json 側の splash.backgroundColor でも重ねて指定する）。
 * スプラッシュは角丸マスクがかからずキャンバスいっぱいに使えるので、
 * 同じジオメトリをわずかに拡大して起動画面での見え方を大きくする。
 */
const SPLASH_SCALE = 1.12;
function splashSvg() {
  const face = faceGroup({
    faceFill: COLORS.creamCard,
    borderColor: COLORS.navy,
    eyeColor: COLORS.navy,
    mouthFill: COLORS.orange,
  });
  const scaled = `<g transform="translate(${CENTER} ${CENTER}) scale(${SPLASH_SCALE}) translate(${-CENTER} ${-CENTER})">
    ${wavesSvg()}
    ${face}
  </g>`;
  return svgDoc(scaled, { transparent: true });
}

/** Androidアダプティブアイコン フォアグラウンド: 透過背景・顔のみ・セーフゾーン(中央66%)内に収める */
function adaptiveForegroundSvg() {
  const face = faceGroup({
    faceFill: COLORS.creamCard,
    borderColor: COLORS.navy,
    eyeColor: COLORS.navy,
    mouthFill: COLORS.orange,
  });
  return svgDoc(face, { transparent: true });
}

/**
 * Androidアダプティブアイコン モノクローム（Android 13+ のテーマアイコン用）。
 * 顔の円を単色(白)で塗り、目と口をマスクで「穴」として抜くことで、
 * OS側の単色ティント後もマスコットの表情がシルエットとして判別できるようにする。
 * マスクを使うことで、顔の円からはみ出す口も自動的に円の内側だけに収まる。
 */
function adaptiveMonochromeSvg() {
  const white = '#ffffff';
  const inner = `
    <defs>
      <mask id="monoMask" maskUnits="userSpaceOnUse" x="0" y="0" width="${CANVAS}" height="${CANVAS}">
        <rect x="0" y="0" width="${CANVAS}" height="${CANVAS}" fill="black" />
        <circle cx="${CENTER}" cy="${CENTER}" r="${FACE_RADIUS}" fill="white" />
        <circle cx="${CENTER - EYE_OFFSET_X}" cy="${CENTER - EYE_OFFSET_Y}" r="${EYE_RADIUS}" fill="black" />
        <circle cx="${CENTER + EYE_OFFSET_X}" cy="${CENTER - EYE_OFFSET_Y}" r="${EYE_RADIUS}" fill="black" />
        <ellipse cx="${CENTER}" cy="${MOUTH_CENTER_Y}" rx="${MOUTH_RX}" ry="${MOUTH_RY}" fill="black" />
      </mask>
    </defs>
    <rect x="0" y="0" width="${CANVAS}" height="${CANVAS}" fill="${white}" mask="url(#monoMask)" />
  `;
  return svgDoc(inner, { transparent: true });
}

async function writeOpaquePng(svg, filePath, size) {
  await sharp(Buffer.from(svg))
    .resize(size, size)
    .flatten({ background: COLORS.navy })
    .png()
    .toFile(filePath);
}

async function writeTransparentPng(svg, filePath, size) {
  await sharp(Buffer.from(svg)).resize(size, size).png().toFile(filePath);
}

async function main() {
  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

  // 1. アプリアイコン: 1024x1024、アルファチャンネルなし（Appleはアイコンの透過を受け付けない）
  await writeOpaquePng(mainIconSvg(), path.join(OUT_DIR, 'icon.png'), 1024);

  // 2. Androidアダプティブアイコン フォアグラウンド: 1024x1024、透過あり
  await writeTransparentPng(
    adaptiveForegroundSvg(),
    path.join(OUT_DIR, 'android-icon-foreground.png'),
    1024
  );

  // 3. Androidアダプティブアイコン モノクローム: 1024x1024、透過あり
  await writeTransparentPng(
    adaptiveMonochromeSvg(),
    path.join(OUT_DIR, 'android-icon-monochrome.png'),
    1024
  );

  // 4. スプラッシュ画像: 1024x1024（app.json 側で backgroundColor を重ねて指定する。透過ありで書き出し、
  //    expo-splash-screen が任意の背景色の上に contain 配置できるようにする）
  await writeTransparentPng(splashSvg(), path.join(OUT_DIR, 'splash-icon.png'), 1024);

  // 5. favicon: 512x512（要件は48x48以上）、アルファなし
  await writeOpaquePng(faviconSvg(), path.join(OUT_DIR, 'favicon.png'), 512);

  console.log('Generated icons into', OUT_DIR);

  // 6. 公開サイト用に同じ絵柄を複製する（アイコンを調整したときにサイト側がズレないよう自動同期）
  if (!fs.existsSync(SITE_DIR)) fs.mkdirSync(SITE_DIR, { recursive: true });
  fs.copyFileSync(path.join(OUT_DIR, 'favicon.png'), path.join(SITE_DIR, 'favicon.png'));
  fs.copyFileSync(path.join(OUT_DIR, 'icon.png'), path.join(SITE_DIR, 'hero-icon.png'));
  console.log('Synced site images into', SITE_DIR);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
