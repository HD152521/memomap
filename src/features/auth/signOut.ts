import { toAppError } from '@/lib/appError';
import { queryClient } from '@/lib/queryClient';
import { supabase } from '@/lib/supabase';

export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  // 다음 사용자에게 이전 사용자의 캐시가 보이지 않도록 항상 비운다.
  queryClient.clear();
  if (error) throw toAppError(error);
}
