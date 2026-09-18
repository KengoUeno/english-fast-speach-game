import AsyncStorage from '@react-native-async-storage/async-storage';
import * as StoreReview from 'expo-store-review';

/**
 * ゲーム完了回数とレビュー訴求の永続化（Sprint 2 機能D）。
 * 姉妹プロジェクト taboo-english-game の apps/mobile/lib/reviewPrompt.ts の方針
 * （最低3回完了 / 60日クールダウン / 失敗は握りつぶす）を踏襲する。
 *
 * 絶対条件: Expo Web など StoreReview 非対応環境や、AsyncStorage の読み書きが
 * 失敗する環境でも、ここでの例外がゲーム進行（リザルト画面の表示・操作）を
 * 一切妨げてはならない。そのため公開関数はすべて内部で例外を握りつぶす。
 */

const COMPLETED_COUNT_KEY = 'reviewPrompt.completedSessions';
const LAST_PROMPTED_AT_KEY = 'reviewPrompt.lastPromptedAt';

// 初回プレイ直後のようなネガティブ/フラットな瞬間を避けるため、
// 3回ゲームを完了してから初めて検討する。以後は60日に1回まで。
export const MIN_COMPLETED_SESSIONS = 3;
export const COOLDOWN_DAYS = 60;

/**
 * 完了回数・前回リクエスト時刻から、今回レビューをリクエストすべきかを判定する
 * 純粋関数（副作用なし・テスト容易）。
 *
 * @param completedCount 今回の完了を含めた、通算のゲーム完了回数
 * @param lastPromptedAt 直近にレビューをリクエストした時刻(ms)。一度もリクエストしていない場合は null
 * @param now             現在時刻(ms)
 */
export function shouldRequestReview(
  completedCount: number,
  lastPromptedAt: number | null,
  now: number = Date.now()
): boolean {
  if (completedCount < MIN_COMPLETED_SESSIONS) return false;
  if (lastPromptedAt === null) return true;

  const daysSinceLastPrompt = (now - lastPromptedAt) / (1000 * 60 * 60 * 24);
  return daysSinceLastPrompt >= COOLDOWN_DAYS;
}

/**
 * ゲーム完了回数を1増やして永続化する。AsyncStorage が使えない/失敗する環境でも
 * 例外を投げず、その場合は加算前の回数（0扱い）を返す。
 */
async function incrementCompletedSessions(): Promise<number> {
  try {
    const raw = await AsyncStorage.getItem(COMPLETED_COUNT_KEY);
    const next = (raw ? parseInt(raw, 10) || 0 : 0) + 1;
    await AsyncStorage.setItem(COMPLETED_COUNT_KEY, String(next));
    return next;
  } catch {
    return 0;
  }
}

async function getLastPromptedAt(): Promise<number | null> {
  try {
    const raw = await AsyncStorage.getItem(LAST_PROMPTED_AT_KEY);
    return raw ? parseInt(raw, 10) || null : null;
  } catch {
    return null;
  }
}

/**
 * リザルト画面到達のたびに呼ぶ。ゲーム完了回数を記録し、条件を満たせば
 * OS標準のレビューダイアログを控えめにリクエストする。
 *
 * 戻り値は主にデバッグ・テスト用。呼び出し側（UI）はこの結果を待たずに
 * 画面表示を続けてよい（=ゲーム進行をブロックしない）。
 */
export async function maybeRequestReview(): Promise<{ completedCount: number; requested: boolean }> {
  const completedCount = await incrementCompletedSessions();

  try {
    const lastPromptedAt = await getLastPromptedAt();
    if (!shouldRequestReview(completedCount, lastPromptedAt)) {
      return { completedCount, requested: false };
    }

    // Web など非対応環境では isAvailableAsync が false を返すため、
    // ここでダイアログが出ないのは想定どおりの挙動（例外ではない）。
    const available = await StoreReview.isAvailableAsync();
    if (!available) {
      return { completedCount, requested: false };
    }

    await AsyncStorage.setItem(LAST_PROMPTED_AT_KEY, String(Date.now()));
    await StoreReview.requestReview();
    return { completedCount, requested: true };
  } catch {
    // オフライン・非対応環境などでの失敗はゲーム進行に影響させず無視する
    return { completedCount, requested: false };
  }
}

/** 現在保存されているゲーム完了回数を読み取る（表示・デバッグ用途）。失敗時は0を返す。 */
export async function getCompletedSessionsCount(): Promise<number> {
  try {
    const raw = await AsyncStorage.getItem(COMPLETED_COUNT_KEY);
    return raw ? parseInt(raw, 10) || 0 : 0;
  } catch {
    return 0;
  }
}
