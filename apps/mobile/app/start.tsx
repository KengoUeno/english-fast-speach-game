import { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import {
  TIME_OPTIONS,
  DEFAULT_GAME_TIME_SEC,
  SPEED_OPTIONS,
  DEFAULT_MS_PER_WORD,
  PACKS,
  DEFAULT_PACK_ID,
  isPackOwned,
  isPackPlayable,
  formatRemainingDuration,
} from 'game-core';
import { Shell } from '../components/Shell';
import { GameButton } from '../components/GameButton';
import { Mascot } from '../components/Mascot';
import { PackEmblem } from '../components/PackEmblem';
import { HourglassGlyph } from '../components/ShareVisuals';
import { useIAPContext } from '../lib/iap';
import { useSharingContext } from '../lib/sharing';
import {
  BORDER,
  COLORS,
  FONTS,
  INK,
  LABEL,
  LINK,
  RADIUS,
  SHADES,
  lockedPackTones,
  packAccent,
} from '../theme';

/**
 * 3つの見出しは「ラベル＋罫線」という同じ型を保ちつつ、重みだけで階層をつける。
 * 制限時間と速度は既定値のまま始められる“調整つまみ”なので小さく、
 * テーマパック（選択肢が5つあり、ロック／購入済み／一時解放と状態も多い）を本題として大きく扱う。
 */
const MINOR_LABEL = { ...LABEL, fontSize: 9, letterSpacing: 1.6 };
const MAJOR_LABEL = { ...LABEL, fontSize: 11, color: INK.strong };

/** 未選択の駒を浮かせる高さ。選択時の沈み込み量と必ず一致させ、カードの下端を揃える */
const MINOR_LIFT = 4;
const PACK_LIFT = 5;

export default function StartScreen() {
  const router = useRouter();
  const { ownedPackIds } = useIAPContext();
  const { now, tempUnlocks, tempUnlockedPackIds } = useSharingContext();
  const [selectedTime, setSelectedTime] = useState<number>(DEFAULT_GAME_TIME_SEC);
  const [selectedSpeed, setSelectedSpeed] = useState<number>(DEFAULT_MS_PER_WORD);
  const [selectedPackId, setSelectedPackId] = useState<string>(DEFAULT_PACK_ID);
  const selectedPack = PACKS.find((pack) => pack.id === selectedPackId);

  // 所有状態・一時解放状態が変わって選択中のパックが遊べなくなった場合
  // （復元直後に前回選んでいたパックがロックに戻る、一時解放の期限が切れて再ロックされる等）は、
  // 既定のスターターへ安全に戻す。これがSprint 4の「自動再ロック」をスタート設定画面に反映する経路。
  useEffect(() => {
    const pack = PACKS.find((p) => p.id === selectedPackId);
    if (pack && !isPackPlayable(pack, ownedPackIds, tempUnlockedPackIds)) {
      setSelectedPackId(DEFAULT_PACK_ID);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ownedPackIds, tempUnlockedPackIds]);

  const handleSelectPack = (packId: string) => {
    const pack = PACKS.find((p) => p.id === packId);
    if (!pack) return;
    if (!isPackPlayable(pack, ownedPackIds, tempUnlockedPackIds)) {
      // 遊べない（未所有かつ一時解放も期限切れ／未実施）パックは選択させず、ストアへ誘導する
      router.replace('/store');
      return;
    }
    setSelectedPackId(packId);
  };

  const handleStart = () => {
    // 安全側: 万が一プレイできないパックが選択された状態になっていても、開始時に必ず丸める
    const packToPlay =
      selectedPack && isPackPlayable(selectedPack, ownedPackIds, tempUnlockedPackIds) ? selectedPack : PACKS[0];
    router.replace({
      pathname: '/play',
      params: { time: String(selectedTime), speed: String(selectedSpeed), pack: packToPlay.id },
    });
  };

  return (
    <Shell>
      {/* 見出しは左寄せ＋マスコットの非対称配置にして、中央揃えの単調さを避ける */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 30 }}>
        <Mascot size={54} />
        <View style={{ flex: 1 }}>
          <Text
            style={{
              fontFamily: FONTS.heading,
              fontSize: 12,
              letterSpacing: 4,
              color: COLORS.orange,
              marginBottom: 2,
            }}
          >
            READY?
          </Text>
          <Text style={{ fontFamily: FONTS.heading, fontSize: 24, color: COLORS.navy }}>
            設定を選んでね
          </Text>
        </View>
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <Text style={MINOR_LABEL}>TIME LIMIT</Text>
        <View style={{ flex: 1, height: 1, backgroundColor: COLORS.hairline }} />
      </View>

      <View style={{ flexDirection: 'row', gap: 8 }}>
        {TIME_OPTIONS.map((option) => {
          const selected = selectedTime === option.value;
          // '1 min' → 数字と単位に分けて、数字をFredokaで大きく見せる
          const [amount, unit] = option.label.split(' ');

          return (
            <Pressable
              key={option.value}
              onPress={() => setSelectedTime(option.value)}
              testID={`time-option-${option.value}`}
              style={{ flex: 1 }}
            >
              <View style={{ position: 'relative' }}>
                {!selected && (
                  <View
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      backgroundColor: SHADES.hairline,
                      borderRadius: RADIUS.box,
                      transform: [{ translateY: MINOR_LIFT }],
                    }}
                  />
                )}
                <View
                  style={{
                    borderWidth: BORDER.thin,
                    borderColor: COLORS.navy,
                    borderRadius: RADIUS.box,
                    backgroundColor: selected ? COLORS.navy : COLORS.creamCard,
                    paddingVertical: 9,
                    alignItems: 'center',
                    // 選択中は「押し込まれて沈んだ駒」として表現する。
                    // 沈み量を未選択の影の高さと揃え、3枚の下端が一直線に並ぶようにする
                    transform: [{ translateY: selected ? MINOR_LIFT : 0 }],
                  }}
                >
                  <Text
                    style={{
                      fontFamily: FONTS.display,
                      fontSize: 22,
                      lineHeight: 27,
                      color: selected ? COLORS.cream : COLORS.navy,
                    }}
                  >
                    {amount}
                  </Text>
                  <Text
                    style={{
                      fontFamily: FONTS.heading,
                      fontSize: 9,
                      letterSpacing: 1.6,
                      marginTop: 1,
                      color: selected ? COLORS.yellow : INK.soft,
                    }}
                  >
                    {(unit ?? '').toUpperCase()}
                  </Text>
                </View>
              </View>
            </Pressable>
          );
        })}
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 16, marginBottom: 8 }}>
        <Text style={MINOR_LABEL}>SCROLL SPEED</Text>
        <View style={{ flex: 1, height: 1, backgroundColor: COLORS.hairline }} />
      </View>

      <View style={{ flexDirection: 'row', gap: 8 }}>
        {SPEED_OPTIONS.map((option) => {
          const selected = selectedSpeed === option.value;

          return (
            <Pressable
              key={option.value}
              onPress={() => setSelectedSpeed(option.value)}
              testID={`speed-option-${option.value}`}
              style={{ flex: 1 }}
            >
              <View style={{ position: 'relative' }}>
                {!selected && (
                  <View
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      backgroundColor: SHADES.hairline,
                      borderRadius: RADIUS.box,
                      transform: [{ translateY: MINOR_LIFT }],
                    }}
                  />
                )}
                <View
                  style={{
                    borderWidth: BORDER.thin,
                    borderColor: COLORS.navy,
                    borderRadius: RADIUS.box,
                    backgroundColor: selected ? COLORS.navy : COLORS.creamCard,
                    paddingVertical: 9,
                    alignItems: 'center',
                    // 制限時間セグメントと同じ「押し込まれた駒」表現で統一する
                    transform: [{ translateY: selected ? MINOR_LIFT : 0 }],
                  }}
                >
                  <Text
                    style={{
                      fontFamily: FONTS.heading,
                      fontSize: 14,
                      color: selected ? COLORS.cream : COLORS.navy,
                    }}
                  >
                    {option.label}
                  </Text>
                  <Text
                    style={{
                      fontFamily: FONTS.bodyRegular,
                      fontSize: 9,
                      marginTop: 2,
                      color: selected ? COLORS.yellow : INK.soft,
                    }}
                  >
                    {`≒${option.wpm}wpm`}
                  </Text>
                </View>
              </View>
            </Pressable>
          );
        })}
      </View>

      {/* 見出しの型（ラベル＋罫線）は上2つと共通。文字を一段大きく濃くし、罫線も太くして、
          「ここから本題」と分かるだけの重さの差をつける */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 34, marginBottom: 14 }}>
        <Text style={MAJOR_LABEL}>THEME PACK</Text>
        <View style={{ flex: 1, height: BORDER.thin, backgroundColor: SHADES.hairline }} />
      </View>

      {/* 3列グリッド。react-native の `gap` ではなく「負のマージン＋列パディング」で溝を作るのは、
          6枚（3+3）で折り返したときに最終行のカード幅を1行目と完全に揃えるため。
          幅は container に対する割合で決めるので、375px でも横スクロールは発生しない */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -5, marginBottom: -12 }}>
        {PACKS.map((pack) => {
          const owned = isPackOwned(pack, ownedPackIds);
          // 一時解放中かどうかは「購入していない」パックについてのみ意味を持つ表示にする
          // （購入済みなら"購入済み"の表示を優先し、一時解放の表示とは混同させない。sprint-4.md契約）
          const tempExpiresAtMs = tempUnlocks.get(pack.id);
          const tempActive = !owned && tempExpiresAtMs !== undefined && tempExpiresAtMs > now;
          const playable = owned || tempActive;
          const selected = selectedPackId === pack.id;
          const accent = packAccent(pack.id);
          const locked = lockedPackTones(accent);

          return (
            <Pressable
              key={pack.id}
              onPress={() => handleSelectPack(pack.id)}
              testID={`pack-option-${pack.id}`}
              style={{ width: '33.33%', paddingHorizontal: 5, marginBottom: 12 }}
            >
              <View style={{ position: 'relative' }}>
                {/* 制限時間・速度のセグメントと同じ「未選択は浮いた駒／選択中は沈んだ駒」に揃える。
                    ロック中は押せる駒として振る舞わないので、影を敷かず平らに置く */}
                {playable && !selected && (
                  <View
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      backgroundColor: SHADES.hairline,
                      borderRadius: RADIUS.box,
                      transform: [{ translateY: PACK_LIFT }],
                    }}
                  />
                )}
                <View
                  style={{
                    alignItems: 'center',
                    borderWidth: BORDER.thick,
                    // ロック中も輪郭と地色にそのパックのアクセント色を淡く残す。
                    // 無彩色にすると未所有のパックが全部同じ顔になり、6枚並んだときに
                    // 「どれがどれか」が読めなくなるため。開いていないことは
                    // 南京錠と INK.muted のパック名で伝える。
                    // 一時解放中だけは輪郭を濃い黄に変え、ストア画面と同じ
                    //「借りているパック」の色で揃える（購入済みの navy とは別物として読ませる）
                    borderColor: playable
                      ? tempActive
                        ? SHADES.yellow
                        : COLORS.navy
                      : locked.cardBorder,
                    borderRadius: RADIUS.box,
                    backgroundColor: selected
                      ? COLORS.navy
                      : playable
                        ? COLORS.creamCard
                        : locked.cardFill,
                    paddingVertical: 14,
                    paddingHorizontal: 6,
                    transform: [{ translateY: selected ? PACK_LIFT : 0 }],
                  }}
                >
                  <PackEmblem
                    emoji={pack.emoji}
                    accent={accent}
                    size={36}
                    locked={!playable}
                    onDark={selected}
                  />
                  <Text
                    numberOfLines={1}
                    style={{
                      fontFamily: FONTS.heading,
                      fontSize: 13,
                      marginTop: 8,
                      color: selected ? COLORS.cream : playable ? COLORS.navy : INK.muted,
                    }}
                  >
                    {pack.title}
                  </Text>
                  {/* 補足行は常に同じ高さで確保し、各行のカードの下端が揃うようにする。
                      一時解放中だけ砂時計の図形を添えて「借りもの」であることを示す。
                      絵文字ではなく View で描いた図形にするのは、PackEmblem のロック錠と同じ方針
                      （端末ごとの字形差をなくし、ブランド色のまま表示する） */}
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 3,
                      height: 14,
                      marginTop: 1,
                    }}
                  >
                    {tempActive && (
                      <HourglassGlyph color={selected ? COLORS.yellow : SHADES.yellow} size={7} />
                    )}
                    <Text
                      testID={tempActive ? `pack-option-${pack.id}-temp-label` : undefined}
                      numberOfLines={1}
                      style={{
                        fontFamily: tempActive ? FONTS.bodyBold : FONTS.bodyRegular,
                        fontSize: 9,
                        // 選択中の補足文字を yellow にするのは制限時間・速度セグメントと同じ作法。
                        // 「navy に沈んだ駒＋黄色の副文字」が画面全体を通じた選択中の合図になる
                        color: selected
                          ? COLORS.yellow
                          : tempActive
                            ? SHADES.yellow
                            : INK.soft,
                      }}
                    >
                      {owned
                        ? `${pack.cards.length}問`
                        : tempActive
                          ? `残り${formatRemainingDuration(tempExpiresAtMs! - now)}`
                          : `¥${pack.priceJPY}`}
                    </Text>
                  </View>
                </View>
              </View>
            </Pressable>
          );
        })}
      </View>

      <GameButton
        variant="accent"
        size="lg"
        onPress={handleStart}
        testID="start-button"
        style={{ marginTop: 30, marginBottom: 22 }}
      >
        START!
      </GameButton>

      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 18 }}>
        <Pressable
          onPress={() => router.replace('/how-to-play')}
          testID="start-how-to-play-link"
          style={{ alignItems: 'center', paddingVertical: 4 }}
        >
          <Text style={LINK}>遊び方を見る</Text>
        </Pressable>
        <Pressable onPress={() => router.replace('/')} style={{ alignItems: 'center', paddingVertical: 4 }}>
          <Text style={LINK}>ホームに戻る</Text>
        </Pressable>
      </View>
    </Shell>
  );
}
