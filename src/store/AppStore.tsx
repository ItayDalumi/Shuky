/**
 * App state. Two modes:
 *  - live: Supabase is configured in .env. Auth, profile, feed and new listings hit the server.
 *  - demo: no Supabase config. Everything runs on the mock data, in memory.
 *
 * Saved items, notifications and notification preferences are still in memory in both modes
 * (Phase 3 moves them to the server).
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react';

import { currentUser as demoUser, initialListings, initialNotifications, sellers as demoSellers } from '@/data/mock';
import type { AppNotification, CurrentUser, Listing, NotificationPrefs, Seller } from '@/data/types';
import * as api from '@/lib/api';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';

export type Mode = 'live' | 'demo';
/** loading -> signedOut | needsProfile (signed in, no name yet) | ready */
export type AuthStatus = 'loading' | 'signedOut' | 'needsProfile' | 'ready';

export type NewListingInput = api.CreateListingInput & {
  /** Local preview URI (used directly in demo mode) */
  localPhotoUri?: string;
};

type AppStore = {
  mode: Mode;
  authStatus: AuthStatus;
  user: CurrentUser;

  // Auth & profile
  sendOtp: (phone: string) => Promise<void>;
  /** Returns what comes next: the name screen for new users, or the app. */
  verifyOtp: (phone: string, code: string) => Promise<'needsProfile' | 'ready'>;
  createProfile: (name: string) => Promise<void>;
  saveLocation: (lat: number, lng: number) => Promise<void>;
  updateUser: (patch: Partial<Pick<CurrentUser, 'name'>>) => Promise<void>;
  signOut: () => Promise<void>;
  deleteAccount: () => Promise<void>;

  // Listings
  feed: Listing[];
  myListings: Listing[];
  feedLoading: boolean;
  feedError: string | null;
  refreshFeed: () => Promise<void>;
  getListing: (id: string) => Listing | undefined;
  getSeller: (id: string) => Seller | undefined;
  /** Returns the new listing id */
  addListing: (input: NewListingInput) => Promise<string>;

  // Saved (in memory)
  savedListings: Listing[];
  isSaved: (id: string) => boolean;
  toggleSaved: (id: string) => void;

  // Notifications (in memory)
  notifications: AppNotification[];
  unreadCount: number;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  notificationPrefs: NotificationPrefs;
  setNotificationPref: (key: keyof NotificationPrefs, value: boolean) => void;
};

const EMPTY_USER: CurrentUser = {
  id: '',
  name: '',
  community: 'להבים',
  phone: '',
  xp: 0,
  trades: 0,
  rating: null,
};

const AppStoreContext = createContext<AppStore | null>(null);

export function AppStoreProvider({ children }: PropsWithChildren) {
  const mode: Mode = isSupabaseConfigured ? 'live' : 'demo';
  const live = mode === 'live';

  const [authStatus, setAuthStatus] = useState<AuthStatus>(live ? 'loading' : 'ready');
  const [user, setUser] = useState<CurrentUser>(live ? EMPTY_USER : demoUser);

  const [listings, setListings] = useState<Listing[]>(live ? [] : initialListings);
  const [sellers, setSellers] = useState<Seller[]>(live ? [] : demoSellers);
  const [feedLoading, setFeedLoading] = useState(false);
  const [feedError, setFeedError] = useState<string | null>(null);

  const [savedIds, setSavedIds] = useState<string[]>(live ? [] : ['l2']);
  const [notifications, setNotifications] = useState<AppNotification[]>(live ? [] : initialNotifications);
  const [notificationPrefs, setNotificationPrefs] = useState<NotificationPrefs>({
    newListings: true,
    orders: true,
    ratings: true,
  });

  const refreshFeed = useCallback(async () => {
    if (!live) return;
    setFeedLoading(true);
    setFeedError(null);
    try {
      const result = await api.fetchFeed();
      setListings(result.listings);
      setSellers(result.sellers);
    } catch (e) {
      setFeedError(api.errorMessage(e));
    } finally {
      setFeedLoading(false);
    }
  }, [live]);

  const loadProfile = useCallback(
    async (userId: string): Promise<'needsProfile' | 'ready'> => {
      const profile = await api.fetchMyProfile(userId);
      if (!profile) {
        setUser({ ...EMPTY_USER, id: userId });
        setAuthStatus('needsProfile');
        return 'needsProfile';
      }
      setUser(profile);
      setAuthStatus('ready');
      refreshFeed();
      return 'ready';
    },
    [refreshFeed],
  );

  const applySession = useCallback(
    (userId: string | null) => {
      if (userId === null) {
        setUser(EMPTY_USER);
        setListings([]);
        setSellers([]);
        setSavedIds([]);
        setAuthStatus('signedOut');
        return;
      }
      loadProfile(userId).catch(() => setAuthStatus('signedOut'));
    },
    [loadProfile],
  );

  // Live: restore the saved session on launch, and react when it ends (sign out, expiry).
  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => applySession(data.session?.user.id ?? null));
    const { data } = supabase.auth.onAuthStateChange((event) => {
      // Sign-in is handled by verifyOtp(). Defer: Supabase calls made inside this callback can deadlock.
      if (event === 'SIGNED_OUT') setTimeout(() => applySession(null), 0);
    });
    return () => data.subscription.unsubscribe();
  }, [applySession]);

  // ---------------------------------------------------------------------------
  // Auth & profile actions
  // ---------------------------------------------------------------------------
  const sendOtp = useCallback(
    async (phone: string) => {
      if (live) await api.sendOtp(phone);
    },
    [live],
  );

  const verifyOtp = useCallback(
    async (phone: string, code: string) => {
      if (!live) return 'needsProfile' as const; // demo: walk through name + location
      await api.verifyOtp(phone, code);
      const { data } = await supabase!.auth.getUser();
      if (!data.user) throw new Error('no user after verification');
      return loadProfile(data.user.id);
    },
    [live, loadProfile],
  );

  const createProfile = useCallback(
    async (name: string) => {
      const trimmed = name.trim();
      if (!live) {
        setUser((u) => ({ ...u, name: trimmed }));
        return;
      }
      await api.createMyProfile(user.id, trimmed);
      await loadProfile(user.id);
    },
    [live, user.id, loadProfile],
  );

  const saveLocation = useCallback(
    async (lat: number, lng: number) => {
      if (!live) return;
      await api.setMyLocation(lat, lng);
      await refreshFeed();
    },
    [live, refreshFeed],
  );

  const updateUser = useCallback(
    async (patch: Partial<Pick<CurrentUser, 'name'>>) => {
      if (live && patch.name) await api.updateMyName(user.id, patch.name);
      setUser((prev) => ({ ...prev, ...patch }));
      if (patch.name) {
        setSellers((prev) => prev.map((s) => (s.id === user.id ? { ...s, name: patch.name! } : s)));
      }
    },
    [live, user.id],
  );

  const signOut = useCallback(async () => {
    if (live) await api.signOut();
  }, [live]);

  const deleteAccount = useCallback(async () => {
    if (live) await api.deleteMyAccount(user.id);
  }, [live, user.id]);

  // ---------------------------------------------------------------------------
  // Listings
  // ---------------------------------------------------------------------------
  const getListing = useCallback((id: string) => listings.find((l) => l.id === id), [listings]);

  const getSeller = useCallback(
    (id: string): Seller | undefined => {
      const seller = sellers.find((s) => s.id === id);
      if (id !== user.id) return seller;
      // The current user's seller card follows their profile (e.g. a name edited in settings).
      return {
        id: user.id,
        name: user.name,
        distanceMeters: 0,
        level: seller?.level ?? 1,
        trades: user.trades,
        rating: user.rating,
        whatsapp: user.phone,
      };
    },
    [sellers, user],
  );

  const addListing = useCallback(
    async (input: NewListingInput) => {
      if (live) {
        const id = await api.createListing(user.id, input);
        await refreshFeed();
        return id;
      }
      const { photo: _photo, localPhotoUri, ...rest } = input;
      const listing: Listing = {
        ...rest,
        id: `local-${Date.now()}`,
        sellerId: user.id,
        photoUri: localPhotoUri,
        createdAt: new Date().toISOString(),
      };
      setListings((prev) => [listing, ...prev]);
      return listing.id;
    },
    [live, user.id, refreshFeed],
  );

  // ---------------------------------------------------------------------------
  // Saved & notifications (in memory)
  // ---------------------------------------------------------------------------
  const isSaved = useCallback((id: string) => savedIds.includes(id), [savedIds]);
  const toggleSaved = useCallback((id: string) => {
    setSavedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [id, ...prev]));
  }, []);

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
      mode,
      authStatus,
      user,
      sendOtp,
      verifyOtp,
      createProfile,
      saveLocation,
      updateUser,
      signOut,
      deleteAccount,
      feed: byNewest.filter((l) => l.sellerId !== user.id),
      myListings: byNewest.filter((l) => l.sellerId === user.id),
      feedLoading,
      feedError,
      refreshFeed,
      getListing,
      getSeller,
      addListing,
      savedListings: savedIds.map((id) => listings.find((l) => l.id === id)).filter((l): l is Listing => !!l),
      isSaved,
      toggleSaved,
      notifications,
      unreadCount: notifications.filter((n) => !n.read).length,
      markNotificationRead,
      markAllNotificationsRead,
      notificationPrefs,
      setNotificationPref,
    };
  }, [
    mode,
    authStatus,
    user,
    sendOtp,
    verifyOtp,
    createProfile,
    saveLocation,
    updateUser,
    signOut,
    deleteAccount,
    listings,
    feedLoading,
    feedError,
    refreshFeed,
    getListing,
    getSeller,
    addListing,
    savedIds,
    isSaved,
    toggleSaved,
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
