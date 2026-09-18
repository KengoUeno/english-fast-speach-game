/**
 * 「流れる説明文」演出のタイミング計算。
 * 本作の中核メカニクス: 説明文の単語数からフロー時間（ハイライトが先頭から末尾まで
 * 進みきる時間）を自動計算する。プレイヤーが選ぶ難易度は存在しない。
 */

/** 読み始めるまでの助走時間（この間はまだどの単語もハイライトされない）。速度レベルによらず共通 */
export const LEAD_IN_MS = 1000;

/** 1単語あたりのハイライト所要時間（デフォルト=「普通」。≒92 wpm） */
export const MS_PER_WORD = 650;

/** フロー時間の下限。極端に短い説明文でも最低これだけの時間を確保する。速度レベルによらず共通 */
export const MIN_FLOW_MS = 4000;

/** ハイライトが末尾に到達してから、まだCORRECT/SKIPを受け付ける猶予時間。速度レベルによらず共通 */
export const GRACE_MS = 3000;

/**
 * スタート設定画面で選べるスクロール速度の3段階。
 * `value` は1単語あたりのスクロール所要時間(ms) = MS_PER_WORD で、
 * そのまま `computeFlowDurationMs` の第2引数と、/start → /play へのルーティングパラメータの両方に使う
 * （`TIME_OPTIONS` と同じ「valueがそのままパラメータ値」のパターン）。
 */
export const SPEED_OPTIONS = [
  { value: 900, label: '簡単', wpm: 67 },
  { value: MS_PER_WORD, label: '普通', wpm: 92 },
  { value: 480, label: '難しい', wpm: 125 },
] as const;

/** デフォルトのスクロール速度（「普通」= 従来のMS_PER_WORDと同一値。既存のバランスを崩さない） */
export const DEFAULT_MS_PER_WORD: number = MS_PER_WORD;

/** 説明文を単語単位に分割する（連続する空白はまとめて1つの区切りとして扱う） */
export function splitWords(text: string): string[] {
  return text
    .trim()
    .split(/\s+/)
    .filter((word) => word.length > 0);
}

/**
 * 単語数からフロー時間(ms)を計算する。
 * フロー時間 = LEAD_IN + 単語数 × msPerWord（下限 MIN_FLOW_MS）
 *
 * msPerWordは「簡単/普通/難しい」のスクロール速度選択に応じて呼び出し側が渡す。
 * 省略時はデフォルト値（MS_PER_WORD=400ms、「普通」と同一）を使うため、
 * 既存の呼び出し（速度選択がまだない箇所やテスト）との後方互換を保つ。
 */
export function computeFlowDurationMs(wordCount: number, msPerWord: number = MS_PER_WORD): number {
  const raw = LEAD_IN_MS + wordCount * msPerWord;
  return Math.max(MIN_FLOW_MS, raw);
}

/**
 * 経過時間(ms)とフロー時間(ms)から、説明文全体のスクロール進行度を計算する。
 * 0 = 画面下端（まだ現れていない/現れ始め）、1 = 奥の消失点に到達（スクロール完了）。
 * LEAD_IN中は0（まだ動き出さない）。フロー時間を過ぎた場合は1で止まる
 * （呼び出し側で猶予時間の判定は別途行う）。
 *
 * 単語単位のハイライトは廃止し、説明文全体を1つのブロックとして
 * スター・ウォーズのオープニングクロールのように奥へスクロールさせる演出のための値。
 */
export function computeFlowProgress(elapsedMs: number, totalDurationMs: number): number {
  if (totalDurationMs <= 0) return 1;
  if (elapsedMs <= LEAD_IN_MS) return 0;

  const scrollElapsed = elapsedMs - LEAD_IN_MS;
  const scrollDurationMs = Math.max(1, totalDurationMs - LEAD_IN_MS);
  const progress = scrollElapsed / scrollDurationMs;
  return Math.min(1, Math.max(0, progress));
}
