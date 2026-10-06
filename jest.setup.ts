process.env.EXPO_PUBLIC_SUPABASE_URL = 'https://test-project.supabase.co';
process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_test';

jest.mock('@mj-studio/react-native-naver-map', () => {
  const React = require('react');
  const { View, Pressable } = require('react-native');
  const NaverMapView = React.forwardRef(
    ({ children, onTapMap, ...rest }: { children?: unknown; onTapMap?: unknown }, ref: unknown) => {
      React.useImperativeHandle(ref, () => ({ animateCameraTo: jest.fn() }));
      return React.createElement(View, { testID: 'naver-map', onTapMap, ...rest }, children);
    },
  );
  const NaverMapMarkerOverlay = ({ onTap, latitude, longitude, tintColor }: { onTap?: () => void; latitude: number; longitude: number; tintColor?: string }) =>
    React.createElement(Pressable, { testID: `marker-${latitude}-${longitude}`, onPress: onTap, tintColor });
  return { NaverMapView, NaverMapMarkerOverlay };
});

jest.mock('expo-apple-authentication', () => ({
  signInAsync: jest.fn(),
  isAvailableAsync: jest.fn().mockResolvedValue(true),
  AppleAuthenticationScope: { FULL_NAME: 0, EMAIL: 1 },
  AppleAuthenticationButton: () => null,
  AppleAuthenticationButtonType: { SIGN_IN: 0 },
  AppleAuthenticationButtonStyle: { BLACK: 0 },
}));

jest.mock('expo-web-browser', () => ({
  openAuthSessionAsync: jest.fn(),
  maybeCompleteAuthSession: jest.fn(),
}));

jest.mock('expo-sqlite/localStorage/install', () => ({}));

jest.mock('expo-image-picker', () => ({ launchImageLibraryAsync: jest.fn() }));

jest.mock('expo-image-manipulator', () => {
  const saveAsync = jest.fn().mockResolvedValue({ uri: 'file:///resized.jpg', width: 1600, height: 1200 });
  const context = { resize: jest.fn(), renderAsync: jest.fn().mockResolvedValue({ width: 1600, height: 1200, saveAsync }) };
  return { ImageManipulator: { manipulate: jest.fn(() => context) }, SaveFormat: { JPEG: 'jpeg' } };
});

jest.mock('expo-crypto', () => ({
  randomUUID: jest.fn(() => '00000000-0000-4000-8000-000000000000'),
  digestStringAsync: jest.fn().mockResolvedValue('digest'),
  digest: jest.fn().mockResolvedValue(new ArrayBuffer(32)),
  getRandomValues: jest.fn((array: Uint8Array) => array),
  CryptoDigestAlgorithm: { SHA256: 'SHA-256' },
}));

jest.mock('expo-media-library', () => ({
  requestPermissionsAsync: jest.fn(),
  Query: jest.fn(),
  Asset: jest.fn(),
  AssetField: { CREATION_TIME: 'creationTime', MEDIA_TYPE: 'mediaType' },
  MediaType: { IMAGE: 'image' },
}));
