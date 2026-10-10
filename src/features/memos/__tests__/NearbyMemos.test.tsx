import { fireEvent, render, screen } from '@testing-library/react-native';

import { makeMemo } from '@/test/memoFixture';

import { NearbyMemos } from '../NearbyMemos';

describe('NearbyMemos', () => {
  test('lists nearby memos with distance and a lock for secrets, and opens them', async () => {
    // Arrange
    const onPressMemo = jest.fn();
    const items = [
      { memo: makeMemo({ id: 'a', title: '', secretNote: '1234' }), distance: 22 },
      { memo: makeMemo({ id: 'b', title: '붕어빵 차' }), distance: 212 },
    ];
    await render(<NearbyMemos items={items} onPressMemo={onPressMemo} />);

    // Act
    await fireEvent.press(screen.getByTestId('nearby-b'));

    // Assert
    expect(screen.getByText('📍 지금 여기 근처 메모 2개')).toBeTruthy();
    expect(screen.getByText('이름 없는 메모')).toBeTruthy();
    expect(screen.getByText('🔒')).toBeTruthy();
    expect(screen.getByText('210m')).toBeTruthy();
    expect(onPressMemo).toHaveBeenCalledWith('b');
  });

  test('renders nothing when no memo is nearby', async () => {
    await render(<NearbyMemos items={[]} onPressMemo={jest.fn()} />);

    expect(screen.queryByTestId('nearby-memos')).toBeNull();
  });
});
