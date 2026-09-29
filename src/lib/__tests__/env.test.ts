import { parseEnv } from '../env';

describe('parseEnv', () => {
  test('returns parsed values when all variables are valid', () => {
    const result = parseEnv({ supabaseUrl: 'https://abc.supabase.co', supabaseKey: 'sb_publishable_x' });

    expect(result).toEqual({ supabaseUrl: 'https://abc.supabase.co', supabaseKey: 'sb_publishable_x' });
  });

  test('throws with the missing variable names', () => {
    expect(() => parseEnv({ supabaseUrl: undefined, supabaseKey: undefined })).toThrow(
      /EXPO_PUBLIC_SUPABASE_URL, EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY/,
    );
  });

  test('rejects a malformed url', () => {
    expect(() => parseEnv({ supabaseUrl: 'not-a-url', supabaseKey: 'k' })).toThrow(/EXPO_PUBLIC_SUPABASE_URL/);
  });
});
