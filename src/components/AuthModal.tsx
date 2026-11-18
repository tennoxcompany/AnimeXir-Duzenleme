import React, { useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Check,
  Eye,
  EyeOff,
  Heart,
  MessageSquare,
  Palette,
  Play,
  Search,
  Shield,
  Sunrise,
  User,
  Users,
  X,
} from 'lucide-react';
import { useAppState } from '../context/AppStateContext';
import { ACCENT_THEMES, REAL_CHARACTER_AVATARS } from '../data/animeData';
import { AccentColorKey, RealCharacterPreset } from '../types/anime';

const TURKISH_CHAR_REGEX = /[çğıöşüÇĞİÖŞÜ]/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export const AuthModal: React.FC = () => {
  const {
    authModal,
    openAuthModal,
    closeAuthModal,
    loginWithCredentials,
    loginWithGoogle,
    registerAccount,
  } = useAppState();

  const [loginId, setLoginId] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPw, setShowLoginPw] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [regEmail, setRegEmail] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [regHandle, setRegHandle] = useState('');
  const [regDisplayName, setRegDisplayName] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [showRegPw, setShowRegPw] = useState(false);
  const [step2Error, setStep2Error] = useState<string | null>(null);

  // Real AniList anime character search & presets for Step 3
  const [charQuery, setCharQuery] = useState('');
  const [charChoices, setCharChoices] = useState<RealCharacterPreset[]>(REAL_CHARACTER_AVATARS);
  const [loadingChars, setLoadingChars] = useState(false);
  const [selectedAvatar, setSelectedAvatar] = useState(REAL_CHARACTER_AVATARS[0].avatarUrl);
  const [selectedBanner, setSelectedBanner] = useState(REAL_CHARACTER_AVATARS[0].bannerUrl);
  const [selectedAccent, setSelectedAccent] = useState<AccentColorKey>('crimson');
  const [regError, setRegError] = useState<string | null>(null);

  if (!authModal.open) return null;

  const validateEmail = (value: string): string | null => {
    const trimmed = value.trim();
    if (!trimmed) return 'Lütfen e-posta adresini gir.';
    if (TURKISH_CHAR_REGEX.test(trimmed)) {
      return 'Geçerli bir e-posta adresi gir. Türkçe karakter kullanılamaz.';
    }
    if (!EMAIL_REGEX.test(trimmed)) {
      return 'Geçerli bir e-posta adresi gir. Türkçe karakter kullanılamaz.';
    }
    return null;
  };

  const handleEmailChange = (val: string) => {
    setRegEmail(val);
    if (val.length > 0 && TURKISH_CHAR_REGEX.test(val)) {
      setEmailError('Geçerli bir e-posta adresi gir. Türkçe karakter kullanılamaz.');
    } else if (emailError) {
      setEmailError(validateEmail(val));
    }
  };

  const handleStep1Next = (e: React.FormEvent) => {
    e.preventDefault();
    const err = validateEmail(regEmail);
    if (err) {
      setEmailError(err);
      return;
    }
    setEmailError(null);
    setStep(2);
  };

  const handleStep2Next = (e: React.FormEvent) => {
    e.preventDefault();
    if (regHandle.trim().length < 3) {
      setStep2Error('Kullanıcı adı en az 3 karakter olmalı.');
      return;
    }
    if (regPassword.length < 6) {
      setStep2Error('Şifre en az 6 karakter olmalı.');
      return;
    }
    setStep2Error(null);
    setStep(3);
  };

  const searchCharactersFromAniList = async () => {
    if (!charQuery.trim()) {
      setCharChoices(REAL_CHARACTER_AVATARS);
      return;
    }
    setLoadingChars(true);
    try {
      const res = await fetch(`/api/anilist/characters?q=${encodeURIComponent(charQuery.trim())}`);
      const data = await res.json();
      if (Array.isArray(data.characters) && data.characters.length > 0) {
        setCharChoices(data.characters);
      }
    } catch {
      // keep existing choices
    } finally {
      setLoadingChars(false);
    }
  };

  const handleCompleteRegistration = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setRegError(null);
    const res = await registerAccount({
      email: regEmail,
      handle: regHandle,
      displayName: regDisplayName || regHandle,
      password: regPassword,
      avatarUrl: selectedAvatar,
      bannerUrl: selectedBanner,
      accentColor: selectedAccent,
    });
    setSubmitting(false);
    if (!res.ok) {
      setRegError(res.error || 'Kayıt başarısız.');
      return;
    }
    setStep(1);
    setRegEmail('');
    setRegHandle('');
    setRegDisplayName('');
    setRegPassword('');
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const res = await loginWithCredentials(loginId, loginPassword);
    setSubmitting(false);
    if (!res.ok) {
      setLoginError(res.error ?? 'Giriş yapılamadı.');
    } else {
      setLoginError(null);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-[#08080B]/88 p-4 backdrop-blur-md"
      onClick={closeAuthModal}
    >
      <div
        className="relative w-full max-w-4xl py-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-6 flex items-center justify-center relative">
          <div className="font-display text-3xl font-bold tracking-tight text-white">
            Anime<span className="text-[#FF2E54]">Xir</span>
          </div>
          <button
            onClick={closeAuthModal}
            aria-label="Kapat"
            className="absolute right-0 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-[#14141A] text-zinc-400 hover:text-white cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {authModal.mode === 'login' ? (
          <div className="mx-auto w-full max-w-md rounded-3xl border border-white/10 bg-[#131318] p-7 sm:p-8 shadow-2xl">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-white">Hoş Geldiniz</h2>
              <p className="mt-1.5 text-sm text-zinc-400">
                Hesabınıza giriş yaparak serüvene devam edin.
              </p>
            </div>

            <button
              type="button"
              onClick={loginWithGoogle}
              className="mt-6 flex h-12 w-full items-center justify-center gap-3 rounded-full bg-white text-sm font-semibold text-zinc-900 transition-transform hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
                <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z" />
                <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.14C3.26 21.3 7.31 24 12 24Z" />
                <path fill="#FBBC05" d="M5.28 14.24c-.24-.72-.38-1.49-.38-2.24s.14-1.52.38-2.24V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.99-3.14Z" />
                <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.99 3.14c.95-2.85 3.6-4.96 6.72-4.96Z" />
              </svg>
              Google ile devam et (Yönetici)
            </button>

            <div className="my-6 flex items-center gap-3">
              <div className="h-px flex-1 bg-white/10" />
              <span className="text-xs text-zinc-500">ya da</span>
              <div className="h-px flex-1 bg-white/10" />
            </div>

            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label className="mb-2 flex items-center gap-2 text-sm font-medium text-zinc-200">
                  <User className="h-4 w-4 text-zinc-400" />
                  Kullanıcı Adı veya E-Posta
                </label>
                <input
                  type="text"
                  value={loginId}
                  onChange={(e) => setLoginId(e.target.value)}
                  placeholder="@kullaniciadi veya e-posta"
                  className="h-12 w-full rounded-xl border border-white/10 bg-[#1B1B22] px-4 text-sm text-white placeholder:text-zinc-500 focus:border-[#FF2E54] focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-2 flex items-center gap-2 text-sm font-medium text-zinc-200">
                  <Shield className="h-4 w-4 text-zinc-400" />
                  Şifre
                </label>
                <div className="relative">
                  <input
                    type={showLoginPw ? 'text' : 'password'}
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="••••••••"
                    className="h-12 w-full rounded-xl border border-white/10 bg-[#1B1B22] pl-4 pr-11 text-sm text-white placeholder:text-zinc-500 focus:border-[#FF2E54] focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowLoginPw((s) => !s)}
                    aria-label="Şifreyi göster veya gizle"
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white cursor-pointer"
                  >
                    {showLoginPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {loginError && (
                <div className="flex items-center gap-2 text-xs text-rose-400">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{loginError}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="mt-2 flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[#FF2E54] text-sm font-semibold text-white shadow-[0_0_24px_rgba(255,46,84,0.45)] transition-all hover:brightness-110 disabled:opacity-50 cursor-pointer"
              >
                {submitting ? 'Giriş yapılıyor...' : 'Giriş Yap'}
                <ArrowRight className="h-4 w-4" />
              </button>
            </form>

            <p className="mt-4 text-center text-[11px] text-zinc-500">
              Yönetici: <span className="text-zinc-300">kagangirgin43@gmail.com</span> (<span className="text-zinc-300">@wanderer</span> / <span className="text-zinc-300">admin123</span>)
            </p>

            <p className="mt-4 text-center text-sm text-zinc-400">
              Henüz hesabın yok mu?{' '}
              <button
                type="button"
                onClick={() => {
                  setStep(1);
                  openAuthModal('register');
                }}
                className="font-semibold text-[#FF2E54] hover:underline cursor-pointer"
              >
                Kayıt Ol
              </button>
            </p>
          </div>
        ) : (
          <div className="grid gap-5 lg:grid-cols-[1.05fr_0.95fr] items-stretch">
            {/* Left Column: 3-Step Registration */}
            <div className="rounded-3xl border border-white/10 bg-[#131318] p-7 sm:p-8 flex flex-col justify-between shadow-2xl">
              {step === 1 && (
                <form onSubmit={handleStep1Next}>
                  <span className="font-mono-num text-xs font-bold tracking-wider text-[#FF2E54]">
                    ADIM 1 / 3
                  </span>
                  <h2 className="mt-2 text-2xl sm:text-3xl font-bold text-white">
                    E-posta adresin ne?
                  </h2>
                  <p className="mt-1.5 text-sm text-zinc-400">
                    Hesabını bununla açacağız. Kimseyle paylaşılmaz.
                  </p>

                  <button
                    type="button"
                    onClick={loginWithGoogle}
                    className="mt-6 flex h-12 w-full items-center justify-center gap-3 rounded-full bg-white text-sm font-semibold text-zinc-900 transition-transform hover:scale-[1.01] cursor-pointer"
                  >
                    <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
                      <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z" />
                      <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.14C3.26 21.3 7.31 24 12 24Z" />
                      <path fill="#FBBC05" d="M5.28 14.24c-.24-.72-.38-1.49-.38-2.24s.14-1.52.38-2.24V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.99-3.14Z" />
                      <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.99 3.14c.95-2.85 3.6-4.96 6.72-4.96Z" />
                    </svg>
                    Google ile devam et
                  </button>

                  <div className="my-5 flex items-center gap-3">
                    <div className="h-px flex-1 bg-white/10" />
                    <span className="text-xs text-zinc-500">ya da</span>
                    <div className="h-px flex-1 bg-white/10" />
                  </div>

                  <input
                    type="text"
                    value={regEmail}
                    onChange={(e) => handleEmailChange(e.target.value)}
                    placeholder="ornek@gmail.com"
                    className={`h-12 w-full rounded-xl border bg-[#191920] px-4 text-sm text-white placeholder:text-zinc-500 focus:outline-none ${
                      emailError
                        ? 'border-[#FF2E54]'
                        : 'border-[#FF2E54]/45 focus:border-[#FF2E54]'
                    }`}
                  />

                  {emailError ? (
                    <div className="mt-2.5 flex items-center gap-2 text-xs font-medium text-[#FF4D6D]">
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      <span>{emailError}</span>
                    </div>
                  ) : (
                    <p className="mt-2.5 text-xs leading-relaxed text-zinc-400">
                      Gmail, Outlook, Hotmail, Live, iCloud, Yahoo, Yandex, Proton veya Mynet adresi kullan.
                    </p>
                  )}

                  <button
                    type="submit"
                    className="mt-6 flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[#FF2E54] text-sm font-semibold text-white shadow-[0_0_24px_rgba(255,46,84,0.35)] transition-all hover:brightness-110 cursor-pointer"
                  >
                    Devam Et
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </form>
              )}

              {step === 2 && (
                <form onSubmit={handleStep2Next}>
                  <div className="flex items-center justify-between">
                    <span className="font-mono-num text-xs font-bold tracking-wider text-[#FF2E54]">
                      ADIM 2 / 3
                    </span>
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      className="flex items-center gap-1 text-xs text-zinc-400 hover:text-white cursor-pointer"
                    >
                      <ArrowLeft className="h-3.5 w-3.5" /> Geri
                    </button>
                  </div>
                  <h2 className="mt-2 text-2xl font-bold text-white">Kimliğini oluştur</h2>
                  <p className="mt-1.5 text-sm text-zinc-400">
                    Toplulukta ve izleme odalarında görünecek adını seç.
                  </p>

                  <div className="mt-6 space-y-4">
                    <div>
                      <label className="mb-1.5 block text-xs font-medium text-zinc-300">
                        Kullanıcı Adı
                      </label>
                      <input
                        type="text"
                        value={regHandle}
                        onChange={(e) => setRegHandle(e.target.value)}
                        placeholder="@kullaniciadi"
                        className="h-11 w-full rounded-xl border border-white/10 bg-[#1B1B22] px-4 text-sm text-white placeholder:text-zinc-500 focus:border-[#FF2E54] focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-medium text-zinc-300">
                        Görünen İsim
                      </label>
                      <input
                        type="text"
                        value={regDisplayName}
                        onChange={(e) => setRegDisplayName(e.target.value)}
                        placeholder="Örn: Gojo Satoru"
                        className="h-11 w-full rounded-xl border border-white/10 bg-[#1B1B22] px-4 text-sm text-white placeholder:text-zinc-500 focus:border-[#FF2E54] focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-medium text-zinc-300">
                        Şifre (en az 6 karakter)
                      </label>
                      <div className="relative">
                        <input
                          type={showRegPw ? 'text' : 'password'}
                          value={regPassword}
                          onChange={(e) => setRegPassword(e.target.value)}
                          placeholder="••••••••"
                          className="h-11 w-full rounded-xl border border-white/10 bg-[#1B1B22] pl-4 pr-10 text-sm text-white placeholder:text-zinc-500 focus:border-[#FF2E54] focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => setShowRegPw((s) => !s)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white cursor-pointer"
                        >
                          {showRegPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                  </div>

                  {step2Error && (
                    <div className="mt-3 flex items-center gap-2 text-xs text-[#FF4D6D]">
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      <span>{step2Error}</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    className="mt-6 flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[#FF2E54] text-sm font-semibold text-white shadow-[0_0_24px_rgba(255,46,84,0.35)] hover:brightness-110 cursor-pointer"
                  >
                    Devam Et
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </form>
              )}

              {step === 3 && (
                <form onSubmit={handleCompleteRegistration}>
                  <div className="flex items-center justify-between">
                    <span className="font-mono-num text-xs font-bold tracking-wider text-[#FF2E54]">
                      ADIM 3 / 3
                    </span>
                    <button
                      type="button"
                      onClick={() => setStep(2)}
                      className="flex items-center gap-1 text-xs text-zinc-400 hover:text-white cursor-pointer"
                    >
                      <ArrowLeft className="h-3.5 w-3.5" /> Geri
                    </button>
                  </div>
                  <h2 className="mt-2 text-2xl font-bold text-white">
                    Gerçek anime avatarını seç
                  </h2>
                  <p className="mt-1 text-xs text-zinc-400">
                    AniList’ten dilediğin karakteri ara veya hazır gerçek anime görsellerinden seç.
                  </p>

                  {/* Search AniList Character Avatars */}
                  <div className="mt-4 flex gap-2">
                    <div className="relative flex-1">
                      <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400" />
                      <input
                        type="text"
                        value={charQuery}
                        onChange={(e) => setCharQuery(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            searchCharactersFromAniList();
                          }
                        }}
                        placeholder="Karakter ara (Gojo, Levi, Killua, Mikasa...)"
                        className="h-9 w-full rounded-xl border border-white/10 bg-[#1B1B22] pl-9 pr-3 text-xs text-white placeholder:text-zinc-500 focus:border-[#FF2E54] focus:outline-none"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={searchCharactersFromAniList}
                      className="h-9 rounded-xl border border-white/15 bg-white/[0.08] px-3 text-xs font-semibold text-white hover:bg-white/15 cursor-pointer"
                    >
                      {loadingChars ? '...' : 'AniList’te Ara'}
                    </button>
                  </div>

                  <div className="mt-4 space-y-4">
                    <div>
                      <span className="mb-1.5 block text-xs font-medium text-zinc-300">
                        Karakter Avatarı (Tıklayınca kapağı da otomatik eşler)
                      </span>
                      <div className="grid max-h-40 grid-cols-4 gap-2 overflow-y-auto pr-1">
                        {charChoices.slice(0, 8).map((ch) => (
                          <button
                            key={ch.id}
                            type="button"
                            onClick={() => {
                              setSelectedAvatar(ch.avatarUrl);
                              setSelectedBanner(ch.bannerUrl);
                            }}
                            title={`${ch.name} (${ch.anime})`}
                            className={`group relative overflow-hidden rounded-xl border p-1 transition-all cursor-pointer ${
                              selectedAvatar === ch.avatarUrl
                                ? 'border-[#FF2E54] bg-[#FF2E54]/15'
                                : 'border-white/10 bg-[#1B1B22] hover:border-white/25'
                            }`}
                          >
                            <img
                              src={ch.avatarUrl}
                              alt={ch.name}
                              referrerPolicy="no-referrer"
                              className="aspect-square w-full rounded-lg object-cover"
                            />
                            <p className="mt-1 truncate text-[10px] font-medium text-zinc-300">
                              {ch.name}
                            </p>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <span className="mb-1.5 block text-xs font-medium text-zinc-300">
                        Vurgu Rengi
                      </span>
                      <div className="flex items-center gap-3">
                        {(Object.keys(ACCENT_THEMES) as AccentColorKey[]).map((key) => {
                          const theme = ACCENT_THEMES[key];
                          const active = selectedAccent === key;
                          return (
                            <button
                              key={key}
                              type="button"
                              onClick={() => setSelectedAccent(key)}
                              title={theme.name}
                              className={`flex h-8 w-8 items-center justify-center rounded-full border-2 transition-transform cursor-pointer ${
                                active
                                  ? 'scale-110 border-white'
                                  : 'border-transparent opacity-75 hover:opacity-100'
                              }`}
                              style={{ backgroundColor: theme.hex }}
                            >
                              {active && <Check className="h-4 w-4 text-white" />}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {regError && (
                    <div className="mt-3 flex items-center gap-2 text-xs text-[#FF4D6D]">
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      <span>{regError}</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={submitting}
                    className="mt-6 flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[#FF2E54] text-sm font-semibold text-white shadow-[0_0_24px_rgba(255,46,84,0.4)] hover:brightness-110 disabled:opacity-50 cursor-pointer"
                  >
                    {submitting ? 'Hesap oluşturuluyor...' : 'Hesabı Oluştur ve Başla'}
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </form>
              )}

              <p className="mt-6 text-center text-sm text-zinc-400">
                Zaten hesabın var mı?{' '}
                <button
                  type="button"
                  onClick={() => openAuthModal('login')}
                  className="font-semibold text-[#FF2E54] hover:underline cursor-pointer"
                >
                  Giriş Yap
                </button>
              </p>
            </div>

            {/* Right Column: ÜCRETSİZ ÜYELİK Perks */}
            <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-[#2B141A]/90 via-[#171216] to-[#121216] p-7 sm:p-8 flex flex-col justify-between">
              <div>
                <span className="text-xs font-bold tracking-wider text-[#FF4D6D]">
                  ÜCRETSİZ ÜYELİK
                </span>
                <h3 className="mt-2 text-2xl font-bold text-white">
                  Üye olunca neler açılır?
                </h3>

                <div className="mt-6 space-y-5">
                  <div className="flex items-start gap-3.5">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#FF2E54]/15 text-[#FF4D6D]">
                      <Play className="h-4 w-4 fill-current" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">Kaldığın yerden devam et</p>
                      <p className="mt-0.5 text-xs leading-relaxed text-zinc-400">
                        Hangi bölümde kaldığın tüm cihazlarında aynı kalır.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3.5">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#FF2E54]/15 text-[#FF4D6D]">
                      <Heart className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">Listem ve Favoriler</p>
                      <p className="mt-0.5 text-xs leading-relaxed text-zinc-400">
                        İzleyeceklerini kaydet, en sevdiklerini profilinde sırala.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3.5">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#FF2E54]/15 text-[#FF4D6D]">
                      <MessageSquare className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">Yorum ve inceleme yaz</p>
                      <p className="mt-0.5 text-xs leading-relaxed text-zinc-400">
                        Bölümleri tartış, serilere puan ver.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3.5">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#FF2E54]/15 text-[#FF4D6D]">
                      <Users className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">Arkadaşlarını ekle</p>
                      <p className="mt-0.5 text-xs leading-relaxed text-zinc-400">
                        Kimin neyi izlediğini gör, profillerine yaz.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3.5">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#FF2E54]/15 text-[#FF4D6D]">
                      <Palette className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">Profilini kendine göre ayarla</p>
                      <p className="mt-0.5 text-xs leading-relaxed text-zinc-400">
                        Fotoğrafını, kapağını ve vurgu rengini seç.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 border-t border-white/10 pt-5 flex items-center gap-3.5">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-orange-500/15 text-orange-400">
                  <Sunrise className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">
                    İlk rozetin hazır: Erken Destekçi
                  </p>
                  <p className="text-xs text-zinc-400">
                    Kayıt olduğun gün profiline eklenir.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
