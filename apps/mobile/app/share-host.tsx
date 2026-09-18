import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { PACKS, isPackOwned, formatRemainingDuration } from 'game-core';
import { Shell } from '../components/Shell';
import { Mascot } from '../components/Mascot';
import { PackEmblem } from '../components/PackEmblem';
import { HourglassGlyph, LinkGlyph, formatExpiryClock } from '../components/ShareVisuals';
import { useIAPContext } from '../lib/iap';
import { useSharingContext, type ShareIssueResult, type SharedPackInfo } from '../lib/sharing';
import { BORDER, COLORS, FONTS, INK, LABEL, LINK, RADIUS, SHADES, packAccent } from '../theme';

/**
 * 「共有コードを発行」画面（Sprint 4 機能A・改訂後。ホスト側）。
 *
 * ユーザーからのUXフィードバックにより、当初 store.tsx に埋め込まれていた「SHARE」
 * セクション（ShareCodePanel・発行ボタン・TicketNotch等）をそのままこの画面へ移設した。
 * 見た目・挙動は移設前と一切変えていない。
 *
 * さらに続くUXフィードバックにより、ホーム画面から直接この画面に来るのではなく、
 * 「パックを共有する」→ ハブ画面（share.tsx。ホスト/ゲストの選択）→ この画面、
 * という一段挟んだ導線に変わった。この画面自体は発行操作のみに専念する。
 *
 * パックを選ぶ操作はなく、その時点でホストが購入済みの全パックをまとめて表す
 * 単一の「共有コードを発行」操作のみを置く（sprint-4.md契約）。
 */
export default function ShareHostScreen() {
  const router = useRouter();
  const { ownedPackIds } = useIAPContext();
  const { now, issueShareCode } = useSharingContext();

  // 発行済み共有コードの表示状態。パック単位ではなく画面に1つだけ持つ
  // （「共有コードを発行」は単一の操作。発行のたびに直近の1件で上書きする。
  // 発行回数の制限はしない。sprint-4.md 契約）。
  const [issued, setIssued] = useState<{ code: string; expiresAtMs: number; packs: SharedPackInfo[] } | null>(null);
  const [issueError, setIssueError] = useState<string | null>(null);

  const handleIssueShareCode = () => {
    const result: ShareIssueResult = issueShareCode(ownedPackIds);
    if (result.ok) {
      setIssued({ code: result.code, expiresAtMs: result.expiresAtMs, packs: result.packs });
      setIssueError(null);
    } else {
      setIssueError(result.message);
    }
  };

  // 共有コードの発行可否は購入状態のみで判定する（一時解放中というだけのパックは含めない）。
  // 何も購入していなければ発行操作を無効化する（sprint-4.md契約: 機能A。ハブ画面側の
  // 「ホストとして共有する」選択肢も同じ条件で非表示にしているが、直接この画面のURLを
  // 開いた場合の保険としてここでもガードする）。
  const paidPacks = PACKS.filter((pack) => !pack.isFree);
  const ownedPaidPacks = paidPacks.filter((pack) => isPackOwned(pack, ownedPackIds));
  const canIssueShareCode = ownedPaidPacks.length > 0;

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
            HOST ACCESS
          </Text>
          <Text style={{ fontFamily: FONTS.heading, fontSize: 22, color: COLORS.navy }}>
            共有コードを発行
          </Text>
        </View>
      </View>

      {canIssueShareCode ? (
        <View
          testID="share-panel"
          style={{
            borderWidth: BORDER.thin,
            borderColor: COLORS.hairline,
            borderRadius: RADIUS.panel,
            paddingHorizontal: 16,
            paddingTop: 18,
            paddingBottom: 16,
            marginTop: 8,
            marginBottom: 26,
          }}
        >
          {/* 枠線にまたがる黄色い札。ストアの一時解放バッジ・ゲスト側の成功カードと同じ作りで、
              このブロックだけが「一時的な貸し借り」の話であることを色（yellow＝一時）で示す */}
          <View
            style={{
              position: 'absolute',
              top: -11,
              left: 16,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 7,
              backgroundColor: COLORS.yellow,
              borderRadius: RADIUS.pill,
              paddingLeft: 10,
              paddingRight: 12,
              paddingVertical: 4,
            }}
          >
            <LinkGlyph color={COLORS.navy} />
            <Text style={{ fontFamily: FONTS.heading, fontSize: 10, letterSpacing: 2, color: COLORS.navy }}>
              SHARE
            </Text>
          </View>

          <Text
            style={{
              fontFamily: FONTS.heading,
              fontSize: 14,
              lineHeight: 22,
              color: COLORS.navy,
              marginTop: 4,
            }}
          >
            購入済みパックを3時間だけ貸す
          </Text>
          <Text
            style={{
              fontFamily: FONTS.bodyRegular,
              fontSize: 11,
              lineHeight: 19,
              color: INK.muted,
              marginTop: 5,
              marginBottom: 14,
            }}
          >
            発行すると、いま購入しているテーマパック（{ownedPaidPacks.length}個）をまとめて1つのコードにします。
            パックごとに個別で発行する必要はありません。
          </Text>

          {/* ボタンは GameButton / パックカードと同じ「押すと沈む駒」の立体表現に揃える。
              色はストアの購入ボタン（orange）と役割が違うので navy の塗りにして、
              購入導線と共有導線を色で読み分けられるようにする */}
          <Pressable onPress={handleIssueShareCode} testID="share-issue-button">
            {({ pressed }) => (
              <View style={{ position: 'relative' }}>
                <View
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: SHADES.navy,
                    borderRadius: RADIUS.pill,
                    transform: [{ translateY: 5 }],
                  }}
                />
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 9,
                    borderRadius: RADIUS.pill,
                    backgroundColor: COLORS.navy,
                    paddingVertical: 12,
                    paddingHorizontal: 14,
                    transform: [{ translateY: pressed ? 5 : 0 }],
                  }}
                >
                  <LinkGlyph color={COLORS.yellow} />
                  <Text
                    style={{
                      fontFamily: FONTS.heading,
                      fontSize: 15,
                      color: COLORS.cream,
                    }}
                  >
                    共有コードを発行
                  </Text>
                </View>
              </View>
            )}
          </Pressable>

          {issued && <ShareCodePanel code={issued.code} expiresAtMs={issued.expiresAtMs} packs={issued.packs} />}

          {issueError && (
            <Text
              testID="share-issue-error"
              style={{
                fontFamily: FONTS.bodyBold,
                fontSize: 12,
                color: COLORS.orange,
                textAlign: 'center',
                marginTop: 10,
              }}
            >
              {issueError}
            </Text>
          )}
        </View>
      ) : (
        // 購入済みパックが0件の場合は発行操作自体を無効化する
        // （ハブ画面の「ホストとして共有する」選択肢も同じ条件で非表示にしているが、
        // 直接この画面のURLを開いた場合の保険）。
        <View
          testID="share-panel-empty"
          style={{
            borderWidth: BORDER.thin,
            borderColor: COLORS.hairline,
            borderRadius: RADIUS.panel,
            paddingHorizontal: 16,
            paddingVertical: 20,
            marginTop: 8,
            marginBottom: 26,
          }}
        >
          <Text
            style={{
              fontFamily: FONTS.bodyRegular,
              fontSize: 12,
              lineHeight: 20,
              color: INK.muted,
              textAlign: 'center',
            }}
          >
            テーマパックを購入すると、ここから共有コードを発行できます。
          </Text>
        </View>
      )}

      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 18 }}>
        <Pressable
          onPress={() => router.replace('/share')}
          testID="share-host-hub-link"
          style={{ alignItems: 'center', paddingVertical: 6 }}
        >
          <Text style={LINK}>共有ハブに戻る</Text>
        </Pressable>
        <Pressable
          onPress={() => router.replace('/')}
          testID="share-host-home-link"
          style={{ alignItems: 'center', paddingVertical: 6 }}
        >
          <Text style={LINK}>ホームに戻る</Text>
        </Pressable>
      </View>
    </Shell>
  );
}

/**
 * 発行された共有コードの表示パネル（画面に1つだけ）。
 * 8文字が折り返したり省略されたりしないよう、letterSpacingを持たせつつ
 * 375px幅でも収まるフォントサイズにしている。含まれる全パックの名前も併記する
 * （sprint-4.md契約: 発行されるコードに含まれる全パックを確認できること）。
 */
function ShareCodePanel({
  code,
  expiresAtMs,
  packs,
}: {
  code: string;
  expiresAtMs: number;
  packs: SharedPackInfo[];
}) {
  const { now } = useSharingContext();
  const remainingLabel = formatRemainingDuration(Math.max(0, expiresAtMs - now));

  return (
    <View
      style={{
        // ボタンが5px沈む分の影を逃がしてから重ねる
        marginTop: 18,
        backgroundColor: COLORS.navy,
        borderRadius: RADIUS.box,
        paddingTop: 13,
        paddingBottom: 13,
        paddingHorizontal: 14,
      }}
    >
      {/* 上段は「何のコードか」と「あと何分使えるか」。読み上げる本体（コード）とは
          役割が違うので、小さなラベルと縁取りピルに分けて重みを落とす */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
        }}
      >
        <Text style={[LABEL, { color: COLORS.yellow }]}>SHARE CODE</Text>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            borderWidth: 1.5,
            borderColor: COLORS.yellow,
            borderRadius: RADIUS.pill,
            paddingLeft: 8,
            paddingRight: 10,
            paddingVertical: 3,
          }}
        >
          <HourglassGlyph color={COLORS.yellow} size={8} />
          <Text numberOfLines={1} style={{ fontFamily: FONTS.heading, fontSize: 10, color: COLORS.yellow }}>
            残り{remainingLabel}
          </Text>
        </View>
      </View>

      <Text
        testID="share-issue-code"
        numberOfLines={1}
        adjustsFontSizeToFit
        style={{
          fontFamily: FONTS.display,
          fontSize: 30,
          lineHeight: 40,
          letterSpacing: 6,
          textAlign: 'center',
          color: COLORS.cream,
          // letterSpacing は最後の文字の後ろにも空きを作るため、その分だけ左に足して
          // 8文字の見た目の中心を実際の中心に合わせる
          paddingLeft: 6,
          marginTop: 8,
        }}
      >
        {code}
      </Text>

      <DottedRule />

      {/* 「読むための番号」と「その番号で何が開くか」の境目。切り取り線の下は半券にあたるので、
          見出しは画面共通の SectionRule と同じ作り（小さいラベル＋数字＋罫線）に揃える */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 9 }}>
        <Text style={[LABEL, { color: 'rgba(255,249,238,0.55)' }]}>UNLOCKS</Text>
        <Text style={{ fontFamily: FONTS.display, fontSize: 12, color: COLORS.yellow }}>{packs.length}</Text>
        <View style={{ flex: 1, height: 1, backgroundColor: 'rgba(255,249,238,0.16)' }} />
      </View>

      {/* 含まれる全パックの一覧。1パックのみのときは1件だけ並ぶ（sprint-4.md契約）。
          縦一列に積むと4件で半券が間延びするので、折り返す札（チップ）にして
          1件でも4件でも同じリズムで収まるようにする。絵柄はストア・スタート設定と同じ
          PackEmblem を小さくしたもので、どのパックが入っているか色と絵で照合できる */}
      <View testID="share-issue-packs" style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginBottom: 11 }}>
        {packs.map((pack) => (
          <View
            key={pack.id}
            testID={`share-issue-pack-${pack.id}`}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 7,
              borderWidth: 1.5,
              borderColor: 'rgba(255,249,238,0.22)',
              borderRadius: RADIUS.pill,
              paddingLeft: 5,
              paddingRight: 12,
              paddingVertical: 4,
            }}
          >
            <PackEmblem emoji={pack.emoji} accent={packAccent(pack.id)} size={24} onDark />
            <Text style={{ fontFamily: FONTS.bodyBold, fontSize: 12, color: COLORS.cream }}>{pack.title}</Text>
          </View>
        ))}
      </View>

      <Text
        testID="share-issue-expiry"
        style={{
          // 半券（切り取り線から下）はラベル・パック札と同じ左の線に揃える。
          // 中央に置いた本体（コード）と、条件を読む下半分とで基準線を変えて役割を分ける
          fontFamily: FONTS.bodyRegular,
          fontSize: 11,
          lineHeight: 18,
          color: 'rgba(255,249,238,0.72)',
        }}
      >
        {formatExpiryClock(expiresAtMs, now)} をすぎると自動でロックされます
      </Text>
    </View>
  );
}

/**
 * 切り取り線のような点線。コードと期限を「読む部分」と「条件」に分ける仕切りで、
 * 共有コードのパネルにチケットらしさを与える（線を1本引くよりも紙の質感に寄る）。
 */
function DottedRule() {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 11,
        marginBottom: 11,
      }}
    >
      {/* パネルの左右の縁を丸くえぐる切り込み。地色（cream）と同じ丸を縁にかぶせるだけで、
          点線とあわせて「半券を切り離すチケット」の形になる */}
      <TicketNotch side="left" />
      {/* 点の数は、幅の広い端末（コンテンツ上限460px）でも点線が間延びしない密度に合わせている */}
      {Array.from({ length: 34 }).map((_, index) => (
        <View
          key={index}
          style={{
            width: 3,
            height: 2,
            borderRadius: 2,
            backgroundColor: 'rgba(255,249,238,0.28)',
          }}
        />
      ))}
      <TicketNotch side="right" />
    </View>
  );
}

/** チケットの切り込み（地色の丸）。パネルの外側にはみ出して縁を欠けさせる */
function TicketNotch({ side }: { side: 'left' | 'right' }) {
  const size = 15;

  // パネルの内側余白(14) ぶん外へ出し、さらに半径ぶん縁にかぶせる
  const offset = -14 - size / 2;

  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: side === 'left' ? offset : undefined,
        right: side === 'right' ? offset : undefined,
        width: size,
        height: size,
        borderRadius: size,
        backgroundColor: COLORS.cream,
      }}
    />
  );
}
