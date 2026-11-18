import React, { useState } from 'react';
import {
  Check,
  Crown,
  Heart,
  MessageCircle,
  MessageSquare,
  Palette,
  Play,
  Search,
  Send,
  Sparkles,
  Sunrise,
  UserCheck,
  UserPlus,
  X,
} from 'lucide-react';
import { useAppState } from '../context/AppStateContext';
import { ACCENT_THEMES, REAL_CHARACTER_AVATARS } from '../data/animeData';
import { AccentColorKey, CommunityProfile, RealCharacterPreset } from '../types/anime';

export const ProfileModal: React.FC<{ asPage?: boolean }> = ({ asPage = false }) => {
  const {
    animes,
    selectedProfile,
    openProfileModal,
    currentUser,
    updateCurrentUserProfile,
    friendsIds,
    toggleFriend,
    toggleProfileLike,
    addProfileComment,
    openAnimeWatch,
    watchlistIds,
    favoriteIds,
    setActiveSection,
    openDmWith,
    openOnboarding,
  } = useAppState();

  const profile: CommunityProfile | null = asPage ? currentUser : selectedProfile;

  const [commentInput, setCommentInput] = useState('');
  const [editing, setEditing] = useState(false);
  const [bioDraft, setBioDraft] = useState(profile?.bio ?? '');
  const [charSearch, setCharSearch] = useState('');
  const [charResults, setCharResults] = useState<RealCharacterPreset[]>(REAL_CHARACTER_AVATARS);

  if (!profile) return null;

  const isMe = currentUser?.id === profile.id;
  const accent = ACCENT_THEMES[profile.accentColor];
  const isFriend = friendsIds.includes(profile.id);

  const favIds = isMe ? favoriteIds : profile.favoriteAnimeIds;
  const listIds = isMe ? watchlistIds : profile.watchlistIds;
  const favAnimes = animes.filter((a) => favIds.includes(a.id));
  const listAnimes = animes.filter((a) => listIds.includes(a.id));

  const handleSearchCharacters = async () => {
    if (!charSearch.trim()) {
      setCharResults(REAL_CHARACTER_AVATARS);
      return;
    }
    try {
      const res = await fetch(`/api/anilist/characters?q=${encodeURIComponent(charSearch.trim())}`);
      const data = await res.json();
      if (Array.isArray(data.characters) && data.characters.length > 0) {
        setCharResults(data.characters);
      }
    } catch {
      // ignore
    }
  };

  const handleSendWallComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentInput.trim()) return;
    await addProfileComment(profile.id, commentInput);
    setCommentInput('');
  };

  const content = (
    <div
      className={`overflow-hidden rounded-3xl border border-white/10 bg-[#131318] shadow-2xl ${
        asPage ? 'mx-auto max-w-4xl' : 'w-full max-w-3xl max-h-[90vh] overflow-y-auto'
      }`}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="relative h-44 sm:h-52 w-full overflow-hidden bg-zinc-900">
        <img
          src={profile.bannerUrl}
          alt={profile.displayName}
          referrerPolicy="no-referrer"
          className="h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#131318] via-black/30 to-transparent" />
        {!asPage && (
          <button
            onClick={() => openProfileModal(null)}
            aria-label="Profili kapat"
            className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-md hover:bg-black cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="px-6 pb-8">
        <div className="-mt-14 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex items-end gap-4">
            <img
              src={profile.avatarUrl}
              alt={profile.displayName}
              referrerPolicy="no-referrer"
              className="h-24 w-24 rounded-full object-cover ring-4 ring-[#131318]"
              style={{ boxShadow: `0 0 0 3px ${accent.hex}` }}
            />
            <div className="pb-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-2xl font-bold" style={{ color: accent.hex }}>
                  {profile.displayName}
                </h2>
                {profile.roleBadge && (
                  <span
                    className="rounded-full px-2.5 py-0.5 text-xs font-semibold"
                    style={{
                      backgroundColor: `${accent.hex}22`,
                      color: accent.hex,
                    }}
                  >
                    {profile.roleBadge}
                  </span>
                )}
              </div>
              <p className="text-sm text-zinc-400">{profile.handle}</p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {isMe ? (
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => {
                    if (!asPage) openProfileModal(null);
                    openOnboarding();
                  }}
                  className="inline-flex h-10 items-center gap-2 rounded-full border border-white/15 bg-white/[0.06] px-4 text-xs font-semibold text-white hover:bg-white/15 cursor-pointer"
                >
                  <Sparkles className="h-4 w-4 text-[#FF4D6D]" />
                  Zevk Rehberini Düzenle
                </button>
                <button
                  onClick={() => {
                    setBioDraft(profile.bio);
                    setEditing((e) => !e);
                  }}
                  className="inline-flex h-10 items-center gap-2 rounded-full border border-white/15 bg-white/[0.06] px-4 text-xs font-semibold text-white hover:bg-white/15 cursor-pointer"
                >
                  <Palette className="h-4 w-4" />
                  {editing ? 'Düzenlemeyi Kapat' : 'Profili Özelleştir'}
                </button>
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => toggleProfileLike(profile.id)}
                  className={`inline-flex h-10 items-center gap-2 rounded-full border px-4 text-xs font-semibold transition-colors cursor-pointer ${
                    profile.likedByMe
                      ? 'border-[#FF2E54]/60 bg-[#FF2E54]/20 text-[#FF8CA1]'
                      : 'border-white/15 bg-white/[0.06] text-white hover:bg-white/15'
                  }`}
                >
                  <Heart className={`h-4 w-4 ${profile.likedByMe ? 'fill-[#FF2E54] text-[#FF2E54]' : ''}`} />
                  {profile.likedByMe ? 'Beğenildi' : 'Profili Beğen'} ({profile.likesCount ?? 0})
                </button>
                <button
                  onClick={() => toggleFriend(profile.id)}
                  className={`inline-flex h-10 items-center gap-2 rounded-full border px-4 text-xs font-semibold transition-colors cursor-pointer ${
                    isFriend
                      ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300'
                      : 'border-white/15 bg-white/[0.06] text-white hover:bg-white/15'
                  }`}
                >
                  {isFriend ? (
                    <>
                      <UserCheck className="h-4 w-4" /> Arkadaşın
                    </>
                  ) : (
                    <>
                      <UserPlus className="h-4 w-4" /> Arkadaş Ekle
                    </>
                  )}
                </button>
                <button
                  onClick={() => {
                    if (!asPage) openProfileModal(null);
                    openDmWith(profile.id);
                  }}
                  className="inline-flex h-10 items-center gap-2 rounded-full bg-[#FF2E54] px-5 text-xs font-semibold text-white shadow-[0_0_20px_rgba(255,46,84,0.35)] hover:brightness-110 cursor-pointer"
                >
                  <MessageCircle className="h-4 w-4" /> DM Gönder
                </button>
              </div>
            )}
          </div>
        </div>

        <p className="mt-4 text-sm text-zinc-300">{profile.bio}</p>

        <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-zinc-400">
          <span className="font-mono-num text-white font-semibold">
            {profile.likesCount ?? 0} Beğeni
          </span>
          <span>·</span>
          <span className="font-mono-num text-white font-semibold">
            {profile.watchedEpisodes} Bölüm İzlendi
          </span>
          <span>·</span>
          <span className="font-mono-num text-white font-semibold">
            {profile.friendsCount} Arkadaş
          </span>
          {profile.badges.map((b) => (
            <span
              key={b.id}
              className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-0.5 text-zinc-200"
            >
              {b.type === 'early' && <Sunrise className="h-3.5 w-3.5 text-orange-400" />}
              {b.type === 'gift' && <Crown className="h-3.5 w-3.5 text-amber-400" />}
              {b.label}
            </span>
          ))}
        </div>

        {(profile.favoriteGenres?.length || profile.topAnimePicks?.length) ? (
          <div className="mt-5 rounded-2xl border border-white/[0.07] bg-[#181820] p-4 space-y-3">
            {profile.favoriteGenres && profile.favoriteGenres.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-300">
                <span className="font-semibold text-zinc-400">Favori Türler:</span>
                <span>{profile.favoriteGenres.join(' · ')}</span>
              </div>
            )}
            {profile.topAnimePicks && profile.topAnimePicks.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-semibold text-zinc-400">En Sevdiği 3 Anime</p>
                <div className="grid gap-2 sm:grid-cols-3">
                  {profile.topAnimePicks.map((pick) => {
                    const localAnime = animes.find((a) => a.id === pick.id || (pick.anilistId && a.anilistId === pick.anilistId));
                    return (
                      <div
                        key={pick.id}
                        onClick={() => {
                          if (localAnime) {
                            if (!asPage) openProfileModal(null);
                            openAnimeWatch(localAnime.id, 1);
                          }
                        }}
                        className={`flex items-center gap-2.5 rounded-xl border border-white/[0.07] bg-[#121218] p-2 ${
                          localAnime ? 'hover:border-white/25 cursor-pointer' : ''
                        }`}
                      >
                        {pick.posterUrl && (
                          <img
                            src={pick.posterUrl}
                            alt={pick.title}
                            referrerPolicy="no-referrer"
                            className="h-11 w-8 rounded-md object-cover shrink-0 bg-zinc-800"
                          />
                        )}
                        <div className="min-w-0">
                          <p className="truncate text-xs font-semibold text-white">{pick.title}</p>
                          <p className="truncate text-[10px] text-zinc-400">
                            {pick.genres.slice(0, 2).join(' · ')}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        ) : null}

        {isMe && editing && (
          <div className="mt-6 rounded-2xl border border-white/10 bg-[#1A1A22] p-5 space-y-4">
            <h3 className="text-sm font-bold text-white">Profil Özelleştirme (Gerçek Anime Görselleri)</h3>

            <div>
              <label className="mb-1.5 block text-xs text-zinc-400">Biyografi</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={bioDraft}
                  onChange={(e) => setBioDraft(e.target.value)}
                  className="h-10 flex-1 rounded-xl border border-white/10 bg-[#121217] px-3 text-sm text-white focus:border-[#FF2E54] focus:outline-none"
                />
                <button
                  onClick={() => updateCurrentUserProfile({ bio: bioDraft })}
                  className="h-10 rounded-xl bg-[#FF2E54] px-4 text-xs font-semibold text-white cursor-pointer"
                >
                  Kaydet
                </button>
              </div>
            </div>

            <div>
              <span className="mb-2 block text-xs text-zinc-400">Vurgu Rengi</span>
              <div className="flex items-center gap-2.5">
                {(Object.keys(ACCENT_THEMES) as AccentColorKey[]).map((key) => {
                  const t = ACCENT_THEMES[key];
                  const active = profile.accentColor === key;
                  return (
                    <button
                      key={key}
                      onClick={() => updateCurrentUserProfile({ accentColor: key })}
                      className={`flex h-8 w-8 items-center justify-center rounded-full border-2 cursor-pointer ${
                        active ? 'border-white scale-110' : 'border-transparent opacity-75'
                      }`}
                      style={{ backgroundColor: t.hex }}
                    >
                      {active && <Check className="h-3.5 w-3.5 text-white" />}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <span className="mb-2 block text-xs text-zinc-400">
                AniList’ten Karakter Avatarı & Kapak Seç
              </span>
              <div className="mb-3 flex gap-2">
                <div className="relative flex-1">
                  <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400" />
                  <input
                    type="text"
                    value={charSearch}
                    onChange={(e) => setCharSearch(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleSearchCharacters();
                      }
                    }}
                    placeholder="Karakter ara (ör. Gojo, Levi, Nezuko...)"
                    className="h-9 w-full rounded-xl border border-white/10 bg-[#121217] pl-9 pr-3 text-xs text-white focus:border-[#FF2E54] focus:outline-none"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleSearchCharacters}
                  className="h-9 rounded-xl border border-white/15 bg-white/[0.08] px-3 text-xs font-semibold text-white cursor-pointer"
                >
                  Ara
                </button>
              </div>

              <div className="grid max-h-44 grid-cols-4 sm:grid-cols-6 gap-2 overflow-y-auto pr-1">
                {charResults.map((ch) => (
                  <button
                    key={ch.id}
                    onClick={() =>
                      updateCurrentUserProfile({
                        avatarUrl: ch.avatarUrl,
                        bannerUrl: ch.bannerUrl,
                      })
                    }
                    className={`overflow-hidden rounded-xl border p-1 cursor-pointer ${
                      profile.avatarUrl === ch.avatarUrl
                        ? 'border-[#FF2E54] bg-[#FF2E54]/15'
                        : 'border-white/10 bg-[#121217]'
                    }`}
                  >
                    <img
                      src={ch.avatarUrl}
                      alt={ch.name}
                      referrerPolicy="no-referrer"
                      className="aspect-square w-full rounded-lg object-cover"
                    />
                    <p className="mt-1 truncate text-[10px] text-zinc-300">{ch.name}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        <div className="mt-7 grid gap-6 sm:grid-cols-2">
          <div>
            <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-white">
              <Heart className="h-4 w-4 text-[#FF2E54]" />
              Favoriler ({favAnimes.length})
            </h3>
            {favAnimes.length === 0 ? (
              <p className="text-xs text-zinc-500">Henüz favori anime eklenmemiş.</p>
            ) : (
              <div className="space-y-2">
                {favAnimes.map((a) => (
                  <button
                    key={a.id}
                    onClick={() => {
                      openProfileModal(null);
                      openAnimeWatch(a.id, 1);
                    }}
                    className="flex w-full items-center gap-3 rounded-xl border border-white/[0.06] bg-[#191921] p-2 text-left hover:border-white/20 cursor-pointer"
                  >
                    <img
                      src={a.posterUrl}
                      alt={a.title}
                      referrerPolicy="no-referrer"
                      className="h-12 w-9 rounded-lg object-cover shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-semibold text-white">{a.title}</p>
                      <p className="text-[11px] text-zinc-400">★ {a.score} · {a.genres[0]}</p>
                    </div>
                    <Play className="h-3.5 w-3.5 text-zinc-400" />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-white">
              Listem ({listAnimes.length})
            </h3>
            {listAnimes.length === 0 ? (
              <p className="text-xs text-zinc-500">İzleme listesi boş.</p>
            ) : (
              <div className="space-y-2">
                {listAnimes.map((a) => (
                  <button
                    key={a.id}
                    onClick={() => {
                      openProfileModal(null);
                      openAnimeWatch(a.id, 1);
                    }}
                    className="flex w-full items-center gap-3 rounded-xl border border-white/[0.06] bg-[#191921] p-2 text-left hover:border-white/20 cursor-pointer"
                  >
                    <img
                      src={a.posterUrl}
                      alt={a.title}
                      referrerPolicy="no-referrer"
                      className="h-12 w-9 rounded-lg object-cover shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-semibold text-white">{a.title}</p>
                      <p className="text-[11px] text-zinc-400">{a.episodeCount} Bölüm</p>
                    </div>
                    <Play className="h-3.5 w-3.5 text-zinc-400" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="mt-7 border-t border-white/[0.08] pt-6">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-white">
            <MessageSquare className="h-4 w-4 text-zinc-400" />
            Profil Duvarı
          </h3>
          <form onSubmit={handleSendWallComment} className="flex gap-2">
            <input
              type="text"
              value={commentInput}
              onChange={(e) => setCommentInput(e.target.value)}
              placeholder={`${profile.displayName} profiline not bırak...`}
              className="h-10 flex-1 rounded-full border border-white/10 bg-[#1B1B22] px-4 text-xs text-white placeholder:text-zinc-500 focus:border-[#FF2E54] focus:outline-none"
            />
            <button
              type="submit"
              className="inline-flex h-10 items-center gap-1.5 rounded-full bg-[#FF2E54] px-4 text-xs font-semibold text-white hover:brightness-110 cursor-pointer"
            >
              <Send className="h-3.5 w-3.5" />
              Yaz
            </button>
          </form>

          <div className="mt-4 space-y-2.5">
            {profile.profileComments.length === 0 ? (
              <p className="text-xs text-zinc-500">Henüz profil mesajı yok.</p>
            ) : (
              profile.profileComments.map((pc) => (
                <div
                  key={pc.id}
                  className="flex items-start gap-2.5 rounded-2xl border border-white/[0.05] bg-[#191921] p-3"
                >
                  <img
                    src={pc.authorAvatar}
                    alt={pc.authorName}
                    referrerPolicy="no-referrer"
                    className="h-7 w-7 rounded-full object-cover"
                  />
                  <div>
                    <p className="text-xs">
                      <span className="font-semibold text-white">{pc.authorName}</span>
                      <span className="ml-2 text-zinc-500">{pc.createdAt}</span>
                    </p>
                    <p className="mt-1 text-xs text-zinc-200">{pc.text}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {asPage && (
          <div className="mt-6 flex justify-end">
            <button
              onClick={() => setActiveSection('kesfet')}
              className="text-xs font-semibold text-zinc-400 hover:text-white cursor-pointer"
            >
              Keşfet’e Dön →
            </button>
          </div>
        )}
      </div>
    </div>
  );

  if (asPage) {
    return <div className="mx-auto max-w-[1440px] px-4 py-8 sm:px-6 lg:px-8">{content}</div>;
  }

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-black/80 p-4 backdrop-blur-md"
      onClick={() => openProfileModal(null)}
    >
      {content}
    </div>
  );
};
