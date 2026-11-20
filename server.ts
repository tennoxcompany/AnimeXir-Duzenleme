

import crypto from 'crypto';
import express, { NextFunction, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import {
  ANILIST_GENRE_TR,
  ANIME_CATALOG,
  INITIAL_COMMENTS,
  INITIAL_PREMIUM_PLANS,
  INITIAL_PROFILES,
  INITIAL_ROOMS,
  INITIAL_TICKER,
  REAL_CHARACTER_AVATARS,
} from './src/data/animeData';
import {
  AniListSearchResult,
  Anime,
  CommunityProfile,
  DirectMessage,
  Episode,
  EpisodeComment,
  EpisodeMirror,
  LiveTickerItem,
  PremiumGiveaway,
  PremiumOrder,
  PremiumPlan,
  TopAnimePick,
  WatchPartyRoom,
  WatchProgress,
} from './src/types/anime';

interface StoredUser extends CommunityProfile {
  passwordHash?: string;
}

interface DatabaseSchema {
  animes: Anime[];
  users: StoredUser[];
  sessions: Record<string, string>;
  comments: EpisodeComment[];
  tickerItems: LiveTickerItem[];
  rooms: WatchPartyRoom[];
  watchProgress: Record<string, Record<string, WatchProgress>>;
  watchlists: Record<string, string[]>;
  favorites: Record<string, string[]>;
  ratings: Record<string, Record<string, number>>;
  friends: Record<string, string[]>;
  profileLikes?: Record<string, string[]>;
  directMessages?: DirectMessage[];
  premiumPlans?: PremiumPlan[];
  giveaway?: PremiumGiveaway | null;
  premiumOrders?: PremiumOrder[];
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_PATH = path.join(DATA_DIR, 'db.json');
const ADMIN_EMAIL = 'kagangirgin43@gmail.com';

function hashPassword(pw: string, salt?: string): string {
  const usedSalt = salt || crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(pw, usedSalt, 32).toString('hex');
  return `${usedSalt}:${derived}`;
}

function verifyPassword(pw: string, storedHash: string): boolean {
  if (!storedHash) return false;
  if (storedHash.includes(':')) {
    const [salt, expectedHex] = storedHash.split(':');
    if (!salt || !expectedHex) return false;
    const derived = crypto.scryptSync(pw, salt, 32);
    const expected = Buffer.from(expectedHex, 'hex');
    return derived.length === expected.length && crypto.timingSafeEqual(derived, expected);
  }
  // Legacy static-salt compatibility (auto-upgraded on login)
  const legacyDerived = crypto.scryptSync(pw, 'animexir_salt_v2', 32).toString('hex');
  return legacyDerived === storedHash;
}

function createInitialDb(): DatabaseSchema {
  const initialAdminPass =
    process.env.ADMIN_INITIAL_PASSWORD || crypto.randomBytes(12).toString('base64url');
  if (!process.env.ADMIN_INITIAL_PASSWORD) {
    console.log(`[AnimeXir] İlk yönetici hesabı (${ADMIN_EMAIL}) için tek seferlik başlangıç şifresi: ${initialAdminPass}`);
  }
  const seededUsers: StoredUser[] = INITIAL_PROFILES.map((p) => ({
    ...p,
    passwordHash: p.isAdmin
      ? hashPassword(initialAdminPass)
      : hashPassword(crypto.randomBytes(12).toString('base64url')),
  }));

  return {
    animes: ANIME_CATALOG,
    users: seededUsers,
    sessions: {},
    comments: INITIAL_COMMENTS,
    tickerItems: INITIAL_TICKER,
    rooms: INITIAL_ROOMS,
    watchProgress: {},
    watchlists: {},
    favorites: {},
    ratings: {},
    friends: {},
    profileLikes: {},
    directMessages: [],
    premiumPlans: INITIAL_PREMIUM_PLANS,
    giveaway: null,
    premiumOrders: [],
  };
}

function loadDb(): DatabaseSchema {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(DB_PATH)) {
    const initial = createInitialDb();
    fs.writeFileSync(DB_PATH, JSON.stringify(initial, null, 2), 'utf-8');
    return initial;
  }
  try {
    const raw = fs.readFileSync(DB_PATH, 'utf-8');
    const parsed = JSON.parse(raw) as DatabaseSchema;
    if (!Array.isArray(parsed.animes) || !Array.isArray(parsed.users)) {
      const initial = createInitialDb();
      fs.writeFileSync(DB_PATH, JSON.stringify(initial, null, 2), 'utf-8');
      return initial;
    }
    let changed = false;
    parsed.users = parsed.users.map((u) => {
      const isPrimaryAdmin =
        u.id === 'wanderer' || u.email?.toLowerCase() === ADMIN_EMAIL;
      if (u.id === 'wanderer' && u.email !== ADMIN_EMAIL) {
        changed = true;
        return { ...u, email: ADMIN_EMAIL, isAdmin: true, roleBadge: 'Yönetici' };
      }
      if (!isPrimaryAdmin && (u.isAdmin || u.roleBadge === 'Yönetici')) {
        changed = true;
        return { ...u, isAdmin: false, roleBadge: undefined };
      }
      return u;
    });
    const legacyFakeTicks = new Set(['tick-1', 'tick-2', 'tick-3', 'tick-4', 'tick-5']);
    const legacyFakeComments = new Set(['c-1', 'c-2']);
    if (Array.isArray(parsed.tickerItems) && parsed.tickerItems.some((t) => legacyFakeTicks.has(t.id))) {
      parsed.tickerItems = parsed.tickerItems.filter((t) => !legacyFakeTicks.has(t.id));
      changed = true;
    }
    if (Array.isArray(parsed.comments) && parsed.comments.some((c) => legacyFakeComments.has(c.id))) {
      parsed.comments = parsed.comments.filter((c) => !legacyFakeComments.has(c.id));
      changed = true;
    }
    const legacySeedAnimeIds = new Set([
      'solo-leveling',
      'attack-on-titan',
      'demon-slayer',
      'frieren',
      'apothecary-diaries',
      'one-piece',
      'naruto',
      'bleach',
      'naruto-shippuden',
      'death-note',
      'black-clover',
      'jujutsu-kaisen',
      'my-hero-academia',
      'dororo',
    ]);
    if (parsed.animes.some((a) => legacySeedAnimeIds.has(a.id))) {
      parsed.animes = parsed.animes.filter((a) => !legacySeedAnimeIds.has(a.id));
      changed = true;
    }
    if (Array.isArray(parsed.rooms) && parsed.rooms.some((r) => r.code === 'XIR742')) {
      parsed.rooms = parsed.rooms.filter((r) => r.code !== 'XIR742');
      changed = true;
    }
    const legacyFakeUserIds = new Set(['kawaiinekocahn', 'sarenmygd', 'sweet']);
    if (parsed.users.some((u) => legacyFakeUserIds.has(u.id))) {
      parsed.users = parsed.users.filter((u) => !legacyFakeUserIds.has(u.id));
      changed = true;
    }
    if (!parsed.profileLikes) {
      parsed.profileLikes = {};
      changed = true;
    }
    if (!Array.isArray(parsed.premiumPlans) || parsed.premiumPlans.length === 0) {
      parsed.premiumPlans = INITIAL_PREMIUM_PLANS;
      changed = true;
    }
    if (parsed.giveaway === undefined) {
      parsed.giveaway = null;
      changed = true;
    }
    if (!Array.isArray(parsed.premiumOrders)) {
      parsed.premiumOrders = [];
      changed = true;
    }
    if (!Array.isArray(parsed.directMessages)) {
      parsed.directMessages = [];
      changed = true;
    }
    const activeAnimeIds = new Set(parsed.animes.map((a) => a.id));
    parsed.users = parsed.users.map((u) => {
      const nextFavs = (u.favoriteAnimeIds ?? []).filter((id) => activeAnimeIds.has(id));
      const nextWatch = (u.watchlistIds ?? []).filter((id) => activeAnimeIds.has(id));
      const nextFriendsCount = u.id === 'wanderer' && u.friendsCount === 205 ? 0 : u.friendsCount;
      const needsAdminOnboarding =
        u.id === 'wanderer' && (u.onboardingCompleted === undefined || !u.privacyAcceptedAt);
      if (
        nextFavs.length !== (u.favoriteAnimeIds ?? []).length ||
        nextWatch.length !== (u.watchlistIds ?? []).length ||
        nextFriendsCount !== u.friendsCount ||
        needsAdminOnboarding
      ) {
        changed = true;
        return {
          ...u,
          favoriteAnimeIds: nextFavs,
          watchlistIds: nextWatch,
          friendsCount: nextFriendsCount,
          ...(needsAdminOnboarding
            ? {
                privacyAcceptedAt: u.privacyAcceptedAt ?? '2026-01-01T00:00:00.000Z',
                onboardingCompleted: true,
                favoriteGenres: u.favoriteGenres ?? ['Aksiyon', 'Gizem', 'Fantezi'],
                topAnimePicks: u.topAnimePicks ?? [],
              }
            : {}),
        };
      }
      return u;
    });
    if (changed) {
      fs.writeFileSync(DB_PATH, JSON.stringify(parsed, null, 2), 'utf-8');
    }
    return parsed;
  } catch {
    const initial = createInitialDb();
    fs.writeFileSync(DB_PATH, JSON.stringify(initial, null, 2), 'utf-8');
    return initial;
  }
}

let db: DatabaseSchema = loadDb();

const VIEWER_TTL_MS = 45_000;
const activeViewers = new Map<string, number>();

function getLiveViewerCount(): number {
  const now = Date.now();
  for (const [cid, lastSeen] of activeViewers.entries()) {
    if (now - lastSeen > VIEWER_TTL_MS) {
      activeViewers.delete(cid);
    }
  }
  return activeViewers.size;
}

function touchViewer(clientId?: string): number {
  const clean = (clientId ?? '').trim();
  if (clean) {
    activeViewers.set(clean, Date.now());
  }
  return getLiveViewerCount();
}

function saveDb() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf-8');
}

function sanitizeUser(u: StoredUser, viewerId?: string): CommunityProfile {
  const { passwordHash: _pw, email, ...safe } = u;
  const likers = db.profileLikes?.[u.id] ?? [];
  return {
    ...safe,
    ...(viewerId && viewerId === u.id && email ? { email } : {}),
    likesCount: likers.length,
    likedByMe: viewerId ? likers.includes(viewerId) : false,
  };
}

function stripHtml(text?: string | null): string {
  if (!text) return '';
  return text
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&amp;/g, '&')
    .trim();
}

function sanitizeVideoSource(input?: string): string {
  const trimmed = (input ?? '').trim();
  if (!trimmed) return '';
  let candidate = trimmed;
  if (trimmed.startsWith('<')) {
    if (!/^<iframe\b/i.test(trimmed)) {
      throw new Error('Yalnızca HTTPS video linki veya <iframe src="..."> gömme kodu kabul edilir.');
    }
    const match = trimmed.match(/\ssrc\s*=\s*(["'])(.*?)\1/i);
    if (!match?.[2]) {
      throw new Error('Iframe içinde geçerli bir src bağlantısı bulunamadı.');
    }
    candidate = match[2].replace(/&amp;/gi, '&').trim();
  }
  let parsed: URL;
  try {
    parsed = new URL(candidate);
  } catch {
    throw new Error('Geçerli bir HTTPS video bağlantısı gir.');
  }
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    throw new Error('Video bağlantısı HTTP veya HTTPS olmalıdır.');
  }
  const host = parsed.hostname.toLowerCase();
  if (host.includes('sibnet.ru') && !parsed.pathname.includes('shell.php')) {
    const vidMatch = parsed.pathname.match(/video(\d+)/i);
    if (vidMatch?.[1]) {
      return `https://video.sibnet.ru/shell.php?videoid=${vidMatch[1]}`;
    }
  }
  if ((host === 'www.youtube.com' || host === 'youtube.com') && parsed.pathname === '/watch') {
    const v = parsed.searchParams.get('v');
    if (v) return `https://www.youtube-nocookie.com/embed/${v}`;
  }
  if (host === 'youtu.be' && parsed.pathname.length > 1) {
    return `https://www.youtube-nocookie.com/embed/${parsed.pathname.slice(1)}`;
  }
  return parsed.href;
}

function normalizeSubtitleVtt(raw?: string): string {
  const clean = (raw ?? '').replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n').trim();
  if (!clean) return '';
  if (clean.startsWith('http://') || clean.startsWith('https://')) {
    return clean;
  }
  const normalizedTimestamps = clean.replace(/(\d{2}:\d{2}:\d{2}),(\d{3})/g, '$1.$2');
  return normalizedTimestamps.startsWith('WEBVTT')
    ? normalizedTimestamps
    : `WEBVTT\n\n${normalizedTimestamps}`;
}

interface AuthedRequest extends Request {
  user?: StoredUser;
  sessionToken?: string;
}

function attachAuth(req: AuthedRequest, _res: Response, next: NextFunction) {
  const token = (req.headers['x-session-token'] as string) || '';
  if (token && db.sessions[token]) {
    const userId = db.sessions[token];
    const user = db.users.find((u) => u.id === userId);
    if (user) {
      req.user = user;
      req.sessionToken = token;
    }
  }
  next();
}

function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  if (!req.user) {
    res.status(401).json({ error: 'Bu işlem için giriş yapmalısın.' });
    return;
  }
  next();
}

function requireAdmin(req: AuthedRequest, res: Response, next: NextFunction) {
  if (!req.user) {
    res.status(401).json({ error: 'Giriş yapmalısın.' });
    return;
  }
  if (!req.user.isAdmin) {
    res.status(403).json({ error: 'Bu işlem için Yönetici yetkisi gerekli.' });
    return;
  }
  next();
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '2mb' }));
  app.use(attachAuth);

  function resolveGiveawayIfExpired() {
    if (!db.giveaway || !db.giveaway.active) return;
    if (Date.now() < new Date(db.giveaway.endsAt).getTime()) return;
    const participants = db.giveaway.participantIds ?? [];
    if (participants.length > 0) {
      const winnerId = participants[Math.floor(Math.random() * participants.length)];
      const winner = db.users.find((u) => u.id === winnerId);
      if (winner) {
        winner.isPremium = true;
        winner.premiumPlanName = db.giveaway.prizeLabel;
        if (!winner.badges.some((b) => b.type === 'gift')) {
          winner.badges.push({ id: `gift-${Date.now()}`, label: 'Premium Hediye', type: 'gift' });
        }
        db.giveaway.winnerId = winner.id;
        db.giveaway.winnerName = winner.displayName;
        db.giveaway.winnerHandle = winner.handle;
      }
    }
    db.giveaway.active = false;
    saveDb();
  }

  function formatGiveawayForClient(g?: PremiumGiveaway | null): PremiumGiveaway | null {
    if (!g) return null;
    return {
      ...g,
      participantNames: (g.participantIds ?? [])
        .map((id) => {
          const u = db.users.find((x) => x.id === id);
          return u ? { id: u.id, displayName: u.displayName, handle: u.handle } : null;
        })
        .filter((x): x is NonNullable<typeof x> => Boolean(x)),
    };
  }

  // 1. Bootstrap initial state & real active presence
  app.get('/api/bootstrap', (req: AuthedRequest, res: Response) => {
    resolveGiveawayIfExpired();
    const user = req.user ? sanitizeUser(req.user, req.user.id) : null;
    const uid = req.user?.id ?? 'guest';
    const clientId = (req.headers['x-client-id'] as string) || '';
    const liveViewerCount = touchViewer(clientId);
    const visibleOrders = req.user?.isAdmin
      ? db.premiumOrders ?? []
      : (db.premiumOrders ?? []).filter((o) => o.userId === req.user?.id);
    const userDirectMessages = req.user
      ? (db.directMessages ?? []).filter(
          (m) => m.senderId === req.user!.id || m.receiverId === req.user!.id
        )
      : [];
    res.json({
      animes: db.animes,
      profiles: db.users.map((u) => sanitizeUser(u, req.user?.id)),
      comments: db.comments,
      tickerItems: db.tickerItems,
      rooms: db.rooms,
      liveViewerCount,
      currentUser: user,
      watchlistIds: db.watchlists[uid] ?? (user ? user.watchlistIds : []),
      favoriteIds: db.favorites[uid] ?? (user ? user.favoriteAnimeIds : []),
      watchProgressMap: db.watchProgress[uid] ?? {},
      ratings: db.ratings[uid] ?? {},
      friendsIds: db.friends[uid] ?? [],
      directMessages: userDirectMessages,
      premiumPlans: db.premiumPlans ?? INITIAL_PREMIUM_PLANS,
      giveaway: formatGiveawayForClient(db.giveaway),
      premiumOrders: visibleOrders,
    });
  });

  app.post('/api/presence/ping', (req: AuthedRequest, res: Response) => {
    const clientId = String(req.body?.clientId ?? req.headers['x-client-id'] ?? '');
    const liveViewerCount = touchViewer(clientId);
    const userDirectMessages = req.user
      ? (db.directMessages ?? []).filter(
          (m) => m.senderId === req.user!.id || m.receiverId === req.user!.id
        )
      : undefined;
    res.json({
      liveViewerCount,
      tickerItems: db.tickerItems,
      comments: db.comments,
      ...(userDirectMessages !== undefined ? { directMessages: userDirectMessages } : {}),
    });
  });

  app.post('/api/presence/leave', (req: Request, res: Response) => {
    const clientId = String(req.body?.clientId ?? req.headers['x-client-id'] ?? '').trim();
    if (clientId) activeViewers.delete(clientId);
    res.json({ liveViewerCount: getLiveViewerCount() });
  });

  // 2. Authentication
  app.post('/api/auth/login', (req: Request, res: Response) => {
    const { identifier, password } = req.body as { identifier?: string; password?: string };
    const clean = (identifier ?? '').trim().toLowerCase();
    if (!clean || !password) {
      res.status(400).json({ error: 'Kullanıcı adı/e-posta ve şifre gerekli.' });
      return;
    }

    const found = db.users.find(
      (u) =>
        u.handle.toLowerCase() === clean ||
        u.handle.replace('@', '').toLowerCase() === clean ||
        (u.email && u.email.toLowerCase() === clean)
    );

    if (!found) {
      res.status(401).json({ error: 'Bu kullanıcı adına veya e-postaya ait hesap bulunamadı.' });
      return;
    }

    if (!found.passwordHash || !verifyPassword(password, found.passwordHash)) {
      res.status(401).json({ error: 'Şifre hatalı.' });
      return;
    }

    // Upgrade legacy static-salt hash to per-user random salt
    if (!found.passwordHash.includes(':')) {
      found.passwordHash = hashPassword(password);
    }

    const token = crypto.randomBytes(24).toString('hex');
    db.sessions[token] = found.id;
    saveDb();

    res.json({
      token,
      user: sanitizeUser(found, found.id),
    });
  });

  app.post('/api/auth/google', (_req: Request, res: Response) => {
    res.status(503).json({
      error: 'Google ile giriş doğrulaması henüz etkinleştirilmedi. Lütfen e-posta ve şifre ile giriş yapın.',
    });
  });

  app.post('/api/auth/register', (req: Request, res: Response) => {
    const { email, handle, displayName, password, avatarUrl, bannerUrl, accentColor } = req.body;
    const cleanEmail = String(email ?? '').trim().toLowerCase();
    const cleanHandle = String(handle ?? '')
      .trim()
      .toLowerCase()
      .replace(/^@/, '');
    const rawPassword = String(password ?? '');

    if (!cleanEmail || /[çğıöşü]/i.test(cleanEmail) || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(cleanEmail)) {
      res.status(400).json({ error: 'Geçerli bir e-posta adresi gir. Türkçe karakter kullanılamaz.' });
      return;
    }
    if (cleanHandle.length < 3) {
      res.status(400).json({ error: 'Kullanıcı adı en az 3 karakter olmalı.' });
      return;
    }
    if (rawPassword.length < 6) {
      res.status(400).json({ error: 'Şifre en az 6 karakter olmalı.' });
      return;
    }
    if (db.users.some((u) => u.email && u.email.toLowerCase() === cleanEmail)) {
      res.status(409).json({ error: 'Bu e-posta adresi zaten kayıtlı.' });
      return;
    }
    if (db.users.some((u) => u.handle.replace('@', '').toLowerCase() === cleanHandle)) {
      res.status(409).json({ error: 'Bu kullanıcı adı zaten alınmış.' });
      return;
    }

    const newUser: StoredUser = {
      id: `user-${Date.now()}`,
      displayName: String(displayName ?? '').trim() || cleanHandle,
      handle: `@${cleanHandle}`,
      email: cleanEmail,
      isAdmin: false,
      avatarUrl: avatarUrl || REAL_CHARACTER_AVATARS[0].avatarUrl,
      bannerUrl: bannerUrl || REAL_CHARACTER_AVATARS[0].bannerUrl,
      accentColor: accentColor || 'crimson',
      badges: [{ id: `early-${Date.now()}`, label: 'Erken Destekçi', type: 'early' }],
      bio: 'AnimeXir üyesi · Yeni seriler keşfediyor.',
      watchedEpisodes: 0,
      favoriteAnimeIds: [],
      watchlistIds: [],
      friendsCount: 0,
      onboardingCompleted: false,
      favoriteGenres: [],
      topAnimePicks: [],
      profileComments: [],
      passwordHash: hashPassword(rawPassword),
    };

    db.users.unshift(newUser);
    const token = crypto.randomBytes(24).toString('hex');
    db.sessions[token] = newUser.id;
    saveDb();

    res.status(201).json({
      token,
      user: sanitizeUser(newUser
