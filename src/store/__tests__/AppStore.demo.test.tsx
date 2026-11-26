import type { ReactNode } from 'react';
import { act, renderHook } from '@testing-library/react-native';

import { XP_PER_TRADE } from '@/lib/levels';
import { AppStoreProvider, useAppStore } from '../AppStore';

jest.mock('@/lib/push', () => ({
  showLocalNotification: jest.fn(() => Promise.resolve()),
}));

const wrapper = ({ children }: { children: ReactNode }) => <AppStoreProvider>{children}</AppStoreProvider>;

async function setup() {
  const hook = await renderHook(() => useAppStore(), { wrapper });
  return { store: () => hook.result.current };
}

describe('AppStore (demo mode)', () => {
  it('runs without a server', async () => {
    const { store } = await setup();
    expect(store().mode).toBe('demo');
    expect(store().feed.length).toBeGreaterThan(0);
    // The feed never includes my own listings, and is newest first.
    expect(store().feed.every((l) => l.sellerId !== store().user.id)).toBe(true);
    const dates = store().feed.map((l) => l.createdAt);
    expect([...dates].sort().reverse()).toEqual(dates);
  });

  it('posts a listing to "my listings"', async () => {
    const { store } = await setup();
    const before = store().myListings.length;
    let id = '';
    await act(async () => {
      id = await store().addListing({
        title: 'עוגת תפוזים',
        category: 'cakes',
        price: 60,
        description: '',
        availability: 'ready',
        bakedAt: new Date().toISOString().slice(0, 10),
        dietary: ['kosher'],
      });
    });
    expect(store().myListings).toHaveLength(before + 1);
    expect(store().getListing(id)?.title).toBe('עוגת תפוזים');
    expect(store().feed.some((l) => l.id === id)).toBe(false);
  });

  it('saves and unsaves', async () => {
    const { store } = await setup();
    const id = store().feed[0].id;
    const wasSaved = store().isSaved(id);
    await act(async () => store().toggleSaved(id));
    expect(store().isSaved(id)).toBe(!wasSaved);
    await act(async () => store().toggleSaved(id));
    expect(store().isSaved(id)).toBe(wasSaved);
  });

  it('awards XP only once the other side confirms', async () => {
    jest.useFakeTimers();
    try {
      const { store } = await setup();
      const xp = store().user.xp;
      const listing = store().feed.find((l) => !store().openTradeFor(l.id))!;
      let tradeId = '';
      await act(async () => {
        tradeId = await store().markBought(listing.id);
      });
      expect(store().getTrade(tradeId)?.iConfirmed).toBe(true);
      expect(store().getTrade(tradeId)?.completedAt).toBeFalsy();
      expect(store().user.xp).toBe(xp);

      await act(async () => {
        jest.runOnlyPendingTimers(); // the demo seller confirms
      });
      expect(store().getTrade(tradeId)?.completedAt).toBeTruthy();
      expect(store().user.xp).toBe(xp + XP_PER_TRADE);

      await act(async () => store().rateTrade(tradeId, 5, 'מעולה'));
      expect(store().getTrade(tradeId)?.iRated).toBe(true);
    } finally {
      jest.useRealTimers();
    }
  });

  it('a declined trade disappears', async () => {
    const { store } = await setup();
    const pending = store().trades.find((t) => !t.completedAt);
    if (!pending) return;
    await act(async () => store().declineTrade(pending.id));
    expect(store().getTrade(pending.id)).toBeUndefined();
  });

  it('blocking a baker hides their listings', async () => {
    const { store } = await setup();
    const sellerId = store().feed[0].sellerId;
    await act(async () => store().blockUser(sellerId));
    expect(store().feed.some((l) => l.sellerId === sellerId)).toBe(false);
    expect(store().blockedUsers.some((b) => b.id === sellerId)).toBe(true);
    await act(async () => store().unblockUser(sellerId));
    expect(store().feed.some((l) => l.sellerId === sellerId)).toBe(true);
  });

  it('notifications can be marked read', async () => {
    const { store } = await setup();
    expect(store().unreadCount).toBeGreaterThan(0);
    await act(async () => store().markAllNotificationsRead());
    expect(store().unreadCount).toBe(0);
  });

});
