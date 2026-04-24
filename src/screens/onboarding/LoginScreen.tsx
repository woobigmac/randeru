import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Image,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useUserStore } from '../../store/useUserStore';
import { logLogin } from '../../services/analyticsService';
import { Colors, Fonts, Radius, Spacing } from '../../constants/theme';

export default function LoginScreen() {
  const [isLoading, setIsLoading] = useState(false);
  const loginWithKakao = useUserStore((s) => s.loginWithKakao);
  const loginWithApple = useUserStore((s) => s.loginWithApple);
  const loginAsGuest = useUserStore((s) => s.loginAsGuest);

  const handleAppleLogin = async () => {
    setIsLoading(true);
    try {
      await loginWithApple();
      logLogin('apple');
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Apple 로그인에 실패했어요.';
      Alert.alert('로그인 실패', message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKakaoLogin = async () => {
    setIsLoading(true);
    try {
      await loginWithKakao();
      logLogin('kakao');
    } catch (e: unknown) {
      const message =
        e instanceof Error ? e.message : '카카오 로그인에 실패했어요.';
      Alert.alert('로그인 실패', message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGuestLogin = async () => {
    setIsLoading(true);
    try {
      await loginAsGuest();
      logLogin('guest');
    } catch (e) {
      console.error('guest login error:', e);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.inner}>
        {/* 상단 브랜딩 */}
        <View style={styles.brand}>
          <Image
            source={require('../../../assets/icon.png')}
            style={styles.icon}
            resizeMode="contain"
          />
          <Text style={styles.title}>랜데루</Text>
          <Text style={styles.slogan}>하루에 하나, 인간다운 액션</Text>
        </View>

        {/* 하단 버튼 */}
        <View style={styles.buttonArea}>
          {isLoading ? (
            <ActivityIndicator color={Colors.white} size="large" />
          ) : (
            <>
              {/* Apple 로그인 — iOS에서만 표시, 애플 정책상 최상단 */}
              {Platform.OS === 'ios' && (
                <TouchableOpacity
                  style={styles.appleButton}
                  onPress={handleAppleLogin}
                  activeOpacity={0.85}
                >
                  <Text style={styles.appleLogo}></Text>
                  <Text style={styles.appleText}>Apple로 시작하기</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={styles.kakaoButton}
                onPress={handleKakaoLogin}
                activeOpacity={0.85}
              >
                <Text style={styles.kakaoLogo}>K</Text>
                <Text style={styles.kakaoText}>카카오로 시작하기</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.guestButton}
                onPress={handleGuestLogin}
                activeOpacity={0.7}
              >
                <Text style={styles.guestText}>게스트로 시작하기</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.primary,
  },
  inner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.xl,
    paddingHorizontal: Spacing.lg,
  },
  brand: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  icon: {
    width: 96,
    height: 96,
    borderRadius: Radius.lg,
    marginBottom: Spacing.md,
  },
  title: {
    fontFamily: Fonts.handwriting,
    fontSize: 48,
    color: Colors.white,
    marginBottom: 4,
  },
  slogan: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
    letterSpacing: 0.5,
  },
  buttonArea: {
    width: '100%',
    gap: Spacing.md,
    alignItems: 'center',
    paddingBottom: Spacing.md,
  },
  appleButton: {
    width: '100%',
    height: 52,
    backgroundColor: '#000000',
    borderRadius: Radius.full,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    gap: Spacing.sm,
  },
  appleLogo: {
    fontSize: 20,
    color: '#FFFFFF',
    lineHeight: 24,
  },
  appleText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  kakaoButton: {
    width: '100%',
    height: 52,
    backgroundColor: '#FEE500',
    borderRadius: Radius.full,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    gap: Spacing.sm,
  },
  kakaoLogo: {
    fontSize: 18,
    fontWeight: '700',
    color: '#191919',
    lineHeight: 22,
  },
  kakaoText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#191919',
  },
  guestButton: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
  },
  guestText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.75)',
    textDecorationLine: 'underline',
  },
});
