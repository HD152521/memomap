import { z } from 'zod';

const envSchema = z.object({
  supabaseUrl: z.url(),
  supabaseKey: z.string().min(1),
});

export type Env = z.infer<typeof envSchema>;

const ENV_NAMES: Record<keyof Env, string> = {
  supabaseUrl: 'EXPO_PUBLIC_SUPABASE_URL',
  supabaseKey: 'EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
};

export function parseEnv(raw: Record<keyof Env, string | undefined>): Env {
  const result = envSchema.safeParse(raw);
  if (!result.success) {
    const names = result.error.issues.map((issue) => ENV_NAMES[issue.path[0] as keyof Env]);
    throw new Error(`환경 변수가 없거나 잘못되었습니다: ${names.join(', ')} (.env.example 참고)`);
  }
  return result.data;
}

// EXPO_PUBLIC_* 는 정적 접근일 때만 번들에 인라인된다. process.env[key] 형태로 바꾸지 말 것.
export const env = parseEnv({
  supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
  supabaseKey: process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
});
