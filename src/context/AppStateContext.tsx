import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
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
  loginWithCredentials: (
    identifier: string,
    password: string
  ) => Promise<{ ok: boolean; error?: string }>;
  loginWithGoogle: () => Promise<{ ok: boolean; error?: string }>;
  registerAccount: (payload: RegisterPayload) => Promise<{ ok: boolean; error?: string }>;
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

export const AppStateProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [clientId] = useState<string>(() => getOrCreateClientId());
  const [authReady, setAuthReady] = useState(false);
  const [fbUid, setFbUid] = useState<string | null>(null);
  const [fbEmail, setFbEmail] = useState<string | null>(null);
  const [fbEmailVerified, setFbEmailVerified] = useState(false);

  const [animes, setAnimes] = useState<Anime[]>(ANIME_CATALOG);
  const [activeSection, setActiveSection] = useState<NavSection>('kesfet');
  const [selectedAnimeId, setSelectedAnimeId] = useState<string>('');
  const [selectedEpisodeNum, setSelectedEpisodeNum] = useState<number>(1);
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
  const [activeRoomCode, setActiveRoomCode] = useState<string | null>(null);
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
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (fbUser) => {
      if (!fbUser) {
        setFbUid(null);
        setFbEmail(null);
        setFbEmailVerified(false);
        setFriendsIds([]);
        setWatchlistIds([]);
        setFavoriteIds([]);
        setUserRatings({});
        setDirectMessages([]);
        setPremiumOrders([]);
        setOnboardingOpen(false);
        setAuthReady(true);
        return;
      }

      const verifiedAdmin =
        fbUser.emailVerified && fbUser.email?.toLowerCase() === ADMIN_EMAIL;

      setFbUid(fbUser.uid);
      setFbEmail(fbUser.email ?? null);
      setFbEmailVerified(fbUser.emailVerified);
      setAuthReady(true);

      try {
        const profileRef = doc(db, 'publicProfiles', fbUser.uid);
        const profileSnap = await getDoc(profileRef);

        if (!profileSnap.exists()) {
          const baseName =
            fbUser.displayName?.trim() ||
            fbUser.email?.split('@')[0] ||
            'AnimeXir Üyesi';
          const cleanSlug = baseName
            .toLowerCase()
            .replace(/[^a-z0-9_]/g, '')
            .slice(0, 14);
          const defaultHandle = verifiedAdmin
            ? '@wanderer'
            : `@${cleanSlug || 'otaku'}${fbUser.uid.slice(0, 4).toLowerCase()}`;
          const preset = verifiedAdmin ? REAL_CHARACTER_AVATARS[3] : REAL_CHARACTER_AVATARS[0];

          const newPublicProfile = stripUndefined({
            id: fbUser.uid,
            displayName: baseName.slice(0, 64),
            handle: defaultHandle.slice(0, 40),
            avatarUrl: preset.avatarUrl,
            bannerUrl: preset.bannerUrl,
            accentColor: verifiedAdmin ? ('amber' as AccentColorKey) : ('crimson' as AccentColorKey),
            isAdmin: verifiedAdmin,
            roleBadge: verifiedAdmin ? 'Yönetici' : undefined,
            badges: verifiedAdmin
              ? [
                  { id: 'role-admin', label: 'Yönetici', type: 'role' },
                  { id: 'early-admin', label: 'Erken Destekçi', type: 'early' },
                ]
              : [{ id: `early-${Date.now()}`, label: 'Erken Destekçi', type: 'early' }],
            bio: verifiedAdmin
              ? 'AnimeXir kurucu yöneticisi.'
              : 'AnimeXir üyesi · Yeni seriler keşfediyor.',
            watchedEpisodes: 0,
            favoriteAnimeIds: [],
            watchlistIds: [],
            friendsCount: 0,
            isPremium: verifiedAdmin,
            privacyAcceptedAt: verifiedAdmin ? new Date().toISOString() : undefined,
            onboardingCompleted: verifiedAdmin,
            favoriteGenres: verifiedAdmin ? ['Aksiyon', 'Gizem', 'Fantezi'] : [],
            topAnimePicks: [],
            updatedAt: new Date().toISOString(),
          });

          await setDoc(profileRef, newPublicProfile);
          if (!verifiedAdmin) {
            setOnboardingOpen(true);
          }
        } else {
          const existingData = profileSnap.data() as CommunityProfile;
          if (!verifiedAdmin && existingData.onboardingCompleted === false) {
            setOnboardingOpen(true);
          }
        }

        const privateRef = doc(db, 'userPrivate', fbUser.uid);
        const privateSnap = await getDoc(privateRef);
        if (!privateSnap.exists() && fbUser.email) {
          await setDoc(privateRef, {
            uid: fbUser.uid,
            email: fbUser.email,
            watchlistIds: [],
            favoriteIds: [],
            friendsIds: [],
            ratings: {},
            watchProgressMap: {},
            updatedAt: new Date().toISOString(),
          });
        }

        // First-run admin convenience: seed default plans or existing local AI Studio catalog if Firestore is empty
        if (verifiedAdmin) {
          const existingAnimes = await getDocs(collection(db, 'animes'));
          if (existingAnimes.empty) {
            try {
              const bootRes = await fetch('/api/bootstrap');
              if (bootRes.ok && bootRes.headers.get('content-type')?.includes('json')) {
                const bootData = await bootRes.json();
                if (Array.isArray(bootData.animes)) {
                  for (const a of bootData.animes as Anime[]) {
                    await setDoc(doc(db, 'animes', a.id), stripUndefined(a));
                  }
                }
              }
            } catch {
              // ignore if static deployment has no /api/bootstrap
            }
          }
          const existingPlans = await getDocs(collection(db, 'premiumPlans'));
          if (existingPlans.empty) {
            for (const plan of INITIAL_PREMIUM_PLANS) {
              await setDoc(doc(db, 'premiumPlans', plan.id), stripUndefined(plan));
            }
          }
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `publicProfiles/${fbUser.uid}`);
      }
    });

    return () => unsub();
  }, []);

  // 3. Authenticated-Only Firestore Listeners (userPrivate, DMs, Orders)
  useEffect(() => {
    if (!authReady || !fbUid) return;

    const isAdminUser = fbEmailVerified && fbEmail?.toLowerCase() === ADMIN_EMAIL;
    const unsubs: Array<() => void> = [];

    unsubs.push(
      onSnapshot(
        doc(db, 'userPrivate', fbUid),
        (snap) => {
          if (!snap.exists()) return;
          const data = snap.data() as {
            watchlistIds?: string[];
            favoriteIds?: string[];
            friendsIds?: string[];
            ratings?: Record<string, number>;
            watchProgressMap?: Record<string, WatchProgress>;
          };
          setWatchlistIds(Array.isArray(data.watchlistIds) ? data.watchlistIds : []);
          setFavoriteIds(Array.isArray(data.favoriteIds) ? data.favoriteIds : []);
          setFriendsIds(Array.isArray(data.friendsIds) ? data.friendsIds : []);
          setUserRatings(data.ratings ?? {});
          setWatchProgressMap(data.watchProgressMap ?? {});
        },
        (err) => handleFirestoreError(err, OperationType.GET, `userPrivate/${fbUid}`)
      )
    );

    const dmQuery = query(
      collection(db, 'directMessages'),
      where('participants', 'array-contains', fbUid)
    );
    unsubs.push(
      onSnapshot(
        dmQuery,
        (snap) => {
          const list = snap.docs
            .map((d) => d.data() as DirectMessage & { createdAtMs?: number })
            .sort((a, b) => (a.createdAtMs ?? 0) - (b.createdAtMs ?? 0));
          setDirectMessages(list);
        },
        (err) => handleFirestoreError(err, OperationType.LIST, 'directMessages')
      )
    );

    const ordersQuery = isAdminUser
      ? collection(db, 'premiumOrders')
      : query(collection(db, 'premiumOrders'), where('userId', '==', fbUid));
    unsubs.push(
      onSnapshot(
        ordersQuery,
        (snap) => {
          const list = snap.docs
            .map((d) => d.data() as PremiumOrder & { createdAtMs?: number })
            .sort((a, b) => (b.createdAtMs ?? 0) - (a.createdAtMs ?? 0));
          setPremiumOrders(list);
        },
        (err) => handleFirestoreError(err, OperationType.LIST, 'premiumOrders')
      )
    );

    return () => {
      unsubs.forEach((u) => u());
    };
  }, [authReady, fbUid, fbEmail, fbEmailVerified]);

  // Keep selectedAnimeId valid
  useEffect(() => {
    if (animes.length === 0) {
      if (selectedAnimeId) setSelectedAnimeId('');
      return;
    }
    if (!selectedAnimeId || !animes.some((a) => a.id === selectedAnimeId)) {
      setSelectedAnimeId(animes[0].id);
    }
  }, [animes, selectedAnimeId]);

  // Giveaway countdown & automatic resolution when admin is active
  useEffect(() => {
    if (!rawGiveaway || !rawGiveaway.active) {
      setGiveawayRemainingSeconds(0);
      return;
    }
    const calc = () =>
      Math.max(0, Math.floor((new Date(rawGiveaway.endsAt).getTime() - Date.now()) / 1000));
    setGiveawayRemainingSeconds(calc());
    const timer = setInterval(() => {
      const next = calc();
      setGiveawayRemainingSeconds(next);
      if (next === 0 && currentUser?.isAdmin) {
        void drawAdminGiveaway();
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [rawGiveaway?.id, rawGiveaway?.active, rawGiveaway?.endsAt, currentUser?.isAdmin]);

  // Optional presence ping (works on Express; silently falls back to 1 on static/Vercel)
  useEffect(() => {
    const pingPresence = async () => {
      try {
        const res = await fetch('/api/presence/ping', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-client-id': clientId },
          body: JSON.stringify({ clientId }),
        });
        if (!res.ok || !res.headers.get('content-type')?.includes('json')) return;
        const data = await res.json();
        if (typeof data.liveViewerCount === 'number' && data.liveViewerCount > 0) {
          setLiveViewerCount(data.liveViewerCount);
        }
      } catch {
        // ignore on serverless/static hosting
      }
    };
    void pingPresence();
    const interval = setInterval(pingPresence, 15000);
    return () => clearInterval(interval);
  }, [clientId]);

  const openAnimeWatch = (animeId: string, episodeNum = 1) => {
    setSelectedAnimeId(animeId);
    setSelectedEpisodeNum(episodeNum);
    setActiveSection('izle');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const openProfileModal = (profile: CommunityProfile | null) => {
    setSelectedProfileId(profile ? profile.id : null);
  };

  const openAuthModal = (mode: 'login' | 'register') => {
    setAuthModal({ open: true, mode });
  };

  const closeAuthModal = () => {
    setAuthModal((prev) => ({ ...prev, open: false }));
  };

  const loginWithGoogle = async (): Promise<{ ok: boolean; error?: string }> => {
    try {
      const cred = await signInWithPopup(auth, googleProvider);
      closeAuthModal();
      const isAdminAccount =
        cred.user.emailVerified && cred.user.email?.toLowerCase() === ADMIN_EMAIL;
      showToast(
        isAdminAccount
          ? `Hoş geldin Yönetici ${cred.user.displayName || 'Kağan'}!`
          : `Google ile giriş yapıldı: ${cred.user.displayName || cred.user.email}`
      );
      return { ok: true };
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code ?? '';
      let msg = 'Google ile giriş yapılamadı.';
      if (code === 'auth/popup-closed-by-user') {
        msg = 'Google giriş penceresi kapatıldı.';
      } else if (code === 'auth/popup-blocked') {
        msg = 'Tarayıcı açılır pencereyi engelledi. Lütfen popup izni verin.';
      } else if (code === 'auth/unauthorized-domain') {
        msg = `Bu alan adı (${window.location.hostname}) Firebase Yetkili Alan Adları listesine eklenmeli.`;
      }
      showToast(msg);
      return { ok: false, error: msg };
    }
  };

  const loginWithCredentials = async (_identifier: string, _password: string) => {
    return {
      ok: false,
      error: 'Güvenlik nedeniyle tüm girişler yukarıdaki "Google ile Devam Et" üzerinden yapılır.',
    };
  };

  const changePassword = async () => {
    return {
      ok: false,
      error: 'Hesabınız Google ile doğrulandığı için şifre yönetimi Google hesabınızdan yapılır.',
    };
  };

  const registerAccount = async (_payload: RegisterPayload) => {
    return {
      ok: false,
      error: 'Hesap oluşturmak için yukarıdaki "Google ile Devam Et" butonunu kullanın.',
    };
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch {
      // ignore
    }
    setDmDrawerOpen(false);
    setOnboardingOpen(false);
    if (activeSection === 'profil' || activeSection === 'yonetim') {
      setActiveSection('kesfet');
    }
    showToast('Hesabından çıkış yapıldı.');
  };

  const updateCurrentUserProfile = async (updates: Partial<CommunityProfile>) => {
    if (!fbUid || !currentUser) return;
    const allowed: Partial<CommunityProfile> = {};
    if (updates.displayName !== undefined && updates.displayName.trim()) {
      allowed.displayName = updates.displayName.trim().slice(0, 64);
    }
    if (updates.handle !== undefined && updates.handle.trim()) {
      const clean = updates.handle.trim().replace(/^@+/, '');
      allowed.handle = `@${clean}`.slice(0, 40);
    }
    if (updates.bio !== undefined) allowed.bio = updates.bio.slice(0, 400);
    if (updates.avatarUrl !== undefined) allowed.avatarUrl = updates.avatarUrl.slice(0, 1000);
    if (updates.bannerUrl !== undefined) allowed.bannerUrl = updates.bannerUrl.slice(0, 1000);
    if (updates.accentColor !== undefined) allowed.accentColor = updates.accentColor;

    try {
      await updateDoc(doc(db, 'publicProfiles', fbUid), {
        ...allowed,
        updatedAt: new Date().toISOString(),
      });
      showToast('Profil ayarların kaydedildi.');
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `publicProfiles/${fbUid}`);
    }
  };

  const openOnboarding = () => setOnboardingOpen(true);
  const closeOnboarding = () => setOnboardingOpen(false);

  const saveOnboardingProgress: AppContextValue['saveOnboardingProgress'] = async (payload) => {
    if (!fbUid || !currentUser) return { ok: false, error: 'Giriş yapmalısın.' };
    try {
      const profileUpdates: Record<string, unknown> = {
        updatedAt: new Date().toISOString(),
      };
      if (payload.acceptPrivacy && !currentUser.privacyAcceptedAt) {
        profileUpdates.privacyAcceptedAt = new Date().toISOString();
      }
      if (Array.isArray(payload.favoriteGenres)) {
        profileUpdates.favoriteGenres = payload.favoriteGenres
          .map((g) => g.trim())
          .filter(Boolean)
          .slice(0, 12);
      }
      if (Array.isArray(payload.topAnimePicks)) {
        const cleanedPicks: TopAnimePick[] = payload.topAnimePicks
          .slice(0, 3)
          .filter((p) => p && p.id && p.title)
          .map((p) =>
            stripUndefined({
              id: String(p.id),
              anilistId: p.anilistId ? Number(p.anilistId) : undefined,
              title: String(p.title),
              posterUrl: String(p.posterUrl || ''),
              genres: Array.isArray(p.genres) ? p.genres.map(String) : [],
              score: typeof p.score === 'number' ? p.score : undefined,
            })
          );
        profileUpdates.topAnimePicks = cleanedPicks;

        const catalogIds = new Set(animes.map((a) => a.id));
        const matchedLocalIds = cleanedPicks
          .filter((p) => catalogIds.has(p.id))
          .map((p) => p.id);
        if (matchedLocalIds.length > 0) {
          const mergedFavs = Array.from(new Set([...favoriteIds, ...matchedLocalIds])).slice(0, 200);
          profileUpdates.favoriteAnimeIds = mergedFavs;
          await updateDoc(doc(db, 'userPrivate', fbUid), {
            favoriteIds: mergedFavs,
            updatedAt: new Date().toISOString(),
          });
        }
      }
      if (typeof payload.onboardingCompleted === 'boolean') {
        profileUpdates.onboardingCompleted = payload.onboardingCompleted;
      }

      await updateDoc(doc(db, 'publicProfiles', fbUid), profileUpdates);
      return { ok: true };
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `publicProfiles/${fbUid}`);
    }
  };

  const toggleFriend = async (profileId: string) => {
    if (!fbUid || !currentUser) {
      openAuthModal('register');
      return;
    }
    if (profileId === fbUid) {
      showToast('Kendini arkadaş olarak ekleyemezsin.');
      return;
    }
    const exists = friendsIds.includes(profileId);
    const nextFriends = exists
      ? friendsIds.filter((id) => id !== profileId)
      : [...friendsIds, profileId].slice(0, 500);

    try {
      await updateDoc(doc(db, 'userPrivate', fbUid), {
        friendsIds: nextFriends,
        updatedAt: new Date().toISOString(),
      });
      await updateDoc(doc(db, 'publicProfiles', fbUid), {
        friendsCount: nextFriends.length,
        updatedAt: new Date().toISOString(),
      });
      showToast(exists ? 'Arkadaşlıktan çıkarıldı.' : 'Arkadaş olarak eklendi!');
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `userPrivate/${fbUid}`);
    }
  };

  const unreadDmCount = fbUid
    ? directMessages.filter((m) => m.receiverId === fbUid && !m.readByReceiver).length
    : 0;

  const markDmThreadRead = async (peerId: string) => {
    if (!fbUid) return;
    const unread = directMessages.filter(
      (m) => m.senderId === peerId && m.receiverId === fbUid && !m.readByReceiver
    );
    for (const msg of unread) {
      try {
        await updateDoc(doc(db, 'directMessages', msg.id), { readByReceiver: true });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `directMessages/${msg.id}`);
      }
    }
  };

  const openDmWith = (peerId?: string | null) => {
    if (!fbUid) {
      openAuthModal('login');
      return;
    }
    if (peerId) {
      setActiveDmPeerId(peerId);
      void markDmThreadRead(peerId);
    }
    setDmDrawerOpen(true);
  };

  const closeDmDrawer = () => setDmDrawerOpen(false);

  const sendDirectMessage = async (peerId: string, text: string): Promise<boolean> => {
    if (!fbUid) {
      openAuthModal('login');
      return false;
    }
    const clean = text.trim().slice(0, 1000);
    if (!clean || peerId === fbUid) return false;

    const id = `dm-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const participants = [fbUid, peerId].sort();
    const convKey = participants.join('__');
    const msg = {
      id,
      conversationKey: convKey,
      participants,
      senderId: fbUid,
      receiverId: peerId,
      text: clean,
      createdAt: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
      createdAtMs: Date.now(),
      readByReceiver: false,
    };

    try {
      await setDoc(doc(db, 'directMessages', id), msg);
      return true;
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `directMessages/${id}`);
    }
  };

  const toggleProfileLike = async (profileId: string) => {
    if (!fbUid) {
      openAuthModal('login');
      return;
    }
    const likeId = `${profileId}_${fbUid}`;
    const already = profileLikes.some((l) => l.id === likeId);
    try {
      if (already) {
        await deleteDoc(doc(db, 'profileLikes', likeId));
        showToast('Profil beğenisi kaldırıldı.');
      } else {
        await setDoc(doc(db, 'profileLikes', likeId), {
          targetUserId: profileId,
          userId: fbUid,
          createdAt: new Date().toISOString(),
        });
        showToast('Profil beğenildi!');
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `profileLikes/${likeId}`);
    }
  };

  const addProfileComment = async (profileId: string, text: string) => {
    if (!fbUid || !currentUser) {
      openAuthModal('login');
      return;
    }
    const clean = text.trim().slice(0, 500);
    if (!clean) return;
    const id = `wc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    try {
      await setDoc(doc(db, 'wallComments', id), {
        id,
        targetUserId: profileId,
        authorId: fbUid,
        authorName: currentUser.displayName,
        authorHandle: currentUser.handle,
        authorAvatar: currentUser.avatarUrl,
        text: clean,
        createdAt: 'şimdi',
        createdAtMs: Date.now(),
      });
      showToast('Profil yorumun paylaşıldı.');
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `wallComments/${id}`);
    }
  };

  const toggleWatchlist = async (animeId: string) => {
    if (!fbUid) {
      openAuthModal('register');
      return;
    }
    const exists = watchlistIds.includes(animeId);
    const next = exists
      ? watchlistIds.filter((id) => id !== animeId)
      : [...watchlistIds, animeId].slice(0, 200);
    try {
      await updateDoc(doc(db, 'userPrivate', fbUid), {
        watchlistIds: next,
        updatedAt: new Date().toISOString(),
      });
      await updateDoc(doc(db, 'publicProfiles', fbUid), {
        watchlistIds: next,
        updatedAt: new Date().toISOString(),
      });
      showToast(exists ? 'Listemden çıkarıldı.' : 'İzleme listene eklendi.');
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `userPrivate/${fbUid}`);
    }
  };

  const toggleFavorite = async (animeId: string) => {
    if (!fbUid) {
      openAuthModal('register');
      return;
    }
    const exists = favoriteIds.includes(animeId);
    const next = exists
      ? favoriteIds.filter((id) => id !== animeId)
      : [...favoriteIds, animeId].slice(0, 200);
    try {
      await updateDoc(doc(db, 'userPrivate', fbUid), {
        favoriteIds: next,
        updatedAt: new Date().toISOString(),
      });
      await updateDoc(doc(db, 'publicProfiles', fbUid), {
        favoriteAnimeIds: next,
        updatedAt: new Date().toISOString(),
      });
      showToast(exists ? 'Favorilerden çıkarıldı.' : 'Favorilerine eklendi!');
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `userPrivate/${fbUid}`);
    }
  };

  const rateAnime = async (animeId: string, score: number) => {
    if (!fbUid) {
      openAuthModal('login');
      return;
    }
    const nextRatings = { ...userRatings, [animeId]: score };
    try {
      await updateDoc(doc(db, 'userPrivate', fbUid), {
        ratings: nextRatings,
        updatedAt: new Date().toISOString(),
      });
      showToast(`Puanın kaydedildi: ${score}/10`);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `userPrivate/${fbUid}`);
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
    const nextMap = { ...watchProgressMap, [animeId]: entry };
    setWatchProgressMap(nextMap);

    if (!fbUid) {
      try {
        localStorage.setItem(GUEST_PROGRESS_KEY, JSON.stringify(nextMap));
      } catch {
        // ignore
      }
      return;
    }

    void updateDoc(doc(db, 'userPrivate', fbUid), {
      watchProgressMap: nextMap,
      updatedAt: new Date().toISOString(),
    }).catch((err) => handleFirestoreError(err, OperationType.UPDATE, `userPrivate/${fbUid}`));
  };

  const addEpisodeComment = async (
    animeId: string,
    episodeNumber: number,
    text: string,
    rating?: number
  ) => {
    if (!fbUid || !currentUser) {
      openAuthModal('login');
      return;
    }
    const clean = text.trim().slice(0, 1000);
    if (!clean) return;
    const id = `c-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const nowMs = Date.now();
    const commentDoc = stripUndefined({
      id,
      animeId,
      episodeNumber,
      userId: fbUid,
      displayName: currentUser.displayName,
      handle: currentUser.handle,
      avatarUrl: currentUser.avatarUrl,
      text: clean,
      rating,
      likes: 0,
      likedBy: [],
      createdAt: 'şimdi',
      createdAtMs: nowMs,
    });

    try {
      await setDoc(doc(db, 'comments', id), commentDoc);
      const animeTitle = animes.find((a) => a.id === animeId)?.title ?? 'Anime';
      const tickId = `tick-${nowMs}`;
      await setDoc(
        doc(db, 'tickerItems', tickId),
        stripUndefined({
          id: tickId,
          userId: fbUid,
          username: currentUser.displayName,
          avatarUrl: currentUser.avatarUrl,
          animeId,
          animeTitle,
          episodeNumber,
          scoreLabel: rating ? `${rating}/10` : undefined,
          comment: clean.slice(0, 140),
          createdAtMs: nowMs,
        })
      );
      showToast('Yorumun yayınlandı.');
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `comments/${id}`);
    }
  };

  const toggleCommentLike = async (commentId: string) => {
    if (!fbUid) {
      openAuthModal('login');
      return;
    }
    const target = rawComments.find((c) => c.id === commentId);
    if (!target) return;
    const likedBy = target.likedBy ?? [];
    const exists = likedBy.includes(fbUid);
    const nextLikedBy = exists ? likedBy.filter((id) => id !== fbUid) : [...likedBy, fbUid];
    try {
      await updateDoc(doc(db, 'comments', commentId), {
        likedBy: nextLikedBy,
        likes: nextLikedBy.length,
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `comments/${commentId}`);
    }
  };

  const createWatchRoom = async (
    animeId: string,
    episodeNumber: number,
    name: string
  ): Promise<WatchPartyRoom | null> => {
    if (!fbUid || !currentUser) {
      openAuthModal('login');
      return null;
    }
    const code = `XIR${Math.floor(100 + Math.random() * 900)}`;
    const roomDoc = {
      code,
      name: (name.trim() || `${currentUser.displayName} Odası`).slice(0, 80),
      animeId,
      episodeNumber,
      hostId: fbUid,
      hostName: currentUser.displayName,
      hostAvatar: currentUser.avatarUrl,
      viewerCount: 1,
      isPlaying: true,
      currentTime: 0,
      messages: [
        {
          id: `sys-${Date.now()}`,
          sender: 'Sistem',
          avatar: currentUser.avatarUrl,
          text: `${currentUser.displayName} izleme odasını başlattı.`,
          time: 'şimdi',
          isSystem: true,
        },
      ],
      createdAt: new Date().toISOString(),
    };
    try {
      await setDoc(doc(db, 'rooms', code), roomDoc);
      setActiveRoomCode(code);
      setActiveSection('birlikte-izle');
      showToast(`Oda oluşturuldu (${code})`);
      return roomDoc;
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `rooms/${code}`);
    }
  };

  const sendRoomMessage = async (code: string, text: string) => {
    if (!fbUid || !currentUser) {
      openAuthModal('login');
      return;
    }
    const clean = text.trim().slice(0, 300);
    if (!clean) return;
    const room = rooms.find((r) => r.code === code);
    if (!room) return;
    const nextMsgs = [
      ...(room.messages ?? []),
      {
        id: `rm-${Date.now()}`,
        sender: currentUser.displayName,
        avatar: currentUser.avatarUrl,
        text: clean,
        time: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
      },
    ].slice(-200);
    try {
      await updateDoc(doc(db, 'rooms', code), { messages: nextMsgs });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `rooms/${code}`);
    }
  };

  const toggleRoomPlayback = async (code: string) => {
    if (!fbUid) {
      openAuthModal('login');
      return;
    }
    const room = rooms.find((r) => r.code === code);
    if (!room) return;
    try {
      await updateDoc(doc(db, 'rooms', code), { isPlaying: !room.isPlaying });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `rooms/${code}`);
    }
  };

  const markAllNotificationsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const joinGiveaway = async () => {
    if (!fbUid) {
      openAuthModal('register');
      return;
    }
    if (!rawGiveaway || !rawGiveaway.active) {
      showToast('Şu an aktif çekiliş bulunmuyor.');
      return;
    }
    if (rawGiveaway.participantIds.includes(fbUid)) {
      showToast('Zaten bu çekilişe katıldın.');
      return;
    }
    try {
      await updateDoc(doc(db, 'giveaways', 'current'), {
        participantIds: [...rawGiveaway.participantIds, fbUid],
      });
      showToast('Çekilişe katıldın! Bol şans!');
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, 'giveaways/current');
    }
  };

  const createPremiumOrder: AppContextValue['createPremiumOrder'] = async (planId, note) => {
    if (!fbUid || !currentUser) {
      openAuthModal('login');
      return { ok: false, error: 'Önce giriş yapmalısın.' };
    }
    const plan = premiumPlans.find((p) => p.id === planId);
    if (!plan) return { ok: false, error: 'Seçilen paket bulunamadı.' };

    const id = `ord-${Date.now()}`;
    const orderDoc = stripUndefined({
      id,
      userId: fbUid,
      userDisplayName: currentUser.displayName,
      userHandle: currentUser.handle,
      planId: plan.id,
      planName: plan.name,
      price: plan.price,
      periodLabel: plan.periodLabel,
      note: note?.trim() ? note.trim().slice(0, 300) : undefined,
      status: 'pending' as const,
      createdAt: new Date().toLocaleString('tr-TR'),
      createdAtMs: Date.now(),
    });
    try {
      await setDoc(doc(db, 'premiumOrders', id), orderDoc);
      showToast(`${plan.name} talebin oluşturuldu! Yönetici onayı bekleniyor.`);
      return { ok: true };
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `premiumOrders/${id}`);
    }
  };

  const startAdminGiveaway: AppContextValue['startAdminGiveaway'] = async (payload) => {
    if (!currentUser?.isAdmin) return;
    const hours = Math.min(Math.max(Number(payload.durationHours) || 24, 1), 720);
    const now = Date.now();
    const docData: PremiumGiveaway = {
      id: `gw-${now}`,
      active: true,
      title: (payload.title || '1 Aylık Xir Pro Çekilişi').trim().slice(0, 120),
      prizeLabel: (payload.prizeLabel || '1 Aylık Xir Pro').trim().slice(0, 80),
      durationHours: hours,
      startedAt: new Date(now).toISOString(),
      endsAt: new Date(now + hours * 3600_000).toISOString(),
      participantIds: [],
    };
    try {
      await setDoc(doc(db, 'giveaways', 'current'), docData);
      showToast(`${hours} saatlik çekiliş başlatıldı!`);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'giveaways/current');
    }
  };

  const drawAdminGiveaway = async () => {
    if (!currentUser?.isAdmin || !rawGiveaway) return;
    const participants = rawGiveaway.participantIds ?? [];
    try {
      if (participants.length === 0) {
        await updateDoc(doc(db, 'giveaways', 'current'), { active: false });
        showToast('Katılımcı olmadığı için çekiliş sonlandırıldı.');
        return;
      }
      const winnerId = participants[Math.floor(Math.random() * participants.length)];
      const winner = profiles.find((p) => p.id === winnerId);
      await updateDoc(
        doc(db, 'giveaways', 'current'),
        stripUndefined({
          active: false,
          winnerId,
          winnerName: winner?.displayName || 'Kazanan Üye',
          winnerHandle: winner?.handle || '@uye',
        })
      );
      if (winner) {
        const nextBadges = winner.badges.some((b) => b.type === 'gift')
          ? winner.badges
          : [...winner.badges, { id: `gift-${Date.now()}`, label: 'Premium Hediye', type: 'gift' as const }];
        await updateDoc(doc(db, 'publicProfiles', winner.id), {
          isPremium: true,
          premiumPlanName: rawGiveaway.prizeLabel,
          badges: nextBadges,
          updatedAt: new Date().toISOString(),
        });
        showToast(`Kazanan seçildi: ${winner.displayName}!`);
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, 'giveaways/current');
    }
  };

  const stopAdminGiveaway = async () => {
    if (!currentUser?.isAdmin) return;
    try {
      await deleteDoc(doc(db, 'giveaways', 'current'));
      showToast('Çekiliş kaldırıldı.');
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, 'giveaways/current');
    }
  };

  const saveAdminPlans: AppContextValue['saveAdminPlans'] = async (plans) => {
    if (!currentUser?.isAdmin) return { ok: false, error: 'Yönetici yetkisi gerekli.' };
    try {
      for (const p of plans) {
        const cleanPlan = stripUndefined({
          id: p.id,
          name: p.name.trim(),
          tagline: (p.tagline || '').trim(),
          price: Math.max(0, Number(p.price) || 0),
          periodLabel: (p.periodLabel || 'ay').trim(),
          durationDays: Math.max(1, Number(p.durationDays) || 30),
          popular: Boolean(p.popular),
          badgeLabel: p.badgeLabel?.trim() || undefined,
          features: (p.features ?? []).map((f) => f.trim()).filter(Boolean),
        });
        await setDoc(doc(db, 'premiumPlans', cleanPlan.id), cleanPlan);
      }
      showToast('Premium dükkan fiyatları güncellendi!');
      return { ok: true };
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'premiumPlans');
    }
  };

  const resolveAdminOrder = async (orderId: string, action: 'approve' | 'reject') => {
    if (!currentUser?.isAdmin) return;
    const order = premiumOrders.find((o) => o.id === orderId);
    if (!order) return;
    const nextStatus = action === 'reject' ? 'rejected' : 'approved';
    try {
      await updateDoc(doc(db, 'premiumOrders', orderId), { status: nextStatus });
      if (nextStatus === 'approved') {
        const target = profiles.find((p) => p.id === order.userId);
        if (target) {
          const nextBadges = target.badges.some((b) => b.type === 'gift')
            ? target.badges
            : [...target.badges, { id: `gift-${Date.now()}`, label: 'Premium', type: 'gift' as const }];
          await updateDoc(doc(db, 'publicProfiles', target.id), {
            isPremium: true,
            premiumPlanName: order.planName,
            badges: nextBadges,
            updatedAt: new Date().toISOString(),
          });
        }
      }
      showToast(
        nextStatus === 'approved'
          ? 'Sipariş onaylandı ve Premium aktif edildi!'
          : 'Sipariş reddedildi.'
      );
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `premiumOrders/${orderId}`);
    }
  };

  const importAniListAnime: AppContextValue['importAniListAnime'] = async (item) => {
    if (!currentUser?.isAdmin) return { ok: false, error: 'Yönetici yetkisi gerekli.' };
    if (!item || !item.id) return { ok: false, error: 'Geçersiz AniList verisi.' };

    const totalEps = Math.min(Math.max(item.episodeCount || 12, 1), 100);
    const existingAnime = animes.find((a) => a.anilistId === item.id);
    const animeId = existingAnime
      ? existingAnime.id
      : `${item.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'anime'}-${item.id}`;
    const existingEpisodes = existingAnime?.episodes ?? [];

    let episodes: Episode[];
    try {
      episodes = Array.from({ length: totalEps }, (_, i) => {
        const num = i + 1;
        const old = existingEpisodes.find((e) => e.number === num);
        let firstVideo = old?.videoUrl;
        if (num === 1 && item.firstEpisodeVideoUrl) {
          firstVideo = sanitizeVideoSource(item.firstEpisodeVideoUrl);
        }
        return stripUndefined({
          id: old?.id ?? `${animeId}-ep-${num}`,
          animeId,
          number: num,
          title: old?.title ?? `${num}. Bölüm`,
          duration: old?.duration ?? '24:00',
          durationSeconds: old?.durationSeconds ?? 1440,
          hasDub: Boolean(item.hasDub),
          hasSub: true,
          releasedAt: num === totalEps ? 'Yeni' : 'Katalogda',
          thumbnail: item.bannerUrl || item.coverUrl,
          videoUrl: firstVideo,
          dubVideoUrl: old?.dubVideoUrl,
          mirrors: old?.mirrors,
          subtitleVtt:
            num === 1 && item.firstEpisodeSubtitleVtt
              ? normalizeSubtitleVtt(item.firstEpisodeSubtitleVtt)
              : old?.subtitleVtt,
        });
      });
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : 'Geçersiz video bağlantısı.' };
    }

    const title = (item.customTitle || item.title).trim();
    const cleanScore = item.score || 8.0;
    const animeDoc: Anime = stripUndefined({
      id: animeId,
      anilistId: item.id,
      slug: animeId,
      title,
      stylizedTitle: title.toUpperCase(),
      score: cleanScore,
      year: item.year || 2024,
      episodeCount: item.episodeCount || totalEps,
      latestEpisode: totalEps,
      hasDub: Boolean(item.hasDub),
      featured: item.featured ?? true,
      genres: item.genres?.length ? item.genres : ['Aksiyon'],
      moods: item.genres?.slice(0, 2) ?? ['Aksiyon'],
      awardTag: cleanScore >= 8.2 ? 'Ödüllü' : undefined,
      synopsis: (item.customSynopsis || item.description || `${title} Türkçe altyazılı olarak AnimeXir’de.`).trim().slice(0, 3900),
      posterUrl: item.coverUrl,
      bannerUrl: item.bannerUrl || item.coverUrl,
      logoUrl: item.logoUrl?.trim() || undefined,
      trailerId: item.trailerId,
      weeklyRank: existingAnime?.weeklyRank,
      broadcastDay: 'Cumartesi',
      broadcastTime: '20:00',
      studio: item.studio || 'Stüdyo',
      status: item.status || 'Devam Ediyor',
      episodes,
    });

    try {
      await setDoc(doc(db, 'animes', animeId), animeDoc);
      showToast(
        existingAnime
          ? `${animeDoc.title} güncellendi!`
          : `${animeDoc.title} AniList’ten başarıyla çekildi!`
      );
      return { ok: true, updated: Boolean(existingAnime) };
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `animes/${animeId}`);
    }
  };

  const updateAdminAnime: AppContextValue['updateAdminAnime'] = async (animeId, updates) => {
    if (!currentUser?.isAdmin) return { ok: false, error: 'Yönetici yetkisi gerekli.' };
    const current = animes.find((a) => a.id === animeId);
    if (!current) return { ok: false, error: 'Anime bulunamadı.' };
    const nextAnime = stripUndefined({ ...current, ...updates, id: animeId });
    try {
      await setDoc(doc(db, 'animes', animeId), nextAnime);
      showToast('Anime bilgileri güncellendi.');
      return { ok: true };
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `animes/${animeId}`);
    }
  };

  const deleteAdminAnime = async (animeId: string) => {
    if (!currentUser?.isAdmin) return;
    try {
      await deleteDoc(doc(db, 'animes', animeId));
      showToast('Anime katalogdan kaldırıldı.');
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `animes/${animeId}`);
    }
  };

  const saveEpisodeSource: AppContextValue['saveEpisodeSource'] = async (
    animeId,
    epNum,
    payload
  ) => {
    if (!currentUser?.isAdmin) return { ok: false, error: 'Yönetici yetkisi gerekli.' };
    const anime = animes.find((a) => a.id === animeId);
    if (!anime) return { ok: false, error: 'Anime bulunamadı.' };

    let nextEpisodes = [...anime.episodes];
    const idx = nextEpisodes.findIndex((e) => e.number === epNum);

    try {
      const cleanVideo =
        payload.videoUrl !== undefined ? sanitizeVideoSource(payload.videoUrl) : undefined;
      const cleanDub =
        payload.dubVideoUrl !== undefined ? sanitizeVideoSource(payload.dubVideoUrl) : undefined;
      const cleanMirrors: EpisodeMirror[] | undefined = Array.isArray(payload.mirrors)
        ? payload.mirrors
            .filter((m) => m && m.url?.trim())
            .map((m, i) => ({
              id: m.id || `m-${Date.now()}-${i}`,
              label: (m.label || `Oynatıcı ${i + 1}`).trim(),
              url: sanitizeVideoSource(m.url),
              audio: m.audio === 'dub' ? 'dub' : 'sub',
            }))
        : undefined;
      const cleanSub =
        payload.subtitleVtt !== undefined ? normalizeSubtitleVtt(payload.subtitleVtt) : undefined;

      if (idx >= 0) {
        const old = nextEpisodes[idx];
        nextEpisodes[idx] = stripUndefined({
          ...old,
          title: payload.title !== undefined ? payload.title.trim() : old.title,
          videoUrl: cleanVideo !== undefined ? cleanVideo || undefined : old.videoUrl,
          dubVideoUrl: cleanDub !== undefined ? cleanDub || undefined : old.dubVideoUrl,
          mirrors: cleanMirrors !== undefined ? cleanMirrors : old.mirrors,
          subtitleVtt: cleanSub !== undefined ? cleanSub || undefined : old.subtitleVtt,
        });
      } else {
        nextEpisodes.push(
          stripUndefined({
            id: `${anime.id}-ep-${epNum}`,
            animeId: anime.id,
            number: epNum,
            title: payload.title?.trim() || `${epNum}. Bölüm`,
            duration: '24:00',
            durationSeconds: 1440,
            hasDub: Boolean(cleanDub || anime.hasDub),
            hasSub: true,
            releasedAt: 'Yeni',
            thumbnail: anime.bannerUrl || anime.posterUrl,
            videoUrl: cleanVideo || undefined,
            dubVideoUrl: cleanDub || undefined,
            mirrors: cleanMirrors,
            subtitleVtt: cleanSub || undefined,
          })
        );
        nextEpisodes.sort((a, b) => a.number - b.number);
      }
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : 'Geçersiz video bağlantısı.' };
    }

    const latestEpisode = Math.max(
      anime.latestEpisode || 1,
      nextEpisodes[nextEpisodes.length - 1]?.number ?? 1
    );

    try {
      await updateDoc(doc(db, 'animes', animeId), {
        episodes: nextEpisodes,
        latestEpisode,
      });
      showToast(`${epNum}. bölüm kaynağı & Türkçe altyazı kaydedildi.`);
      return { ok: true };
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `animes/${animeId}`);
    }
  };

  const saveEpisodesBulk: AppContextValue['saveEpisodesBulk'] = async (animeId, items) => {
    if (!currentUser?.isAdmin) return { ok: false, error: 'Yönetici yetkisi gerekli.' };
    const anime = animes.find((a) => a.id === animeId);
    if (!anime) return { ok: false, error: 'Anime bulunamadı.' };
    if (!Array.isArray(items) || items.length === 0) {
      return { ok: false, error: 'Güncellenecek bölüm verisi gönderilmedi.' };
    }

    const nextEpisodes = [...anime.episodes];
    let updatedCount = 0;

    try {
      for (const item of items) {
        const epNum = Math.floor(Number(item.number));
        if (!Number.isFinite(epNum) || epNum < 1) continue;

        let idx = nextEpisodes.findIndex((e) => e.number === epNum);
        if (idx < 0) {
          nextEpisodes.push({
            id: `${anime.id}-ep-${epNum}`,
            animeId: anime.id,
            number: epNum,
            title: `${epNum}. Bölüm`,
            duration: '24:00',
            durationSeconds: 1440,
            hasDub: Boolean(anime.hasDub),
            hasSub: true,
            releasedAt: 'Yeni',
            thumbnail: anime.bannerUrl || anime.posterUrl,
          });
          idx = nextEpisodes.length - 1;
        }

        const ep = { ...nextEpisodes[idx] };
        let touched = false;

        if (item.videoUrl !== undefined && item.videoUrl.trim()) {
          ep.videoUrl = sanitizeVideoSource(item.videoUrl);
          touched = true;
        }
        if (item.dubVideoUrl !== undefined && item.dubVideoUrl.trim()) {
          ep.dubVideoUrl = sanitizeVideoSource(item.dubVideoUrl);
          ep.hasDub = true;
          touched = true;
        }
        if (item.mirror && item.mirror.url?.trim()) {
          const cleanUrl = sanitizeVideoSource(item.mirror.url);
          const label = (item.mirror.label || 'Yedek Oynatıcı').trim();
          const audio = item.mirror.audio === 'dub' ? 'dub' : 'sub';
          const currentMirrors = [...(ep.mirrors ?? [])];
          const sameIdx = currentMirrors.findIndex(
            (m) => m.label.toLowerCase() === label.toLowerCase() && m.audio === audio
          );
          const mirrorObj: EpisodeMirror = {
            id: sameIdx >= 0 ? currentMirrors[sameIdx].id : `m-${Date.now()}-${epNum}`,
            label,
            url: cleanUrl,
            audio,
          };
          if (sameIdx >= 0) currentMirrors[sameIdx] = mirrorObj;
          else currentMirrors.push(mirrorObj);
          ep.mirrors = currentMirrors;
          touched = true;
        }
        if (item.subtitleVtt !== undefined && item.subtitleVtt.trim()) {
          ep.subtitleVtt = normalizeSubtitleVtt(item.subtitleVtt);
          touched = true;
        }

        if (touched) {
          nextEpisodes[idx] = stripUndefined(ep);
          updatedCount++;
        }
      }
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : 'Geçersiz bölüm bağlantısı.' };
    }

    nextEpisodes.sort((a, b) => a.number - b.number);
    const latestEpisode = Math.max(
      anime.latestEpisode || 1,
      nextEpisodes[nextEpisodes.length - 1]?.number ?? 1
    );

    try {
      await updateDoc(doc(db, 'animes', animeId), {
        episodes: nextEpisodes,
        latestEpisode,
      });
      showToast(`${updatedCount} bölüm tek seferde güncellendi!`);
      return { ok: true, updatedCount };
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `animes/${animeId}`);
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
        changePassword,
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
