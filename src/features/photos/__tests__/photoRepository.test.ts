import { supabase } from '@/lib/supabase';
import { queryBuilder } from '@/test/supabaseMock';

import { freePositions, photoPath, photoRepository } from '../photoRepository';
import type { MemoPhoto } from '../types';

const mockStorage = { upload: jest.fn(), remove: jest.fn(), createSignedUrls: jest.fn() };
jest.mock('@/lib/supabase', () => ({
  supabase: { from: jest.fn(), storage: { from: jest.fn(() => mockStorage) }, auth: { getSession: jest.fn() } },
}));
jest.mock('@/lib/logger', () => ({ logger: { error: jest.fn(), warn: jest.fn() } }));
jest.mock('../resizeImage', () => ({ resizeImage: jest.fn().mockResolvedValue({ uri: 'file:///r.jpg', width: 1600, height: 1200 }) }));

const fromMock = supabase.from as jest.Mock;
const getSession = supabase.auth.getSession as jest.Mock;
const photo = (id: string, position: number): MemoPhoto => ({ id, memoId: 'm1', path: `u1/m1/${id}.jpg`, position, width: 10, height: 10, url: null });
const local = (localId: string) => ({ localId, uri: `file:///${localId}.jpg`, width: 4000, height: 3000 });

beforeEach(() => {
  jest.clearAllMocks();
  fromMock.mockReset();
  mockStorage.upload.mockResolvedValue({ error: null });
  mockStorage.remove.mockResolvedValue({ error: null });
  getSession.mockResolvedValue({ data: { session: { user: { id: 'u1' } } }, error: null });
  global.fetch = jest.fn().mockResolvedValue({ arrayBuffer: () => Promise.resolve(new ArrayBuffer(4)) }) as unknown as typeof fetch;
});

describe('freePositions', () => {
  test('fills the smallest free slots', () => {
    expect(freePositions([0, 2], 2)).toEqual([1, 3]);
    expect(freePositions([], 3)).toEqual([0, 1, 2]);
  });

  test('never returns more than the 5-photo limit allows', () => {
    expect(freePositions([0, 1, 2, 3], 3)).toEqual([4]);
  });
});

describe('photoPath', () => {
  test('starts with the owner id so storage policies accept it', () => {
    expect(photoPath('u1', 'm1', 'f1')).toBe('u1/m1/f1.jpg');
  });
});

describe('photoRepository.listByMemo', () => {
  test('returns photos with signed urls in position order', async () => {
    const builder = queryBuilder({ data: [{ id: 'p1', memo_id: 'm1', path: 'u1/m1/p1.jpg', position: 0, width: 1, height: 1 }], error: null });
    fromMock.mockReturnValueOnce(builder);
    mockStorage.createSignedUrls.mockResolvedValue({ data: [{ path: 'u1/m1/p1.jpg', signedUrl: 'https://signed/p1' }], error: null });

    const photos = await photoRepository.listByMemo('m1');

    expect(builder.order).toHaveBeenCalledWith('position', { ascending: true });
    expect(mockStorage.createSignedUrls).toHaveBeenCalledWith(['u1/m1/p1.jpg'], 3600);
    expect(photos[0].url).toBe('https://signed/p1');
  });

  test('skips signing when there are no photos', async () => {
    fromMock.mockReturnValueOnce(queryBuilder({ data: [], error: null }));

    await expect(photoRepository.listByMemo('m1')).resolves.toEqual([]);
    expect(mockStorage.createSignedUrls).not.toHaveBeenCalled();
  });
});

describe('photoRepository.applyChanges', () => {
  test('does nothing when there are no changes', async () => {
    await expect(photoRepository.applyChanges('m1', [], { added: [], removed: [] })).resolves.toEqual({ failedUploads: 0 });
    expect(fromMock).not.toHaveBeenCalled();
  });

  test('uploads resized photos under the owner folder into free positions', async () => {
    const insertBuilder = queryBuilder({ data: null, error: null });
    fromMock.mockReturnValue(insertBuilder);

    const result = await photoRepository.applyChanges('m1', [photo('p0', 0)], { added: [local('a')], removed: [] });

    expect(result).toEqual({ failedUploads: 0 });
    const [path, , options] = mockStorage.upload.mock.calls[0];
    expect(path).toMatch(/^u1\/m1\/.+\.jpg$/);
    expect(options).toEqual({ contentType: 'image/jpeg', upsert: false });
    expect(insertBuilder.insert).toHaveBeenCalledWith(expect.objectContaining({ memo_id: 'm1', position: 1, width: 1600, height: 1200 }));
  });

  test('removes deleted photos first so their slot can be reused', async () => {
    const builder = queryBuilder({ data: null, error: null });
    fromMock.mockReturnValue(builder);

    await photoRepository.applyChanges('m1', [photo('p0', 0)], { added: [local('a')], removed: [photo('p0', 0)] });

    expect(builder.delete).toHaveBeenCalled();
    expect(mockStorage.remove).toHaveBeenCalledWith(['u1/m1/p0.jpg']);
    expect(builder.insert).toHaveBeenCalledWith(expect.objectContaining({ position: 0 }));
  });

  test('cleans up the uploaded file when the row insert fails and counts the failure', async () => {
    fromMock.mockReturnValue(queryBuilder({ data: null, error: { code: '23514', message: 'limit' } }));

    const result = await photoRepository.applyChanges('m1', [], { added: [local('a')], removed: [] });

    expect(result).toEqual({ failedUploads: 1 });
    expect(mockStorage.remove).toHaveBeenCalledWith([expect.stringMatching(/^u1\/m1\//)]);
  });

  test('rejects adding beyond five photos', async () => {
    const existing = [0, 1, 2, 3, 4].map((n) => photo(`p${n}`, n));

    await expect(photoRepository.applyChanges('m1', existing, { added: [local('a')], removed: [] })).rejects.toMatchObject({ code: 'VALIDATION' });
  });

  test('requires a signed-in user for uploads', async () => {
    getSession.mockResolvedValue({ data: { session: null }, error: null });

    await expect(photoRepository.applyChanges('m1', [], { added: [local('a')], removed: [] })).rejects.toMatchObject({ code: 'AUTH' });
  });
});
