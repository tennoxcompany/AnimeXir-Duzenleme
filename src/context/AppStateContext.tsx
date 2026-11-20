

import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  EmailAuthProvider,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  reauthenticateWithCredential,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updatePassword,
  updateProfile,
} from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import {
  ANIME_CATALOG,
  INITIAL_COMMENTS,
  INITIAL_NOTIFICATIONS,
  INITIAL_PREMIUM_PLANS,
  INITIAL_ROOMS,
  INITIAL_TICKER,
  REAL_CHARACTER_AVATARS,
} from '../data/animeData';
import {
  ADMIN_EMAIL,
  OperationType,
  auth,
  db,
  googleProvider,
  handleFirestoreError,
  stripUndefined,
} from '../firebase';
import {
  AccentColorKey,
  AniListSearchResult,
  Anime,
  AppNotification,
  CommunityProfile,
  DirectMessage,
  Episode,
  EpisodeComment,
  EpisodeMirror,
  LiveTickerItem,
  NavSection,
  PremiumGiveaway,
  PremiumOrder,
  PremiumPlan,
  ProfileComment,
  TopAnimePick,
  WatchPartyRoom,
  WatchProgress,
} from '../types/anime';
import { normalizeSubtitleVtt, sanitizeVideoSource } from '../utils/mediaSanitizer';

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

interface StoredLikeDoc {
  id: string;
  targetUserId: string;
  userId: string;
  createdAt: string;
}

interface StoredWallCommentDoc extends ProfileComment {
  targetUserId: string;
  createdAtMs: number;
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
  pendingVerificationEmail: string | null;
  loginWithCredentials: (
    identifier: string,
    password: string
  ) => Promise<{ ok: boolean; error?: string; needsVerification?: boolean }>;
  loginWithGoogle: () => Promise<{ ok: boolean; error?: string }>;
  registerAccount: (
    payload: RegisterPayload
  ) => Promise<{ ok: boolean; error?: string; needsVerification?: boolean }>;
  resendVerificationEmail: () => Promise<{ ok: boolean; error?: string }>;
  refreshEmailVerification: () => Promise<{ ok: boolean; verified: boolean; error?: string }>;
  sendPasswordReset: (email: string) => Promise<{ ok: boolean; error?: string }>;
  changePassword: (
    currentPassword: string,
    newPassword: string
  ) => Promise<{ ok: boolean; error?: string }>;
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
const CLIENT_ID_KEY = 'animexir_client_id';
const GUEST_PROGRESS_KEY = 'animexir_guest_progress_v1';

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

interface ParsedAppRoute {
  section: NavSection;
  animeKey?: string;
  episodeNum?: number;
  roomCode?: string;
}

function parseRouteFromPathname(pathname: string): ParsedAppRoute {
  const clean = pathname.replace(/\/+$/, '') || '/';
  const parts = clean.split('/').filter(Boolean);
  if (parts.length === 0 || parts[0].toLowerCase() === 'kesfet') {
    return { section: 'kesfet' };
  }
  const head = parts[0].toLowerCase();
  if (head === 'takvim') return { section: 'takvim' };
  if (head === 'topluluk') return { section: 'topluluk' };
  if (head === 'premium') return { section: 'premium' };
  if (head === 'profil') return { section: 'profil' };
  if (head === 'yonetim') return { section: 'yonetim' };
  if (head === 'birlikte-izle') {
    return {
      section: 'birlikte-izle',
      roomCode: parts[1] ? decodeURIComponent(parts[1]) : undefined,
    };
  }
  if (head === 'izle') {
    const animeKey = parts[1] ? decodeURIComponent(parts[1]) : undefined;
    const ep = parts[2] ? Math.max(1, parseInt(parts[2], 10) || 1) : 1;
    return { section: 'izle', animeKey, episodeNum: ep };
  }
  return { section: 'kesfet' };
}

export const AppStateProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [clientId] = useState<string>(() => getOrCreateClientId());
  const initialRoute = useMemo(
    () =>
      typeof window !== 'undefined'
        ? parseRouteFromPathname(window.location.pathname)
        : ({ section: 'kesfet' } as ParsedAppRoute),
    []
  );
  const pendingRouteAnimeRef = useRef<string | null>(initialRoute.animeKey ?? null);

  const [authReady, setAuthReady] = useState(false);
  const [fbUid, setFbUid] = useState<string | null>(null);
  const [fbEmail, setFbEmail] = useState<string | null>(null);
  const [fbEmailVerified, setFbEmailVerified] = useState(false);
  const [pendingVerificationEmail, setPendingVerificationEmail] = useState<string | null>(null);

  const [animes, setAnimes] = useState<Anime[]>(ANIME_CATALOG);
  const [catalogLoaded, setCatalogLoaded] = useState(false);
  const [activeSection, setActiveSectionState] = useState<NavSection>(initialRoute.section);
  const [selectedAnimeId, setSelectedAnimeId] = useState<string>('');
  const [selectedEpisodeNum, setSelectedEpisodeNum] = useState<number>(initialRoute.episodeNum ?? 1);
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
  const [authModal, setAuthModal] = useState<AuthModalState>({ open: false, mode: 'login' });

  const [rawProfiles, setRawProfiles] = useState<CommunityProfile[]>([]);
  const [profileLikes, setProfileLikes] = useState<StoredLikeDoc[]>([]);
  const [wallComments, setWallComments] = useState<StoredWallCommentDoc[]>([]);
  const [friendsIds, setFriendsIds] = useState<string[]>([]);
  const [watchlistIds, setWatchlistIds] = useState<string[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [userRatings, setUserRatings] = useState<Record<string, number>>({});
  const [reminderIds, setReminderIds] = useState<string[]>([]);
  const [watchProgressMap, setWatchProgressMap] = useState<Record<string, WatchProgress>>(() => {
    try {
      const saved = localStorage.getItem(GUEST_PROGRESS_KEY);
      return saved ? (JSON.parse(saved) as Record<string, WatchProgress>) : {};
    } catch {
      return {};
    }
  });

  const [rawComments, setRawComments] = useState<Array<EpisodeComment & { likedBy?: string[]; createdAtMs?: number }>>(
    INITIAL_COMMENTS
  );
  const [tickerItems, setTickerItems] = useState<LiveTickerItem[]>(INITIAL_TICKER);
  const [tickerVisible, setTickerVisible] = useState(true);
  const [liveViewerCount, setLiveViewerCount] = useState(1);
  const [rooms, setRooms] = useState<WatchPartyRoom[]>(INITIAL_ROOMS);
  const [activeRoomCode, setActiveRoomCodeState] = useState<string | null>(
    initialRoute.roomCode ?? null
  );
  const [notifications, setNotifications] = useState<AppNotification[]>(INITIAL_NOTIFICATIONS);
  const [firestorePlans, setFirestorePlans] = useState<PremiumPlan[]>([]);
  const [rawGiveaway, setRawGiveaway] = useState<PremiumGiveaway | null>(null);
  const [giveawayRemainingSeconds, setGiveawayRemainingSeconds] = useState(0);
  const [premiumOrders, setPremiumOrders] = useState<PremiumOrder[]>([]);
  const [directMessages, setDirectMessages] = useState<DirectMessage[]>([]);
  const [onboardingOpen, setOnboardingOpen] = useState(false);
  const [dmDrawerOpen, setDmDrawerOpen] = useState(false);
  const [activeDmPeerId, setActiveDmPeerId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 3600);
  };

  // Enrich public profiles with atomic profileLikes + wallComments
  const profiles = useMemo<CommunityProfile[]>(() => {
    return rawProfiles.map((p) => {
      const likesForUser = profileLikes.filter((l) => l.targetUserId === p.id);
      const wallForUser = wallComments
        .filter((w) => w.targetUserId === p.id)
        .sort((a, b) => (b.createdAtMs ?? 0) - (a.createdAtMs ?? 0));
      return {
        ...p,
        likesCount: likesForUser.length,
        likedByMe: fbUid ? likesForUser.some((l) => l.userId === fbUid) : false,
        profileComments: wallForUser,
      };
    });
  }, [rawProfiles, profileLikes, wallComments, fbUid]);

  const currentUser = useMemo<CommunityProfile | null>(() => {
    if (!fbUid) return null;
    const found = profiles.find((p) => p.id === fbUid);
    if (!found) return null;
    return {
      ...found,
      email: fbEmail ?? undefined,
      isAdmin:
        Boolean(found.isAdmin) ||
        (fbEmailVerified && fbEmail?.toLowerCase() === ADMIN_EMAIL),
      isCurrentUser: true,
    };
  }, [profiles, fbUid, fbEmail, fbEmailVerified]);

  const selectedProfile = useMemo<CommunityProfile | null>(() => {
    if (!selectedProfileId) return null;
    return profiles.find((p) => p.id === selectedProfileId) ?? null;
  }, [profiles, selectedProfileId]);

  const comments = useMemo<EpisodeComment[]>(() => {
    return rawComments.map((c) => ({
      ...c,
      likedByMe: fbUid ? (c.likedBy ?? []).includes(fbUid) : false,
    }));
  }, [rawComments, fbUid]);

  const premiumPlans = useMemo<PremiumPlan[]>(() => {
    return firestorePlans.length > 0 ? firestorePlans : INITIAL_PREMIUM_PLANS;
  }, [firestorePlans]);

  const giveaway = useMemo<PremiumGiveaway | null>(() => {
    if (!rawGiveaway) return null;
    return {
      ...rawGiveaway,
      participantNames: (rawGiveaway.participantIds ?? [])
        .map((id) => {
          const u = profiles.find((p) => p.id === id);
          return u ? { id: u.id, displayName: u.displayName, handle: u.handle } : null;
        })
        .filter((x): x is NonNullable<typeof x> => Boolean(x)),
    };
  }, [rawGiveaway, profiles]);

  // 1. Public Firestore Listeners (Catalog, Profiles, Likes, Wall, Comments, Rooms, Plans, Giveaway, Ticker)
  useEffect(() => {
    const unsubs: Array<() => void> = [];

    unsubs.push(
      onSnapshot(
        collection(db, 'animes'),
        (snap) => {
          const list = snap.docs.map((d) => d.data() as Anime);
          setAnimes(list);
          setCatalogLoaded(true);
        },
        (err) => handleFirestoreError(err, OperationType.LIST, 'animes')
      )
    );

    unsubs.push(
      onSnapshot(
        collection(db, 'publicProfiles'),
        (snap) => {
          const list = snap.docs.map((d) => d.data() as CommunityProfile);
          setRawProfiles(list);
        },
        (err) => handleFirestoreError(err, OperationType.LIST, 'publicProfiles')
      )
    );

    unsubs.push(
      onSnapshot(
        collection(db, 'profileLikes'),
        (snap) => {
          const list = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<StoredLikeDoc, 'id'>) }));
          setProfileLikes(list);
        },
        (err) => handleFirestoreError(err, OperationType.LIST, 'profileLikes')
      )
    );

    unsubs.push(
      onSnapshot(
        collection(db, 'wallComments'),
        (snap) => {
          const list = snap.docs.map((d) => d.data() as StoredWallCommentDoc);
          setWallComments(list);
        },
        (err) => handleFirestoreError(err, OperationType.LIST, 'wallComments')
      )
    );

    unsubs.push(
      onSnapshot(
        collection(db, 'comments'),
        (snap) => {
          const list = snap.docs
            .map((d) => d.data() as EpisodeComment & { likedBy?: string[]; createdAtMs?: number })
            .sort((a, b) => (b.createdAtMs ?? 0) - (a.createdAtMs ?? 0));
          setRawComments(list);
        },
        (err) => handleFirestoreError(err, OperationType.LIST, 'comments')
      )
    );

    unsubs.push(
      onSnapshot(
        collection(db, 'rooms'),
        (snap) => {
          const list = snap.docs.map((d) => d.data() as WatchPartyRoom);
          setRooms(list);
        },
        (err) => handleFirestoreError(err, OperationType.LIST, 'rooms')
      )
    );

    unsubs.push(
      onSnapshot(
        collection(db, 'premiumPlans'),
        (snap) => {
          const list = snap.docs.map((d) => d.data() as PremiumPlan);
          setFirestorePlans(list);
        },
        (err) => handleFirestoreError(err, OperationType.LIST, 'premiumPlans')
      )
    );

    unsubs.push(
      onSnapshot(
        doc(db, 'giveaways', 'current'),
        (snap) => {
          setRawGiveaway(snap.exists() ? (snap.data() as PremiumGiveaway) : null);
        },
        (err) => handleFirestoreError(err, OperationType.GET, 'giveaways/current')
      )
    );

    unsubs.push(
      onSnapshot(
        collection(db, 'tickerItems'),
        (snap) => {
          const list = snap.docs
            .map((d) => d.data() as LiveTickerItem & { createdAtMs?: number })
            .sort((a, b) => (b.createdAtMs ?? 0) - (a.createdAtMs ?? 0))
            .slice(0, 12);
          setTickerItems(list);
        },
        (err) => handleFirestoreError(err, OperationType.LIST, 'tickerItems')
      )
    );

    return () => {
      unsubs.forEach((u) => u());
    };
  }, []);

  // 2. Firebase Auth State & Initial Profile Provisioning
  const provisionVerifiedUser = async (fbUser: NonNullable<typeof auth.currentUser>) => {
    const normalizedEmail = (fbUser.email ?? '').toLowerCase();
    const verifiedAdmin = fbUser.emailVerified && normalizedEmail === ADMIN_EMAIL;

    setPendingVerificationEmail(null);
    setFbUid(fbUser.uid);
    setFbEmail(normalizedEmail || null);
    setFbEmailVerified(fbUser.emailVerified);
    setAuthReady(true);

    try {
      const profileRef = doc(db, 'publicProfiles', fbUser.uid);
      const profileSnap = await getDoc(profileRef);

      if (!profileSnap.exists()) {
        let pendingMeta: Partial<RegisterPayload> | null = null;
        try {
          const raw = sessionStorage.getItem(`animexir_pending_profile_${fbUser.uid}`);
          if (raw) {
            pendingMeta = JSON.parse(raw) as Partial<RegisterPayload>;
            sessionStorage.removeItem(`animexir_pending_profile_${fbUser.uid}`);
          }
        } catch {
          pendingMeta = null;
        }

        const baseName =
          pendingMeta?.displayName?.trim() ||
          fbUser.displayName?.trim() ||
          normalizedEmail.split('@')[0] ||
          'AnimeXir Üyesi';
        const cleanSlug = (pendingMeta?.handle || baseName)
          .toLowerCase()
          .replace(/^@+/, '')
          .replace(/[^a-z0-9_]/g, '')
          .slice(0, 18);
        const defaultHandle = verifiedAdmin
          ? '@wanderer'
          : cleanSlug.length >= 2
            ? `@${cleanSlug}`
            : `@otaku${fbUser.uid.slice(0, 4).toLowerCase()}`;
        const preset = verifiedAdmin ? REAL_CHARACTER_AVATARS[3] : REAL_CHARACTER_AVATARS[0];

        const newPublicProfile = stripUndefined({
          id: fbUser.uid,
          displayName: baseName.slice(0, 64),
          handle: defaultHandle.slice(0, 40),
          avatarUrl: pendingMeta?.avatarUrl || preset.avatarUrl,
          bannerUrl: pendingMeta?.bannerUrl || preset.bannerUrl,
          accentColor: verifiedAdmin
            ? ('am
