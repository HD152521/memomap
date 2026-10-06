import { fireEvent, render, screen } from '@testing-library/react-native';

import { GroupFilterChips } from '../GroupFilterChips';
import { GroupForm } from '../GroupForm';
import type { MemoGroup } from '../types';

jest.mock('@/lib/logger', () => ({ logger: { error: jest.fn(), warn: jest.fn() } }));

const group: MemoGroup = { id: 'g1', name: '맛집', emoji: '🍜', color: '#E8553E', sourceShareId: null, memoCount: 2 };

describe('GroupFilterChips', () => {
  test('renders nothing when there are no groups', async () => {
    await render(<GroupFilterChips groups={[]} value="all" onChange={jest.fn()} />);

    expect(screen.queryByTestId('filter-chip-all')).toBeNull();
  });

  test('shows all, each group and ungrouped, and reports the selection', async () => {
    const onChange = jest.fn();
    await render(<GroupFilterChips groups={[group]} value="all" onChange={onChange} />);

    expect(screen.getByTestId('filter-chip-all')).toBeTruthy();
    expect(screen.getByTestId('filter-chip-none')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('filter-chip-g1'));

    expect(onChange).toHaveBeenCalledWith('g1');
  });
});

describe('GroupForm', () => {
  test('fills name, emoji and color from a suggestion and submits', async () => {
    const onSubmit = jest.fn().mockResolvedValue(undefined);
    await render(<GroupForm showSuggestions submitLabel="그룹 만들기" onSubmit={onSubmit} />);

    await fireEvent.press(screen.getByTestId('suggestion-계곡'));
    await fireEvent.press(screen.getByTestId('group-submit'));

    expect(onSubmit).toHaveBeenCalledWith({ name: '계곡', emoji: '🏞️', color: '#2E9E5B' });
  });

  test('shows the validation message for an empty name', async () => {
    const onSubmit = jest.fn();
    await render(<GroupForm submitLabel="저장" onSubmit={onSubmit} />);

    await fireEvent.press(screen.getByTestId('group-submit'));

    expect(screen.getByText('그룹 이름을 입력하세요')).toBeTruthy();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  test('shows the server message when saving fails', async () => {
    const { AppError } = jest.requireActual('@/lib/appError');
    const onSubmit = jest.fn().mockRejectedValue(new AppError('VALIDATION', '같은 이름의 그룹이 있어요'));
    await render(<GroupForm initial={{ name: '맛집', emoji: '🍜', color: '#E8553E' }} submitLabel="저장" onSubmit={onSubmit} />);

    await fireEvent.press(screen.getByTestId('group-submit'));

    expect(await screen.findByText('같은 이름의 그룹이 있어요')).toBeTruthy();
  });
});
