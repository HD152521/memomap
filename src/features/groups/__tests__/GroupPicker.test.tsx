import { fireEvent, render, screen } from '@testing-library/react-native';

import { GroupPicker } from '../GroupPicker';

const group = { id: 'g1', name: '맛집', emoji: '🍜', color: '#E8553E', sourceShareId: null, memoCount: 0 };

describe('GroupPicker', () => {
  test('guides the user to create groups when there are none', async () => {
    await render(<GroupPicker groups={[]} value={null} onChange={jest.fn()} />);

    expect(screen.getByText(/그룹 관리에서/)).toBeTruthy();
  });

  test('selects a group or ungrouped', async () => {
    const onChange = jest.fn();
    await render(<GroupPicker groups={[group]} value="g1" onChange={onChange} />);

    await fireEvent.press(screen.getByTestId('group-option-none'));

    expect(onChange).toHaveBeenCalledWith(null);
    expect(screen.getByTestId('group-option-g1').props.accessibilityState).toEqual({ selected: true });
  });
});
