import { fireEvent, render, screen } from '@testing-library/react-native';
import * as ImagePicker from 'expo-image-picker';

import { PhotoPickerRow } from '../PhotoPickerRow';
import type { MemoPhoto } from '../types';

jest.mock('expo-image', () => ({ Image: () => null }));

const photo = (id: string, position: number): MemoPhoto => ({ id, memoId: 'm1', path: `u1/m1/${id}.jpg`, position, width: 1, height: 1, url: 'https://x' });
const noop = () => undefined;

describe('PhotoPickerRow', () => {
  test('hides the add button when five photos are attached', async () => {
    const existing = [0, 1, 2, 3, 4].map((n) => photo(`p${n}`, n));

    await render(<PhotoPickerRow existing={existing} added={[]} removedIds={new Set()} onAdd={noop} onRemoveExisting={noop} onRemoveAdded={noop} />);

    expect(screen.queryByTestId('photo-add')).toBeNull();
    expect(screen.getByText('5/5')).toBeTruthy();
  });

  test('counts removed photos as free slots', async () => {
    await render(
      <PhotoPickerRow existing={[photo('p0', 0)]} added={[]} removedIds={new Set(['p0'])} onAdd={noop} onRemoveExisting={noop} onRemoveAdded={noop} />,
    );

    expect(screen.getByText('0/5')).toBeTruthy();
    expect(screen.queryByTestId('photo-thumb-p0')).toBeNull();
  });

  test('opens the gallery with the remaining limit and reports picked photos', async () => {
    (ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValue({
      canceled: false,
      assets: [{ uri: 'file:///a.jpg', width: 100, height: 80 }],
    });
    const onAdd = jest.fn();
    await render(<PhotoPickerRow existing={[photo('p0', 0)]} added={[]} removedIds={new Set()} onAdd={onAdd} onRemoveExisting={noop} onRemoveAdded={noop} />);

    await fireEvent.press(screen.getByTestId('photo-add'));

    expect(ImagePicker.launchImageLibraryAsync).toHaveBeenCalledWith(expect.objectContaining({ allowsMultipleSelection: true, selectionLimit: 4 }));
    expect(onAdd).toHaveBeenCalledWith([expect.objectContaining({ uri: 'file:///a.jpg', width: 100, height: 80 })]);
  });

  test('does nothing when the picker is canceled', async () => {
    (ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValue({ canceled: true, assets: null });
    const onAdd = jest.fn();
    await render(<PhotoPickerRow existing={[]} added={[]} removedIds={new Set()} onAdd={onAdd} onRemoveExisting={noop} onRemoveAdded={noop} />);

    await fireEvent.press(screen.getByTestId('photo-add'));

    expect(onAdd).not.toHaveBeenCalled();
  });
});
