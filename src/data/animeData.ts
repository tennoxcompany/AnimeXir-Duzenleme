import {
  AccentColorKey,
  Anime,
  AppNotification,
  CommunityProfile,
  EpisodeComment,
  LiveTickerItem,
  PremiumPlan,
  RealCharacterPreset,
  WatchPartyRoom,
} from '../types/anime';

export const ANILIST_GENRE_TR: Record<string, string> = {
  Action: 'Aksiyon',
  Adventure: 'Macera',
  Comedy: 'Komedi',
  Drama: 'Dram',
  Fantasy: 'Fantezi',
  Horror: 'Korku',
  Mystery: 'Gizem',
  Psychological: 'Psikolojik',
  Romance: 'Romantik',
  'Sci-Fi': 'Bilim Kurgu',
  'Slice of Life': 'Günlük Yaşam',
  Sports: 'Spor',
  Supernatural: 'Doğaüstü',
  Thriller: 'Gerilim',
  Historical: 'Tarihi',
  School: 'Okul',
  Mecha: 'Mecha',
  Music: 'Müzik',
  Shounen: 'Shounen',
  Seinen: 'Seinen',
  Ecchi: 'Ecchi',
  'Mahou Shoujo': 'Büyülü Kız',
};

export const REAL_CHARACTER_AVATARS: RealCharacterPreset[] = [
  {
    id: 'char-jinwoo',
    name: 'Sung Jin-Woo',
    anime: 'Solo Leveling',
    avatarUrl: 'https://s4.anilist.co/file/anilistcdn/character/large/b129928-BCEjVaP0AQSw.png',
    bannerUrl: 'https://s4.anilist.co/file/anilistcdn/media/anime/banner/151807-37yfQA3ym8PA.jpg',
  },
  {
    id: 'char-gojo',
    name: 'Satoru Gojo',
    anime: 'Jujutsu Kaisen',
    avatarUrl: 'https://s4.anilist.co/file/anilistcdn/character/large/b127691-9zqh1xpIubn7.png',
    bannerUrl: 'https://s4.anilist.co/file/anilistcdn/media/anime/banner/113415-jQBSkxWAAk83.jpg',
  },
  {
    id: 'char-frieren',
    name: 'Frieren',
    anime: 'Frieren',
    avatarUrl: 'https://s4.anilist.co/file/anilistcdn/character/large/b176754-PCnpqIOkjhFk.png',
    bannerUrl: 'https://s4.anilist.co/file/anilistcdn/media/anime/banner/154587-ivXNJ23SM1xB.jpg',
  },
  {
    id: 'char-levi',
    name: 'Levi Ackerman',
    anime: 'Attack on Titan',
    avatarUrl: 'https://s4.anilist.co/file/anilistcdn/character/large/b45627-CR68RyZmddGG.png',
    bannerUrl: 'https://s4.anilist.co/file/anilistcdn/media/anime/banner/16498-8jpFCOcDmneX.jpg',
  },
  {
    id: 'char-maomao',
    name: 'Maomao',
    anime: 'The Apothecary Diaries',
    avatarUrl: 'https://s4.anilist.co/file/anilistcdn/character/large/b126824-MqsCncTO1qpv.png',
    bannerUrl: 'https://s4.anilist.co/file/anilistcdn/media/anime/banner/161645-oqzTZYIvviWI.jpg',
  },
  {
    id: 'char-itachi',
    name: 'Itachi Uchiha',
    anime: 'Naruto Shippuden',
    avatarUrl: 'https://s4.anilist.co/file/anilistcdn/character/large/b14-9Kb1E5oel1ke.png',
    bannerUrl: 'https://s4.anilist.co/file/anilistcdn/media/anime/banner/1735.jpg',
  },
  {
    id: 'char-l',
    name: 'L Lawliet',
    anime: 'Death Note',
    avatarUrl: 'https://s4.anilist.co/file/anilistcdn/character/large/b71-1W4panC53vfs.png',
    bannerUrl: 'https://s4.anilist.co/file/anilistcdn/media/anime/banner/1535.jpg',
  },
  {
    id: 'char-luffy',
    name: 'Monkey D. Luffy',
    anime: 'One Piece',
    avatarUrl: 'https://s4.anilist.co/file/anilistcdn/character/large/b40-MNypXsxSRb1R.png',
    bannerUrl: 'https://s4.anilist.co/file/anilistcdn/media/anime/banner/21-wf37VakJmZqs.jpg',
  },
  {
    id: 'char-ichigo',
    name: 'Ichigo Kurosaki',
    anime: 'Bleach: TYBW',
    avatarUrl: 'https://s4.anilist.co/file/anilistcdn/character/large/b5-a7bkJgjhhigE.png',
    bannerUrl: 'https://s4.anilist.co/file/anilistcdn/media/anime/banner/116674-l2YlIyJzvGSV.jpg',
  },
  {
    id: 'char-tanjiro',
    name: 'Tanjiro Kamado',
    anime: 'Demon Slayer',
    avatarUrl: 'https://s4.anilist.co/file/anilistcdn/character/large/b126071-BTNEc1nRIv68.png',
    bannerUrl: 'https://s4.anilist.co/file/anilistcdn/media/anime/banner/101922-33MtJGsUSxga.jpg',
  },
  {
    id: 'char-hyakkimaru',
    name: 'Hyakkimaru',
    anime: 'Dororo',
    avatarUrl: 'https://s4.anilist.co/file/anilistcdn/character/large/b14864-MMntDWi2EkyR.png',
    bannerUrl: 'https://s4.anilist.co/file/anilistcdn/media/anime/banner/n101347-tHurKfTlhtFl.jpg',
  },
  {
    id: 'char-fern',
    name: 'Fern',
    anime: 'Frieren',
    avatarUrl: 'https://s4.anilist.co/file/anilistcdn/character/large/b183965-uGFohBjlFoTp.png',
    bannerUrl: 'https://s4.anilist.co/file/anilistcdn/media/anime/banner/154587-ivXNJ23SM1xB.jpg',
  },
];

export const ACCENT_THEMES: Record<
  AccentColorKey,
  { name: string; hex: string; ring: string; bgSoft: string; text: string }
> = {
  crimson: {
    name: 'Kızıl',
    hex: '#FF2E54',
    ring: 'ring-[#FF2E54]',
    bgSoft: 'bg-[#FF2E54]/15',
    text: 'text-[#FF2E54]',
  },
  sky: {
    name: 'Gökyüzü',
    hex: '#38BDF8',
    ring: 'ring-[#38BDF8]',
    bgSoft: 'bg-[#38BDF8]/15',
    text: 'text-[#38BDF8]',
  },
  violet: {
    name: 'Mor',
    hex: '#A855F7',
    ring: 'ring-[#A855F7]',
    bgSoft: 'bg-[#A855F7]/15',
    text: 'text-[#A855F7]',
  },
  emerald: {
    name: 'Zümrüt',
    hex: '#10B981',
    ring: 'ring-[#10B981]',
    bgSoft: 'bg-[#10B981]/15',
    text: 'text-[#10B981]',
  },
  amber: {
    name: 'Kehribar',
    hex: '#F59E0B',
    ring: 'ring-[#F59E0B]',
    bgSoft: 'bg-[#F59E0B]/15',
    text: 'text-[#F59E0B]',
  },
};

// Sadece yöneticinin AniList üzerinden eklediği gerçek animeler katalogda gösterilir.
export const ANIME_CATALOG: Anime[] = [];

export const INITIAL_PROFILES: CommunityProfile[] = [
  {
    id: 'wanderer',
    displayName: 'wanderer',
    handle: '@wanderer',
    email: 'kagangirgin43@gmail.com',
    isAdmin: true,
    avatarUrl: REAL_CHARACTER_AVATARS[3].avatarUrl,
    bannerUrl: REAL_CHARACTER_AVATARS[3].bannerUrl,
    accentColor: 'amber',
    roleBadge: 'Yönetici',
    badges: [
      { id: 'role-2', label: 'Yönetici', type: 'role' },
      { id: 'early-3', label: 'Erken Destekçi', type: 'early' },
    ],
    bio: 'AnimeXir yönetici hesabı · AniList katalog & Türkçe altyazı yönetimi.',
    watchedEpisodes: 0,
    favoriteAnimeIds: [],
    watchlistIds: [],
    friendsCount: 0,
    likesCount: 0,
    likedByMe: false,
    isPremium: true,
    privacyAcceptedAt: '2026-01-01T00:00:00.000Z',
    onboardingCompleted: true,
    favoriteGenres: ['Aksiyon', 'Gizem', 'Fantezi'],
    topAnimePicks: [],
    profileComments: [],
  },
];

export const INITIAL_TICKER: LiveTickerItem[] = [];

export const INITIAL_COMMENTS: EpisodeComment[] = [];

export const INITIAL_ROOMS: WatchPartyRoom[] = [];

export const INITIAL_NOTIFICATIONS: AppNotification[] = [
  {
    id: 'n1',
    title: 'AniList Senkronizasyonu Hazır',
    description: 'Yönetim panelinden AniList üzerinden istediğin animeyi ekleyebilirsin.',
    time: 'şimdi',
    read: false,
  },
];

export const MOOD_CARDS = [
  {
    id: 'adrenalin',
    title: 'Saf Aksiyon & Adrenalin',
    subtitle: 'Yüksek tempolu dövüşler',
    genre: 'Aksiyon',
    image: 'https://s4.anilist.co/file/anilistcdn/media/anime/banner/101922-33MtJGsUSxga.jpg',
  },
  {
    id: 'karanlik',
    title: 'Karanlık & Gerilim',
    subtitle: 'Psikolojik ve sürükleyici',
    genre: 'Gizem',
    image: 'https://s4.anilist.co/file/anilistcdn/media/anime/banner/151807-37yfQA3ym8PA.jpg',
  },
  {
    id: 'kalp-isitan',
    title: 'Duygusal & Romantik',
    subtitle: 'Unutulmaz hikayeler',
    genre: 'Dram',
    image: 'https://s4.anilist.co/file/anilistcdn/media/anime/banner/154587-ivXNJ23SM1xB.jpg',
  },
  {
    id: 'zihin-yakan',
    title: 'Zihin Yakan Entrika',
    subtitle: 'Akıl oyunları ve dedektiflik',
    genre: 'Psikolojik',
    image: 'https://s4.anilist.co/file/anilistcdn/media/anime/banner/1535.jpg',
  },
  {
    id: 'epik-fantezi',
    title: 'Epik Fantezi Dünyaları',
    subtitle: 'Büyü, kılıç ve macera',
    genre: 'Fantezi',
    image: 'https://s4.anilist.co/file/anilistcdn/media/anime/banner/16498-8jpFCOcDmneX.jpg',
  },
  {
    id: 'bilim-kurgu',
    title: 'Bilim Kurgu & Kahramanlık',
    subtitle: 'Yeni nesil güçler',
    genre: 'Bilim Kurgu',
    image: 'https://s4.anilist.co/file/anilistcdn/media/anime/banner/21459-yeVkolGKdGUV.jpg',
  },
];

export const GENRES_LIST = [
  'Tümü',
  'Aksiyon',
  'Macera',
  'Fantezi',
  'Doğaüstü',
  'Gizem',
  'Dram',
  'Komedi',
  'Okul',
  'Bilim Kurgu',
  'Psikolojik',
  'Tarihi',
];

export const ONBOARDING_GENRES = [
  'Aksiyon',
  'Macera',
  'Fantezi',
  'Doğaüstü',
  'Gizem',
  'Dram',
  'Romantik',
  'Komedi',
  'Psikolojik',
  'Gerilim',
  'Bilim Kurgu',
  'Korku',
  'Tarihi',
  'Okul',
  'Spor',
  'Müzik',
  'Shounen',
  'Seinen',
];

export const WEEKDAYS_TR = [
  'Pazartesi',
  'Salı',
  'Çarşamba',
  'Perşembe',
  'Cuma',
  'Cumartesi',
  'Pazar',
];

export const INITIAL_PREMIUM_PLANS: PremiumPlan[] = [
  {
    id: 'xir-standart',
    name: 'Xir Standart',
    tagline: 'Reklamsız ve akıcı anime keyfi',
    price: 20,
    periodLabel: 'ay',
    durationDays: 30,
    badgeLabel: 'Başlangıç',
    features: [
      'Sıfır reklamlı Full HD (1080p) oynatıcı',
      'Profilinde Standart destekçi rozeti',
      'Yeni bölüm bildirimlerinde öncelik',
    ],
  },
  {
    id: 'xir-pro',
    name: 'Xir Pro',
    tagline: 'En popüler yüksek kalite paketi',
    price: 45,
    periodLabel: 'ay',
    durationDays: 30,
    popular: true,
    badgeLabel: 'En Popüler',
    features: [
      '4K Ultra HD & Yüksek Bitrate video akışı',
      'Sınırsız Birlikte İzle odası açma',
      'Altın Premium rozeti & özel profil vurgusu',
      'Bölüm yorumlarında öne çıkan isim rengi',
    ],
  },
  {
    id: 'xir-yillik',
    name: 'Xir Yıllık Pro',
    tagline: '12 ay kesintisiz · 4 ay bedava',
    price: 360,
    periodLabel: 'yıl',
    durationDays: 365,
    badgeLabel: 'Avantajlı',
    features: [
      'Tüm Xir Pro ayrıcalıkları 1 yıl boyunca',
      'Aylık ₺30’a denk gelen yıllık indirim',
      'Çekilişlerde ekstra destekçi önceliği',
    ],
  },
];
