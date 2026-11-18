import React, { useMemo, useRef, useState } from 'react';
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Crown,
  Flame,
  Gift,
  Heart,
  Play,
  Plus,
  Search,
  Sparkles,
  Star,
  Sunrise,
} from 'lucide-react';
import { useAppState } from '../context/AppStateContext';
import {
  ACCENT_THEMES,
  GENRES_LIST,
  MOOD_CARDS,
} from '../data/animeData';

function formatCountdown(totalSeconds: number) {
  const hrs = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;
  return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export const HomeView: React.FC = () => {
  const {
    animes,
    openAnimeWatch,
    openProfileModal,
    openAuthModal,
    currentUser,
    profiles,
    watchlistIds,
    toggleWatchlist,
    watchProgressMap,
    premiumPlans,
    giveaway,
    giveawayRemainingSeconds,
    joinGiveaway,
    setActiveSection,
  } = useAppState();

  // Dynamic Hero Slides (any featured anime or first 3)
  const heroSlides = useMemo(() => {
    const featured = animes.filter((a) => a.featured);
    return featured.length > 0 ? featured : animes.slice(0, 3);
  }, [animes]);
  const [heroIndex, setHeroIndex] = useState(0);
  const activeHero = heroSlides[heroIndex % heroSlides.length] ?? animes[0];

  // Dynamic Weekly Top 10
  const weeklyTop10 = useMemo(() => {
    const ranked = [...animes]
      .filter((a) => typeof a.weeklyRank === 'number')
      .sort((a, b) => (a.weeklyRank ?? 99) - (b.weeklyRank ?? 99));
    if (ranked.length >= 10) return ranked.slice(0, 10);
    const rest = animes.filter((a) => !ranked.some((r) => r.id === a.id));
    return [...ranked, ...rest].slice(0, 10);
  }, [animes]);

  const [hoveredRankId, setHoveredRankId] = useState<string>(weeklyTop10[0]?.id ?? '');
  const featuredTopAnime =
    weeklyTop10.find((a) => a.id === hoveredRankId) ?? weeklyTop10[0];
  const leftColumnRanks = weeklyTop10.slice(1, 6);
  const rightColumnRanks = weeklyTop10.slice(6, 10);

  // Son Eklenenler Pagination (6 compact cards per page)
  const itemsPerPage = 6;
  const totalRecentPages = Math.max(1, Math.ceil(animes.length / itemsPerPage));
  const [recentPage, setRecentPage] = useState(0);
  const safePage = recentPage % totalRecentPages;
  const recentAnimes = animes.slice(
    safePage * itemsPerPage,
    safePage * itemsPerPage + itemsPerPage
  );

  // Catalog Filters
  const catalogRef = useRef<HTMLElement>(null);
  const [selectedGenre, setSelectedGenre] = useState<string>('Tümü');
  const [catalogSearch, setCatalogSearch] = useState('');
  const [sortBy, setSortBy] = useState<'popular' | 'score' | 'newest' | 'az'>('popular');

  const filteredCatalog = useMemo(() => {
    let list = [...animes];
    if (selectedGenre !== 'Tümü') {
      list = list.filter((a) => a.genres.includes(selectedGenre));
    }
    if (catalogSearch.trim()) {
      const q = catalogSearch.trim().toLowerCase();
      list = list.filter(
        (a) =>
          a.title.toLowerCase().includes(q) ||
          a.genres.some((g) => g.toLowerCase().includes(q))
      );
    }
    if (sortBy === 'score') {
      list.sort((a, b) => b.score - a.score);
    } else if (sortBy === 'newest') {
      list.sort((a, b) => b.year - a.year);
    } else if (sortBy === 'az') {
      list.sort((a, b) => a.title.localeCompare(b.title, 'tr'));
    } else {
      list.sort((a, b) => (a.weeklyRank ?? 99) - (b.weeklyRank ?? 99));
    }
    return list;
  }, [animes, selectedGenre, catalogSearch, sortBy]);

  const continueWatchingList = useMemo(() => {
    return Object.values(watchProgressMap)
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .map((prog) => {
        const anime = animes.find((a) => a.id === prog.animeId);
        return anime ? { ...prog, anime } : null;
      })
      .filter((x): x is NonNullable<typeof x> => Boolean(x));
  }, [watchProgressMap, animes]);

  const likedProfiles = useMemo(() => {
    return [...profiles]
      .filter((p) => (p.likesCount ?? 0) > 0)
      .sort((a, b) => (b.likesCount ?? 0) - (a.likesCount ?? 0))
      .slice(0, 4);
  }, [profiles]);

  const handleMoodPick = (genre: string) => {
    setSelectedGenre(genre);
    catalogRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const activeHeroTags = useMemo(() => {
    if (!activeHero) return [];
    const list: string[] = [];
    if (activeHero.genres[0]) list.push(activeHero.genres[0]);
    if (activeHero.awardTag) list.push(activeHero.awardTag);
    for (const g of activeHero.genres.slice(1)) {
      if (!list.includes(g)) list.push(g);
    }
    return list.slice(0, 3);
  }, [activeHero]);

  return (
    <div className="pb-12">
      {/* 1. COMPACT FULL-BLEED HERO CAROUSEL OR EMPTY CATALOG HERO */}
      {!activeHero ? (
        <section className="relative h-[min(78vh,380px)] min-h-[300px] w-full overflow-hidden border-b border-white/[0.06] bg-[radial-gradient(ellipse_at_top_right,rgba(255,46,84,0.16),transparent_55%),linear-gradient(180deg,#12121A_0%,#0B0B0F_100%)]">
          <div className="relative z-10 mx-auto flex h-full max-w-[1440px] flex-col justify-end px-6 pb-8 pt-24 sm:px-12 lg:px-14">
            <div className="max-w-lg">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[#FF2E54]/35 bg-[#FF2E54]/15 px-3 py-1 text-[11px] font-semibold text-[#FF8CA1]">
                <Sparkles className="h-3.5 w-3.5" /> Katalog Hazır Bekliyor
              </span>
              <h1 className="mt-3 font-display text-2xl sm:text-4xl font-extrabold tracking-wide text-white">
                Henüz Katalogda Anime Yok
              </h1>
              <p className="mt-2 max-w-md text-xs sm:text-sm leading-relaxed text-zinc-300">
                Yalnızca yönetim panelinden AniList ile eklediğin animeler burada büyük vitrin, afiş, puan, etiketler ve Türkçe özetle yayınlanır.
              </p>
              <div className="mt-4 flex flex-wrap items-center gap-2.5">
                {currentUser?.isAdmin ? (
                  <button
                    onClick={() => setActiveSection('yonetim')}
                    className="inline-flex h-9 items-center gap-1.5 rounded-full bg-[#FF2E54] px-5 text-xs sm:text-sm font-semibold text-white shadow-[0_6px_20px_rgba(255,46,84,0.45)] transition-all hover:brightness-110 cursor-pointer"
                  >
                    <Plus className="h-4 w-4" />
                    Yönetim Panelinden Anime Ekle
                  </button>
                ) : (
                  <button
                    onClick={() => openAuthModal('login')}
                    className="inline-flex h-9 items-center gap-1.5 rounded-full bg-[#FF2E54] px-5 text-xs sm:text-sm font-semibold text-white shadow-[0_6px_20px_rgba(255,46,84,0.45)] transition-all hover:brightness-110 cursor-pointer"
                  >
                    Yönetici Girişi Yap
                  </button>
                )}
              </div>
            </div>
          </div>
        </section>
      ) : (
      <section className="relative h-[min(88vh,450px)] min-h-[350px] w-full overflow-hidden border-b border-white/[0.06]">
        <img
          src={activeHero.bannerUrl || activeHero.posterUrl}
          alt={activeHero.title}
          referrerPolicy="no-referrer"
          className="absolute inset-0 h-full w-full object-cover object-center transition-all duration-700"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0B0B0F]/95 via-[#0B0B0F]/55 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0B0B0F] via-[#0B0B0F]/20 to-black/50" />

        {heroSlides.length > 1 && (
          <>
            <button
              onClick={() =>
                setHeroIndex((i) => (i - 1 + heroSlides.length) % heroSlides.length)
              }
              aria-label="Önceki anime"
              className="absolute left-2 sm:left-3 top-[56%] -translate-y-1/2 z-20 flex h-8 w-8 items-center justify-center rounded-full text-white/80 transition-colors hover:bg-black/45 hover:text-white cursor-pointer"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              onClick={() => setHeroIndex((i) => (i + 1) % heroSlides.length)}
              aria-label="Sonraki anime"
              className="absolute right-2 sm:right-3 top-[56%] -translate-y-1/2 z-20 flex h-8 w-8 items-center justify-center rounded-full text-white/80 transition-colors hover:bg-black/45 hover:text-white cursor-pointer"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </>
        )}

        <div className="relative z-10 mx-auto flex h-full max-w-[1440px] flex-col justify-end px-11 pb-6 pt-24 sm:px-14 sm:pb-7 lg:px-16">
          <div className="max-w-xl">
            {activeHero.logoUrl ? (
              <img
                src={activeHero.logoUrl}
                alt={activeHero.title}
                referrerPolicy="no-referrer"
                className="max-h-14 sm:max-h-20 w-auto object-contain drop-shadow-[0_6px_18px_rgba(0,0,0,0.85)]"
              />
            ) : (
              <h1
                className="font-display text-2xl sm:text-4xl lg:text-[42px] leading-tight font-extrabold tracking-wide text-white drop-shadow-[0_4px_20px_rgba(0,0,0,0.9)]"
                style={{ textWrap: 'balance' }}
              >
                {activeHero.stylizedTitle ?? activeHero.title}
              </h1>
            )}

            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs sm:text-sm text-zinc-200">
              <span className="inline-flex items-center gap-1 rounded-full border border-amber-400/45 bg-amber-500/20 px-2.5 py-0.5 font-mono-num text-xs font-bold text-amber-300 backdrop-blur-sm">
                <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                {activeHero.score}
              </span>
              <span className="font-mono-num font-medium text-zinc-200">
                {activeHero.year}
              </span>
              <span className="text-zinc-500">·</span>
              <span className="font-medium text-zinc-200">
                {activeHero.episodeCount} bölüm
              </span>
              {activeHero.hasDub && (
                <>
                  <span className="text-zinc-500">·</span>
                  <span className="text-[11px] font-semibold text-[#FF4D6D]">
                    TR Dublaj
                  </span>
                </>
              )}
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              {activeHeroTags.map((tag) => (
                <button
                  key={tag}
                  onClick={() => {
                    if (GENRES_LIST.includes(tag)) handleMoodPick(tag);
                  }}
                  className="rounded-full border border-white/15 bg-black/55 px-2.5 py-0.5 text-[11px] font-medium text-zinc-200 backdrop-blur-sm transition-colors hover:border-white/30 hover:bg-white/15 cursor-pointer"
                >
                  {tag}
                </button>
              ))}
            </div>

            <p className="mt-2 line-clamp-2 max-w-lg text-xs sm:text-[13px] leading-relaxed text-zinc-200/95 drop-shadow">
              {activeHero.synopsis}
            </p>

            <div className="mt-3.5 flex flex-wrap items-center gap-2.5">
              <button
                onClick={() => openAnimeWatch(activeHero.id, 1)}
                className="inline-flex h-9 sm:h-10 items-center gap-2 rounded-full bg-[#FF2E54] px-5 sm:px-6 text-xs sm:text-sm font-semibold text-white shadow-[0_6px_22px_rgba(255,46,84,0.45)] transition-all hover:brightness-110 cursor-pointer"
              >
                <Play className="h-3.5 w-3.5 fill-current" />
                Şimdi İzle
              </button>
              <button
                onClick={() => toggleWatchlist(activeHero.id)}
                className="inline-flex h-9 sm:h-10 items-center gap-1.5 rounded-full border border-white/20 bg-black/45 px-4 sm:px-5 text-xs sm:text-sm font-semibold text-white backdrop-blur-md transition-colors hover:bg-white/15 cursor-pointer"
              >
                {watchlistIds.includes(activeHero.id) ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-emerald-400" />
                    Listemde
                  </>
                ) : (
                  <>
                    <Plus className="h-3.5 w-3.5" />
                    Listeme Ekle
                  </>
                )}
              </button>
            </div>
          </div>

          {heroSlides.length > 1 && (
            <div className="absolute bottom-5 right-6 sm:right-12 flex items-center gap-1.5">
              {heroSlides.map((slide, idx) => (
                <button
                  key={slide.id}
                  onClick={() => setHeroIndex(idx)}
                  aria-label={`${slide.title} slaytına geç`}
                  className={`h-1.5 rounded-full transition-all cursor-pointer ${
                    idx === heroIndex % heroSlides.length
                      ? 'w-5 bg-[#FF2E54]'
                      : 'w-1.5 bg-white/30 hover:bg-white/50'
                  }`}
                />
              ))}
            </div>
          )}
        </div>
      </section>
      )}

      <div className="mx-auto max-w-[1440px] space-y-9 px-4 pt-6 sm:px-6 lg:px-8">
        {continueWatchingList.length > 0 && (
          <section>
            <div className="mb-4">
              <h2 className="text-xl sm:text-2xl font-bold text-white">
                Kaldığın Yerden Devam Et
              </h2>
              <p className="text-xs sm:text-sm text-zinc-400">
                İzleme ilerlemen otomatik olarak senkronize edilir
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {continueWatchingList.slice(0, 4).map(({ anime, episodeNumber, currentTime, duration }) => {
                const pct = Math.min(100, Math.max(8, Math.round((currentTime / duration) * 100)));
                return (
                  <button
                    key={anime.id}
                    onClick={() => openAnimeWatch(anime.id, episodeNumber)}
                    className="group relative overflow-hidden rounded-2xl border border-white/[0.08] bg-[#14141A] text-left transition-all hover:border-[#FF2E54]/40 cursor-pointer"
                  >
                    <div className="relative aspect-video overflow-hidden">
                      <img
                        src={anime.bannerUrl || anime.posterUrl}
                        alt={anime.title}
                        referrerPolicy="no-referrer"
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent" />
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity group-hover:opacity-100">
                        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#FF2E54] text-white shadow-lg">
                          <Play className="h-5 w-5 fill-current ml-0.5" />
                        </span>
                      </div>
                      <div className="absolute bottom-2.5 left-3 right-3">
                        <p className="truncate text-sm font-semibold text-white">{anime.title}</p>
                        <p className="text-xs text-zinc-300 font-mono-num">
                          {episodeNumber}. Bölüm · %{pct} izlendi
                        </p>
                      </div>
                    </div>
                    <div className="h-1 w-full bg-white/10">
                      <div className="h-full bg-[#FF2E54]" style={{ width: `${pct}%` }} />
                    </div>
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {/* 2. BU HAFTA ÇOK İZLENENLER */}
        {animes.length > 0 && (
        <section>
          <div className="mb-3 flex items-baseline justify-between gap-2">
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-white">
                Bu Hafta Çok İzlenenler
              </h2>
              <p className="text-xs text-zinc-400">
                Son 7 günde en çok izlenenler
              </p>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-[0.82fr_1.18fr] items-stretch">
            {featuredTopAnime && (
              <div className="group relative min-h-[250px] sm:min-h-[285px] overflow-hidden rounded-2xl border border-white/[0.08] bg-[#14141A]">
                <img
                  src={featuredTopAnime.bannerUrl || featuredTopAnime.posterUrl}
                  alt={featuredTopAnime.title}
                  referrerPolicy="no-referrer"
                  className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/92 via-black/40 to-transparent" />

                <div className="absolute bottom-4 left-4 right-4">
                  <div className="inline-flex items-center gap-1.5 rounded-full border border-[#FF2E54]/40 bg-[#FF2E54]/20 px-2.5 py-0.5 text-[11px] font-semibold text-[#FF8CA1] backdrop-blur-md">
                    <Flame className="h-3 w-3 text-[#FF2E54]" />
                    {featuredTopAnime.weeklyRank === 1
                      ? 'Bu haftanın 1 numarası'
                      : `Haftanın ${featuredTopAnime.weeklyRank ?? 1}. numarası`}
                  </div>

                  <h3 className="mt-2 font-display text-2xl sm:text-3xl font-bold text-white">
                    {featuredTopAnime.stylizedTitle ?? featuredTopAnime.title}
                  </h3>

                  <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px] text-zinc-300">
                    <span className="rounded-md border border-white/15 bg-black/50 px-2 py-0.5 backdrop-blur-sm">
                      {featuredTopAnime.genres[0]}
                    </span>
                    {featuredTopAnime.awardTag && (
                      <span className="rounded-md border border-white/15 bg-black/50 px-2 py-0.5 backdrop-blur-sm">
                        {featuredTopAnime.awardTag}
                      </span>
                    )}
                    <span className="font-mono-num text-zinc-300 px-1">
                      {featuredTopAnime.year}
                    </span>
                  </div>

                  <button
                    onClick={() => openAnimeWatch(featuredTopAnime.id, 1)}
                    className="mt-3 inline-flex h-9 items-center gap-1.5 rounded-full bg-[#FF2E54] px-5 text-xs sm:text-sm font-semibold text-white shadow-[0_0_20px_rgba(255,46,84,0.4)] transition-all hover:brightness-110 cursor-pointer"
                  >
                    <Play className="h-3.5 w-3.5 fill-current" />
                    İzle
                  </button>
                </div>
              </div>
            )}

            <div className="grid gap-2.5 sm:grid-cols-2">
              <div className="space-y-1.5">
                {leftColumnRanks.map((anime, idx) => {
                  const rank = idx + 2;
                  const isHighlighted = featuredTopAnime?.id === anime.id;
                  return (
                    <button
                      key={anime.id}
                      onMouseEnter={() => setHoveredRankId(anime.id)}
                      onClick={() => openAnimeWatch(anime.id, 1)}
                      className={`flex w-full items-center gap-2.5 rounded-xl px-2.5 py-1.5 text-left transition-all cursor-pointer ${
                        isHighlighted
                          ? 'bg-white/[0.08] ring-1 ring-white/15'
                          : 'hover:bg-white/[0.05]'
                      }`}
                    >
                      <span
                        className={`w-5 shrink-0 text-center font-mono-num text-base font-bold ${
                          isHighlighted ? 'text-[#FF2E54]' : 'text-zinc-500'
                        }`}
                      >
                        {rank}
                      </span>
                      <img
                        src={anime.bannerUrl || anime.posterUrl}
                        alt={anime.title}
                        referrerPolicy="no-referrer"
                        className="h-10 w-16 shrink-0 rounded-lg object-cover bg-zinc-800"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] font-semibold text-white">
                          {anime.title}
                        </p>
                        <p className="truncate text-[11px] text-zinc-400">
                          {anime.genres[0]}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="space-y-1.5">
                {rightColumnRanks.map((anime, idx) => {
                  const rank = idx + 7;
                  const isHighlighted = featuredTopAnime?.id === anime.id;
                  return (
                    <button
                      key={anime.id}
                      onMouseEnter={() => setHoveredRankId(anime.id)}
                      onClick={() => openAnimeWatch(anime.id, 1)}
                      className={`flex w-full items-center gap-2.5 rounded-xl px-2.5 py-1.5 text-left transition-all cursor-pointer ${
                        isHighlighted
                          ? 'bg-white/[0.08] ring-1 ring-white/15'
                          : 'hover:bg-white/[0.05]'
                      }`}
                    >
                      <span
                        className={`w-5 shrink-0 text-center font-mono-num text-base font-bold ${
                          isHighlighted ? 'text-[#FF2E54]' : 'text-zinc-500'
                        }`}
                      >
                        {rank}
                      </span>
                      <img
                        src={anime.bannerUrl || anime.posterUrl}
                        alt={anime.title}
                        referrerPolicy="no-referrer"
                        className="h-10 w-16 shrink-0 rounded-lg object-cover bg-zinc-800"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] font-semibold text-white">
                          {anime.title}
                        </p>
                        <p className="truncate text-[11px] text-zinc-400">
                          {anime.genres[0]}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </section>
        )}

        {/* 3. YÖNETİCİ KONTROLLÜ PREMİUM ÇEKİLİŞİ / DÜKKAN BANNER */}
        {giveaway?.active && giveawayRemainingSeconds > 0 ? (
          <section className="flex flex-col gap-3 rounded-xl border border-amber-500/30 bg-[#14141A] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
              <span className="inline-flex items-center gap-1.5 text-[11px] font-bold tracking-wider text-amber-400">
                <Gift className="h-3.5 w-3.5" />
                PREMİUM ÇEKİLİŞİ
              </span>
              <span className="hidden sm:inline text-zinc-700">|</span>
              <span className="text-xs sm:text-sm font-bold text-white">
                {giveaway.title}
              </span>
              <span className="text-xs text-zinc-400">
                Ödül: {giveaway.prizeLabel} · {giveaway.participantIds.length} katılımcı
              </span>
            </div>

            <div className="flex items-center justify-between sm:justify-end gap-3">
              <div className="flex items-center gap-1.5 text-zinc-200">
                <Clock className="h-3.5 w-3.5 text-amber-400" />
                <span className="font-mono-num text-sm font-bold tracking-tight">
                  {formatCountdown(giveawayRemainingSeconds)}
                </span>
              </div>

              {currentUser && giveaway.participantIds.includes(currentUser.id) ? (
                <span className="inline-flex h-8 items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/15 px-3.5 text-xs font-semibold text-emerald-300">
                  <Check className="h-3.5 w-3.5" /> Çekilişe Katıldın
                </span>
              ) : (
                <button
                  onClick={joinGiveaway}
                  className="h-8 rounded-full bg-[#FF2E54] px-4 text-xs font-semibold text-white shadow-[0_0_16px_rgba(255,46,84,0.35)] transition-all hover:brightness-110 whitespace-nowrap shrink-0 cursor-pointer"
                >
                  {currentUser ? 'Çekilişe Katıl' : 'Üye Ol ve Katıl'}
                </button>
              )}
            </div>
          </section>
        ) : giveaway && !giveaway.active && giveaway.winnerName ? (
          <section className="flex flex-col gap-3 rounded-xl border border-emerald-500/25 bg-[#14141A] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="inline-flex items-center gap-1.5 text-[11px] font-bold tracking-wider text-emerald-400">
                <Crown className="h-3.5 w-3.5" />
                SON ÇEKİLİŞ KAZANANI
              </span>
              <span className="text-xs sm:text-sm font-bold text-white">
                {giveaway.winnerName} ({giveaway.winnerHandle})
              </span>
              <span className="text-xs text-zinc-400">· {giveaway.prizeLabel}</span>
            </div>
            <button
              onClick={() => setActiveSection('premium')}
              className="h-8 rounded-full border border-amber-500/40 bg-amber-500/10 px-4 text-xs font-semibold text-amber-300 hover:bg-amber-500/20 whitespace-nowrap shrink-0 cursor-pointer"
            >
              Premium Dükkanı →
            </button>
          </section>
        ) : (
          <section className="flex flex-col gap-3 rounded-xl border border-white/[0.08] bg-[#14141A] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
              <span className="inline-flex items-center gap-1.5 text-[11px] font-bold tracking-wider text-amber-400">
                <Crown className="h-3.5 w-3.5" />
                XİR PREMİUM DÜKKANI
              </span>
              <span className="hidden sm:inline text-zinc-700">|</span>
              <span className="text-xs sm:text-sm font-bold text-white">
                Aylık ₺{Math.min(...premiumPlans.map((p) => p.price))}’den başlayan paketler
              </span>
              <span className="text-xs text-zinc-400">
                Reklamsız 4K izleme & özel rozetler
              </span>
            </div>
            <button
              onClick={() => setActiveSection('premium')}
              className="h-8 rounded-full bg-[#FF2E54] px-4 text-xs font-semibold text-white shadow-[0_0_16px_rgba(255,46,84,0.35)] transition-all hover:brightness-110 whitespace-nowrap shrink-0 cursor-pointer"
            >
              Paketleri İncele →
            </button>
          </section>
        )}

        {/* 4. SON EKLENENLER CAROUSEL */}
        {animes.length > 0 && (
        <section>
          <div className="mb-3 flex items-center justify-between gap-4">
            <h2 className="text-lg sm:text-xl font-bold text-white">
              Son Eklenenler
            </h2>

            <div className="flex items-center gap-1.5 rounded-full border border-white/10 bg-[#14141A] px-1.5 py-0.5">
              <button
                onClick={() =>
                  setRecentPage((p) => (p - 1 + totalRecentPages) % totalRecentPages)
                }
                aria-label="Önceki sayfa"
                className="flex h-6 w-6 items-center justify-center rounded-full text-zinc-400 transition-colors hover:bg-white/10 hover:text-white cursor-pointer"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
              <span className="px-1.5 font-mono-num text-[11px] font-medium text-zinc-300">
                {safePage + 1} / {totalRecentPages}
              </span>
              <button
                onClick={() => setRecentPage((p) => (p + 1) % totalRecentPages)}
                aria-label="Sonraki sayfa"
                className="flex h-6 w-6 items-center justify-center rounded-full text-zinc-400 transition-colors hover:bg-white/10 hover:text-white cursor-pointer"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-6">
            {recentAnimes.map((anime) => (
              <div
                key={anime.id}
                onClick={() => openAnimeWatch(anime.id, 1)}
                className="group relative cursor-pointer overflow-hidden rounded-xl border border-white/[0.07] bg-[#14141A]"
              >
                <div className="relative aspect-[3/4] overflow-hidden">
                  <img
                    src={anime.posterUrl}
                    alt={anime.title}
                    referrerPolicy="no-referrer"
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/92 via-black/15 to-transparent" />

                  <span className="absolute left-2 top-2 rounded-md bg-black/70 px-1.5 py-0.5 font-mono-num text-[10px] font-semibold text-amber-400 backdrop-blur-sm">
                    ★ {anime.score}
                  </span>

                  {anime.hasDub && (
                    <span className="absolute right-2 top-2 rounded-md bg-[#FF2E54] px-1.5 py-0.5 text-[9px] font-bold text-white">
                      TR Dublaj
                    </span>
                  )}

                  <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#FF2E54] text-white shadow-xl">
                      <Play className="h-4 w-4 fill-current ml-0.5" />
                    </span>
                  </div>

                  <div className="absolute bottom-2 left-2.5 right-2.5">
                    <p className="font-mono-num text-[10px] font-semibold text-[#FF4D6D]">
                      {anime.latestEpisode}. Bölüm · YENİ
                    </p>
                    <h3 className="mt-0.5 line-clamp-1 text-xs sm:text-[13px] font-bold text-white">
                      {anime.title}
                    </h3>
                    <p className="line-clamp-1 text-[10px] text-zinc-400">
                      {anime.genres.slice(0, 2).join(' · ')}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
        )}

        {/* 5. BEĞENİLEN PROFİLLER */}
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg sm:text-xl font-bold text-white">
              Beğenilen Profiller
            </h2>
            <button
              onClick={() => setActiveSection('topluluk')}
              className="text-xs font-medium text-zinc-400 hover:text-white cursor-pointer"
            >
              Topluluğu Keşfet →
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {currentUser ? (
              <div
                onClick={() => setActiveSection('profil')}
                className="group relative cursor-pointer overflow-hidden rounded-xl border border-[#FF2E54]/40 bg-[#14141A] transition-transform hover:-translate-y-0.5"
              >
                <div className="h-14 w-full overflow-hidden">
                  <img
                    src={currentUser.bannerUrl}
                    alt={currentUser.displayName}
                    referrerPolicy="no-referrer"
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="px-3 pb-3">
                  <div className="-mt-6 mb-1.5">
                    <img
                      src={currentUser.avatarUrl}
                      alt={currentUser.displayName}
                      referrerPolicy="no-referrer"
                      className={`h-11 w-11 rounded-full object-cover ring-4 ring-[#14141A] outline outline-2 ${
                        ACCENT_THEMES[currentUser.accentColor].ring
                      }`}
                    />
                  </div>
                  <p className="truncate text-sm font-bold text-white">
                    {currentUser.displayName}
                  </p>
                  <p className="truncate text-[11px] text-zinc-400">{currentUser.handle}</p>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="inline-flex items-center gap-1 text-[10px] font-medium text-orange-400">
                      <Sunrise className="h-3 w-3" /> Erken Destekçi
                    </span>
                    <span className="text-[11px] font-semibold text-[#FF2E54]">
                      Profilim →
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-start justify-between rounded-xl border border-white/[0.08] bg-[#14141A] p-3.5 bg-[radial-gradient(#262632_1px,transparent_1px)] [background-size:12px_12px]">
                <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-dashed border-zinc-600 bg-[#1A1A22] text-zinc-400">
                  <Plus className="h-4 w-4" />
                </div>
                <div className="mt-3">
                  <h3 className="text-sm font-bold text-white">Sıra sende</h3>
                  <p className="text-[11px] text-zinc-400">Ücretsiz üye ol</p>
                  <button
                    onClick={() => openAuthModal('register')}
                    className="mt-2.5 h-8 rounded-full bg-[#FF2E54] px-4 text-xs font-semibold text-white shadow-[0_0_16px_rgba(255,46,84,0.35)] hover:brightness-110 cursor-pointer"
                  >
                    Kayıt Ol
                  </button>
                </div>
              </div>
            )}

            {likedProfiles.length === 0 ? (
              <div className="col-span-1 sm:col-span-2 lg:col-span-4 flex flex-col justify-between rounded-xl border border-white/[0.08] bg-[#14141A] p-4 sm:flex-row sm:items-center sm:gap-4">
                <div>
                  <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#FF8CA1]">
                    <Heart className="h-3.5 w-3.5 text-[#FF2E54]" />
                    Gerçek Kullanıcı Beğenileri
                  </div>
                  <h3 className="mt-1 text-sm font-bold text-white">
                    Henüz beğenilmiş profil yok
                  </h3>
                  <p className="mt-0.5 text-xs text-zinc-400">
                    Kayıtlı bir üyenin profiline gidip “Profili Beğen” butonuna basıldığında burada otomatik öne çıkar.
                  </p>
                </div>
                <button
                  onClick={() => setActiveSection('topluluk')}
                  className="mt-3 sm:mt-0 inline-flex h-8 shrink-0 items-center justify-center rounded-full border border-white/15 bg-white/[0.06] px-4 text-xs font-semibold text-white hover:bg-white/15 cursor-pointer"
                >
                  Topluluğa Git →
                </button>
              </div>
            ) : (
              likedProfiles.map((profile) => {
                const accent = ACCENT_THEMES[profile.accentColor];
                return (
                  <button
                    key={profile.id}
                    onClick={() => openProfileModal(profile)}
                    className="group overflow-hidden rounded-xl border border-white/[0.08] bg-[#14141A] text-left transition-all hover:-translate-y-0.5 hover:border-white/20 cursor-pointer"
                  >
                    <div className="relative h-14 w-full overflow-hidden bg-zinc-900">
                      <img
                        src={profile.bannerUrl}
                        alt={profile.displayName}
                        referrerPolicy="no-referrer"
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                      <span className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-full bg-black/70 px-2 py-0.5 font-mono-num text-[10px] font-semibold text-[#FF8CA1] backdrop-blur-sm">
                        <Heart className="h-2.5 w-2.5 fill-[#FF2E54] text-[#FF2E54]" />
                        {profile.likesCount ?? 0}
                      </span>
                    </div>
                    <div className="px-3 pb-3">
                      <div className="relative z-10 -mt-6 mb-1.5">
                        <img
                          src={profile.avatarUrl}
                          alt={profile.displayName}
                          referrerPolicy="no-referrer"
                          className="h-11 w-11 rounded-full object-cover ring-4 ring-[#14141A]"
                          style={{ boxShadow: `0 0 0 2px ${accent.hex}` }}
                        />
                      </div>
                      <h3
                        className="truncate text-sm font-bold"
                        style={{ color: accent.hex }}
                      >
                        {profile.displayName}
                      </h3>
                      <p className="truncate text-[11px] text-zinc-400">{profile.handle}</p>

                      <div className="mt-2 flex flex-wrap items-center gap-1">
                        {profile.roleBadge && (
                          <span
                            className="rounded-full border px-2 py-0.5 text-[10px] font-semibold"
                            style={{
                              borderColor: `${accent.hex}55`,
                              backgroundColor: `${accent.hex}18`,
                              color: accent.hex,
                            }}
                          >
                            {profile.roleBadge}
                          </span>
                        )}
                        {profile.badges.some((b) => b.type === 'early') && (
                          <span
                            title="Erken Destekçi"
                            className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-orange-500/15 text-orange-400"
                          >
                            <Sunrise className="h-3 w-3" />
                          </span>
                        )}
                        {profile.badges.some((b) => b.type === 'gift') && (
                          <span
                            title="Premium"
                            className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-amber-500/15 text-amber-400"
                          >
                            <Crown className="h-3 w-3" />
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </section>

        {/* 6. CANIN NE İSTİYOR? + KATALOG */}
        {animes.length > 0 && (
        <section ref={catalogRef}>
          <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-white">
                Canın ne istiyor?
              </h2>
              <p className="text-xs text-zinc-400">
                Türler, ruh haline göre
              </p>
            </div>

            <button
              onClick={() => setSelectedGenre('Tümü')}
              className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-[#14141A] px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-white/10 cursor-pointer"
            >
              Tüm Türler
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-6">
            {MOOD_CARDS.map((mood) => {
              const active = selectedGenre === mood.genre;
              return (
                <button
                  key={mood.id}
                  onClick={() =>
                    setSelectedGenre((prev) =>
                      prev === mood.genre ? 'Tümü' : mood.genre
                    )
                  }
                  className={`group relative h-20 overflow-hidden rounded-xl border text-left transition-all cursor-pointer ${
                    active
                      ? 'border-[#FF2E54] ring-2 ring-[#FF2E54]/40'
                      : 'border-white/[0.08] hover:border-white/25'
                  }`}
                >
                  <img
                    src={mood.image}
                    alt={mood.title}
                    referrerPolicy="no-referrer"
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/55 to-black/25" />
                  <div className="absolute bottom-2 left-2.5 right-2.5">
                    <p className="text-[11px] font-bold text-white leading-snug">
                      {mood.title}
                    </p>
                    <p className="truncate text-[10px] text-zinc-300">
                      {mood.subtitle}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-1.5">
              {GENRES_LIST.map((genre) => {
                const active = selectedGenre === genre;
                return (
                  <button
                    key={genre}
                    onClick={() => setSelectedGenre(genre)}
                    className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      active
                        ? 'bg-[#FF2E54] text-white'
                        : 'border border-white/10 bg-[#14141A] text-zinc-300 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    {genre}
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400" />
                <input
                  type="text"
                  value={catalogSearch}
                  onChange={(e) => setCatalogSearch(e.target.value)}
                  placeholder="Katalogda ara..."
                  className="h-8 w-40 rounded-full border border-white/10 bg-[#14141A] pl-8 pr-3 text-xs text-white placeholder:text-zinc-500 focus:border-[#FF2E54] focus:outline-none"
                />
              </div>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                className="h-8 rounded-full border border-white/10 bg-[#14141A] px-2.5 text-xs font-medium text-zinc-200 focus:border-[#FF2E54] focus:outline-none cursor-pointer"
              >
                <option value="popular">En Çok İzlenen</option>
                <option value="score">En Yüksek Puan</option>
                <option value="newest">En Yeni</option>
                <option value="az">İsme Göre (A-Z)</option>
              </select>
            </div>
          </div>

          {filteredCatalog.length === 0 ? (
            <div className="mt-6 rounded-xl border border-white/[0.08] bg-[#14141A] py-10 text-center">
              <Sparkles className="mx-auto h-7 w-7 text-zinc-500" />
              <p className="mt-2 text-xs font-medium text-zinc-300">
                Bu filtreye uygun anime bulunamadı.
              </p>
              <button
                onClick={() => {
                  setSelectedGenre('Tümü');
                  setCatalogSearch('');
                }}
                className="mt-2 text-xs font-semibold text-[#FF2E54] hover:underline cursor-pointer"
              >
                Filtreleri sıfırla
              </button>
            </div>
          ) : (
            <div className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-7">
              {filteredCatalog.map((anime) => (
                <div
                  key={anime.id}
                  onClick={() => openAnimeWatch(anime.id, 1)}
                  className="group cursor-pointer"
                >
                  <div className="relative aspect-[2/3] overflow-hidden rounded-xl border border-white/[0.07] bg-[#14141A]">
                    <img
                      src={anime.posterUrl}
                      alt={anime.title}
                      referrerPolicy="no-referrer"
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-black/20" />
                    <span className="absolute left-1.5 top-1.5 rounded bg-black/70 px-1.5 py-0.5 font-mono-num text-[10px] font-semibold text-amber-400 backdrop-blur-sm">
                      ★ {anime.score}
                    </span>
                    {anime.hasDub && (
                      <span className="absolute right-1.5 top-1.5 rounded bg-[#FF2E54] px-1.5 py-0.5 text-[9px] font-bold text-white">
                        TR
                      </span>
                    )}
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity group-hover:opacity-100">
                      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#FF2E54] text-white shadow-lg">
                        <Play className="h-3.5 w-3.5 fill-current ml-0.5" />
                      </span>
                    </div>
                    <span className="absolute bottom-1.5 left-1.5 font-mono-num text-[10px] font-medium text-zinc-300">
                      {anime.episodeCount} Bölüm
                    </span>
                  </div>
                  <h3 className="mt-1.5 line-clamp-1 text-xs font-semibold text-white group-hover:text-[#FF2E54] transition-colors">
                    {anime.title}
                  </h3>
                  <p className="line-clamp-1 text-[10px] text-zinc-400">
                    {anime.genres.slice(0, 2).join(' · ')}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>
        )}
      </div>
    </div>
  );
};
