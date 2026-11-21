/**
 * Tiny in-memory store for Phase 1 so the mock screens feel alive
 * (publishing a listing, saving items, notifications, settings).
 * Phase 2 swaps this for Supabase queries.
 */
import { createContext, useCallback, useContext, useMemo, useState, type PropsWithChildren } from 'react';

import { currentUser, initialListings, initialNotifications, sellers } from '@/data/mock';
import type { AppNotification, CurrentUser, Listing, NotificationPrefs, Seller } from '@/data/types';

export type NewListingInput = Omit<Listing, 'id' | 'createdAt' | 'sellerId'>;

type AppStore = {
  user: CurrentUser;
  updateUser: (patch: Partial<Pick<CurrentUser, 'name'>>) => void;
  /** Listings from neighbors (excludes the current user's) */
  feed: Listing[];
  myListings: Listing[];
  savedListings: Listing[];
  getListing: (id: string) => Listing | undefined;
  getSeller: (id: string) => Seller | undefined;
  isSaved: (id: string) => boolean;
  toggleSaved: (id: string) => void;
  addListing: (input: NewListingInput) => Listing;
  notifications: AppNotification[];
  unreadCount: number;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  notificationPrefs: NotificationPrefs;
  setNotificationPref: (key: keyof NotificationPrefs, value: boolean) => void;
};

const AppStoreContext = createContext<AppStore | null>(null);

export function AppStoreProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<CurrentUser>(currentUser);
  const [listings, setListings] = useState<Listing[]>(initialListings);
  const [savedIds, setSavedIds] = useState<string[]>(['l2']);
  const [notifications, setNotifications] = useState<AppNotification[]>(initialNotifications);
  const [notificationPrefs, setNotificationPrefs] = useState<NotificationPrefs>({
    newListings: true,
    orders: true,
    ratings: true,
  });

  const updateUser = useCallback((patch: Partial<Pick<CurrentUser, 'name'>>) => {
    setUser((prev) => ({ ...prev, ...patch }));
  }, []);

  const getListing = useCallback((id: string) => listings.find((l) => l.id === id), [listings]);
  const getSeller = useCallback(
    (id: string) => {
      const seller = sellers.find((s) => s.id === id);
      // Keep the current user's seller card in sync with a name edited in settings.
      return seller && seller.id === user.id ? { ...seller, name: user.name } : seller;
    },
    [user.id, user.name],
  );
  const isSaved = useCallback((id: string) => savedIds.includes(id), [savedIds]);

  const toggleSaved = useCallback((id: string) => {
    setSavedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [id, ...prev]));
  }, []);

  const addListing = useCallback(
    (input: NewListingInput) => {
      const listing: Listing = {
        ...input,
        id: `local-${Date.now()}`,
        sellerId: user.id,
        createdAt: new Date().toISOString(),
      };
      setListings((prev) => [listing, ...prev]);
      return listing;
    },
    [user.id],
  );

  const markNotificationRead = useCallback((id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  }, []);

  const markAllNotificationsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  const setNotificationPref = useCallback((key: keyof NotificationPrefs, value: boolean) => {
    setNotificationPrefs((prev) => ({ ...prev, [key]: value }));
  }, []);

  const value = useMemo<AppStore>(() => {
    const byNewest = [...listings].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return {
      user,
      updateUser,
      feed: byNewest.filter((l) => l.sellerId !== user.id),
      myListings: byNewest.filter((l) => l.sellerId === user.id),
      savedListings: savedIds.map((id) => listings.find((l) => l.id === id)).filter((l): l is Listing => !!l),
      getListing,
      getSeller,
      isSaved,
      toggleSaved,
      addListing,
      notifications,
      unreadCount: notifications.filter((n) => !n.read).length,
      markNotificationRead,
      markAllNotificationsRead,
      notificationPrefs,
      setNotificationPref,
    };
  }, [
    user,
    updateUser,
    listings,
    savedIds,
    getListing,
    getSeller,
    isSaved,
    toggleSaved,
    addListing,
    notifications,
    markNotificationRead,
    markAllNotificationsRead,
    notificationPrefs,
    setNotificationPref,
  ]);

  return <AppStoreContext.Provider value={value}>{children}</AppStoreContext.Provider>;
}

export function useAppStore(): AppStore {
  const ctx = useContext(AppStoreContext);
  if (!ctx) throw new Error('useAppStore must be used inside <AppStoreProvider>');
  return ctx;
}
