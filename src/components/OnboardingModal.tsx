import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Film,
  Heart,
  Lock,
  MessageCircle,
  Search,
  ShieldCheck,
  Sparkles,
  UserCheck,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import { useAppState } from '../context/AppStateContext';
import { ACCENT_THEMES, ONBOARDING_GENRES } from '../data/animeData';
import { AniListSearchResult, TopAnimePick } from '../types/anime';
import { computeTasteMatches } from '../utils/tasteMatch';

type OnboardingStep = 'privacy' | 'genres' | 'animes' | 'matches';

export const OnboardingModal: React.FC = () => {
  const {
    animes,
    profiles,
    currentUser,
    onboardingOpen,
    closeOnboarding,
    saveOnboardingProgress,
    friendsIds,
    toggleFriend,
    openDmWith,
    logout,
    showToast,
  } = useAppState();

  const [step, setStep] = useState<OnboardingStep>('privacy');
  const [privacyChecked, setPrivacyChecked] = useState(false);
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [selectedPicks, setSelectedPicks] = useState<TopAnimePick[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [anilistPool, setAnilistPool] = useState<AniListSearchResult[]>([]);
  const [loadingAnimes, setLoadingAnimes] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!onboardingOpen || !currentUser) return;
    setPrivacyChecked(Boolean(currentUser.privacyAcceptedAt));
    setSelectedGenres(currentUser.favoriteGenres ?? []);
    setSelectedPicks(currentUser.topAnimePicks ?? []);
    setStep(currentUser.privacyAcceptedAt ? 'genres' : 'privacy');
  }, [onboardingOpen, currentUser?.id]);

  useEffect(() => {
    if (!onboardingOpen || step !== 'animes') return;
    if (anilistPool.length > 0) return;
    let active = true;
    setLoadingAnimes(true);
    fetch('/api/anilist/search?popular=1')
      .then((r) => r.json())
      .then((d) => {
        if (active && Array.isArray(d.results)) {
          setAnilistPool(d.results);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoadingAnimes(false);
      });
    return () => {
      active = false;
    };
  }, [onboardingOpen, step, anilistPool.length]);

  const animesById = useMemo(() => {
    const map = new Map<string, { title: string; genres: string[] }>();
    for (const a of animes) {
      map.set(a.id, { title: a.title, genres: a.genres });
    }
    return map;
  }, [animes]);

  const previewUser = useMemo(() => {
    if (!currentUser) return null;
    return {
      ...currentUser,
      favoriteGenres: selectedGenres,
      topAnimePicks: selectedPicks,
    };
  }, [currentUser, selectedGenres, selectedPicks]);

  const matches = useMemo(() => {
    if (!previewUser) return [];
    return computeTasteMatches(previewUser, profiles, animesById);
  }, [previewUser, profiles, animesById]);

  if (!onboardingOpen || !currentUser) return null;

  const isPrivacyRequired = !currentUser.privacyAcceptedAt;

  const handleAcceptPrivacy = async () => {
    if (!privacyChecked) return;
    setSaving(true);
    const res = await saveOnboardingProgress({ acceptPrivacy: true });
    setSaving(false);
    if (res.ok) {
      setStep('genres');
    } else {
      showToast(res.error || 'Gizlilik onayı kaydedilemedi.');
    }
  };

  const handleDeclinePrivacy = async () => {
    await logout();
    showToast('Gizlilik politikasını kabul etmeden hesap kullanılamaz.');
  };

  const toggleGenre = (genre: string) => {
    setSelectedGenres((prev) =>
      prev.includes(genre) ? prev.filter((g) => g !== genre) : [...prev, genre]
    );
  };

  const handleSaveGenres = async () => {
    if (selectedGenres.length === 0) {
      showToast('Devam etmek için en az 1 favori tür seç.');
      return;
    }
    setSaving(true);
    const res = await saveOnboardingProgress({ favoriteGenres: selectedGenres });
    setSaving(false);
    if (res.ok) {
      setStep('animes');
    } else {
      showToast(res.error || 'Türler kaydedilemedi.');
    }
  };

  const handleSearchAniList = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const q = searchQuery.trim();
    setLoadingAnimes(true);
    try {
      const url = q
        ? `/api/anilist/search?q=${encodeURIComponent(q)}`
        : '/api/anilist/search?popular=1';
      const res = await fetch(url);
      const data = await res.json();
      if (Array.isArray(data.results)) {
        setAnilistPool(data.results);
      }
    } catch {
      showToast('AniList araması yapılamadı.');
    } finally {
      setLoadingAnimes(false);
    }
  };

  const isPickSelected = (pickId: string, anilistId?: number) =>
    selectedPicks.some(
      (p) => p.id === pickId || (anilistId && p.anilistId === anilistId)
    );

  const togglePick = (pick: TopAnimePick) => {
    setSelectedPicks((prev) => {
      const exists = prev.some(
        (p) => p.id === pick.id || (pick.anilistId && p.anilistId === pick.anilistId)
      );
      if (exists) {
        return prev.filter(
          (p) => p.id !== pick.id && !(pick.anilistId && p.anilistId === pick.anilistId)
        );
      }
      if (prev.length >= 3) {
        showToast('En fazla 3 favori anime seçebilirsin. Değiştirmek için birini kaldır.');
        return prev;
      }
      return [...prev, pick];
    });
  };

  const handleSaveAnimes = async () => {
    if (selectedPicks.length < 3) {
      showToast('Lütfen en sevdiğin 3 animeyi seç.');
      return;
    }
    setSaving(true);
    const res = await saveOnboardingProgress({ topAnimePicks: selectedPicks });
    setSaving(false);
    if (res.ok) {
      setStep('matches');
    } else {
      showToast(res.error || 'Favori animeler kaydedilemedi.');
    }
  };

  const handleFinish = async () => {
    setSaving(true);
    await saveOnboardingProgress({
      favoriteGenres: selectedGenres,
      topAnimePicks: selectedPicks,
      onboardingCompleted: true,
    });
    setSaving(false);
    closeOnboarding();
    showToast('Profil rehberin tamamlandı! Keyifli seyirler.');
  };

  const handleStartDmFromMatch = async (peerId: string) => {
    await saveOnboardingProgress({
      favoriteGenres: selectedGenres,
      topAnimePicks: selectedPicks,
      onboardingCompleted: true,
    });
    closeOnboarding();
    openDmWith(peerId);
  };

  const combinedCandidates: TopAnimePick[] = [
    ...animes.map((a) => ({
      id: a.id,
      anilistId: a.anilistId,
      title: a.title,
      posterUrl: a.posterUrl,
      genres: a.genres,
      score: a.score,
    })),
    ...anilistPool
      .filter((r) => !animes.some((a) => a.anilistId === r.id))
      .map((r) => ({
        id: `anilist-${r.id}`,
        anilistId: r.id,
        title: r.title,
        posterUrl: r.coverUrl,
        genres: r.genres,
        score: r.score,
      })),
  ];

  const stepIndex =
    step === 'privacy' ? 1 : step === 'genres' ? 2 : step === 'animes' ? 3 : 4;

  return (
    <div className="fixed inset-0 z-[105] flex items-center justify-center overflow-y-auto bg-[#08080B]/92 p-4 backdrop-blur-md">
      <div
        className="relative w-full max-w-3xl overflow-hidden rounded-3xl border border-white/10 bg-[#131318] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Progress Header */}
        <div className="flex items-center justify-between border-b border-white/[0.08] bg-[#16161D] px-6 py-4">
          <div className="flex items-center gap-3">
            <span className="font-mono-num text-xs font-bold tracking-wider text-[#FF2E54]">
              ADIM {stepIndex} / 4
            </span>
            <span className="text-xs text-zinc-400">
              {step === 'privacy' && 'Gizlilik Politikası ve Kurallar'}
              {step === 'genres' && 'Favori Türlerin'}
              {step === 'animes' && 'En Sevdiğin 3 Anime'}
              {step === 'matches' && 'Aynı Zevklere Sahip İnsanlar'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-1.5">
              {[1, 2, 3, 4].map((n) => (
                <span
                  key={n}
                  className={`h-1.5 w-6 rounded-full transition-colors ${
                    n <= stepIndex ? 'bg-[#FF2E54]' : 'bg-white/10'
                  }`}
                />
              ))}
            </div>
            {!isPrivacyRequired && (
              <button
                type="button"
                onClick={closeOnboarding}
                aria-label="Kapat"
                className="ml-2 flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/[0.05] text-zinc-400 hover:text-white cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* Step 1: Privacy Policy & Terms */}
        {step === 'privacy' && (
          <div className="p-6 sm:p-8 space-y-5">
            <div>
              <div className="inline-flex items-center gap-2 text-xs font-semibold text-[#FF4D6D]">
                <ShieldCheck className="h-4 w-4" />
                Hoş geldin, {currentUser.displayName}
              </div>
              <h2 className="mt-1.5 text-2xl font-bold text-white">
                Gizlilik Politikası ve Topluluk İlkeleri
              </h2>
              <p className="mt-1 text-sm text-zinc-400">
                Hesabını kullanmaya başlamadan önce verilerinin nasıl korunduğunu inceleyip onaylaman gerekiyor.
              </p>
            </div>

            <div className="max-h-60 overflow-y-auto rounded-2xl border border-white/10 bg-[#0E0E13] p-5 space-y-4 text-xs leading-relaxed text-zinc-300">
              <div>
                <h3 className="flex items-center gap-2 text-sm font-semibold text-white">
                  <Lock className="h-3.5 w-3.5 text-[#FF2E54]" />
                  1. Kişisel Veriler & Hesap Gizliliği
                </h3>
                <p className="mt-1 text-zinc-400">
                  Kayıt olurken paylaştığın e-posta adresi ve şifre bilgilerin diğer üyelere gösterilmez,
                  üçüncü taraflarla paylaşılmaz. Profilinde yalnızca seçtiğin görünen isim, kullanıcı adı,
                  anime avatarın ve beğendiğin türler listelenir.
                </p>
              </div>
              <div>
                <h3 className="flex items-center gap-2 text-sm font-semibold text-white">
                  <MessageCircle className="h-3.5 w-3.5 text-[#FF2E54]" />
                  2. Direkt Mesajlar (DM) ve Topluluk Kuralları
                </h3>
                <p className="mt-1 text-zinc-400">
                  Diğer üyelerle arkadaş olup DM üzerinden sohbet edebilirsin. Rahatsız edici davranış,
                  spoiler uyarısız paylaşım, hakaret ve spam yasaktır.
                </p>
              </div>
              <div>
                <h3 className="flex items-center gap-2 text-sm font-semibold text-white">
                  <Film className="h-3.5 w-3.5 text-[#FF2E54]" />
                  3. İzleme Tercihleri & Kişiselleştirme
                </h3>
                <p className="mt-1 text-zinc-400">
                  Bir sonraki adımlarda seçeceğin favori türler ve en sevdiğin 3 anime, yalnızca aynı
                  zevklere sahip anime severleri keşfetmen ve profilini kişiselleştirmen için saklanır.
                </p>
              </div>
            </div>

            <label className="flex items-start gap-3 rounded-2xl border border-white/10 bg-[#181820] p-4 cursor-pointer">
              <input
                type="checkbox"
                checked={privacyChecked}
                onChange={(e) => setPrivacyChecked(e.target.checked)}
                className="mt-0.5 h-4 w-4 accent-[#FF2E54] cursor-pointer"
              />
              <span className="text-xs sm:text-sm text-zinc-200 leading-relaxed">
                AnimeXir <strong className="text-white">Gizlilik Politikası</strong> ve{' '}
                <strong className="text-white">Topluluk Kullanım Koşulları</strong>nı okudum ve kabul ediyorum.
              </span>
            </label>

            <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3 pt-1">
              <button
                type="button"
                onClick={handleDeclinePrivacy}
                className="text-xs font-medium text-zinc-400 hover:text-rose-400 cursor-pointer"
              >
                Kabul Etmiyorum (Çıkış Yap)
              </button>
              <button
                type="button"
                disabled={!privacyChecked || saving}
                onClick={handleAcceptPrivacy}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-[#FF2E54] px-6 text-sm font-semibold text-white shadow-[0_0_24px_rgba(255,46,84,0.35)] hover:brightness-110 disabled:opacity-40 cursor-pointer"
              >
                {saving ? 'Kaydediliyor...' : 'Kabul Et ve Rehbere Başla'}
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Favorite Genres */}
        {step === 'genres' && (
          <div className="p-6 sm:p-8 space-y-6">
            <div>
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#FF4D6D]">
                <Sparkles className="h-3.5 w-3.5" />
                Zevk Profili Oluştur
              </span>
              <h2 className="mt-1 text-2xl font-bold text-white">
                Hangi anime türlerini seviyorsun?
              </h2>
              <p className="mt-1 text-sm text-zinc-400">
                Seni benzer zevklere sahip insanlarla eşleştirebilmemiz için favori türlerini seç ({selectedGenres.length} seçildi).
              </p>
            </div>

            <div className="flex flex-wrap gap-2.5">
              {ONBOARDING_GENRES.map((genre) => {
                const active = selectedGenres.includes(genre);
                return (
                  <button
                    key={genre}
                    type="button"
                    onClick={() => toggleGenre(genre)}
                    className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-xs sm:text-sm font-medium whitespace-nowrap transition-all cursor-pointer ${
                      active
                        ? 'border-[#FF2E54] bg-[#FF2E54]/20 text-white shadow-[0_0_16px_rgba(255,46,84,0.2)]'
                        : 'border-white/10 bg-[#191922] text-zinc-300 hover:border-white/25 hover:text-white'
                    }`}
                  >
                    {active && <Check className="h-3.5 w-3.5 text-[#FF4D6D]" />}
                    {genre}
                  </button>
                );
              })}
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => setStep('privacy')}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-400 hover:text-white cursor-pointer"
              >
                <ArrowLeft className="h-3.5 w-3.5" /> Geri
              </button>
              <button
                type="button"
                disabled={selectedGenres.length === 0 || saving}
                onClick={handleSaveGenres}
                className="inline-flex h-11 items-center gap-2 rounded-full bg-[#FF2E54] px-6 text-sm font-semibold text-white shadow-[0_0_24px_rgba(255,46,84,0.35)] hover:brightness-110 disabled:opacity-40 cursor-pointer"
              >
                {saving ? 'Kaydediliyor...' : 'Devam Et'}
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Top 3 Favorite Animes */}
        {step === 'animes' && (
          <div className="p-6 sm:p-8 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
              <div>
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#FF4D6D]">
                  <Heart className="h-3.5 w-3.5" />
                  Favori Üçlün
                </span>
                <h2 className="mt-1 text-2xl font-bold text-white">
                  En sevdiğin 3 animeyi seç
                </h2>
                <p className="mt-1 text-xs sm:text-sm text-zinc-400">
                  Katalogdan veya AniList üzerinden arayıp en sevdiğin 3 seriyi işaretle.
                </p>
              </div>
              <span className="font-mono-num self-start sm:self-auto rounded-lg border border-white/10 bg-[#1A1A22] px-3 py-1.5 text-xs font-bold text-white">
                {selectedPicks.length} / 3 Seçildi
              </span>
            </div>

            {/* Selected Slots Preview */}
            <div className="grid grid-cols-3 gap-2.5">
              {[0, 1, 2].map((slotIdx) => {
                const pick = selectedPicks[slotIdx];
                return (
                  <div
                    key={slotIdx}
                    className={`flex items-center gap-2.5 rounded-xl border p-2 ${
                      pick
                        ? 'border-[#FF2E54]/45 bg-[#FF2E54]/10'
                        : 'border-dashed border-white/10 bg-[#17171F]'
                    }`}
                  >
                    {pick ? (
                      <>
                        <img
                          src={pick.posterUrl}
                          alt={pick.title}
                          referrerPolicy="no-referrer"
                          className="h-11 w-8 rounded-md object-cover shrink-0 bg-zinc-800"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-semibold text-white">
                            {pick.title}
                          </p>
                          <p className="truncate text-[10px] text-zinc-400">
                            {pick.genres.slice(0, 2).join(' · ')}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => togglePick(pick)}
                          aria-label="Kaldır"
                          className="rounded-full p-1 text-zinc-400 hover:bg-black/40 hover:text-white cursor-pointer"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </>
                    ) : (
                      <div className="flex h-11 w-full items-center justify-center text-[11px] text-zinc-500">
                        {slotIdx + 1}. Favori Boş
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Search bar */}
            <form onSubmit={handleSearchAniList} className="flex gap-2">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Anime ara (Attack on Titan, Death Note, Frieren, One Piece...)"
                  className="h-10 w-full rounded-xl border border-white/10 bg-[#191922] pl-10 pr-3 text-xs sm:text-sm text-white placeholder:text-zinc-500 focus:border-[#FF2E54] focus:outline-none"
                />
              </div>
              <button
                type="submit"
                disabled={loadingAnimes}
                className="h-10 rounded-xl border border-white/15 bg-white/[0.08] px-4 text-xs font-semibold text-white hover:bg-white/15 whitespace-nowrap cursor-pointer"
              >
                {loadingAnimes ? 'Aranıyor...' : 'AniList’te Ara'}
              </button>
            </form>

            {/* Anime grid */}
            <div className="grid max-h-64 grid-cols-2 sm:grid-cols-4 gap-2.5 overflow-y-auto pr-1">
              {combinedCandidates.map((item) => {
                const selected = isPickSelected(item.id, item.anilistId);
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => togglePick(item)}
                    className={`group relative flex flex-col overflow-hidden rounded-xl border text-left transition-all cursor-pointer ${
                      selected
                        ? 'border-[#FF2E54] bg-[#FF2E54]/15 ring-1 ring-[#FF2E54]'
                        : 'border-white/10 bg-[#181820] hover:border-white/30'
                    }`}
                  >
                    <div className="relative aspect-[3/4] w-full overflow-hidden bg-zinc-900">
                      <img
                        src={item.posterUrl}
                        alt={item.title}
                        referrerPolicy="no-referrer"
                        className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />
                      {selected && (
                        <span className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-[#FF2E54] text-white shadow-lg">
                          <Check className="h-3.5 w-3.5" />
                        </span>
                      )}
                      <div className="absolute inset-x-2 bottom-2">
                        <p className="line-clamp-2 text-xs font-semibold text-white leading-snug">
                          {item.title}
                        </p>
                        <p className="mt-0.5 truncate text-[10px] text-zinc-300">
                          {item.genres.slice(0, 2).join(' · ')}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="flex items-center justify-between pt-1">
              <button
                type="button"
                onClick={() => setStep('genres')}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-400 hover:text-white cursor-pointer"
              >
                <ArrowLeft className="h-3.5 w-3.5" /> Geri
              </button>
              <button
                type="button"
                disabled={selectedPicks.length < 3 || saving}
                onClick={handleSaveAnimes}
                className="inline-flex h-11 items-center gap-2 rounded-full bg-[#FF2E54] px-6 text-sm font-semibold text-white shadow-[0_0_24px_rgba(255,46,84,0.35)] hover:brightness-110 disabled:opacity-40 cursor-pointer"
              >
                {saving ? 'Kaydediliyor...' : 'Eşleşmeleri Gör'}
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* Step 4: People with Similar Tastes */}
        {step === 'matches' && (
          <div className="p-6 sm:p-8 space-y-5">
            <div>
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#FF4D6D]">
                <Users className="h-3.5 w-3.5" />
                Seninle Aynı Zevklere Sahip İnsanlar
              </span>
              <h2 className="mt-1 text-2xl font-bold text-white">
                Anime arkadaşlarını bul ve DM başlat
              </h2>
              <p className="mt-1 text-xs sm:text-sm text-zinc-400">
                Seçtiğin türlere ve favori 3 animene göre diğer üyeleri sıraladık. İstediğin kişiyi ekleyip hemen mesaj atabilirsin.
              </p>
            </div>

            {matches.length === 0 ? (
              <div className="rounded-2xl border border-white/10 bg-[#181820] p-6 text-center text-sm text-zinc-400">
                Şu an senden başka üye bulunmuyor. Yeni üyeler katıldıkça Topluluk sayfasında eşleşmelerini görebilirsin.
              </div>
            ) : (
              <div className="max-h-80 space-y-3 overflow-y-auto pr-1">
                {matches.map(({ profile, sharedGenres, sharedAnimeTitles }) => {
                  const accent = ACCENT_THEMES[profile.accentColor];
                  const isFriend = friendsIds.includes(profile.id);
                  return (
                    <div
                      key={profile.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-white/10 bg-[#181820] p-4"
                    >
                      <div className="flex items-start gap-3.5 min-w-0">
                        <img
                          src={profile.avatarUrl}
                          alt={profile.displayName}
                          referrerPolicy="no-referrer"
                          className="h-12 w-12 rounded-full object-cover shrink-0"
                          style={{ boxShadow: `0 0 0 2px ${accent.hex}` }}
                        />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="truncate text-sm font-bold" style={{ color: accent.hex }}>
                              {profile.displayName}
                            </p>
                            <span className="text-xs text-zinc-500">{profile.handle}</span>
                          </div>
                          {sharedAnimeTitles.length > 0 || sharedGenres.length > 0 ? (
                            <p className="mt-1 text-xs text-emerald-300">
                              Ortak zevk:{' '}
                              {[...sharedAnimeTitles, ...sharedGenres].slice(0, 4).join(' · ')}
                            </p>
                          ) : (
                            <p className="mt-1 text-xs text-zinc-400 line-clamp-1">
                              {profile.favoriteGenres?.length
                                ? `Sevdiği türler: ${profile.favoriteGenres.slice(0, 4).join(', ')}`
                                : profile.bio}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => toggleFriend(profile.id)}
                          className={`inline-flex h-9 items-center gap-1.5 rounded-full px-4 text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                            isFriend
                              ? 'border border-emerald-500/40 bg-emerald-500/15 text-emerald-300'
                              : 'border border-white/15 bg-white/[0.06] text-white hover:bg-white/15'
                          }`}
                        >
                          {isFriend ? (
                            <>
                              <UserCheck className="h-3.5 w-3.5" /> Arkadaşın
                            </>
                          ) : (
                            <>
                              <UserPlus className="h-3.5 w-3.5" /> Arkadaş Ekle
                            </>
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleStartDmFromMatch(profile.id)}
                          className="inline-flex h-9 items-center gap-1.5 rounded-full bg-[#FF2E54] px-4 text-xs font-semibold text-white whitespace-nowrap hover:brightness-110 cursor-pointer"
                        >
                          <MessageCircle className="h-3.5 w-3.5" />
                          DM Yaz
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="flex items-center justify-between pt-1">
              <button
                type="button"
                onClick={() => setStep('animes')}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-400 hover:text-white cursor-pointer"
              >
                <ArrowLeft className="h-3.5 w-3.5" /> Geri
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={handleFinish}
                className="inline-flex h-11 items-center gap-2 rounded-full bg-[#FF2E54] px-6 text-sm font-semibold text-white shadow-[0_0_24px_rgba(255,46,84,0.35)] hover:brightness-110 cursor-pointer"
              >
                {saving ? 'Tamamlanıyor...' : 'Rehberi Tamamla ve Keşfet'}
                <Check className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
