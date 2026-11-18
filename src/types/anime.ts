export type NavSection =
  | 'kesfet'
  | 'takvim'
  | 'birlikte-izle'
  | 'topluluk'
  | 'premium'
  | 'izle'
  | 'profil'
  | 'yonetim';

export type AccentColorKey = 'crimson' | 'sky' | 'violet' | 'emerald' | 'amber';

export interface EpisodeMirror {
  id: string;
  label: string;
  url: string;
  audio: 'sub' | 'dub';
}

export interface Episode {
  id: string;
  animeId: string;
  number: number;
  title: string;
  duration: string;
  durationSeconds: number;
  hasDub: boolean;
  hasSub: boolean;
  releasedAt: string;
  thumbnail: string;
  videoUrl?: string;
  dubVideoUrl?: string;
  mirrors?: EpisodeMirror[];
  subtitleVtt?: string;
}

export interface Anime {
  id: string;
  anilistId?: number;
  slug: string;
  title: string;
  stylizedTitle?: string;
  score: number;
  year: number;
  episodeCount: number;
  latestEpisode: number;
  hasDub: boolean;
  featured?: boolean;
  genres: string[];
  moods: string[];
  awardTag?: string;
  synopsis: string;
  posterUrl: string;
  bannerUrl: string;
  logoUrl?: string;
  trailerId?: string;
  weeklyRank?: number;
  weeklyViews?: string;
  broadcastDay?: string;
  broadcastTime?: string;
  studio: string;
  status: 'Devam Ediyor' | 'Tamamlandı';
  episodes: Episode[];
}

export interface AniListSearchResult {
  id: number;
  title: string;
  romajiTitle: string;
  coverUrl: string;
  bannerUrl: string;
  description: string;
  studio: string;
  status: 'Devam Ediyor' | 'Tamamlandı';
  year: number;
  score: number;
  episodeCount: number;
  genres: string[];
  trailerId?: string;
}

export interface RealCharacterPreset {
  id: string;
  name: string;
  anime: string;
  avatarUrl: string;
  bannerUrl: string;
}

export interface UserBadge {
  id: string;
  label: string;
  type: 'early' | 'gift' | 'role';
  color?: string;
}

export interface ProfileComment {
  id: string;
  authorId: string;
  authorName: string;
  authorHandle: string;
  authorAvatar: string;
  text: string;
  createdAt: string;
}

export interface TopAnimePick {
  id: string;
  anilistId?: number;
  title: string;
  posterUrl: string;
  genres: string[];
  score?: number;
}

export interface DirectMessage {
  id: string;
  conversationKey: string;
  senderId: string;
  receiverId: string;
  text: string;
  createdAt: string;
  readByReceiver: boolean;
}

export interface CommunityProfile {
  id: string;
  displayName: string;
  handle: string;
  email?: string;
  isAdmin?: boolean;
  avatarUrl: string;
  bannerUrl: string;
  accentColor: AccentColorKey;
  roleBadge?: string;
  badges: UserBadge[];
  bio: string;
  watchedEpisodes: number;
  favoriteAnimeIds: string[];
  watchlistIds: string[];
  friendsCount: number;
  likesCount?: number;
  likedByMe?: boolean;
  isCurrentUser?: boolean;
  isPremium?: boolean;
  premiumPlanName?: string;
  privacyAcceptedAt?: string;
  onboardingCompleted?: boolean;
  favoriteGenres?: string[];
  topAnimePicks?: TopAnimePick[];
  profileComments: ProfileComment[];
}

export interface EpisodeComment {
  id: string;
  animeId: string;
  episodeNumber: number;
  userId: string;
  displayName: string;
  handle: string;
  avatarUrl: string;
  text: string;
  rating?: number;
  likes: number;
  likedByMe?: boolean;
  createdAt: string;
}

export interface LiveTickerItem {
  id: string;
  userId: string;
  username: string;
  avatarUrl: string;
  animeId: string;
  animeTitle: string;
  episodeNumber?: number;
  scoreLabel?: string;
  comment: string;
}

export interface WatchProgress {
  animeId: string;
  episodeNumber: number;
  currentTime: number;
  duration: number;
  updatedAt: string;
}

export interface WatchPartyRoom {
  code: string;
  name: string;
  hostName: string;
  hostAvatar: string;
  animeId: string;
  episodeNumber: number;
  viewerCount: number;
  isPlaying: boolean;
  currentTime: number;
  messages: {
    id: string;
    sender: string;
    avatar: string;
    text: string;
    time: string;
    isSystem?: boolean;
  }[];
}

export interface AppNotification {
  id: string;
  title: string;
  description: string;
  time: string;
  read: boolean;
  animeId?: string;
}

export interface PremiumPlan {
  id: string;
  name: string;
  tagline: string;
  price: number;
  periodLabel: string;
  durationDays: number;
  popular?: boolean;
  badgeLabel?: string;
  features: string[];
}

export interface PremiumGiveaway {
  id: string;
  active: boolean;
  title: string;
  prizeLabel: string;
  durationHours: number;
  startedAt: string;
  endsAt: string;
  participantIds: string[];
  participantNames?: { id: string; displayName: string; handle: string }[];
  winnerId?: string;
  winnerName?: string;
  winnerHandle?: string;
}

export interface PremiumOrder {
  id: string;
  userId: string;
  userDisplayName: string;
  userHandle: string;
  planId: string;
  planName: string;
  price: number;
  periodLabel: string;
  note?: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
}
