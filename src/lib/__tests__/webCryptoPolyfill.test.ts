import * as ExpoCrypto from 'expo-crypto';

import { installWebCryptoPolyfill } from '../webCryptoPolyfill';

jest.mock('expo-crypto', () => ({
  getRandomValues: jest.fn((array: Uint8Array) => array),
  digest: jest.fn().mockResolvedValue(new ArrayBuffer(32)),
}));

describe('installWebCryptoPolyfill', () => {
  test('adds getRandomValues and subtle.digest backed by expo-crypto when missing', async () => {
    // Arrange
    const target: { crypto?: any } = {};

    // Act
    installWebCryptoPolyfill(target);
    await target.crypto.subtle.digest('SHA-256', new Uint8Array([1]));

    // Assert
    expect(target.crypto.getRandomValues).toBe(ExpoCrypto.getRandomValues);
    expect(ExpoCrypto.digest).toHaveBeenCalledWith('SHA-256', new Uint8Array([1]));
  });

  test('accepts the algorithm object form', async () => {
    const target: { crypto?: any } = {};
    installWebCryptoPolyfill(target);

    await target.crypto.subtle.digest({ name: 'SHA-256' }, new Uint8Array([2]));

    expect(ExpoCrypto.digest).toHaveBeenLastCalledWith('SHA-256', new Uint8Array([2]));
  });

  test('keeps an existing native implementation untouched', () => {
    const native = { getRandomValues: jest.fn(), subtle: { digest: jest.fn() } };
    const target = { crypto: native };

    installWebCryptoPolyfill(target as any);

    expect(target.crypto).toBe(native);
  });
});
