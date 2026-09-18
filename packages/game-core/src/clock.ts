/**
 * アプリ全体の「現在時刻」を1箇所から取得するための薄いレイヤー（Sprint 4 指針4）。
 *
 * Sprint 4 の期限判定そのもの（`verifyShareCode` / `isTemporaryUnlockValid` など）は
 * 現在時刻(nowMs)を引数で受け取る純粋関数として実装しており、`Date.now()` を内部で
 * 直接読まない。このモジュールは、その引数として渡す「今の時刻」を作る唯一の場所であり、
 * 開発時のみ有効な時刻オフセット機能（Evaluator が期限切れを実操作で再現する手段）を提供する。
 *
 * `setDebugTimeOffsetMs` を呼ぶと、以後 `getNowMs()` は実時刻にオフセットを足した値を返す。
 * これにより「発行から3時間」を実際に3時間待たずに、時計だけを進めて再現できる。
 */

export type ClockListener = (offsetMs: number) => void;

let debugOffsetMs = 0;
const listeners = new Set<ClockListener>();

/** 実時刻 + 開発用オフセットを返す。UIはこの値をverifyShareCode等のnowMs引数に渡す */
export function getNowMs(): number {
  return Date.now() + debugOffsetMs;
}

/**
 * 開発時のみ使う時刻オフセット(ms)を設定する。Evaluatorが期限切れを再現する手段。
 * 例: 3時間 + 1分 進めたいなら `setDebugTimeOffsetMs(3 * 60 * 60 * 1000 + 60 * 1000)`
 */
export function setDebugTimeOffsetMs(offsetMs: number): void {
  debugOffsetMs = Number.isFinite(offsetMs) ? offsetMs : 0;
  for (const listener of listeners) listener(debugOffsetMs);
}

export function getDebugTimeOffsetMs(): number {
  return debugOffsetMs;
}

/** オフセットの変更を購読する（UIの即時再描画トリガー用） */
export function subscribeDebugTimeOffset(listener: ClockListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
