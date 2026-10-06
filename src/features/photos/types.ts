export const MAX_PHOTOS_PER_MEMO = 5;

/** 서버에 저장된 사진. url은 서명 URL(1시간 유효). */
export type MemoPhoto = {
  id: string;
  memoId: string;
  path: string;
  position: number;
  width: number | null;
  height: number | null;
  url: string | null;
};

/** 아직 업로드하지 않은, 기기에서 고른 사진. */
export type LocalPhoto = {
  localId: string;
  uri: string;
  width: number;
  height: number;
};

/** 폼 제출 시 사진 변경분. 메모 저장 후 photoRepository.applyChanges로 반영한다. */
export type PhotoChanges = {
  added: LocalPhoto[];
  removed: MemoPhoto[];
};

export type MemoPhotoRow = {
  id: string;
  memo_id: string;
  path: string;
  position: number;
  width: number | null;
  height: number | null;
};

export type PhotoSaveResult = { failedUploads: number };
