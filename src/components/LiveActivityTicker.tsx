import React from 'react';
import { X } from 'lucide-react';
import { useAppState } from '../context/AppStateContext';

interface LiveActivityTickerProps {
  overlay?: boolean;
}

export const LiveActivityTicker: React.FC<LiveActivityTickerProps> = ({ overlay = false }) => {
  const {
    tickerItems,
    tickerVisible,
    setTickerVisible,
    liveViewerCount,
    openAnimeWatch,
  } = useAppState();

  const hasViewers = liveViewerCount > 0;
  const hasComments = tickerItems.length > 0;

  if (!tickerVisible || (!hasViewers && !hasComments)) return null;

  const formattedCount = liveViewerCount.toLocaleString('tr-TR');
  const displayItems = tickerItems.length >= 4 ? [...tickerItems, ...tickerItems] : tickerItems;

  return (
    <div
      className={`relative z-40 border-y transition-colors ${
        overlay
          ? 'border-white/[0.08] bg-black/50 backdrop-blur-md'
          : 'border-white/[0.06] bg-[#101015]'
      }`}
    >
      <div className="mx-auto flex h-9 max-w-[1440px] items-center">
        {/* Real Active Viewer Count */}
        {hasViewers && (
          <div
            className={`flex h-full shrink-0 items-center gap-2 border-r border-white/[0.08] px-4 sm:px-6 z-10 ${
              overlay ? 'bg-black/35' : 'bg-[#101015]'
            }`}
          >
            <span className="h-2 w-2 rounded-full bg-[#FF2E54] shadow-[0_0_8px_#FF2E54] animate-pulse" />
            <span className="text-xs font-medium text-zinc-100 whitespace-nowrap font-mono-num">
              Şu an {formattedCount} kişi izliyor
            </span>
          </div>
        )}

        {/* Real User Comments Only */}
        <div className="relative flex-1 overflow-hidden px-4">
          {hasComments && (
            tickerItems.length >= 4 ? (
              <div className="animate-ticker items-center gap-8">
                {displayItems.map((item, index) => (
                  <button
                    key={`${item.id}-${index}`}
                    onClick={() => openAnimeWatch(item.animeId, item.episodeNumber ?? 1)}
                    className="flex items-center gap-2 text-xs whitespace-nowrap transition-opacity hover:opacity-80 cursor-pointer"
                  >
                    <img
                      src={item.avatarUrl}
                      alt={item.username}
                      referrerPolicy="no-referrer"
                      className="h-5 w-5 rounded-full object-cover bg-zinc-800"
                    />
                    <span className="font-semibold text-white">{item.username}</span>
                    <span className="text-zinc-400">
                      {item.animeTitle}
                      {item.episodeNumber ? ` ${item.episodeNumber}. Bölüm` : ''}
                      {item.scoreLabel ? `, ${item.scoreLabel}` : ''}
                    </span>
                    <span className="text-zinc-200 font-medium max-w-[260px] truncate">
                      {item.comment}
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="flex items-center gap-7 overflow-x-auto no-scrollbar">
                {displayItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => openAnimeWatch(item.animeId, item.episodeNumber ?? 1)}
                    className="flex items-center gap-2 text-xs whitespace-nowrap transition-opacity hover:opacity-80 cursor-pointer shrink-0"
                  >
                    <img
                      src={item.avatarUrl}
                      alt={item.username}
                      referrerPolicy="no-referrer"
                      className="h-5 w-5 rounded-full object-cover bg-zinc-800"
                    />
                    <span className="font-semibold text-white">{item.username}</span>
                    <span className="text-zinc-400">
                      {item.animeTitle}
                      {item.episodeNumber ? ` ${item.episodeNumber}. Bölüm` : ''}
                      {item.scoreLabel ? `, ${item.scoreLabel}` : ''}
                    </span>
                    <span className="text-zinc-200 font-medium max-w-[260px] truncate">
                      {item.comment}
                    </span>
                  </button>
                ))}
              </div>
            )
          )}
        </div>

        {/* Close Button */}
        <button
          onClick={() => setTickerVisible(false)}
          aria-label="Canlı akışı kapat"
          className="flex h-full shrink-0 items-center justify-center border-l border-white/[0.08] px-3 text-zinc-400 transition-colors hover:text-white cursor-pointer"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
};
