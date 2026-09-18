import { Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { COLORS, FONTS, RADIUS } from '../theme';

/**
 * 一時共有（Sprint 4）まわりの小さな図形と表記をまとめた表示専用モジュール。
 *
 * ここに置いてあるのは「描き方」だけで、期限判定・発行・検証のロジックは一切持たない
 * （それらは packages/game-core と lib/sharing.tsx の担当）。
 *
 * 図形を絵文字ではなく View で描いているのは、PackEmblem の LockGlyph や Mascot と同じ理由:
 * 絵文字は端末・OSごとに字形も色も変わるうえ、素のまま並べると
 * 「ストックアイコンの羅列」に見えてしまうため、ブランド色の図形に統一する。
 */

/** View の三角形だけで描いた砂時計。「一時的・残り時間」を表すこのアプリ共通の印 */
export function HourglassGlyph({ color, size = 9 }: { color: string; size?: number }) {
  const cap = Math.max(1.5, size * 0.18);
  const bulb = size * 0.42;

  return (
    <View style={{ alignItems: 'center', width: size }}>
      <View style={{ width: size, height: cap, borderRadius: cap, backgroundColor: color }} />
      <View
        style={{
          width: 0,
          height: 0,
          borderLeftWidth: size / 2,
          borderRightWidth: size / 2,
          borderTopWidth: bulb,
          borderLeftColor: 'transparent',
          borderRightColor: 'transparent',
          borderTopColor: color,
        }}
      />
      <View
        style={{
          width: 0,
          height: 0,
          borderLeftWidth: size / 2,
          borderRightWidth: size / 2,
          borderBottomWidth: bulb,
          borderLeftColor: 'transparent',
          borderRightColor: 'transparent',
          borderBottomColor: color,
          marginTop: -0.5,
        }}
      />
      <View style={{ width: size, height: cap, borderRadius: cap, backgroundColor: color }} />
    </View>
  );
}

/** 鎖の輪を2つ重ねた「共有」の印。🔗 の代わりに使う */
export function LinkGlyph({ color, size = 8 }: { color: string; size?: number }) {
  const ring: ViewStyle = {
    width: size + 2,
    height: size - 1,
    borderRadius: RADIUS.pill,
    borderWidth: 1.6,
    borderColor: color,
  };

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      <View style={ring} />
      <View style={[ring, { marginLeft: -(size - 4) }]} />
    </View>
  );
}

/**
 * 「一時解放中・残りN分」を示す黄色い付箋。
 * 購入済みバッジ（緑の塗りピル・チェック印）とは色も形も持ち物も変え、
 * “借りているもの”であることが一目で分かるようにする。
 *
 * 文言（testIDを付けた Text の中身）は絵文字を外しただけで、意味は変えていない。
 */
export function TempAccessBadge({
  remainingLabel,
  testID,
  textTestID,
  style,
}: {
  remainingLabel: string;
  testID?: string;
  textTestID?: string;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View
      testID={testID}
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 6,
          alignSelf: 'flex-start',
          backgroundColor: COLORS.yellow,
          borderRadius: RADIUS.pill,
          paddingLeft: 9,
          paddingRight: 11,
          paddingVertical: 4,
        },
        style,
      ]}
    >
      <HourglassGlyph color={COLORS.navy} size={8} />
      <Text
        testID={textTestID}
        numberOfLines={1}
        style={{ fontFamily: FONTS.heading, fontSize: 10, color: COLORS.navy }}
      >
        一時解放中・残り{remainingLabel}
      </Text>
    </View>
  );
}

/**
 * 有効期限の時刻表記 "HH:MM"。
 * `toLocaleString()` はロケールによって長さが大きく変わり、375px幅で折り返す恐れがあるため使わない。
 * 期限は最長3時間先なので、日付をまたぐ場合だけ「翌」を冠すれば一意に読める。
 */
export function formatExpiryClock(expiresAtMs: number, nowMs: number): string {
  const expiry = new Date(expiresAtMs);
  const hh = expiry.getHours().toString().padStart(2, '0');
  const mm = expiry.getMinutes().toString().padStart(2, '0');
  const sameDay = new Date(nowMs).toDateString() === expiry.toDateString();
  return `${sameDay ? '' : '翌'}${hh}:${mm}`;
}
