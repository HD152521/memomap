import { fireEvent, render, screen } from '@testing-library/react-native';

import { PhotoCarousel } from '../PhotoCarousel';
import type { MemoPhoto } from '../types';

jest.mock('expo-image', () => ({ Image: () => null }));

const photo = (id: string, url: string | null): MemoPhoto => ({ id, memoId: 'm1', path: `u1/m1/${id}.jpg`, position: 0, width: 1, height: 1, url });

describe('PhotoCarousel', () => {
  test('renders nothing without signed urls', async () => {
    await render(<PhotoCarousel photos={[photo('p1', null)]} />);

    expect(screen.queryByTestId('carousel-photo-p1')).toBeNull();
  });

  test('shows a counter per photo and opens fullscreen on tap', async () => {
    await render(<PhotoCarousel photos={[photo('p1', 'https://a'), photo('p2', 'https://b')]} />);

    expect(screen.getByText('1/2')).toBeTruthy();
    expect(screen.getByText('2/2')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('carousel-photo-p2'));

    expect(screen.getByLabelText('닫기')).toBeTruthy();
  });
});
