import React, { useState } from 'react';
import {
  Bell,
  BellRing,
  Calendar,
  Check,
  Clock,
  Crown,
  Gift,
  Heart,
  MessageCircle,
  MessageSquare,
  Pause,
  Play,
  Plus,
  Send,
  Sparkles,
  Tv,
  UserCheck,
  UserPlus,
  Users,
} from 'lucide-react';
import { useAppState } from '../context/AppStateContext';
import { ACCENT_THEMES, WEEKDAYS_TR } from '../data/animeData';
import { computeTasteMatches } from '../utils/tasteMatch';

export const ScheduleView: React.FC = () => {
  const { animes, openAnimeWatch, reminderIds, toggleReminder } = useAppState();
  const [selectedDay, setSelectedDay] = useState<string>('Tümü');

  const days = ['Tümü', ...WEEKDAYS_TR];

  return (
    <div className="mx-auto max-w-[1440px] px-4 py-10 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <span className="inline-flex items-center gap-1.5 text-xs font-bold tracking-wider text-[#FF2E54]">
            <Calendar className="h-4 w-4" /> TÜRKİYE SAATİYLE (TSİ)
          </span>
          <h1 className="mt-1.5 text-3xl font-bold text-white">
            Haftalık Anime Yayın Takvimi
          </h1>
          <p className="mt-1 text-sm text-zinc-400">
            Yeni bölümlerin yayın saatlerini takip et ve hatırlatıcı kur.
          </p>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {days.map((d) => (
            <button
              key={d}
              onClick={() => setSelectedDay(d)}
              className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
                selectedDay === d
                  ? 'bg-[#FF2E54] text-white'
                  : 'border border-white/10 bg-[#14141A] text-zinc-300 hover:bg-white/10'
              }`}
            >
              {d}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-8 space-y-8">
        {animes.length === 0 ? (
          <div className="rounded-3xl border border-white/[0.08] bg-[#14141A] p-10 text-center">
            <Calendar className="mx-auto h-10 w-10 text-zinc-500" />
            <h2 className="mt-3 text-lg font-bold text-white">Yayın Takvimi Boş</h2>
            <p className="mt-1 text-xs text-zinc-400">
              Henüz yönetim panelinden eklenmiş anime bulunmuyor.
            </p>
          </div>
        ) : (
          WEEKDAYS_TR.filter((d) => selectedDay === 'Tümü' || selectedDay === d).map((day) => {
            const dayAnimes = animes.filter((a) => a.broadcastDay === day);
            if (dayAnimes.length === 0) return null;
            return (
              <section key={day}>
                <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-white">
                  <span>{day}</span>
                  <span className="font-mono-num text-xs font-medium text-zinc-500">
                    ({dayAnimes.length} seri)
                  </span>
                </h2>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {dayAnimes.map((anime) => {
                    const hasReminder = reminderIds.includes(anime.id);
                    return (
                      <div
                        key={anime.id}
                        className="flex items-center gap-4 rounded-2xl border border-white/[0.08] bg-[#14141A] p-3.5 transition-colors hover:border-white/20"
                      >
                        <button
                          onClick={() => openAnimeWatch(anime.id, 1)}
                          className="relative h-24 w-16 shrink-0 overflow-hidden rounded-xl bg-zinc-900 cursor-pointer"
                        >
                          <img
                            src={anime.posterUrl}
                            alt={anime.title}
                            referrerPolicy="no-referrer"
                            className="h-full w-full object-cover"
                          />
                        </button>

                        <div className="min-w-0 flex-1">
                          <span className="font-mono-num text-xs font-bold text-[#FF4D6D]">
                            {anime.broadcastTime ?? '20:00'} TSİ
                          </span>
                          <button
                            onClick={() => openAnimeWatch(anime.id, 1)}
                            className="mt-0.5 block w-full truncate text-left text-sm font-bold text-white hover:text-[#FF2E54] cursor-pointer"
                          >
                            {anime.title}
                          </button>
                          <p className="mt-0.5 text-xs text-zinc-400">
                            {anime.latestEpisode}. Bölüm · {anime.genres[0]}
                          </p>

                          <button
                            onClick={() => toggleReminder(anime.id, anime.title)}
                            className={`mt-2.5 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold transition-colors cursor-pointer ${
                              hasReminder
                                ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                                : 'bg-white/[0.06] text-zinc-300 hover:bg-white/15'
                            }`}
                          >
                            {hasReminder ? (
                              <>
                                <BellRing className="h-3 w-3" /> Hatırlatıcı Açık
                              </>
                            ) : (
                              <>
                                <Bell className="h-3 w-3" /> Hatırlat
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })
        )}
      </div>
    </div>
  );
};

export const WatchPartyView: React.FC = () => {
  const {
    animes,
    rooms,
    activeRoomCode,
    setActiveRoomCode,
    createWatchRoom,
    sendRoomMessage,
    toggleRoomPlayback,
    showToast,
  } = useAppState();

  const [joinCode, setJoinCode] = useState('');
  const [newRoomName, setNewRoomName] = useState('');
  const [selectedAnime, setSelectedAnime] = useState(animes[0]?.id ?? '');
  const [chatText, setChatText] = useState('');

  const activeRoom = rooms.find((r) => r.code === activeRoomCode) ?? rooms[0];
  const roomAnime = animes.find((a) => a.id === activeRoom?.animeId) ?? animes[0];

  const handleJoinByCode = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = joinCode.trim().toUpperCase();
    const found = rooms.find((r) => r.code === clean);
    if (found) {
      setActiveRoomCode(found.code);
      setJoinCode('');
      showToast(`${found.name} odasına katıldın!`);
    } else {
      showToast('Bu koda ait aktif oda bulunamadı.');
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetAnimeId = selectedAnime || animes[0]?.id;
    if (!targetAnimeId) return;
    await createWatchRoom(targetAnimeId, 1, newRoomName);
    setNewRoomName('');
  };

  const handleSendChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeRoom || !chatText.trim()) return;
    await sendRoomMessage(activeRoom.code, chatText);
    setChatText('');
  };

  if (!roomAnime) {
    return (
      <div className="mx-auto max-w-[1440px] px-4 py-10 sm:px-6 lg:px-8">
        <div>
          <span className="inline-flex items-center gap-1.5 text-xs font-bold tracking-wider text-[#FF2E54]">
            <Tv className="h-4 w-4" /> SENKRONİZE İZLEME ODALARI
          </span>
          <h1 className="mt-1.5 text-3xl font-bold text-white">Birlikte İzle</h1>
          <p className="mt-1 text-sm text-zinc-400">
            Arkadaşlarınla oda kodu paylaş, aynı saniyede anime izle ve canlı sohbet et.
          </p>
        </div>
        <div className="mt-8 rounded-3xl border border-white/[0.08] bg-[#14141A] p-10 text-center">
          <Tv className="mx-auto h-10 w-10 text-zinc-500" />
          <h2 className="mt-3 text-lg font-bold text-white">Henüz Oda Oluşturulamaz</h2>
          <p className="mt-1 text-xs text-zinc-400">
            Birlikte İzle odası açmak için önce Yönetim panelinden en az 1 anime eklenmelidir.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1440px] px-4 py-10 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <span className="inline-flex items-center gap-1.5 text-xs font-bold tracking-wider text-[#FF2E54]">
            <Tv className="h-4 w-4" /> SENKRONİZE İZLEME ODALARI
          </span>
          <h1 className="mt-1.5 text-3xl font-bold text-white">Birlikte İzle</h1>
          <p className="mt-1 text-sm text-zinc-400">
            Arkadaşlarınla oda kodu paylaş, aynı saniyede anime izle ve canlı sohbet et.
          </p>
        </div>

        <form onSubmit={handleJoinByCode} className="flex items-center gap-2">
          <input
            type="text"
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value)}
            placeholder="Oda Kodu (ör. XIR742)"
            maxLength={6}
            className="h-10 w-44 rounded-full border border-white/10 bg-[#14141A] px-4 font-mono-num text-xs uppercase text-white placeholder:text-zinc-500 focus:border-[#FF2E54] focus:outline-none"
          />
          <button
            type="submit"
            className="h-10 rounded-full border border-white/15 bg-white/[0.06] px-4 text-xs font-semibold text-white hover:bg-white/15 cursor-pointer"
          >
            Odaya Katıl
          </button>
        </form>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1.5fr_0.9fr]">
        <div className="space-y-6">
          {activeRoom && (
            <div className="overflow-hidden rounded-3xl border border-white/10 bg-[#14141A]">
              <div className="relative aspect-video bg-black">
                <img
                  src={roomAnime.bannerUrl || roomAnime.posterUrl}
                  alt={roomAnime.title}
                  referrerPolicy="no-referrer"
                  className={`h-full w-full object-cover transition-all ${
                    activeRoom.isPlaying ? 'brightness-90' : 'brightness-50'
                  }`}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-black/40" />

                <div className="absolute left-5 right-5 top-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="rounded-md bg-[#FF2E54] px-2.5 py-1 font-mono-num text-xs font-bold text-white">
                      KOD: {activeRoom.code}
                    </span>
                    <span className="rounded-md bg-black/65 px-2.5 py-1 font-mono-num text-xs text-zinc-200 backdrop-blur-sm">
                      {activeRoom.viewerCount} kişi izliyor
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => toggleRoomPlayback(activeRoom.code)}
                  className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex h-16 w-16 items-center justify-center rounded-full bg-[#FF2E54] text-white shadow-2xl hover:scale-105 transition-transform cursor-pointer"
                >
                  {activeRoom.isPlaying ? (
                    <Pause className="h-7 w-7 fill-current" />
                  ) : (
                    <Play className="h-7 w-7 fill-current ml-1" />
                  )}
                </button>

                <div className="absolute bottom-4 left-5 right-5 flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-bold text-white">{activeRoom.name}</h2>
                    <p className="text-xs text-zinc-300">
                      {roomAnime.title} · {activeRoom.episodeNumber}. Bölüm · Kurucu: {activeRoom.hostName}
                    </p>
                  </div>
                  <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-white">
                    {activeRoom.isPlaying ? 'Senkron Oynatılıyor' : 'Duraklatıldı'}
                  </span>
                </div>
              </div>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <form
              onSubmit={handleCreate}
              className="rounded-2xl border border-white/[0.08] bg-[#14141A] p-5 space-y-3"
            >
              <h3 className="flex items-center gap-2 text-sm font-bold text-white">
                <Plus className="h-4 w-4 text-[#FF2E54]" />
                Yeni Oda Oluştur
              </h3>
              <input
                type="text"
                value={newRoomName}
                onChange={(e) => setNewRoomName(e.target.value)}
                placeholder="Oda adı (ör. Haftasonu Maratonu)"
                className="h-10 w-full rounded-xl border border-white/10 bg-[#1B1B22] px-3 text-xs text-white placeholder:text-zinc-500 focus:border-[#FF2E54] focus:outline-none"
              />
              <select
                value={selectedAnime}
                onChange={(e) => setSelectedAnime(e.target.value)}
                className="h-10 w-full rounded-xl border border-white/10 bg-[#1B1B22] px-3 text-xs text-white focus:border-[#FF2E54] focus:outline-none"
              >
                {animes.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.title}
                  </option>
                ))}
              </select>
              <button
                type="submit"
                className="h-10 w-full rounded-full bg-[#FF2E54] text-xs font-semibold text-white hover:brightness-110 cursor-pointer"
              >
                Oda Aç ve Davet Kodu Al
              </button>
            </form>

            <div className="rounded-2xl border border-white/[0.08] bg-[#14141A] p-5">
              <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-white">
                <Users className="h-4 w-4 text-zinc-400" />
                Aktif Odalar ({rooms.length})
              </h3>
              <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
                {rooms.map((r) => (
                  <button
                    key={r.code}
                    onClick={() => setActiveRoomCode(r.code)}
                    className={`flex w-full items-center justify-between rounded-xl border px-3 py-2 text-left transition-colors cursor-pointer ${
                      activeRoom?.code === r.code
                        ? 'border-[#FF2E54]/60 bg-[#FF2E54]/10'
                        : 'border-white/[0.06] bg-[#1B1B22] hover:border-white/20'
                    }`}
                  >
                    <div className="min-w-0 pr-2">
                      <p className="truncate text-xs font-semibold text-white">{r.name}</p>
                      <p className="text-[11px] text-zinc-400 font-mono-num">
                        {r.code} · {r.viewerCount} izleyici
                      </p>
                    </div>
                    <span className="text-[11px] font-semibold text-[#FF4D6D]">Gir →</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="flex h-[540px] flex-col rounded-3xl border border-white/10 bg-[#14141A]">
          <div className="border-b border-white/[0.07] px-5 py-4">
            <h3 className="text-sm font-bold text-white">Oda Sohbeti</h3>
            <p className="text-xs text-zinc-400">
              {activeRoom ? `${activeRoom.name} (${activeRoom.code})` : 'Oda seçilmedi'}
            </p>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto p-4">
            {activeRoom?.messages.map((m) =>
              m.isSystem ? (
                <div
                  key={m.id}
                  className="rounded-xl bg-white/[0.04] px-3 py-2 text-center text-[11px] text-zinc-400"
                >
                  {m.text}
                </div>
              ) : (
                <div key={m.id} className="flex items-start gap-2.5">
                  <img
                    src={m.avatar}
                    alt={m.sender}
                    referrerPolicy="no-referrer"
                    className="h-7 w-7 rounded-full object-cover shrink-0"
                  />
                  <div className="min-w-0 flex-1 rounded-2xl bg-[#1B1B22] px-3.5 py-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-white">{m.sender}</span>
                      <span className="font-mono-num text-[10px] text-zinc-500">{m.time}</span>
                    </div>
                    <p className="mt-1 text-xs text-zinc-200">{m.text}</p>
                  </div>
                </div>
              )
            )}
          </div>

          <form
            onSubmit={handleSendChat}
            className="border-t border-white/[0.07] p-3 flex items-center gap-2"
          >
            <input
              type="text"
              value={chatText}
              onChange={(e) => setChatText(e.target.value)}
              placeholder="Odaya mesaj yaz..."
              className="h-10 flex-1 rounded-full border border-white/10 bg-[#1B1B22] px-4 text-xs text-white placeholder:text-zinc-500 focus:border-[#FF2E54] focus:outline-none"
            />
            <button
              type="submit"
              className="flex h-10 w-10 items-center justify-center rounded-full bg-[#FF2E54] text-white hover:brightness-110 cursor-pointer"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export const CommunityView: React.FC = () => {
  const {
    animes,
    profiles,
    currentUser,
    friendsIds,
    toggleFriend,
    openDmWith,
    openOnboarding,
    openProfileModal,
    comments,
    openAnimeWatch,
  } = useAppState();

  const animesMap = new Map(animes.map((a) => [a.id, { title: a.title, genres: a.genres }]));
  const tasteMatches = currentUser ? computeTasteMatches(currentUser, profiles, animesMap) : [];

  return (
    <div className="mx-auto max-w-[1440px] px-4 py-10 sm:px-6 lg:px-8 space-y-10">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <span className="inline-flex items-center gap-1.5 text-xs font-bold tracking-wider text-[#FF2E54]">
            <MessageSquare className="h-4 w-4" /> ANİMEXİR TOPLULUĞU
          </span>
          <h1 className="mt-1.5 text-3xl font-bold text-white">Topluluk & Son Tartışmalar</h1>
          <p className="mt-1 text-sm text-zinc-400">
            Aktif üyeleri keşfet, arkadaş ekle, DM sohbeti başlat ve son bölüm incelemelerine katıl.
          </p>
        </div>
        {currentUser && (
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={openOnboarding}
              className="inline-flex h-9 items-center gap-1.5 rounded-full border border-white/15 bg-white/[0.06] px-4 text-xs font-semibold text-white hover:bg-white/15 cursor-pointer"
            >
              <Sparkles className="h-3.5 w-3.5 text-[#FF4D6D]" />
              Zevk Rehberini Düzenle
            </button>
            <button
              onClick={() => openDmWith()}
              className="inline-flex h-9 items-center gap-1.5 rounded-full bg-[#FF2E54] px-4 text-xs font-semibold text-white hover:brightness-110 cursor-pointer"
            >
              <MessageCircle className="h-3.5 w-3.5" />
              Direkt Mesajlar
            </button>
          </div>
        )}
      </div>

      {currentUser && tasteMatches.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-white">Aynı Zevklere Sahip İnsanlar</h2>
            <span className="text-xs text-zinc-400">
              {currentUser.favoriteGenres?.length
                ? `Senin türlerin: ${currentUser.favoriteGenres.slice(0, 4).join(' · ')}`
                : 'Zevk rehberinden tür seçerek eşleşmelerini kişiselleştir'}
            </span>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {tasteMatches.slice(0, 4).map(({ profile, sharedGenres, sharedAnimeTitles }) => {
              const accent = ACCENT_THEMES[profile.accentColor];
              const isFriend = friendsIds.includes(profile.id);
              return (
                <div
                  key={profile.id}
                  className="flex items-center justify-between gap-4 rounded-2xl border border-white/[0.08] bg-[#14141A] p-4"
                >
                  <button
                    type="button"
                    onClick={() => openProfileModal(profile)}
                    className="flex min-w-0 flex-1 items-center gap-3.5 text-left cursor-pointer"
                  >
                    <img
                      src={profile.avatarUrl}
                      alt={profile.displayName}
                      referrerPolicy="no-referrer"
                      className="h-12 w-12 rounded-full object-cover shrink-0"
                      style={{ boxShadow: `0 0 0 2px ${accent.hex}` }}
                    />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold" style={{ color: accent.hex }}>
                        {profile.displayName}{' '}
                        <span className="font-normal text-xs text-zinc-500">{profile.handle}</span>
                      </p>
                      <p className="mt-0.5 truncate text-xs text-emerald-300">
                        {sharedAnimeTitles.length > 0 || sharedGenres.length > 0
                          ? `Ortak zevk: ${[...sharedAnimeTitles, ...sharedGenres].slice(0, 4).join(' · ')}`
                          : profile.favoriteGenres?.length
                            ? `Türleri: ${profile.favoriteGenres.slice(0, 3).join(' · ')}`
                            : profile.bio}
                      </p>
                    </div>
                  </button>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => toggleFriend(profile.id)}
                      className={`inline-flex h-8 items-center gap-1 rounded-full px-3 text-xs font-semibold cursor-pointer ${
                        isFriend
                          ? 'border border-emerald-500/40 bg-emerald-500/15 text-emerald-300'
                          : 'border border-white/15 bg-white/[0.06] text-white hover:bg-white/15'
                      }`}
                    >
                      {isFriend ? <UserCheck className="h-3.5 w-3.5" /> : <UserPlus className="h-3.5 w-3.5" />}
                      {isFriend ? 'Arkadaş' : 'Ekle'}
                    </button>
                    <button
                      type="button"
                      onClick={() => openDmWith(profile.id)}
                      className="inline-flex h-8 items-center gap-1 rounded-full bg-[#FF2E54] px-3 text-xs font-semibold text-white hover:brightness-110 cursor-pointer"
                    >
                      <MessageCircle className="h-3.5 w-3.5" />
                      DM
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {profiles.map((p) => {
          const accent = ACCENT_THEMES[p.accentColor];
          return (
            <button
              key={p.id}
              onClick={() => openProfileModal(p)}
              className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#14141A] text-left hover:border-white/25 transition-all cursor-pointer"
            >
              <div className="relative h-24 w-full overflow-hidden">
                <img
                  src={p.bannerUrl}
                  alt={p.displayName}
                  referrerPolicy="no-referrer"
                  className="h-full w-full object-cover"
                />
                <span className="absolute right-2.5 top-2.5 inline-flex items-center gap-1 rounded-full bg-black/70 px-2 py-0.5 font-mono-num text-[11px] font-semibold text-[#FF8CA1] backdrop-blur-sm">
                  <Heart className={`h-3 w-3 ${(p.likesCount ?? 0) > 0 ? 'fill-[#FF2E54] text-[#FF2E54]' : ''}`} />
                  {p.likesCount ?? 0}
                </span>
              </div>
              <div className="px-4 pb-4">
                <img
                  src={p.avatarUrl}
                  alt={p.displayName}
                  referrerPolicy="no-referrer"
                  className="relative -mt-8 mb-2 h-14 w-14 rounded-full object-cover ring-4 ring-[#14141A]"
                  style={{ boxShadow: `0 0 0 2px ${accent.hex}` }}
                />
                <p className="text-base font-bold" style={{ color: accent.hex }}>
                  {p.displayName}
                </p>
                <p className="text-xs text-zinc-400">{p.handle}</p>
                <p className="mt-2 line-clamp-2 text-xs text-zinc-300">{p.bio}</p>
              </div>
            </button>
          );
        })}
      </div>

      <div>
        <h2 className="mb-4 text-xl font-bold text-white">Son Bölüm Yorumları</h2>
        {comments.length === 0 ? (
          <div className="rounded-2xl border border-white/[0.08] bg-[#14141A] p-6 text-center text-xs text-zinc-400">
            Henüz bölüm yorumu yapılmamış. Bir anime bölümünü izlerken ilk yorumu sen bırakabilirsin.
          </div>
        ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {comments.map((c) => {
            const anime = animes.find((a) => a.id === c.animeId);
            return (
              <div
                key={c.id}
                className="rounded-2xl border border-white/[0.08] bg-[#14141A] p-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <img
                      src={c.avatarUrl}
                      alt={c.displayName}
                      referrerPolicy="no-referrer"
                      className="h-9 w-9 rounded-full object-cover"
                    />
                    <div>
                      <p className="text-sm font-semibold text-white">{c.displayName}</p>
                      <p className="text-xs text-zinc-400">
                        {anime?.title ?? 'Anime'} · {c.episodeNumber}. Bölüm
                      </p>
                    </div>
                  </div>
                  {anime && (
                    <button
                      onClick={() => openAnimeWatch(anime.id, c.episodeNumber)}
                      className="text-xs font-semibold text-[#FF2E54] hover:underline cursor-pointer"
                    >
                      Bölüme Git →
                    </button>
                  )}
                </div>
                <p className="mt-3 text-sm text-zinc-200">{c.text}</p>
              </div>
            );
          })}
        </div>
        )}
      </div>
    </div>
  );
};

export const PremiumView: React.FC = () => {
  const {
    premiumPlans,
    giveaway,
    giveawayRemainingSeconds,
    premiumOrders,
    joinGiveaway,
    createPremiumOrder,
    currentUser,
    openAuthModal,
    setActiveSection,
  } = useAppState();

  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [orderNote, setOrderNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const hrs = Math.floor(giveawayRemainingSeconds / 3600);
  const mins = Math.floor((giveawayRemainingSeconds % 3600) / 60);
  const secs = giveawayRemainingSeconds % 60;
  const formatted = `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

  const selectedPlan = premiumPlans.find((p) => p.id === selectedPlanId) ?? null;
  const hasJoined = Boolean(currentUser && giveaway?.participantIds.includes(currentUser.id));

  const handleOrderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlan) return;
    setSubmitting(true);
    const res = await createPremiumOrder(selectedPlan.id, orderNote);
    setSubmitting(false);
    if (res.ok) {
      setSelectedPlanId(null);
      setOrderNote('');
    }
  };

  return (
    <div className="mx-auto max-w-[1200px] px-4 py-10 sm:px-6 space-y-10">
      {/* Top: Admin Giveaway Banner */}
      <section className="rounded-3xl border border-amber-500/25 bg-gradient-to-br from-amber-500/10 via-[#14141A] to-[#131318] p-6 sm:p-8">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 px-3 py-1 text-xs font-bold text-amber-400">
              <Gift className="h-3.5 w-3.5" /> ANİMEXİR ÇEKİLİŞ & DÜKKAN
            </span>

            {giveaway?.active && giveawayRemainingSeconds > 0 ? (
              <>
                <h1 className="mt-3 text-2xl sm:text-3xl font-bold text-white">
                  {giveaway.title}
                </h1>
                <p className="mt-1.5 text-sm text-zinc-300">
                  Ödül: <strong className="text-amber-300">{giveaway.prizeLabel}</strong> · Şu ana kadar{' '}
                  <strong className="font-mono-num text-white">{giveaway.participantIds.length}</strong> kişi katıldı.
                </p>
              </>
            ) : giveaway && !giveaway.active && giveaway.winnerName ? (
              <>
                <h1 className="mt-3 text-2xl sm:text-3xl font-bold text-white">
                  Son Çekiliş Kazananı: {giveaway.winnerName}
                </h1>
                <p className="mt-1.5 text-sm text-zinc-300">
                  {giveaway.winnerHandle} · Ödül teslim edildi: <strong className="text-emerald-300">{giveaway.prizeLabel}</strong>
                </p>
              </>
            ) : (
              <>
                <h1 className="mt-3 text-2xl sm:text-3xl font-bold text-white">
                  Xir Premium Dükkanı
                </h1>
                <p className="mt-1.5 text-sm text-zinc-400">
                  Şu an aktif çekiliş bulunmuyor. Aşağıdaki paketlerden birini seçebilir veya yönetici yeni çekiliş başlattığında buradan katılabilirsin.
                </p>
              </>
            )}

            {currentUser?.isPremium && (
              <div className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/15 px-3.5 py-1 text-xs font-semibold text-emerald-300">
                <Check className="h-3.5 w-3.5" />
                Hesabında Aktif: {currentUser.premiumPlanName || 'Premium'}
              </div>
            )}
          </div>

          <div className="flex flex-col items-start md:items-end gap-3 shrink-0">
            {giveaway?.active && giveawayRemainingSeconds > 0 ? (
              <>
                <div className="inline-flex items-center gap-2.5 rounded-2xl border border-white/10 bg-black/45 px-5 py-3">
                  <Clock className="h-4 w-4 text-amber-400" />
                  <span className="font-mono-num text-2xl font-bold text-white">{formatted}</span>
                </div>
                {hasJoined ? (
                  <span className="inline-flex h-10 items-center gap-2 rounded-full border border-emerald-500/35 bg-emerald-500/15 px-5 text-xs font-semibold text-emerald-300">
                    <Check className="h-4 w-4" /> Çekilişe Katıldın
                  </span>
                ) : (
                  <button
                    onClick={joinGiveaway}
                    className="inline-flex h-10 items-center gap-2 rounded-full bg-[#FF2E54] px-6 text-xs font-semibold text-white shadow-[0_0_24px_rgba(255,46,84,0.45)] hover:brightness-110 cursor-pointer"
                  >
                    <Gift className="h-4 w-4" />
                    {currentUser ? 'Çekilişe Katıl' : 'Giriş Yap ve Katıl'}
                  </button>
                )}
              </>
            ) : currentUser?.isAdmin ? (
              <button
                onClick={() => setActiveSection('yonetim')}
                className="inline-flex h-10 items-center gap-2 rounded-full border border-emerald-500/40 bg-emerald-500/15 px-5 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/25 cursor-pointer"
              >
                Yönetimden Çekiliş Başlat →
              </button>
            ) : null}
          </div>
        </div>
      </section>

      {/* Middle: Shop Pricing Tiers */}
      <section>
        <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white">Üyelik Paketleri & Fiyatlandırma</h2>
            <p className="text-xs sm:text-sm text-zinc-400">
              İhtiyacına uygun Xir paketini seç, talebini gönder ve yönetici onayıyla hesabın anında yükseltilsin.
            </p>
          </div>
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          {premiumPlans.map((plan) => {
            const isSelected = selectedPlanId === plan.id;
            return (
              <div
                key={plan.id}
                className={`relative flex flex-col justify-between rounded-3xl border p-6 transition-all ${
                  plan.popular
                    ? 'border-[#FF2E54]/60 bg-gradient-to-b from-[#FF2E54]/10 via-[#14141A] to-[#14141A] shadow-[0_0_35px_rgba(255,46,84,0.12)]'
                    : 'border-white/[0.08] bg-[#14141A]'
                } ${isSelected ? 'ring-2 ring-amber-400' : ''}`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-lg font-bold text-white">{plan.name}</h3>
                    {plan.badgeLabel && (
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                          plan.popular
                            ? 'bg-[#FF2E54] text-white'
                            : 'border border-white/10 bg-white/[0.06] text-zinc-300'
                        }`}
                      >
                        {plan.badgeLabel}
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-zinc-400">{plan.tagline}</p>

                  <div className="mt-5 flex items-baseline gap-1">
                    <span className="font-mono-num text-4xl font-extrabold text-white">
                      ₺{plan.price}
                    </span>
                    <span className="text-xs font-medium text-zinc-400">/ {plan.periodLabel}</span>
                  </div>

                  <ul className="mt-5 space-y-2.5">
                    {plan.features.map((feat, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-zinc-200">
                        <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <button
                  onClick={() => {
                    if (!currentUser) {
                      openAuthModal('login');
                      return;
                    }
                    setSelectedPlanId(isSelected ? null : plan.id);
                  }}
                  className={`mt-6 h-10 w-full rounded-full text-xs font-bold transition-all cursor-pointer ${
                    plan.popular
                      ? 'bg-[#FF2E54] text-white shadow-[0_0_20px_rgba(255,46,84,0.35)] hover:brightness-110'
                      : 'border border-white/15 bg-white/[0.06] text-white hover:bg-white/15'
                  }`}
                >
                  {isSelected ? 'Seçimi Kapat' : `${plan.name} Seç · ₺${plan.price}`}
                </button>
              </div>
            );
          })}
        </div>

        {/* Selected Plan Purchase Request Form */}
        {selectedPlan && (
          <form
            onSubmit={handleOrderSubmit}
            className="mt-6 rounded-2xl border border-amber-400/35 bg-[#16151C] p-5 space-y-4"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-base font-bold text-white">
                  {selectedPlan.name} Siparişi — ₺{selectedPlan.price} / {selectedPlan.periodLabel}
                </h3>
                <p className="text-xs text-zinc-400">
                  İsteğe bağlı iletişim veya dekont notu ekleyerek talebi yöneticiye ilet.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedPlanId(null)}
                className="text-xs text-zinc-400 hover:text-white cursor-pointer"
              >
                Vazgeç
              </button>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <input
                type="text"
                value={orderNote}
                onChange={(e) => setOrderNote(e.target.value)}
                placeholder="İsteğe bağlı not (ör. Discord adım veya ödeme referansı)..."
                className="h-10 flex-1 rounded-xl border border-white/10 bg-[#0F0F14] px-3.5 text-xs text-white placeholder:text-zinc-500 focus:border-amber-400 focus:outline-none"
              />
              <button
                type="submit"
                disabled={submitting}
                className="h-10 rounded-full bg-amber-400 px-6 text-xs font-bold text-black hover:brightness-110 disabled:opacity-50 cursor-pointer"
              >
                {submitting ? 'Gönderiliyor...' : 'Satın Alma Talebi Gönder'}
              </button>
            </div>
          </form>
        )}
      </section>

      {/* Bottom: User's Premium Orders */}
      {currentUser && premiumOrders.length > 0 && (
        <section className="rounded-3xl border border-white/[0.08] bg-[#14141A] p-6">
          <h3 className="text-base font-bold text-white">Paket Taleplerim</h3>
          <div className="mt-4 space-y-2.5">
            {premiumOrders
              .filter((o) => o.userId === currentUser.id)
              .map((o) => (
                <div
                  key={o.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/[0.06] bg-[#191922] px-4 py-3 text-xs"
                >
                  <div>
                    <span className="font-bold text-white">{o.planName}</span>
                    <span className="ml-2 font-mono-num text-zinc-400">
                      ₺{o.price}/{o.periodLabel} · {o.createdAt}
                    </span>
                    {o.note && <p className="mt-0.5 text-zinc-400">Not: {o.note}</p>}
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 font-semibold ${
                      o.status === 'approved'
                        ? 'bg-emerald-500/15 text-emerald-300'
                        : o.status === 'rejected'
                          ? 'bg-rose-500/15 text-rose-300'
                          : 'bg-amber-500/15 text-amber-300'
                    }`}
                  >
                    {o.status === 'approved'
                      ? 'Onaylandı'
                      : o.status === 'rejected'
                        ? 'Reddedildi'
                        : 'Onay Bekliyor'}
                  </span>
                </div>
              ))}
          </div>
        </section>
      )}
    </div>
  );
};
