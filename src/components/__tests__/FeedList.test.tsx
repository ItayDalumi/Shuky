import type { ReactNode } from 'react';
import { render, screen } from '@testing-library/react-native';

import { initialListings } from '@/data/mock';
import type { Listing } from '@/data/types';
import { AppStoreProvider } from '@/store/AppStore';
import { FeedList } from '../FeedList';

jest.mock('expo-router', () => ({ router: { push: jest.fn(), navigate: jest.fn() } }));
jest.mock('@/lib/push', () => ({ showLocalNotification: jest.fn(() => Promise.resolve()) }));

const wrap = (ui: ReactNode) => <AppStoreProvider>{ui}</AppStoreProvider>;

/** A big neighborhood: 300 listings. */
const many: Listing[] = Array.from({ length: 300 }, (_, i) => ({
  ...initialListings[i % initialListings.length],
  id: `big-${i}`,
  title: `מאפה מספר ${i}`,
}));

describe('FeedList', () => {
  it('shows section titles, notes and cards', async () => {
    await render(
      wrap(
        <FeedList
          sections={[
            { key: 'ready', title: 'טרי מהתנור', listings: initialListings.slice(0, 3) },
            { key: 'pre', title: 'להזמנה מראש', note: 'מזמינים מראש', listings: initialListings.slice(3, 4) },
            { key: 'none', title: 'ריק', listings: [] },
          ]}
        />,
      ),
    );
    expect(screen.getByText('טרי מהתנור')).toBeOnTheScreen();
    expect(screen.getByText('להזמנה מראש')).toBeOnTheScreen();
    expect(screen.getByText('מזמינים מראש')).toBeOnTheScreen();
    expect(screen.queryByText('ריק')).toBeNull(); // empty sections are skipped
    expect(screen.getByText(initialListings[0].title)).toBeOnTheScreen();
  });

  it('renders only the first screens of a 300-listing feed', async () => {
    await render(wrap(<FeedList sections={[{ key: 'all', listings: many }]} />));
    const cards = screen.getAllByText(/^מאפה מספר \d+$/);
    expect(cards.length).toBeGreaterThan(0);
    expect(cards.length).toBeLessThan(60);
  });

  it('shows the empty state when there is nothing to list', async () => {
    const { Text } = jest.requireActual('react-native');
    await render(wrap(<FeedList sections={[{ key: 'x', listings: [] }]} empty={<Text>אין כלום</Text>} />));
    expect(screen.getByText('אין כלום')).toBeOnTheScreen();
  });
});
