export type MemoGroup = {
  id: string;
  name: string;
  emoji: string;
  color: string;
  sourceShareId: string | null;
  memoCount: number;
};

// memo_groups row + memos(count) 임베드 (DB snake_case). 앱 코드는 MemoGroup만 사용한다.
export type MemoGroupRow = {
  id: string;
  name: string;
  emoji: string;
  color: string;
  source_share_id: string | null;
  memos?: { count: number }[];
};
