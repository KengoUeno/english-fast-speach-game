import { ReactNode } from 'react';
import { Pressable, StyleProp, Text, TextStyle, View, ViewStyle } from 'react-native';
import { BORDER, COLORS, FONTS, RADIUS, SHADES } from '../theme';

type Variant = 'primary' | 'accent' | 'approve' | 'skip' | 'ghost';

const VARIANT_STYLES: Record<
  Variant,
  { bg: string; text: string; border: string; shadow: string | null; depth: number }
> = {
  // メインCTA（ホームの GAME START）。前作と同じ黄色の「押せる駒」
  primary: { bg: COLORS.yellow, text: COLORS.navy, border: COLORS.navy, shadow: SHADES.yellow, depth: 6 },
  // ゲームを始める系のCTA。トークン上オレンジがCTA色
  accent: { bg: COLORS.orange, text: COLORS.creamCard, border: COLORS.navy, shadow: SHADES.orange, depth: 6 },
  // 正解＝ポジティブなので緑
  approve: { bg: COLORS.green, text: COLORS.creamCard, border: COLORS.navy, shadow: SHADES.green, depth: 6 },
  // 見送り。塗らずに輪郭だけで「弱いアクション」を表す
  skip: { bg: COLORS.creamCard, text: COLORS.orange, border: COLORS.orange, shadow: SHADES.hairline, depth: 5 },
  ghost: { bg: 'transparent', text: COLORS.navy, border: COLORS.navy, shadow: null, depth: 0 },
};

/**
 * 「押すと沈み込む駒」のような立体感のある角丸ボタン。
 * 下に敷いた同形の影を本体がずれて隠すことで、影ではなく色面だけで厚みを出す
 * （design-tokens.md の「影は最小限・フラットで彩度の高い配色でメリハリ」に従う）。
 */
export function GameButton({
  children,
  onPress,
  disabled,
  variant = 'primary',
  size = 'md',
  style,
  textStyle,
  testID,
}: {
  children: ReactNode;
  onPress?: () => void;
  disabled?: boolean;
  variant?: Variant;
  size?: 'md' | 'lg';
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  testID?: string;
}) {
  const v = VARIANT_STYLES[variant];
  const paddingVertical = size === 'lg' ? 18 : 15;
  const fontSize = size === 'lg' ? 19 : 16;

  return (
    <Pressable onPress={onPress} disabled={disabled} style={style} testID={testID}>
      {({ pressed }) => {
        const sunk = !disabled && pressed;
        const offset = sunk ? Math.max(v.depth - 4, 1) : v.depth;

        return (
          <View style={{ position: 'relative', opacity: disabled ? 0.4 : 1 }}>
            {v.shadow && (
              <View
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  backgroundColor: v.shadow,
                  borderRadius: RADIUS.box,
                  transform: [{ translateY: offset }],
                }}
              />
            )}
            <View
              style={{
                borderRadius: RADIUS.box,
                backgroundColor: v.bg,
                borderWidth: BORDER.thick,
                borderColor: v.border,
                alignItems: 'center',
                justifyContent: 'center',
                paddingVertical,
                paddingHorizontal: 10,
                transform: [{ translateY: sunk ? 3 : 0 }],
              }}
            >
              {typeof children === 'string' ? (
                <Text
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  style={[
                    {
                      fontFamily: FONTS.display,
                      color: v.text,
                      fontSize,
                      letterSpacing: 0.5,
                      lineHeight: fontSize * 1.25,
                    },
                    textStyle,
                  ]}
                >
                  {children}
                </Text>
              ) : (
                children
              )}
            </View>
          </View>
        );
      }}
    </Pressable>
  );
}
