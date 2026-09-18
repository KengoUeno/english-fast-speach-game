import { useEffect, useRef } from 'react';
import { Animated, Easing, Platform, View, type StyleProp, type ViewStyle } from 'react-native';
import { COLORS, RADIUS } from '../theme';

/**
 * シリーズ共通のミニマルなフェイスマスコット。
 * 「察してEnglish」の丸顔＋黒目二つ＋オレンジの口をそのまま受け継ぎつつ、
 * 本作は音読がテーマなので口を大きく開け、右側に声を表す波紋を添える。
 * 追加ライブラリを使わず View の角丸だけで描いている。
 */

// RN Web では useNativeDriver が未対応のため、Web だけ JS ドライバに落とす
const NATIVE_DRIVER = Platform.OS !== 'web';

export function Mascot({
  size = 88,
  waves = true,
  speaking = true,
  style,
}: {
  size?: number;
  /** 声を表す波紋を顔の右側に描くか */
  waves?: boolean;
  /** 口が読み上げ中に動くか（静止画として使いたい場合は false） */
  speaking?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const mouth = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!speaking) {
      mouth.setValue(1);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(mouth, {
          toValue: 0.58,
          duration: 380,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: NATIVE_DRIVER,
        }),
        Animated.timing(mouth, {
          toValue: 1,
          duration: 420,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: NATIVE_DRIVER,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [speaking, mouth]);

  const eye = size * 0.1;
  const mouthWidth = size * 0.46;
  const mouthHeight = size * 0.36;
  const waveWidth = Math.max(2.5, size * 0.055);
  const containerWidth = waves ? size * 1.5 : size;

  return (
    <View style={[{ width: containerWidth, height: size * 1.3, justifyContent: 'center' }, style]}>
      {waves && (
        <>
          <Wave size={size} scale={1.26} color={COLORS.orange} thickness={waveWidth} delay={0} />
          <Wave size={size} scale={1.62} color={COLORS.orange} thickness={waveWidth} delay={160} />
          <Wave size={size} scale={1.98} color={COLORS.yellow} thickness={waveWidth} delay={320} />
        </>
      )}

      <View
        style={{
          width: size,
          height: size,
          borderRadius: RADIUS.pill,
          backgroundColor: COLORS.creamCard,
          // cream の背景に同化しないよう、トークン通りの太いnavyの輪郭で顔を起こす
          borderWidth: Math.max(2.5, size * 0.035),
          borderColor: COLORS.navy,
          overflow: 'hidden',
        }}
      >
        <View
          style={{
            position: 'absolute',
            top: size * 0.3,
            left: size * 0.26,
            width: eye,
            height: eye,
            borderRadius: RADIUS.pill,
            backgroundColor: COLORS.navy,
          }}
        />
        <View
          style={{
            position: 'absolute',
            top: size * 0.3,
            right: size * 0.26,
            width: eye,
            height: eye,
            borderRadius: RADIUS.pill,
            backgroundColor: COLORS.navy,
          }}
        />
        {/* 大きく開いた口。読み上げ中は縦方向に伸び縮みして「声を出している」ことを示す */}
        <Animated.View
          style={{
            position: 'absolute',
            bottom: -size * 0.02,
            left: (size - mouthWidth) / 2,
            width: mouthWidth,
            height: mouthHeight,
            borderTopLeftRadius: mouthWidth * 0.5,
            borderTopRightRadius: mouthWidth * 0.5,
            borderBottomLeftRadius: mouthWidth * 0.38,
            borderBottomRightRadius: mouthWidth * 0.38,
            backgroundColor: COLORS.orange,
            transform: [{ scaleY: mouth }],
          }}
        />
      </View>
    </View>
  );
}

/** 顔の中心から広がる声の波紋。右側だけ線を描いた円で弧を表現する */
function Wave({
  size,
  scale,
  color,
  thickness,
  delay,
}: {
  size: number;
  scale: number;
  color: string;
  thickness: number;
  delay: number;
}) {
  const opacity = useRef(new Animated.Value(0.15)).current;
  const diameter = size * scale;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 260,
          easing: Easing.out(Easing.quad),
          useNativeDriver: NATIVE_DRIVER,
        }),
        Animated.timing(opacity, {
          toValue: 0.15,
          duration: 520,
          easing: Easing.in(Easing.quad),
          useNativeDriver: NATIVE_DRIVER,
        }),
        Animated.delay(480 - delay),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [delay, opacity]);

  return (
    <Animated.View
      style={{
        pointerEvents: 'none',
        position: 'absolute',
        left: (size - diameter) / 2,
        top: '50%',
        marginTop: -diameter / 2,
        width: diameter,
        height: diameter,
        borderRadius: RADIUS.pill,
        borderWidth: thickness,
        borderColor: 'transparent',
        borderRightColor: color,
        opacity,
      }}
    />
  );
}
