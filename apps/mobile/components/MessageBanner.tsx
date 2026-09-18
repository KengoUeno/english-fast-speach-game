import { Text, View } from 'react-native';
import { BORDER, COLORS, FONTS, RADIUS, TINT } from '../theme';

/**
 * ストア画面・コード入力画面など、複数の画面で使う汎用のメッセージ形。
 * 元々は `lib/iap.tsx` の `StoreMessage` としてストア画面専用に定義されていたが、
 * Sprint 4 の「コードを入力」画面でも同じ見た目のバナーを再利用するため、
 * このコンポーネント側の型として一般化した（`StoreMessage` は互換のため同じ形を指す）。
 */
export interface BannerMessage {
  tone: 'info' | 'error' | 'success';
  text: string;
}

/**
 * ストア画面の操作結果メッセージ（「準備中」「RC-xx」等のエラーコード含む）を表示するバナー。
 *
 * ネイティブの `Alert.alert` はWeb上では `window.alert` に化けてJS実行をブロックし、
 * Playwrightでの自動テストや「画面も操作可能なまま維持される」という契約と相性が悪いため、
 * 本作では常にこの画面内バナーでメッセージを表示する方針にしている（Generatorの裁量）。
 * 教訓9（エラーには常に短いコードを添え、常時表示する）にも、Alertより適している。
 *
 * 見た目は、ホームの入口チップと同じ「丸いブランドバッジ＋文言」の並びで統一する。
 * 地色はトークン色をそのまま薄めた値だけを使い、色相は増やしていない。
 */
export function MessageBanner({
  message,
  testID = 'store-message',
}: {
  message: BannerMessage;
  /** 画面ごとに一意なtestIDを付けたい場合に指定する（既定は互換のため "store-message"） */
  testID?: string;
}) {
  const tone = TONE_STYLES[message.tone];

  return (
    <View
      testID={testID}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        borderWidth: BORDER.thick,
        borderColor: tone.border,
        backgroundColor: tone.bg,
        borderRadius: RADIUS.box,
        paddingLeft: 12,
        paddingRight: 14,
        paddingVertical: 11,
        marginBottom: 18,
      }}
    >
      {/* 絵文字ではなくブランド色のバッジ文字（ホームの入口チップと同じ作り） */}
      <View
        style={{
          width: 22,
          height: 22,
          borderRadius: RADIUS.pill,
          backgroundColor: tone.border,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text
          style={{
            fontFamily: FONTS.display,
            fontSize: 13,
            lineHeight: 17,
            color: tone.badgeText,
          }}
        >
          {tone.badge}
        </Text>
      </View>

      <Text
        style={{
          flex: 1,
          fontFamily: FONTS.bodyBold,
          fontSize: 13,
          lineHeight: 19,
          color: tone.text,
        }}
      >
        {message.text}
      </Text>
    </View>
  );
}

const TONE_STYLES: Record<
  BannerMessage['tone'],
  { bg: string; border: string; text: string; badge: string; badgeText: string }
> = {
  info: {
    bg: TINT.navy,
    border: COLORS.navy,
    text: COLORS.navy,
    badge: 'i',
    badgeText: COLORS.yellow,
  },
  error: {
    bg: TINT.orange,
    border: COLORS.orange,
    text: COLORS.orange,
    badge: '!',
    badgeText: COLORS.creamCard,
  },
  success: {
    bg: TINT.green,
    border: COLORS.green,
    text: COLORS.green,
    badge: '✓',
    badgeText: COLORS.creamCard,
  },
};
