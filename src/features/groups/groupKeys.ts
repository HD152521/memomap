// useMemos ↔ useGroups 순환 import 를 피하려고 쿼리 키만 따로 둔다.
export const groupKeys = { all: ['groups'] as const };
