import { router } from 'expo-router';

import { GroupForm } from '@/features/groups/GroupForm';
import { useCreateGroup } from '@/features/groups/useGroups';

export default function NewGroupScreen() {
  const createGroup = useCreateGroup();
  return (
    <GroupForm
      showSuggestions
      submitLabel="그룹 만들기"
      onSubmit={async (values) => {
        await createGroup.mutateAsync(values);
        router.back();
      }}
    />
  );
}
