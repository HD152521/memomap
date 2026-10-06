import { fireEvent, render, screen } from '@testing-library/react-native';

import { MemoForm } from '../MemoForm';

jest.mock('@/lib/logger', () => ({ logger: { error: jest.fn(), warn: jest.fn() } }));

const coord = { lat: 37.4979, lng: 127.0276 };

describe('MemoForm', () => {
  test('shows a field error and does not submit when the title is blank', async () => {
    // Arrange
    const onSubmit = jest.fn();
    await render(<MemoForm initial={{}} coord={coord} submitLabel="저장" onSubmit={onSubmit} />);

    // Act
    await fireEvent.press(screen.getByTestId('memo-submit'));

    // Assert
    expect(screen.getByText('장소 이름을 입력하세요')).toBeTruthy();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  test('submits trimmed values with coordinates', async () => {
    const onSubmit = jest.fn().mockResolvedValue(undefined);
    await render(<MemoForm initial={{ title: '  스타벅스 ', address: '' }} coord={coord} submitLabel="저장" onSubmit={onSubmit} />);

    await fireEvent.changeText(screen.getByLabelText('메모'), '비번 1234');
    await fireEvent.press(screen.getByTestId('memo-submit'));

    expect(onSubmit).toHaveBeenCalledWith({
      title: '스타벅스',
      address: null,
      body: '비번 1234',
      lat: 37.4979,
      lng: 127.0276,
      naverPlaceId: null,
      groupId: null,
    }, { added: [], removed: [] });
  });

  test('submits the chosen group', async () => {
    const onSubmit = jest.fn().mockResolvedValue(undefined);
    const groupId = '3f2b8c1e-9a4d-4e6f-8b2a-1c3d5e7f9a0b';
    const groups = [{ id: groupId, name: '맛집', emoji: '🍜', color: '#E8553E', sourceShareId: null, memoCount: 0 }];
    await render(<MemoForm initial={{ title: '카페' }} coord={coord} groups={groups} submitLabel="저장" onSubmit={onSubmit} />);

    await fireEvent.press(screen.getByTestId(`group-option-${groupId}`));
    await fireEvent.press(screen.getByTestId('memo-submit'));

    expect(onSubmit.mock.calls[0][0].groupId).toBe(groupId);
  });

  test('starts ungrouped when the initial group no longer exists', async () => {
    const onSubmit = jest.fn().mockResolvedValue(undefined);
    await render(
      <MemoForm initial={{ title: '카페', groupId: '3f2b8c1e-9a4d-4e6f-8b2a-1c3d5e7f9a0b' }} coord={coord} groups={[]} submitLabel="저장" onSubmit={onSubmit} />,
    );

    await fireEvent.press(screen.getByTestId('memo-submit'));

    expect(onSubmit.mock.calls[0][0].groupId).toBeNull();
  });

  test('shows the user message when submit fails', async () => {
    const { AppError } = jest.requireActual('@/lib/appError');
    const onSubmit = jest.fn().mockRejectedValue(new AppError('NETWORK', '네트워크 연결을 확인해 주세요'));
    await render(<MemoForm initial={{ title: '카페' }} coord={coord} submitLabel="저장" onSubmit={onSubmit} />);

    await fireEvent.press(screen.getByTestId('memo-submit'));

    expect(await screen.findByText('네트워크 연결을 확인해 주세요')).toBeTruthy();
  });

  test('shows the body character count', async () => {
    await render(<MemoForm initial={{ title: '카페', body: 'abc' }} coord={coord} submitLabel="저장" onSubmit={jest.fn()} />);

    expect(screen.getByText('3/5000')).toBeTruthy();
  });
});
