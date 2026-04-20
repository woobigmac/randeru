import 'react-native-gesture-handler'; // @react-navigation/stack 의존성 — 반드시 최상단에 위치
import React, { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import RootNavigator from './src/navigation/RootNavigator';
import { runSeedActions, runSeedSense, runSeedKind, runSeedConnect, runSeedEnvironment } from './src/services/seedActions';

// 네이티브 스플래시를 자동 숨김 방지 — 폰트 로드 완료 후 직접 숨긴다
SplashScreen.preventAutoHideAsync();

export default function App() {
  const [fontsLoaded] = useFonts({
    KotraHope: require('./assets/fonts/KOTRA_SONGEULSSI.ttf'),
  });

  useEffect(() => {
    if (__DEV__) {
      runSeedActions();
      runSeedSense();
      runSeedKind();
      runSeedConnect();
      runSeedEnvironment();
    }
  }, []);

  useEffect(() => {
    if (fontsLoaded) {
      // 폰트 준비 완료 → 네이티브 스플래시 숨김
      // 이후 RootNavigator → SplashScreen.tsx가 최소 2.5초 커스텀 스플래시를 보여준다
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <NavigationContainer>
          <RootNavigator />
        </NavigationContainer>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
