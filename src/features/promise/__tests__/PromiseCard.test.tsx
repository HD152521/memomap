import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { Share } from 'react-native';

import { makeMemo } from '@/test/memoFixture';

import { PromiseCard } from '../PromiseCard';
import { promiseRepository } from '../promiseRepository';

jest.mock('@/lib/supabase', () => ({ supabase: {} }));
jest.mock('../promiseRepository', () => ({
  ...jest.requireActual('../promiseRepository'),
  promiseRepository: { createShare: jest.fn(), revokeShare: jest.fn(), view: jest.fn() },
}));

const TOKEN = 'abcdefghijklmnopqrstuvwxyz012345';
const trip = makeMemo({ id: 'm1', title: '강릉 숙소', promiseStart: '2026-11-21', promiseEnd: '2026-11-22' });

function renderCard(now: Date) {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <PromiseCard memo={trip} now={now} />
    </QueryClientProvider>,
  );
}

describe('PromiseCard', () => {
  test('shows the D-day and shares a link message', async () => {
    // Arrange
    (promiseRepository.createShare as jest.Mock).mockResolvedValue(TOKEN);
    const shareSpy = jest.spyOn(Share, 'share').mockResolvedValue({ action: 'sharedAction' });
    await renderCard(new Date('2026-11-18T03:00:00Z'));

    // Act
    await fireEvent.press(screen.getByTestId('promise-share'));

    // Assert
    expect(screen.getByTestId('promise-phase')).toHaveTextContent('D-3');
    await waitFor(() => expect(shareSpy).toHaveBeenCalled());
    expect(shareSpy.mock.calls[0][0]).toMatchObject({ message: expect.stringContaining(`#${TOKEN}`) });
  });

  test('renders nothing for a memo without a promise', async () => {
    const client = new QueryClient();
    await render(
      <QueryClientProvider client={client}>
        <PromiseCard memo={makeMemo()} />
      </QueryClientProvider>,
    );

    expect(screen.queryByTestId('promise-card')).toBeNull();
  });
});
