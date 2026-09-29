export type Memo = {
  id: string;
  title: string;
  address: string | null;
  naverPlaceId: string | null;
  lat: number;
  lng: number;
  body: string;
  createdAt: string;
  updatedAt: string;
};

// memos_with_coords 뷰의 row (DB snake_case). 앱 코드는 Memo만 사용한다.
export type MemoRow = {
  id: string;
  user_id: string;
  title: string;
  address: string | null;
  naver_place_id: string | null;
  lat: number;
  lng: number;
  body: string;
  created_at: string;
  updated_at: string;
};
