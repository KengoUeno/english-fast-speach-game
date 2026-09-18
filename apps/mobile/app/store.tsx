import { useEffect } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { PACKS, isPackOwned, formatRemainingDuration, type Pack } from 'game-core';
import { Shell } from '../components/Shell';
import { GameButton } from '../components/GameButton';
import { Mascot } from '../components/Mascot';
import { PackEmblem } from '../components/PackEmblem';
import { MessageBanner } from '../components/MessageBanner';
import { TempAccessBadge } from '../components/ShareVisuals';
import { useIAPContext } from '../lib/iap';
import { useSharingContext } from '../lib/sharing';
import { BORDER, COLORS, FONTS, INK, LABEL, LINK, RADIUS, SHADES, packAccent } from '../theme';

export default function StoreScreen() {
  const router = useRouter();
  const { ownedPackIds, purchasingPackId, restoring, message, purchasePack, restorePurchases, clearMessage } =
    useIAPContext();
  const { now, tempUnlocks } = useSharingContext();

  // 画面を離れたら次に開いたときは前回のメッセージを引きずらない
  useEffect(() => clearMessage, [clearMessage]);

  // 無料パックだけは「もう持っているもの」として別扱いで先頭に置き、
  // 有料パックの一覧と見た目を変える。5枚の同じカードが並ぶ単調さをここで崩す。
  const freePacks = PACKS.filter((pack) => pack.isFree);
  const paidPacks = PACKS.filter((pack) => !pack.isFree);

  return (
    <Shell>
      {/* 見出しはスタート設定画面と同じ左寄せ＋マスコットの非対称配置で揃える */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 }}>
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
            PACK STORE
          </Text>
          <Text style={{ fontFamily: FONTS.heading, fontSize: 22, color: COLORS.navy }}>
            テーマパックを増やす
          </Text>
        </View>
      </View>

      {/* ホーム上部のキャッチピルと同じ作り。シリーズ共通の“輪郭だけの見出し札” */}
      <View
        style={{
          alignSelf: 'flex-start',
          borderWidth: BORDER.thin,
          borderColor: COLORS.orange,
          borderRadius: RADIUS.pill,
          paddingHorizontal: 12,
          paddingVertical: 4,
          marginBottom: 8,
        }}
      >
        <Text style={{ fontFamily: FONTS.heading, fontSize: 11, color: COLORS.orange }}>
          買い切り・広告なし
        </Text>
      </View>

      <Text
        style={{
          fontFamily: FONTS.bodyRegular,
          fontSize: 12,
          lineHeight: 20,
          color: INK.muted,
          marginBottom: 24,
        }}
      >
        一度購入すればずっと遊べます。パックを増やすと、お題の世界が広がります。
      </Text>

      {message && <MessageBanner message={message} />}

      <SectionRule label="ALWAYS YOURS" />

      {/* 無料パックは navy 反転のカードにして「すでに手元にあるもの」を色で示す */}
      <View style={{ gap: 10, marginBottom: 26 }}>
        {freePacks.map((pack) => (
          <View
            key={pack.id}
            testID={`store-pack-${pack.id}`}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 13,
              borderWidth: BORDER.thick,
              borderColor: COLORS.navy,
              borderRadius: RADIUS.panel,
              backgroundColor: COLORS.navy,
              paddingVertical: 13,
              paddingHorizontal: 13,
            }}
          >
            <PackEmblem emoji={pack.emoji} accent={packAccent(pack.id)} size={42} onDark />

            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: FONTS.heading, fontSize: 16, color: COLORS.cream }}>
                {pack.title}
              </Text>
              <CardCount count={pack.cards.length} onDark />
            </View>

            <OwnedBadge testID={`store-pack-${pack.id}-owned`} label="✓ STARTER" />
          </View>
        ))}
      </View>

      <SectionRule label="THEME PACKS" />

      {/* 先頭カードの上辺には一時解放中の付箋がはみ出すので、見出し罫線と重ならない余白をとる */}
      <View style={{ gap: 14, marginTop: 4, marginBottom: 26 }}>
        {paidPacks.map((pack) => {
          const owned = isPackOwned(pack, ownedPackIds);
          const tempExpiresAtMs = tempUnlocks.get(pack.id);
          // 一時解放中バッジは「購入済みではない」パックにのみ出す
          // （購入状態と一時解放状態を画面表示でも混同させないため。sprint-4.md 契約）
          const tempRemainingLabel =
            !owned && tempExpiresAtMs !== undefined && tempExpiresAtMs > now
              ? formatRemainingDuration(tempExpiresAtMs - now)
              : undefined;

          return (
            <PaidPackCard
              key={pack.id}
              pack={pack}
              owned={owned}
              purchasing={purchasingPackId === pack.id}
              busy={purchasingPackId !== null || restoring}
              onPurchase={() => purchasePack(pack.id)}
              tempRemainingLabel={tempRemainingLabel}
            />
          );
        })}
      </View>

      {/* 復元は両ストアの必須要件なので、リンク1行ではなく見つけやすい枠で囲って置く */}
      <View
        style={{
          borderWidth: BORDER.thin,
          borderColor: COLORS.hairline,
          borderRadius: RADIUS.panel,
          paddingHorizontal: 16,
          paddingTop: 14,
          paddingBottom: 6,
          marginBottom: 18,
        }}
      >
        <Text style={LABEL}>RESTORE</Text>
        <Text
          style={{
            fontFamily: FONTS.bodyRegular,
            fontSize: 11,
            lineHeight: 18,
            color: INK.muted,
            marginTop: 6,
          }}
        >
          機種変更やアプリの入れ直しのあとは、こちらから購入済みのパックを戻せます。
        </Text>

        <Pressable
          onPress={restorePurchases}
          disabled={restoring || purchasingPackId !== null}
          testID="restore-purchases-link"
          style={{ alignItems: 'center', paddingVertical: 12 }}
        >
          <View
            style={{
              borderWidth: BORDER.thin,
              borderColor: COLORS.navy,
              borderRadius: RADIUS.pill,
              paddingHorizontal: 20,
              paddingVertical: 8,
              opacity: restoring || purchasingPackId !== null ? 0.4 : 1,
            }}
          >
            <Text style={{ fontFamily: FONTS.heading, fontSize: 13, color: COLORS.navy }}>
              {restoring ? '復元中…' : '購入を復元する'}
            </Text>
          </View>
        </Pressable>
      </View>

      <View style={{ flexDirection: 'row', justifyContent: 'center', flexWrap: 'wrap', gap: 18 }}>
        <Pressable
          onPress={() => router.replace('/share')}
          testID="store-share-link"
          style={{ alignItems: 'center', paddingVertical: 6 }}
        >
          <Text style={LINK}>パックを共有する</Text>
        </Pressable>
        <Pressable
          onPress={() => router.replace('/enter-code')}
          testID="store-enter-code-link"
          style={{ alignItems: 'center', paddingVertical: 6 }}
        >
          <Text style={LINK}>コードを入力する</Text>
        </Pressable>
        <Pressable
          onPress={() => router.replace('/')}
          testID="store-home-link"
          style={{ alignItems: 'center', paddingVertical: 6 }}
        >
          <Text style={LINK}>ホームに戻る</Text>
        </Pressable>
      </View>
    </Shell>
  );
}

/**
 * 有料パック1枚のカード。
 * 未所有のカードだけ「下に影を敷いた浮いている駒」にして、購入できるものが手前に
 * 飛び出して見えるようにする（GameButton / スタート設定のセグメントと同じ立体表現）。
 * 所有済みは枠を green に変えて沈ませ、一覧の中で役割が変わったことを色と高さで示す。
 *
 * Sprint 4（改訂後）: 共有コードの発行はパック単位ではなく画面に1つだけの操作になったため、
 * このカード自体は発行操作を持たない（購入導線と一時解放バッジの表示に専念する）。
 * 一時解放中（購入はしていない）のカードには、"購入済み"とは別の一時バッジを重ねて出す。
 */
function PaidPackCard({
  pack,
  owned,
  purchasing,
  busy,
  onPurchase,
  tempRemainingLabel,
}: {
  pack: Pack;
  owned: boolean;
  purchasing: boolean;
  busy: boolean;
  onPurchase: () => void;
  /** 一時解放中のときの残り時間ラベル（購入済みの場合はundefined。sprint-4.md契約） */
  tempRemainingLabel?: string;
}) {
  return (
    <View testID={`store-pack-${pack.id}`} style={{ position: 'relative' }}>
      {!owned && (
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: SHADES.hairline,
            borderRadius: RADIUS.panel,
            transform: [{ translateY: 5 }],
          }}
        />
      )}

      <View
        style={{
          borderWidth: BORDER.thick,
          // ストア画面での枠色は「買えるか(navy) / 買ったか(green)」だけを語らせる。
          // 一時解放中のパックはまだ未購入なので枠は navy のまま据え置き、
          // 借りている事実は上辺の黄色い付箋だけで伝える（購入導線の意味を濁さないため）
          borderColor: owned ? COLORS.green : COLORS.navy,
          borderRadius: RADIUS.panel,
          backgroundColor: COLORS.creamCard,
          paddingVertical: 13,
          paddingHorizontal: 13,
          transform: [{ translateY: owned ? 5 : 0 }],
        }}
      >
        {/* 一時解放中バッジ。"購入済み"バッジ(緑の塗りピル＋チェック)とは色も形も持ち物も変え、
            混同されない見た目にする（sprint-4.md契約: 購入済みとは区別できる表示）。
            カードの上辺にまたがる付箋の形は、プレイ画面のお題チップと同じシリーズ共通の作り */}
        {tempRemainingLabel && (
          <TempAccessBadge
            remainingLabel={tempRemainingLabel}
            style={{ position: 'absolute', top: -12, left: 13 }}
            testID={`store-pack-${pack.id}-temp-badge`}
          />
        )}

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 13 }}>
          <PackEmblem emoji={pack.emoji} accent={packAccent(pack.id)} size={42} />

          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: FONTS.heading, fontSize: 16, color: COLORS.navy }}>{pack.title}</Text>
            <CardCount count={pack.cards.length} />
          </View>

          {owned ? (
            <OwnedBadge testID={`store-pack-${pack.id}-owned`} label="✓ 購入済み" />
          ) : (
            <GameButton
              variant="primary"
              onPress={onPurchase}
              disabled={busy}
              testID={`store-pack-${pack.id}-buy`}
              style={{ minWidth: 88 }}
              textStyle={{ fontSize: 15 }}
            >
              {purchasing ? '処理中…' : `¥${pack.priceJPY}`}
            </GameButton>
          )}
        </View>
      </View>
    </View>
  );
}

/** スタート設定画面と同じ「小さいラベル＋罫線」の見出し。画面をまたいで同じ区切り方に揃える */
function SectionRule({ label }: { label: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 }}>
      <Text style={LABEL}>{label}</Text>
      <View style={{ flex: 1, height: BORDER.thin, backgroundColor: COLORS.hairline }} />
    </View>
  );
}

/** 収録数。数字だけ Fredoka にして、制限時間セグメントと同じ「数字は英字書体」の扱いに揃える */
function CardCount({ count, onDark = false }: { count: number; onDark?: boolean }) {
  const color = onDark ? 'rgba(255,249,238,0.66)' : INK.muted;

  return (
    <Text style={{ marginTop: 3 }}>
      <Text style={{ fontFamily: FONTS.display, fontSize: 13, color }}>{count}</Text>
      <Text style={[LABEL, { color }]}> 問収録</Text>
    </Text>
  );
}

/** 所有済みを示す塗りつぶしの green ピル。輪郭だけのバッジより一覧の中で見つけやすい */
function OwnedBadge({ testID, label }: { testID: string; label: string }) {
  return (
    <View
      testID={testID}
      style={{
        backgroundColor: COLORS.green,
        borderRadius: RADIUS.pill,
        paddingHorizontal: 12,
        paddingVertical: 7,
      }}
    >
      <Text style={{ fontFamily: FONTS.bodyBold, fontSize: 12, color: COLORS.creamCard }}>{label}</Text>
    </View>
  );
}
