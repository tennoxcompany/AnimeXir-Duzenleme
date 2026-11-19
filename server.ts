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
      user: sanitizeUser(newUser, newUser.id),
    });
  });

  app.post('/api/auth/change-password', requireAuth, (req: AuthedRequest, res: Response) => {
    const user = req.user!;
    const currentPassword = String(req.body?.currentPassword ?? '');
    const newPassword = String(req.body?.newPassword ?? '');

    if (!currentPassword || !newPassword) {
      res.status(400).json({ error: 'Mevcut şifre ve yeni şifre gerekli.' });
      return;
    }
    if (newPassword.length < 8) {
      res.status(400).json({ error: 'Yeni şifre en az 8 karakter olmalı.' });
      return;
    }
    if (user.passwordHash && !verifyPassword(currentPassword, user.passwordHash)) {
      res.status(401).json({ error: 'Mevcut şifre hatalı.' });
      return;
    }

    user.passwordHash = hashPassword(newPassword);
    // Invalidate all other active sessions for this user for safety
    const currentToken = req.sessionToken;
    for (const [tok, uid] of Object.entries(db.sessions)) {
      if (uid === user.id && tok !== currentToken) {
        delete db.sessions[tok];
      }
    }
    saveDb();
    res.json({ ok: true });
  });

  app.post('/api/auth/logout', (req: AuthedRequest, res: Response) => {
    if (req.sessionToken) {
      delete db.sessions[req.sessionToken];
      saveDb();
    }
    res.json({ ok: true });
  });

  // 3. AniList Live GraphQL Search & Real Character Avatars
  app.get('/api/anilist/search', async (req: Request, res: Response) => {
    const q = String(req.query.q ?? '').trim();
    const isPopular = req.query.popular === '1' || !q;
    if (!q && req.query.popular !== '1') {
      res.json({ results: [] });
      return;
    }
    const query = isPopular
      ? `
      query {
        Page(page: 1, perPage: 12) {
          media(type: ANIME, sort: POPULARITY_DESC) {
            id
            title { romaji english native }
            coverImage { extraLarge large }
            bannerImage
            description(asHtml: false)
            studios(isMain: true) { nodes { name } }
            status
            seasonYear
            averageScore
            episodes
            genres
            tags { name rank }
            trailer { id site }
          }
        }
      }
    `
      : `
      query ($search: String) {
        Page(page: 1, perPage: 12) {
          media(search: $search, type: ANIME, sort: POPULARITY_DESC) {
            id
            title { romaji english native }
            coverImage { extraLarge large }
            bannerImage
            description(asHtml: false)
            studios(isMain: true) { nodes { name } }
            status
            seasonYear
            averageScore
            episodes
            genres
            tags { name rank }
            trailer { id site }
          }
        }
      }
    `;
    try {
      const response = await fetch('https://graphql.anilist.co', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(isPopular ? { query } : { query, variables: { search: q } }),
      });
      const json = (await response.json()) as {
        data?: {
          Page?: {
            media?: Array<{
              id: number;
              title: { romaji?: string; english?: string };
              coverImage: { extraLarge?: string; large?: string };
              bannerImage?: string;
              description?: string;
              studios?: { nodes?: Array<{ name: string }> };
              status?: string;
              seasonYear?: number;
              averageScore?: number;
              episodes?: number;
              genres?: string[];
              tags?: Array<{ name: string; rank?: number }>;
              trailer?: { id: string; site: string };
            }>;
          };
        };
      };
      const mediaList = json.data?.Page?.media ?? [];
      const results: AniListSearchResult[] = mediaList.map((m) => {
        const mappedGenres = (m.genres || ['Aksiyon']).map((g) => ANILIST_GENRE_TR[g] || g);
        const hasSchoolTag = (m.tags ?? []).some((t) => t.name === 'School' && (t.rank ?? 0) >= 60);
        if (hasSchoolTag && !mappedGenres.includes('Okul')) {
          mappedGenres.push('Okul');
        }
        return {
          id: m.id,
          title: m.title.english || m.title.romaji || 'İsimsiz Anime',
          romajiTitle: m.title.romaji || '',
          coverUrl: m.coverImage.extraLarge || m.coverImage.large || '',
          bannerUrl: m.bannerImage || m.coverImage.extraLarge || m.coverImage.large || '',
          description: stripHtml(m.description),
          studio: m.studios?.nodes?.[0]?.name || 'Bilinmeyen Stüdyo',
          status: m.status === 'RELEASING' ? 'Devam Ediyor' : 'Tamamlandı',
          year: m.seasonYear || 2024,
          score: m.averageScore ? Number((m.averageScore / 10).toFixed(1)) : 8.0,
          episodeCount: m.episodes || 12,
          genres: mappedGenres,
          trailerId: m.trailer?.site === 'youtube' ? m.trailer.id : undefined,
        };
      });
      res.json({ results });
    } catch {
      res.status(502).json({ error: 'AniList sunucusuna ulaşılamadı.' });
    }
  });

  app.get('/api/anilist/characters', async (req: Request, res: Response) => {
    const q = String(req.query.q ?? '').trim();
    if (!q) {
      res.json({ characters: REAL_CHARACTER_AVATARS });
      return;
    }
    const query = `
      query ($search: String) {
        Page(page: 1, perPage: 12) {
          characters(search: $search, sort: FAVOURITES_DESC) {
            id
            name { full }
            image { large }
            media(perPage: 1, type: ANIME, sort: POPULARITY_DESC) {
              nodes { title { english romaji } bannerImage coverImage { extraLarge } }
            }
          }
        }
      }
    `;
    try {
      const response = await fetch('https://graphql.anilist.co', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, variables: { search: q } }),
      });
      const json = (await response.json()) as {
        data?: {
          Page?: {
            characters?: Array<{
              id: number;
              name: { full: string };
              image: { large?: string };
              media?: {
                nodes?: Array<{
                  title?: { english?: string; romaji?: string };
                  bannerImage?: string;
                  coverImage?: { extraLarge?: string };
                }>;
              };
            }>;
          };
        };
      };
      const chars = (json.data?.Page?.characters ?? []).map((c) => {
        const media = c.media?.nodes?.[0];
        return {
          id: `anilist-char-${c.id}`,
          name: c.name.full,
          anime: media?.title?.english || media?.title?.romaji || 'Anime',
          avatarUrl: c.image.large || REAL_CHARACTER_AVATARS[0].avatarUrl,
          bannerUrl:
            media?.bannerImage ||
            media?.coverImage?.extraLarge ||
            REAL_CHARACTER_AVATARS[0].bannerUrl,
        };
      });
      res.json({ characters: chars });
    } catch {
      res.json({ characters: REAL_CHARACTER_AVATARS });
    }
  });

  // 4. Admin-Only Anime & Episode Management (requireAdmin!)
  app.post('/api/admin/animes/import', requireAdmin, (req: AuthedRequest, res: Response) => {
    const item = req.body as AniListSearchResult & {
      customTitle?: string;
      customSynopsis?: string;
      logoUrl?: string;
      hasDub?: boolean;
      featured?: boolean;
      firstEpisodeVideoUrl?: string;
      firstEpisodeSubtitleVtt?: string;
    };

    if (!item || !item.id) {
      res.status(400).json({ error: 'Geçersiz AniList verisi.' });
      return;
    }

    const totalEps = Math.min(Math.max(item.episodeCount || 12, 1), 100);
    const existingIdx = db.animes.findIndex((a) => a.anilistId === item.id);
    const animeId =
      existingIdx >= 0
        ? db.animes[existingIdx].id
        : `${item.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${item.id}`;

    const existingEpisodes = existingIdx >= 0 ? db.animes[existingIdx].episodes : [];
    const episodes: Episode[] = Array.from({ length: totalEps }, (_, i) => {
      const num = i + 1;
      const old = existingEpisodes.find((e) => e.number === num);
      let firstVideo = old?.videoUrl;
      if (num === 1 && item.firstEpisodeVideoUrl) {
        firstVideo = sanitizeVideoSource(item.firstEpisodeVideoUrl);
      }
      return {
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
        subtitleVtt:
          num === 1 && item.firstEpisodeSubtitleVtt
            ? normalizeSubtitleVtt(item.firstEpisodeSubtitleVtt)
            : old?.subtitleVtt,
      };
    });

    const title = (item.customTitle || item.title).trim();
    const cleanScore = item.score || 8.0;
    const newAnime: Anime = {
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
      synopsis: (item.customSynopsis || item.description || `${title} Türkçe altyazılı olarak AnimeXir’de.`).trim(),
      posterUrl: item.coverUrl,
      bannerUrl: item.bannerUrl || item.coverUrl,
      logoUrl: item.logoUrl?.trim() || undefined,
      trailerId: item.trailerId,
      broadcastDay: 'Cumartesi',
      broadcastTime: '20:00',
      studio: item.studio || 'Stüdyo',
      status: item.status || 'Devam Ediyor',
      episodes,
    };

    if (existingIdx >= 0) {
      db.animes[existingIdx] = {
        ...db.animes[existingIdx],
        ...newAnime,
        weeklyRank: db.animes[existingIdx].weeklyRank,
      };
    } else {
      db.animes.unshift(newAnime);
    }

    saveDb();
    res.json({ anime: newAnime, updated: existingIdx >= 0 });
  });

  app.patch('/api/admin/animes/:id', requireAdmin, (req: AuthedRequest, res: Response) => {
    const idx = db.animes.findIndex((a) => a.id === req.params.id);
    if (idx < 0) {
      res.status(404).json({ error: 'Anime bulunamadı.' });
      return;
    }
    const { title, synopsis, hasDub, featured, weeklyRank, genres } = req.body;
    db.animes[idx] = {
      ...db.animes[idx],
      ...(title !== undefined ? { title, stylizedTitle: String(title).toUpperCase() } : {}),
      ...(synopsis !== undefined ? { synopsis } : {}),
      ...(hasDub !== undefined ? { hasDub: Boolean(hasDub) } : {}),
      ...(featured !== undefined ? { featured: Boolean(featured) } : {}),
      ...(weeklyRank !== undefined ? { weeklyRank: weeklyRank ? Number(weeklyRank) : undefined } : {}),
      ...(Array.isArray(genres) ? { genres } : {}),
    };
    saveDb();
    res.json({ anime: db.animes[idx] });
  });

  app.delete('/api/admin/animes/:id', requireAdmin, (req: AuthedRequest, res: Response) => {
    db.animes = db.animes.filter((a) => a.id !== req.params.id);
    saveDb();
    res.json({ ok: true });
  });

  app.put('/api/admin/animes/:animeId/episodes/:epNum', requireAdmin, (req: AuthedRequest, res: Response) => {
    const anime = db.animes.find((a) => a.id === req.params.animeId);
    if (!anime) {
      res.status(404).json({ error: 'Anime bulunamadı.' });
      return;
    }
    const epNum = Number(req.params.epNum);
    const { title, videoUrl, dubVideoUrl, subtitleVtt, mirrors } = req.body as {
      title?: string;
      videoUrl?: string;
      dubVideoUrl?: string;
      subtitleVtt?: string;
      mirrors?: Array<{ id?: string; label?: string; url?: string; audio?: 'sub' | 'dub' }>;
    };

    let cleanVideo = '';
    let cleanDub = '';
    let cleanMirrors: EpisodeMirror[] = [];
    try {
      cleanVideo = sanitizeVideoSource(videoUrl);
      cleanDub = sanitizeVideoSource(dubVideoUrl);
      if (Array.isArray(mirrors)) {
        cleanMirrors = mirrors
          .map((m, idx) => {
            const url = sanitizeVideoSource(m?.url);
            if (!url) return null;
            return {
              id: String(m?.id || `mir-${Date.now()}-${idx}`),
              label: String(m?.label || `Kaynak ${idx + 1}`).trim(),
              url,
              audio: m?.audio === 'dub' ? 'dub' : 'sub',
            } satisfies EpisodeMirror;
          })
          .filter((x): x is EpisodeMirror => Boolean(x));
      }
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'Geçersiz video bağlantısı.' });
      return;
    }

    if (!cleanVideo) {
      const firstSubMirror = cleanMirrors.find((m) => m.audio === 'sub');
      if (firstSubMirror) cleanVideo = firstSubMirror.url;
    }
    if (!cleanDub) {
      const firstDubMirror = cleanMirrors.find((m) => m.audio === 'dub');
      if (firstDubMirror) cleanDub = firstDubMirror.url;
    }

    const cleanSub = normalizeSubtitleVtt(subtitleVtt);
    let ep = anime.episodes.find((e) => e.number === epNum);
    if (!ep) {
      ep = {
        id: `${anime.id}-ep-${epNum}`,
        animeId: anime.id,
        number: epNum,
        title: title?.trim() || `${epNum}. Bölüm`,
        duration: '24:00',
        durationSeconds: 1440,
        hasDub: Boolean(cleanDub),
        hasSub: true,
        releasedAt: 'Bugün',
        thumbnail: anime.bannerUrl,
      };
      anime.episodes.push(ep);
      anime.episodes.sort((a, b) => a.number - b.number);
      anime.latestEpisode = Math.max(anime.latestEpisode, epNum);
    }

    if (title !== undefined && title.trim()) ep.title = title.trim();
    ep.videoUrl = cleanVideo || undefined;
    ep.dubVideoUrl = cleanDub || undefined;
    ep.mirrors = cleanMirrors.length > 0 ? cleanMirrors : undefined;
    ep.subtitleVtt = cleanSub || undefined;
    ep.hasDub = Boolean(cleanDub) || anime.hasDub;

    saveDb();
    res.json({ episode: ep, anime });
  });

  app.put('/api/admin/animes/:animeId/episodes-bulk', requireAdmin, (req: AuthedRequest, res: Response) => {
    const anime = db.animes.find((a) => a.id === req.params.animeId);
    if (!anime) {
      res.status(404).json({ error: 'Anime bulunamadı.' });
      return;
    }
    const items = req.body?.items;
    if (!Array.isArray(items) || items.length === 0) {
      res.status(400).json({ error: 'En az 1 bölüm verisi gönderilmelidir.' });
      return;
    }

    let updatedCount = 0;
    try {
      for (const rawItem of items) {
        const epNum = Number(rawItem?.number);
        if (!Number.isFinite(epNum) || epNum < 1) continue;

        let ep = anime.episodes.find((e) => e.number === epNum);
        if (!ep) {
          ep = {
            id: `${anime.id}-ep-${epNum}`,
            animeId: anime.id,
            number: epNum,
            title: `${epNum}. Bölüm`,
            duration: '24:00',
            durationSeconds: 1440,
            hasDub: false,
            hasSub: true,
            releasedAt: 'Bugün',
            thumbnail: anime.bannerUrl,
          };
          anime.episodes.push(ep);
        }

        if (rawItem.videoUrl !== undefined) {
          const clean = sanitizeVideoSource(rawItem.videoUrl);
          ep.videoUrl = clean || undefined;
        }
        if (rawItem.dubVideoUrl !== undefined) {
          const cleanDub = sanitizeVideoSource(rawItem.dubVideoUrl);
          ep.dubVideoUrl = cleanDub || undefined;
          ep.hasDub = Boolean(cleanDub) || ep.hasDub || anime.hasDub;
        }
        if (rawItem.mirror && rawItem.mirror.url) {
          const cleanMirrorUrl = sanitizeVideoSource(rawItem.mirror.url);
          if (cleanMirrorUrl) {
            const label = String(rawItem.mirror.label || 'Yedek').trim();
            const audio: 'sub' | 'dub' = rawItem.mirror.audio === 'dub' ? 'dub' : 'sub';
            const existingMirrors = ep.mirrors ? [...ep.mirrors] : [];
            const idx = existingMirrors.findIndex(
              (m) => m.label.toLowerCase() === label.toLowerCase() && m.audio === audio
            );
            const nextMirror: EpisodeMirror = {
              id: idx >= 0 ? existingMirrors[idx].id : `mir-${Date.now()}-${epNum}-${existingMirrors.length}`,
              label,
              url: cleanMirrorUrl,
              audio,
            };
            if (idx >= 0) existingMirrors[idx] = nextMirror;
            else existingMirrors.push(nextMirror);
            ep.mirrors = existingMirrors;
            if (audio === 'dub') ep.hasDub = true;
          }
        }
        if (rawItem.subtitleVtt !== undefined) {
          const cleanSub = normalizeSubtitleVtt(rawItem.subtitleVtt);
          ep.subtitleVtt = cleanSub || undefined;
        }

        updatedCount += 1;
      }
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'Geçersiz bölüm bağlantısı.' });
      return;
    }

    anime.episodes.sort((a, b) => a.number - b.number);
    if (anime.episodes.length > 0) {
      anime.latestEpisode = Math.max(
        anime.latestEpisode,
        anime.episodes[anime.episodes.length - 1].number
      );
    }

    saveDb();
    res.json({ updatedCount, anime });
  });

  app.get('/api/subtitle-proxy', async (req: Request, res: Response) => {
    const rawUrl = String(req.query.url ?? '').trim();
    if (!rawUrl) {
      res.status(400).send('URL gerekli.');
      return;
    }
    let parsed: URL;
    try {
      parsed = new URL(rawUrl);
    } catch {
      res.status(400).send('Geçersiz altyazı URL.');
      return;
    }
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
      res.status(400).send('Yalnızca HTTP/HTTPS desteklenir.');
      return;
    }
    try {
      const upstream = await fetch(parsed.href);
      if (!upstream.ok) {
        res.status(502).send('Altyazı dosyası indirilemedi.');
        return;
      }
      const text = await upstream.text();
      const vtt = normalizeSubtitleVtt(text);
      res.setHeader('Content-Type', 'text/vtt; charset=utf-8');
      res.send(vtt);
    } catch {
      res.status(502).send('Altyazı sunucusuna ulaşılamadı.');
    }
  });

  app.get('/api/image-proxy', async (req: Request, res: Response) => {
    const rawUrl = String(req.query.url ?? '').trim();
    if (!rawUrl) {
      res.status(400).send('URL gerekli.');
      return;
    }
    let parsed: URL;
    try {
      parsed = new URL(rawUrl);
    } catch {
      res.status(400).send('Geçersiz görsel URL.');
      return;
    }
    const lowerHost = parsed.hostname.toLowerCase();
    if (
      (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') ||
      lowerHost === 'localhost' ||
      lowerHost === '127.0.0.1' ||
      lowerHost === '0.0.0.0' ||
      lowerHost === '::1' ||
      lowerHost === '169.254.169.254' ||
      lowerHost.endsWith('.local') ||
      /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(lowerHost)
    ) {
      res.status(400).send('Bu URL desteklenmiyor.');
      return;
    }
    try {
      const upstream = await fetch(parsed.href, { headers: { Accept: 'image/*' } });
      if (!upstream.ok) {
        res.status(502).send('Görsel indirilemedi.');
        return;
      }
      const contentType = upstream.headers.get('content-type') || '';
      if (!contentType.startsWith('image/')) {
        res.status(400).send('Geçersiz görsel formatı.');
        return;
      }
      const buf = Buffer.from(await upstream.arrayBuffer());
      if (buf.byteLength > 5 * 1024 * 1024) {
        res.status(413).send('Görsel 5MB sınırını aşıyor.');
        return;
      }
      res.setHeader('Content-Type', contentType);
      res.setHeader('Cache-Control', 'public, max-age=86400');
      res.send(buf);
    } catch {
      res.status(502).send('Görsel sunucusuna ulaşılamadı.');
    }
  });

  // 5. User Profile, Progress, Comments, Rooms
  app.patch('/api/profile', requireAuth, (req: AuthedRequest, res: Response) => {
    const user = req.user!;
    const { bio, avatarUrl, bannerUrl, accentColor, displayName } = req.body;
    if (bio !== undefined) user.bio = String(bio);
    if (avatarUrl !== undefined) user.avatarUrl = String(avatarUrl);
    if (bannerUrl !== undefined) user.bannerUrl = String(bannerUrl);
    if (accentColor !== undefined) user.accentColor = accentColor;
    if (displayName !== undefined && String(displayName).trim()) {
      user.displayName = String(displayName).trim();
    }
    saveDb();
    res.json({ user: sanitizeUser(user, user.id) });
  });

  app.patch('/api/profile/onboarding', requireAuth, (req: AuthedRequest, res: Response) => {
    const user = req.user!;
    const { acceptPrivacy, favoriteGenres, topAnimePicks, onboardingCompleted } = req.body as {
      acceptPrivacy?: boolean;
      favoriteGenres?: string[];
      topAnimePicks?: TopAnimePick[];
      onboardingCompleted?: boolean;
    };

    if (acceptPrivacy && !user.privacyAcceptedAt) {
      user.privacyAcceptedAt = new Date().toISOString();
    }
    if (Array.isArray(favoriteGenres)) {
      user.favoriteGenres = favoriteGenres
        .map((g) => String(g).trim())
        .filter(Boolean)
        .slice(0, 12);
    }
    if (Array.isArray(topAnimePicks)) {
      const cleanedPicks: TopAnimePick[] = topAnimePicks
        .slice(0, 3)
        .filter((p) => p && p.id && p.title)
        .map((p) => ({
          id: String(p.id),
          anilistId: p.anilistId ? Number(p.anilistId) : undefined,
          title: String(p.title),
          posterUrl: String(p.posterUrl || ''),
          genres: Array.isArray(p.genres) ? p.genres.map(String) : [],
          score: typeof p.score === 'number' ? p.score : undefined,
        }));
      user.topAnimePicks = cleanedPicks;

      // Sync any selected anime that exists in the local catalog into favoriteAnimeIds
      const catalogIds = new Set(db.animes.map((a) => a.id));
      const matchedLocalIds = cleanedPicks
        .filter((p) => catalogIds.has(p.id))
        .map((p) => p.id);
      if (matchedLocalIds.length > 0) {
        const mergedFavs = Array.from(new Set([...(db.favorites[user.id] ?? user.favoriteAnimeIds ?? []), ...matchedLocalIds]));
        db.favorites[user.id] = mergedFavs;
        user.favoriteAnimeIds = mergedFavs;
      }
    }
    if (typeof onboardingCompleted === 'boolean') {
      user.onboardingCompleted = onboardingCompleted;
    }

    saveDb();
    res.json({
      user: sanitizeUser(user, user.id),
      favoriteIds: db.favorites[user.id] ?? user.favoriteAnimeIds ?? [],
    });
  });

  app.post('/api/friends/:id/toggle', requireAuth, (req: AuthedRequest, res: Response) => {
    const uid = req.user!.id;
    const target = db.users.find((u) => u.id === req.params.id);
    if (!target) {
      res.status(404).json({ error: 'Kullanıcı bulunamadı.' });
      return;
    }
    if (target.id === uid) {
      res.status(400).json({ error: 'Kendini arkadaş olarak ekleyemezsin.' });
      return;
    }
    const myFriends = db.friends[uid] ?? [];
    const exists = myFriends.includes(target.id);
    const nextFriends = exists
      ? myFriends.filter((id) => id !== target.id)
      : [...myFriends, target.id];
    db.friends[uid] = nextFriends;
    req.user!.friendsCount = nextFriends.length;
    saveDb();
    res.json({
      friendsIds: nextFriends,
      added: !exists,
      friendsCount: nextFriends.length,
    });
  });

  app.get('/api/dm/:peerId', requireAuth, (req: AuthedRequest, res: Response) => {
    const uid = req.user!.id;
    const peerId = req.params.peerId;
    const convKey = [uid, peerId].sort().join('__');
    if (!db.directMessages) db.directMessages = [];
    let changed = false;
    const messages = db.directMessages.filter((m) => {
      if (m.conversationKey !== convKey) return false;
      if (m.receiverId === uid && !m.readByReceiver) {
        m.readByReceiver = true;
        changed = true;
      }
      return true;
    });
    if (changed) saveDb();
    res.json({ messages });
  });

  app.post('/api/dm/:peerId', requireAuth, (req: AuthedRequest, res: Response) => {
    const uid = req.user!.id;
    const peer = db.users.find((u) => u.id === req.params.peerId);
    if (!peer) {
      res.status(404).json({ error: 'Kullanıcı bulunamadı.' });
      return;
    }
    if (peer.id === uid) {
      res.status(400).json({ error: 'Kendine DM gönderemezsin.' });
      return;
    }
    const text = String(req.body?.text ?? '').trim();
    if (!text) {
      res.status(400).json({ error: 'Mesaj boş olamaz.' });
      return;
    }
    if (!db.directMessages) db.directMessages = [];
    const convKey = [uid, peer.id].sort().join('__');
    const msg: DirectMessage = {
      id: `dm-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      conversationKey: convKey,
      senderId: uid,
      receiverId: peer.id,
      text,
      createdAt: new Date().toISOString(),
      readByReceiver: false,
    };
    db.directMessages.push(msg);
    saveDb();
    res.status(201).json({ message: msg });
  });

  app.post('/api/dm/:peerId/read', requireAuth, (req: AuthedRequest, res: Response) => {
    const uid = req.user!.id;
    const convKey = [uid, req.params.peerId].sort().join('__');
    let changed = false;
    for (const m of db.directMessages ?? []) {
      if (m.conversationKey === convKey && m.receiverId === uid && !m.readByReceiver) {
        m.readByReceiver = true;
        changed = true;
      }
    }
    if (changed) saveDb();
    res.json({ ok: true });
  });

  app.post('/api/profile/:id/like', requireAuth, (req: AuthedRequest, res: Response) => {
    const target = db.users.find((u) => u.id === req.params.id);
    if (!target) {
      res.status(404).json({ error: 'Kullanıcı bulunamadı.' });
      return;
    }
    if (target.id === req.user!.id) {
      res.status(400).json({ error: 'Kendi profilini beğenemezsin.' });
      return;
    }
    if (!db.profileLikes) db.profileLikes = {};
    const list = db.profileLikes[target.id] ?? [];
    const alreadyLiked = list.includes(req.user!.id);
    const nextList = alreadyLiked
      ? list.filter((id) => id !== req.user!.id)
      : [...list, req.user!.id];
    db.profileLikes[target.id] = nextList;
    saveDb();
    res.json({
      profileId: target.id,
      likesCount: nextList.length,
      likedByMe: !alreadyLiked,
    });
  });

  app.post('/api/profile/:id/comments', requireAuth, (req: AuthedRequest, res: Response) => {
    const target = db.users.find((u) => u.id === req.params.id);
    if (!target) {
      res.status(404).json({ error: 'Kullanıcı bulunamadı.' });
      return;
    }
    const text = String(req.body.text ?? '').trim();
    if (!text) {
      res.status(400).json({ error: 'Mesaj boş olamaz.' });
      return;
    }
    const comment = {
      id: `pc-${Date.now()}`,
      authorId: req.user!.id,
      authorName: req.user!.displayName,
      authorHandle: req.user!.handle,
      authorAvatar: req.user!.avatarUrl,
      text,
      createdAt: 'az önce',
    };
    target.profileComments.unshift(comment);
    saveDb();
    res.json({ comment });
  });

  app.post('/api/comments', requireAuth, (req: AuthedRequest, res: Response) => {
    const { animeId, episodeNumber, text, rating } = req.body;
    const clean = String(text ?? '').trim();
    if (!clean) {
      res.status(400).json({ error: 'Yorum boş olamaz.' });
      return;
    }
    const comment: EpisodeComment = {
      id: `ec-${Date.now()}`,
      animeId: String(animeId),
      episodeNumber: Number(episodeNumber) || 1,
      userId: req.user!.id,
      displayName: req.user!.displayName,
      handle: req.user!.handle,
      avatarUrl: req.user!.avatarUrl,
      text: clean,
      rating: rating ? Number(rating) : undefined,
      likes: 0,
      createdAt: 'şimdi',
    };
    db.comments.unshift(comment);

    const anime = db.animes.find((a) => a.id === comment.animeId);
    let tickerItem: LiveTickerItem | undefined;
    if (anime) {
      tickerItem = {
        id: `tick-${Date.now()}`,
        userId: req.user!.id,
        username: req.user!.handle.replace('@', ''),
        avatarUrl: req.user!.avatarUrl,
        animeId: anime.id,
        animeTitle: anime.title,
        episodeNumber: comment.episodeNumber,
        scoreLabel: comment.rating ? `${comment.rating}/10` : undefined,
        comment: clean,
      };
      db.tickerItems = [tickerItem, ...db.tickerItems.slice(0, 11)];
    }

    saveDb();
    res.json({ comment, tickerItem });
  });

  app.post('/api/comments/:id/like', (req: Request, res: Response) => {
    const c = db.comments.find((item) => item.id === req.params.id);
    if (!c) {
      res.status(404).json({ error: 'Yorum bulunamadı.' });
      return;
    }
    c.likedByMe = !c.likedByMe;
    c.likes += c.likedByMe ? 1 : -1;
    saveDb();
    res.json({ comment: c });
  });

  app.post('/api/progress', (req: AuthedRequest, res: Response) => {
    const uid = req.user?.id ?? 'guest';
    const { animeId, episodeNumber, currentTime, duration } = req.body;
    if (!db.watchProgress[uid]) db.watchProgress[uid] = {};
    db.watchProgress[uid][animeId] = {
      animeId,
      episodeNumber: Number(episodeNumber) || 1,
      currentTime: Number(currentTime) || 0,
      duration: Number(duration) || 1440,
      updatedAt: new Date().toISOString(),
    };
    saveDb();
    res.json({ ok: true });
  });

  app.post('/api/watchlist/toggle', requireAuth, (req: AuthedRequest, res: Response) => {
    const uid = req.user!.id;
    const animeId = String(req.body.animeId);
    const list = db.watchlists[uid] ?? req.user!.watchlistIds ?? [];
    const exists = list.includes(animeId);
    const next = exists ? list.filter((id) => id !== animeId) : [...list, animeId];
    db.watchlists[uid] = next;
    req.user!.watchlistIds = next;
    saveDb();
    res.json({ watchlistIds: next, added: !exists });
  });

  app.post('/api/favorites/toggle', requireAuth, (req: AuthedRequest, res: Response) => {
    const uid = req.user!.id;
    const animeId = String(req.body.animeId);
    const list = db.favorites[uid] ?? req.user!.favoriteAnimeIds ?? [];
    const exists = list.includes(animeId);
    const next = exists ? list.filter((id) => id !== animeId) : [...list, animeId];
    db.favorites[uid] = next;
    req.user!.favoriteAnimeIds = next;
    saveDb();
    res.json({ favoriteIds: next, added: !exists });
  });

  app.post('/api/ratings', requireAuth, (req: AuthedRequest, res: Response) => {
    const uid = req.user!.id;
    const { animeId, score } = req.body;
    if (!db.ratings[uid]) db.ratings[uid] = {};
    db.ratings[uid][String(animeId)] = Number(score);
    saveDb();
    res.json({ ratings: db.ratings[uid] });
  });

  app.post('/api/rooms', (req: AuthedRequest, res: Response) => {
    const { animeId, episodeNumber, name } = req.body;
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const code = Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    const hostName = req.user?.displayName ?? 'Misafir';
    const hostAvatar = req.user?.avatarUrl ?? REAL_CHARACTER_AVATARS[0].avatarUrl;
    const room: WatchPartyRoom = {
      code,
      name: String(name || 'Birlikte İzle Odası').trim(),
      hostName,
      hostAvatar,
      animeId: String(animeId),
      episodeNumber: Number(episodeNumber) || 1,
      viewerCount: 1,
      isPlaying: true,
      currentTime: 0,
      messages: [
        {
          id: `sys-${Date.now()}`,
          sender: 'Sistem',
          avatar: '',
          text: `${hostName} odayı oluşturdu. Oda kodu: ${code}`,
          time: 'şimdi',
          isSystem: true,
        },
      ],
    };
    db.rooms.unshift(room);
    saveDb();
    res.json({ room });
  });

  app.post('/api/rooms/:code/messages', (req: AuthedRequest, res: Response) => {
    const room = db.rooms.find((r) => r.code === req.params.code);
    if (!room) {
      res.status(404).json({ error: 'Oda bulunamadı.' });
      return;
    }
    const text = String(req.body.text ?? '').trim();
    if (!text) {
      res.status(400).json({ error: 'Mesaj boş olamaz.' });
      return;
    }
    const now = new Date();
    const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const msg = {
      id: `msg-${Date.now()}`,
      sender: req.user?.displayName ?? 'Misafir',
      avatar: req.user?.avatarUrl ?? REAL_CHARACTER_AVATARS[1].avatarUrl,
      text,
      time,
    };
    room.messages.push(msg);
    saveDb();
    res.json({ message: msg, room });
  });

  app.post('/api/rooms/:code/toggle', (req: Request, res: Response) => {
    const room = db.rooms.find((r) => r.code === req.params.code);
    if (!room) {
      res.status(404).json({ error: 'Oda bulunamadı.' });
      return;
    }
    room.isPlaying = !room.isPlaying;
    saveDb();
    res.json({ room });
  });

  app.post('/api/giveaway/join', requireAuth, (req: AuthedRequest, res: Response) => {
    resolveGiveawayIfExpired();
    if (!db.giveaway || !db.giveaway.active) {
      res.status(400).json({ error: 'Şu an aktif bir çekiliş bulunmuyor.' });
      return;
    }
    if (!db.giveaway.participantIds.includes(req.user!.id)) {
      db.giveaway.participantIds.push(req.user!.id);
      saveDb();
    }
    res.json({ giveaway: formatGiveawayForClient(db.giveaway) });
  });

  app.post('/api/admin/giveaway', requireAdmin, (req: AuthedRequest, res: Response) => {
    const { title, prizeLabel, durationHours } = req.body as {
      title?: string;
      prizeLabel?: string;
      durationHours?: number;
    };
    const hours = Math.min(Math.max(Number(durationHours) || 24, 1), 720);
    const now = new Date();
    const endsAt = new Date(now.getTime() + hours * 3600 * 1000);
    db.giveaway = {
      id: `gw-${Date.now()}`,
      active: true,
      title: String(title || `${hours} Saatlik Premium Çekilişi`).trim(),
      prizeLabel: String(prizeLabel || '1 Aylık Xir Pro').trim(),
      durationHours: hours,
      startedAt: now.toISOString(),
      endsAt: endsAt.toISOString(),
      participantIds: [],
    };
    saveDb();
    res.json({ giveaway: formatGiveawayForClient(db.giveaway) });
  });

  app.post('/api/admin/giveaway/draw', requireAdmin, (_req: AuthedRequest, res: Response) => {
    if (!db.giveaway) {
      res.status(400).json({ error: 'Çekiliş bulunamadı.' });
      return;
    }
    const participants = db.giveaway.participantIds ?? [];
    if (participants.length === 0) {
      db.giveaway.active = false;
      saveDb();
      res.json({ giveaway: formatGiveawayForClient(db.giveaway), noParticipants: true });
      return;
    }
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
    db.giveaway.active = false;
    saveDb();
    res.json({ giveaway: formatGiveawayForClient(db.giveaway) });
  });

  app.delete('/api/admin/giveaway', requireAdmin, (_req: AuthedRequest, res: Response) => {
    db.giveaway = null;
    saveDb();
    res.json({ giveaway: null });
  });

  app.put('/api/admin/plans', requireAdmin, (req: AuthedRequest, res: Response) => {
    const incoming = req.body?.plans;
    if (!Array.isArray(incoming) || incoming.length === 0) {
      res.status(400).json({ error: 'En az 1 paket tanımlanmalı.' });
      return;
    }
    db.premiumPlans = incoming.map((p: Partial<PremiumPlan>, idx: number) => ({
      id: String(p.id || `plan-${idx + 1}`).trim(),
      name: String(p.name || 'Xir Paket').trim(),
      tagline: String(p.tagline || '').trim(),
      price: Math.max(0, Number(p.price) || 0),
      periodLabel: String(p.periodLabel || 'ay').trim(),
      durationDays: Math.max(1, Number(p.durationDays) || 30),
      popular: Boolean(p.popular),
      badgeLabel: p.badgeLabel ? String(p.badgeLabel).trim() : undefined,
      features: Array.isArray(p.features)
        ? p.features.map((f) => String(f).trim()).filter(Boolean)
        : [],
    }));
    saveDb();
    res.json({ plans: db.premiumPlans });
  });

  app.post('/api/premium/orders', requireAuth, (req: AuthedRequest, res: Response) => {
    const { planId, note } = req.body as { planId?: string; note?: string };
    const plan = (db.premiumPlans ?? INITIAL_PREMIUM_PLANS).find((p) => p.id === planId);
    if (!plan) {
      res.status(404).json({ error: 'Seçilen paket bulunamadı.' });
      return;
    }
    if (!db.premiumOrders) db.premiumOrders = [];
    const order: PremiumOrder = {
      id: `ord-${Date.now()}`,
      userId: req.user!.id,
      userDisplayName: req.user!.displayName,
      userHandle: req.user!.handle,
      planId: plan.id,
      planName: plan.name,
      price: plan.price,
      periodLabel: plan.periodLabel,
      note: note ? String(note).trim() : undefined,
      status: 'pending',
      createdAt: new Date().toLocaleString('tr-TR'),
    };
    db.premiumOrders.unshift(order);
    saveDb();
    res.status(201).json({ order });
  });

  app.post('/api/admin/orders/:id/resolve', requireAdmin, (req: AuthedRequest, res: Response) => {
    const order = (db.premiumOrders ?? []).find((o) => o.id === req.params.id);
    if (!order) {
      res.status(404).json({ error: 'Sipariş bulunamadı.' });
      return;
    }
    const action = req.body?.action === 'reject' ? 'rejected' : 'approved';
    order.status = action;
    if (action === 'approved') {
      const targetUser = db.users.find((u) => u.id === order.userId);
      if (targetUser) {
        targetUser.isPremium = true;
        targetUser.premiumPlanName = order.planName;
        if (!targetUser.badges.some((b) => b.type === 'gift')) {
          targetUser.badges.push({ id: `gift-${Date.now()}`, label: 'Premium', type: 'gift' });
        }
      }
    }
    saveDb();
    res.json({ order });
  });

  // Vite dev middleware or static dist serving
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const PORT = 3000;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`AnimeXir server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
