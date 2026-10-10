import { fireEvent, render, screen, within } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import type { Memo } from '@/features/memos/types';

import { MemoMap } from '../MemoMap';

const memo = (id: string, lat: number, lng: number): Memo => ({
  id,
  title: `메모 ${id}`,
  address: null,
  naverPlaceId: null,
  groupId: null,
  lat,
  lng,
  body: '',
  createdAt: '2026-10-01T00:00:00Z',
  updatedAt: '2026-10-01T00:00:00Z',
});

const dotColorOf = (markerTestId: string) =>
  StyleSheet.flatten(within(screen.getByTestId(markerTestId)).getByTestId('memo-pin-dot').props.style).backgroundColor;

describe('MemoMap', () => {
  test('renders one marker per memo and reports taps with the memo id', async () => {
    // Arrange
    const onTapMemo = jest.fn();
    await render(<MemoMap memos={[memo('a', 37.1, 127.1), memo('b', 37.2, 127.2)]} draft={null} onTapMap={jest.fn()} onTapMemo={onTapMemo} />);

    // Act
    await fireEvent.press(screen.getByTestId('marker-37.2-127.2'));

    // Assert
    expect(screen.getByTestId('marker-37.1-127.1')).toBeTruthy();
    expect(screen.getByText('메모 b')).toBeTruthy();
    expect(onTapMemo).toHaveBeenCalledWith('b');
  });

  test('renders a draft marker when a draft coordinate is set', async () => {
    await render(<MemoMap memos={[]} draft={{ latitude: 37.5, longitude: 127 }} onTapMap={jest.fn()} onTapMemo={jest.fn()} />);

    expect(screen.getByTestId('marker-37.5-127')).toBeTruthy();
  });

  test('forwards map presses as coordinates (MapLibre gives [lng, lat])', async () => {
    const onTapMap = jest.fn();
    await render(<MemoMap memos={[]} draft={null} onTapMap={onTapMap} onTapMemo={jest.fn()} />);

    await fireEvent.press(screen.getByTestId('memo-map'), { nativeEvent: { lngLat: [127, 37.5], point: [0, 0] } });

    expect(onTapMap).toHaveBeenCalledWith({ latitude: 37.5, longitude: 127 });
  });

  test('colors pins by group and falls back to gray', async () => {
    const grouped = { ...memo('a', 37.1, 127.1), groupId: 'g1' };
    const loose = memo('b', 37.2, 127.2);
    await render(
      <MemoMap memos={[grouped, loose]} groupColors={new Map([['g1', '#E8553E']])} draft={null} onTapMap={jest.fn()} onTapMemo={jest.fn()} />,
    );

    expect(dotColorOf('marker-37.1-127.1')).toBe('#E8553E');
    expect(dotColorOf('marker-37.2-127.2')).toBe('#9AA1A9');
  });
});
