import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  MessageCircle,
  Search,
  Send,
  UserCheck,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import { useAppState } from '../context/AppStateContext';
import { ACCENT_THEMES } from '../data/animeData';

function formatMessageTime(iso: string): string {
  try {
    const d = new Date(iso);
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  } catch {
    return '';
  }
}

export const DMDrawer: React.FC = () => {
  const {
    currentUser,
    profiles,
    friendsIds,
    toggleFriend,
    directMessages,
    dmDrawerOpen,
    activeDmPeerId,
    openDmWith,
    closeDmDrawer,
    sendDirectMessage,
    markDmThreadRead,
    openProfileModal,
  } = useAppState();

  const [filterQuery, setFilterQuery] = useState('');
  const [messageInput, setMessageInput] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const otherUsers = useMemo(
    () => (currentUser ? profiles.filter((p) => p.id !== currentUser.id) : []),
    [profiles, currentUser]
  );

  // Pick initial active peer if none selected
  const selectedPeer = useMemo(() => {
    if (activeDmPeerId) {
      const found = otherUsers.find((u) => u.id === activeDmPeerId);
      if (found) return found;
    }
    if (!currentUser) return null;
    // Prefer latest DM peer or first friend or first user
    const latestMsg = [...directMessages].reverse()[0];
    if (latestMsg) {
      const peerId = latestMsg.senderId === currentUser.id ? latestMsg.receiverId : latestMsg.senderId;
      const found = otherUsers.find((u) => u.id === peerId);
      if (found) return found;
    }
    if (friendsIds.length > 0) {
      const friend = otherUsers.find((u) => friendsIds.includes(u.id));
      if (friend) return friend;
    }
    return otherUsers[0] ?? null;
  }, [activeDmPeerId, otherUsers, directMessages, friendsIds, currentUser]);

  const sortedPeers = useMemo(() => {
    if (!currentUser) return [];
    const q = filterQuery.trim().toLowerCase();
    return otherUsers
      .filter(
        (u) =>
          !q ||
          u.displayName.toLowerCase().includes(q) ||
          u.handle.toLowerCase().includes(q)
      )
      .map((u) => {
        const threadMsgs = directMessages.filter(
          (m) =>
            (m.senderId === currentUser.id && m.receiverId === u.id) ||
            (m.senderId === u.id && m.receiverId === currentUser.id)
        );
        const lastMsg = threadMsgs[threadMsgs.length - 1];
        const unread = threadMsgs.filter(
          (m) => m.senderId === u.id && m.receiverId === currentUser.id && !m.readByReceiver
        ).length;
        const isFriend = friendsIds.includes(u.id);
        return { user: u, lastMsg, unread, isFriend };
      })
      .sort((a, b) => {
        if (a.unread !== b.unread) return b.unread - a.unread;
        const ta = a.lastMsg ? new Date(a.lastMsg.createdAt).getTime() : 0;
        const tb = b.lastMsg ? new Date(b.lastMsg.createdAt).getTime() : 0;
        if (ta !== tb) return tb - ta;
        if (a.isFriend !== b.isFriend) return a.isFriend ? -1 : 1;
        return a.user.displayName.localeCompare(b.user.displayName);
      });
  }, [otherUsers, filterQuery, directMessages, friendsIds, currentUser]);

  const activeThreadMessages = useMemo(() => {
    if (!currentUser || !selectedPeer) return [];
    return directMessages.filter(
      (m) =>
        (m.senderId === currentUser.id && m.receiverId === selectedPeer.id) ||
        (m.senderId === selectedPeer.id && m.receiverId === currentUser.id)
    );
  }, [directMessages, currentUser, selectedPeer]);

  useEffect(() => {
    if (!dmDrawerOpen || !selectedPeer || !currentUser) return;
    const hasUnread = activeThreadMessages.some(
      (m) => m.senderId === selectedPeer.id && !m.readByReceiver
    );
    if (hasUnread) {
      markDmThreadRead(selectedPeer.id);
    }
  }, [dmDrawerOpen, selectedPeer?.id, activeThreadMessages.length]);

  useEffect(() => {
    if (!dmDrawerOpen) return;
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [dmDrawerOpen, selectedPeer?.id, activeThreadMessages.length]);

  if (!dmDrawerOpen || !currentUser) return null;

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPeer || !messageInput.trim() || sending) return;
    setSending(true);
    const ok = await sendDirectMessage(selectedPeer.id, messageInput);
    setSending(false);
    if (ok) setMessageInput('');
  };

  return (
    <div
      className="fixed inset-0 z-[102] flex items-center justify-center bg-black/80 p-3 sm:p-6 backdrop-blur-md"
      onClick={closeDmDrawer}
    >
      <div
        className="flex h-[82vh] max-h-[680px] w-full max-w-4xl overflow-hidden rounded-3xl border border-white/10 bg-[#131318] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Left Sidebar: Friends & Conversations */}
        <aside className="flex w-64 sm:w-72 shrink-0 flex-col border-r border-white/[0.08] bg-[#101015]">
          <div className="flex items-center justify-between border-b border-white/[0.08] px-4 py-3.5">
            <div className="flex items-center gap-2">
              <MessageCircle className="h-4 w-4 text-[#FF2E54]" />
              <span className="text-sm font-bold text-white">Direkt Mesajlar</span>
            </div>
            <span className="font-mono-num text-[11px] text-zinc-400">
              {friendsIds.length} Arkadaş
            </span>
          </div>

          <div className="p-3 border-b border-white/[0.06]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500" />
              <input
                type="text"
                value={filterQuery}
                onChange={(e) => setFilterQuery(e.target.value)}
                placeholder="Üye veya arkadaş ara..."
                className="h-9 w-full rounded-xl border border-white/10 bg-[#181820] pl-8.5 pr-3 text-xs text-white placeholder:text-zinc-500 focus:border-[#FF2E54] focus:outline-none"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {sortedPeers.length === 0 ? (
              <div className="px-3 py-8 text-center text-xs text-zinc-500">
                Henüz mesajlaşabileceğin başka kayıtlı üye yok.
              </div>
            ) : (
              sortedPeers.map(({ user, lastMsg, unread, isFriend }) => {
                const isActive = selectedPeer?.id === user.id;
                const accent = ACCENT_THEMES[user.accentColor];
                return (
                  <button
                    key={user.id}
                    type="button"
                    onClick={() => openDmWith(user.id)}
                    className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors cursor-pointer ${
                      isActive
                        ? 'bg-[#FF2E54]/15 border border-[#FF2E54]/35'
                        : 'border border-transparent hover:bg-white/[0.05]'
                    }`}
                  >
                    <img
                      src={user.avatarUrl}
                      alt={user.displayName}
                      referrerPolicy="no-referrer"
                      className="h-10 w-10 rounded-full object-cover shrink-0"
                      style={{ boxShadow: `0 0 0 2px ${accent.hex}` }}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <p className="truncate text-xs font-semibold text-white">
                          {user.displayName}
                        </p>
                        {unread > 0 && (
                          <span className="font-mono-num rounded-full bg-[#FF2E54] px-1.5 py-0.5 text-[10px] font-bold text-white">
                            {unread}
                          </span>
                        )}
                      </div>
                      <p className="truncate text-[11px] text-zinc-400">
                        {lastMsg
                          ? lastMsg.text
                          : isFriend
                            ? 'Arkadaşın · Sohbet başlat'
                            : user.handle}
                      </p>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </aside>

        {/* Right Pane: Active Chat */}
        <section className="flex flex-1 flex-col bg-[#131318]">
          {selectedPeer ? (
            <>
              <div className="flex items-center justify-between border-b border-white/[0.08] px-5 py-3.5">
                <button
                  type="button"
                  onClick={() => {
                    closeDmDrawer();
                    openProfileModal(selectedPeer);
                  }}
                  className="flex items-center gap-3 text-left hover:opacity-90 cursor-pointer"
                >
                  <img
                    src={selectedPeer.avatarUrl}
                    alt={selectedPeer.displayName}
                    referrerPolicy="no-referrer"
                    className="h-9 w-9 rounded-full object-cover"
                    style={{ boxShadow: `0 0 0 2px ${ACCENT_THEMES[selectedPeer.accentColor].hex}` }}
                  />
                  <div>
                    <p className="text-sm font-bold text-white">{selectedPeer.displayName}</p>
                    <p className="text-[11px] text-zinc-400">{selectedPeer.handle}</p>
                  </div>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => toggleFriend(selectedPeer.id)}
                    className={`inline-flex h-8 items-center gap-1.5 rounded-full px-3.5 text-xs font-semibold whitespace-nowrap cursor-pointer ${
                      friendsIds.includes(selectedPeer.id)
                        ? 'border border-emerald-500/40 bg-emerald-500/15 text-emerald-300'
                        : 'border border-white/15 bg-white/[0.06] text-white hover:bg-white/15'
                    }`}
                  >
                    {friendsIds.includes(selectedPeer.id) ? (
                      <>
                        <UserCheck className="h-3.5 w-3.5" /> Arkadaşın
                      </>
                    ) : (
                      <>
                        <UserPlus className="h-3.5 w-3.5" /> Arkadaş Ekle
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={closeDmDrawer}
                    aria-label="Sohbeti kapat"
                    className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/[0.05] text-zinc-400 hover:text-white cursor-pointer"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
                {activeThreadMessages.length === 0 ? (
                  <div className="flex h-full flex-col items-center justify-center text-center">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-[#191922] text-zinc-400">
                      <MessageCircle className="h-5 w-5" />
                    </div>
                    <p className="mt-3 text-sm font-semibold text-white">
                      {selectedPeer.displayName} ile sohbet başlat
                    </p>
                    <p className="mt-1 max-w-xs text-xs text-zinc-400">
                      Ortak sevdiğiniz animeler hakkında konuşmak için ilk mesajını gönder.
                    </p>
                  </div>
                ) : (
                  activeThreadMessages.map((msg) => {
                    const isMine = msg.senderId === currentUser.id;
                    return (
                      <div
                        key={msg.id}
                        className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-xs sm:text-sm ${
                            isMine
                              ? 'bg-[#FF2E54] text-white rounded-br-sm'
                              : 'border border-white/10 bg-[#1B1B24] text-zinc-100 rounded-bl-sm'
                          }`}
                        >
                          <p className="leading-relaxed break-words">{msg.text}</p>
                          <p
                            className={`mt-1 text-[10px] font-mono-num ${
                              isMine ? 'text-white/75 text-right' : 'text-zinc-500'
                            }`}
                          >
                            {formatMessageTime(msg.createdAt)}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              <form
                onSubmit={handleSend}
                className="flex items-center gap-2.5 border-t border-white/[0.08] bg-[#16161D] px-4 py-3"
              >
                <input
                  type="text"
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  placeholder={`${selectedPeer.displayName} kişisine mesaj yaz...`}
                  className="h-10 flex-1 rounded-full border border-white/10 bg-[#1E1E27] px-4 text-xs sm:text-sm text-white placeholder:text-zinc-500 focus:border-[#FF2E54] focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={!messageInput.trim() || sending}
                  className="inline-flex h-10 items-center gap-1.5 rounded-full bg-[#FF2E54] px-5 text-xs font-semibold text-white hover:brightness-110 disabled:opacity-40 cursor-pointer"
                >
                  <Send className="h-3.5 w-3.5" />
                  Gönder
                </button>
              </form>
            </>
          ) : (
            <div className="relative flex flex-1 flex-col items-center justify-center p-6 text-center">
              <button
                type="button"
                onClick={closeDmDrawer}
                aria-label="Kapat"
                className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/[0.05] text-zinc-400 hover:text-white cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
              <Users className="h-8 w-8 text-zinc-500" />
              <p className="mt-3 text-sm font-semibold text-white">Henüz başka üye yok</p>
              <p className="mt-1 max-w-xs text-xs text-zinc-400">
                Yeni üyeler kayıt olduğunda burada arkadaş ekleyip DM başlatabilirsin.
              </p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};
