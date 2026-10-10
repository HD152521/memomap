import { fireEvent, render, screen } from '@testing-library/react-native';

import { MemoForm } from '../MemoForm';

jest.mock('@/lib/logger', () => ({ logger: { error: jest.fn(), warn: jest.fn() } }));

const coord = { lat: 37.4979, lng: 127.0276 };
const GROUP_ID = '3f2b8c1e-9a4d-4e6f-8b2a-1c3d5e7f9a0b';
const EMPTY_CHIPS = {
  address: null,
  body: '',
  groupId: null,
  secretNote: null,
  visibleMonths: null,
  visibleWeekdays: null,
  promiseStart: null,
  promiseEnd: null,
};

describe('MemoForm', () => {
  test('saves a one-line memo with no chips (3-second capture)', async () => {
    // Arrange
    const onSubmit = jest.fn().mockResolvedValue(undefined);
    await render(<MemoForm initial={{}} coord={coord} submitLabel="저장" onSubmit={onSubmit} />);

    // Act
    await fireEvent.changeText(screen.getByLabelText('한 줄 메모'), '  2층 안쪽 화장실 ');
    await fireEvent.press(screen.getByTestId('memo-submit'));

    // Assert
    expect(onSubmit).toHaveBeenCalledWith({ title: '2층 안쪽 화장실', lat: 37.4979, lng: 127.0276, naverPlaceId: null, ...EMPTY_CHIPS }, { added: [], removed: [] });
  });

  test('allows saving just a pin with an empty line', async () => {
    const onSubmit = jest.fn().mockResolvedValue(undefined);
    await render(<MemoForm initial={{}} coord={coord} submitLabel="저장" onSubmit={onSubmit} />);

    await fireEvent.press(screen.getByTestId('memo-submit'));

    expect(onSubmit.mock.calls[0][0].title).toBe('');
  });

  test('opens the secret chip and saves the hidden note', async () => {
    const onSubmit = jest.fn().mockResolvedValue(undefined);
    await render(<MemoForm initial={{ title: '상가 화장실' }} coord={coord} submitLabel="저장" onSubmit={onSubmit} />);

    await fireEvent.press(screen.getByTestId('chip-secret'));
    await fireEvent.changeText(screen.getByLabelText('비번 입력'), '1234*');
    await fireEvent.press(screen.getByTestId('memo-submit'));

    expect(onSubmit.mock.calls[0][0].secretNote).toBe('1234*');
  });

  test('saves winter + Tue/Thu for a bungeoppang cart', async () => {
    const onSubmit = jest.fn().mockResolvedValue(undefined);
    await render(<MemoForm initial={{ title: '붕어빵 차' }} coord={coord} submitLabel="저장" onSubmit={onSubmit} />);

    await fireEvent.press(screen.getByTestId('chip-season'));
    await fireEvent.press(screen.getByTestId('season-winter'));
    await fireEvent.press(screen.getByTestId('weekday-2'));
    await fireEvent.press(screen.getByTestId('weekday-4'));
    await fireEvent.press(screen.getByTestId('memo-submit'));

    expect(onSubmit.mock.calls[0][0]).toMatchObject({ visibleMonths: [1, 2, 12], visibleWeekdays: [2, 4] });
  });

  test('turning a chip off clears its value', async () => {
    const onSubmit = jest.fn().mockResolvedValue(undefined);
    await render(<MemoForm initial={{ title: '카페', secretNote: '0000' }} coord={coord} submitLabel="저장" onSubmit={onSubmit} />);

    await fireEvent.press(screen.getByTestId('chip-secret'));
    await fireEvent.press(screen.getByTestId('memo-submit'));

    expect(onSubmit.mock.calls[0][0].secretNote).toBeNull();
  });

  test('saves a 1-night promise from an existing date', async () => {
    const onSubmit = jest.fn().mockResolvedValue(undefined);
    await render(<MemoForm initial={{ title: '강릉 숙소', promiseStart: '2026-11-21' }} coord={coord} submitLabel="저장" onSubmit={onSubmit} />);

    await fireEvent.press(screen.getByTestId('promise-days-plus'));
    await fireEvent.press(screen.getByTestId('memo-submit'));

    expect(screen.getByTestId('promise-days')).toHaveTextContent('1박 2일');
    expect(onSubmit.mock.calls[0][0]).toMatchObject({ promiseStart: '2026-11-21', promiseEnd: '2026-11-22' });
  });

  test('submits the chosen group from the group chip', async () => {
    const onSubmit = jest.fn().mockResolvedValue(undefined);
    const groups = [{ id: GROUP_ID, name: '맛집', emoji: '🍜', color: '#E8553E', sourceShareId: null, memoCount: 0 }];
    await render(<MemoForm initial={{ title: '카페' }} coord={coord} groups={groups} submitLabel="저장" onSubmit={onSubmit} />);

    await fireEvent.press(screen.getByTestId('chip-group'));
    await fireEvent.press(screen.getByTestId(`group-option-${GROUP_ID}`));
    await fireEvent.press(screen.getByTestId('memo-submit'));

    expect(onSubmit.mock.calls[0][0].groupId).toBe(GROUP_ID);
  });

  test('starts ungrouped when the initial group no longer exists', async () => {
    const onSubmit = jest.fn().mockResolvedValue(undefined);
    await render(<MemoForm initial={{ title: '카페', groupId: GROUP_ID }} coord={coord} groups={[]} submitLabel="저장" onSubmit={onSubmit} />);

    await fireEvent.press(screen.getByTestId('memo-submit'));

    expect(onSubmit.mock.calls[0][0].groupId).toBeNull();
  });

  test('shows a field error for a too-long line and does not submit', async () => {
    const onSubmit = jest.fn();
    await render(<MemoForm initial={{ title: '가'.repeat(101) }} coord={coord} submitLabel="저장" onSubmit={onSubmit} />);

    await fireEvent.press(screen.getByTestId('memo-submit'));

    expect(screen.getByText('한 줄 메모는 100자 이하로 입력하세요')).toBeTruthy();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  test('shows the user message when submit fails', async () => {
    const { AppError } = jest.requireActual('@/lib/appError');
    const onSubmit = jest.fn().mockRejectedValue(new AppError('NETWORK', '네트워크 연결을 확인해 주세요'));
    await render(<MemoForm initial={{ title: '카페' }} coord={coord} submitLabel="저장" onSubmit={onSubmit} />);

    await fireEvent.press(screen.getByTestId('memo-submit'));

    expect(await screen.findByText('네트워크 연결을 확인해 주세요')).toBeTruthy();
  });

  test('opens the detail section when the memo already has a body', async () => {
    await render(<MemoForm initial={{ title: '카페', body: 'abc' }} coord={coord} submitLabel="저장" onSubmit={jest.fn()} />);

    expect(screen.getByText('3/5000')).toBeTruthy();
  });
});
