const { withAppDelegate, withInfoPlist, withDangerousMod } = require('expo/config-plugins');
const fs = require('fs');
const path = require('path');

const KAKAO_APP_KEY = '8ce0538653d5ba86b44650f62694d0a9';

/**
 * 1. Info.plist — KAKAO_APP_KEY + 필수 URL 스킴
 * 2. AppDelegate.swift — KakaoSDKCommon import + KakaoSDK.initSDK()
 * 3. Podfile — use_modular_headers! (Firebase Swift 모듈 빌드 필요)
 */
const withKakaoInit = (config) => {
  // ── Info.plist ──────────────────────────────────────────────────────────
  config = withInfoPlist(config, (c) => {
    c.modResults['KAKAO_APP_KEY'] = KAKAO_APP_KEY;

    // LSApplicationQueriesSchemes
    const schemes = c.modResults.LSApplicationQueriesSchemes || [];
    const required = ['kakaokompassauth', 'storykompassauth', 'kakaolink', 'kakaotalk', 'kakaoplus'];
    c.modResults.LSApplicationQueriesSchemes = [...new Set([...schemes, ...required])];

    // CFBundleURLTypes — kakao scheme
    if (!c.modResults.CFBundleURLTypes) c.modResults.CFBundleURLTypes = [];
    const hasKakaoScheme = c.modResults.CFBundleURLTypes.some(
      (t) => t.CFBundleURLSchemes?.some((s) => s === `kakao${KAKAO_APP_KEY}`),
    );
    if (!hasKakaoScheme) {
      c.modResults.CFBundleURLTypes.push({
        CFBundleURLSchemes: [`kakao${KAKAO_APP_KEY}`],
        CFBundleURLName: 'Kakao',
      });
    }

    return c;
  });

  // ── AppDelegate.swift ───────────────────────────────────────────────────
  config = withAppDelegate(config, (c) => {
    if (c.modResults.language !== 'swift') return c;

    let contents = c.modResults.contents;

    // import KakaoSDKCommon
    if (!contents.includes('import KakaoSDKCommon')) {
      contents = contents.replace('import Expo', 'import Expo\nimport KakaoSDKCommon');
    }

    // import RNCKakaoUser (kakao/core 플러그인이 추가 못한 경우 대비)
    if (!contents.includes('import RNCKakaoUser')) {
      contents = contents.replace('import Expo', 'import Expo\nimport RNCKakaoUser');
    }

    // KakaoSDK.initSDK — didFinishLaunchingWithOptions 첫 줄에 삽입
    if (!contents.includes('KakaoSDK.initSDK')) {
      // Firebase generated marker 이후 또는 함수 본문 시작점 앞에 삽입
      // 방법: "let delegate = ReactNativeDelegate()" 앞에 추가
      contents = contents.replace(
        '    let delegate = ReactNativeDelegate()',
        `    KakaoSDK.initSDK(appKey: "${KAKAO_APP_KEY}")\n    let delegate = ReactNativeDelegate()`,
      );
    }

    // Kakao URL 핸들러 (kakao/core 플러그인이 추가 못한 경우 대비)
    if (!contents.includes('RNCKakaoUserUtil')) {
      contents = contents.replace(
        '    return super.application(app, open: url, options: options) || RCTLinkingManager.application(app, open: url, options: options)',
        '    if(RNCKakaoUserUtil.isKakaoTalkLoginUrl(url)) { return RNCKakaoUserUtil.handleOpen(url) }\n    return super.application(app, open: url, options: options) || RCTLinkingManager.application(app, open: url, options: options)',
      );
    }

    c.modResults.contents = contents;
    return c;
  });

  // ── Podfile — use_modular_headers! (Firebase Swift 모듈 빌드 필요) ─────
  config = withDangerousMod(config, [
    'ios',
    (c) => {
      const podfilePath = path.join(c.modRequest.platformProjectRoot, 'Podfile');
      if (!fs.existsSync(podfilePath)) return c;

      let contents = fs.readFileSync(podfilePath, 'utf-8');
      if (!contents.includes('use_modular_headers!')) {
        contents = contents.replace(
          '  use_expo_modules!',
          '  use_expo_modules!\n  use_modular_headers!',
        );
        fs.writeFileSync(podfilePath, contents);
      }
      return c;
    },
  ]);

  return config;
};

module.exports = withKakaoInit;
