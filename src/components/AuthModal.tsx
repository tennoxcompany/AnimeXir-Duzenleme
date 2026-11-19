import React, { useState } from 'react';
import {
  AlertCircle,
  Heart,
  Loader2,
  MessageSquare,
  Palette,
  Play,
  ShieldCheck,
  Sunrise,
  Users,
  X,
} from 'lucide-react';
import { useAppState } from '../context/AppStateContext';

export const AuthModal: React.FC = () => {
  const { authModal, openAuthModal, closeAuthModal, loginWithGoogle } = useAppState();
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!authModal.open) return null;

  const handleGoogleAuth = async () => {
    setSubmitting(true);
    setErrorMsg(null);
    const res = await loginWithGoogle();
    setSubmitting(false);
    if (!res.ok && res.error) {
      setErrorMsg(res.error);
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
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#FF2E54]/15 text-[#FF4D6D]">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <h2 className="text-2xl font-bold text-white">Hoş Geldiniz</h2>
              <p className="mt-1.5 text-sm text-zinc-400">
                Google hesabınızla güvenli şekilde giriş yaparak serüvene devam edin.
              </p>
            </div>

            <button
              type="button"
              disabled={submitting}
              onClick={handleGoogleAuth}
              className="mt-7 flex h-12 w-full items-center justify-center gap-3 rounded-full bg-white text-sm font-semibold text-zinc-900 shadow-lg transition-transform hover:scale-[1.01] active:scale-[0.99] disabled:opacity-60 cursor-pointer"
            >
              {submitting ? (
                <Loader2 className="h-5 w-5 animate-spin text-zinc-700" />
              ) : (
                <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
                  <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z" />
                  <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.14C3.26 21.3 7.31 24 12 24Z" />
                  <path fill="#FBBC05" d="M5.28 14.24c-.24-.72-.38-1.49-.38-2.24s.14-1.52.38-2.24V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.99-3.14Z" />
                  <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.99 3.14c.95-2.85 3.6-4.96 6.72-4.96Z" />
                </svg>
              )}
              {submitting ? 'Google bağlanıyor...' : 'Google ile Giriş Yap'}
            </button>

            {errorMsg && (
              <div className="mt-4 flex items-start gap-2 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            <p className="mt-5 text-center text-xs leading-relaxed text-zinc-500">
              Tüm hesaplar gerçek Google doğrulamasıyla korunur. Parolalarınız sitede saklanmaz.
            </p>

            <p className="mt-5 text-center text-sm text-zinc-400">
              Henüz hesabın yok mu?{' '}
              <button
                type="button"
                onClick={() => {
                  setErrorMsg(null);
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
            <div className="rounded-3xl border border-white/10 bg-[#131318] p-7 sm:p-8 flex flex-col justify-between shadow-2xl">
              <div>
                <span className="font-mono-num text-xs font-bold tracking-wider text-[#FF2E54]">
                  HIZLI VE GÜVENLİ KAYIT
                </span>
                <h2 className="mt-2 text-2xl sm:text-3xl font-bold text-white">
                  Google ile hesabını aç
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-zinc-400">
                  Tek tıkla Google hesabınla kaydol. Hemen ardından gizlilik onayını verip favori türlerini seçebilir, seninle aynı anime zevkine sahip üyelerle tanışabilirsin.
                </p>

                <button
                  type="button"
                  disabled={submitting}
                  onClick={handleGoogleAuth}
                  className="mt-7 flex h-12 w-full items-center justify-center gap-3 rounded-full bg-white text-sm font-semibold text-zinc-900 shadow-lg transition-transform hover:scale-[1.01] active:scale-[0.99] disabled:opacity-60 cursor-pointer"
                >
                  {submitting ? (
                    <Loader2 className="h-5 w-5 animate-spin text-zinc-700" />
                  ) : (
                    <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
                      <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z" />
                      <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.14C3.26 21.3 7.31 24 12 24Z" />
                      <path fill="#FBBC05" d="M5.28 14.24c-.24-.72-.38-1.49-.38-2.24s.14-1.52.38-2.24V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.99-3.14Z" />
                      <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.99 3.14c.95-2.85 3.6-4.96 6.72-4.96Z" />
                    </svg>
                  )}
                  {submitting ? 'Google bağlanıyor...' : 'Google ile Devam Et'}
                </button>

                {errorMsg && (
                  <div className="mt-4 flex items-start gap-2 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300">
                    <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                <div className="mt-5 rounded-2xl border border-white/[0.08] bg-[#191922] p-4 text-xs leading-relaxed text-zinc-400">
                  Kayıt olduktan sonra profil sayfandan AniList karakter avatarını, kapağını, görünen adını ve vurgu rengini istediğin gibi özelleştirebilirsin.
                </div>
              </div>

              <p className="mt-6 text-center text-sm text-zinc-400">
                Zaten hesabın var mı?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setErrorMsg(null);
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
                      <p className="text-sm font-semibold text-white">Profilini kendine göre ayarla</p>
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
