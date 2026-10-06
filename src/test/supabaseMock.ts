// 테스트 전용: supabase 쿼리 빌더 체인을 흉내낸다. 어떤 메서드를 불러도 자신을 반환하고, await 하면 result를 준다.
export type QueryResult = { data: unknown; error: unknown; count?: number | null };

const CHAIN_METHODS = ['select', 'insert', 'update', 'upsert', 'delete', 'eq', 'is', 'in', 'order', 'returns', 'limit'] as const;

export type QueryBuilderMock = Record<(typeof CHAIN_METHODS)[number] | 'single' | 'maybeSingle', jest.Mock> & {
  then: (resolve: (r: QueryResult) => unknown) => Promise<unknown>;
};

export function queryBuilder(result: QueryResult): QueryBuilderMock {
  const builder = {} as QueryBuilderMock;
  for (const method of CHAIN_METHODS) {
    builder[method] = jest.fn(() => builder);
  }
  builder.single = jest.fn(() => Promise.resolve(result));
  builder.maybeSingle = jest.fn(() => Promise.resolve(result));
  builder.then = (resolve) => Promise.resolve(result).then(resolve);
  return builder;
}
