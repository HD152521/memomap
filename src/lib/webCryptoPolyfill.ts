import * as ExpoCrypto from 'expo-crypto';

// React Native(Hermes)에는 WebCrypto가 없어 supabase-js PKCE가 SHA-256 대신 plain 챌린지로 떨어진다.
// supabase-js가 쓰는 두 함수(getRandomValues, subtle.digest)만 expo-crypto로 채운다.
type DigestAlgorithm = Parameters<typeof ExpoCrypto.digest>[0];

type MinimalCrypto = {
  getRandomValues?: typeof ExpoCrypto.getRandomValues;
  subtle?: { digest: (algorithm: string | { name: string }, data: BufferSource) => Promise<ArrayBuffer> };
};

export function installWebCryptoPolyfill(target: { crypto?: MinimalCrypto } = globalThis as { crypto?: MinimalCrypto }): void {
  const current: MinimalCrypto = target.crypto ?? {};
  if (current.getRandomValues && current.subtle) return;

  target.crypto = {
    ...current,
    getRandomValues: current.getRandomValues ?? ExpoCrypto.getRandomValues,
    subtle: current.subtle ?? {
      digest: (algorithm, data) => {
        const name = typeof algorithm === 'string' ? algorithm : algorithm.name;
        return ExpoCrypto.digest(name as DigestAlgorithm, data);
      },
    },
  };
}

installWebCryptoPolyfill();
