import type { ExpoConfig } from 'expo/config';

const BUNDLE_ID = 'com.yongsik.memomap';
const LOCATION_USAGE = '내 위치 주변 지도를 보여주기 위해 위치를 사용합니다.';

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
    'expo-sqlite',
    'expo-apple-authentication',
    ['expo-location', { locationWhenInUsePermission: LOCATION_USAGE }],
    // 갤러리 선택만 사용한다(카메라 권한 요청 안 함).
    [
      'expo-image-picker',
      { photosPermission: '메모에 사진을 첨부하기 위해 사진 보관함에 접근합니다.', cameraPermission: false, microphonePermission: false },
    ],
    // [M0 스파이크] 사진 촬영 위치를 읽으려면 보관함 직접 접근 + ACCESS_MEDIA_LOCATION 이 필요한지 실측한다.
    [
      'expo-media-library',
      {
        photosPermission: '사진의 촬영 위치와 날짜로 추억을 지도에 남기기 위해 사진 보관함에 접근합니다.',
        savePhotosPermission: false,
        isAccessMediaLocationEnabled: true,
        granularPermissions: ['photo'],
      },
    ],
    // 지도: MapLibre + OpenFreeMap(OpenStreetMap) 벡터 타일. API 키 불필요.
    '@maplibre/maplibre-react-native',
  ],
  experiments: {
    // Windows에서 dev 서버의 typed routes 감시가 src/app 밖 파일까지 라우트로 넣어 router.d.ts 를 망가뜨려 끈다.
    typedRoutes: false,
    reactCompiler: true,
  },
  owner: 'wkdrndydtlr',
  extra: {
    eas: { projectId: '293b7cc7-56ea-4442-b9de-e96400228b1c' },
  },
};

export default config;
