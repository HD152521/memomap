import type { ExpoConfig } from 'expo/config';

const BUNDLE_ID = 'com.yongsik.memomap';
const LOCATION_USAGE = '내 위치 주변 지도를 보여주기 위해 위치를 사용합니다.';

// 키 없이 빌드하면 지도가 회색으로만 나오고 빌드는 성공해 버린다 → EAS 빌드에서는 즉시 실패시킨다.
const NAVER_MAP_CLIENT_ID = process.env.EXPO_PUBLIC_NAVER_MAP_CLIENT_ID ?? '';
if (!NAVER_MAP_CLIENT_ID && process.env.EAS_BUILD === 'true') {
  throw new Error('EXPO_PUBLIC_NAVER_MAP_CLIENT_ID is not set (eas env:create 로 등록하세요)');
}

const config: ExpoConfig = {
  name: '메모 지도',
  slug: 'memo-map',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/images/icon.png',
  scheme: 'memomap',
  userInterfaceStyle: 'automatic',
  ios: {
    icon: './assets/expo.icon',
    bundleIdentifier: BUNDLE_ID,
    usesAppleSignIn: true,
  },
  android: {
    package: BUNDLE_ID,
    adaptiveIcon: {
      backgroundColor: '#E6F4FE',
      foregroundImage: './assets/images/android-icon-foreground.png',
      backgroundImage: './assets/images/android-icon-background.png',
      monochromeImage: './assets/images/android-icon-monochrome.png',
    },
    predictiveBackGestureEnabled: false,
  },
  web: {
    output: 'static',
    favicon: './assets/images/favicon.png',
  },
  plugins: [
    'expo-router',
    [
      'expo-splash-screen',
      {
        backgroundColor: '#208AEF',
        image: './assets/images/splash-icon.png',
        imageWidth: 76,
      },
    ],
    [
      'expo-build-properties',
      {
        android: {
          extraMavenRepos: ['https://repository.map.naver.com/archive/maven'],
        },
      },
    ],
    'expo-sqlite',
    'expo-apple-authentication',
    ['expo-location', { locationWhenInUsePermission: LOCATION_USAGE }],
    [
      '@mj-studio/react-native-naver-map',
      {
        client_id: NAVER_MAP_CLIENT_ID,
        android: { ACCESS_FINE_LOCATION: true, ACCESS_COARSE_LOCATION: true },
        ios: { NSLocationWhenInUseUsageDescription: LOCATION_USAGE },
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },
  owner: 'wkdrndydtlr',
  extra: {
    eas: { projectId: '293b7cc7-56ea-4442-b9de-e96400228b1c' },
  },
};

export default config;
