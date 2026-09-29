import { useQuery } from '@tanstack/react-query';

import type { AppError } from '@/lib/appError';
import { toAppError } from '@/lib/appError';
import { supabase } from '@/lib/supabase';

import { parseNaverLocalItems, type NaverLocalItem, type PlaceCandidate } from './naverLocal';

export const PLACE_QUERY_MIN_LENGTH = 2;

export async function searchPlaces(query: string): Promise<PlaceCandidate[]> {
  const { data, error } = await supabase.functions.invoke<{ items: NaverLocalItem[] }>('naver-search', {
    body: { query },
  });
  if (error) throw toAppError(error);
  return parseNaverLocalItems(data?.items ?? []);
}

export function usePlaceSearch(query: string) {
  const trimmed = query.trim();
  return useQuery<PlaceCandidate[], AppError>({
    queryKey: ['places', trimmed],
    queryFn: () => searchPlaces(trimmed),
    enabled: trimmed.length >= PLACE_QUERY_MIN_LENGTH,
    staleTime: 5 * 60_000,
  });
}
