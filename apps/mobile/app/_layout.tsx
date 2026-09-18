import { useFonts, Fredoka_400Regular, Fredoka_700Bold } from '@expo-google-fonts/fredoka';
import {
  MPLUSRounded1c_400Regular,
  MPLUSRounded1c_700Bold,
} from '@expo-google-fonts/m-plus-rounded-1c';
import {
  ZenKakuGothicNew_400Regular,
  ZenKakuGothicNew_700Bold,
} from '@expo-google-fonts/zen-kaku-gothic-new';
import { Stack } from 'expo-router';
import { View } from 'react-native';
import { COLORS } from '../theme';
import { IAPProvider } from '../lib/iap';
import { SharingProvider } from '../lib/sharing';

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Fredoka_400Regular,
    Fredoka_700Bold,
    MPLUSRounded1c_400Regular,
    MPLUSRounded1c_700Bold,
    ZenKakuGothicNew_400Regular,
    ZenKakuGothicNew_700Bold,
  });

  if (!fontsLoaded) {
    return <View style={{ flex: 1, backgroundColor: COLORS.cream }} />;
  }

  return (
    <IAPProvider>
      <SharingProvider>
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: COLORS.cream },
          }}
        />
      </SharingProvider>
    </IAPProvider>
  );
}
