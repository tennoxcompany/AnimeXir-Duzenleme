import React, { useEffect, useState } from 'react';
import {
  Check,
  Clock,
  Crown,
  Database,
  Download,
  Film,
  Gift,
  Loader2,
  Plus,
  Search,
  ShieldAlert,
  ShieldCheck,
  Star,
  Trash2,
} from 'lucide-react';
import { useAppState } from '../context/AppStateContext';
import { AniListSearchResult, EpisodeMirror, PremiumPlan } from '../types/anime';

export const AdminView: React.FC = () => {
  const {
    currentUser,
    animes,
    importAniListAnime,
    updateAdminAnime,
    deleteAdminAnime,
    saveEpisodeSource,
    saveEpisodesBulk,
    openAnimeWatch,
    showToast,
    premiumPlans,
    giveaway,
    giveawayRemainingSeconds,
    premiumOrders,
    startAdminGiveaway,
    drawAdminGiveaway,
    stopAdminGiveaway,
    saveAdminPlans,
    resolveAdminOrder,
  } = useAppState();

  const [activeTab, setActiveTab] = useState<'anilist' | 'episodes' | 'catalog' | 'premium'>('anilist');

  // Tab 1: AniList Search & Import
  const [anilistQuery, setAnilistQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<AniListSearchResult[]>([]);
  const [selectedImport, setSelectedImport] = useState<AniListSearchResult | null>(null);
  const [customTitle, setCustomTitle] = useState('');
  const [customSynopsis, setCustomSynopsis] = useState('');
  const [importLogoUrl, setImportLogoUrl] = useState('');
  const [importHasDub, setImportHasDub] = useState(false);
  const [importFeatured, setImportFeatured] = useState(true);
  const [firstVideoUrl, setFirstVideoUrl] = useState('');
  const [firstSubtitle, setFirstSubtitle] = useState('');
  const [importing, setImporting] = useState(false);

  // Tab 2: Episode Video & Subtitle Manager
  const [epAnimeId, setEpAnimeId] = useState<string>(animes[0]?.id ?? '');
  const [epNumber, setEpNumber] = useState<number>(1);
  const [epTitle, setEpTitle] = useState('');
  const [epVideoUrl, setEpVideoUrl] = useState('');
  const [epDubUrl, setEpDubUrl] = useState('');
  const [epMirrors, setEpMirrors] = useState<EpisodeMirror[]>([]);
  const [epSubtitle, setEpSubtitle] = useState('');
  const [savingEp, setSavingEp] = useState(false);

  // Bulk Episode Manager
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkMode, setBulkMode] = useState<'lines' | 'template' | 'subtitles'>('lines');
  const [bulkStartEp, setBulkStartEp] = useState<number>(1);
  const [bulkEndEp, setBulkEndEp] = useState<number>(12);
  const [bulkTarget, setBulkTarget] = useState<'primary-sub' | 'primary-dub' | 'mirror-sub' | 'mirror-dub'>('primary-sub');
  const [bulkMirrorLabel, setBulkMirrorLabel] = useState<string>('Sibnet');
  const [bulkLinesText, setBulkLinesText] = useState<string>('');
  const [bulkTemplateUrl, setBulkTemplateUrl] = useState<string>('');
  const [savingBulk, setSavingBulk] = useState(false);

  // Tab 4: Premium Giveaway & Shop Plans
  const [gwTitle, setGwTitle] = useState('1 Aylık Xir Pro Çekilişi');
  const [gwPrize, setGwPrize] = useState('1 Aylık Xir Pro');
  const [gwHours, setGwHours] = useState<number>(24);
  const [plansDraft, setPlansDraft] = useState<PremiumPlan[]>(premiumPlans);
  const [savingPlans, setSavingPlans] = useState(false);

  useEffect(() => {
    setPlansDraft(premiumPlans);
  }, [premiumPlans]);

  if (!currentUser?.isAdmin) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <div className="rounded-3xl border border-rose-500/30 bg-[#14141A] p-8">
          <ShieldAlert className="mx-auto h-12 w-12 text-rose-400" />
          <h1 className="mt-4 text-2xl font-bold text-white">Yönetici Yetkisi Gerekli</h1>
          <p className="mt-2 text-sm text-zinc-400">
            Bu panel yalnızca Yönetici yetkisine sahip hesaplar (@wanderer veya yönetici Google hesabı) tarafından kullanılabilir.
          </p>
        </div>
      </div>
    );
  }

  const handleAniListSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!anilistQuery.trim()) return;
    setSearching(true);
    try {
      const res = await fetch(`/api/anilist/search?q=${encodeURIComponent(anilistQuery.trim())}`);
      const data = await res.json();
      if (Array.isArray(data.results)) {
        setSearchResults(data.results);
      } else {
        showToast('AniList araması başarısız.');
      }
    } catch {
      showToast('AniList sunucusuna bağlanılamadı.');
    } finally {
      setSearching(false);
    }
  };

  const handleSelectForImport = (item: AniListSearchResult) => {
    setSelectedImport(item);
    setCustomTitle(item.title);
    setCustomSynopsis(item.description);
    setImportLogoUrl('');
    setImportHasDub(false);
    setImportFeatured(true);
    setFirstVideoUrl('');
    setFirstSubtitle('');
  };

  const handleConfirmImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedImport) return;
    setImporting(true);
    const res = await importAniListAnime({
      ...selectedImport,
      customTitle,
      customSynopsis,
      logoUrl: importLogoUrl.trim() || undefined,
      hasDub: importHasDub,
      featured: importFeatured,
      firstEpisodeVideoUrl: firstVideoUrl,
      firstEpisodeSubtitleVtt: firstSubtitle,
    });
    setImporting(false);
    if (res.ok) {
      setSelectedImport(null);
    }
  };

  const selectedManageAnime = animes.find((a) => a.id === epAnimeId) ?? animes[0];

  const handleLoadEpisodeIntoForm = (num: number) => {
    setEpNumber(num);
    const ep = selectedManageAnime?.episodes.find((e) => e.number === num);
    setEpTitle(ep?.title ?? `${num}. Bölüm`);
    setEpVideoUrl(ep?.videoUrl ?? '');
    setEpDubUrl(ep?.dubVideoUrl ?? '');
    setEpMirrors(ep?.mirrors ?? []);
    setEpSubtitle(ep?.subtitleVtt ?? '');
  };

  const handleSaveEpisode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedManageAnime) return;
    setSavingEp(true);
    const res = await saveEpisodeSource(selectedManageAnime.id, epNumber, {
      title: epTitle,
      videoUrl: epVideoUrl,
      dubVideoUrl: epDubUrl,
      mirrors: epMirrors,
      subtitleVtt: epSubtitle,
    });
    setSavingEp(false);
    if (!res.ok && res.error) {
      showToast(res.error);
    }
  };

  const handleSubtitleFilePick = (
    e: React.ChangeEvent<HTMLInputElement>,
    target: 'first' | 'episode'
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const content = typeof reader.result === 'string' ? reader.result : '';
      if (target === 'first') setFirstSubtitle(content);
      else setEpSubtitle(content);
      showToast(`${file.name} yüklendi (SRT/VTT otomatik uyarlanır).`);
    };
    reader.readAsText(file, 'utf-8');
    e.target.value = '';
  };

  const handleBulkApplyLinesOrTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedManageAnime) return;
    const start = Math.max(1, Number(bulkStartEp) || 1);
    const items: Array<{
      number: number;
      videoUrl?: string;
      dubVideoUrl?: string;
      mirror?: { label: string; url: string; audio: 'sub' | 'dub' };
    }> = [];

    if (bulkMode === 'lines') {
      const lines = bulkLinesText
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter(Boolean);
      if (lines.length === 0) {
        showToast('En az 1 satır video linki veya iframe yapıştır.');
        return;
      }
      lines.forEach((url, idx) => {
        const number = start + idx;
        if (bulkTarget === 'primary-sub') items.push({ number, videoUrl: url });
        else if (bulkTarget === 'primary-dub') items.push({ number, dubVideoUrl: url });
        else if (bulkTarget === 'mirror-dub') {
          items.push({ number, mirror: { label: bulkMirrorLabel.trim() || 'Yedek', url, audio: 'dub' } });
        } else {
          items.push({ number, mirror: { label: bulkMirrorLabel.trim() || 'Yedek', url, audio: 'sub' } });
        }
      });
    } else if (bulkMode === 'template') {
      const tpl = bulkTemplateUrl.trim();
      if (!tpl) {
        showToast('Bir URL şablonu gir.');
        return;
      }
      const end = Math.min(Math.max(start, Number(bulkEndEp) || start), start + 100);
      for (let num = start; num <= end; num++) {
        const ep02 = String(num).padStart(2, '0');
        const ep03 = String(num).padStart(3, '0');
        const url = tpl
          .replace(/\{anilistId\}/g, String(selectedManageAnime.anilistId ?? ''))
          .replace(/\{slug\}/g, selectedManageAnime.slug)
          .replace(/\{ep03\}/g, ep03)
          .replace(/\{ep02\}/g, ep02)
          .replace(/\{ep\}/g, String(num));
        if (bulkTarget === 'primary-sub') items.push({ number: num, videoUrl: url });
        else if (bulkTarget === 'primary-dub') items.push({ number: num, dubVideoUrl: url });
        else if (bulkTarget === 'mirror-dub') {
          items.push({ number: num, mirror: { label: bulkMirrorLabel.trim() || 'Yedek', url, audio: 'dub' } });
        } else {
          items.push({ number: num, mirror: { label: bulkMirrorLabel.trim() || 'Yedek', url, audio: 'sub' } });
        }
      }
    }

    if (items.length === 0) return;
    setSavingBulk(true);
    const res = await saveEpisodesBulk(selectedManageAnime.id, items);
    setSavingBulk(false);
    if (!res.ok && res.error) showToast(res.error);
  };

  const handleBulkSubtitleFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedManageAnime) return;
    const fileList = Array.from(e.target.files ?? []) as File[];
    e.target.value = '';
    if (fileList.length === 0) return;

    const sorted = [...fileList].sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
    const start = Math.max(1, Number(bulkStartEp) || 1);

    setSavingBulk(true);
    const items = await Promise.all(
      sorted.map(
        (file, idx) =>
          new Promise<{ number: number; subtitleVtt: string }>((resolve) => {
            const reader = new FileReader();
            reader.onload = () => {
              const numMatches = file.name.match(/(?:ep|bolum|bölüm|e|[_\-\s])(\d{1,3})(?=\D|$)/i) || file.name.match(/^(\d{1,3})\./);
              const parsedNum = numMatches?.[1] ? Number(numMatches[1]) : start + idx;
              resolve({
                number: parsedNum > 0 ? parsedNum : start + idx,
                subtitleVtt: typeof reader.result === 'string' ? reader.result : '',
              });
            };
            reader.readAsText(file, 'utf-8');
          })
      )
    );

    const res = await saveEpisodesBulk(selectedManageAnime.id, items);
    setSavingBulk(false);
    if (!res.ok && res.error) showToast(res.error);
  };

  return (
    <div className="mx-auto max-w-[1440px] px-4 py-10 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <span className="inline-flex items-center gap-1.5 text-xs font-bold tracking-wider text-emerald-400">
            <ShieldCheck className="h-4 w-4" /> YÖNETİCİ PANELİ · YETKİLİ OTURUM
          </span>
          <h1 className="mt-1.5 text-3xl font-bold text-white">
            AniList & Bölüm Yönetimi
          </h1>
          <p className="mt-1 text-sm text-zinc-400">
            AniList API üzerinden gerçek anime verilerini çek, reklamsız oynatıcı linklerini ve Türkçe altyazıları yönet.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setActiveTab('anilist')}
            className={`rounded-full px-4 py-2 text-xs font-semibold transition-colors cursor-pointer ${
              activeTab === 'anilist'
                ? 'bg-[#FF2E54] text-white'
                : 'border border-white/10 bg-[#14141A] text-zinc-300 hover:bg-white/10'
            }`}
          >
            AniList’ten Anime Çek
          </button>
          <button
            onClick={() => setActiveTab('episodes')}
            className={`rounded-full px-4 py-2 text-xs font-semibold transition-colors cursor-pointer ${
              activeTab === 'episodes'
                ? 'bg-[#FF2E54] text-white'
                : 'border border-white/10 bg-[#14141A] text-zinc-300 hover:bg-white/10'
            }`}
          >
            Bölüm Video & TR Altyazı
          </button>
          <button
            onClick={() => setActiveTab('catalog')}
            className={`rounded-full px-4 py-2 text-xs font-semibold transition-colors cursor-pointer ${
              activeTab === 'catalog'
                ? 'bg-[#FF2E54] text-white'
                : 'border border-white/10 bg-[#14141A] text-zinc-300 hover:bg-white/10'
            }`}
          >
            Katalog ({animes.length})
          </button>
          <button
            onClick={() => setActiveTab('premium')}
            className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-semibold transition-colors cursor-pointer ${
              activeTab === 'premium'
                ? 'bg-amber-400 text-black'
                : 'border border-amber-500/30 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20'
            }`}
          >
            <Crown className="h-3.5 w-3.5" />
            Premium & Çekiliş
          </button>
        </div>
      </div>

      {/* TAB 1: ANILIST SEARCH & IMPORT */}
      {activeTab === 'anilist' && (
        <div className="mt-8 space-y-6">
          <form
            onSubmit={handleAniListSearch}
            className="flex flex-col gap-3 rounded-3xl border border-white/[0.08] bg-[#14141A] p-6 sm:flex-row"
          >
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
              <input
                type="text"
                value={anilistQuery}
                onChange={(e) => setAnilistQuery(e.target.value)}
                placeholder="AniList’te anime ara (ör. Chainsaw Man, Vinland Saga, Blue Lock, Dandadan...)"
                className="h-12 w-full rounded-full border border-white/10 bg-[#1B1B22] pl-11 pr-4 text-sm text-white placeholder:text-zinc-500 focus:border-[#FF2E54] focus:outline-none"
              />
            </div>
            <button
              type="submit"
              disabled={searching}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-[#FF2E54] px-7 text-sm font-semibold text-white shadow-[0_0_20px_rgba(255,46,84,0.35)] hover:brightness-110 disabled:opacity-50 cursor-pointer"
            >
              {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Database className="h-4 w-4" />}
              AniList’ten Ara
            </button>
          </form>

          {/* Selected Import Customization Form */}
          {selectedImport && (
            <form
              onSubmit={handleConfirmImport}
              className="rounded-3xl border border-emerald-500/35 bg-[#121918] p-6 space-y-5"
            >
              <div className="flex flex-col gap-4 sm:flex-row">
                <img
                  src={selectedImport.coverUrl}
                  alt={selectedImport.title}
                  referrerPolicy="no-referrer"
                  className="h-40 w-28 rounded-2xl object-cover shrink-0"
                />
                <div className="flex-1 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono-num text-xs font-bold text-emerald-400">
                      AniList ID: #{selectedImport.id} · {selectedImport.episodeCount} Bölüm
                    </span>
                    <button
                      type="button"
                      onClick={() => setSelectedImport(null)}
                      className="text-xs text-zinc-400 hover:text-white cursor-pointer"
                    >
                      İptal
                    </button>
                  </div>
                  <input
                    type="text"
                    value={customTitle}
                    onChange={(e) => setCustomTitle(e.target.value)}
                    placeholder="Anime Başlığı"
                    className="h-11 w-full rounded-xl border border-white/10 bg-[#0D1110] px-3.5 text-sm font-semibold text-white focus:border-emerald-400 focus:outline-none"
                  />
                  <textarea
                    rows={3}
                    value={customSynopsis}
                    onChange={(e) => setCustomSynopsis(e.target.value)}
                    placeholder="Türkçe özet / açıklama (Hero vitrininde görünür)..."
                    className="w-full rounded-xl border border-white/10 bg-[#0D1110] p-3 text-xs text-zinc-200 focus:border-emerald-400 focus:outline-none"
                  />
                  <input
                    type="text"
                    value={importLogoUrl}
                    onChange={(e) => setImportLogoUrl(e.target.value)}
                    placeholder="Logo PNG URL (Opsiyonel - Şeffaf Başlık Logosu)"
                    className="h-10 w-full rounded-xl border border-white/10 bg-[#0D1110] px-3 text-xs text-white placeholder:text-zinc-500 focus:border-emerald-400 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-zinc-300">
                    1. Bölüm Video Bağlantısı (Opsiyonel: .mp4, .m3u8 veya iframe src)
                  </label>
                  <input
                    type="text"
                    value={firstVideoUrl}
                    onChange={(e) => setFirstVideoUrl(e.target.value)}
                    placeholder="https://...mp4 veya .m3u8"
                    className="h-10 w-full rounded-xl border border-white/10 bg-[#0D1110] px-3 text-xs text-white placeholder:text-zinc-500 focus:border-emerald-400 focus:outline-none"
                  />
                </div>
                <div>
                  <div className="mb-1.5 flex items-center justify-between gap-2">
                    <label className="block text-xs font-medium text-zinc-300">
                      1. Bölüm Türkçe Altyazı (Opsiyonel — videoda gömülüyse boş bırak)
                    </label>
                    <label className="cursor-pointer rounded-full border border-emerald-400/35 bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-300 hover:bg-emerald-500/20">
                      .srt / .vtt Seç
                      <input
                        type="file"
                        accept=".vtt,.srt,text/vtt,application/x-subrip"
                        onChange={(e) => handleSubtitleFilePick(e, 'first')}
                        className="hidden"
                      />
                    </label>
                  </div>
                  <input
                    type="text"
                    value={firstSubtitle}
                    onChange={(e) => setFirstSubtitle(e.target.value)}
                    placeholder="Altyazı URL (.srt/.vtt) veya boş bırak"
                    className="h-10 w-full rounded-xl border border-white/10 bg-[#0D1110] px-3 text-xs text-white placeholder:text-zinc-500 focus:border-emerald-400 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex flex-wrap items-center gap-5 text-xs text-zinc-200">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={importHasDub}
                      onChange={(e) => setImportHasDub(e.target.checked)}
                      className="accent-[#FF2E54]"
                    />
                    Türkçe Dublaj Mevcut
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={importFeatured}
                      onChange={(e) => setImportFeatured(e.target.checked)}
                      className="accent-[#FF2E54]"
                    />
                    Hero Vitrininde Öne Çıkar
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={importing}
                  className="inline-flex h-11 items-center gap-2 rounded-full bg-emerald-500 px-6 text-xs font-bold text-black hover:brightness-110 disabled:opacity-50 cursor-pointer"
                >
                  {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                  Kataloğa Çek & Yayınla
                </button>
              </div>
            </form>
          )}

          {/* AniList Search Results */}
          {searchResults.length > 0 && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {searchResults.map((item) => {
                const alreadyInCatalog = animes.some((a) => a.anilistId === item.id);
                return (
                  <div
                    key={item.id}
                    className="flex gap-4 rounded-2xl border border-white/[0.08] bg-[#14141A] p-4"
                  >
                    <img
                      src={item.coverUrl}
                      alt={item.title}
                      referrerPolicy="no-referrer"
                      className="h-32 w-22 shrink-0 rounded-xl object-cover bg-zinc-900"
                    />
                    <div className="min-w-0 flex-1 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-mono-num text-xs font-bold text-amber-400">
                            ★ {item.score}
                          </span>
                          <span className="font-mono-num text-[11px] text-zinc-400">
                            {item.year} · {item.episodeCount} Bölüm
                          </span>
                        </div>
                        <h3 className="mt-1 line-clamp-2 text-sm font-bold text-white">
                          {item.title}
                        </h3>
                        <p className="mt-1 line-clamp-1 text-[11px] text-zinc-400">
                          {item.studio} · {item.genres.slice(0, 3).join(', ')}
                        </p>
                      </div>

                      <div className="mt-3 flex items-center gap-2">
                        <button
                          onClick={() => handleSelectForImport(item)}
                          className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-full bg-[#FF2E54] px-3 text-xs font-semibold text-white hover:brightness-110 cursor-pointer"
                        >
                          {alreadyInCatalog ? (
                            <>
                              <Check className="h-3.5 w-3.5" /> Güncelle
                            </>
                          ) : (
                            <>
                              <Download className="h-3.5 w-3.5" /> Seç & Çek
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: EPISODE STREAM & TURKISH SUBTITLE EDITOR */}
      {activeTab === 'episodes' && !selectedManageAnime && (
        <div className="mt-8 rounded-3xl border border-white/[0.08] bg-[#14141A] p-8 text-center">
          <Film className="mx-auto h-10 w-10 text-zinc-500" />
          <h2 className="mt-3 text-lg font-bold text-white">Henüz Katalogda Anime Yok</h2>
          <p className="mt-1 text-xs text-zinc-400">
            Bölüm videosu veya Türkçe altyazı eklemek için önce AniList’ten bir anime çekmelisin.
          </p>
          <button
            onClick={() => setActiveTab('anilist')}
            className="mt-4 inline-flex h-9 items-center gap-2 rounded-full bg-[#FF2E54] px-5 text-xs font-semibold text-white hover:brightness-110 cursor-pointer"
          >
            AniList’ten Anime Çek →
          </button>
        </div>
      )}

      {activeTab === 'episodes' && selectedManageAnime && (
        <div className="mt-8 space-y-6">
          {/* Bulk Episode Toolbar */}
          <div className="rounded-3xl border border-white/[0.08] bg-[#14141A] p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-white">
                  Toplu Bölüm & Altyazı İşlemleri ({selectedManageAnime.title})
                </h2>
                <p className="text-xs text-zinc-400">
                  Tek tek eklemek yerine tüm sezon linklerini, özel sunucu şablonunu veya .srt/.vtt altyazılarını tek seferde uygula.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setBulkEndEp(selectedManageAnime.episodes.length || 12);
                  setBulkOpen((o) => !o);
                }}
                className={`inline-flex h-9 items-center gap-1.5 rounded-full px-4 text-xs font-semibold cursor-pointer ${
                  bulkOpen
                    ? 'border border-white/15 bg-white/[0.08] text-white'
                    : 'bg-[#FF2E54] text-white hover:brightness-110'
                }`}
              >
                {bulkOpen ? 'Toplu Paneli Kapat' : 'Toplu Bölüm / Altyazı Ekle'}
              </button>
            </div>

            {bulkOpen && (
              <div className="mt-5 border-t border-white/[0.07] pt-5 space-y-4">
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setBulkMode('lines')}
                    className={`rounded-full px-3.5 py-1.5 text-xs font-semibold cursor-pointer ${
                      bulkMode === 'lines' ? 'bg-white text-black' : 'border border-white/10 bg-[#1B1B22] text-zinc-300'
                    }`}
                  >
                    Satır Satır Link Yapıştır
                  </button>
                  <button
                    type="button"
                    onClick={() => setBulkMode('template')}
                    className={`rounded-full px-3.5 py-1.5 text-xs font-semibold cursor-pointer ${
                      bulkMode === 'template' ? 'bg-white text-black' : 'border border-white/10 bg-[#1B1B22] text-zinc-300'
                    }`}
                  >
                    Özel Sunucu URL Şablonu
                  </button>
                  <button
                    type="button"
                    onClick={() => setBulkMode('subtitles')}
                    className={`rounded-full px-3.5 py-1.5 text-xs font-semibold cursor-pointer ${
                      bulkMode === 'subtitles' ? 'bg-white text-black' : 'border border-white/10 bg-[#1B1B22] text-zinc-300'
                    }`}
                  >
                    Çoklu .srt / .vtt Yükle
                  </button>
                </div>

                {bulkMode !== 'subtitles' ? (
                  <form onSubmit={handleBulkApplyLinesOrTemplate} className="space-y-3">
                    <div className="grid gap-3 sm:grid-cols-4">
                      <div>
                        <label className="mb-1 block text-[11px] text-zinc-400">Başlangıç Bölümü</label>
                        <input
                          type="number"
                          min={1}
                          value={bulkStartEp}
                          onChange={(e) => setBulkStartEp(Number(e.target.value) || 1)}
                          className="h-9 w-full rounded-xl border border-white/10 bg-[#1B1B22] px-3 font-mono-num text-xs text-white focus:border-[#FF2E54] focus:outline-none"
                        />
                      </div>
                      {bulkMode === 'template' && (
                        <div>
                          <label className="mb-1 block text-[11px] text-zinc-400">Bitiş Bölümü</label>
                          <input
                            type="number"
                            min={1}
                            value={bulkEndEp}
                            onChange={(e) => setBulkEndEp(Number(e.target.value) || 12)}
                            className="h-9 w-full rounded-xl border border-white/10 bg-[#1B1B22] px-3 font-mono-num text-xs text-white focus:border-[#FF2E54] focus:outline-none"
                          />
                        </div>
                      )}
                      <div>
                        <label className="mb-1 block text-[11px] text-zinc-400">Hedef Alan</label>
                        <select
                          value={bulkTarget}
                          onChange={(e) => setBulkTarget(e.target.value as typeof bulkTarget)}
                          className="h-9 w-full rounded-xl border border-white/10 bg-[#1B1B22] px-2.5 text-xs text-white focus:border-[#FF2E54] focus:outline-none"
                        >
                          <option value="primary-sub">Ana Kaynak (Altyazılı)</option>
                          <option value="primary-dub">TR Dublaj Kaynağı</option>
                          <option value="mirror-sub">Alternatif Oynatıcı (Altyazı)</option>
                          <option value="mirror-dub">Alternatif Oynatıcı (Dublaj)</option>
                        </select>
                      </div>
                      {(bulkTarget === 'mirror-sub' || bulkTarget === 'mirror-dub') && (
                        <div>
                          <label className="mb-1 block text-[11px] text-zinc-400">Oynatıcı Adı</label>
                          <input
                            type="text"
                            value={bulkMirrorLabel}
                            onChange={(e) => setBulkMirrorLabel(e.target.value)}
                            placeholder="Örn: Sibnet, Ok.ru, Yedek"
                            className="h-9 w-full rounded-xl border border-white/10 bg-[#1B1B22] px-3 text-xs text-white focus:border-[#FF2E54] focus:outline-none"
                          />
                        </div>
                      )}
                    </div>

                    {bulkMode === 'lines' ? (
                      <div>
                        <label className="mb-1 block text-[11px] text-zinc-400">
                          Her satıra 1 bölüm linki veya &lt;iframe src="..."&gt; yapıştır (1. satır = {bulkStartEp}. bölüm)
                        </label>
                        <textarea
                          rows={5}
                          value={bulkLinesText}
                          onChange={(e) => setBulkLinesText(e.target.value)}
                          placeholder={'https://...\nhttps://...\nhttps://...'}
                          className="w-full rounded-xl border border-white/10 bg-[#1B1B22] p-3 font-mono-num text-xs text-white placeholder:text-zinc-500 focus:border-[#FF2E54] focus:outline-none"
                        />
                      </div>
                    ) : (
                      <div>
                        <label className="mb-1 block text-[11px] text-zinc-400">
                          Kendi Sunucu / CDN Şablonun — Değişkenler: <code>{'{ep}'}</code> (1), <code>{'{ep02}'}</code> (01), <code>{'{slug}'}</code>, <code>{'{anilistId}'}</code>
                        </label>
                        <input
                          type="text"
                          value={bulkTemplateUrl}
                          onChange={(e) => setBulkTemplateUrl(e.target.value)}
                          placeholder={`https://cdn.senindomainin.com/${selectedManageAnime.slug}/bolum-{ep02}.mp4`}
                          className="h-10 w-full rounded-xl border border-white/10 bg-[#1B1B22] px-3.5 font-mono-num text-xs text-white placeholder:text-zinc-500 focus:border-[#FF2E54] focus:outline-none"
                        />
                      </div>
                    )}

                    <div className="flex justify-end">
                      <button
                        type="submit"
                        disabled={savingBulk}
                        className="inline-flex h-10 items-center gap-2 rounded-full bg-emerald-500 px-6 text-xs font-bold text-black hover:brightness-110 disabled:opacity-50 cursor-pointer"
                      >
                        {savingBulk ? 'Uygulanıyor...' : 'Tüm Bölümlere Uygula & Kaydet'}
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="rounded-2xl border border-dashed border-white/15 bg-[#191922] p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold text-white">
                        Birden fazla .srt / .vtt dosyasını aynı anda seç
                      </p>
                      <p className="mt-1 text-xs text-zinc-400">
                        Dosya adındaki numarayı (ör. <code>01.srt</code>, <code>ep02.vtt</code>) otomatik algılayıp ilgili bölüme yazar; numara yoksa {bulkStartEp}. bölümden sırayla eşler.
                      </p>
                    </div>
                    <label className="inline-flex h-10 shrink-0 cursor-pointer items-center justify-center rounded-full bg-[#FF2E54] px-5 text-xs font-semibold text-white hover:brightness-110">
                      {savingBulk ? 'Yükleniyor...' : 'Dosyaları Seç & Yükle'}
                      <input
                        type="file"
                        multiple
                        accept=".vtt,.srt,text/vtt,application/x-subrip"
                        onChange={handleBulkSubtitleFiles}
                        className="hidden"
                      />
                    </label>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
            <div className="rounded-3xl border border-white/[0.08] bg-[#14141A] p-6 space-y-4">
              <h2 className="flex items-center gap-2 text-lg font-bold text-white">
                <Film className="h-5 w-5 text-[#FF2E54]" />
                Anime & Bölüm Seç
              </h2>

            <select
              value={selectedManageAnime.id}
              onChange={(e) => {
                setEpAnimeId(e.target.value);
                setEpNumber(1);
              }}
              className="h-11 w-full rounded-xl border border-white/10 bg-[#1B1B22] px-3 text-sm text-white focus:border-[#FF2E54] focus:outline-none"
            >
              {animes.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.title} ({a.episodes.length} bölüm)
                </option>
              ))}
            </select>

            <div className="max-h-[420px] space-y-1.5 overflow-y-auto pr-1">
              {selectedManageAnime.episodes.map((ep) => (
                <button
                  key={ep.id}
                  onClick={() => handleLoadEpisodeIntoForm(ep.number)}
                  className={`flex w-full items-center justify-between rounded-xl border px-3.5 py-2.5 text-left text-xs transition-colors cursor-pointer ${
                    epNumber === ep.number
                      ? 'border-[#FF2E54] bg-[#FF2E54]/15 text-white'
                      : 'border-white/[0.06] bg-[#1B1B22] text-zinc-300 hover:border-white/20'
                  }`}
                >
                  <span className="truncate font-semibold">
                    {ep.number}. {ep.title}
                  </span>
                  <span
                    className={`shrink-0 font-mono-num text-[11px] ${
                      ep.videoUrl || ep.mirrors?.length ? 'text-emerald-400' : 'text-zinc-500'
                    }`}
                  >
                    {ep.videoUrl || ep.mirrors?.length
                      ? `Video Bağlı${ep.mirrors?.length ? ` (${ep.mirrors.length})` : ''}`
                      : 'Link Yok'}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <form
            onSubmit={handleSaveEpisode}
            className="rounded-3xl border border-white/[0.08] bg-[#14141A] p-6 space-y-4"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-white">
                {selectedManageAnime.title} · {epNumber}. Bölüm Düzenle
              </h2>
              <button
                type="button"
                onClick={() => openAnimeWatch(selectedManageAnime.id, epNumber)}
                className="text-xs font-semibold text-[#FF2E54] hover:underline cursor-pointer"
              >
                Oynatıcıda Aç →
              </button>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-zinc-300">
                Bölüm Başlığı
              </label>
              <input
                type="text"
                value={epTitle}
                onChange={(e) => setEpTitle(e.target.value)}
                placeholder={`${epNumber}. Bölüm`}
                className="h-11 w-full rounded-xl border border-white/10 bg-[#1B1B22] px-3.5 text-sm text-white focus:border-[#FF2E54] focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-zinc-300">
                Ana Video Kaynağı (.mp4, .m3u8 HLS veya &lt;iframe src="..."&gt; — Sibnet, VidNest vb.)
              </label>
              <input
                type="text"
                value={epVideoUrl}
                onChange={(e) => setEpVideoUrl(e.target.value)}
                placeholder="https://video.sibnet.ru/shell.php?videoid=... veya <iframe src='...'>"
                className="h-11 w-full rounded-xl border border-white/10 bg-[#1B1B22] px-3.5 text-xs text-white placeholder:text-zinc-500 focus:border-[#FF2E54] focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-zinc-300">
                TR Dublaj Video Kaynağı (Opsiyonel)
              </label>
              <input
                type="text"
                value={epDubUrl}
                onChange={(e) => setEpDubUrl(e.target.value)}
                placeholder="https://..."
                className="h-11 w-full rounded-xl border border-white/10 bg-[#1B1B22] px-3.5 text-xs text-white placeholder:text-zinc-500 focus:border-[#FF2E54] focus:outline-none"
              />
            </div>

            <div className="rounded-2xl border border-white/[0.08] bg-[#181820] p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-xs font-bold text-white">
                    Alternatif Oynatıcılar (Sibnet, VidNest, Ok.ru, Yedek)
                  </p>
                  <p className="text-[11px] text-zinc-400">
                    İzleyiciler bölüm ekranında bu oynatıcılar arasında geçiş yapabilir.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setEpMirrors((prev) => [
                      ...prev,
                      {
                        id: `mir-${Date.now()}-${prev.length}`,
                        label: prev.length === 0 ? 'Sibnet' : prev.length === 1 ? 'VidNest' : `Yedek ${prev.length + 1}`,
                        url: '',
                        audio: 'sub',
                      },
                    ])
                  }
                  className="inline-flex h-8 items-center gap-1 rounded-full border border-emerald-500/35 bg-emerald-500/10 px-3 text-[11px] font-semibold text-emerald-300 hover:bg-emerald-500/20 cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Oynatıcı Ekle
                </button>
              </div>

              {epMirrors.length > 0 && (
                <div className="space-y-2.5">
                  {epMirrors.map((mirror, idx) => (
                    <div
                      key={mirror.id}
                      className="grid gap-2 rounded-xl border border-white/10 bg-[#121218] p-2.5 sm:grid-cols-[120px_1fr_92px_36px]"
                    >
                      <input
                        type="text"
                        value={mirror.label}
                        onChange={(e) =>
                          setEpMirrors((prev) =>
                            prev.map((m, i) => (i === idx ? { ...m, label: e.target.value } : m))
                          )
                        }
                        placeholder="Sibnet / VidNest"
                        className="h-9 rounded-lg border border-white/10 bg-[#1B1B22] px-2.5 text-xs text-white focus:border-[#FF2E54] focus:outline-none"
                      />
                      <input
                        type="text"
                        value={mirror.url}
                        onChange={(e) =>
                          setEpMirrors((prev) =>
                            prev.map((m, i) => (i === idx ? { ...m, url: e.target.value } : m))
                          )
                        }
                        placeholder="Embed URL veya <iframe src='...'>"
                        className="h-9 rounded-lg border border-white/10 bg-[#1B1B22] px-2.5 text-xs text-white placeholder:text-zinc-500 focus:border-[#FF2E54] focus:outline-none"
                      />
                      <select
                        value={mirror.audio}
                        onChange={(e) =>
                          setEpMirrors((prev) =>
                            prev.map((m, i) =>
                              i === idx
                                ? { ...m, audio: e.target.value === 'dub' ? 'dub' : 'sub' }
                                : m
                            )
                          )
                        }
                        className="h-9 rounded-lg border border-white/10 bg-[#1B1B22] px-2 text-xs text-white focus:border-[#FF2E54] focus:outline-none"
                      >
                        <option value="sub">Altyazı</option>
                        <option value="dub">Dublaj</option>
                      </select>
                      <button
                        type="button"
                        onClick={() =>
                          setEpMirrors((prev) => prev.filter((_, i) => i !== idx))
                        }
                        aria-label="Kaynağı sil"
                        className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 text-zinc-400 hover:border-rose-500/40 hover:text-rose-400 cursor-pointer"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <div className="mb-1.5 flex items-center justify-between gap-2">
                <label className="block text-xs font-medium text-zinc-300">
                  Türkçe Altyazı (Opsiyonel — videoda gömülü TR altyazı varsa boş bırak)
                </label>
                <label className="cursor-pointer rounded-full border border-[#FF2E54]/40 bg-[#FF2E54]/10 px-3 py-1 text-[11px] font-semibold text-[#FF8CA1] hover:bg-[#FF2E54]/20">
                  Dosyadan .srt / .vtt Yükle
                  <input
                    type="file"
                    accept=".vtt,.srt,text/vtt,application/x-subrip"
                    onChange={(e) => handleSubtitleFilePick(e, 'episode')}
                    className="hidden"
                  />
                </label>
              </div>
              <textarea
                rows={4}
                value={epSubtitle}
                onChange={(e) => setEpSubtitle(e.target.value)}
                placeholder={'https://...srt / .vtt bağlantısı, dosya yükleme veya WEBVTT/SRT metni (videoda gömülüyse boş bırak)...'}
                className="w-full rounded-xl border border-white/10 bg-[#1B1B22] p-3.5 font-mono-num text-xs text-white placeholder:text-zinc-500 focus:border-[#FF2E54] focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={savingEp}
              className="h-11 w-full rounded-full bg-[#FF2E54] text-sm font-semibold text-white shadow-[0_0_20px_rgba(255,46,84,0.35)] hover:brightness-110 cursor-pointer"
            >
              {savingEp ? 'Kaydediliyor...' : 'Bölüm Kaynağını Kaydet'}
            </button>
          </form>
        </div>
        </div>
      )}

      {/* TAB 3: CATALOG MANAGEMENT */}
      {activeTab === 'catalog' && (
        <div className="mt-8 space-y-3">
          {animes.length === 0 ? (
            <div className="rounded-3xl border border-white/[0.08] bg-[#14141A] p-8 text-center">
              <Database className="mx-auto h-10 w-10 text-zinc-500" />
              <h2 className="mt-3 text-lg font-bold text-white">Katalog Şu An Boş</h2>
              <p className="mt-1 text-xs text-zinc-400">
                Henüz eklemediğin animeler sitede gösterilmez. Başlamak için AniList’ten ilk animeyi çek.
              </p>
              <button
                onClick={() => setActiveTab('anilist')}
                className="mt-4 inline-flex h-9 items-center gap-2 rounded-full bg-[#FF2E54] px-5 text-xs font-semibold text-white hover:brightness-110 cursor-pointer"
              >
                AniList’ten Anime Çek →
              </button>
            </div>
          ) : (
            animes.map((a) => (
            <div
              key={a.id}
              className="flex flex-col gap-4 rounded-2xl border border-white/[0.08] bg-[#14141A] p-4 sm:flex-row sm:items-center"
            >
              <img
                src={a.posterUrl}
                alt={a.title}
                referrerPolicy="no-referrer"
                className="h-20 w-14 rounded-xl object-cover shrink-0 bg-zinc-900"
              />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-base font-bold text-white">{a.title}</h3>
                  {a.anilistId && (
                    <span className="font-mono-num text-[11px] text-zinc-500">
                      AniList #{a.anilistId}
                    </span>
                  )}
                  {a.featured && (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-400">
                      <Star className="h-3.5 w-3.5 fill-current" /> Hero Vitrinde
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-xs text-zinc-400">
                  {a.episodes.length} bölüm · {a.genres.join(', ')}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <button
                  onClick={() => updateAdminAnime(a.id, { featured: !a.featured })}
                  className={`h-9 rounded-full border px-3.5 text-xs font-semibold cursor-pointer ${
                    a.featured
                      ? 'border-amber-400/50 bg-amber-400/15 text-amber-300'
                      : 'border-white/10 bg-[#1B1B22] text-zinc-300'
                  }`}
                >
                  {a.featured ? 'Vitrinden Çıkar' : 'Vitrine Al'}
                </button>
                <button
                  onClick={() => updateAdminAnime(a.id, { hasDub: !a.hasDub })}
                  className={`h-9 rounded-full border px-3.5 text-xs font-semibold cursor-pointer ${
                    a.hasDub
                      ? 'border-[#FF2E54]/50 bg-[#FF2E54]/15 text-[#FF4D6D]'
                      : 'border-white/10 bg-[#1B1B22] text-zinc-300'
                  }`}
                >
                  {a.hasDub ? 'TR Dublaj: Açık' : 'TR Dublaj: Kapalı'}
                </button>
                <button
                  onClick={() => deleteAdminAnime(a.id)}
                  title="Katalogdan Sil"
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-rose-500/30 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 cursor-pointer"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
            ))
          )}
        </div>
      )}

      {/* TAB 4: PREMIUM GIVEAWAY, SHOP PRICING & ORDERS */}
      {activeTab === 'premium' && (
        <div className="mt-8 space-y-8">
          {/* 1. Giveaway Controls */}
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-3xl border border-amber-500/25 bg-[#14141A] p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="flex items-center gap-2 text-lg font-bold text-white">
                  <Gift className="h-5 w-5 text-amber-400" />
                  Premium Çekilişi Yönetimi
                </h2>
                {giveaway?.active && (
                  <span className="rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-[11px] font-bold text-emerald-300">
                    Yayında
                  </span>
                )}
              </div>

              <div className="space-y-3">
                <div>
                  <label className="mb-1 block text-xs text-zinc-400">Çekiliş Başlığı</label>
                  <input
                    type="text"
                    value={gwTitle}
                    onChange={(e) => setGwTitle(e.target.value)}
                    placeholder="Ör: Haftasonu 1 Aylık Xir Pro Çekilişi"
                    className="h-10 w-full rounded-xl border border-white/10 bg-[#1B1B22] px-3 text-xs text-white focus:border-amber-400 focus:outline-none"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-xs text-zinc-400">Ödül Paketi</label>
                    <input
                      type="text"
                      value={gwPrize}
                      onChange={(e) => setGwPrize(e.target.value)}
                      placeholder="1 Aylık Xir Pro"
                      className="h-10 w-full rounded-xl border border-white/10 bg-[#1B1B22] px-3 text-xs text-white focus:border-amber-400 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-zinc-400">Süre (Saat)</label>
                    <input
                      type="number"
                      min={1}
                      max={720}
                      value={gwHours}
                      onChange={(e) => setGwHours(Number(e.target.value) || 24)}
                      className="h-10 w-full rounded-xl border border-white/10 bg-[#1B1B22] px-3 font-mono-num text-xs text-white focus:border-amber-400 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 pt-1">
                  {[6, 12, 24, 48].map((h) => (
                    <button
                      key={h}
                      type="button"
                      onClick={() => setGwHours(h)}
                      className={`rounded-full px-3 py-1 text-[11px] font-semibold cursor-pointer ${
                        gwHours === h
                          ? 'bg-amber-400 text-black'
                          : 'border border-white/10 bg-[#1B1B22] text-zinc-300'
                      }`}
                    >
                      {h} Saat
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() =>
                    startAdminGiveaway({ title: gwTitle, prizeLabel: gwPrize, durationHours: gwHours })
                  }
                  className="mt-2 h-10 w-full rounded-full bg-amber-400 text-xs font-bold text-black hover:brightness-110 cursor-pointer"
                >
                  {giveaway?.active ? 'Yeni Çekilişi Yeniden Başlat' : `${gwHours} Saatlik Çekilişi Başlat`}
                </button>
              </div>
            </div>

            {/* Active Giveaway Status & Draw */}
            <div className="rounded-3xl border border-white/[0.08] bg-[#14141A] p-6 flex flex-col justify-between space-y-4">
              {giveaway ? (
                <>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                        {giveaway.active ? 'Aktif Çekiliş Durumu' : 'Son Çekiliş Özeti'}
                      </span>
                      {giveaway.active && (
                        <span className="inline-flex items-center gap-1.5 font-mono-num text-sm font-bold text-amber-300">
                          <Clock className="h-4 w-4" />
                          {Math.floor(giveawayRemainingSeconds / 3600)}sa{' '}
                          {Math.floor((giveawayRemainingSeconds % 3600) / 60)}dk
                        </span>
                      )}
                    </div>
                    <h3 className="text-base font-bold text-white">{giveaway.title}</h3>
                    <p className="text-xs text-zinc-400">
                      Ödül: <strong className="text-white">{giveaway.prizeLabel}</strong> · Katılımcı:{' '}
                      <strong className="font-mono-num text-white">{giveaway.participantIds.length}</strong>
                    </p>
                    {giveaway.winnerName && (
                      <p className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs font-semibold text-emerald-300">
                        Kazanan: {giveaway.winnerName} ({giveaway.winnerHandle})
                      </p>
                    )}

                    {giveaway.participantNames && giveaway.participantNames.length > 0 && (
                      <div className="max-h-28 overflow-y-auto rounded-xl border border-white/[0.06] bg-[#1B1B22] p-2.5 text-xs text-zinc-300 space-y-1">
                        {giveaway.participantNames.map((p) => (
                          <div key={p.id} className="flex justify-between">
                            <span>{p.displayName}</span>
                            <span className="text-zinc-500">{p.handle}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {giveaway.active && (
                      <button
                        type="button"
                        onClick={drawAdminGiveaway}
                        className="h-9 flex-1 rounded-full bg-emerald-500 px-4 text-xs font-bold text-black hover:brightness-110 cursor-pointer"
                      >
                        Hemen Kazanan Çek
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={stopAdminGiveaway}
                      className="h-9 rounded-full border border-rose-500/35 bg-rose-500/10 px-4 text-xs font-semibold text-rose-300 hover:bg-rose-500/20 cursor-pointer"
                    >
                      Çekilişi Kaldır
                    </button>
                  </div>
                </>
              ) : (
                <div className="my-auto py-8 text-center">
                  <Gift className="mx-auto h-10 w-10 text-zinc-600" />
                  <p className="mt-2 text-sm font-semibold text-zinc-300">Aktif çekiliş yok</p>
                  <p className="mt-1 text-xs text-zinc-500">
                    Sol taraftan 24 saatlik (veya özel süreli) çekiliş başlattığında ana sayfa, üst bar ve Premium sayfasında görünür.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* 2. Shop Plans / Pricing Editor */}
          <div className="rounded-3xl border border-white/[0.08] bg-[#14141A] p-6 space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-white">Premium Dükkan Fiyatlandırması</h2>
                <p className="text-xs text-zinc-400">
                  Xir Standart, Xir Pro gibi paketlerin adlarını, aylık/yıllık ücretlerini (₺) ve özelliklerini düzenle.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setPlansDraft((prev) => [
                      ...prev,
                      {
                        id: `xir-paket-${Date.now()}`,
                        name: 'Yeni Xir Paket',
                        tagline: 'Paket açıklaması',
                        price: 30,
                        periodLabel: 'ay',
                        durationDays: 30,
                        features: ['Reklamsız izleme'],
                      },
                    ])
                  }
                  className="inline-flex h-9 items-center gap-1.5 rounded-full border border-white/15 bg-white/[0.06] px-4 text-xs font-semibold text-white hover:bg-white/15 cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" /> Paket Ekle
                </button>
                <button
                  type="button"
                  disabled={savingPlans}
                  onClick={async () => {
                    setSavingPlans(true);
                    await saveAdminPlans(plansDraft);
                    setSavingPlans(false);
                  }}
                  className="h-9 rounded-full bg-[#FF2E54] px-5 text-xs font-bold text-white hover:brightness-110 disabled:opacity-50 cursor-pointer"
                >
                  {savingPlans ? 'Kaydediliyor...' : 'Fiyatları Kaydet'}
                </button>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              {plansDraft.map((plan, idx) => (
                <div
                  key={plan.id}
                  className="rounded-2xl border border-white/[0.08] bg-[#1B1B22] p-4 space-y-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <input
                      type="text"
                      value={plan.name}
                      onChange={(e) =>
                        setPlansDraft((prev) =>
                          prev.map((p, i) => (i === idx ? { ...p, name: e.target.value } : p))
                        )
                      }
                      className="h-9 flex-1 rounded-lg border border-white/10 bg-[#121218] px-2.5 text-xs font-bold text-white focus:border-[#FF2E54] focus:outline-none"
                    />
                    {plansDraft.length > 1 && (
                      <button
                        type="button"
                        onClick={() =>
                          setPlansDraft((prev) => prev.filter((_, i) => i !== idx))
                        }
                        className="text-rose-400 hover:text-rose-300 cursor-pointer"
                        title="Paketi Sil"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="mb-1 block text-[10px] text-zinc-400">Fiyat (₺)</label>
                      <input
                        type="number"
                        min={0}
                        value={plan.price}
                        onChange={(e) =>
                          setPlansDraft((prev) =>
                            prev.map((p, i) =>
                              i === idx ? { ...p, price: Number(e.target.value) || 0 } : p
                            )
                          )
                        }
                        className="h-9 w-full rounded-lg border border-white/10 bg-[#121218] px-2.5 font-mono-num text-xs font-bold text-white focus:border-[#FF2E54] focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-[10px] text-zinc-400">Dönem (ay / yıl)</label>
                      <input
                        type="text"
                        value={plan.periodLabel}
                        onChange={(e) =>
                          setPlansDraft((prev) =>
                            prev.map((p, i) =>
                              i === idx ? { ...p, periodLabel: e.target.value } : p
                            )
                          )
                        }
                        className="h-9 w-full rounded-lg border border-white/10 bg-[#121218] px-2.5 text-xs text-white focus:border-[#FF2E54] focus:outline-none"
                      />
                    </div>
                  </div>

                  <input
                    type="text"
                    value={plan.tagline}
                    onChange={(e) =>
                      setPlansDraft((prev) =>
                        prev.map((p, i) => (i === idx ? { ...p, tagline: e.target.value } : p))
                      )
                    }
                    placeholder="Kısa açıklama"
                    className="h-9 w-full rounded-lg border border-white/10 bg-[#121218] px-2.5 text-xs text-zinc-200 focus:border-[#FF2E54] focus:outline-none"
                  />

                  <textarea
                    rows={3}
                    value={plan.features.join('\n')}
                    onChange={(e) =>
                      setPlansDraft((prev) =>
                        prev.map((p, i) =>
                          i === idx ? { ...p, features: e.target.value.split('\n') } : p
                        )
                      )
                    }
                    placeholder="Her satıra 1 özellik yaz..."
                    className="w-full rounded-lg border border-white/10 bg-[#121218] p-2.5 text-xs text-zinc-200 focus:border-[#FF2E54] focus:outline-none"
                  />

                  <label className="flex items-center gap-2 text-xs text-zinc-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={Boolean(plan.popular)}
                      onChange={(e) =>
                        setPlansDraft((prev) =>
                          prev.map((p, i) =>
                            i === idx
                              ? {
                                  ...p,
                                  popular: e.target.checked,
                                  badgeLabel: e.target.checked ? 'En Popüler' : p.badgeLabel,
                                }
                              : p
                          )
                        )
                      }
                      className="accent-[#FF2E54]"
                    />
                    Popüler Paket Olarak Öne Çıkar
                  </label>
                </div>
              ))}
            </div>
          </div>

          {/* 3. Incoming Purchase Requests */}
          <div className="rounded-3xl border border-white/[0.08] bg-[#14141A] p-6 space-y-4">
            <h2 className="text-lg font-bold text-white">
              Gelen Premium Talepleri ({premiumOrders.length})
            </h2>
            {premiumOrders.length === 0 ? (
              <p className="text-xs text-zinc-400">
                Henüz bir kullanıcı Premium paketi satın alma talebi göndermedi.
              </p>
            ) : (
              <div className="space-y-2.5">
                {premiumOrders.map((ord) => (
                  <div
                    key={ord.id}
                    className="flex flex-col gap-3 rounded-2xl border border-white/[0.06] bg-[#1B1B22] p-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-bold text-white">{ord.userDisplayName}</span>
                        <span className="text-xs text-zinc-400">{ord.userHandle}</span>
                        <span className="rounded-full bg-amber-500/15 px-2.5 py-0.5 font-mono-num text-[11px] font-bold text-amber-300">
                          {ord.planName} · ₺{ord.price}/{ord.periodLabel}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-zinc-400">
                        {ord.createdAt}
                        {ord.note ? ` · Not: ${ord.note}` : ''}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      {ord.status === 'pending' ? (
                        <>
                          <button
                            onClick={() => resolveAdminOrder(ord.id, 'approve')}
                            className="h-8 rounded-full bg-emerald-500 px-4 text-xs font-bold text-black hover:brightness-110 cursor-pointer"
                          >
                            Onayla & Premium Ver
                          </button>
                          <button
                            onClick={() => resolveAdminOrder(ord.id, 'reject')}
                            className="h-8 rounded-full border border-rose-500/35 bg-rose-500/10 px-4 text-xs font-semibold text-rose-300 hover:bg-rose-500/20 cursor-pointer"
                          >
                            Reddet
                          </button>
                        </>
                      ) : (
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${
                            ord.status === 'approved'
                              ? 'bg-emerald-500/15 text-emerald-300'
                              : 'bg-rose-500/15 text-rose-300'
                          }`}
                        >
                          {ord.status === 'approved' ? 'Onaylandı' : 'Reddedildi'}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
