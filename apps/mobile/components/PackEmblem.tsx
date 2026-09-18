import { Text, View } from 'react-native';
import { BORDER, COLORS, RADIUS, lockedPackTones } from '../theme';

/**
 * パックのテーマ絵文字を入れる角丸タイル。
 *
 * 絵文字は端末ごとに見え方が変わるうえ、素のまま並べると「ストックアイコンの羅列」に
 * 見えてしまう。そこでブランド色の太い枠で囲んだ“タイル”に収め、パックごとに枠色を
 * 変えることで、同じ形のカードが並んでも1枚ずつ識別できるようにしている。
 *
 * ロック中は絵文字ではなく View だけで描いた南京錠を出す。
 * 🔒 の絵文字を使わないのは、Mascot と同じく「見え方が端末に左右されない図形」で
 * 統一するため（ホームのバッジ文字と同じ方針）。
 *
 * ロック中もタイルはそのパックのアクセント色を薄めた色で塗る。無彩色にしてしまうと
 * 未所有のパックが全部同じ顔になり、グリッドから「どれがどれか」の手がかりが消える。
 * 開いていないことは南京錠と、カード側の INK.muted の文字で伝える。
 */
export function PackEmblem({
  emoji,
  accent,
  size = 44,
  locked = false,
  onDark = false,
}: {
  emoji: string;
  accent: string;
  size?: number;
  /** 未所有（ロック中）表示にするか */
  locked?: boolean;
  /** navy 地のカードの上に置くか（タイルの地色を明るい cream に切り替える） */
  onDark?: boolean;
}) {
  const tones = lockedPackTones(accent);

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: RADIUS.box,
        borderWidth: BORDER.thin,
        borderColor: locked ? tones.tileBorder : accent,
        backgroundColor: locked ? tones.tileFill : onDark ? COLORS.cream : COLORS.creamCard,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {locked ? (
        <LockGlyph color={tones.glyph} />
      ) : (
        <Text style={{ fontSize: Math.round(size * 0.46), lineHeight: Math.round(size * 0.62) }}>
          {emoji}
        </Text>
      )}
    </View>
  );
}

/** View の角丸だけで描いた南京錠（つる＋本体）。追加ライブラリもフォント依存も持たない */
function LockGlyph({ color }: { color: string }) {
  return (
    <View style={{ alignItems: 'center' }}>
      <View
        style={{
          width: 11,
          height: 8,
          borderWidth: 2,
          borderBottomWidth: 0,
          borderColor: color,
          borderTopLeftRadius: 6,
          borderTopRightRadius: 6,
        }}
      />
      <View
        style={{
          width: 17,
          height: 12,
          borderRadius: 4,
          backgroundColor: color,
          marginTop: -1,
        }}
      />
    </View>
  );
}
