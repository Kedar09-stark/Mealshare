import { useState, useEffect, useRef, useCallback } from 'react';
import { Send, Search, Bell } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { ScrollArea } from '../ui/scroll-area';
import { Badge } from '../ui/badge';
import { toast } from 'sonner';
import type { Socket } from 'socket.io-client';
import { Message } from '../../App';
import { API_BASE, getCurrentUser, authHeader } from '../../lib/auth';
import { getSocket } from '../../lib/socket';
import { getRoomName } from '../../lib/chat';

// ─── Module-level cooldown cache (survives re-renders) ────────────────────────
const _roomFetchCache = new Map<string, number>();
const ROOM_FETCH_COOLDOWN_MS = 30_000;

// ─── Helpers ──────────────────────────────────────────────────────────────────

// Canonical fingerprint: always sort from/to so A→B and B→A produce same key for content match.
// We include BOTH directions so the same message content isn't double-counted regardless
// of which side of the conversation is looking at it.
function getFingerprint(m: Message): string {
  const ts    = Math.floor(new Date(m.timestamp).getTime() / 1000) * 1000;
  const [u1, u2] = [m.from, m.to].sort();
  return `${u1}|${u2}|${m.message}|${ts}`;
}

function sortByTime(msgs: Message[]): Message[] {
  return [...msgs].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
}

// Merge a single incoming message into prev, deduplicating by ID then fingerprint.
// Never registers a temp-id message's fingerprint as "seen" — that's done only when
// the server confirms, so the confirmed copy can always replace the optimistic one.
function mergeMessage(prev: Message[], incoming: Message, seen: Set<string>): Message[] {
  // 1. Exact ID match → skip (already have it)
  if (incoming.id && !incoming.id.startsWith('temp-') && prev.some(x => x.id === incoming.id)) {
    return prev;
  }

  // 2. Fingerprint dedup — but only for confirmed (non-temp) messages
  if (!incoming.id?.startsWith('temp-')) {
    const fp = getFingerprint(incoming);
    if (seen.has(fp)) return prev;
    seen.add(fp);
  }

  return sortByTime([...prev, incoming]);
}

// Merge a batch of server messages into prev (used for inbox / room history loads)
function mergeMany(prev: Message[], incoming: Message[], seen: Set<string>): Message[] {
  let result = prev;
  for (const m of incoming) {
    result = mergeMessage(result, m, seen);
  }
  return result;
}

function mapServerMessage(d: any, myUsername: string): Message {
  return {
    id: d.id?.toString() ?? `srv-${Date.now()}`,
    from: d.sender_name ?? 'Unknown',
    to: d.receiver_name ?? 'Unknown',
    message: d.content,
    timestamp: d.timestamp ?? new Date().toISOString(),
    read: (d.sender_name ?? '') === myUsername,
  };
}

// ─── Component ────────────────────────────────────────────────────────────────
interface MessagesViewProps {
  messages: Message[];
  addMessage: (message: Message) => void;
  viewerType?: 'ngo' | 'hotel';
}

const STORAGE_KEY = 'messages:selectedConversation';

export function MessagesView({ messages, addMessage, viewerType = 'ngo' }: MessagesViewProps) {
  const user = getCurrentUser();
  const myUsername = user?.username ?? 'Me';

  // ── State ──────────────────────────────────────────────────────────────────
  const [selectedConversation, setSelectedConversation] = useState<string | null>(() => {
    try { return sessionStorage.getItem(STORAGE_KEY); } catch { return null; }
  });
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [localMessages, setLocalMessages] = useState<Message[]>(() => messages ?? []);
  const [newMessagePartners, setNewMessagePartners] = useState<Set<string>>(new Set());

  // ── Refs (never cause re-renders) ─────────────────────────────────────────
  const socketRef        = useRef<Socket | null>(null);
  const selectedRef      = useRef<string | null>(selectedConversation);   // shadow of state for closures
  const currentRoomRef   = useRef<string | null>(null);                   // single source of truth for joined room
  const seenFPRef        = useRef<Set<string>>(new Set());
  const joinedRoomsRef   = useRef<Set<string>>(new Set());
  const sendLockRef      = useRef<number>(0);
  const threadEndRef     = useRef<HTMLDivElement | null>(null);
  const notifTimerRef    = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inboxFetchedRef  = useRef(false);

  // Keep selectedRef in sync
  useEffect(() => { selectedRef.current = selectedConversation; }, [selectedConversation]);

  // ── Select conversation (stable) ──────────────────────────────────────────
  const selectConversation = useCallback((partner: string | null) => {
    selectedRef.current = partner;
    setSelectedConversation(partner);
    if (partner) {
      try { sessionStorage.setItem(STORAGE_KEY, partner); } catch {}
      setNewMessagePartners(prev => { const s = new Set(prev); s.delete(partner); return s; });
    } else {
      try { sessionStorage.removeItem(STORAGE_KEY); } catch {}
    }
  }, []);

  // ── Seed seen fingerprints from initial messages prop ────────────────────
  useEffect(() => {
    (messages ?? []).forEach(m => seenFPRef.current.add(getFingerprint(m)));
    setLocalMessages(messages ?? []);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Socket: attach ONCE ───────────────────────────────────────────────────
  useEffect(() => {
    const socket = getSocket();
    socketRef.current = socket;

    // ── Re-join tracked rooms on reconnect ───────────────────────────────
    const onConnect = () => {
      joinedRoomsRef.current.forEach(room => {
        console.debug('[socket] re-joining room after connect:', room);
        socket.emit('join', { room });
      });
    };

    // ── Incoming message ─────────────────────────────────────────────────
    const onMessage = (payload: any) => {
      const senderName   = payload.sender_name   ?? 'Unknown';
      const receiverName = payload.receiver_name ?? 'Unknown';

      // Only handle messages involving this user
      if (senderName !== myUsername && receiverName !== myUsername) return;
      if (senderName === 'Unknown' || receiverName === 'Unknown') return;

      const serverId = payload.id?.toString();
      const partner  = senderName === myUsername ? receiverName : senderName;

      setLocalMessages(prev => {
        // Find a matching optimistic (temp) message to replace
        const tempIndex = prev.findIndex(x =>
          x.id?.startsWith('temp-') &&
          x.message === payload.content &&
          x.from    === senderName &&
          x.to      === receiverName
        );

        const serverMsg: Message = {
          id:        serverId ?? `sock-${Date.now()}`,
          from:      senderName,
          to:        receiverName,
          message:   payload.content,
          timestamp: payload.timestamp ?? new Date().toISOString(),
          read:      senderName === myUsername,
        };

        // If server ID already exists in list → just drop any lingering temp
        if (serverId && prev.some(x => x.id === serverId)) {
          if (tempIndex !== -1) {
            const next = [...prev];
            next.splice(tempIndex, 1);
            return sortByTime(next);
          }
          return prev;
        }

        // Replace optimistic with server-confirmed message
        if (tempIndex !== -1) {
          const next = [...prev];
          const oldTemp = next[tempIndex];
          // Remove old fingerprint so server version isn't blocked
          seenFPRef.current.delete(getFingerprint(oldTemp));
          next[tempIndex] = serverMsg;
          const fp = getFingerprint(serverMsg);
          seenFPRef.current.add(fp);
          return sortByTime(next);
        }

        // Brand new message (not our own send) → merge normally
        return mergeMessage(prev, serverMsg, seenFPRef.current);
      });

      // Notify if incoming & not in view
      if (receiverName === myUsername && partner !== selectedRef.current) {
        setNewMessagePartners(prev => new Set([...prev, partner]));
        if (notifTimerRef.current) clearTimeout(notifTimerRef.current);
        notifTimerRef.current = setTimeout(() => {
          setNewMessagePartners(prev => { const s = new Set(prev); s.delete(partner); return s; });
        }, 4000);
      }

      // Auto-open if nothing is selected and message is incoming
      if (!selectedRef.current && receiverName === myUsername) {
        selectConversation(partner);
      }
    };

    socket.on('connect',    onConnect);
    socket.on('message',    onMessage);

    return () => {
      socket.off('connect',    onConnect);
      socket.off('message',    onMessage);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myUsername]); // only remount if user changes

  // ── Fetch inbox once on mount ─────────────────────────────────────────────
  useEffect(() => {
    if (inboxFetchedRef.current) return;
    inboxFetchedRef.current = true;

    (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/messages/`, {
          headers: { 'Content-Type': 'application/json', ...(authHeader() as any) },
        });
        if (!res.ok) return;
        const data: any[] = await res.json();
        const mapped = data.map((d: any) => mapServerMessage(d, myUsername));
        setLocalMessages(prev => mergeMany(prev, mapped, seenFPRef.current));
      } catch (e) {
        console.warn('[inbox] fetch error', e);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Join/leave room when conversation changes ─────────────────────────────
  useEffect(() => {
    const socket = socketRef.current;
    if (!socket) return;

    if (!selectedConversation) {
      // Leave current room if deselected
      if (currentRoomRef.current) {
        socket.emit('leave', { room: currentRoomRef.current });
        joinedRoomsRef.current.delete(currentRoomRef.current);
        currentRoomRef.current = null;
      }
      return;
    }

    const newRoom = getRoomName(myUsername, selectedConversation);

    // Leave previous room if different
    if (currentRoomRef.current && currentRoomRef.current !== newRoom) {
      console.debug('[room] leaving', currentRoomRef.current);
      socket.emit('leave', { room: currentRoomRef.current });
      joinedRoomsRef.current.delete(currentRoomRef.current);
    }

    // Join new room (once)
    if (!joinedRoomsRef.current.has(newRoom)) {
      console.debug('[room] joining', newRoom);
      socket.emit('join', { room: newRoom });
      joinedRoomsRef.current.add(newRoom);
    }

    currentRoomRef.current = newRoom;

    // Fetch history with cooldown
    const now = Date.now();
    const last = _roomFetchCache.get(newRoom);
    if (!last || now - last > ROOM_FETCH_COOLDOWN_MS) {
      _roomFetchCache.set(newRoom, now);
      (async () => {
        try {
          const res = await fetch(
            `${API_BASE}/api/messages/?room=${encodeURIComponent(newRoom)}`,
            { headers: { 'Content-Type': 'application/json', ...(authHeader() as any) } }
          );
          if (!res.ok) return;
          const data: any[] = await res.json();
          const mapped = data.map((d: any) => mapServerMessage(d, myUsername));
          // mergeMany handles dedup; using functional updater avoids stale closure
          setLocalMessages(prev => mergeMany(prev, mapped, seenFPRef.current));
        } catch (e) {
          console.warn('[history] fetch error', e);
        }
      })();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedConversation, myUsername]);

  // ── Auto-scroll to bottom on new messages ─────────────────────────────────
  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [localMessages, selectedConversation]);

  // ── Derived: conversations map ────────────────────────────────────────────
  const conversations = localMessages.reduce<Record<string, Message[]>>((acc, msg) => {
    let partner: string;
    if (msg.from === myUsername) {
      partner = msg.to;
    } else if (msg.to === myUsername) {
      partner = msg.from;
    } else {
      return acc;
    }
    const p = String(partner ?? '').trim();
    if (!p || p.toLowerCase() === 'unknown') return acc;
    (acc[p] ??= []).push(msg);
    return acc;
  }, {});

  Object.values(conversations).forEach(msgs =>
    msgs.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
  );

  const filteredPartners = Object.keys(conversations)
    .filter(p => p.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => {
      const aLast = conversations[a].at(-1)!;
      const bLast = conversations[b].at(-1)!;
      return new Date(bLast.timestamp).getTime() - new Date(aLast.timestamp).getTime();
    });

  const unreadCount = (partner: string) =>
    conversations[partner]?.filter(m => !m.read && m.to === myUsername).length ?? 0;

  // ── Send message ──────────────────────────────────────────────────────────
  const handleSendMessage = async () => {
    if (!selectedConversation || !newMessage.trim()) {
      toast.error('Please enter a message');
      return;
    }
    const now = Date.now();
    if (now - sendLockRef.current < 700) return;
    sendLockRef.current = now;

    const socket = socketRef.current ?? getSocket();
    if (!socket?.connected) {
      toast.error('Not connected. Please wait for connection.');
      return;
    }

    // Resolve receiver
    let receiverId: number | undefined;
    let receiverName = selectedConversation;
    try {
      const res = await fetch(`${API_BASE}/api/users/${selectedConversation}/`, {
        headers: authHeader() as Record<string, string>,
      });
      if (res.ok) {
        const d = await res.json();
        receiverId   = d.user?.id;
        receiverName = d.user?.username ?? selectedConversation;
      }
    } catch {}

    const room   = getRoomName(myUsername, receiverName);
    const tempId = `temp-${Date.now()}-${Math.random()}`;
    const ts     = new Date().toISOString();

    const optimistic: Message = {
      id: tempId,
      from: myUsername,
      to: receiverName,
      message: newMessage.trim(),
      timestamp: ts,
      read: true,
    };

    seenFPRef.current.add(getFingerprint(optimistic));
    setLocalMessages(prev => mergeMessage(prev, optimistic, seenFPRef.current));
    try { addMessage(optimistic); } catch {}
    setNewMessage('');

    socket.emit(
      'send_message',
      {
        room,
        sender_id:     user?.id,
        sender_name:   myUsername,
        receiver_id:   receiverId,
        receiver_name: receiverName,
        content:       newMessage.trim(),
      },
      (ack: any) => {
        if (!ack?.ok) {
          toast.error('Message delivery failed');
          setLocalMessages(prev => prev.filter(x => x.id !== tempId));
          return;
        }

        const serverId  = ack.id?.toString() ?? null;
        const serverTs  = ack.timestamp ?? null;
        toast.success('Message sent!');

        if (!serverId) return; // keep optimistic as-is if no server ID

        setLocalMessages(prev => {
          // Server broadcast already arrived and replaced the temp → just ensure no dupe
          if (prev.some(x => x.id === serverId)) {
            return prev.filter(x => x.id !== tempId);
          }
          // Replace temp with server-confirmed version
          return sortByTime(prev.map(x => {
            if (x.id !== tempId) return x;
            const updated = { ...x, id: serverId, timestamp: serverTs ?? x.timestamp };
            seenFPRef.current.delete(getFingerprint(x));
            seenFPRef.current.add(getFingerprint(updated));
            return updated;
          }));
        });
      }
    );
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-6">
        <h1>Messages</h1>
        <p className="text-muted-foreground">Communicate with hotels about donations</p>
      </div>

      <div className="grid md:grid-cols-3 gap-6 h-[calc(100vh-200px)]">
        {/* ── Conversation list ── */}
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle>Conversations</CardTitle>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search conversations..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardHeader>
          <ScrollArea className="h-[calc(100%-120px)]">
            <CardContent className="space-y-2">
              {filteredPartners.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-8">No conversations yet</p>
              ) : (
                filteredPartners.map((partner, index) => {
                  const unread      = unreadCount(partner);
                  const lastMessage = conversations[partner].at(-1)!;
                  return (
                    <button
                      key={`${partner}-${index}`}
                      onClick={() => selectConversation(partner)}
                      className={`w-full p-3 rounded-lg text-left transition-colors ${
                        selectedConversation === partner
                          ? 'bg-teal-50 border-2 border-teal-500'
                          : 'hover:bg-gray-50 border-2 border-transparent'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <Avatar>
                          <AvatarFallback className="bg-teal-600 text-white">
                            {partner.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <p className="font-medium truncate">{partner}</p>
                              {newMessagePartners.has(partner) && (
                                <Bell className="h-4 w-4 text-red-500 flex-shrink-0 animate-bounce" />
                              )}
                            </div>
                            {unread > 0 && (
                              <Badge className="bg-orange-600 text-white">{unread}</Badge>
                            )}
                          </div>
                          <p className="text-sm text-gray-600 truncate">{lastMessage.message}</p>
                          <p className="text-xs text-gray-400 mt-1">
                            {new Date(lastMessage.timestamp).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </CardContent>
          </ScrollArea>
        </Card>

        {/* ── Message thread ── */}
        <Card className="md:col-span-2 flex flex-col">
          {selectedConversation ? (
            <>
              <CardHeader className="border-b">
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarFallback className="bg-teal-600 text-white">
                      {selectedConversation.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <CardTitle className="text-lg">{selectedConversation}</CardTitle>
                    <CardDescription>
                      {viewerType === 'hotel' ? 'NGO Partner' : 'Hotel Partner'}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>

              <ScrollArea className="flex-1 p-6">
                <div className="space-y-4">
                  {conversations[selectedConversation]?.map((msg, index) => {
                    const isMe        = msg.from === myUsername;
                    const senderLabel = viewerType === 'hotel'
                      ? (isMe ? 'You (Hotel)' : `${msg.from} (NGO)`)
                      : (isMe ? 'You (NGO)'   : `${msg.from} (Hotel)`);
                    return (
                      <div
                        key={msg.id ?? `${msg.timestamp}-${index}`}
                        className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                      >
                        <div className={`max-w-[70%] ${isMe ? 'order-2' : 'order-1'}`}>
                          <p className={`text-xs font-semibold mb-1 ${isMe ? 'text-right text-teal-600' : 'text-left text-orange-600'}`}>
                            {senderLabel}
                          </p>
                          <div className={`p-3 rounded-lg ${
                            isMe
                              ? 'bg-teal-600 text-white rounded-br-none'
                              : 'bg-orange-100 text-gray-900 rounded-bl-none'
                          }`}>
                            <p className="text-sm">{msg.message}</p>
                          </div>
                          <p className={`text-xs text-gray-500 mt-1 ${isMe ? 'text-right' : 'text-left'}`}>
                            {new Date(msg.timestamp).toLocaleTimeString()}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={el => { threadEndRef.current = el; }} />
                </div>
              </ScrollArea>

              <CardContent className="border-t p-4">
                <div className="flex gap-2">
                  <Textarea
                    placeholder="Type your message..."
                    value={newMessage}
                    onChange={e => setNewMessage(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    rows={2}
                    className="resize-none"
                  />
                  <Button onClick={handleSendMessage} className="bg-teal-600 hover:bg-teal-700">
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </>
          ) : (
            <CardContent className="flex items-center justify-center h-full text-center text-gray-500">
              <div>
                <p className="mb-2">Select a conversation to view messages</p>
                <p className="text-sm">Or start a new conversation from a donation listing</p>
              </div>
            </CardContent>
          )}
        </Card>
      </div>
    </div>
  );
}