import 'react-native-gesture-handler'; // @react-navigation/stack 의존성 — 반드시 최상단에 위치
import React, { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import RootNavigator from './src/navigation/RootNavigator';
import { runSeedActions, runSeedSense, runSeedKind } from './src/services/seedActions';

export default function App() {
  const [fontsLoaded] = useFonts({
    KotraHope: require('./assets/fonts/KOTRA_SONGEULSSI.ttf'),
  });

  useEffect(() => {
    if (__DEV__) {
      runSeedActions();
      runSeedSense();
      runSeedKind();
    }
  }, []);

  // 폰트 로드 전에는 아무것도 렌더하지 않음 (스플래시 화면이 자동 유지됨)
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
