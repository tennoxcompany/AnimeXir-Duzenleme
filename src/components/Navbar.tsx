import React, { useEffect, useRef, useState } from 'react';
import {
  Bell,
  ChevronRight,
  Gift,
  LogOut,
  MessageCircle,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  User as UserIcon,
  Users,
  X,
} from 'lucide-react';
import { useAppState } from '../context/AppStateContext';
import { ACCENT_THEMES } from '../data/animeData';

export const Navbar: React.FC = () => {
  const {
    animes,
    activeSection,
    setActiveSection,
    openAnimeWatch,
    openProfileModal,
    openAuthModal,
    currentUser,
    logout,
    profiles,
    notifications,
    markAllNotificationsRead,
    unreadDmCount,
    openDmWith,
    openOnboarding,
    giveaway,
    giveawayRemainingSeconds,
  } = useAppState();

  const [searchQuery, setSearchQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const searchRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 36);
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchFocused(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  const q = searchQuery.trim().toLowerCase();
  const matchedAnimes = q
    ? animes
        .filter(
          (a) =>
            a.title.toLowerCase().includes(q) ||
            a.genres.some((g) => g.toLowerCase().includes(q))
        )
        .slice(0, 5)
    : [];

  const matchedUsers = q
    ? profiles
        .filter(
          (p) =>
            p.displayName.toLowerCase().includes(q) ||
            p.handle.toLowerCase().includes(q)
        )
        .slice(0, 4)
    : [];

  const unreadCount = notifications.filter((n) => !n.read).length;
  const hasActiveGiveaway = Boolean(giveaway?.active && giveawayRemainingSeconds > 0);
  const giveawayHours = Math.floor(giveawayRemainingSeconds / 3600);
  const giveawayBadge =
    giveawayHours >= 1
      ? `${giveawayHours}sa`
      : `${Math.max(1, Math.ceil(giveawayRemainingSeconds / 60))}dk`;
  const isHeroOverlay = activeSection === 'kesfet' && !scrolled;

  const navItems: {
    id: 'kesfet' | 'takvim' | 'birlikte-izle' | 'topluluk' | 'premium' | 'yonetim';
    label: string;
    isGold?: boolean;
    adminOnly?: boolean;
  }[] = [
    { id: 'kesfet', label: 'Keşfet' },
    { id: 'takvim', label: 'Takvim' },
    { id: 'birlikte-izle', label: 'Birlikte İzle' },
    { id: 'topluluk', label: 'Topluluk' },
    { id: 'premium', label: 'Premium', isGold: true },
    ...(currentUser?.isAdmin ? [{ id: 'yonetim' as const, label: 'Yönetim', isGold: true, adminOnly: true }] : []),
  ];

  return (
    <header
      className={`transition-colors duration-200 ${
        isHeroOverlay
          ? 'bg-gradient-to-b from-black/80 via-black/45 to-transparent'
          : 'border-b border-white/[0.07] bg-[#0B0B0F]/92 backdrop-blur-xl'
      }`}
    >
      <div className="mx-auto flex h-14 max-w-[1440px] items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
        {/* Left: Brand + Primary Links */}
        <div className="flex items-center gap-4 lg:gap-6">
          <button
            onClick={() => setActiveSection('kesfet')}
            className="font-display text-xl font-bold tracking-tight text-white whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF2E54] rounded-md"
          >
            Anime<span className="text-[#FF2E54]">Xir</span>
          </button>

          <nav className="hidden md:flex items-center gap-3.5 lg:gap-5">
            {navItems.map((item) => {
              const isActive = activeSection === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveSection(item.id)}
                  className={`relative flex items-center gap-1 py-1 text-[13px] font-medium whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                    item.adminOnly
                      ? isActive
                        ? 'text-emerald-300'
                        : 'text-emerald-400 hover:text-emerald-300'
                      : item.isGold
                        ? isActive
                          ? 'text-amber-300'
                          : 'text-amber-400 hover:text-amber-300'
                        : isActive
                          ? 'text-white'
                          : 'text-zinc-300 hover:text-white'
                  }`}
                >
                  {item.adminOnly && <ShieldCheck className="h-3.5 w-3.5" />}
                  {item.label}
                  {isActive && (
                    <span
                      className={`absolute inset-x-0 -bottom-[17px] h-0.5 rounded-full ${
                        item.adminOnly
                          ? 'bg-emerald-400'
                          : item.isGold
                            ? 'bg-amber-400'
                            : 'bg-[#FF2E54]'
                      }`}
                    />
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Center-Right: Live Global Search */}
        <div ref={searchRef} className="relative hidden sm:block flex-1 max-w-[260px] lg:max-w-xs">
          <div className="relative flex items-center">
            <Search className="pointer-events-none absolute left-3 h-3.5 w-3.5 text-zinc-400" />
            <input
              type="text"
              value={searchQuery}
              onFocus={() => setSearchFocused(true)}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setSearchFocused(true);
              }}
              placeholder="Anime veya kullanıcı ara..."
              className={`h-9 w-full rounded-full border pl-8.5 pr-8 text-xs text-white placeholder:text-zinc-400 transition-colors focus:border-[#FF2E54]/60 focus:outline-none ${
                isHeroOverlay
                  ? 'border-white/15 bg-black/40 backdrop-blur-md focus:bg-black/70'
                  : 'border-white/10 bg-[#14141A] focus:bg-[#191921]'
              }`}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                aria-label="Aramayı temizle"
                className="absolute right-2.5 rounded-full p-0.5 text-zinc-400 hover:text-white cursor-pointer"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {searchFocused && q.length > 0 && (
            <div className="absolute left-0 right-0 top-12 z-50 overflow-hidden rounded-2xl border border-white/10 bg-[#131319] shadow-2xl">
              {matchedAnimes.length === 0 && matchedUsers.length === 0 ? (
                <div className="px-4 py-6 text-center text-sm text-zinc-400">
                  “{searchQuery}” ile eşleşen anime veya kullanıcı bulunamadı.
                </div>
              ) : (
                <div className="max-h-[420px] overflow-y-auto divide-y divide-white/[0.06]">
                  {matchedAnimes.length > 0 && (
                    <div className="p-2">
                      <div className="px-2.5 py-1.5 text-xs font-semibold text-zinc-400">
                        Animeler
                      </div>
                      {matchedAnimes.map((anime) => (
                        <button
                          key={anime.id}
                          onClick={() => {
                            openAnimeWatch(anime.id, 1);
                            setSearchFocused(false);
                            setSearchQuery('');
                          }}
                          className="flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left transition-colors hover:bg-white/[0.06] cursor-pointer"
                        >
                          <img
                            src={anime.posterUrl}
                            alt={anime.title}
                            referrerPolicy="no-referrer"
                            className="h-12 w-9 rounded-lg object-cover shrink-0 bg-zinc-800"
                          />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold text-white">
                              {anime.title}
                            </p>
                            <p className="truncate text-xs text-zinc-400">
                              <span className="text-amber-400 font-medium">★ {anime.score}</span>
                              {' · '}
                              {anime.episodeCount} Bölüm
                              {' · '}
                              {anime.genres.slice(0, 2).join(', ')}
                            </p>
                          </div>
                          <ChevronRight className="h-4 w-4 text-zinc-500 shrink-0" />
                        </button>
                      ))}
                    </div>
                  )}

                  {matchedUsers.length > 0 && (
                    <div className="p-2">
                      <div className="px-2.5 py-1.5 text-xs font-semibold text-zinc-400">
                        Kullanıcılar
                      </div>
                      {matchedUsers.map((user) => (
                        <button
                          key={user.id}
                          onClick={() => {
                            openProfileModal(user);
                            setSearchFocused(false);
                            setSearchQuery('');
                          }}
                          className="flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left transition-colors hover:bg-white/[0.06] cursor-pointer"
                        >
                          <img
                            src={user.avatarUrl}
                            alt={user.displayName}
                            referrerPolicy="no-referrer"
                            className="h-9 w-9 rounded-full object-cover shrink-0 bg-zinc-800"
                          />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold text-white">
                              {user.displayName}
                            </p>
                            <p className="truncate text-xs text-zinc-400">{user.handle}</p>
                          </div>
                          <Users className="h-4 w-4 text-zinc-500 shrink-0" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right: Gift Countdown + Auth / User Controls */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setActiveSection('premium')}
            title={hasActiveGiveaway ? giveaway?.title : 'Premium Dükkanı & Çekiliş'}
            className="relative flex h-9 w-9 items-center justify-center rounded-full border border-amber-500/35 bg-amber-500/10 text-amber-400 transition-colors hover:bg-amber-500/20 cursor-pointer"
          >
            <Gift className="h-4 w-4" />
            {hasActiveGiveaway && (
              <span className="absolute -bottom-1 rounded-full bg-amber-500 px-1 py-[1px] font-mono-num text-[9px] font-bold leading-none text-black">
                {giveawayBadge}
              </span>
            )}
          </button>

          {currentUser ? (
            <>
              <button
                onClick={() => openDmWith()}
                aria-label="Direkt Mesajlar"
                title="Direkt Mesajlar (DM)"
                className="relative flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-[#14141A] text-zinc-300 transition-colors hover:bg-white/10 hover:text-white cursor-pointer"
              >
                <MessageCircle className="h-4 w-4" />
                {unreadDmCount > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-[#FF2E54] px-1 font-mono-num text-[10px] font-bold text-white">
                    {unreadDmCount}
                  </span>
                )}
              </button>

              <div ref={notifRef} className="relative">
                <button
                  onClick={() => setNotifOpen((o) => !o)}
                  aria-label="Bildirimler"
                  className="relative flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-[#14141A] text-zinc-300 transition-colors hover:bg-white/10 hover:text-white cursor-pointer"
                >
                  <Bell className="h-4 w-4" />
                  {unreadCount > 0 && (
                    <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-[#FF2E54]" />
                  )}
                </button>

                {notifOpen && (
                  <div className="absolute right-0 top-12 z-50 w-80 overflow-hidden rounded-2xl border border-white/10 bg-[#14141A] shadow-2xl">
                    <div className="flex items-center justify-between border-b border-white/[0.07] px-4 py-3">
                      <span className="text-sm font-semibold text-white">Bildirimler</span>
                      {unreadCount > 0 && (
                        <button
                          onClick={markAllNotificationsRead}
                          className="text-xs font-medium text-[#FF2E54] hover:underline cursor-pointer"
                        >
                          Tümünü okundu yap
                        </button>
                      )}
                    </div>
                    <div className="max-h-72 overflow-y-auto divide-y divide-white/[0.06]">
                      {notifications.map((n) => (
                        <button
                          key={n.id}
                          onClick={() => {
                            if (n.animeId) openAnimeWatch(n.animeId, 1);
                            setNotifOpen(false);
                          }}
                          className={`w-full px-4 py-3 text-left transition-colors hover:bg-white/[0.05] cursor-pointer ${
                            !n.read ? 'bg-[#FF2E54]/[0.05]' : ''
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-semibold text-white">{n.title}</span>
                            <span className="text-[11px] text-zinc-500">{n.time}</span>
                          </div>
                          <p className="mt-1 text-xs text-zinc-400">{n.description}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div ref={userMenuRef} className="relative">
                <button
                  onClick={() => setUserMenuOpen((o) => !o)}
                  className="flex items-center gap-2.5 rounded-full border border-white/10 bg-[#14141A] py-1 pl-1.5 pr-3 text-sm font-medium text-white transition-colors hover:border-white/20 cursor-pointer"
                >
                  <img
                    src={currentUser.avatarUrl}
                    alt={currentUser.displayName}
                    referrerPolicy="no-referrer"
                    className={`h-7 w-7 rounded-full object-cover ring-2 ${ACCENT_THEMES[currentUser.accentColor].ring}`}
                  />
                  <span className="hidden sm:inline max-w-[110px] truncate">
                    {currentUser.displayName}
                  </span>
                </button>

                {userMenuOpen && (
                  <div className="absolute right-0 top-12 z-50 w-56 overflow-hidden rounded-2xl border border-white/10 bg-[#14141A] p-1.5 shadow-2xl">
                    <div className="px-3 py-2 border-b border-white/[0.06] mb-1">
                      <p className="truncate text-sm font-semibold text-white">
                        {currentUser.displayName}
                      </p>
                      <p className="truncate text-xs text-zinc-400">
                        {currentUser.handle}
                        {currentUser.isAdmin ? ' · Yönetici' : ''}
                      </p>
                    </div>
                    {currentUser.isAdmin && (
                      <button
                        onClick={() => {
                          setActiveSection('yonetim');
                          setUserMenuOpen(false);
                        }}
                        className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-emerald-400 hover:bg-emerald-500/10 cursor-pointer"
                      >
                        <ShieldCheck className="h-4 w-4" />
                        Yönetici Paneli
                      </button>
                    )}
                    <button
                      onClick={() => {
                        setActiveSection('profil');
                        setUserMenuOpen(false);
                      }}
                      className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-zinc-200 hover:bg-white/[0.06] cursor-pointer"
                    >
                      <UserIcon className="h-4 w-4 text-zinc-400" />
                      Profilim & Listem
                    </button>
                    <button
                      onClick={() => {
                        openDmWith();
                        setUserMenuOpen(false);
                      }}
                      className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-sm text-zinc-200 hover:bg-white/[0.06] cursor-pointer"
                    >
                      <span className="flex items-center gap-2.5">
                        <MessageCircle className="h-4 w-4 text-zinc-400" />
                        Direkt Mesajlar
                      </span>
                      {unreadDmCount > 0 && (
                        <span className="font-mono-num rounded-full bg-[#FF2E54] px-1.5 py-0.5 text-[10px] font-bold text-white">
                          {unreadDmCount}
                        </span>
                      )}
                    </button>
                    <button
                      onClick={() => {
                        openOnboarding();
                        setUserMenuOpen(false);
                      }}
                      className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-zinc-200 hover:bg-white/[0.06] cursor-pointer"
                    >
                      <Users className="h-4 w-4 text-zinc-400" />
                      Zevk Rehberi & Eşleşmeler
                    </button>
                    <button
                      onClick={() => {
                        setActiveSection('premium');
                        setUserMenuOpen(false);
                      }}
                      className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-amber-400 hover:bg-white/[0.06] cursor-pointer"
                    >
                      <Sparkles className="h-4 w-4" />
                      Premium Durumu
                    </button>
                    <button
                      onClick={() => {
                        logout();
                        setUserMenuOpen(false);
                      }}
                      className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-rose-400 hover:bg-rose-500/10 cursor-pointer"
                    >
                      <LogOut className="h-4 w-4" />
                      Çıkış Yap
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => openAuthModal('login')}
                className="h-9 rounded-full border border-white/15 bg-[#14141A] px-3.5 text-xs font-semibold text-white whitespace-nowrap shrink-0 transition-colors hover:bg-white/10 cursor-pointer"
              >
                Giriş Yap
              </button>
              <button
                onClick={() => openAuthModal('register')}
                className="h-9 rounded-full bg-[#FF2E54] px-3.5 text-xs font-semibold text-white whitespace-nowrap shrink-0 shadow-[0_0_18px_rgba(255,46,84,0.35)] transition-all hover:brightness-110 cursor-pointer"
              >
                Kayıt Ol
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Nav Strip */}
      <nav className="flex md:hidden items-center gap-2 overflow-x-auto border-t border-white/[0.05] px-4 py-2">
        {navItems.map((item) => {
          const isActive = activeSection === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveSection(item.id)}
              className={`rounded-full px-3 py-1 text-xs font-medium whitespace-nowrap shrink-0 cursor-pointer ${
                isActive
                  ? 'bg-[#FF2E54] text-white'
                  : item.adminOnly
                    ? 'bg-emerald-500/15 text-emerald-300'
                    : item.isGold
                      ? 'bg-amber-500/10 text-amber-400'
                      : 'bg-white/[0.05] text-zinc-300'
              }`}
            >
              {item.label}
            </button>
          );
        })}
        <button
          onClick={() => {
            const first = animes[0];
            if (first) openAnimeWatch(first.id, 1);
          }}
          className="ml-auto flex items-center gap-1 rounded-full bg-white/[0.05] px-3 py-1 text-xs text-zinc-300 whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Star className="h-3 w-3 text-amber-400" /> Hızlı İzle
        </button>
      </nav>
    </header>
  );
};
