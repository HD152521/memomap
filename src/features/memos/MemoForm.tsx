import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { GroupPicker } from '@/features/groups/GroupPicker';
import type { MemoGroup } from '@/features/groups/types';
import { PhotoPickerRow } from '@/features/photos/PhotoPickerRow';
import type { LocalPhoto, MemoPhoto, PhotoChanges } from '@/features/photos/types';
import { toAppError } from '@/lib/appError';
import { Button } from '@/ui/Button';
import { colors, fontSize, radius, spacing } from '@/ui/theme';

import { ChipBar, type ChipKey } from './chips/ChipBar';
import { addDays, PromiseDatePicker } from './chips/PromiseDatePicker';
import { SeasonPicker } from './chips/SeasonPicker';
import { kstParts } from './memoChips';
import { MEMO_BODY_MAX_LENGTH, memoInputSchema, type MemoInput } from './memoSchema';
import type { Memo } from './types';

type InitialValues = Partial<
  Pick<Memo, 'title' | 'address' | 'body' | 'groupId' | 'secretNote' | 'visibleMonths' | 'visibleWeekdays' | 'promiseStart' | 'promiseEnd'>
>;

type Props = {
  initial: InitialValues;
  coord: { lat: number; lng: number };
  naverPlaceId?: string | null;
  groups?: MemoGroup[];
  existingPhotos?: MemoPhoto[];
  submitLabel: string;
  /** 새 메모는 바로 한 줄을 쓰도록 키보드를 올린다(3초 기록). */
  autoFocus?: boolean;
  /** 메모 값과 사진 변경분. 호출하는 화면이 메모 저장 → 사진 반영 순서로 처리한다. */
  onSubmit: (values: MemoInput, photos: PhotoChanges) => Promise<void>;
};

const NO_PHOTOS: MemoPhoto[] = [];
const NO_GROUPS: MemoGroup[] = [];
const DAY_MS = 24 * 60 * 60 * 1000;

function initialDays(start?: string | null, end?: string | null): number {
  if (!start || !end) return 1;
  return Math.round((Date.parse(end) - Date.parse(start)) / DAY_MS) + 1;
}

function initialOpenChips(initial: InitialValues, groupId: string | null, hasPhotos: boolean): Set<ChipKey> {
  const open = new Set<ChipKey>();
  if (initial.secretNote) open.add('secret');
  if (initial.visibleMonths || initial.visibleWeekdays) open.add('season');
  if (hasPhotos) open.add('photo');
  if (initial.promiseStart) open.add('promise');
  if (groupId) open.add('group');
  if (initial.body || initial.address) open.add('detail');
  return open;
}

export function MemoForm({ initial, coord, naverPlaceId = null, groups = NO_GROUPS, existingPhotos = NO_PHOTOS, submitLabel, autoFocus = false, onSubmit }: Props) {
  const [title, setTitle] = useState(initial.title ?? '');
  const [address, setAddress] = useState(initial.address ?? '');
  const [body, setBody] = useState(initial.body ?? '');
  const [secretNote, setSecretNote] = useState(initial.secretNote ?? '');
  const [months, setMonths] = useState<number[]>(initial.visibleMonths ?? []);
  const [weekdays, setWeekdays] = useState<number[]>(initial.visibleWeekdays ?? []);
  const [promiseStart, setPromiseStart] = useState<string | null>(initial.promiseStart ?? null);
  const [promiseDays, setPromiseDays] = useState(initialDays(initial.promiseStart, initial.promiseEnd));
  // 삭제된 그룹이 초기값이면 분류 없음으로 시작한다.
  const [groupId, setGroupId] = useState<string | null>(
    initial.groupId && groups.some((group) => group.id === initial.groupId) ? initial.groupId : null,
  );
  const [open, setOpen] = useState(() => initialOpenChips(initial, groupId, existingPhotos.length > 0));
  const [addedPhotos, setAddedPhotos] = useState<LocalPhoto[]>([]);
  const [removedPhotos, setRemovedPhotos] = useState<MemoPhoto[]>([]);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const toggleChip = (key: ChipKey) => {
    const next = new Set(open);
    if (next.has(key)) next.delete(key);
    else {
      next.add(key);
      if (key === 'promise' && !promiseStart) setPromiseStart(kstParts(new Date()).isoDate);
    }
    setOpen(next);
  };

  const buildInput = (): MemoInput => {
    const isPromise = open.has('promise') && promiseStart !== null;
    return {
      title,
      address: open.has('detail') ? address : null,
      body: open.has('detail') ? body : '',
      lat: coord.lat,
      lng: coord.lng,
      naverPlaceId,
      groupId: open.has('group') ? groupId : null,
      secretNote: open.has('secret') ? secretNote : null,
      visibleMonths: open.has('season') ? months : null,
      visibleWeekdays: open.has('season') ? weekdays : null,
      promiseStart: isPromise ? promiseStart : null,
      promiseEnd: isPromise && promiseDays > 1 ? addDays(promiseStart, promiseDays - 1) : null,
    };
  };

  const submit = async () => {
    const parsed = memoInputSchema.safeParse(buildInput());
    if (!parsed.success) {
      const errors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0] ?? 'form');
        if (!errors[key]) errors[key] = issue.message;
      }
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});
    setSubmitError(null);
    setIsSubmitting(true);
    try {
      await onSubmit(parsed.data, open.has('photo') ? { added: addedPhotos, removed: removedPhotos } : { added: [], removed: existingPhotos });
    } catch (e) {
      setSubmitError(toAppError(e).userMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={80}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.coord}>
          📍 {coord.lat.toFixed(5)}, {coord.lng.toFixed(5)}
        </Text>
        <TextInput
          value={title}
          onChangeText={setTitle}
          autoFocus={autoFocus}
          placeholder="한 줄 메모 (예: 2층 안쪽 화장실)"
          placeholderTextColor={colors.inkMuted}
          style={styles.titleInput}
          accessibilityLabel="한 줄 메모"
          returnKeyType="done"
        />
        <FieldError message={fieldErrors.title} />

        <ChipBar open={open} onToggle={toggleChip} />

        {open.has('secret') && (
          <Section title="🔒 비번" hint="지도·공유 목록에는 가려져요. 약속 링크에서는 약속 날까지만 보여요.">
            <TextInput
              value={secretNote}
              onChangeText={setSecretNote}
              placeholder="예: 1234* · 와이파이 비번 · 주차 B2"
              placeholderTextColor={colors.inkMuted}
              style={styles.input}
              accessibilityLabel="비번 입력"
              autoCapitalize="none"
              autoCorrect={false}
            />
            <FieldError message={fieldErrors.secretNote} />
          </Section>
        )}

        {open.has('season') && (
          <Section title="🗓 시기">
            <SeasonPicker months={months} weekdays={weekdays} onChangeMonths={setMonths} onChangeWeekdays={setWeekdays} />
          </Section>
        )}

        {open.has('photo') && (
          <Section title="📷 사진">
            <PhotoPickerRow
              existing={existingPhotos}
              added={addedPhotos}
              removedIds={new Set(removedPhotos.map((photo) => photo.id))}
              onAdd={(photos) => setAddedPhotos((prev) => [...prev, ...photos])}
              onRemoveExisting={(photo) => setRemovedPhotos((prev) => [...prev, photo])}
              onRemoveAdded={(localId) => setAddedPhotos((prev) => prev.filter((photo) => photo.localId !== localId))}
            />
          </Section>
        )}

        {open.has('promise') && (
          <Section title="👥 약속">
            <PromiseDatePicker start={promiseStart} days={promiseDays} onChangeStart={setPromiseStart} onChangeDays={setPromiseDays} />
            <FieldError message={fieldErrors.promiseEnd ?? fieldErrors.promiseStart} />
          </Section>
        )}

        {open.has('group') && (
          <Section title="🏷 그룹">
            <GroupPicker groups={groups} value={groupId} onChange={setGroupId} />
          </Section>
        )}

        {open.has('detail') && (
          <Section title="✏️ 자세히" trailing={`${body.length}/${MEMO_BODY_MAX_LENGTH}`}>
            <TextInput
              value={body}
              onChangeText={setBody}
              placeholder="더 적어둘 것 (추천 메뉴, 찾아가는 법…)"
              placeholderTextColor={colors.inkMuted}
              multiline
              textAlignVertical="top"
              style={[styles.input, styles.bodyInput]}
              accessibilityLabel="메모"
            />
            <FieldError message={fieldErrors.body} />
            <TextInput value={address} onChangeText={setAddress} placeholder="주소 (선택)" placeholderTextColor={colors.inkMuted} style={styles.input} accessibilityLabel="주소" />
            <FieldError message={fieldErrors.address} />
          </Section>
        )}

        {submitError && (
          <Text accessibilityRole="alert" style={styles.submitError}>
            {submitError}
          </Text>
        )}
        <Button label={submitLabel} onPress={submit} isLoading={isSubmitting} testID="memo-submit" />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Section({ title, hint, trailing, children }: { title: string; hint?: string; trailing?: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {trailing && <Text style={styles.trailing}>{trailing}</Text>}
      </View>
      {hint && <Text style={styles.hint}>{hint}</Text>}
      {children}
    </View>
  );
}

function FieldError({ message }: { message?: string }) {
  return message ? <Text style={styles.fieldError}>{message}</Text> : null;
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: spacing.lg, gap: spacing.lg },
  coord: { color: colors.inkMuted, fontSize: fontSize.caption, fontVariant: ['tabular-nums'] },
  titleInput: { fontSize: fontSize.title + 2, fontWeight: '600', color: colors.ink, paddingVertical: spacing.sm, borderBottomWidth: 1, borderColor: colors.line },
  section: { gap: spacing.sm, padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  sectionTitle: { fontSize: fontSize.caption + 1, fontWeight: '700', color: colors.ink },
  trailing: { fontSize: fontSize.caption, color: colors.inkMuted, fontVariant: ['tabular-nums'] },
  hint: { fontSize: fontSize.caption, color: colors.inkMuted },
  input: {
    minHeight: 44,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.paper,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: fontSize.body,
    color: colors.ink,
  },
  bodyInput: { minHeight: 120 },
  fieldError: { color: colors.danger, fontSize: fontSize.caption + 1 },
  submitError: { color: colors.danger, textAlign: 'center' },
});
