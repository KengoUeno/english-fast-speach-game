import { Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { PACKS, isPackOwned } from 'game-core';
import { Shell } from '../components/Shell';
import { Mascot } from '../components/Mascot';
import { LinkGlyph } from '../components/ShareVisuals';
import { useIAPContext } from '../lib/iap';
import { BORDER, COLORS, FONTS, INK, LINK, RADIUS, SHADES } from '../theme';

/** 共有コードの発行可否判定に使う有料パック一覧（購入状態のみを見る。sprint-4.md契約） */
const PAID_PACKS = PACKS.filter((pack) => !pack.isFree);

/**
 * 「パックを共有する」ハブ画面（Sprint 4 機能A・改訂後）。
 *
 * ユーザーからの続けてのUXフィードバックにより、ホーム画面の単一の「パックを共有する」
 * 導線からまずこの画面に来て、ホスト（コードを発行する側）かゲスト（コードを入力する側）
 * かをここで選んでもらう構成にした。
 *
 * - 「ホストとして共有する」→ `/share-host`（共有コードの発行UI。旧 store.tsx の
 *   SHAREセクションをそのまま移設したもの。見た目・挙動は変更していない）
 * - 「ゲストとして受け取る」→ 既存の `/enter-code`
 *
 * ホストの選択肢は、購入済みパックが1つもない場合は表示しない（従来ストア画面の
 * SHAREセクションが購入0件で非表示だったのと同じルールをここに適用する。sprint-4.md契約）。
 * ゲストの選択肢は所有状況に関わらず常に表示する（ゲストは基本的に何も持っていない
 * のが前提のため）。
 */
export default function ShareHubScreen() {
  const router = useRouter();
  const { ownedPackIds } = useIAPContext();

  const canHost = PAID_PACKS.some((pack) => isPackOwned(pack, ownedPackIds));

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
            SHARE HUB
          </Text>
          <Text style={{ fontFamily: FONTS.heading, fontSize: 22, color: COLORS.navy }}>
            パックを共有する
          </Text>
        </View>
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
        その場に居る人と、購入済みのテーマパックを3時間だけ一緒に使えます。{'\n'}
        コードを発行する側か、コードを受け取る側かを選んでください。
      </Text>

      <View style={{ gap: 14 }}>
        {canHost && (
          <ShareRoleCard
            testID="share-hub-host-link"
            badge="発行する"
            badgeColor={COLORS.navy}
            badgeTextColor={COLORS.yellow}
            title="ホストとして共有する"
            description="購入済みパックをまとめて表す共有コードを発行する。"
            onPress={() => router.replace('/share-host')}
          />
        )}
        <ShareRoleCard
          testID="share-hub-guest-link"
          badge="受け取る"
          badgeColor={COLORS.orange}
          badgeTextColor={COLORS.creamCard}
          title="ゲストとして受け取る"
          description="ホストが発行したコードを入力して一時的に使えるようにする。"
          onPress={() => router.replace('/enter-code')}
        />
      </View>

      {!canHost && (
        <Text
          testID="share-hub-host-hint"
          style={{
            fontFamily: FONTS.bodyRegular,
            fontSize: 11,
            lineHeight: 18,
            color: INK.muted,
            marginTop: 14,
            textAlign: 'center',
          }}
        >
          テーマパックを購入すると、ここから共有コードを発行できるようになります。
        </Text>
      )}

      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 18, marginTop: 26 }}>
        <Pressable
          onPress={() => router.replace('/store')}
          testID="share-hub-store-link"
          style={{ alignItems: 'center', paddingVertical: 6 }}
        >
          <Text style={LINK}>ストアへ</Text>
        </Pressable>
        <Pressable
          onPress={() => router.replace('/')}
          testID="share-hub-home-link"
          style={{ alignItems: 'center', paddingVertical: 6 }}
        >
          <Text style={LINK}>ホームに戻る</Text>
        </Pressable>
      </View>
    </Shell>
  );
}

/**
 * ホスト/ゲストの選択肢1枚。GameButton と同じ「押すと沈む駒」の立体表現に揃えつつ、
 * タイトル＋説明文の2行を持てるようGameButton単体は使わず専用に組む
 * （GameButtonは1行のラベル文字列か任意のchildrenしか想定していないため）。
 */
function ShareRoleCard({
  testID,
  badge,
  badgeColor,
  badgeTextColor,
  title,
  description,
  onPress,
}: {
  testID: string;
  badge: string;
  badgeColor: string;
  badgeTextColor: string;
  title: string;
  description: string;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} testID={testID}>
      {({ pressed }) => (
        <View style={{ position: 'relative' }}>
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
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 13,
              borderWidth: BORDER.thick,
              borderColor: COLORS.navy,
              borderRadius: RADIUS.panel,
              backgroundColor: COLORS.creamCard,
              paddingVertical: 15,
              paddingHorizontal: 15,
              transform: [{ translateY: pressed ? 5 : 0 }],
            }}
          >
            <View
              style={{
                width: 30,
                height: 30,
                borderRadius: RADIUS.pill,
                backgroundColor: badgeColor,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <LinkGlyph color={badgeTextColor} />
            </View>

            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: FONTS.heading, fontSize: 16, color: COLORS.navy }}>{title}</Text>
              <Text
                style={{
                  fontFamily: FONTS.bodyRegular,
                  fontSize: 11,
                  lineHeight: 17,
                  color: INK.muted,
                  marginTop: 3,
                }}
              >
                {description}
              </Text>
            </View>

            <View
              style={{
                borderWidth: BORDER.thin,
                borderColor: COLORS.hairline,
                borderRadius: RADIUS.pill,
                paddingHorizontal: 9,
                paddingVertical: 4,
              }}
            >
              <Text style={{ fontFamily: FONTS.heading, fontSize: 10, color: INK.muted }}>{badge}</Text>
            </View>
          </View>
        </View>
      )}
    </Pressable>
  );
}
