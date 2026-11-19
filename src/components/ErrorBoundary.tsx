import React from 'react';

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      message: error?.message || 'Beklenmeyen bir hata oluştu.',
    };
  }

  componentDidCatch(error: Error) {
    console.error('AnimeXir ErrorBoundary:', error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-[#0B0B0F] px-6 text-center text-white">
          <div className="max-w-md rounded-3xl border border-white/10 bg-[#14141A] p-8 shadow-2xl">
            <h1 className="font-display text-2xl font-bold text-[#FF2E54]">
              AnimeXir · Bağlantı Hatası
            </h1>
            <p className="mt-3 text-sm text-zinc-300">
              İşlem sırasında bir hata oluştu. Sayfayı yenileyerek tekrar deneyebilirsiniz.
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-6 inline-flex h-10 items-center justify-center rounded-full bg-[#FF2E54] px-6 text-xs font-semibold text-white hover:brightness-110 cursor-pointer"
            >
              Sayfayı Yenile
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
