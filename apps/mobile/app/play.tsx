import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  useGameEngine,
  formatTime,
  DEFAULT_GAME_TIME_SEC,
  DEFAULT_MS_PER_WORD,
  SPEED_OPTIONS,
  DEFAULT_PACK_ID,
  getPackById,
  isPackPlayable,
  computeAccuracyPercent,
  getPraiseMessage,
  type Pack,
} from 'game-core';
import { GameButton } from '../components/GameButton';
import { Mascot } from '../components/Mascot';
import { maybeRequestReview } from '../lib/reviewPrompt';
import { useIAPContext } from '../lib/iap';
import { useSharingContext } from '../lib/sharing';
import {
  BORDER,
  COLORS,
  CONTENT_MAX_WIDTH,
  FONTS,
  INK,
  LABEL,
  LINK,
  RADIUS,
} from '../theme';

// RN Web では useNativeDriver が未対応のため、Web だけ JS ドライバに落とす
const NATIVE_DRIVER = Platform.OS !== 'web';

export default function PlayScreen() {
  const params = useLocalSearchParams<{ time?: string; speed?: string; pack?: string }>();
  const parsedTime = parseInt(params.time ?? '', 10);
  const gameTime = Number.isFinite(parsedTime) && parsedTime > 0 ? parsedTime : DEFAULT_GAME_TIME_SEC;

  // speedパラメータは /start のSPEED_OPTIONSからのみ渡ってくる想定だが、
  // 不正な値（直接URL操作など）が来た場合は既知の速度レベルに丸め、デフォルト（普通）にフォールバックする
  const parsedSpeed = parseInt(params.speed ?? '', 10);
  const isKnownSpeed = SPEED_OPTIONS.some((option) => option.value === parsedSpeed);
  const msPerWord = isKnownSpeed ? parsedSpeed : DEFAULT_MS_PER_WORD;

  // packパラメータも同様に、直接URL操作などでプレイできないパックが渡ってきた場合に備えて
  // 所有状態＋一時解放状態を再確認し、どちらでもプレイできないなら安全にスターターへ
  // フォールバックする（多層防御。通常はスタート設定画面側で選択できないため到達しないはずの経路）。
  //
  // `ready` がfalseの間（＝IAPProvider/SharingProvider起動時のデバッグ注入・購入状態・
  // 一時解放状態の非同期ロードが完了していない間）はownedPackIds/tempUnlockedPackIdsが
  // まだ未確定なため、この時点でactivePackを確定して<GameScreen>（useGameEngineの初回
  // カード抽選を含む）をマウントしてはならない。フルページ遷移・リロード直後にここで
  // スターターへフォールバックしてしまうと、useGameEngine側の初回抽選（マウント時に
  // 1回だけ実行）がスターターのcardsで確定してしまい、その後所有状態が正しい値に
  // 更新されても1問目だけスターターのままになる競合状態バグになる（Sprint 3 Evaluator指摘）。
  // そのため ready になるまでは軽いローディング表示のみを出す。
  //
  // なお、ここで確定したactivePackはGameScreenのマウント時に一度だけ使われる値であり、
  // プレイ中に一時解放の期限が切れても再判定はしない（Sprint 4契約: プレイ中に期限が
  // 切れてもクラッシュせずリザルト画面まで到達できること。既に読み込み済みのカードで
  // 最後まで遊べる）。
  const { ready: iapReady, ownedPackIds } = useIAPContext();
  const { ready: sharingReady, tempUnlockedPackIds } = useSharingContext();

  const router = useRouter();
  const handleHome = () => router.replace('/');

  if (!iapReady || !sharingReady) {
    return <PlayLoadingView />;
  }

  const requestedPack = getPackById(params.pack ?? '') ?? getPackById(DEFAULT_PACK_ID);
  const activePack =
    requestedPack && isPackPlayable(requestedPack, ownedPackIds, tempUnlockedPackIds)
      ? requestedPack
      : getPackById(DEFAULT_PACK_ID)!;

  return (
    <GameScreen
      key={activePack.id}
      activePack={activePack}
      gameTime={gameTime}
      msPerWord={msPerWord}
      onHome={handleHome}
    />
  );
}

/**
 * IAPの起動時ロード（デバッグ注入・購入状態の復元）完了を待つ間だけ表示する、ごく短命の
 * 軽量ローディング表示。通常のアプリ内遷移（ホーム→スタート設定→START）では
 * この時点で既に`ready`はtrueになっているため実際にはほぼ表示されない。
 */
function PlayLoadingView() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.cream }}>
      <View
        style={{
          flex: 1,
          width: '100%',
          maxWidth: CONTENT_MAX_WIDTH,
          alignSelf: 'center',
          alignItems: 'center',
          justifyContent: 'center',
          paddingHorizontal: 20,
        }}
      >
        <Mascot size={72} style={{ marginLeft: 36, marginBottom: 20 }} />
        <Text testID="play-loading" style={LABEL}>
          じゅんびちゅう...
        </Text>
      </View>
    </SafeAreaView>
  );
}

function GameScreen({
  activePack,
  gameTime,
  msPerWord,
  onHome,
}: {
  activePack: Pack;
  gameTime: number;
  msPerWord: number;
  onHome: () => void;
}) {
  const {
    countdown,
    timeLeft,
    score,
    currentCard,
    flowProgress,
    isInGrace,
    gameOver,
    correctCount,
    skipCount,
    markCorrect,
    skip,
  } = useGameEngine({ cards: activePack.cards, gameTimeSec: gameTime, msPerWord });

  const isTimeLow = timeLeft <= 10 && timeLeft > 0;

  // レビュー訴求（機能D）: リザルト到達のたびに1回だけ完了回数を記録し、
  // 条件を満たせばOS標準のレビューダイアログを控えめにリクエストする。
  // 内部で例外を握りつぶすため、非対応環境（Web等）や失敗時もゲーム進行を妨げない。
  const reviewRequestedRef = useRef(false);
  useEffect(() => {
    if (!gameOver || reviewRequestedRef.current) return;
    reviewRequestedRef.current = true;
    maybeRequestReview().catch(() => {
      // maybeRequestReview自体が内部で例外を握りつぶす設計だが、
      // 呼び出し側でも二重に防御しリザルト画面の表示に一切影響させない
    });
  }, [gameOver]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.cream }}>
      <View
        style={{
          flex: 1,
          width: '100%',
          maxWidth: CONTENT_MAX_WIDTH,
          alignSelf: 'center',
          paddingHorizontal: 20,
          paddingVertical: 16,
        }}
      >
        {countdown > 0 ? (
          <CountdownView countdown={countdown} />
        ) : !gameOver ? (
          // ヘッダー・お題・説明文・操作をひと塊として画面中央に置く。
          // 上下の端に貼り付けると背の高い端末で中央が間延びするため、
          // 「1枚のゲーム盤」としてまとめて中央に寄せる。
          <View style={{ flex: 1, justifyContent: 'center' }}>
            <GameHeader score={score} timeLeft={timeLeft} isTimeLow={isTimeLow} />

            {currentCard && (
              <>
                <TargetWordCard targetWord={currentCard.targetWord} />
                <FlowingDescription
                  key={currentCard.id}
                  description={currentCard.description}
                  flowProgress={flowProgress}
                  isInGrace={isInGrace}
                />
              </>
            )}

            <View style={{ marginTop: 18 }}>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <GameButton
                  variant="skip"
                  onPress={skip}
                  disabled={gameOver}
                  style={{ flex: 1 }}
                  testID="skip-button"
                >
                  SKIP
                </GameButton>
                <GameButton
                  variant="approve"
                  onPress={markCorrect}
                  disabled={gameOver}
                  style={{ flex: 1.25 }}
                  testID="correct-button"
                >
                  ✓ CORRECT!
                </GameButton>
              </View>
              <Pressable onPress={onHome} style={{ alignItems: 'center', paddingVertical: 12 }}>
                <Text style={LINK}>ゲームを中断してホームに戻る</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <ResultView
            score={score}
            correctCount={correctCount}
            skipCount={skipCount}
            gameTimeSec={gameTime}
            msPerWord={msPerWord}
            onHome={onHome}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

/**
 * 「3・2・1」のカウントダウン。
 * 数字が跳ねて現れるスプリングと、残りカウントを示すドットで開始の高揚感を作る。
 */
function CountdownView({ countdown }: { countdown: number }) {
  const scale = useRef(new Animated.Value(0.45)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    scale.setValue(0.45);
    opacity.setValue(0);
    Animated.parallel([
      Animated.spring(scale, { toValue: 1, friction: 5, useNativeDriver: NATIVE_DRIVER }),
      Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: NATIVE_DRIVER }),
    ]).start();
  }, [countdown, scale, opacity]);

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Mascot size={72} style={{ marginLeft: 36, marginBottom: 20 }} />

      <Text
        style={{
          fontFamily: FONTS.heading,
          fontSize: 13,
          letterSpacing: 3,
          color: INK.muted,
          marginBottom: 22,
        }}
      >
        ゲームスタートまで
      </Text>

      <View
        style={{
          width: 168,
          height: 168,
          borderRadius: RADIUS.pill,
          borderWidth: 3,
          borderColor: COLORS.navy,
          backgroundColor: COLORS.creamCard,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Animated.Text
          testID="countdown-value"
          style={{
            fontFamily: FONTS.display,
            fontSize: 96,
            lineHeight: 118,
            color: COLORS.orange,
            transform: [{ scale }],
            opacity,
          }}
        >
          {countdown}
        </Animated.Text>
      </View>

      <View style={{ flexDirection: 'row', gap: 10, marginTop: 28 }}>
        {[3, 2, 1].map((step) => (
          <View
            key={step}
            style={{
              width: 10,
              height: 10,
              borderRadius: RADIUS.pill,
              backgroundColor: step >= countdown ? COLORS.orange : COLORS.hairline,
            }}
          />
        ))}
      </View>
    </View>
  );
}

/** スコアは塗り、残り時間は輪郭。左右で質感を変えて単調な並びを避ける */
function GameHeader({
  score,
  timeLeft,
  isTimeLow,
}: {
  score: number;
  timeLeft: number;
  isTimeLow: boolean;
}) {
  return (
    <View
      style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'baseline',
          gap: 8,
          backgroundColor: COLORS.navy,
          borderRadius: RADIUS.pill,
          paddingHorizontal: 16,
          paddingVertical: 7,
        }}
      >
        <Text style={[LABEL, { color: COLORS.yellow }]}>SCORE</Text>
        <Text
          testID="score-value"
          style={{ fontFamily: FONTS.display, fontSize: 24, lineHeight: 30, color: COLORS.cream }}
        >
          {score}
        </Text>
      </View>

      <View
        style={{
          flexDirection: 'row',
          alignItems: 'baseline',
          gap: 8,
          borderWidth: BORDER.thick,
          borderColor: isTimeLow ? COLORS.orange : COLORS.hairline,
          backgroundColor: COLORS.creamCard,
          borderRadius: RADIUS.pill,
          paddingHorizontal: 16,
          paddingVertical: 5,
        }}
      >
        <Text style={[LABEL, isTimeLow ? { color: COLORS.orange } : null]}>TIME</Text>
        <Text
          testID="time-left-value"
          style={{
            fontFamily: FONTS.display,
            fontSize: 24,
            lineHeight: 30,
            color: isTimeLow ? COLORS.orange : COLORS.navy,
          }}
        >
          {formatTime(timeLeft)}
        </Text>
      </View>
    </View>
  );
}

/** お題カード。パネルの縁にまたがる黄色いチップで「音読するお題」であることを示す */
function TargetWordCard({ targetWord }: { targetWord: string }) {
  const bilingualParts = targetWord.includes('/')
    ? targetWord.split('/').map((part) => part.trim())
    : null;

  return (
    <View
      style={{
        backgroundColor: COLORS.navy,
        borderRadius: RADIUS.card,
        paddingTop: 20,
        paddingBottom: 16,
        paddingHorizontal: 16,
        alignItems: 'center',
      }}
    >
      <View
        style={{
          position: 'absolute',
          top: -10,
          alignSelf: 'center',
          backgroundColor: COLORS.yellow,
          borderRadius: RADIUS.pill,
          paddingHorizontal: 12,
          paddingVertical: 3,
        }}
      >
        <Text style={{ fontFamily: FONTS.heading, fontSize: 10, letterSpacing: 2, color: COLORS.navy }}>
          🗣 お題
        </Text>
      </View>

      {bilingualParts ? (
        <>
          <Text
            testID="target-word-ja"
            style={{
              fontFamily: FONTS.heading,
              fontSize: 15,
              lineHeight: 22,
              color: 'rgba(255,249,238,0.72)',
              textAlign: 'center',
            }}
          >
            {bilingualParts[0]}
          </Text>
          <Text
            testID="target-word-en"
            style={{
              fontFamily: FONTS.display,
              fontSize: 32,
              lineHeight: 42,
              color: COLORS.cream,
              textAlign: 'center',
            }}
          >
            {bilingualParts[1]}
          </Text>
        </>
      ) : (
        <Text
          testID="target-word-en"
          style={{
            fontFamily: FONTS.display,
            fontSize: 32,
            lineHeight: 42,
            color: COLORS.cream,
            textAlign: 'center',
          }}
        >
          {targetWord}
        </Text>
      )}
    </View>
  );
}

/**
 * 本作の中核。説明文全体を画面下から上へ、傾き・縮小のない平面のまま
 * 一定速度でスクロールアップさせる。単語単位のハイライトは行わない
 * （本文全体が一体となって流れる）。
 *
 * 当初はスター・ウォーズのオープニングクロールのような3D遠近法（傾き・縮小・
 * 消失点フェード）を採用していたが、実機確認の結果「速く正確に読む」という
 * 本作のコア体験と相性が悪く可読性を損なうと判断し、平面スクロールに戻した
 * （文字サイズ・濃さは終始一定）。
 *
 * 上部のバーが「あとどれだけで読み切られるか」を示し、
 * 猶予時間に入ると枠と見出しがオレンジに切り替わって最後のチャンスを知らせる。
 */
const FLOW_VIEWPORT_HEIGHT = 180;
const FLOW_FONT_SIZE = 24;
const FLOW_LINE_HEIGHT = 36;
/** 本文の高さが測れるまでの暫定値（3行ぶん） */
const FLOW_FALLBACK_BLOCK_HEIGHT = FLOW_LINE_HEIGHT * 3;
/** 上下の軽いフェード（読みやすさのための最低限の演出。任意） */
const FLOW_FADE_HEIGHT = 22;

function FlowingDescription({
  description,
  flowProgress,
  isInGrace,
}: {
  description: string;
  flowProgress: number;
  isInGrace: boolean;
}) {
  const progress = useRef(new Animated.Value(0)).current;
  // 本文の実寸（行数）に応じて走行距離を決める。
  // 固定距離にすると長文だけ最後の行がビューポートを抜けきらないため、
  // 実測した高さぶんだけ余分に上へ移動させる。
  const [blockHeight, setBlockHeight] = useState(FLOW_FALLBACK_BLOCK_HEIGHT);

  useEffect(() => {
    // FLOW_TICK_MS（useGameEngine側）と同じ粒度で滑らかに追従させる
    Animated.timing(progress, {
      toValue: flowProgress,
      duration: 120,
      easing: Easing.linear,
      useNativeDriver: NATIVE_DRIVER,
    }).start();
  }, [flowProgress, progress]);

  const accent = isInGrace ? COLORS.orange : COLORS.navy;

  // 画面下端のすぐ外（進行度0）から、ビューポート上端をブロックの下端が
  // 通過しきる位置（進行度1）まで、translateY だけで等速に平面移動させる。
  // 傾き・縮小・急激な不透明度変化は付けない。
  const translateY = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [FLOW_VIEWPORT_HEIGHT, -blockHeight],
  });

  return (
    <View
      style={{
        marginTop: 16,
        borderWidth: BORDER.thick,
        borderColor: accent,
        borderRadius: RADIUS.panel,
        backgroundColor: COLORS.creamCard,
        overflow: 'hidden',
        paddingHorizontal: 18,
        paddingTop: 14,
        paddingBottom: 0,
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          minHeight: 22,
        }}
      >
        <Text style={LABEL}>DESCRIPTION</Text>
        {isInGrace && <GraceBadge />}
      </View>

      <View
        style={{
          height: 6,
          borderRadius: RADIUS.pill,
          backgroundColor: COLORS.hairline,
          marginTop: 10,
          marginBottom: 16,
          overflow: 'hidden',
        }}
      >
        <Animated.View
          style={{
            height: '100%',
            borderRadius: RADIUS.pill,
            backgroundColor: isInGrace ? COLORS.orange : COLORS.green,
            width: progress.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
          }}
        />
      </View>

      {/* 本文はビューポート内だけに表示させたいので overflow: hidden にし、
          その中でテキストブロックを translateY だけで下から上へ動かす。
          ブロックの初期位置（top）はビューポート下端に固定する */}
      <View
        style={{
          height: FLOW_VIEWPORT_HEIGHT,
          overflow: 'hidden',
          // 本文の舞台だけを暗く落とす。手前のcreamの額縁に対して「窓」として
          // 抜けて見え、シリーズのビジュアルトーン（プレイ画面=集中する場）を保つ
          backgroundColor: COLORS.navy,
          borderRadius: RADIUS.box,
          marginBottom: 14,
        }}
      >
        <Animated.View
          onLayout={(event) => setBlockHeight(event.nativeEvent.layout.height)}
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: 0,
            transform: [{ translateY }],
          }}
        >
          <Text
            testID="flowing-description"
            style={{
              fontFamily: FONTS.bodyRegular,
              fontSize: FLOW_FONT_SIZE,
              lineHeight: FLOW_LINE_HEIGHT,
              color: COLORS.cream,
              textAlign: 'center',
            }}
          >
            {description}
          </Text>
        </Animated.View>

        {/* 上下端の軽いフェード。文字が枠線でスパッと切れるのを和らげる程度の演出 */}
        <EdgeFade />
        <EdgeFade edge="bottom" />
      </View>
    </View>
  );
}

/**
 * ビューポート上下端の軽いフェード。
 * expo-linear-gradient を足さずに済むよう、地色の帯を段階的な不透明度で重ねて作る。
 * Web / iOS / Android で同じ見え方になり、依存も増えない。
 */
const FADE_BANDS = 8;

function EdgeFade({ edge = 'top' }: { edge?: 'top' | 'bottom' }) {
  const isTop = edge === 'top';

  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        height: FLOW_FADE_HEIGHT,
        ...(isTop ? { top: 0 } : { bottom: 0 }),
      }}
    >
      {Array.from({ length: FADE_BANDS }).map((_, index) => {
        // 縁は完全に地色、内側へ向かって二次曲線で抜く（直線だと境目が帯に見える）
        const t = (isTop ? index : FADE_BANDS - 1 - index) / (FADE_BANDS - 1);
        return (
          <View
            key={index}
            style={{ flex: 1, backgroundColor: COLORS.navy, opacity: (1 - t) * (1 - t) }}
          />
        );
      })}
    </View>
  );
}

/** 猶予時間中だけ現れる、脈打つオレンジのバッジ */
function GraceBadge() {
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 0.45,
          duration: 420,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: NATIVE_DRIVER,
        }),
        Animated.timing(pulse, {
          toValue: 1,
          duration: 420,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: NATIVE_DRIVER,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  return (
    <Animated.View
      style={{
        backgroundColor: COLORS.orange,
        borderRadius: RADIUS.pill,
        paddingHorizontal: 10,
        paddingVertical: 3,
        opacity: pulse,
      }}
    >
      <Text
        testID="grace-indicator"
        style={{ fontFamily: FONTS.heading, fontSize: 10, letterSpacing: 1.5, color: COLORS.creamCard }}
      >
        ラストチャンス！
      </Text>
    </Animated.View>
  );
}

/**
 * スコアのカウントアップ演出にかける時間(ms)。スコアが大きいほど少し長く、
 * 0点でも「演出なし」に見えないよう最低尺は確保する。
 */
function countUpDurationMs(score: number): number {
  return Math.min(1400, 400 + score * 80);
}

function ResultView({
  score,
  correctCount,
  skipCount,
  gameTimeSec,
  msPerWord,
  onHome,
}: {
  score: number;
  correctCount: number;
  skipCount: number;
  gameTimeSec: number;
  msPerWord: number;
  onHome: () => void;
}) {
  // FINAL SCORE を 0 から最終値へカウントアップさせる演出（機能C）。
  // ResultViewはゲームごとに新しくマウントされる（HOME→再スタートで作り直される）ため、
  // マウント時に一度だけ0→scoreへ走らせれば「再度ゲームを開始すると0からやり直される」を満たす。
  const [displayedScore, setDisplayedScore] = useState(0);
  const animatedScore = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    animatedScore.setValue(0);
    setDisplayedScore(0);

    // 値の読み出しにリスナーを使うため useNativeDriver は false 固定（Web/ネイティブ共通の挙動にする）
    const listenerId = animatedScore.addListener(({ value }) => {
      setDisplayedScore(Math.round(value));
    });

    const animation = Animated.timing(animatedScore, {
      toValue: score,
      duration: countUpDurationMs(score),
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    });

    animation.start(({ finished }) => {
      // アニメーションが丸め誤差なく確実に最終値と一致するように、完了時点で明示的に上書きする
      if (finished) setDisplayedScore(score);
    });

    return () => {
      animatedScore.removeListener(listenerId);
      animatedScore.stopAnimation();
    };
    // score/gameTimeSec/msPerWordはこのResultViewインスタンスの生存中は不変
    // （ゲームが終わるたびにPlayScreen配下でResultViewごと作り直される）ため、マウント時のみ実行する
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const accuracyPercent = computeAccuracyPercent(correctCount, skipCount);
  const praiseMessage = getPraiseMessage(score);
  const speedOption = SPEED_OPTIONS.find((option) => option.value === msPerWord);
  const speedLabel = speedOption ? speedOption.label : '普通';

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{ flexGrow: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 8 }}
      showsVerticalScrollIndicator={false}
    >
      <Mascot size={62} speaking={false} style={{ marginLeft: 31, marginBottom: 14 }} />

      <Text
        style={{
          fontFamily: FONTS.heading,
          fontSize: 12,
          letterSpacing: 4,
          color: COLORS.orange,
          marginBottom: 14,
        }}
      >
        TIME&apos;S UP!
      </Text>

      <View
        style={{
          backgroundColor: COLORS.navy,
          borderRadius: RADIUS.card,
          paddingTop: 22,
          paddingBottom: 26,
          paddingHorizontal: 16,
          alignItems: 'center',
          width: '100%',
        }}
      >
        <Text
          style={{
            fontFamily: FONTS.heading,
            fontSize: 10,
            letterSpacing: 2,
            color: COLORS.yellow,
            marginBottom: 2,
          }}
        >
          FINAL SCORE
        </Text>
        <Text
          testID="final-score"
          style={{ fontFamily: FONTS.display, fontSize: 64, lineHeight: 78, color: COLORS.cream }}
        >
          {displayedScore}
        </Text>
      </View>

      {/* 称賛メッセージ。0点でも否定的にならない文言をスコアの段階に応じて出し分ける。
          ホーム/プレイ画面と同じ「枠線にまたがる付箋」の作りで、スコア札と一体の締めに見せる */}
      <View
        style={{
          borderWidth: BORDER.thick,
          borderColor: COLORS.orange,
          borderRadius: RADIUS.pill,
          backgroundColor: COLORS.creamCard,
          paddingHorizontal: 18,
          paddingVertical: 8,
          marginTop: -18,
          marginBottom: 22,
          maxWidth: '100%',
        }}
      >
        <Text
          testID="praise-message"
          style={{
            fontFamily: FONTS.bodyBold,
            fontSize: 13,
            lineHeight: 20,
            color: COLORS.navy,
            textAlign: 'center',
          }}
        >
          {praiseMessage}
        </Text>
      </View>

      <View style={{ flexDirection: 'row', gap: 10, width: '100%', marginBottom: 18 }}>
        <StatCard testID="final-correct-count" value={correctCount} label="CORRECT" tint={COLORS.green} />
        <StatCard testID="final-skip-count" value={skipCount} label="SKIPPED" tint={COLORS.orange} />
      </View>

      {/* 正答率。カードを1枚増やさず、ラベル＋数値＋バーの帯として見せて、
          上のスコア/実績カードとの間に視覚的な段差をつける。
          1問も出題されなかった場合でも computeAccuracyPercent が 0 を返すため NaN/Infinity にならない */}
      <View style={{ width: '100%', marginBottom: 22 }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'baseline',
            justifyContent: 'space-between',
            marginBottom: 8,
          }}
        >
          <Text style={LABEL}>ACCURACY</Text>
          <Text
            testID="accuracy-value"
            style={{ fontFamily: FONTS.display, fontSize: 22, lineHeight: 26, color: COLORS.navy }}
          >
            {accuracyPercent}%
          </Text>
        </View>

        <View
          style={{
            height: 8,
            borderRadius: RADIUS.pill,
            backgroundColor: COLORS.hairline,
            overflow: 'hidden',
          }}
        >
          <View
            style={{
              height: '100%',
              width: `${Math.max(0, Math.min(100, accuracyPercent))}%`,
              borderRadius: RADIUS.pill,
              backgroundColor: COLORS.green,
            }}
          />
        </View>
      </View>

      {/* そのゲームの条件（制限時間・スクロール速度）。「次は速度を変えて挑戦する」の入口として、
          実績より一段弱い1本の帯にまとめる */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          width: '100%',
          borderWidth: BORDER.thin,
          borderColor: COLORS.hairline,
          borderRadius: RADIUS.pill,
          paddingVertical: 10,
          marginBottom: 26,
        }}
      >
        <ConditionCell testID="condition-time" label="TIME LIMIT" value={formatTime(gameTimeSec)} />
        <View style={{ width: BORDER.thin, alignSelf: 'stretch', backgroundColor: COLORS.hairline }} />
        <ConditionCell testID="condition-speed" label="SPEED" value={speedLabel} />
      </View>

      <GameButton variant="primary" size="lg" onPress={onHome} style={{ width: '100%' }} testID="home-button">
        HOME
      </GameButton>
    </ScrollView>
  );
}

/** リザルト画面の「このゲームの条件」帯の片側（制限時間・速度で共用） */
function ConditionCell({ testID, label, value }: { testID: string; label: string; value: string }) {
  return (
    <View style={{ flex: 1, alignItems: 'center', paddingHorizontal: 8 }}>
      <Text style={[LABEL, { fontSize: 9, color: INK.soft }]}>{label}</Text>
      <Text
        testID={testID}
        style={{ fontFamily: FONTS.heading, fontSize: 15, lineHeight: 22, color: INK.strong, marginTop: 2 }}
      >
        {value}
      </Text>
    </View>
  );
}

function StatCard({
  value,
  label,
  tint,
  testID,
}: {
  value: number;
  label: string;
  tint: string;
  testID: string;
}) {
  return (
    <View
      style={{
        flex: 1,
        alignItems: 'center',
        backgroundColor: COLORS.creamCard,
        borderWidth: BORDER.thin,
        borderColor: COLORS.hairline,
        borderRadius: RADIUS.box,
        paddingTop: 16,
        paddingBottom: 12,
        overflow: 'hidden',
      }}
    >
      {/* 上辺の色帯だけで2枚のカードを描き分け、装飾を足さずに意味の差をつける */}
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 5, backgroundColor: tint }} />
      <Text
        testID={testID}
        style={{ fontFamily: FONTS.display, fontSize: 30, lineHeight: 38, color: COLORS.navy }}
      >
        {value}
      </Text>
      <Text style={[LABEL, { fontSize: 9, marginTop: 2 }]}>{label}</Text>
    </View>
  );
}
