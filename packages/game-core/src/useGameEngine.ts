import { useCallback, useEffect, useRef, useState } from 'react';
import type { Card } from './types/card.ts';
import {
  COUNTDOWN_SECONDS,
  STARTING_SCORE,
  applyCorrectAnswer,
  computeRemainingSeconds,
  pickRandomCard,
} from './gameEngine.ts';
import { DEFAULT_MS_PER_WORD, GRACE_MS, computeFlowDurationMs, computeFlowProgress, splitWords } from './flow.ts';

interface UseGameEngineOptions {
  cards: Card[];
  gameTimeSec: number;
  /** スタート設定画面で選択したスクロール速度（1単語あたりのms）。省略時は「普通」と同一のデフォルト値 */
  msPerWord?: number;
}

/** 「流れる説明文」の経過表示を更新する間隔。数値が小さいほど滑らかだがCPU負荷が増える */
const FLOW_TICK_MS = 100;

export function useGameEngine({ cards, gameTimeSec, msPerWord = DEFAULT_MS_PER_WORD }: UseGameEngineOptions) {
  // ゲーム開始直後の「3・2・1」カウントダウン。0になったら本編開始
  const [countdown, setCountdown] = useState<number>(COUNTDOWN_SECONDS);
  const [timeLeft, setTimeLeft] = useState<number>(gameTimeSec > 0 ? gameTimeSec : 60);
  const [score, setScore] = useState<number>(STARTING_SCORE);
  // サーバー/クライアントのハイドレーション差異を避けるため、初回のランダム選択はeffectで行う
  const [currentCard, setCurrentCard] = useState<Card | null>(null);
  const [gameOver, setGameOver] = useState<boolean>(false);
  // このゲーム内で既に出題したカードのid（重複出題を防ぐ。全カードを使い切ったら周回する）
  const [usedCardIds, setUsedCardIds] = useState<ReadonlySet<number>>(new Set());
  // リザルト画面向けの統計（ゲーム全体を通じての累計。カードが変わってもリセットしない）
  const [correctCount, setCorrectCount] = useState<number>(0);
  const [skipCount, setSkipCount] = useState<number>(0);
  // 現在のカードのフロー（流れる説明文）が開始した時刻。nullの間はまだ開始していない
  const [cardStartedAt, setCardStartedAt] = useState<number | null>(null);
  // FLOW_TICK_MSごとに更新される「現在時刻」。これが変わるたびに経過時間・ハイライト位置を再計算する
  const [flowNow, setFlowNow] = useState<number>(() => Date.now());

  // CORRECT/SKIPの連打で1回のタップにつき2枚以上お題が飛ばされるのを防ぐガード。
  // setStateは非同期なので、確実に同期的にブロックできるrefで管理する。
  // このrefは「次のお題の表示準備が整った（cardStartedAtが再設定された）」タイミングでのみ解除する。
  const advancingRef = useRef(false);

  // マウント後（クライアントのみ）に最初のカードをランダム選択
  useEffect(() => {
    const card = pickRandomCard(cards);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCurrentCard(card);
    if (card) {
      setUsedCardIds(new Set([card.id]));
    }
    // 初回マウント時のみ実行する（cardsは呼び出し側で安定した参照を渡す前提）
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 開始前カウントダウン（3→2→1→0）。1秒ごとに1減らし、0になったら止まる
  useEffect(() => {
    if (countdown <= 0) return;

    const timer = setTimeout(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [countdown]);

  // 全体タイマー（Date.now()基準で経過時間を計算し、バックグラウンド時のドリフトを防ぐ）
  // カウントダウンが終わるまでは開始しない
  useEffect(() => {
    if (countdown > 0 || gameOver || gameTimeSec <= 0) return;

    const startedAt = Date.now();

    const interval = setInterval(() => {
      const remaining = computeRemainingSeconds(startedAt, gameTimeSec);
      setTimeLeft(remaining);

      if (remaining === 0) {
        clearInterval(interval);
        setGameOver(true);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [countdown, gameTimeSec, gameOver]);

  const nextCard = useCallback(() => {
    const card = pickRandomCard(cards, usedCardIds);
    setCurrentCard(card);
    setUsedCardIds((prev) => {
      if (!card) return prev;
      const next = new Set(prev);
      next.add(card.id);
      // 全カードを使い切ったら、直近のカードだけ残して除外リストをリセット（連続重複だけは避けつつ周回する）
      return next.size >= cards.length ? new Set([card.id]) : next;
    });
    // 新しいお題のフローはまだ始まっていない状態にする。
    // 実際の再開始は下の「フロー開始」effectが、カードが切り替わったことを検知して行う。
    setCardStartedAt(null);
  }, [cards, usedCardIds]);

  // フロー開始: カウントダウンが終わっていて、かつ現在のカードのフローがまだ始まっていなければ開始する。
  // これはゲーム開始時の最初のカードにも、nextCard()で切り替わった直後のカードにも共通して効く。
  // ここで初めてadvancingRefを解除することで、「次のお題の表示準備が整うまでは連打を無視する」を保証する。
  useEffect(() => {
    if (countdown > 0 || gameOver || !currentCard || cardStartedAt !== null) return;

    const now = Date.now();
    setCardStartedAt(now);
    setFlowNow(now);
    advancingRef.current = false;
  }, [countdown, gameOver, currentCard, cardStartedAt]);

  // フローの進行を刻むタイマー。末尾到達+猶予時間が過ぎたら自動的に次のお題へ進む（加点なし、スキップ扱い）
  useEffect(() => {
    if (countdown > 0 || gameOver || cardStartedAt === null || !currentCard) return;

    const words = splitWords(currentCard.description);
    const flowDurationMs = computeFlowDurationMs(words.length, msPerWord);
    const totalMs = flowDurationMs + GRACE_MS;

    const interval = setInterval(() => {
      const now = Date.now();
      const elapsed = now - cardStartedAt;
      setFlowNow(now);

      if (elapsed >= totalMs) {
        clearInterval(interval);
        if (!advancingRef.current) {
          advancingRef.current = true;
          setSkipCount((prev) => prev + 1);
          nextCard();
        }
      }
    }, FLOW_TICK_MS);

    return () => clearInterval(interval);
  }, [countdown, gameOver, cardStartedAt, currentCard, nextCard, msPerWord]);

  // 正解ボタン: 即座に加点し、次のお題へ切り替える
  const markCorrect = useCallback(() => {
    if (countdown > 0 || !currentCard || gameOver || advancingRef.current) return;

    advancingRef.current = true;
    setScore((prev) => applyCorrectAnswer(prev));
    setCorrectCount((prev) => prev + 1);
    nextCard();
  }, [countdown, currentCard, gameOver, nextCard]);

  // スキップボタン: 加点なしで即座に次のお題へ切り替える
  const skip = useCallback(() => {
    if (countdown > 0 || !currentCard || gameOver || advancingRef.current) return;

    advancingRef.current = true;
    setSkipCount((prev) => prev + 1);
    nextCard();
  }, [countdown, currentCard, gameOver, nextCard]);

  const words = currentCard ? splitWords(currentCard.description) : [];
  const flowDurationMs = currentCard ? computeFlowDurationMs(words.length, msPerWord) : 0;
  const elapsedMs = cardStartedAt !== null ? Math.max(0, flowNow - cardStartedAt) : 0;
  const flowProgress = countdown > 0 ? 0 : computeFlowProgress(elapsedMs, flowDurationMs);
  const isFlowComplete = elapsedMs >= flowDurationMs;
  const isInGrace = isFlowComplete && elapsedMs < flowDurationMs + GRACE_MS;

  return {
    countdown,
    timeLeft,
    score,
    currentCard,
    words,
    flowProgress,
    flowDurationMs,
    isFlowComplete,
    isInGrace,
    gameOver,
    correctCount,
    skipCount,
    markCorrect,
    skip,
  };
}
