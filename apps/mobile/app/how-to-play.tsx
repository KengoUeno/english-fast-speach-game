import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Animated, Easing, Platform, Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Shell } from '../components/Shell';
import { GameButton } from '../components/GameButton';
import { Mascot } from '../components/Mascot';
import { BORDER, COLORS, FONTS, INK, LABEL, LINK, RADIUS } from '../theme';

// RN Web では useNativeDriver が未対応のため、Web だけ JS ドライバに落とす
const NATIVE_DRIVER = Platform.OS !== 'web';

/** 「遊び方」画面専用の実演文（プレイ中のお題とは無関係の飾り） */
const DEMO_SENTENCE = 'This animal has a long trunk and huge ears in the savanna.';

export default function HowToPlayScreen() {
  const router = useRouter();

  return (
    <Shell>
      <View style={{ alignItems: 'center', marginBottom: 30 }}>
        <Mascot size={64} style={{ marginLeft: 32, marginBottom: 12 }} />
        <Text
          style={{
            fontFamily: FONTS.heading,
            fontSize: 11,
            letterSpacing: 4,
            color: COLORS.orange,
            marginBottom: 6,
          }}
        >
          HOW TO PLAY
        </Text>
        <Text
          style={{
            fontFamily: FONTS.heading,
            fontSize: 26,
            lineHeight: 34,
            color: COLORS.navy,
            textAlign: 'center',
          }}
        >
          遊び方
        </Text>
      </View>

      <RuleSection number={1} title="役割は2つ">
        <RoleRow
          badge="読"
          badgeColor={COLORS.navy}
          badgeTextColor={COLORS.cream}
          title="読み手"
          count="1人"
          body="端末を持って、流れる英文を声に出して読む。お題の単語と説明文の両方が画面に見えている。"
        />

        <View style={{ height: BORDER.thin, backgroundColor: COLORS.hairline, marginVertical: 14 }} />

        <RoleRow
          badge="聞"
          badgeColor={COLORS.orange}
          badgeTextColor={COLORS.creamCard}
          title="聞き手"
          count="1人以上"
          callout="画面を見ない。"
          body="音読だけを聞いて、お題の単語が何かを当てる。"
        />
      </RuleSection>

      <RuleSection number={2} title="説明文は自動で流れる">
        <Text style={bodyText}>
          説明文は画面の下から上へ、自動でスクロールして流れていく。流れ切ってしまう前に、声に出して読み切るのがこのゲームの核心。実際の動きを見てみよう。
        </Text>
        <FlowDemo />
      </RuleSection>

      <RuleSection number={3} title="判定のしかた">
        <JudgeRow
          tag="+1点"
          tagBg={COLORS.green}
          tagColor={COLORS.creamCard}
          text="聞き手が正解したら「✓ CORRECT!」をタップ → +1点で次のお題へ"
        />
        <JudgeRow
          tag="加点なし"
          tagBg={COLORS.creamCard}
          tagColor={COLORS.orange}
          tagBorder={COLORS.orange}
          text="読めない・わからないときは「SKIP」をタップ → 加点なしで次のお題へ"
        />
        <JudgeRow
          tag="自動"
          tagBg={COLORS.creamCard}
          tagColor={INK.strong}
          tagBorder={COLORS.hairline}
          text="流れ切ってから猶予時間が過ぎても操作がなければ、自動で次のお題へ進む（加点なし）"
          last
        />
      </RuleSection>

      {/* 4つ目は枠で囲まず、オレンジの縦罫だけの「補足」として扱い、
          同じカードが4枚並ぶ単調さを崩す */}
      <View style={{ flexDirection: 'row', marginTop: 4, marginBottom: 28 }}>
        <View
          style={{
            width: 4,
            borderRadius: RADIUS.pill,
            backgroundColor: COLORS.orange,
            marginRight: 14,
          }}
        />
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <Text style={{ fontFamily: FONTS.display, fontSize: 13, color: COLORS.orange }}>4</Text>
            <Text style={{ fontFamily: FONTS.heading, fontSize: 16, color: COLORS.navy }}>
              端末の持ち方・コツ
            </Text>
          </View>
          <Text style={bodyText}>
            端末は読み手だけに画面が見えるように持とう。聞き手からは画面が見えない角度をキープするのがルール。
          </Text>
          <Text style={[bodyText, { marginTop: 10 }]}>
            制限時間（1分 / 3分 / 5分）とスクロール速度（簡単 / 普通 / 難しい）は、スタート設定画面でいつでも変更できる。人数やレベルに合わせて調整しよう。
          </Text>
        </View>
      </View>

      <GameButton
        variant="accent"
        size="lg"
        onPress={() => router.replace('/start')}
        testID="how-to-play-start-button"
        style={{ marginBottom: 16 }}
      >
        ゲームを始める
      </GameButton>

      <Pressable
        onPress={() => router.replace('/')}
        testID="how-to-play-home-link"
        style={{ alignItems: 'center', paddingVertical: 6 }}
      >
        <Text style={LINK}>ホームに戻る</Text>
      </Pressable>
    </Shell>
  );
}

const bodyText = {
  fontFamily: FONTS.bodyRegular,
  fontSize: 13,
  lineHeight: 22,
  color: INK.strong,
} as const;

/**
 * ルール説明の1セクション。
 * 見出しはホーム/プレイ画面と同じ「枠線にまたがるチップ」の作りにして、
 * ただの角丸カードの反復に見えないようにする（シリーズ共通の“付箋”の質感）。
 */
function RuleSection({
  number,
  title,
  children,
}: {
  number: number;
  title: string;
  children: ReactNode;
}) {
  return (
    <View
      style={{
        borderWidth: BORDER.thick,
        borderColor: COLORS.navy,
        borderRadius: RADIUS.panel,
        backgroundColor: COLORS.creamCard,
        paddingTop: 26,
        paddingBottom: 18,
        paddingHorizontal: 16,
        marginBottom: 20,
      }}
    >
      <View
        style={{
          position: 'absolute',
          top: -13,
          left: 16,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          backgroundColor: COLORS.navy,
          borderRadius: RADIUS.pill,
          paddingHorizontal: 14,
          paddingVertical: 5,
        }}
      >
        <Text style={{ fontFamily: FONTS.display, fontSize: 13, color: COLORS.yellow }}>{number}</Text>
        <Text style={{ fontFamily: FONTS.heading, fontSize: 13, color: COLORS.cream }}>{title}</Text>
      </View>

      {children}
    </View>
  );
}

/** 役割の1行。左に漢字1文字のバッジを置き、ストックアイコンに頼らず役割を示す */
function RoleRow({
  badge,
  badgeColor,
  badgeTextColor,
  title,
  count,
  callout,
  body,
}: {
  badge: string;
  badgeColor: string;
  badgeTextColor: string;
  title: string;
  count: string;
  callout?: string;
  body: string;
}) {
  return (
    <View style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}>
      <View
        style={{
          width: 38,
          height: 38,
          borderRadius: RADIUS.box,
          backgroundColor: badgeColor,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text style={{ fontFamily: FONTS.heading, fontSize: 19, lineHeight: 26, color: badgeTextColor }}>
          {badge}
        </Text>
      </View>

      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <Text style={{ fontFamily: FONTS.heading, fontSize: 15, color: COLORS.navy }}>{title}</Text>
          <View
            style={{
              borderWidth: BORDER.thin,
              borderColor: COLORS.hairline,
              borderRadius: RADIUS.pill,
              paddingHorizontal: 8,
              paddingVertical: 1,
            }}
          >
            <Text style={{ fontFamily: FONTS.bodyRegular, fontSize: 10, color: INK.muted }}>{count}</Text>
          </View>
        </View>

        {callout && (
          <View
            style={{
              alignSelf: 'flex-start',
              backgroundColor: COLORS.orange,
              borderRadius: RADIUS.pill,
              paddingHorizontal: 10,
              paddingVertical: 3,
              marginBottom: 6,
            }}
          >
            <Text style={{ fontFamily: FONTS.bodyBold, fontSize: 12, color: COLORS.creamCard }}>
              {callout}
            </Text>
          </View>
        )}

        <Text style={bodyText}>{body}</Text>
      </View>
    </View>
  );
}

/** 判定ルールの1行。左のタグで「点が入る／入らない」を色で言い切る */
function JudgeRow({
  tag,
  tagBg,
  tagColor,
  tagBorder,
  text,
  last,
}: {
  tag: string;
  tagBg: string;
  tagColor: string;
  tagBorder?: string;
  text: string;
  last?: boolean;
}) {
  return (
    <View
      style={{
        flexDirection: 'row',
        gap: 10,
        marginBottom: last ? 0 : 12,
        alignItems: 'flex-start',
      }}
    >
      <View
        style={{
          minWidth: 62,
          alignItems: 'center',
          backgroundColor: tagBg,
          borderWidth: tagBorder ? BORDER.thin : 0,
          borderColor: tagBorder ?? 'transparent',
          borderRadius: RADIUS.pill,
          paddingHorizontal: 8,
          paddingVertical: 3,
          marginTop: 1,
        }}
      >
        <Text style={{ fontFamily: FONTS.heading, fontSize: 11, color: tagColor }}>{tag}</Text>
      </View>
      <Text style={[bodyText, { flex: 1 }]}>{text}</Text>
    </View>
  );
}

/**
 * 「流れる説明文」を実際に動かして見せるミニデモ。
 * ホーム画面の FlowPreview と同じ考え方（cream の額縁にくり抜いた navy の窓の中を、
 * 平面のまま等速でテキストが下から上へ流れる）をこの画面用に持たせたもの。
 * 単語単位のハイライトは行わない。傾き・縮小・消失点フェードも付けない。
 */
const DEMO_VIEWPORT_HEIGHT = 120;
const DEMO_FONT_SIZE = 17;
const DEMO_LINE_HEIGHT = 25;
const DEMO_FADE_HEIGHT = 16;
const DEMO_FALLBACK_BLOCK_HEIGHT = DEMO_LINE_HEIGHT * 3;
const DEMO_LOOP_MS = 4800;

function FlowDemo() {
  const progress = useRef(new Animated.Value(0)).current;
  const [blockHeight, setBlockHeight] = useState(DEMO_FALLBACK_BLOCK_HEIGHT);

  useEffect(() => {
    let isActive = true;

    const runLoop = () => {
      progress.setValue(0);
      Animated.timing(progress, {
        toValue: 1,
        duration: DEMO_LOOP_MS,
        easing: Easing.linear,
        useNativeDriver: NATIVE_DRIVER,
      }).start(({ finished }) => {
        if (finished && isActive) {
          runLoop();
        }
      });
    };

    runLoop();
    return () => {
      isActive = false;
      progress.stopAnimation();
    };
  }, [progress]);

  const translateY = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [DEMO_VIEWPORT_HEIGHT, -blockHeight],
  });

  return (
    <View style={{ marginTop: 16 }}>
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 8,
        }}
      >
        <Text style={LABEL}>DESCRIPTION</Text>
        <Text style={[LABEL, { fontSize: 9, color: INK.soft }]}>実演デモ</Text>
      </View>

      {/* プレイ画面と同じ位置・同じ太さの進捗バー。「残り時間で流れ切る」ことを予告する */}
      <View
        style={{
          height: 6,
          borderRadius: RADIUS.pill,
          backgroundColor: COLORS.hairline,
          marginBottom: 12,
          overflow: 'hidden',
        }}
      >
        <Animated.View
          style={{
            height: '100%',
            width: '100%',
            borderRadius: RADIUS.pill,
            backgroundColor: COLORS.green,
            // width(%) はネイティブドライバに載らないため scaleX で伸ばす
            transformOrigin: '0% 50%',
            transform: [{ scaleX: progress }],
          }}
        />
      </View>

      <View
        testID="how-to-play-flow-demo"
        style={{
          height: DEMO_VIEWPORT_HEIGHT,
          overflow: 'hidden',
          backgroundColor: COLORS.navy,
          borderRadius: RADIUS.box,
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
            style={{
              fontFamily: FONTS.bodyRegular,
              fontSize: DEMO_FONT_SIZE,
              lineHeight: DEMO_LINE_HEIGHT,
              color: COLORS.cream,
              textAlign: 'center',
              paddingHorizontal: 14,
            }}
          >
            {DEMO_SENTENCE}
          </Text>
        </Animated.View>

        <DemoHaze />
        <DemoHaze edge="bottom" />
      </View>
    </View>
  );
}

const DEMO_HAZE_BANDS = 8;

function DemoHaze({ edge = 'top' }: { edge?: 'top' | 'bottom' }) {
  const isTop = edge === 'top';

  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        height: DEMO_FADE_HEIGHT,
        ...(isTop ? { top: 0 } : { bottom: 0 }),
      }}
    >
      {Array.from({ length: DEMO_HAZE_BANDS }).map((_, index) => {
        const t = (isTop ? index : DEMO_HAZE_BANDS - 1 - index) / (DEMO_HAZE_BANDS - 1);
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
