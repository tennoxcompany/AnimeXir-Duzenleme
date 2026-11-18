import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  ANIME_CATALOG,
  INITIAL_COMMENTS,
  INITIAL_NOTIFICATIONS,
  INITIAL_PREMIUM_PLANS,
  INITIAL_PROFILES,
  INITIAL_ROOMS,
  INITIAL_TICKER,
} from '../data/animeData';
import {
  AccentColorKey,
  AniListSearchResult,
  Anime,
  AppNotification,
  CommunityProfile,
  DirectMessage,
  EpisodeComment,
  EpisodeMirror,
  LiveTickerItem,
  NavSection,
  PremiumGiveaway,
  PremiumOrder,
  PremiumPlan,
  TopAnimePick,
  WatchPartyRoom,
  WatchProgress,
} from '../types/anime';

interface AuthModalState {
  open: boolean;
  mode: 'login' | 'register';
}

interface RegisterPayload {
  email: string;
  handle: string;
  displayName: string;
  password: string;
  avatarUrl: string;
  bannerUrl: string;
  accentColor: AccentColorKey;
}

interface AppContextValue {
  animes: Anime[];
  activeSection: NavSection;
  setActiveSection: (s: NavSection) => void;
  selectedAnimeId: string;
  selectedEpisodeNum: number;
  openAnimeWatch: (animeId: string, episodeNum?: number) => void;
  selectedProfile: CommunityProfile | null;
  openProfileModal: (profile: CommunityProfile | null) => void;
  authModal: AuthModalState;
  openAuthModal: (mode: 'login' | 'register') => void;
  closeAuthModal: () => void;
  currentUser: CommunityProfile | null;
  loginWithCredentials: (
    identifier: string,
    password: string
  ) => Promise<{ ok: boolean; error?: string }>;
  loginWithGoogle: () => Promise<void>;
  registerAccount: (payload: RegisterPayload) => Promise<{ ok: boolean; error?: string }>;
  logout: () => Promise<void>;
  updateCurrentUserProfile: (updates: Partial<CommunityProfile>) => Promise<void>;
  onboardingOpen: boolean;
  openOnboarding: () => void;
  closeOnboarding: () => void;
  saveOnboardingProgress: (payload: {
    acceptPrivacy?: boolean;
    favoriteGenres?: string[];
    topAnimePicks?: TopAnimePick[];
    onboardingCompleted?: boolean;
  }) => Promise<{ ok: boolean; error?: string }>;
  profiles: CommunityProfile[];
  friendsIds: string[];
  toggleFriend: (profileId: string) => Promise<void>;
  directMessages: DirectMessage[];
  unreadDmCount: number;
  dmDrawerOpen: boolean;
  activeDmPeerId: string | null;
  openDmWith: (peerId?: string | null) => void;
  closeDmDrawer: () => void;
  sendDirectMessage: (peerId: string, text: string) => Promise<boolean>;
  markDmThreadRead: (peerId: string) => Promise<void>;
  toggleProfileLike: (profileId: string) => Promise<void>;
  addProfileComment: (profileId: string, text: string) => Promise<void>;
  watchlistIds: string[];
  favoriteIds: string[];
  toggleWatchlist: (animeId: string) => Promise<void>;
  toggleFavorite: (animeId: string) => Promise<void>;
  userRatings: Record<string, number>;
  rateAnime: (animeId: string, score: number) => Promise<void>;
  reminderIds: string[];
  toggleReminder: (animeId: string, animeTitle?: string) => void;
  watchProgressMap: Record<string, WatchProgress>;
  saveWatchProgress: (
    animeId: string,
    episodeNumber: number,
    currentTime: number,
    duration: number
  ) => void;
  comments: EpisodeComment[];
  addEpisodeComment: (
    animeId: string,
    episodeNumber: number,
    text: string,
    rating?: number
  ) => Promise<void>;
  toggleCommentLike: (commentId: string) => Promise<void>;
  tickerItems: LiveTickerItem[];
  tickerVisible: boolean;
  setTickerVisible: (v: boolean) => void;
  liveViewerCount: number;
  rooms: WatchPartyRoom[];
  activeRoomCode: string | null;
  setActiveRoomCode: (code: string | null) => void;
  createWatchRoom: (
    animeId: string,
    episodeNumber: number,
    name: string
  ) => Promise<WatchPartyRoom | null>;
  sendRoomMessage: (code: string, text: string) => Promise<void>;
  toggleRoomPlayback: (code: string) => Promise<void>;
  notifications: AppNotification[];
  markAllNotificationsRead: () => void;
  premiumPlans: PremiumPlan[];
  giveaway: PremiumGiveaway | null;
  giveawayRemainingSeconds: number;
  premiumOrders: PremiumOrder[];
  joinGiveaway: () => Promise<void>;
  createPremiumOrder: (planId: string, note?: string) => Promise<{ ok: boolean; error?: string }>;
  startAdminGiveaway: (payload: {
    title: string;
    prizeLabel: string;
    durationHours: number;
  }) => Promise<void>;
  drawAdminGiveaway: () => Promise<void>;
  stopAdminGiveaway: () => Promise<void>;
  saveAdminPlans: (plans: PremiumPlan[]) => Promise<{ ok: boolean; error?: string }>;
  resolveAdminOrder: (orderId: string, action: 'approve' | 'reject') => Promise<void>;
  importAniListAnime: (
    item: AniListSearchResult & {
      customTitle?: string;
      customSynopsis?: string;
      logoUrl?: string;
      hasDub?: boolean;
      featured?: boolean;
      firstEpisodeVideoUrl?: string;
      firstEpisodeSubtitleVtt?: string;
    }
  ) => Promise<{ ok: boolean; error?: string; updated?: boolean }>;
  updateAdminAnime: (
    animeId: string,
    updates: Partial<Anime>
  ) => Promise<{ ok: boolean; error?: string }>;
  deleteAdminAnime: (animeId: string) => Promise<void>;
  saveEpisodeSource: (
    animeId: string,
    epNum: number,
    payload: {
      title?: string;
      videoUrl?: string;
      dubVideoUrl?: string;
      subtitleVtt?: string;
      mirrors?: EpisodeMirror[];
    }
  ) => Promise<{ ok: boolean; error?: string }>;
  saveEpisodesBulk: (
    animeId: string,
    items: Array<{
      number: number;
      videoUrl?: string;
      dubVideoUrl?: string;
      mirror?: { label: string; url: string; audio: 'sub' | 'dub' };
      subtitleVtt?: string;
    }>
  ) => Promise<{ ok: boolean; updatedCount?: number; error?: string }>;
  toastMessage: string | null;
  showToast: (msg: string) => void;
}

const AppStateContext = createContext<AppContextValue | null>(null);
const SESSION_KEY = 'animexir_session_token';
const CLIENT_ID_KEY = 'animexir_client_id';

function getOrCreateClientId(): string {
  try {
    const existing = sessionStorage.getItem(CLIENT_ID_KEY);
    if (existing) return existing;
    const created = `c-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    sessionStorage.setItem(CLIENT_ID_KEY, created);
    return created;
  } catch {
    return `c-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }
}

export const AppStateProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [clientId] = useState<string>(() => getOrCreateClientId());
  const [animes, setAnimes] = useState<Anime[]>(ANIME_CATALOG);
  const [activeSection, setActiveSection] = useState<NavSection>('kesfet');
  const [selectedAnimeId, setSelectedAnimeId] = useState<string>('');
  const [selectedEpisodeNum, setSelectedEpisodeNum] = useState<number>(1);
  const [selectedProfile, setSelectedProfile] = useState<CommunityProfile | null>(null);
  const [authModal, setAuthModal] = useState<AuthModalState>({ open: false, mode: 'login' });

  const [profiles, setProfiles] = useState<CommunityProfile[]>(INITIAL_PROFILES);
  const [currentUser, setCurrentUser] = useState<CommunityProfile | null>(null);
  const [sessionToken, setSessionToken] = useState<string>(() => {
    try {
      return localStorage.getItem(SESSION_KEY) ?? '';
    } catch {
      return '';
    }
  });

  const [friendsIds, setFriendsIds] = useState<string[]>([]);
  const [watchlistIds, setWatchlistIds] = useState<string[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [userRatings, setUserRatings] = useState<Record<string, number>>({});
  const [reminderIds, setReminderIds] = useState<string[]>([]);
  const [watchProgressMap, setWatchProgressMap] = useState<Record<string, WatchProgress>>({});
  const [comments, setComments] = useState<EpisodeComment[]>(INITIAL_COMMENTS);
  const [tickerItems, setTickerItems] = useState<LiveTickerItem[]>(INITIAL_TICKER);
  const [tickerVisible, setTickerVisible] = useState(true);
  const [liveViewerCount, setLiveViewerCount] = useState(0);
  const [rooms, setRooms] = useState<WatchPartyRoom[]>(INITIAL_ROOMS);
  const [activeRoomCode, setActiveRoomCode] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<AppNotification[]>(INITIAL_NOTIFICATIONS);
  const [premiumPlans, setPremiumPlans] = useState<PremiumPlan[]>(INITIAL_PREMIUM_PLANS);
  const [giveaway, setGiveaway] = useState<PremiumGiveaway | null>(null);
  const [giveawayRemainingSeconds, setGiveawayRemainingSeconds] = useState(0);
  const [premiumOrders, setPremiumOrders] = useState<PremiumOrder[]>([]);
  const [directMessages, setDirectMessages] = useState<DirectMessage[]>([]);
  const [onboardingOpen, setOnboardingOpen] = useState(false);
  const [dmDrawerOpen, setDmDrawerOpen] = useState(false);
  const [activeDmPeerId, setActiveDmPeerId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const authHeaders = (tokenOverride?: string): Record<string, string> => {
    const t = tokenOverride ?? sessionToken;
    return t
      ? { 'Content-Type': 'application/json', 'x-session-token': t, 'x-client-id': clientId }
      : { 'Content-Type': 'application/json', 'x-client-id': clientId };
  };

  const refreshBootstrap = async (tokenOverride?: string) => {
    try {
      const res = await fetch('/api/bootstrap', {
        headers: authHeaders(tokenOverride),
      });
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data.animes)) setAnimes(data.animes);
      if (Array.isArray(data.profiles)) setProfiles(data.profiles);
      if (Array.isArray(data.comments)) setComments(data.comments);
      if (Array.isArray(data.tickerItems)) setTickerItems(data.tickerItems);
      if (Array.isArray(data.rooms)) setRooms(data.rooms);
      if (typeof data.liveViewerCount === 'number') setLiveViewerCount(data.liveViewerCount);
      if (Array.isArray(data.premiumPlans)) setPremiumPlans(data.premiumPlans);
      setGiveaway(data.giveaway ?? null);
      if (Array.isArray(data.premiumOrders)) setPremiumOrders(data.premiumOrders);
      setCurrentUser(data.currentUser ?? null);
      setWatchlistIds(data.watchlistIds ?? []);
      setFavoriteIds(data.favoriteIds ?? []);
      setWatchProgressMap(data.watchProgressMap ?? {});
      setUserRatings(data.ratings ?? {});
      setFriendsIds(data.friendsIds ?? []);
      setDirectMessages(Array.isArray(data.directMessages) ? data.directMessages : []);
      if (data.currentUser && data.currentUser.onboardingCompleted === false) {
        setOnboardingOpen(true);
      }
    } catch {
      // keep initial state on offline error
    }
  };

  useEffect(() => {
    refreshBootstrap();
  }, []);

  useEffect(() => {
    if (animes.length === 0) {
      if (selectedAnimeId) setSelectedAnimeId('');
      return;
    }
    if (!selectedAnimeId || !animes.some((a) => a.id === selectedAnimeId)) {
      setSelectedAnimeId(animes[0].id);
    }
  }, [animes, selectedAnimeId]);

  useEffect(() => {
    if (!giveaway || !giveaway.active) {
      setGiveawayRemainingSeconds(0);
      return;
    }
    const calc = () =>
      Math.max(0, Math.floor((new Date(giveaway.endsAt).getTime() - Date.now()) / 1000));
    setGiveawayRemainingSeconds(calc());
    const timer = setInterval(() => {
      const next = calc();
      setGiveawayRemainingSeconds(next);
      if (next === 0) {
        refreshBootstrap();
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [giveaway?.id, giveaway?.active, giveaway?.endsAt]);

  useEffect(() => {
    const pingPresence = async () => {
      try {
        const res = await fetch('/api/presence/ping', {
          method: 'POST',
          headers: authHeaders(),
          body: JSON.stringify({ clientId }),
        });
        if (!res.ok) return;
        const data = await res.json();
        if (typeof data.liveViewerCount === 'number') setLiveViewerCount(data.liveViewerCount);
        if (Array.isArray(data.tickerItems)) setTickerItems(data.tickerItems);
        if (Array.isArray(data.comments)) setComments(data.comments);
        if (Array.isArray(data.directMessages)) setDirectMessages(data.directMessages);
      } catch {
        // ignore network hiccup
      }
    };

    pingPresence();
    const presenceInterval = setInterval(pingPresence, 10000);
    const handleLeave = () => {
      try {
        const blob = new Blob([JSON.stringify({ clientId })], { type: 'application/json' });
        navigator.sendBeacon?.('/api/presence/leave', blob);
      } catch {
        // ignore
      }
    };
    window.addEventListener('pagehide', handleLeave);
    return () => {
      clearInterval(presenceInterval);
      window.removeEventListener('pagehide', handleLeave);
    };
  }, [clientId, sessionToken]);

  useEffect(() => {
    if (!dmDrawerOpen || !sessionToken) return;
    const pollDm = async () => {
      try {
        const res = await fetch('/api/presence/ping', {
          method: 'POST',
          headers: authHeaders(),
          body: JSON.stringify({ clientId }),
        });
        if (!res.ok) return;
        const data = await res.json();
        if (Array.isArray(data.directMessages)) {
          setDirectMessages(data.directMessages);
        }
      } catch {
        // ignore
      }
    };
    const interval = setInterval(pollDm, 3500);
    return () => clearInterval(interval);
  }, [dmDrawerOpen, sessionToken, clientId]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 3400);
  };

  const persistToken = (token: string) => {
    setSessionToken(token);
    try {
      if (token) localStorage.setItem(SESSION_KEY, token);
      else localStorage.removeItem(SESSION_KEY);
    } catch {
      // ignore
    }
  };

  const openAnimeWatch = (animeId: string, episodeNum = 1) => {
    setSelectedAnimeId(animeId);
    setSelectedEpisodeNum(episodeNum);
    setActiveSection('izle');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const openProfileModal = (profile: CommunityProfile | null) => {
    setSelectedProfile(profile);
  };

  const openAuthModal = (mode: 'login' | 'register') => {
    setAuthModal({ open: true, mode });
  };

  const closeAuthModal = () => {
    setAuthModal((prev) => ({ ...prev, open: false }));
  };

  const loginWithCredentials = async (identifier: string, password: string) => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        return { ok: false, error: data.error || 'Giriş yapılamadı.' };
      }
      persistToken(data.token);
      await refreshBootstrap(data.token);
      closeAuthModal();
      showToast(`Hoş geldin, ${data.user.displayName}!`);
      return { ok: true };
    } catch {
      return { ok: false, error: 'Sunucuya bağlanılamadı.' };
    }
  };

  const loginWithGoogle = async () => {
    try {
      const res = await fetch('/api/auth/google', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        persistToken(data.token);
        await refreshBootstrap(data.token);
        closeAuthModal();
        showToast(
          data.user.isAdmin
            ? `Hoş geldin Yönetici ${data.user.displayName}!`
            : `Google ile giriş yapıldı: ${data.user.displayName}`
        );
      }
    } catch {
      showToast('Google girişi başarısız.');
    }
  };

  const registerAccount = async (payload: RegisterPayload) => {
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        return { ok: false, error: data.error || 'Kayıt başarısız.' };
      }
      persistToken(data.token);
      await refreshBootstrap(data.token);
      closeAuthModal();
      setOnboardingOpen(true);
      showToast('Hesabın oluşturuldu! Gizlilik onayını tamamlayıp rehberi başlatabilirsin.');
      return { ok: true };
    } catch {
      return { ok: false, error: 'Sunucuya bağlanılamadı.' };
    }
  };

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST', headers: authHeaders() });
    } catch {
      // ignore
    }
    persistToken('');
    setCurrentUser(null);
    setOnboardingOpen(false);
    setDmDrawerOpen(false);
    setDirectMessages([]);
    setFriendsIds([]);
    if (activeSection === 'profil' || activeSection === 'yonetim') {
      setActiveSection('kesfet');
    }
    showToast('Hesabından çıkış yapıldı.');
  };

  const updateCurrentUserProfile = async (updates: Partial<CommunityProfile>) => {
    if (!currentUser) return;
    try {
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify(updates),
      });
      const data = await res.json();
      if (res.ok && data.user) {
        setCurrentUser(data.user);
        setProfiles((prev) => prev.map((p) => (p.id === data.user.id ? data.user : p)));
        if (selectedProfile?.id === data.user.id) setSelectedProfile(data.user);
        showToast('Profil ayarların kaydedildi.');
      }
    } catch {
      showToast('Profil güncellenemedi.');
    }
  };

  const openOnboarding = () => setOnboardingOpen(true);
  const closeOnboarding = () => setOnboardingOpen(false);

  const saveOnboardingProgress: AppContextValue['saveOnboardingProgress'] = async (payload) => {
    if (!currentUser) return { ok: false, error: 'Giriş yapmalısın.' };
    try {
      const res = await fetch('/api/profile/onboarding', {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) return { ok: false, error: data.error || 'Tercihler kaydedilemedi.' };
      if (data.user) {
        setCurrentUser(data.user);
        setProfiles((prev) => prev.map((p) => (p.id === data.user.id ? data.user : p)));
      }
      if (Array.isArray(data.favoriteIds)) {
        setFavoriteIds(data.favoriteIds);
      }
      return { ok: true };
    } catch {
      return { ok: false, error: 'Sunucu hatası.' };
    }
  };

  const toggleFriend = async (profileId: string) => {
    if (!currentUser) {
      openAuthModal('register');
      return;
    }
    try {
      const res = await fetch(`/api/friends/${profileId}/toggle`, {
        method: 'POST',
        headers: authHeaders(),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || 'İşlem başarısız.');
        return;
      }
      setFriendsIds(data.friendsIds ?? []);
      setCurrentUser((prev) =>
        prev ? { ...prev, friendsCount: data.friendsCount ?? prev.friendsCount } : null
      );
      setProfiles((prev) =>
        prev.map((p) =>
          p.id === currentUser.id
            ? { ...p, friendsCount: data.friendsCount ?? p.friendsCount }
            : p
        )
      );
      showToast(data.added ? 'Arkadaş olarak eklendi!' : 'Arkadaşlıktan çıkarıldı.');
    } catch {
      showToast('Sunucuya bağlanılamadı.');
    }
  };

  const unreadDmCount = currentUser
    ? directMessages.filter((m) => m.receiverId === currentUser.id && !m.readByReceiver).length
    : 0;

  const markDmThreadRead = async (peerId: string) => {
    if (!currentUser) return;
    setDirectMessages((prev) =>
      prev.map((m) =>
        m.senderId === peerId && m.receiverId === currentUser.id
          ? { ...m, readByReceiver: true }
          : m
      )
    );
    try {
      await fetch(`/api/dm/${peerId}/read`, {
        method: 'POST',
        headers: authHeaders(),
      });
    } catch {
      // ignore
    }
  };

  const openDmWith = (peerId?: string | null) => {
    if (!currentUser) {
      openAuthModal('login');
      return;
    }
    if (peerId) {
      setActiveDmPeerId(peerId);
      markDmThreadRead(peerId);
    }
    setDmDrawerOpen(true);
  };

  const closeDmDrawer = () => setDmDrawerOpen(false);

  const sendDirectMessage = async (peerId: string, text: string): Promise<boolean> => {
    if (!currentUser) {
      openAuthModal('login');
      return false;
    }
    const clean = text.trim();
    if (!clean) return false;
    try {
      const res = await fetch(`/api/dm/${peerId}`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ text: clean }),
      });
      const data = await res.json();
      if (!res.ok || !data.message) {
        showToast(data.error || 'Mesaj gönderilemedi.');
        return false;
      }
      setDirectMessages((prev) => [...prev, data.message]);
      return true;
    } catch {
      showToast('Sunucuya bağlanılamadı.');
      return false;
    }
  };

  const toggleProfileLike = async (profileId: string) => {
    if (!currentUser) {
      openAuthModal('login');
      return;
    }
    try {
      const res = await fetch(`/api/profile/${profileId}/like`, {
        method: 'POST',
        headers: authHeaders(),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || 'Profil beğenilemedi.');
        return;
      }
      setProfiles((prev) =>
        prev.map((p) =>
          p.id === profileId
            ? { ...p, likesCount: data.likesCount, likedByMe: data.likedByMe }
            : p
        )
      );
      setSelectedProfile((prev) =>
        prev && prev.id === profileId
          ? { ...prev, likesCount: data.likesCount, likedByMe: data.likedByMe }
          : prev
      );
      showToast(data.likedByMe ? 'Profil beğenildi!' : 'Profil beğenisi kaldırıldı.');
    } catch {
      showToast('Sunucuya bağlanılamadı.');
    }
  };

  const addProfileComment = async (profileId: string, text: string) => {
    if (!currentUser) {
      openAuthModal('login');
      return;
    }
    try {
      const res = await fetch(`/api/profile/${profileId}/comments`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ text }),
      });
      const data = await res.json();
      if (res.ok && data.comment) {
        setProfiles((prev) =>
          prev.map((p) =>
            p.id === profileId
              ? { ...p, profileComments: [data.comment, ...p.profileComments] }
              : p
          )
        );
        if (selectedProfile?.id === profileId) {
          setSelectedProfile((prev) =>
            prev ? { ...prev, profileComments: [data.comment, ...prev.profileComments] } : null
          );
        }
        showToast('Profil yorumun paylaşıldı.');
      }
    } catch {
      showToast('Yorum gönderilemedi.');
    }
  };

  const toggleWatchlist = async (animeId: string) => {
    if (!currentUser) {
      openAuthModal('register');
      return;
    }
    try {
      const res = await fetch('/api/watchlist/toggle', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ animeId }),
      });
      const data = await res.json();
      if (res.ok) {
        setWatchlistIds(data.watchlistIds);
        showToast(data.added ? 'İzleme listene eklendi.' : 'Listemden çıkarıldı.');
      }
    } catch {
      // ignore
    }
  };

  const toggleFavorite = async (animeId: string) => {
    if (!currentUser) {
      openAuthModal('register');
      return;
    }
    try {
      const res = await fetch('/api/favorites/toggle', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ animeId }),
      });
      const data = await res.json();
      if (res.ok) {
        setFavoriteIds(data.favoriteIds);
        showToast(data.added ? 'Favorilerine eklendi!' : 'Favorilerden çıkarıldı.');
      }
    } catch {
      // ignore
    }
  };

  const rateAnime = async (animeId: string, score: number) => {
    if (!currentUser) {
      openAuthModal('login');
      return;
    }
    try {
      const res = await fetch('/api/ratings', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ animeId, score }),
      });
      const data = await res.json();
      if (res.ok) {
        setUserRatings(data.ratings);
        showToast(`Puanın kaydedildi: ${score}/10`);
      }
    } catch {
      // ignore
    }
  };

  const toggleReminder = (animeId: string, animeTitle?: string) => {
    setReminderIds((prev) => {
      const exists = prev.includes(animeId);
      showToast(
        exists
          ? 'Hatırlatıcı kaldırıldı.'
          : `${animeTitle ?? 'Anime'} için yeni bölüm hatırlatıcısı kuruldu.`
      );
      return exists ? prev.filter((id) => id !== animeId) : [...prev, animeId];
    });
  };

  const saveWatchProgress = (
    animeId: string,
    episodeNumber: number,
    currentTime: number,
    duration: number
  ) => {
    const entry: WatchProgress = {
      animeId,
      episodeNumber,
      currentTime,
      duration,
      updatedAt: new Date().toISOString(),
    };
    setWatchProgressMap((prev) => ({ ...prev, [animeId]: entry }));
    fetch('/api/progress', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ animeId, episodeNumber, currentTime, duration }),
    }).catch(() => {});
  };

  const addEpisodeComment = async (
    animeId: string,
    episodeNumber: number,
    text: string,
    rating?: number
  ) => {
    if (!currentUser) {
      openAuthModal('login');
      return;
    }
    try {
      const res = await fetch('/api/comments', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ animeId, episodeNumber, text, rating }),
      });
      const data = await res.json();
      if (res.ok && data.comment) {
        setComments((prev) => [data.comment, ...prev]);
        if (data.tickerItem) {
          setTickerItems((prev) => [data.tickerItem, ...prev.slice(0, 11)]);
        }
        showToast('Yorumun yayınlandı.');
      }
    } catch {
      showToast('Yorum gönderilemedi.');
    }
  };

  const toggleCommentLike = async (commentId: string) => {
    try {
      const res = await fetch(`/api/comments/${commentId}/like`, {
        method: 'POST',
        headers: authHeaders(),
      });
      const data = await res.json();
      if (res.ok && data.comment) {
        setComments((prev) => prev.map((c) => (c.id === commentId ? data.comment : c)));
      }
    } catch {
      // ignore
    }
  };

  const createWatchRoom = async (
    animeId: string,
    episodeNumber: number,
    name: string
  ): Promise<WatchPartyRoom | null> => {
    try {
      const res = await fetch('/api/rooms', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ animeId, episodeNumber, name }),
      });
      const data = await res.json();
      if (res.ok && data.room) {
        setRooms((prev) => [data.room, ...prev]);
        setActiveRoomCode(data.room.code);
        setActiveSection('birlikte-izle');
        showToast(`Oda oluşturuldu (${data.room.code})`);
        return data.room;
      }
    } catch {
      // ignore
    }
    return null;
  };

  const sendRoomMessage = async (code: string, text: string) => {
    try {
      const res = await fetch(`/api/rooms/${code}/messages`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ text }),
      });
      const data = await res.json();
      if (res.ok && data.room) {
        setRooms((prev) => prev.map((r) => (r.code === code ? data.room : r)));
      }
    } catch {
      // ignore
    }
  };

  const toggleRoomPlayback = async (code: string) => {
    try {
      const res = await fetch(`/api/rooms/${code}/toggle`, {
        method: 'POST',
        headers: authHeaders(),
      });
      const data = await res.json();
      if (res.ok && data.room) {
        setRooms((prev) => prev.map((r) => (r.code === code ? data.room : r)));
      }
    } catch {
      // ignore
    }
  };

  const markAllNotificationsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const joinGiveaway = async () => {
    if (!currentUser) {
      openAuthModal('register');
      return;
    }
    try {
      const res = await fetch('/api/giveaway/join', {
        method: 'POST',
        headers: authHeaders(),
      });
      const data = await res.json();
      if (res.ok && data.giveaway) {
        setGiveaway(data.giveaway);
        showToast('Çekilişe katıldın! Bol şans!');
      } else {
        showToast(data.error || 'Çekilişe katılınamadı.');
      }
    } catch {
      showToast('Sunucu hatası.');
    }
  };

  const createPremiumOrder: AppContextValue['createPremiumOrder'] = async (planId, note) => {
    if (!currentUser) {
      openAuthModal('login');
      return { ok: false, error: 'Önce giriş yapmalısın.' };
    }
    try {
      const res = await fetch('/api/premium/orders', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ planId, note }),
      });
      const data = await res.json();
      if (!res.ok) return { ok: false, error: data.error || 'Talep oluşturulamadı.' };
      setPremiumOrders((prev) => [data.order, ...prev]);
      showToast(`${data.order.planName} talebin oluşturuldu! Yönetici onayı bekleniyor.`);
      return { ok: true };
    } catch {
      return { ok: false, error: 'Sunucu hatası.' };
    }
  };

  const startAdminGiveaway: AppContextValue['startAdminGiveaway'] = async (payload) => {
    try {
      const res = await fetch('/api/admin/giveaway', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok && data.giveaway) {
        setGiveaway(data.giveaway);
        showToast(`${data.giveaway.durationHours} saatlik çekiliş başlatıldı!`);
      } else {
        showToast(data.error || 'Çekiliş başlatılamadı.');
      }
    } catch {
      showToast('Sunucu hatası.');
    }
  };

  const drawAdminGiveaway = async () => {
    try {
      const res = await fetch('/api/admin/giveaway/draw', {
        method: 'POST',
        headers: authHeaders(),
      });
      const data = await res.json();
      if (res.ok) {
        await refreshBootstrap();
        if (data.noParticipants) {
          showToast('Katılımcı olmadığı için çekiliş sonlandırıldı.');
        } else if (data.giveaway?.winnerName) {
          showToast(`Kazanan seçildi: ${data.giveaway.winnerName}!`);
        }
      }
    } catch {
      showToast('Sunucu hatası.');
    }
  };

  const stopAdminGiveaway = async () => {
    try {
      const res = await fetch('/api/admin/giveaway', {
        method: 'DELETE',
        headers: authHeaders(),
      });
      if (res.ok) {
        setGiveaway(null);
        showToast('Çekiliş kaldırıldı.');
      }
    } catch {
      // ignore
    }
  };

  const saveAdminPlans: AppContextValue['saveAdminPlans'] = async (plans) => {
    try {
      const res = await fetch('/api/admin/plans', {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify({ plans }),
      });
      const data = await res.json();
      if (!res.ok) return { ok: false, error: data.error || 'Paketler kaydedilemedi.' };
      setPremiumPlans(data.plans);
      showToast('Premium dükkan fiyatları güncellendi!');
      return { ok: true };
    } catch {
      return { ok: false, error: 'Sunucu hatası.' };
    }
  };

  const resolveAdminOrder = async (orderId: string, action: 'approve' | 'reject') => {
    try {
      const res = await fetch(`/api/admin/orders/${orderId}/resolve`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ action }),
      });
      if (res.ok) {
        await refreshBootstrap();
        showToast(action === 'approve' ? 'Sipariş onaylandı ve Premium aktif edildi!' : 'Sipariş reddedildi.');
      }
    } catch {
      showToast('Sunucu hatası.');
    }
  };

  // Admin Operations
  const importAniListAnime: AppContextValue['importAniListAnime'] = async (item) => {
    try {
      const res = await fetch('/api/admin/animes/import', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(item),
      });
      const data = await res.json();
      if (!res.ok) {
        return { ok: false, error: data.error || 'Anime eklenemedi.' };
      }
      await refreshBootstrap();
      showToast(
        data.updated
          ? `${data.anime.title} güncellendi!`
          : `${data.anime.title} AniList’ten başarıyla çekildi!`
      );
      return { ok: true, updated: data.updated };
    } catch {
      return { ok: false, error: 'Sunucu hatası.' };
    }
  };

  const updateAdminAnime: AppContextValue['updateAdminAnime'] = async (animeId, updates) => {
    try {
      const res = await fetch(`/api/admin/animes/${animeId}`, {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify(updates),
      });
      const data = await res.json();
      if (!res.ok) return { ok: false, error: data.error };
      setAnimes((prev) => prev.map((a) => (a.id === animeId ? data.anime : a)));
      showToast('Anime bilgileri güncellendi.');
      return { ok: true };
    } catch {
      return { ok: false, error: 'Sunucu hatası.' };
    }
  };

  const deleteAdminAnime = async (animeId: string) => {
    try {
      const res = await fetch(`/api/admin/animes/${animeId}`, {
        method: 'DELETE',
        headers: authHeaders(),
      });
      if (res.ok) {
        setAnimes((prev) => prev.filter((a) => a.id !== animeId));
        showToast('Anime katalogdan kaldırıldı.');
      }
    } catch {
      // ignore
    }
  };

  const saveEpisodeSource: AppContextValue['saveEpisodeSource'] = async (
    animeId,
    epNum,
    payload
  ) => {
    try {
      const res = await fetch(`/api/admin/animes/${animeId}/episodes/${epNum}`, {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) return { ok: false, error: data.error || 'Bölüm kaydedilemedi.' };
      setAnimes((prev) => prev.map((a) => (a.id === animeId ? data.anime : a)));
      showToast(`${epNum}. bölüm kaynağı & Türkçe altyazı kaydedildi.`);
      return { ok: true };
    } catch {
      return { ok: false, error: 'Sunucu hatası.' };
    }
  };

  const saveEpisodesBulk: AppContextValue['saveEpisodesBulk'] = async (animeId, items) => {
    try {
      const res = await fetch(`/api/admin/animes/${animeId}/episodes-bulk`, {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify({ items }),
      });
      const data = await res.json();
      if (!res.ok) return { ok: false, error: data.error || 'Toplu kayıt başarısız.' };
      setAnimes((prev) => prev.map((a) => (a.id === animeId ? data.anime : a)));
      showToast(`${data.updatedCount} bölüm tek seferde güncellendi!`);
      return { ok: true, updatedCount: data.updatedCount };
    } catch {
      return { ok: false, error: 'Sunucu hatası.' };
    }
  };

  return (
    <AppStateContext.Provider
      value={{
        animes,
        activeSection,
        setActiveSection,
        selectedAnimeId,
        selectedEpisodeNum,
        openAnimeWatch,
        selectedProfile,
        openProfileModal,
        authModal,
        openAuthModal,
        closeAuthModal,
        currentUser,
        loginWithCredentials,
        loginWithGoogle,
        registerAccount,
        logout,
        updateCurrentUserProfile,
        onboardingOpen,
        openOnboarding,
        closeOnboarding,
        saveOnboardingProgress,
        profiles,
        friendsIds,
        toggleFriend,
        directMessages,
        unreadDmCount,
        dmDrawerOpen,
        activeDmPeerId,
        openDmWith,
        closeDmDrawer,
        sendDirectMessage,
        markDmThreadRead,
        toggleProfileLike,
        addProfileComment,
        watchlistIds,
        favoriteIds,
        toggleWatchlist,
        toggleFavorite,
        userRatings,
        rateAnime,
        reminderIds,
        toggleReminder,
        watchProgressMap,
        saveWatchProgress,
        comments,
        addEpisodeComment,
        toggleCommentLike,
        tickerItems,
        tickerVisible,
        setTickerVisible,
        liveViewerCount,
        rooms,
        activeRoomCode,
        setActiveRoomCode,
        createWatchRoom,
        sendRoomMessage,
        toggleRoomPlayback,
        notifications,
        markAllNotificationsRead,
        premiumPlans,
        giveaway,
        giveawayRemainingSeconds,
        premiumOrders,
        joinGiveaway,
        createPremiumOrder,
        startAdminGiveaway,
        drawAdminGiveaway,
        stopAdminGiveaway,
        saveAdminPlans,
        resolveAdminOrder,
        importAniListAnime,
        updateAdminAnime,
        deleteAdminAnime,
        saveEpisodeSource,
        saveEpisodesBulk,
        toastMessage,
        showToast,
      }}
    >
      {children}
    </AppStateContext.Provider>
  );
};

export function useAppState() {
  const ctx = useContext(AppStateContext);
  if (!ctx) throw new Error('useAppState must be used within AppStateProvider');
  return ctx;
}
