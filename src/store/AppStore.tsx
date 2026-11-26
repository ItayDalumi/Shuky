/**
 * App state. Two modes:
 *  - live: Supabase is configured in .env. Everything goes through src/lib/api.ts.
 *  - demo: no Supabase config. Everything runs on the mock data, in memory.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
} from 'react';
import { AppState } from 'react-native';

import {
  currentUser as demoUser,
  initialListings,
  initialNotifications,
  initialTrades,
  sellers as demoSellers,
} from '@/data/mock';
import type {
  AppNotification,
  BlockedUser,
  CurrentUser,
  Listing,
  NotificationPrefs,
  ReportReason,
  Seller,
  Trade,
} from '@/data/types';
import * as api from '@/lib/api';
import { getLevelInfo, XP_PER_TRADE } from '@/lib/levels';
import { isNetworkError } from '@/lib/net';
import { getRegisteredToken, setRegisteredToken, showLocalNotification } from '@/lib/push';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';

export type Mode = 'live' | 'demo';
/** loading -> signedOut | needsProfile (signed in, no name yet) | ready */
/** 'offline': a saved session exists but the server couldn't be reached at launch. */
export type AuthStatus = 'loading' | 'signedOut' | 'needsProfile' | 'ready' | 'offline';

export type NewListingInput = api.CreateListingInput & {
  /** Local preview URI (used directly in demo mode) */
  localPhotoUri?: string;
};

type AppStore = {
  mode: Mode;
  authStatus: AuthStatus;
  user: CurrentUser;

  // Auth & profile
  /** After 'offline': try to reach the server again */
  retryConnection: () => void;
  /** Emails a one-time code (captchaToken when Turnstile is enabled) */
  sendOtp: (email: string, captchaToken?: string) => Promise<void>;
  /** Returns what comes next: the name screen for new users, or the app. */
  verifyOtp: (email: string, code: string) => Promise<'needsProfile' | 'ready'>;
  /** phone: the WhatsApp number neighbors use to order */
  createProfile: (name: string, phone: string) => Promise<void>;
  saveLocation: (lat: number, lng: number) => Promise<void>;
  updateUser: (patch: Partial<Pick<CurrentUser, 'name' | 'phone'>>) => Promise<void>;
  signOut: () => Promise<void>;
  deleteAccount: () => Promise<void>;
  /** Everything we hold about the user, as a plain object (right of access) */
  exportMyData: () => Promise<unknown>;

  // Listings
  feed: Listing[];
  myListings: Listing[];
  feedLoading: boolean;
  feedError: string | null;
  /** Feed, trades and notifications */
  refreshAll: () => Promise<void>;
  getListing: (id: string) => Listing | undefined;
  getSeller: (id: string) => Seller | undefined;
  /** Returns the new listing id */
  addListing: (input: NewListingInput) => Promise<string>;
  updateListing: (id: string, input: NewListingInput) => Promise<void>;
  deleteListing: (id: string) => Promise<void>;

  // Trades & ratings
  trades: Trade[];
  /** Trades waiting for the current user's confirmation */
  pendingForMe: number;
  getTrade: (id: string) => Trade | undefined;
  /** The open trade (not completed) on this listing, if the user is in it */
  openTradeFor: (listingId: string) => Trade | undefined;
  refreshTrades: () => Promise<void>;
  /** Buyer: "I bought this". Returns the trade id. */
  markBought: (listingId: string) => Promise<string>;
  confirmTrade: (tradeId: string) => Promise<void>;
  declineTrade: (tradeId: string) => Promise<void>;
  rateTrade: (tradeId: string, stars: number, comment: string) => Promise<void>;

  // Contact, reports & blocks
  /** The seller's WhatsApp number for this listing (live: fetched on demand, rate limited) */
  getWhatsapp: (listingId: string) => Promise<string>;
  reportListing: (listingId: string, reason: ReportReason) => Promise<void>;
  blockedUsers: BlockedUser[];
  refreshBlocks: () => Promise<void>;
  blockUser: (userId: string) => Promise<void>;
  unblockUser: (userId: string) => Promise<void>;

  // Saved
  savedListings: Listing[];
  isSaved: (id: string) => boolean;
  toggleSaved: (id: string) => void;

  // Notifications
  notifications: AppNotification[];
  unreadCount: number;
  refreshNotifications: () => Promise<void>;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  notificationPrefs: NotificationPrefs;
  setNotificationPref: (key: keyof NotificationPrefs, value: boolean) => void;
};

const EMPTY_USER: CurrentUser = {
  id: '',
  name: '',
  community: 'להבים',
  email: '',
  phone: '',
  xp: 0,
  trades: 0,
  rating: null,
};

const DEFAULT_PREFS: NotificationPrefs = { newListings: true, orders: true, ratings: true };

/** Demo: how long the "other side" takes to confirm a trade you marked. */
const DEMO_CONFIRM_DELAY_MS = 3000;

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

  const [trades, setTrades] = useState<Trade[]>(live ? [] : initialTrades);
  const [savedIds, setSavedIds] = useState<string[]>(live ? [] : ['l2']);
  const [notifications, setNotifications] = useState<AppNotification[]>(live ? [] : initialNotifications);
  const [notificationPrefs, setNotificationPrefs] = useState<NotificationPrefs>(DEFAULT_PREFS);
  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);

  // Latest user / trades, for async callbacks (demo timers, reloads).
  const userRef = useRef(user);
  const tradesRef = useRef(trades);
  /** The saved session we couldn't load at launch because the server was unreachable */
  const offlineSessionRef = useRef<{ id: string; email: string } | null>(null);
  useEffect(() => {
    userRef.current = user;
    tradesRef.current = trades;
  }, [user, trades]);

  // ---------------------------------------------------------------------------
  // Loading (live)
  // ---------------------------------------------------------------------------
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

  const refreshTrades = useCallback(async () => {
    if (live) setTrades(await api.fetchTrades());
  }, [live]);

  const refreshNotifications = useCallback(async () => {
    if (live) setNotifications(await api.fetchNotifications());
  }, [live]);

  const loadProfile = useCallback(
    async (userId: string, email: string): Promise<'needsProfile' | 'ready'> => {
      const result = await api.fetchMyProfile(userId, email);
      if (!result) {
        setUser({ ...EMPTY_USER, id: userId, email });
        setAuthStatus('needsProfile');
        return 'needsProfile';
      }
      setUser(result.user);
      setNotificationPrefs(result.prefs);
      setAuthStatus('ready');
      // Everything else loads in the background.
      refreshFeed();
      api.fetchTrades().then(setTrades).catch(() => {});
      api.fetchSavedIds().then(setSavedIds).catch(() => {});
      api.fetchNotifications().then(setNotifications).catch(() => {});
      api.fetchBlocks().then(setBlockedUsers).catch(() => {});
      return 'ready';
    },
    [refreshFeed],
  );

  /** Re-reads XP / trades / rating after a trade or rating changes them. */
  const reloadProfileStats = useCallback(async () => {
    if (!live) return;
    const result = await api.fetchMyProfile(userRef.current.id, userRef.current.email);
    if (result) setUser(result.user);
  }, [live]);

  const refreshAll = useCallback(async () => {
    if (!live) return;
    await Promise.all([refreshFeed(), refreshTrades().catch(() => {}), refreshNotifications().catch(() => {})]);
  }, [live, refreshFeed, refreshTrades, refreshNotifications]);

  const applySession = useCallback(
    (session: { id: string; email: string } | null) => {
      if (session === null) {
        setUser(EMPTY_USER);
        setListings([]);
        setSellers([]);
        setTrades([]);
        setSavedIds([]);
        setNotifications([]);
        setNotificationPrefs(DEFAULT_PREFS);
        setBlockedUsers([]);
        setAuthStatus('signedOut');
        return;
      }
      loadProfile(session.id, session.email).catch((e) => {
        // No connection is not the same as signed out: keep the session and offer a retry.
        if (isNetworkError(e)) {
          offlineSessionRef.current = session;
          setAuthStatus('offline');
        } else {
          setAuthStatus('signedOut');
        }
      });
    },
    [loadProfile],
  );

  const retryConnection = useCallback(() => {
    const session = offlineSessionRef.current;
    if (!session) return;
    offlineSessionRef.current = null;
    setAuthStatus('loading');
    applySession(session);
  }, [applySession]);

  // Coming back to the app (e.g. after turning Wi-Fi on) retries automatically.
  useEffect(() => {
    if (authStatus !== 'offline') return;
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') retryConnection();
    });
    return () => sub.remove();
  }, [authStatus, retryConnection]);

  // Live: restore the saved session on launch, and react when it ends (sign out, expiry).
  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => {
      const u = data.session?.user;
      applySession(u ? { id: u.id, email: u.email ?? '' } : null);
    });
    const { data } = supabase.auth.onAuthStateChange((event) => {
      // Sign-in is handled by verifyOtp(). Defer: Supabase calls made inside this callback can deadlock.
      if (event === 'SIGNED_OUT') setTimeout(() => applySession(null), 0);
    });
    return () => data.subscription.unsubscribe();
  }, [applySession]);

  // ---------------------------------------------------------------------------
  // Auth & profile
  // ---------------------------------------------------------------------------
  const sendOtp = useCallback(
    async (email: string, captchaToken?: string) => {
      if (live) await api.sendOtp(email, captchaToken);
    },
    [live],
  );

  const verifyOtp = useCallback(
    async (email: string, code: string) => {
      if (!live) {
        setUser((u) => ({ ...u, email: email.trim().toLowerCase() }));
        return 'needsProfile' as const; // demo: walk through name + location
      }
      await api.verifyOtp(email, code);
      const { data } = await supabase!.auth.getUser();
      if (!data.user) throw new Error('no user after verification');
      return loadProfile(data.user.id, data.user.email ?? email);
    },
    [live, loadProfile],
  );

  const createProfile = useCallback(
    async (name: string, phone: string) => {
      const trimmed = name.trim();
      if (!live) {
        setUser((u) => ({ ...u, name: trimmed, phone }));
        return;
      }
      await api.createMyProfile(user.id, trimmed, phone);
      await loadProfile(user.id, user.email);
    },
    [live, user.id, user.email, loadProfile],
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
    async (patch: Partial<Pick<CurrentUser, 'name' | 'phone'>>) => {
      if (live && (patch.name || patch.phone)) await api.updateMyProfile(user.id, patch);
      setUser((prev) => ({ ...prev, ...patch }));
      if (patch.name) {
        setSellers((prev) => prev.map((s) => (s.id === user.id ? { ...s, name: patch.name! } : s)));
      }
    },
    [live, user.id],
  );

  const signOut = useCallback(async () => {
    if (!live) return;
    const token = getRegisteredToken();
    if (token) {
      await api.removePushToken(token).catch(() => {});
      setRegisteredToken(null);
    }
    await api.signOut();
  }, [live]);

  const deleteAccount = useCallback(async () => {
    if (live) await api.deleteMyAccount(user.id);
  }, [live, user.id]);

  const exportMyData = useCallback(async () => {
    if (live) return api.exportMyData();
    // Demo: the same shape, from what's in memory.
    return {
      exported_at: new Date().toISOString(),
      demo: true,
      profile: user,
      listings: listings.filter((l) => l.sellerId === user.id),
      trades,
      saved_listings: savedIds,
      notifications,
      blocked_users: blockedUsers,
    };
  }, [live, user, listings, trades, savedIds, notifications, blockedUsers]);

  // ---------------------------------------------------------------------------
  // Listings
  // ---------------------------------------------------------------------------
  const getListing = useCallback((id: string) => listings.find((l) => l.id === id), [listings]);

  const getSeller = useCallback(
    (id: string): Seller | undefined => {
      const seller = sellers.find((s) => s.id === id);
      if (id !== user.id) return seller;
      // The current user's seller card follows their own profile.
      return {
        id: user.id,
        name: user.name,
        distanceMeters: 0,
        level: getLevelInfo(user.xp).level,
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

  const updateListing = useCallback(
    async (id: string, input: NewListingInput) => {
      const existing = listings.find((l) => l.id === id);
      if (!existing) throw new Error('listing not found');
      if (live) {
        await api.updateListing(user.id, existing, input);
        await refreshFeed();
        return;
      }
      const { photo: _photo, localPhotoUri, ...rest } = input;
      setListings((prev) =>
        prev.map((l) => (l.id === id ? { ...l, ...rest, photoUri: localPhotoUri ?? l.photoUri } : l)),
      );
    },
    [live, user.id, listings, refreshFeed],
  );

  const deleteListing = useCallback(
    async (id: string) => {
      const existing = listings.find((l) => l.id === id);
      if (!existing) return;
      if (live) await api.deleteListing(existing);
      setListings((prev) => prev.filter((l) => l.id !== id));
      setSavedIds((prev) => prev.filter((x) => x !== id));
    },
    [live, listings],
  );

  // ---------------------------------------------------------------------------
  // Trades & ratings
  // ---------------------------------------------------------------------------
  const getTrade = useCallback((id: string) => trades.find((t) => t.id === id), [trades]);
  const openTradeFor = useCallback(
    (listingId: string) => trades.find((t) => t.listingId === listingId && !t.completedAt),
    [trades],
  );

  /** Demo: complete a trade locally (+XP, notification), mirroring confirm_trade(). */
  const demoComplete = useCallback((tradeId: string) => {
    const trade = tradesRef.current.find((t) => t.id === tradeId);
    if (!trade || trade.completedAt) return;
    const completedAt = new Date().toISOString();
    setTrades((prev) =>
      prev.map((t) =>
        t.id === tradeId ? { ...t, iConfirmed: true, otherConfirmed: true, completedAt, xpAwarded: true } : t,
      ),
    );
    setUser((u) => ({ ...u, xp: u.xp + XP_PER_TRADE, trades: u.trades + 1 }));
    // Demo: show it on the phone like a real push would.
    showLocalNotification(`העסקה הושלמה! +${XP_PER_TRADE} נקודות`, trade.listingTitle, `/trade/${tradeId}`).catch(() => {});
    setNotifications((prev) => [
      {
        id: `n-${Date.now()}`,
        kind: 'tradeCompleted',
        title: `העסקה הושלמה! +${XP_PER_TRADE} נקודות`,
        body: trade.listingTitle,
        createdAt: new Date().toISOString(),
        read: false,
        href: `/trade/${tradeId}`,
      },
      ...prev,
    ]);
  }, []);

  const markBought = useCallback(
    async (listingId: string) => {
      if (live) {
        const id = await api.markBought(listingId);
        await refreshTrades();
        return id;
      }
      const listing = listings.find((l) => l.id === listingId);
      const seller = listing ? sellers.find((s) => s.id === listing.sellerId) : undefined;
      const trade: Trade = {
        id: `t-${Date.now()}`,
        listingId,
        listingTitle: listing?.title ?? '',
        listingCategory: listing?.category,
        role: 'buyer',
        otherId: seller?.id ?? '',
        otherName: seller?.name ?? '',
        iConfirmed: true,
        otherConfirmed: false,
        createdAt: new Date().toISOString(),
        iRated: false,
        xpAwarded: false,
        canRate: true,
      };
      setTrades((prev) => [trade, ...prev]);
      // Demo: the seller confirms a few seconds later.
      setTimeout(() => demoComplete(trade.id), DEMO_CONFIRM_DELAY_MS);
      return trade.id;
    },
    [live, listings, sellers, refreshTrades, demoComplete],
  );

  const confirmTrade = useCallback(
    async (tradeId: string) => {
      if (live) {
        await api.confirmTrade(tradeId);
        await Promise.all([refreshTrades(), reloadProfileStats(), refreshNotifications()]);
        return;
      }
      const trade = trades.find((t) => t.id === tradeId);
      if (!trade) return;
      if (trade.otherConfirmed) demoComplete(tradeId);
      else setTrades((prev) => prev.map((t) => (t.id === tradeId ? { ...t, iConfirmed: true } : t)));
    },
    [live, trades, refreshTrades, reloadProfileStats, refreshNotifications, demoComplete],
  );

  const declineTrade = useCallback(
    async (tradeId: string) => {
      if (live) {
        await api.declineTrade(tradeId);
        await Promise.all([refreshTrades(), refreshNotifications()]);
        return;
      }
      setTrades((prev) => prev.filter((t) => t.id !== tradeId));
      setNotifications((prev) => prev.filter((n) => n.href !== `/trade/${tradeId}`));
    },
    [live, refreshTrades, refreshNotifications],
  );

  const rateTrade = useCallback(
    async (tradeId: string, stars: number, comment: string) => {
      const trade = trades.find((t) => t.id === tradeId);
      if (!trade) return;
      if (live) await api.rateTrade(tradeId, trade.otherId, stars, comment);
      setTrades((prev) => prev.map((t) => (t.id === tradeId ? { ...t, iRated: true } : t)));
    },
    [live, trades],
  );

  // ---------------------------------------------------------------------------
  // Contact, reports & blocks
  // ---------------------------------------------------------------------------
  const getWhatsapp = useCallback(
    async (listingId: string) => {
      if (live) return api.getSellerWhatsapp(listingId);
      const listing = listings.find((l) => l.id === listingId);
      return sellers.find((s) => s.id === listing?.sellerId)?.whatsapp ?? '';
    },
    [live, listings, sellers],
  );

  const reportListing = useCallback(
    async (listingId: string, reason: ReportReason) => {
      const listing = listings.find((l) => l.id === listingId);
      if (!listing) return;
      if (live) await api.reportListing(listingId, listing.sellerId, reason);
    },
    [live, listings],
  );

  const refreshBlocks = useCallback(async () => {
    if (live) setBlockedUsers(await api.fetchBlocks());
  }, [live]);

  const blockUser = useCallback(
    async (userId: string) => {
      if (live) await api.blockUser(userId);
      const name = sellers.find((s) => s.id === userId)?.name ?? '';
      setBlockedUsers((prev) => (prev.some((b) => b.id === userId) ? prev : [{ id: userId, name }, ...prev]));
      if (live) await refreshFeed();
    },
    [live, sellers, refreshFeed],
  );

  const unblockUser = useCallback(
    async (userId: string) => {
      if (live) await api.unblockUser(user.id, userId);
      setBlockedUsers((prev) => prev.filter((b) => b.id !== userId));
      if (live) await refreshFeed();
    },
    [live, user.id, refreshFeed],
  );

  // ---------------------------------------------------------------------------
  // Saved
  // ---------------------------------------------------------------------------
  const isSaved = useCallback((id: string) => savedIds.includes(id), [savedIds]);
  const toggleSaved = useCallback(
    (id: string) => {
      const saving = !savedIds.includes(id);
      setSavedIds((prev) => (saving ? [id, ...prev] : prev.filter((x) => x !== id)));
      if (live) {
        // Optimistic; roll back if the server says no.
        api.setSaved(user.id, id, saving).catch(() => {
          setSavedIds((prev) => (saving ? prev.filter((x) => x !== id) : [id, ...prev]));
        });
      }
    },
    [live, savedIds, user.id],
  );

  // ---------------------------------------------------------------------------
  // Notifications
  // ---------------------------------------------------------------------------
  const markNotificationRead = useCallback(
    (id: string) => {
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
      if (live) api.markNotificationsRead([id]).catch(() => {});
    },
    [live],
  );
  const markAllNotificationsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    if (live) api.markNotificationsRead().catch(() => {});
  }, [live]);
  const setNotificationPref = useCallback(
    (key: keyof NotificationPrefs, value: boolean) => {
      const next = { ...notificationPrefs, [key]: value };
      setNotificationPrefs(next);
      if (live) api.updateNotificationPrefs(user.id, next).catch(() => setNotificationPrefs(notificationPrefs));
    },
    [live, notificationPrefs, user.id],
  );

  const value = useMemo<AppStore>(() => {
    // Live: the server already hides blocked users; demo: filter here.
    const blockedIds = new Set(blockedUsers.map((b) => b.id));
    const byNewest = [...listings]
      .filter((l) => !blockedIds.has(l.sellerId))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return {
      mode,
      authStatus,
      user,
      retryConnection,
      sendOtp,
      verifyOtp,
      createProfile,
      saveLocation,
      updateUser,
      signOut,
      deleteAccount,
      exportMyData,
      feed: byNewest.filter((l) => l.sellerId !== user.id),
      myListings: byNewest.filter((l) => l.sellerId === user.id),
      feedLoading,
      feedError,
      refreshAll,
      getListing,
      getSeller,
      addListing,
      updateListing,
      deleteListing,
      trades,
      pendingForMe: trades.filter((t) => !t.completedAt && !t.iConfirmed && t.otherConfirmed).length,
      getTrade,
      openTradeFor,
      refreshTrades,
      markBought,
      confirmTrade,
      declineTrade,
      rateTrade,
      getWhatsapp,
      reportListing,
      blockedUsers,
      refreshBlocks,
      blockUser,
      unblockUser,
      savedListings: savedIds
        .map((id) => byNewest.find((l) => l.id === id))
        .filter((l): l is Listing => !!l),
      isSaved,
      toggleSaved,
      notifications,
      unreadCount: notifications.filter((n) => !n.read).length,
      refreshNotifications,
      markNotificationRead,
      markAllNotificationsRead,
      notificationPrefs,
      setNotificationPref,
    };
  }, [
    mode,
    authStatus,
    user,
    retryConnection,
    sendOtp,
    verifyOtp,
    createProfile,
    saveLocation,
    updateUser,
    signOut,
    deleteAccount,
    exportMyData,
    listings,
    feedLoading,
    feedError,
    refreshAll,
    getListing,
    getSeller,
    addListing,
    updateListing,
    deleteListing,
    trades,
    getTrade,
    openTradeFor,
    refreshTrades,
    markBought,
    confirmTrade,
    declineTrade,
    rateTrade,
    savedIds,
    getWhatsapp,
    reportListing,
    blockedUsers,
    refreshBlocks,
    blockUser,
    unblockUser,
    isSaved,
    toggleSaved,
    notifications,
    refreshNotifications,
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
