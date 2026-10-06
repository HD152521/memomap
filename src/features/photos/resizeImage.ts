import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

export const MAX_PHOTO_EDGE = 1600;
const JPEG_QUALITY = 0.7;

export type ResizedImage = { uri: string; width: number; height: number };

/** 긴 변이 기준보다 크면 비율을 유지해 줄인 크기를, 아니면 null(축소 불필요)을 돌려준다. */
export function targetSize(width: number, height: number, maxEdge = MAX_PHOTO_EDGE): { width: number; height: number } | null {
  const longEdge = Math.max(width, height);
  if (longEdge <= maxEdge) return null;
  const scale = maxEdge / longEdge;
  return { width: Math.round(width * scale), height: Math.round(height * scale) };
}

/** 업로드 전 축소 + JPEG 재압축. 원본(수 MB)을 그대로 올리지 않기 위해 항상 거친다. */
export async function resizeImage(uri: string, width: number, height: number): Promise<ResizedImage> {
  const context = ImageManipulator.manipulate(uri);
  const size = targetSize(width, height);
  if (size) context.resize(size);
  const image = await context.renderAsync();
  const saved = await image.saveAsync({ compress: JPEG_QUALITY, format: SaveFormat.JPEG });
  return { uri: saved.uri, width: saved.width, height: saved.height };
}
