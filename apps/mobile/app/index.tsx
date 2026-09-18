import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Linking, Platform, Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import Constants from 'expo-constants';
import { Shell } from '../components/Shell';
import { GameButton } from '../components/GameButton';
import { Mascot } from '../components/Mascot';
import { PRIVACY_POLICY_URL, SUPPORT_URL } from '../lib/links';
import { BORDER, COLORS, FONTS, INK, LABEL, RADIUS } from '../theme';

/** app.json の version をそのまま表示する（画面側にバージョン文字列をハードコードしない） */
const APP_VERSION = Constants.expoConfig?.version ?? '1.0.0';

/** ホームで中核メカニクスを見せるためのデモ文（プレイ中のお題とは無関係の飾り） */
const DEMO_SENTENCE = 'Catch the flowing text before it disappears into the distance.';

// RN Web では useNativeDriver が未対応のため、Web だけ JS ドライバに落とす
const NATIVE_DRIVER = Platform.OS !== 'web';

export default function HomeScreen() {
  const router = useRouter();

  return (
    <Shell>
      <View style={{ alignItems: 'center' }}>
        <View
          style={{
            borderWidth: BORDER.thin,
            borderColor: COLORS.orange,
            borderRadius: RADIUS.pill,
            paddingHorizontal: 14,
            paddingVertical: 5,
            marginBottom: 18,
          }}
        >
          <Text style={{ fontFamily: FONTS.heading, fontSize: 12, color: COLORS.orange }}>
            🗣 声に出して遊ぶパーティーゲーム
          </Text>
        </View>

        <Mascot size={86} style={{ marginLeft: 43, marginBottom: 2 }} />
      </View>

      <Text
        style={{
          fontFamily: FONTS.heading,
          fontSize: 40,
          lineHeight: 52,
          textAlign: 'center',
          color: COLORS.navy,
        }}
      >
        追いつけ
        <Text style={{ fontFamily: FONTS.display, color: COLORS.orange }}>English</Text>
      </Text>

      <Text
        style={{
          fontFamily: FONTS.bodyRegular,
          fontSize: 12,
          textAlign: 'center',
          color: INK.muted,
          marginTop: 6,
          marginBottom: 30,
          lineHeight: 21,
        }}
      >
        流れる英文に声で追いつこう！{'\n'}
        読み手は音読、聞き手は単語を当てるパーティーゲーム。
      </Text>

      <FlowPreview />

      <GameButton
        variant="primary"
        size="lg"
        onPress={() => router.replace('/start')}
        testID="game-start-button"
        style={{ marginTop: 32 }}
      >
        GAME START
      </GameButton>

      {/* GAME STARTを主役に保ったまま、遊び方・ストア・コード入力への入口は控えめなリンクとして添える */}
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'center',
          flexWrap: 'wrap',
          gap: 10,
          marginTop: 4,
        }}
      >
        <SecondaryLinkChip
          badge="?"
          label="遊び方を見る"
          testID="how-to-play-link"
          onPress={() => router.replace('/how-to-play')}
        />
        <SecondaryLinkChip
          badge="$"
          label="ストア"
          testID="store-link"
          onPress={() => router.replace('/store')}
        />
        {/* 「コードを発行する（貸す）」と「コードを入力する（借りる）」の両方を
            1つの入口にまとめたもの。タップ後の /share ハブ画面でホスト/ゲストを選ぶ
            （ユーザーからの続けてのUXフィードバックによる改訂）。購入状況に関わらず
            常に表示する（ゲスト側の入口としては常に必要なため。ホスト側の可否判定は
            ハブ画面側で行う）。バッジをオレンジにして「買う／学ぶ」系の入口と区別する */}
        <SecondaryLinkChip
          badge="→"
          label="パックを共有する"
          testID="share-link"
          badgeColor={COLORS.orange}
          badgeTextColor={COLORS.creamCard}
          onPress={() => router.replace('/share')}
        />
      </View>

      <Text
        style={{
          fontFamily: FONTS.bodyRegular,
          fontSize: 11,
          textAlign: 'center',
          color: INK.muted,
          marginTop: 14,
        }}
      >
        文章が奥へ消えてしまう前に、声で読みきろう。
      </Text>

      <LegalFooter />
    </Shell>
  );
}

/**
 * ホーム下部の法務リンク＋バージョン表示（Sprint 5 成果物C）。
 * GAME START を主役に保つため、下線付きの小さなテキストリンクだけの
 * 最も控えめな見た目にする（SecondaryLinkChip のバッジ付きピルより弱い扱い）。
 * リンク先URLは lib/links.ts の1箇所にのみ定義し、ここではその定数を参照するだけにする。
 */
function LegalFooter() {
  const openExternal = (url: string) => {
    // Web / ネイティブ双方で使える Linking.openURL。
    // 失敗しても（ポップアップブロックなど）ゲーム進行には一切影響させず、例外を投げない。
    Linking.openURL(url).catch(() => {});
  };

  return (
    <View
      style={{
        marginTop: 28,
        paddingTop: 16,
        borderTopWidth: BORDER.thin,
        borderTopColor: COLORS.hairline,
        alignItems: 'center',
        gap: 8,
      }}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 18 }}>
        <Pressable onPress={() => openExternal(PRIVACY_POLICY_URL)} testID="privacy-policy-link">
          <Text
            style={{
              fontFamily: FONTS.bodyRegular,
              fontSize: 11,
              color: INK.soft,
              textDecorationLine: 'underline',
            }}
          >
            プライバシーポリシー
          </Text>
        </Pressable>
        <Pressable onPress={() => openExternal(SUPPORT_URL)} testID="support-link">
          <Text
            style={{
              fontFamily: FONTS.bodyRegular,
              fontSize: 11,
              color: INK.soft,
              textDecorationLine: 'underline',
            }}
          >
            お問い合わせ
          </Text>
        </Pressable>
      </View>
      <Text
        testID="app-version"
        style={{ fontFamily: FONTS.bodyRegular, fontSize: 10, color: INK.ghost }}
      >
        version {APP_VERSION}
      </Text>
    </View>
  );
}

/** ホーム下部の副次的な入口チップ（遊び方・ストア）。GAME STARTより弱い見た目で統一する */
function SecondaryLinkChip({
  badge,
  label,
  onPress,
  testID,
  badgeColor = COLORS.navy,
  badgeTextColor = COLORS.yellow,
}: {
  badge: string;
  label: string;
  onPress: () => void;
  testID: string;
  /** バッジ円の地色。入口の種類を色で描き分けたいときだけ変える */
  badgeColor?: string;
  badgeTextColor?: string;
}) {
  return (
    <Pressable onPress={onPress} testID={testID} style={{ alignItems: 'center', paddingVertical: 6 }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          borderWidth: BORDER.thin,
          borderColor: COLORS.hairline,
          borderRadius: RADIUS.pill,
          paddingLeft: 8,
          paddingRight: 14,
          paddingVertical: 6,
        }}
      >
        {/* 絵文字は端末ごとに見え方が変わるため、ブランド色のバッジ文字で置き換える */}
        <View
          style={{
            width: 20,
            height: 20,
            borderRadius: RADIUS.pill,
            backgroundColor: badgeColor,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={{ fontFamily: FONTS.display, fontSize: 12, lineHeight: 15, color: badgeTextColor }}>
            {badge}
          </Text>
        </View>
        <Text style={{ fontFamily: FONTS.heading, fontSize: 12, color: COLORS.navy }}>{label}</Text>
      </View>
    </Pressable>
  );
}

/**
 * 本作の中核である「流れる説明文」をホームで実演する飾りパネル。
 * ゲーム本編のロジック（useGameEngine）は使わず、見た目だけをループ再生する。
 * 単語単位のハイライトは一切行わない。
 *
 * 見た目はプレイ画面の FlowingDescription をそのまま縮小した「同じ世界」にしてある:
 *   cream の額縁 → その中にくり抜かれた navy の「窓」 → 窓の中を下から上へ
 *   平面のまま等速で流れる本文。傾き・縮小・消失点フェードは付けない
 *  （実機確認の結果、3D遠近法は可読性を損なうため廃止し平面スクロールに統一した）。
 * 寸法はプレイ画面の約0.72倍で一括縮小してある（ホームは実演用の一回り小さい窓）。
 */
/** 以下はすべてプレイ画面の寸法の約0.72倍（ホームは実演用の一回り小さい窓） */
/** プレイ画面: 180 */
const DEMO_VIEWPORT_HEIGHT = 130;
/** プレイ画面: 24 / 36 */
const DEMO_FONT_SIZE = 18;
const DEMO_LINE_HEIGHT = 26;
/** プレイ画面: 22 */
const DEMO_FADE_HEIGHT = 16;
/** 本文の高さが測れるまでの暫定値（2行ぶん） */
const DEMO_FALLBACK_BLOCK_HEIGHT = DEMO_LINE_HEIGHT * 2;
/** デモ文は10語。仕様の LEAD_IN 1000ms + 400ms/語 に合わせた尺にしてある */
const DEMO_LOOP_MS = 5000;

function FlowPreview() {
  const progress = useRef(new Animated.Value(0)).current;
  // プレイ画面と同じく、本文の実寸から走行距離を決める。
  // 端末幅で行数が変われば必要な距離も変わるため、固定値にはしない
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

  // 窓の下端のすぐ外（進行度0）から、本文の下端が窓の上端を抜けきる位置
  // （進行度1）まで、translateY だけで等速に平面移動させる。傾き・縮小・
  // 急激な不透明度変化は付けない（プレイ画面の FlowingDescription と同じ動き）。
  const translateY = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [DEMO_VIEWPORT_HEIGHT, -blockHeight],
  });

  return (
    <View
      style={{
        borderWidth: BORDER.thick,
        borderColor: COLORS.navy,
        borderRadius: RADIUS.panel,
        backgroundColor: COLORS.creamCard,
        paddingHorizontal: 16,
        paddingTop: 16,
        paddingBottom: 14,
      }}
    >
      {/* プレイ画面のお題カードと同じ、枠線にまたがる黄色いチップ。
          均一なカードの単調さを崩しつつ、シリーズ共通の“付箋”の質感を保つ */}
      <View
        style={{
          position: 'absolute',
          top: -11,
          left: 18,
          backgroundColor: COLORS.yellow,
          borderRadius: RADIUS.pill,
          paddingHorizontal: 12,
          paddingVertical: 4,
        }}
      >
        <Text style={{ fontFamily: FONTS.heading, fontSize: 10, letterSpacing: 1.5, color: COLORS.navy }}>
          READER READS ALOUD
        </Text>
      </View>

      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          minHeight: 20,
        }}
      >
        <Text style={LABEL}>DESCRIPTION</Text>
        <Text style={[LABEL, { fontSize: 9, color: INK.soft }]}>DEMO</Text>
      </View>

      {/* プレイ画面と同じ位置・同じ太さの進捗バー。「残り時間で消える」ことを予告する */}
      <View
        style={{
          height: 6,
          borderRadius: RADIUS.pill,
          backgroundColor: COLORS.hairline,
          marginTop: 10,
          marginBottom: 14,
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

      {/* cream の額縁にくり抜いた navy の「窓」。プレイ画面と同じ、
          本文だけがその中を下から上へ流れていく見せ方にする */}
      <View
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
            }}
          >
            {DEMO_SENTENCE}
          </Text>
        </Animated.View>

        {/* 上下端の軽いフェード。文字が枠線でスパッと切れるのを和らげる程度の演出 */}
        <DemoHaze />
        <DemoHaze edge="bottom" />
      </View>
    </View>
  );
}

/**
 * プレイ画面の EdgeFade と同じ作りの、上下端の軽いフェード。
 * 追加の依存（expo-linear-gradient）を増やさないよう、地色の帯を
 * 二次曲線の不透明度で重ねて作る。Web / iOS / Android で同じ見え方になる。
 */
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
