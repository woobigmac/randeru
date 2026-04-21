const { withAppDelegate, withInfoPlist } = require('expo/config-plugins');

const KAKAO_APP_KEY = '8ce0538653d5ba86b44650f62694d0a9';

/**
 * KakaoSDK.initSDK()를 AppDelegate.swift에 추가합니다.
 * @react-native-kakao/core 플러그인이 URL 핸들러만 추가하고
 * initSDK 호출을 추가하지 않으므로 별도로 처리합니다.
 */
const withKakaoInit = (config) => {
  // 1. Info.plist — KAKAO_APP_KEY + 누락된 URL 스킴 보완
  config = withInfoPlist(config, (c) => {
    c.modResults['KAKAO_APP_KEY'] = KAKAO_APP_KEY;

    const schemes = c.modResults.LSApplicationQueriesSchemes || [];
    const required = ['kakaokompassauth', 'storykompassauth', 'kakaolink', 'kakaotalk', 'kakaoplus'];
    c.modResults.LSApplicationQueriesSchemes = [...new Set([...schemes, ...required])];

    return c;
  });

  // 2. AppDelegate.swift — KakaoSDKCommon import + initSDK 호출
  config = withAppDelegate(config, (c) => {
    if (c.modResults.language !== 'swift') return c;

    let contents = c.modResults.contents;

    // import KakaoSDKCommon 추가 (중복 방지)
    if (!contents.includes('import KakaoSDKCommon')) {
      contents = contents.replace('import Expo', 'import Expo\nimport KakaoSDKCommon');
    }

    // KakaoSDK.initSDK() 추가 (중복 방지)
    if (!contents.includes('KakaoSDK.initSDK')) {
      contents = contents.replace(
        'public override func application(\n    _ application: UIApplication,\n    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil\n  ) -> Bool {',
        `public override func application(\n    _ application: UIApplication,\n    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil\n  ) -> Bool {\n    KakaoSDK.initSDK(appKey: "${KAKAO_APP_KEY}")\n`,
      );
    }

    c.modResults.contents = contents;
    return c;
  });

  return config;
};

module.exports = withKakaoInit;
