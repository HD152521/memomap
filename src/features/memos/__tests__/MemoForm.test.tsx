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
    });
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
