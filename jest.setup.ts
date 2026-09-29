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
  const NaverMapMarkerOverlay = ({ onTap, latitude, longitude }: { onTap?: () => void; latitude: number; longitude: number }) =>
    React.createElement(Pressable, { testID: `marker-${latitude}-${longitude}`, onPress: onTap });
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
