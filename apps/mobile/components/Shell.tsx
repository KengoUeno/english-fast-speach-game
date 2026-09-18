import { ReactNode } from 'react';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, CONTENT_MAX_WIDTH } from '../theme';

/**
 * 画面共通の余白・背景だけを揃える枠。
 * 375px幅のビューポートでも横スクロールが発生しないよう、
 * 横方向は常にpaddingのみで確保し、固定幅は指定しない。
 * 広い画面（Web・タブレット）では中央寄せの上限幅を設け、間延びを防ぐ。
 */
export function Shell({ children }: { children: ReactNode }) {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.cream }}>
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: 'center',
          paddingHorizontal: 20,
          paddingVertical: 28,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ width: '100%', maxWidth: CONTENT_MAX_WIDTH, alignSelf: 'center' }}>
          {children}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
