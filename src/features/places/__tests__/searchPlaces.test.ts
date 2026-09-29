import { supabase } from '@/lib/supabase';

import { searchPlaces } from '../searchPlaces';

jest.mock('@/lib/supabase', () => ({ supabase: { functions: { invoke: jest.fn() } } }));
jest.mock('@/lib/logger', () => ({ logger: { error: jest.fn(), warn: jest.fn() } }));

const invokeMock = supabase.functions.invoke as jest.Mock;

describe('searchPlaces', () => {
  test('calls the naver-search function and parses items', async () => {
    invokeMock.mockResolvedValueOnce({
      data: { items: [{ title: '<b>카페</b>', link: '', category: '', address: 'a', roadAddress: '', mapx: '1270000000', mapy: '375000000' }] },
      error: null,
    });

    const places = await searchPlaces('카페');

    expect(invokeMock).toHaveBeenCalledWith('naver-search', { body: { query: '카페' } });
    expect(places).toEqual([{ name: '카페', address: 'a', lat: 37.5, lng: 127 }]);
  });

  test('throws AppError when the function fails', async () => {
    invokeMock.mockResolvedValueOnce({ data: null, error: new Error('FunctionsHttpError') });

    await expect(searchPlaces('카페')).rejects.toMatchObject({ code: 'UNKNOWN' });
  });
});
