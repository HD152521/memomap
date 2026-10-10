export type Memo = {
  id: string;
  /** 한 줄 메모. 빈 문자열이면 "이름 없는 메모"로 표시(displayTitle). */
  title: string;
  address: string | null;
  naverPlaceId: string | null;
  groupId: string | null;
  lat: number;
  lng: number;
  body: string;
  /** 🔒 비번(숨김 메모). 지도·목록에는 내보내지 않고 상세에서만 탭해서 본다. */
  secretNote: string | null;
  /** 🗓 보이는 달(1~12). null = 항상. */
  visibleMonths: number[] | null;
  /** 🗓 보이는 요일(0=일~6=토). null = 항상. */
  visibleWeekdays: number[] | null;
  /** 👥 약속 날짜(YYYY-MM-DD). */
  promiseStart: string | null;
  promiseEnd: string | null;
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
  group_id: string | null;
  lat: number;
  lng: number;
  body: string;
  secret_note: string | null;
  visible_months: number[] | null;
  visible_weekdays: number[] | null;
  promise_start: string | null;
  promise_end: string | null;
  created_at: string;
  updated_at: string;
};
