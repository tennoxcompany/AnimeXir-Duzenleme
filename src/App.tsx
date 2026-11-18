import React from 'react';
import { AdminView } from './components/AdminView';
import { AuthModal } from './components/AuthModal';
import { DMDrawer } from './components/DMDrawer';
import { HomeView } from './components/HomeView';
import { LiveActivityTicker } from './components/LiveActivityTicker';
import { Navbar } from './components/Navbar';
import { OnboardingModal } from './components/OnboardingModal';
import { ProfileModal } from './components/ProfileModal';
import {
  CommunityView,
  PremiumView,
  ScheduleView,
  WatchPartyView,
} from './components/SecondaryViews';
import { WatchView } from './components/WatchView';
import { AppStateProvider, useAppState } from './context/AppStateContext';

const AppShell: React.FC = () => {
  const { activeSection, setActiveSection, toastMessage, selectedProfile } =
    useAppState();

  const isHome = activeSection === 'kesfet';

  return (
    <div className="flex min-h-screen flex-col bg-[#0B0B0F] text-[#F8FAFC]">
      <div className={isHome ? 'fixed top-0 inset-x-0 z-50' : 'sticky top-0 z-50'}>
        <Navbar />
        <LiveActivityTicker overlay={isHome} />
      </div>

      <main className="flex-1">
        {activeSection === 'kesfet' && <HomeView />}
        {activeSection === 'izle' && <WatchView />}
        {activeSection === 'takvim' && <ScheduleView />}
        {activeSection === 'birlikte-izle' && <WatchPartyView />}
        {activeSection === 'topluluk' && <CommunityView />}
        {activeSection === 'premium' && <PremiumView />}
        {activeSection === 'profil' && <ProfileModal asPage />}
        {activeSection === 'yonetim' && <AdminView />}
      </main>

      <footer className="border-t border-white/[0.06] bg-[#09090D] py-5 text-center text-xs text-zinc-500">
        <div className="mx-auto flex max-w-[1440px] flex-col items-center justify-between gap-4 px-4 sm:flex-row sm:px-6 lg:px-8">
          <div className="flex items-center gap-2">
            <span className="font-display text-base font-bold text-white">
              Anime<span className="text-[#FF2E54]">Xir</span>
            </span>
            <span>· Türkçe Altyazılı ve Dublajlı Anime Platformu</span>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-5">
            <button
              onClick={() => setActiveSection('kesfet')}
              className="hover:text-zinc-200 cursor-pointer"
            >
              Keşfet
            </button>
            <button
              onClick={() => setActiveSection('takvim')}
              className="hover:text-zinc-200 cursor-pointer"
            >
              Yayın Takvimi
            </button>
            <button
              onClick={() => setActiveSection('birlikte-izle')}
              className="hover:text-zinc-200 cursor-pointer"
            >
              Birlikte İzle
            </button>
            <button
              onClick={() => setActiveSection('topluluk')}
              className="hover:text-zinc-200 cursor-pointer"
            >
              Topluluk
            </button>
          </div>
          <p>© 2026 AnimeXir</p>
        </div>
      </footer>

      <AuthModal />
      <OnboardingModal />
      <DMDrawer />
      {selectedProfile && <ProfileModal />}

      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-[120] rounded-2xl border border-white/15 bg-[#191922] px-4 py-3 text-xs font-semibold text-white shadow-2xl">
          {toastMessage}
        </div>
      )}
    </div>
  );
};

export default function App() {
  return (
    <AppStateProvider>
      <AppShell />
    </AppStateProvider>
  );
}
