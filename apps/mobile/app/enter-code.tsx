import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { formatRemainingDuration, getPackById } from 'game-core';
import { Shell } from '../components/Shell';
import { GameButton } from '../components/GameButton';
import { Mascot } from '../components/Mascot';
import { PackEmblem } from '../components/PackEmblem';
import { MessageBanner, type BannerMessage } from '../components/MessageBanner';
import { HourglassGlyph, formatExpiryClock } from '../components/ShareVisuals';
import { useSharingContext, type RedeemResult } from '../lib/sharing';
import { BORDER, COLORS, FONTS, INK, LABEL, LINK, RADIUS, packAccent } from '../theme';

/** コードの想定桁数。区切りや空白を除いた実質の入力量を数えて進み具合を見せるために使う */
const CODE_LENGTH = 8;

/**
 * 「コードを入力」画面（Sprint 4 機能B。ゲスト側）。
 * ホスト端末が発行した共有コードを手入力し、正規化・署名検証したうえで
 * この端末を一時的に解放する。1回のコード入力で、コードに含まれていた**全パック**を
 * 一括で一時解放する（パックごとの個別入力はしない）。成功時は解放された全パックの名前と
 * 有効期限（時刻＋残り時間）を表示する。
 */
export default function EnterCodeScreen() {
  const router = useRouter();
  const { redeemCode, now } = useSharingContext();
  const [input, setInput] = useState('');
  const [result, setResult] = useState<RedeemResult | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = () => {
    if (submitting) return;
    setSubmitting(true);
    // redeemCodeは純粋な同期処理（ネット接続不要）だが、連打によるちらつきを避けるため
    // 直前の結果をいったんクリアしてから再判定する
    setResult(null);
    const next = redeemCode(input);
    setResult(next);
    setSubmitting(false);
  };

  const bannerMessage: BannerMessage | null =
    result && !result.ok ? { tone: 'error', text: result.message } : null;

  // 表示専用のカウント。区切りのハイフンや空白は正規化で吸収されるため、桁数には数えない
  const typedLength = input.replace(/[\s-]/g, '').length;
  const unlockedPacks = result?.ok ? result.packs : [];
  // 1件のときは「結果」として大きく1枚、複数のときは一覧として1段小さい行に切り替える
  // （同じ大きさの札が4枚積み上がって間延びするのを避けるための表示上の分岐）
  const multiUnlock = unlockedPacks.length > 1;

  return (
    <Shell>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 22 }}>
        <Mascot size={52} />
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
            GUEST ACCESS
          </Text>
          <Text style={{ fontFamily: FONTS.heading, fontSize: 22, color: COLORS.navy }}>
            コードを入力
          </Text>
        </View>
      </View>

      {/* 説明は一続きの灰色の塊にせず、ホスト側・ゲスト側の2手順に割る。
          番号バッジはホームの入口チップ・遊び方画面と同じ「丸いブランドバッジ」で揃える */}
      <View style={{ gap: 11, marginBottom: 22 }}>
        <StepRow
          number="1"
          text="ホストの端末のストアで「共有コードを発行」を押してもらう。"
        />
        <StepRow
          number="2"
          text="出てきた8文字をここに入力する。大文字・小文字やハイフンは気にしなくて大丈夫。"
        />
      </View>

      {/* ラベルの右に入力済みの桁数を置く。8文字という短い入力でも
          「あと何文字か」が分かると、読み上げられた文字を追いかけやすい */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 8,
        }}
      >
        <Text style={LABEL}>SHARE CODE</Text>
        <Text
          style={{
            fontFamily: FONTS.display,
            fontSize: 12,
            letterSpacing: 1,
            color: typedLength === CODE_LENGTH ? COLORS.green : INK.soft,
          }}
        >
          {typedLength} / {CODE_LENGTH}
        </Text>
      </View>

      <TextInput
        testID="enter-code-input"
        value={input}
        onChangeText={(text) => {
          setInput(text);
          // 入力中に前回の結果を引きずらないよう、値が変わった時点で結果表示をクリアする
          if (result) setResult(null);
        }}
        placeholder="ABCD-1234"
        placeholderTextColor={INK.ghost}
        autoCapitalize="characters"
        autoCorrect={false}
        maxLength={16}
        style={{
          fontFamily: FONTS.display,
          fontSize: 26,
          letterSpacing: 4,
          textAlign: 'center',
          color: COLORS.navy,
          borderWidth: BORDER.thick,
          borderColor: COLORS.navy,
          borderRadius: RADIUS.box,
          backgroundColor: COLORS.creamCard,
          paddingVertical: 16,
          paddingHorizontal: 12,
          // letterSpacing は最後の文字の後ろにも空きを作るので、その分だけ左に足して
          // 入力文字列の見た目の中心を枠の中心に合わせる
          paddingLeft: 16,
          marginBottom: 18,
        }}
      />

      <GameButton
        variant="accent"
        size="lg"
        onPress={handleSubmit}
        disabled={submitting}
        testID="enter-code-submit"
        style={{ marginBottom: 18 }}
      >
        解放する
      </GameButton>

      {bannerMessage && <MessageBanner message={bannerMessage} testID="enter-code-message" />}

      {result?.ok && (
        <View
          testID="enter-code-success"
          style={{
            borderWidth: BORDER.thick,
            borderColor: COLORS.green,
            borderRadius: RADIUS.panel,
            backgroundColor: COLORS.creamCard,
            paddingHorizontal: 16,
            paddingTop: 18,
            paddingBottom: 15,
            marginTop: 4,
            marginBottom: 20,
          }}
        >
          {/* 枠線にまたがる札。ホーム・プレイ画面のチップと同じシリーズ共通の作りで、
              「解放できた」という結果をカードの見出しとして立てる */}
          <View
            style={{
              position: 'absolute',
              top: -12,
              left: 16,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
              backgroundColor: COLORS.green,
              borderRadius: RADIUS.pill,
              paddingHorizontal: 11,
              paddingVertical: 4,
            }}
          >
            <Text style={{ fontFamily: FONTS.display, fontSize: 11, color: COLORS.creamCard }}>✓</Text>
            <Text style={{ fontFamily: FONTS.heading, fontSize: 10, color: COLORS.creamCard }}>
              一時解放しました
            </Text>
          </View>

          {/* 複数解放されたときだけ見出しを出す。ホスト側の半券（UNLOCKS n）と同じ作りにして、
              「発行した側で見た数」と「受け取った側で開いた数」を同じ形で照合できるようにする */}
          {multiUnlock && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <Text style={LABEL}>UNLOCKED</Text>
              <Text style={{ fontFamily: FONTS.display, fontSize: 12, color: COLORS.green }}>
                {unlockedPacks.length}
              </Text>
              <View style={{ flex: 1, height: 1, backgroundColor: COLORS.hairline }} />
            </View>
          )}

          {/* 解放された全パックを、ストア・スタート設定と同じ絵札で1件ずつ並べる
              （sprint-4.md契約: 複数パックの場合も1回の入力で一括解放され、全て表示される）。
              同じパックが同じ顔で出てくることで、次にどれを選べばいいかが迷わず分かる。
              1件のときは大きく1枚の「結果」として見せ、複数のときは同じ大きさの札が
              積み上がって間延びしないよう、一段小さい行に切り替えて区切り線で並べる */}
          <View testID="enter-code-success-packs">
            {unlockedPacks.map((pack, index) => {
              const cardCount = getPackById(pack.id)?.cards.length;

              return (
                <View
                  key={pack.id}
                  testID={`enter-code-success-pack-${pack.id}`}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: multiUnlock ? 11 : 12,
                    paddingVertical: multiUnlock ? 9 : 0,
                    borderTopWidth: multiUnlock && index > 0 ? 1 : 0,
                    borderTopColor: COLORS.hairline,
                  }}
                >
                  <PackEmblem
                    emoji={pack.emoji}
                    accent={packAccent(pack.id)}
                    size={multiUnlock ? 36 : 44}
                  />

                  {multiUnlock ? (
                    <>
                      {/* 複数のときはパック名を1行に、収録数は右端に寄せる。
                          名前の左端と数字の右端が縦に揃い、4件並んでも一覧として読める */}
                      <Text
                        numberOfLines={1}
                        style={{ flex: 1, fontFamily: FONTS.heading, fontSize: 16, color: COLORS.navy }}
                      >
                        {pack.title}
                      </Text>
                      {cardCount !== undefined && <CardCount count={cardCount} />}
                    </>
                  ) : (
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontFamily: FONTS.heading, fontSize: 20, color: COLORS.navy }}>
                        {pack.title}
                      </Text>
                      {cardCount !== undefined && <CardCount count={cardCount} withSuffix />}
                    </View>
                  )}
                </View>
              );
            })}
          </View>

          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 7,
              borderTopWidth: BORDER.thin,
              borderTopColor: COLORS.hairline,
              marginTop: 13,
              paddingTop: 11,
            }}
          >
            <HourglassGlyph color={COLORS.green} size={9} />
            <Text
              testID="enter-code-success-expiry"
              style={{ flex: 1, fontFamily: FONTS.bodyRegular, fontSize: 12, color: INK.muted }}
            >
              {formatExpiryClock(result.expiresAtMs, now)} まで（残り
              {formatRemainingDuration(result.expiresAtMs - now)}）利用できます
            </Text>
          </View>
        </View>
      )}

      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 18 }}>
        <Pressable
          onPress={() => router.replace('/start')}
          testID="enter-code-start-link"
          style={{ alignItems: 'center', paddingVertical: 4 }}
        >
          <Text style={LINK}>スタート設定へ</Text>
        </Pressable>
        <Pressable
          onPress={() => router.replace('/')}
          testID="enter-code-home-link"
          style={{ alignItems: 'center', paddingVertical: 4 }}
        >
          <Text style={LINK}>ホームに戻る</Text>
        </Pressable>
      </View>
    </Shell>
  );
}

/** 収録数。数字だけ Fredoka にして、ストア画面の収録数表記と同じ「数字は英字書体」の扱いに揃える */
function CardCount({ count, withSuffix = false }: { count: number; withSuffix?: boolean }) {
  return (
    <Text style={withSuffix ? { marginTop: 2 } : undefined}>
      <Text style={{ fontFamily: FONTS.display, fontSize: 12, color: INK.muted }}>{count}</Text>
      <Text style={[LABEL, { color: INK.muted }]}>{withSuffix ? ' 問収録' : ' 問'}</Text>
    </Text>
  );
}

/** 手順1行。番号は Fredoka の数字を navy の丸バッジに入れ、ホームの入口チップと同じ作りに揃える */
function StepRow({ number, text }: { number: string; text: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
      <View
        style={{
          width: 20,
          height: 20,
          borderRadius: RADIUS.pill,
          backgroundColor: COLORS.navy,
          alignItems: 'center',
          justifyContent: 'center',
          marginTop: 1,
        }}
      >
        <Text style={{ fontFamily: FONTS.display, fontSize: 12, lineHeight: 15, color: COLORS.yellow }}>
          {number}
        </Text>
      </View>
      <Text
        style={{
          flex: 1,
          fontFamily: FONTS.bodyRegular,
          fontSize: 12,
          lineHeight: 20,
          color: INK.muted,
        }}
      >
        {text}
      </Text>
    </View>
  );
}
