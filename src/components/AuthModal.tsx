import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Eye,
  EyeOff,
  Heart,
  Loader2,
  Lock,
  Mail,
  MailCheck,
  MessageSquare,
  Palette,
  Play,
  RefreshCw,
  Search,
  ShieldCheck,
  Sunrise,
  User,
  Users,
  X,
} from 'lucide-react';
import { useAppState } from '../context/AppStateContext';
import { ACCENT_THEMES, REAL_CHARACTER_AVATARS } from '../data/animeData';
import { AccentColorKey, RealCharacterPreset } from '../types/anime';

const ACCENT_KEYS: AccentColorKey[] = ['crimson', 'sky', 'violet', 'emerald', 'amber'];

export const AuthModal: React.FC = () => {
  const {
    authModal,
    openAuthModal,
    closeAuthModal,
    pendingVerificationEmail,
    loginWithGoogle,
    loginWithCredentials,
    registerAccount,
    resendVerificationEmail,
    refreshEmailVerification,
    sendPasswordReset,
    logout,
  } = useAppState();

  const [submitting, setSubmitting] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);

  // Login form state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPw, setShowLoginPw] = useState(false);

  // 3-Step Register wizard state
  const [regStep, setRegStep] = useState<1 | 2 | 3>(1);
  const [regHandle, setRegHandle] = useState('');
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regPasswordConfirm, setRegPasswordConfirm] = useState('');
  const [showRegPw, setShowRegPw] = useState(false);

  // Step 3: AniList character avatar + banner + accent color
  const [charQuery, setCharQuery] = useState('');
  const [charSearching, setCharSearching] = useState(false);
  const [charOptions, setCharOptions] = useState<RealCharacterPreset[]>(REAL_CHARACTER_AVATARS);
  const [selectedChar, setSelectedChar] = useState<RealCharacterPreset>(REAL_CHARACTER_AVATARS[0]);
  const [accentColor, setAccentColor] = useState<AccentColorKey>('crimson');

  useEffect(() => {
    if (authModal.open) {
      setErrorMsg(null);
      setInfoMsg(null);
      setRegStep(1);
    }
  }, [authModal.open, authModal.mode]);

  if (!authModal.open) return null;

  const resetMessages = () => {
    setErrorMsg(null);
    setInfoMsg(null);
  };

  const handleGoogleAuth = async () => {
    setGoogleLoading(true);
    resetMessages();
    const res = await loginWithGoogle();
    setGoogleLoading(false);
    if (!res.ok && res.error) {
      setErrorMsg(res.error);
    }
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    resetMessages();
    const res = await loginWithCredentials(loginEmail, loginPassword);
    setSubmitting(false);
    if (!res.ok && res.error) {
      setErrorMsg(res.error);
    }
  };

  const handleNextStep1 = (e: React.FormEvent) => {
    e.preventDefault();
    resetMessages();
    const cleanHandle = regHandle.trim().replace(/^@+/, '').replace(/[^a-zA-Z0-9_]/g, '');
    if (cleanHandle.length < 2) {
      setErrorMsg('Kullanıcı adı en az 2 harf veya rakam içermeli.');
      return;
    }
    if (regName.trim().length < 2) {
      setErrorMsg('Görünen ad en az 2 karakter olmalı.');
      return;
    }
    if (!regEmail.trim() || !regEmail.includes('@')) {
      setErrorMsg('Lütfen geçerli bir e-posta adresi gir.');
      return;
    }
    setRegStep(2);
  };

  const handleNextStep2 = (e: React.FormEvent) => {
    e.preventDefault();
    resetMessages();
    if (regPassword.length < 6) {
      setErrorMsg('Şifren en az 6 karakter olmalı.');
      return;
    }
    if (regPassword !== regPasswordConfirm) {
      setErrorMsg('Şifreler birbiriyle eşleşmiyor.');
      return;
    }
    setRegStep(3);
  };

  const handleSearchCharacters = async () => {
    const q = charQuery.trim();
    if (!q) {
      setCharOptions(REAL_CHARACTER_AVATARS);
      return;
    }
    setCharSearching(true);
    try {
      const res = await fetch(`/api/anilist/characters?q=${encodeURIComponent(q)}`);
      if (res.ok) {
        const data = (await res.json()) as { characters?: RealCharacterPreset[] };
        if (Array.isArray(data.characters) && data.characters.length > 0) {
          setCharOptions(data.characters);
          setSelectedChar(data.characters[0]);
        } else {
          setErrorMsg('AniList üzerinde bu isimle karakter bulunamadı.');
        }
      }
    } catch {
      setErrorMsg('AniList karakter araması şu an yanıt vermedi.');
    } finally {
      setCharSearching(false);
    }
  };

  const handleEmailRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    resetMessages();
    const res = await registerAccount({
      displayName: regName.trim(),
      handle: regHandle.trim(),
      email: regEmail.trim(),
      password: regPassword,
      avatarUrl: selectedChar.avatarUrl,
      bannerUrl: selectedChar.bannerUrl,
      accentColor,
    });
    setSubmitting(false);
    if (!res.ok && res.error) {
      setErrorMsg(res.error);
    }
  };

  const handlePasswordReset = async () => {
    setSubmitting(true);
    resetMessages();
    const res = await sendPasswordReset(loginEmail);
    setSubmitting(false);
    if (res.ok) {
      setInfoMsg('Şifre sıfırlama bağlantısı e-posta adresine gönderildi.');
    } else if (res.error) {
      setErrorMsg(res.error);
    }
  };

  const handleCheckVerification = async () => {
    setSubmitting(true);
    resetMessages();
    const res = await refreshEmailVerification();
    setSubmitting(false);
    if (!res.verified && res.error) {
      setErrorMsg(res.error);
    }
  };

  const handleResendVerification = async () => {
    setSubmitting(true);
    resetMessages();
    const res = await resendVerificationEmail();
    setSubmitting(false);
    if (res.ok) {
      setInfoMsg('Doğrulama maili tekrar gönderildi. Gelen kutunu ve Spam klasörünü kontrol et.');
    } else if (res.error) {
      setErrorMsg(res.error);
    }
  };

  const handleSwitchFromVerification = async () => {
    resetMessages();
    await logout();
  };

  const GoogleIcon = () => (
    <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.14C3.26 21.3 7.31 24 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.28 14.24c-.24-.72-.38-1.49-.38-2.24s.14-1.52.38-2.24V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.99-3.14Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.99 3.14c.95-2.85 3.6-4.96 6.72-4.96Z"
      />
    </svg>
  );

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-[#08080B]/88 p-4 backdrop-blur-md"
      onClick={closeAuthModal}
    >
      <div
        className="relative w-full max-w-4xl py-6 my-auto"
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

        {pendingVerificationEmail ? (
          <div className="mx-auto w-full max-w-md rounded-3xl border border-white/10 bg-[#131318] p-7 sm:p-8 shadow-2xl text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#FF2E54]/15 text-[#FF4D6D]">
              <MailCheck className="h-7 w-7" />
            </div>
            <h2 className="text-2xl font-bold text-white">Hesabını Aktif Hale Getir</h2>
            <p className="mt-2 text-sm leading-relaxed text-zinc-400">
              <span className="font-semibold text-white">{pendingVerificationEmail}</span> adresine
              hesap aktivasyon bağlantısı gönderdik. Gmail gelen kutunu (ve Spam / Tanıtımlar
              klasörünü) açıp bağlantıya tıkladığında hesabın otomatik olarak aktifleşecektir.
            </p>

            {errorMsg && (
              <div className="mt-4 flex items-start gap-2 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-3 text-left text-xs text-rose-300">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            {infoMsg && (
              <div className="mt-4 flex items-start gap-2 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-left text-xs text-emerald-300">
                <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{infoMsg}</span>
              </div>
            )}

            <button
              type="button"
              disabled={submitting}
              onClick={handleCheckVerification}
              className="mt-6 flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[#FF2E54] text-sm font-semibold text-white shadow-[0_0_24px_rgba(255,46,84,0.35)] hover:brightness-110 disabled:opacity-60 cursor-pointer"
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              Doğruladım, Devam Et
            </button>

            <div className="mt-3 flex flex-col gap-2">
              {pendingVerificationEmail.endsWith('@gmail.com') && (
                <a
                  href="https://mail.google.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-10 w-full items-center justify-center gap-2 rounded-full border border-white/15 bg-white/[0.06] text-xs font-semibold text-white hover:bg-white/[0.12]"
                >
                  <Mail className="h-3.5 w-3.5" /> Gmail Gelen Kutusunu Aç
                </a>
              )}
              <button
                type="button"
                disabled={submitting}
                onClick={handleResendVerification}
                className="flex h-10 w-full items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-xs font-semibold text-zinc-200 hover:bg-white/[0.08] cursor-pointer"
              >
                Aktivasyon Mailini Tekrar Gönder
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={handleSwitchFromVerification}
                className="flex h-10 w-full items-center justify-center rounded-full text-xs font-medium text-zinc-400 hover:text-white cursor-pointer"
              >
                Farklı bir hesapla giriş yap
              </button>
            </div>
          </div>
        ) : authModal.mode === 'login' ? (
          <div className="mx-auto w-full max-w-md rounded-3xl border border-white/10 bg-[#131318] p-7 sm:p-8 shadow-2xl">
            <div className="text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#FF2E54]/15 text-[#FF4D6D]">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <h2 className="text-2xl font-bold text-white">Hoş Geldiniz</h2>
              <p className="mt-1.5 text-sm text-zinc-400">
                E-posta adresinle veya Google hesabınla giriş yap.
              </p>
            </div>

            <form onSubmit={handleEmailLogin} className="mt-6 space-y-3.5">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-zinc-300">
                  E-posta Adresi
                </label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                  <input
                    type="email"
                    required
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    placeholder="ornek@eposta.com"
                    className="h-11 w-full rounded-2xl border border-white/10 bg-[#1B1B23] pl-10 pr-4 text-sm text-white placeholder:text-zinc-500 focus:border-[#FF2E54] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <label className="text-xs font-medium text-zinc-300">Şifre</label>
                  <button
                    type="button"
                    onClick={handlePasswordReset}
                    disabled={submitting}
                    className="text-xs font-medium text-[#FF4D6D] hover:underline cursor-pointer"
                  >
                    Şifremi Unuttum?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                  <input
                    type={showLoginPw ? 'text' : 'password'}
                    required
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="••••••••"
                    className="h-11 w-full rounded-2xl border border-white/10 bg-[#1B1B23] pl-10 pr-11 text-sm text-white placeholder:text-zinc-500 focus:border-[#FF2E54] focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowLoginPw((v) => !v)}
                    aria-label={showLoginPw ? 'Şifreyi gizle' : 'Şifreyi göster'}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-200 cursor-pointer"
                  >
                    {showLoginPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {errorMsg && (
                <div className="flex items-start gap-2 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {infoMsg && (
                <div className="flex items-start gap-2 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-300">
                  <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{infoMsg}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={submitting || googleLoading}
                className="flex h-11 w-full items-center justify-center gap-2 rounded-full bg-[#FF2E54] text-sm font-semibold text-white shadow-[0_0_24px_rgba(255,46,84,0.35)] transition-all hover:brightness-110 disabled:opacity-60 cursor-pointer"
              >
                {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                {submitting ? 'Giriş yapılıyor...' : 'Giriş Yap'}
              </button>
            </form>

            <div className="my-5 flex items-center gap-3">
              <div className="h-px flex-1 bg-white/10" />
              <span className="text-[11px] font-medium uppercase tracking-wider text-zinc-500">
                veya
              </span>
              <div className="h-px flex-1 bg-white/10" />
            </div>

            <button
              type="button"
              disabled={googleLoading || submitting}
              onClick={handleGoogleAuth}
              className="flex h-11 w-full items-center justify-center gap-3 rounded-full bg-white text-sm font-semibold text-zinc-900 shadow-lg transition-transform hover:scale-[1.01] active:scale-[0.99] disabled:opacity-60 cursor-pointer"
            >
              {googleLoading ? (
                <Loader2 className="h-5 w-5 animate-spin text-zinc-700" />
              ) : (
                <GoogleIcon />
              )}
              {googleLoading ? 'Google bağlanıyor...' : 'Google ile Giriş Yap'}
            </button>

            <p className="mt-5 text-center text-sm text-zinc-400">
              Henüz hesabın yok mu?{' '}
              <button
                type="button"
                onClick={() => {
                  resetMessages();
                  openAuthModal('register');
                }}
                className="font-semibold text-[#FF2E54] hover:underline cursor-pointer"
              >
                Kayıt Ol
              </button>
            </p>
          </div>
        ) : (
          <div className="grid gap-5 lg:grid-cols-[1.08fr_0.92fr] items-stretch">
            <div className="rounded-3xl border border-white/10 bg-[#131318] p-7 sm:p-8 flex flex-col justify-between shadow-2xl">
              <div>
                <div className="flex items-center justify-between">
                  <span className="font-mono-num text-xs font-bold tracking-wider text-[#FF2E54]">
                    ADIM {regStep} / 3
                  </span>
                  {regStep > 1 && (
                    <button
                      type="button"
                      onClick={() => {
                        resetMessages();
                        setRegStep((s) => (s === 3 ? 2 : 1));
                      }}
                      className="inline-flex items-center gap-1 text-xs font-medium text-zinc-400 hover:text-white cursor-pointer"
                    >
                      <ArrowLeft className="h-3.5 w-3.5" /> Geri
                    </button>
                  )}
                </div>

                {regStep === 1 && (
                  <form onSubmit={handleNextStep1} className="mt-3 space-y-3.5">
                    <div>
                      <h2 className="text-2xl font-bold text-white">Hesap bilgilerini oluştur</h2>
                      <p className="mt-1 text-xs text-zinc-400">
                        Kullanıcı adını, görünen adını ve e-posta adresini belirle.
                      </p>
                    </div>

                    <div>
                      <label className="mb-1 block text-xs font-medium text-zinc-300">
                        Kullanıcı Adı
                      </label>
                      <div className="relative">
                        <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-zinc-500">
                          @
                        </span>
                        <input
                          type="text"
                          required
                          minLength={2}
                          maxLength={24}
                          value={regHandle}
                          onChange={(e) =>
                            setRegHandle(e.target.value.replace(/[^a-zA-Z0-9_]/g, ''))
                          }
                          placeholder="otaku_tr"
                          className="h-11 w-full rounded-2xl border border-white/10 bg-[#1B1B23] pl-8 pr-4 text-sm text-white placeholder:text-zinc-500 focus:border-[#FF2E54] focus:outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="mb-1 block text-xs font-medium text-zinc-300">
                        Görünen Ad
                      </label>
                      <div className="relative">
                        <User className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                        <input
                          type="text"
                          required
                          minLength={2}
                          maxLength={40}
                          value={regName}
                          onChange={(e) => setRegName(e.target.value)}
                          placeholder="Örn. Kirito"
                          className="h-11 w-full rounded-2xl border border-white/10 bg-[#1B1B23] pl-10 pr-4 text-sm text-white placeholder:text-zinc-500 focus:border-[#FF2E54] focus:outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="mb-1 block text-xs font-medium text-zinc-300">
                        E-posta Adresi
                      </label>
                      <div className="relative">
                        <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                        <input
                          type="email"
                          required
                          value={regEmail}
                          onChange={(e) => setRegEmail(e.target.value)}
                          placeholder="ornek@eposta.com"
                          className="h-11 w-full rounded-2xl border border-white/10 bg-[#1B1B23] pl-10 pr-4 text-sm text-white placeholder:text-zinc-500 focus:border-[#FF2E54] focus:outline-none"
                        />
                      </div>
                    </div>

                    {errorMsg && (
                      <div className="flex items-start gap-2 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300">
                        <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                        <span>{errorMsg}</span>
                      </div>
                    )}

                    <button
                      type="submit"
                      className="flex h-11 w-full items-center justify-center gap-2 rounded-full bg-[#FF2E54] text-sm font-semibold text-white shadow-[0_0_24px_rgba(255,46,84,0.35)] hover:brightness-110 cursor-pointer"
                    >
                      Devam Et <ArrowRight className="h-4 w-4" />
                    </button>

                    <div className="flex items-center gap-3 pt-1">
                      <div className="h-px flex-1 bg-white/10" />
                      <span className="text-[11px] font-medium uppercase tracking-wider text-zinc-500">
                        veya
                      </span>
                      <div className="h-px flex-1 bg-white/10" />
                    </div>

                    <button
                      type="button"
                      disabled={googleLoading || submitting}
                      onClick={handleGoogleAuth}
                      className="flex h-11 w-full items-center justify-center gap-3 rounded-full bg-white text-sm font-semibold text-zinc-900 shadow-lg transition-transform hover:scale-[1.01] active:scale-[0.99] disabled:opacity-60 cursor-pointer"
                    >
                      {googleLoading ? (
                        <Loader2 className="h-5 w-5 animate-spin text-zinc-700" />
                      ) : (
                        <GoogleIcon />
                      )}
                      {googleLoading ? 'Google bağlanıyor...' : 'Google ile Hızlı Kayıt Ol'}
                    </button>
                  </form>
                )}

                {regStep === 2 && (
                  <form onSubmit={handleNextStep2} className="mt-3 space-y-4">
                    <div>
                      <h2 className="text-2xl font-bold text-white">Güvenli şifreni belirle</h2>
                      <p className="mt-1 text-xs text-zinc-400">
                        En az 6 karakterden oluşan güçlü bir şifre seç.
                      </p>
                    </div>

                    <div>
                      <label className="mb-1 block text-xs font-medium text-zinc-300">Şifre</label>
                      <div className="relative">
                        <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                        <input
                          type={showRegPw ? 'text' : 'password'}
                          required
                          minLength={6}
                          value={regPassword}
                          onChange={(e) => setRegPassword(e.target.value)}
                          placeholder="En az 6 karakter"
                          className="h-11 w-full rounded-2xl border border-white/10 bg-[#1B1B23] pl-10 pr-11 text-sm text-white placeholder:text-zinc-500 focus:border-[#FF2E54] focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => setShowRegPw((v) => !v)}
                          aria-label={showRegPw ? 'Şifreyi gizle' : 'Şifreyi göster'}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-200 cursor-pointer"
                        >
                          {showRegPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="mb-1 block text-xs font-medium text-zinc-300">
                        Şifre Tekrar
                      </label>
                      <div className="relative">
                        <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                        <input
                          type={showRegPw ? 'text' : 'password'}
                          required
                          minLength={6}
                          value={regPasswordConfirm}
                          onChange={(e) => setRegPasswordConfirm(e.target.value)}
                          placeholder="Şifreni tekrar gir"
                          className="h-11 w-full rounded-2xl border border-white/10 bg-[#1B1B23] pl-10 pr-4 text-sm text-white placeholder:text-zinc-500 focus:border-[#FF2E54] focus:outline-none"
                        />
                      </div>
                    </div>

                    {errorMsg && (
                      <div className="flex items-start gap-2 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300">
                        <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                        <span>{errorMsg}</span>
                      </div>
                    )}

                    <button
                      type="submit"
                      className="flex h-11 w-full items-center justify-center gap-2 rounded-full bg-[#FF2E54] text-sm font-semibold text-white shadow-[0_0_24px_rgba(255,46,84,0.35)] hover:brightness-110 cursor-pointer"
                    >
                      Avatar Seçimine Geç <ArrowRight className="h-4 w-4" />
                    </button>
                  </form>
                )}

                {regStep === 3 && (
                  <form onSubmit={handleEmailRegister} className="mt-3 space-y-3.5">
                    <div>
                      <h2 className="text-2xl font-bold text-white">Gerçek anime avatarını seç</h2>
                      <p className="mt-1 text-xs text-zinc-400">
                        AniList’ten dilediğin karakteri ara veya hazır gerçek anime görsellerinden
                        seç.
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                        <input
                          type="text"
                          value={charQuery}
                          onChange={(e) => setCharQuery(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              void handleSearchCharacters();
                            }
                          }}
                          placeholder="Örn. Rias, Gojo, Eren..."
                          className="h-10 w-full rounded-xl border border-white/10 bg-[#1B1B23] pl-10 pr-3 text-sm text-white placeholder:text-zinc-500 focus:border-[#FF2E54] focus:outline-none"
                        />
                      </div>
                      <button
                        type="button"
                        disabled={charSearching}
                        onClick={() => void handleSearchCharacters()}
                        className="h-10 shrink-0 rounded-xl border border-white/10 bg-[#1E1E28] px-3.5 text-xs font-semibold text-white hover:bg-white/10 disabled:opacity-60 cursor-pointer"
                      >
                        {charSearching ? 'Aranıyor...' : 'AniList’te Ara'}
                      </button>
                    </div>

                    <div>
                      <p className="mb-2 text-xs text-zinc-400">
                        Karakter Avatarı (Tıklayınca kapağı da otomatik eşler)
                      </p>
                      <div className="grid max-h-48 grid-cols-4 gap-2 overflow-y-auto pr-1">
                        {charOptions.map((char) => {
                          const active = selectedChar.id === char.id;
                          return (
                            <button
                              key={char.id}
                              type="button"
                              onClick={() => setSelectedChar(char)}
                              className={`group relative overflow-hidden rounded-xl border p-1 text-left transition-all cursor-pointer ${
                                active
                                  ? 'border-[#FF2E54] bg-[#FF2E54]/15 ring-1 ring-[#FF2E54]'
                                  : 'border-white/10 bg-[#191922] hover:border-white/25'
                              }`}
                            >
                              <img
                                src={char.avatarUrl}
                                alt={char.name}
                                referrerPolicy="no-referrer"
                                className="h-16 w-full rounded-lg object-cover"
                              />
                              <p className="mt-1 truncate text-[10px] font-medium text-zinc-200">
                                {char.name}
                              </p>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div>
                      <p className="mb-2 text-xs text-zinc-400">Vurgu Rengi</p>
                      <div className="flex items-center gap-2.5">
                        {ACCENT_KEYS.map((key) => {
                          const theme = ACCENT_THEMES[key];
                          const active = accentColor === key;
                          return (
                            <button
                              key={key}
                              type="button"
                              onClick={() => setAccentColor(key)}
                              aria-label={theme.name}
                              className={`flex h-8 w-8 items-center justify-center rounded-full transition-transform cursor-pointer ${
                                active ? 'scale-110 ring-2 ring-white' : 'opacity-75 hover:opacity-100'
                              }`}
                              style={{ backgroundColor: theme.hex }}
                            >
                              {active && <Check className="h-4 w-4 text-white" />}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {errorMsg && (
                      <div className="flex items-start gap-2 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300">
                        <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                        <span>{errorMsg}</span>
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={submitting}
                      className="flex h-11 w-full items-center justify-center gap-2 rounded-full bg-[#FF2E54] text-sm font-semibold text-white shadow-[0_0_24px_rgba(255,46,84,0.35)] transition-all hover:brightness-110 disabled:opacity-60 cursor-pointer"
                    >
                      {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                      {submitting ? 'Hesap oluşturuluyor...' : 'Hesabı Oluştur ve Başla →'}
                    </button>
                  </form>
                )}
              </div>

              <p className="mt-5 text-center text-sm text-zinc-400">
                Zaten hesabın var mı?{' '}
                <button
                  type="button"
                  onClick={() => {
                    resetMessages();
                    openAuthModal('login');
                  }}
                  className="font-semibold text-[#FF2E54] hover:underline cursor-pointer"
                >
                  Giriş Yap
                </button>
              </p>
            </div>

            <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-[#2B141A]/90 via-[#171216] to-[#121216] p-7 sm:p-8 flex flex-col justify-between">
              <div>
                <span className="text-xs font-bold tracking-wider text-[#FF4D6D]">
                  ÜCRETSİZ ÜYELİK
                </span>
                <h3 className="mt-2 text-2xl font-bold text-white">Üye olunca neler açılır?</h3>

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
                      <p className="text-sm font-semibold text-white">Arkadaşlarını ekle & DM at</p>
                      <p className="mt-0.5 text-xs leading-relaxed text-zinc-400">
                        Aynı zevke sahip kişilerle eşleş, doğrudan mesajlaş.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3.5">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#FF2E54]/15 text-[#FF4D6D]">
                      <Palette className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">
                        Profilini kendine göre ayarla
                      </p>
                      <p className="mt-0.5 text-xs leading-relaxed text-zinc-400">
                        AniList karakter avatarını, kapağını ve vurgu rengini seç.
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
