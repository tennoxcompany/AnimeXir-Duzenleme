import Hls from 'hls.js';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  Bookmark,
  Check,
  Film,
  Heart,
  MessageSquare,
  Moon,
  Play,
  Send,
  Settings2,
  ShieldCheck,
  Star,
  Subtitles,
  ThumbsUp,
  Users,
} from 'lucide-react';
import { useAppState } from '../context/AppStateContext';
import { EpisodeMirror } from '../types/anime';

function isDirectVideoFile(url?: string): boolean {
  if (!url) return false;
  return /\.(mp4|webm|ogg|mov|m3u8)(?:[?#]|$)/i.test(url);
}

function isHlsStream(url?: string): boolean {
  if (!url) return false;
  return /\.m3u8(?:[?#]|$)/i.test(url);
}

export const WatchView: React.FC = () => {
  const {
    animes,
    selectedAnimeId,
    selectedEpisodeNum,
    openAnimeWatch,
    setActiveSection,
    watchlistIds,
    favoriteIds,
    toggleWatchlist,
    toggleFavorite,
    userRatings,
    rateAnime,
    watchProgressMap,
    saveWatchProgress,
    comments,
    addEpisodeComment,
    toggleCommentLike,
    createWatchRoom,
    currentUser,
    openAuthModal,
    saveEpisodeSource,
  } = useAppState();

  const anime = animes.find((a) => a.id === selectedAnimeId) ?? animes[0];
  const episode =
    anime?.episodes.find((e) => e.number === selectedEpisodeNum) ??
    anime?.episodes[0];

  const videoRef = useRef<HTMLVideoElement>(null);
  const [audioTrack, setAudioTrack] = useState<'sub' | 'dub'>('sub');
  const [subEnabled, setSubEnabled] = useState(true);
  const [cinemaMode, setCinemaMode] = useState(false);

  // Admin quick inline episode source editor
  const [adminQuickOpen, setAdminQuickOpen] = useState(false);
  const [quickVideoUrl, setQuickVideoUrl] = useState('');
  const [quickDubUrl, setQuickDubUrl] = useState('');
  const [quickMirrors, setQuickMirrors] = useState<EpisodeMirror[]>([]);
  const [quickSubtitle, setQuickSubtitle] = useState('');
  const [savingSource, setSavingSource] = useState(false);
  const [selectedMirrorId, setSelectedMirrorId] = useState<string>('');
  const [embedBypassSandbox, setEmbedBypassSandbox] = useState(false);

  const [commentText, setCommentText] = useState('');
  const [commentRating, setCommentRating] = useState<number>(9);

  const availableMirrors = useMemo(() => {
    if (!episode) return [];
    const list: EpisodeMirror[] = [];
    if (audioTrack === 'sub' && episode.videoUrl) {
      list.push({ id: 'primary-sub', label: 'Ana Kaynak', url: episode.videoUrl, audio: 'sub' });
    }
    if (audioTrack === 'dub' && episode.dubVideoUrl) {
      list.push({ id: 'primary-dub', label: 'TR Dublaj', url: episode.dubVideoUrl, audio: 'dub' });
    }
    for (const m of episode.mirrors ?? []) {
      if (m.audio === audioTrack && m.url && !list.some((x) => x.url === m.url)) {
        list.push(m);
      }
    }
    return list;
  }, [episode, audioTrack]);

  useEffect(() => {
    if (!episode) return;
    setQuickVideoUrl(episode.videoUrl ?? '');
    setQuickDubUrl(episode.dubVideoUrl ?? '');
    setQuickMirrors(episode.mirrors ?? []);
    setQuickSubtitle(episode.subtitleVtt ?? '');
    setEmbedBypassSandbox(false);
    const hasAnyDub =
      Boolean(episode.dubVideoUrl) ||
      (episode.mirrors ?? []).some((m) => m.audio === 'dub');
    if (audioTrack === 'dub' && !hasAnyDub) {
      setAudioTrack('sub');
    }
  }, [episode?.id]);

  useEffect(() => {
    if (availableMirrors.length > 0 && !availableMirrors.some((m) => m.id === selectedMirrorId)) {
      setSelectedMirrorId(availableMirrors[0].id);
    } else if (availableMirrors.length === 0) {
      setSelectedMirrorId('');
    }
  }, [availableMirrors, selectedMirrorId]);

  const activeMirror =
    availableMirrors.find((m) => m.id === selectedMirrorId) ?? availableMirrors[0] ?? null;

  // Determine active stream source
  const activeVideoSrc = activeMirror?.url;

  const isDirectStream = isDirectVideoFile(activeVideoSrc);

  // Create WebVTT Blob URL if subtitle text is provided inline, or proxy remote .srt/.vtt URLs
  const subtitleBlobUrl = useMemo(() => {
    const raw = episode?.subtitleVtt?.trim();
    if (!raw) return undefined;
    if (raw.startsWith('http://') || raw.startsWith('https://')) {
      return `/api/subtitle-proxy?url=${encodeURIComponent(raw)}`;
    }
    const blob = new Blob([raw], { type: 'text/vtt;charset=utf-8' });
    return URL.createObjectURL(blob);
  }, [episode?.subtitleVtt]);

  useEffect(() => {
    return () => {
      if (subtitleBlobUrl && subtitleBlobUrl.startsWith('blob:')) {
        URL.revokeObjectURL(subtitleBlobUrl);
      }
    };
  }, [subtitleBlobUrl]);

  // Attach HLS.js if .m3u8 stream
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !activeVideoSrc || !isDirectStream) return;

    let hls: Hls | null = null;
    if (isHlsStream(activeVideoSrc)) {
      if (Hls.isSupported()) {
        hls = new Hls({ enableWorker: true });
        hls.loadSource(activeVideoSrc);
        hls.attachMedia(video);
      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = activeVideoSrc;
      }
    } else {
      video.src = activeVideoSrc;
    }

    const saved = watchProgressMap[anime.id];
    if (saved && saved.episodeNumber === episode?.number && saved.currentTime > 3) {
      video.currentTime = saved.currentTime;
    }

    return () => {
      if (hls) hls.destroy();
    };
  }, [activeVideoSrc, isDirectStream, anime?.id, episode?.number]);

  if (!anime || !episode) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <div className="rounded-3xl border border-white/[0.08] bg-[#14141A] p-8">
          <Film className="mx-auto h-10 w-10 text-zinc-500" />
          <h2 className="mt-3 text-lg font-bold text-white">Henüz Oynatılacak Anime Yok</h2>
          <p className="mt-1 text-xs text-zinc-400">
            Katalog şu an boş. Yönetim panelinden anime eklendikten sonra burada reklamsız oynatıcıyla izleyebilirsin.
          </p>
          <button
            onClick={() => setActiveSection('kesfet')}
            className="mt-4 inline-flex h-9 items-center gap-2 rounded-full bg-[#FF2E54] px-5 text-xs font-semibold text-white hover:brightness-110 cursor-pointer"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Keşfet’e Dön
          </button>
        </div>
      </div>
    );
  }

  const handleVideoTimeUpdate = () => {
    const video = videoRef.current;
    if (!video || !video.duration) return;
    const t = Math.floor(video.currentTime);
    if (t > 0 && t % 5 === 0) {
      saveWatchProgress(anime.id, episode.number, t, Math.floor(video.duration));
    }
  };

  const handleSaveQuickSource = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSource(true);
    const res = await saveEpisodeSource(anime.id, episode.number, {
      videoUrl: quickVideoUrl,
      dubVideoUrl: quickDubUrl,
      mirrors: quickMirrors,
      subtitleVtt: quickSubtitle,
    });
    setSavingSource(false);
    if (res.ok) setAdminQuickOpen(false);
  };

  const animeComments = comments.filter((c) => c.animeId === anime.id);
  const nextEpisode = anime.episodes.find((e) => e.number === episode.number + 1);

  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      openAuthModal('login');
      return;
    }
    if (!commentText.trim()) return;
    await addEpisodeComment(anime.id, episode.number, commentText, commentRating);
    setCommentText('');
  };

  return (
    <div
      className={`min-h-screen transition-colors duration-300 ${
        cinemaMode ? 'bg-[#040406]' : 'bg-[#0B0B0F]'
      }`}
    >
      <div className="mx-auto max-w-[1440px] px-4 py-4 sm:px-6 lg:px-8">
        {/* Top Controls */}
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2.5">
          <button
            onClick={() => setActiveSection('kesfet')}
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-[#14141A] px-3.5 py-1.5 text-xs font-semibold text-zinc-200 hover:bg-white/10 cursor-pointer"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Keşfet’e Dön
          </button>

          <div className="flex flex-wrap items-center gap-2">
            {currentUser?.isAdmin && (
              <button
                onClick={() => setAdminQuickOpen((o) => !o)}
                className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/40 bg-emerald-500/15 px-3 py-1.5 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/25 cursor-pointer"
              >
                <Settings2 className="h-3.5 w-3.5" />
                Yönetici: Video / TR Altyazı Ekle
              </button>
            )}
            <button
              onClick={() => setCinemaMode((c) => !c)}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
                cinemaMode
                  ? 'border-[#FF2E54] bg-[#FF2E54]/15 text-[#FF4D6D]'
                  : 'border-white/10 bg-[#14141A] text-zinc-300 hover:bg-white/10'
              }`}
            >
              <Moon className="h-3.5 w-3.5" />
              {cinemaMode ? 'Sinema Modu Açık' : 'Işıkları Kapat'}
            </button>
            <button
              onClick={() =>
                createWatchRoom(
                  anime.id,
                  episode.number,
                  `${anime.title} · ${episode.number}. Bölüm`
                )
              }
              className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-[#14141A] px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/10 cursor-pointer"
            >
              <Users className="h-3.5 w-3.5 text-[#FF2E54]" />
              Birlikte İzle Odası Aç
            </button>
          </div>
        </div>

        {/* Admin Quick Episode Video & Subtitle Form */}
        {currentUser?.isAdmin && adminQuickOpen && (
          <form
            onSubmit={handleSaveQuickSource}
            className="mb-4 rounded-2xl border border-emerald-500/30 bg-[#131817] p-4 space-y-3"
          >
            <div className="flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-sm font-bold text-emerald-300">
                <ShieldCheck className="h-4 w-4" />
                {anime.title} — {episode.number}. Bölüm Kaynak & Türkçe Altyazı Ayarı
              </h3>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs text-zinc-300">
                  Ana Kaynak (.mp4, .m3u8 veya Sibnet/VidNest iframe)
                </label>
                <input
                  type="text"
                  value={quickVideoUrl}
                  onChange={(e) => setQuickVideoUrl(e.target.value)}
                  placeholder="https://video.sibnet.ru/... veya <iframe src='https://...'>"
                  className="h-9 w-full rounded-xl border border-white/10 bg-[#0E1110] px-3 text-xs text-white placeholder:text-zinc-500 focus:border-emerald-400 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-zinc-300">
                  TR Dublaj Video Linki (Opsiyonel)
                </label>
                <input
                  type="text"
                  value={quickDubUrl}
                  onChange={(e) => setQuickDubUrl(e.target.value)}
                  placeholder="https://... (opsiyonel dublaj akışı)"
                  className="h-9 w-full rounded-xl border border-white/10 bg-[#0E1110] px-3 text-xs text-white placeholder:text-zinc-500 focus:border-emerald-400 focus:outline-none"
                />
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-zinc-300">
                  Ek Oynatıcılar (Sibnet, VidNest, Yedek)
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setQuickMirrors((prev) => [
                      ...prev,
                      {
                        id: `mir-${Date.now()}-${prev.length}`,
                        label: prev.length === 0 ? 'Sibnet' : 'VidNest',
                        url: '',
                        audio: 'sub',
                      },
                    ])
                  }
                  className="rounded-full border border-emerald-400/35 bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-300 hover:bg-emerald-500/20 cursor-pointer"
                >
                  + Oynatıcı Ekle
                </button>
              </div>
              {quickMirrors.map((m, idx) => (
                <div key={m.id} className="grid gap-2 sm:grid-cols-[110px_1fr_84px_60px]">
                  <input
                    type="text"
                    value={m.label}
                    onChange={(e) =>
                      setQuickMirrors((prev) =>
                        prev.map((item, i) => (i === idx ? { ...item, label: e.target.value } : item))
                      )
                    }
                    placeholder="Sibnet"
                    className="h-8 rounded-lg border border-white/10 bg-[#0E1110] px-2.5 text-xs text-white focus:border-emerald-400 focus:outline-none"
                  />
                  <input
                    type="text"
                    value={m.url}
                    onChange={(e) =>
                      setQuickMirrors((prev) =>
                        prev.map((item, i) => (i === idx ? { ...item, url: e.target.value } : item))
                      )
                    }
                    placeholder="https://... veya <iframe src='...'>"
                    className="h-8 rounded-lg border border-white/10 bg-[#0E1110] px-2.5 text-xs text-white placeholder:text-zinc-500 focus:border-emerald-400 focus:outline-none"
                  />
                  <select
                    value={m.audio}
                    onChange={(e) =>
                      setQuickMirrors((prev) =>
                        prev.map((item, i) =>
                          i === idx
                            ? { ...item, audio: e.target.value === 'dub' ? 'dub' : 'sub' }
                            : item
                        )
                      )
                    }
                    className="h-8 rounded-lg border border-white/10 bg-[#0E1110] px-2 text-xs text-white focus:border-emerald-400 focus:outline-none"
                  >
                    <option value="sub">Altyazı</option>
                    <option value="dub">Dublaj</option>
                  </select>
                  <button
                    type="button"
                    onClick={() => setQuickMirrors((prev) => prev.filter((_, i) => i !== idx))}
                    className="h-8 rounded-lg border border-white/10 text-[11px] text-zinc-400 hover:text-rose-400 cursor-pointer"
                  >
                    Sil
                  </button>
                </div>
              ))}
            </div>
            <div>
              <div className="mb-1 flex items-center justify-between gap-2">
                <label className="block text-xs text-zinc-300">
                  Türkçe Altyazı (Opsiyonel — videoda gömülüyse boş bırak)
                </label>
                <label className="cursor-pointer rounded-full border border-emerald-400/35 bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-300 hover:bg-emerald-500/20">
                  .srt / .vtt Seç
                  <input
                    type="file"
                    accept=".vtt,.srt,text/vtt,application/x-subrip"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const reader = new FileReader();
                      reader.onload = () => {
                        if (typeof reader.result === 'string') setQuickSubtitle(reader.result);
                      };
                      reader.readAsText(file, 'utf-8');
                      e.target.value = '';
                    }}
                    className="hidden"
                  />
                </label>
              </div>
              <textarea
                rows={3}
                value={quickSubtitle}
                onChange={(e) => setQuickSubtitle(e.target.value)}
                placeholder={'https://...srt / .vtt linki veya dosya seçin (videoda gömülüyse boş bırak)...'}
                className="w-full rounded-xl border border-white/10 bg-[#0E1110] p-2.5 font-mono-num text-xs text-white placeholder:text-zinc-500 focus:border-emerald-400 focus:outline-none"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setAdminQuickOpen(false)}
                className="h-8 rounded-full border border-white/10 px-4 text-xs font-semibold text-zinc-300 hover:bg-white/5 cursor-pointer"
              >
                İptal
              </button>
              <button
                type="submit"
                disabled={savingSource}
                className="h-8 rounded-full bg-emerald-500 px-4 text-xs font-semibold text-black hover:brightness-110 cursor-pointer"
              >
                {savingSource ? 'Kaydediliyor...' : 'Kaynağı Kaydet'}
              </button>
            </div>
          </form>
        )}

        {/* Main Player + Episode List */}
        <div className="grid gap-4 lg:grid-cols-[1.65fr_0.75fr]">
          <div>
            {/* REKLAMSIZ OYNATICI (AD-FREE PLAYER) */}
            <div className="relative aspect-video max-h-[72vh] w-full overflow-hidden rounded-2xl border border-white/10 bg-black shadow-2xl">
              {activeVideoSrc && isDirectStream ? (
                <video
                  ref={videoRef}
                  controls
                  playsInline
                  crossOrigin="anonymous"
                  poster={anime.bannerUrl}
                  onTimeUpdate={handleVideoTimeUpdate}
                  className="h-full w-full bg-black object-contain"
                >
                  {subtitleBlobUrl && subEnabled && (
                    <track
                      kind="subtitles"
                      src={subtitleBlobUrl}
                      srcLang="tr"
                      label="Türkçe Altyazı"
                      default
                    />
                  )}
                </video>
              ) : activeVideoSrc ? (
                <iframe
                  key={`${activeVideoSrc}-${embedBypassSandbox ? 'open' : 'safe'}`}
                  src={activeVideoSrc}
                  title={`${anime.title} ${episode.number}. Bölüm`}
                  allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
                  allowFullScreen
                  referrerPolicy="no-referrer"
                  {...(embedBypassSandbox
                    ? {}
                    : { sandbox: 'allow-scripts allow-same-origin allow-presentation allow-forms' })}
                  className="h-full w-full border-0 bg-black"
                />
              ) : anime.trailerId ? (
                <iframe
                  src={`https://www.youtube-nocookie.com/embed/${anime.trailerId}?rel=0&modestbranding=1`}
                  title={`${anime.title} Resmi Fragman`}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  referrerPolicy="no-referrer"
                  className="h-full w-full border-0 bg-black"
                />
              ) : (
                <div className="relative flex h-full w-full flex-col items-center justify-center p-6 text-center">
                  <img
                    src={anime.bannerUrl}
                    alt={anime.title}
                    referrerPolicy="no-referrer"
                    className="absolute inset-0 h-full w-full object-cover opacity-25"
                  />
                  <div className="relative z-10 max-w-md space-y-3">
                    <Film className="mx-auto h-10 w-10 text-[#FF2E54]" />
                    <h3 className="text-lg font-bold text-white">
                      {episode.number}. Bölüm için henüz video kaynağı eklenmedi
                    </h3>
                    <p className="text-xs text-zinc-300">
                      Yönetici yetkisine sahip bir hesap yönetim panelinden `.mp4`, `.m3u8` veya Sibnet/VidNest gibi gömme (iframe) linkleri ekleyebilir.
                    </p>
                    {currentUser?.isAdmin && (
                      <button
                        onClick={() => setAdminQuickOpen(true)}
                        className="mt-2 rounded-full bg-[#FF2E54] px-5 py-2 text-xs font-semibold text-white cursor-pointer"
                      >
                        Şimdi Kaynak Ekle
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Mirror / Source Switcher Bar */}
            {availableMirrors.length > 0 && (
              <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-white/[0.07] bg-[#131319] px-3.5 py-2.5">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="mr-1 text-[11px] font-semibold text-zinc-400">Oynatıcı:</span>
                  {availableMirrors.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setSelectedMirrorId(m.id)}
                      className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors cursor-pointer ${
                        activeMirror?.id === m.id
                          ? 'bg-[#FF2E54] text-white'
                          : 'border border-white/10 bg-[#1B1B24] text-zinc-300 hover:text-white'
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
                {activeVideoSrc && !isDirectStream && (
                  <button
                    type="button"
                    onClick={() => setEmbedBypassSandbox((b) => !b)}
                    className="text-[11px] font-medium text-zinc-400 hover:text-white cursor-pointer"
                    title="Bazı harici oynatıcılar pop-up korumasında açılmayabilir"
                  >
                    {embedBypassSandbox ? 'Pop-up Korumasını Aç' : 'Açılmadıysa Standart Mod'}
                  </button>
                )}
              </div>
            )}

            {/* Player Toolbar Strip */}
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/[0.08] bg-[#14141A] px-4 py-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-md bg-emerald-500/15 px-2.5 py-1 text-[11px] font-bold text-emerald-300">
                  {activeVideoSrc && !isDirectStream
                    ? embedBypassSandbox
                      ? 'Harici Oynatıcı'
                      : 'Harici Oynatıcı · Pop-up Korumalı'
                    : 'Reklamsız Özel Oynatıcı'}
                </span>
                {!activeVideoSrc && anime.trailerId && (
                  <span className="text-xs text-amber-400">
                    Bölüm linki bekleniyor · AniList Resmi Fragman oynatılıyor
                  </span>
                )}
                {activeVideoSrc && (
                  <span className="text-xs text-zinc-300">
                    {episode.number}. Bölüm · {episode.title}
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {/* Sub / Dub Switch */}
                <div className="flex rounded-full border border-white/10 bg-[#1B1B22] p-0.5 text-xs font-semibold">
                  <button
                    onClick={() => setAudioTrack('sub')}
                    className={`rounded-full px-3 py-1 cursor-pointer ${
                      audioTrack === 'sub' ? 'bg-[#FF2E54] text-white' : 'text-zinc-300'
                    }`}
                  >
                    TR Altyazı
                  </button>
                  {(episode.dubVideoUrl ||
                    (episode.mirrors ?? []).some((m) => m.audio === 'dub')) && (
                    <button
                      onClick={() => setAudioTrack('dub')}
                      className={`rounded-full px-3 py-1 cursor-pointer ${
                        audioTrack === 'dub' ? 'bg-[#FF2E54] text-white' : 'text-zinc-300'
                      }`}
                    >
                      TR Dublaj
                    </button>
                  )}
                </div>

                {subtitleBlobUrl && isDirectStream && (
                  <button
                    onClick={() => setSubEnabled((s) => !s)}
                    className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold cursor-pointer ${
                      subEnabled
                        ? 'border-[#FF2E54]/40 bg-[#FF2E54]/15 text-[#FF4D6D]'
                        : 'border-white/10 text-zinc-400'
                    }`}
                  >
                    <Subtitles className="h-3.5 w-3.5" />
                    Altyazı {subEnabled ? 'Açık' : 'Kapalı'}
                  </button>
                )}

                {nextEpisode && (
                  <button
                    onClick={() => openAnimeWatch(anime.id, nextEpisode.number)}
                    className="rounded-full bg-white/10 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-white/20 cursor-pointer"
                  >
                    Sonraki Bölüm →
                  </button>
                )}
              </div>
            </div>

            {/* Anime Details Card */}
            <div className="mt-6 rounded-3xl border border-white/[0.08] bg-[#14141A] p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2.5">
                    <h1 className="text-2xl sm:text-3xl font-bold text-white">
                      {anime.title}
                    </h1>
                    <span className="inline-flex items-center gap-1 rounded-md bg-amber-400 px-2 py-0.5 font-mono-num text-xs font-bold text-black">
                      ★ {anime.score}
                    </span>
                  </div>
                  <p className="mt-1.5 text-xs sm:text-sm text-zinc-400">
                    {anime.year} · {anime.studio} · {anime.status} · {anime.genres.join(' · ')}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <button
                    onClick={() => toggleWatchlist(anime.id)}
                    className={`inline-flex h-10 items-center gap-2 rounded-full border px-4 text-xs font-semibold transition-colors cursor-pointer ${
                      watchlistIds.includes(anime.id)
                        ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300'
                        : 'border-white/15 bg-white/[0.05] text-white hover:bg-white/10'
                    }`}
                  >
                    {watchlistIds.includes(anime.id) ? (
                      <>
                        <Check className="h-4 w-4" /> Listemde
                      </>
                    ) : (
                      <>
                        <Bookmark className="h-4 w-4" /> Listeme Ekle
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => toggleFavorite(anime.id)}
                    className={`inline-flex h-10 items-center gap-2 rounded-full border px-4 text-xs font-semibold transition-colors cursor-pointer ${
                      favoriteIds.includes(anime.id)
                        ? 'border-[#FF2E54]/50 bg-[#FF2E54]/15 text-[#FF4D6D]'
                        : 'border-white/15 bg-white/[0.05] text-white hover:bg-white/10'
                    }`}
                  >
                    <Heart
                      className={`h-4 w-4 ${favoriteIds.includes(anime.id) ? 'fill-current' : ''}`}
                    />
                    Favori
                  </button>
                </div>
              </div>

              <p className="mt-4 text-sm leading-relaxed text-zinc-300">
                {anime.synopsis}
              </p>

              <div className="mt-5 flex flex-wrap items-center justify-between gap-4 border-t border-white/[0.07] pt-4">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-zinc-400">Puanın:</span>
                  <div className="flex flex-wrap items-center gap-1">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((val) => {
                      const active = (userRatings[anime.id] ?? 0) >= val;
                      return (
                        <button
                          key={val}
                          onClick={() => rateAnime(anime.id, val)}
                          className={`flex h-7 w-7 items-center justify-center rounded-lg font-mono-num text-xs font-bold transition-colors cursor-pointer ${
                            active
                              ? 'bg-amber-400 text-black'
                              : 'bg-white/[0.06] text-zinc-400 hover:bg-white/15 hover:text-white'
                          }`}
                        >
                          {val}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* Comments */}
            <div className="mt-6 rounded-3xl border border-white/[0.08] bg-[#14141A] p-6">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-[#FF2E54]" />
                <h3 className="text-lg font-bold text-white">
                  Bölüm Yorumları ({animeComments.length})
                </h3>
              </div>

              <form onSubmit={handlePostComment} className="mt-4 space-y-3">
                <textarea
                  rows={3}
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder={
                    currentUser
                      ? `${episode.number}. bölüm hakkındaki düşüncelerini paylaş...`
                      : 'Yorum yazmak için giriş yap...'
                  }
                  className="w-full rounded-2xl border border-white/10 bg-[#1B1B22] p-3.5 text-sm text-white placeholder:text-zinc-500 focus:border-[#FF2E54] focus:outline-none"
                />
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-xs text-zinc-400">
                    <Star className="h-4 w-4 text-amber-400" />
                    <span>Bölüm Puanı:</span>
                    <select
                      value={commentRating}
                      onChange={(e) => setCommentRating(Number(e.target.value))}
                      className="rounded-lg border border-white/10 bg-[#1B1B22] px-2 py-1 font-mono-num text-xs text-white focus:outline-none"
                    >
                      {[10, 9, 8, 7, 6, 5].map((r) => (
                        <option key={r} value={r}>
                          {r}/10
                        </option>
                      ))}
                    </select>
                  </div>

                  <button
                    type="submit"
                    className="inline-flex h-10 items-center gap-2 rounded-full bg-[#FF2E54] px-5 text-xs font-semibold text-white shadow-[0_0_18px_rgba(255,46,84,0.35)] hover:brightness-110 cursor-pointer"
                  >
                    <Send className="h-3.5 w-3.5" />
                    Yorumu Gönder
                  </button>
                </div>
              </form>

              <div className="mt-6 space-y-3">
                {animeComments.length === 0 ? (
                  <p className="py-6 text-center text-sm text-zinc-500">
                    Henüz bu anime için yorum yapılmamış. İlk yorumu sen yaz!
                  </p>
                ) : (
                  animeComments.map((c) => (
                    <div
                      key={c.id}
                      className="rounded-2xl border border-white/[0.06] bg-[#191921] p-4"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5">
                          <img
                            src={c.avatarUrl}
                            alt={c.displayName}
                            referrerPolicy="no-referrer"
                            className="h-8 w-8 rounded-full object-cover"
                          />
                          <div>
                            <span className="text-sm font-semibold text-white">
                              {c.displayName}
                            </span>
                            <span className="ml-2 text-xs text-zinc-500">
                              {c.handle} · {c.episodeNumber}. Bölüm · {c.createdAt}
                            </span>
                          </div>
                        </div>
                        {c.rating && (
                          <span className="font-mono-num text-xs font-bold text-amber-400">
                            ★ {c.rating}/10
                          </span>
                        )}
                      </div>
                      <p className="mt-2.5 text-sm text-zinc-200">{c.text}</p>
                      <button
                        onClick={() => toggleCommentLike(c.id)}
                        className={`mt-3 inline-flex items-center gap-1.5 text-xs font-medium cursor-pointer ${
                          c.likedByMe ? 'text-[#FF2E54]' : 'text-zinc-400 hover:text-white'
                        }`}
                      >
                        <ThumbsUp className="h-3.5 w-3.5" />
                        <span className="font-mono-num">{c.likes}</span>
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Right: Episode List */}
          <aside className="rounded-3xl border border-white/[0.08] bg-[#14141A] p-5 h-fit lg:sticky lg:top-20">
            <div className="flex items-center justify-between border-b border-white/[0.07] pb-4">
              <div>
                <h3 className="text-lg font-bold text-white">Bölümler</h3>
                <p className="text-xs text-zinc-400 font-mono-num">
                  {anime.episodes.length} bölüm
                </p>
              </div>
            </div>

            <div className="mt-4 max-h-[600px] space-y-2 overflow-y-auto pr-1">
              {anime.episodes.map((ep) => {
                const active = ep.number === episode.number;
                return (
                  <button
                    key={ep.id}
                    onClick={() => openAnimeWatch(anime.id, ep.number)}
                    className={`flex w-full items-center gap-3 rounded-2xl border p-2.5 text-left transition-all cursor-pointer ${
                      active
                        ? 'border-[#FF2E54]/60 bg-[#FF2E54]/12'
                        : 'border-white/[0.05] bg-[#191921] hover:border-white/15'
                    }`}
                  >
                    <div className="relative h-14 w-24 shrink-0 overflow-hidden rounded-xl bg-zinc-900">
                      <img
                        src={ep.thumbnail}
                        alt={ep.title}
                        referrerPolicy="no-referrer"
                        className="h-full w-full object-cover"
                      />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/35">
                        <Play className="h-4 w-4 fill-current text-white" />
                      </div>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={`font-mono-num text-xs font-bold ${
                            active ? 'text-[#FF4D6D]' : 'text-zinc-400'
                          }`}
                        >
                          {ep.number}. Bölüm
                        </span>
                        <span
                          className={`text-[10px] font-semibold ${
                            ep.videoUrl ? 'text-emerald-400' : 'text-zinc-500'
                          }`}
                        >
                          {ep.videoUrl ? '● Video Hazır' : 'Fragman'}
                        </span>
                      </div>
                      <p className="mt-0.5 truncate text-xs sm:text-sm font-semibold text-white">
                        {ep.title}
                      </p>
                      <p className="mt-0.5 text-[11px] text-zinc-500">
                        {ep.dubVideoUrl ? 'TR Altyazı · Dublaj' : 'TR Altyazı'}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
};
