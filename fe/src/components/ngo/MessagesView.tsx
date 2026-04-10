import { useState, useEffect, useRef } from 'react';
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
import { getRoomName, getConversationPartnerFromRoom } from '../../lib/chat';

// Module-level flag to avoid repeatedly fetching the inbox during a single page session
let _inboxFetchedThisSession = false;

// Module-level cache for room fetch tracking to persist across component re-renders
const _roomFetchCache = new Map<string, number>();
const _ROOM_FETCH_COOLDOWN_MS = 30000; // 30 seconds - prevent redundant fetches

interface MessagesViewProps {
  messages: Message[];
  addMessage: (message: Message) => void;
  viewerType?: 'ngo' | 'hotel';
}

export function MessagesView({ messages, addMessage, viewerType = 'ngo' }: MessagesViewProps) {
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  // persist selected conversation across remounts to avoid brief close on parent refresh
  const STORAGE_KEY = 'messages:selectedConversation';
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [localMessages, setLocalMessages] = useState<Message[]>(messages ?? []);
  const socketRef = useRef<Socket | null>(null);
  const user = getCurrentUser();
  const joinedRoomsRef = useRef<Set<string>>(new Set());
  const pinnedSelectedRef = useRef<{id: string | null, ts: number}>({ id: null, ts: 0 });
  const threadEndRef = useRef<HTMLDivElement | null>(null);
  const [newMessagePartners, setNewMessagePartners] = useState<Set<string>>(new Set());
  const newMessageTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const selectedConversationRef = useRef<string | null>(null);
  const sendLockRef = useRef<number>(0);
  const seenFingerprintsRef = useRef<Set<string>>(new Set());

  const getMessageFingerprint = (m: Message) => {
    const ts = new Date(m.timestamp).getTime();
    const tsRounded = Math.floor(ts / 1000) * 1000;
    return `${m.from}|${m.to}|${m.message}|${tsRounded}`;
  };

  const isDuplicate = (a: Message, b: Message) => {
    if (a.id && b.id && a.id === b.id) return true;
    return getMessageFingerprint(a) === getMessageFingerprint(b);
  };

  const addUnique = (prev: Message[], m: Message) => {
    const fingerprint = getMessageFingerprint(m);
    
    if (seenFingerprintsRef.current.has(fingerprint)) {
      console.debug('Skipping duplicate message (already seen):', fingerprint);
      return prev;
    }
    
    if (prev.some(pm => isDuplicate(pm, m))) {
      seenFingerprintsRef.current.add(fingerprint);
      return prev;
    }
    
    seenFingerprintsRef.current.add(fingerprint);
    const updated = [...prev, m].sort((x, y) => new Date(x.timestamp).getTime() - new Date(y.timestamp).getTime());
    return updated;
  };



  // centralized selector that also persists selection to sessionStorage
  function selectConversation(partner: string | null) {
    try {
      selectedConversationRef.current = partner;
      setSelectedConversation(partner);
      // Clear new message notification for this partner
      if (partner) {
        setNewMessagePartners(prev => {
          const updated = new Set(prev);
          updated.delete(partner);
          return updated;
        });
      }
      if (partner) sessionStorage.setItem(STORAGE_KEY, partner);
      else sessionStorage.removeItem(STORAGE_KEY);
    } catch (e) {
      /* ignore */
    }
  }



  useEffect(() => {
    console.debug('MessagesView mounted');
    setLocalMessages(messages ?? []);
    (messages ?? []).forEach(m => {
      seenFingerprintsRef.current.add(getMessageFingerprint(m));
    });
    
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      if (saved) {
        console.debug('Restoring selectedConversation from sessionStorage', saved);
        selectConversation(saved);
        pinnedSelectedRef.current = { id: saved, ts: Date.now() };
      }
    } catch (e) {}
    return () => { console.debug('MessagesView unmounted'); };
  }, []);

  const conversations = localMessages.reduce((acc: any, msg) => {
    const meName = user?.username ?? 'Me';
    
    let partner: string;
    if (msg.from === meName) {
      partner = msg.to;
    } else if (msg.to === meName) {
      partner = msg.from;
    } else {
      return acc;
    }
    
    const pname = String(partner || '').trim();
    if (!pname || pname.toLowerCase() === 'unknown') return acc;
    
    if (!acc[pname]) acc[pname] = [];
    acc[pname].push(msg);
    return acc;
  }, {});

  // Ensure each conversation's messages are sorted by timestamp ascending (oldest first)
  Object.keys(conversations).forEach(k => {
    conversations[k].sort((a: Message, b: Message) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  });

  const filteredConversations = Object.keys(conversations).filter(partner =>
    partner.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const orderedFilteredConversations = [...filteredConversations].sort((a, b) => {
    const aLast = conversations[a][conversations[a].length - 1];
    const bLast = conversations[b][conversations[b].length - 1];
    const at = new Date(aLast.timestamp).getTime();
    const bt = new Date(bLast.timestamp).getTime();
    return bt - at;
  });

  useEffect(() => {
      const socket = getSocket();
      socketRef.current = socket;

      const handleConnect = () => {
        console.log('Socket connected event in component:', socket.id);
      };

      const handleMessage = (payload: any) => {
        console.debug('Socket message received:', payload);
        const myUsername = user?.username ?? 'Me';
        const senderName = payload.sender_name ?? 'Unknown';
        const receiverName = payload.receiver_name ?? 'Unknown';
        
        let conversationPartner: string;
        if (senderName === myUsername) {
          conversationPartner = receiverName;
        } else if (receiverName === myUsername) {
          conversationPartner = senderName;
        } else {
          console.debug('Ignoring message not involving current user:', payload);
          return;
        }
        
        if (conversationPartner.toLowerCase() === 'unknown') {
          console.debug('Ignoring message with unknown partner', payload);
          return;
        }
        
        const m: Message = {
          id: payload.id?.toString() ?? Date.now().toString(),
          from: senderName,
          to: receiverName,
          message: payload.content,
          timestamp: payload.timestamp ?? new Date().toISOString(),
          read: senderName === myUsername,
        };
        
        setLocalMessages(prev => addUnique(prev, m));
        
        const isIncomingMessage = receiverName === myUsername;
        
        if (isIncomingMessage && conversationPartner !== selectedConversationRef.current) {
          setNewMessagePartners(prev => new Set([...prev, conversationPartner]));
          
          if (newMessageTimeoutRef.current) clearTimeout(newMessageTimeoutRef.current);
          
          newMessageTimeoutRef.current = setTimeout(() => {
            setNewMessagePartners(prev => {
              const updated = new Set(prev);
              updated.delete(conversationPartner);
              return updated;
            });
          }, 4000);
        }
        
        if (!selectedConversationRef.current && isIncomingMessage) {
          selectConversation(conversationPartner);
        }
      };

      socket.on('connect', handleConnect);
      socket.on('message', handleMessage);
      socket.on('system', (d: any) => console.log('Socket system event:', d));
      socket.on('disconnect', () => console.log('Socket disconnected'));

      return () => {
        try { 
          socket.off('connect', handleConnect);
          socket.off('message', handleMessage);
          socket.off('system');
        } catch {}
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.username]);

  // On mount, fetch inbox (latest message per room) so conversation list populates
  useEffect(() => {
    if (_inboxFetchedThisSession) {
      console.debug('Skipping inbox fetch: already fetched this session');
      return;
    }
    _inboxFetchedThisSession = true;
    
    const fetchInbox = async () => {
      try {
        console.debug('Fetching inbox summary (initial load)');
        const headers = { 'Content-Type': 'application/json', ...(authHeader() as any) };
        const res = await fetch(`${API_BASE}/api/messages/`, { headers });
        if (res.ok) {
          const data = await res.json();
          const myUsername = user?.username ?? 'Me';
          const mapped: Message[] = Array.isArray(data) ? data.map((d: any) => {
            const senderName = d.sender_name ?? 'Unknown';
            const receiverName = d.receiver_name ?? 'Unknown';
            
            let conversationPartner: string;
            if (senderName === myUsername) {
              conversationPartner = receiverName;
            } else if (receiverName === myUsername) {
              conversationPartner = senderName;
            } else {
              conversationPartner = senderName === 'Unknown' ? receiverName : senderName;
            }
            
            return {
              id: d.id?.toString() ?? Date.now().toString(),
              from: senderName,
              to: receiverName,
              message: d.content,
              timestamp: d.timestamp ?? new Date().toISOString(),
              read: senderName === myUsername,
            };
          }) : [];
          // merge into localMessages (avoid duplicates)
          setLocalMessages(prev => {
            let updated = prev;
            let added = 0;
            mapped.forEach(m => {
              const fp = getMessageFingerprint(m);
              if (!seenFingerprintsRef.current.has(fp)) {
                updated = addUnique(updated, m);
                added++;
              }
            });
            if (added > 0) {
              console.debug(`Inbox: added ${added} new messages`);
            }
            return updated;
          });
        } else {
          console.warn('Failed to load inbox summary', await res.text());
        }
      } catch (e) {
        console.warn('Inbox fetch error', e);
      }
    };
    
    fetchInbox();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-join active room if socket reconnects or connects after selection
  useEffect(() => {
    if (!socketRef.current) return;
    const socket = socketRef.current;
    const onConnect = () => {
      if (!socket.connected) return;
      // Re-join any rooms we've joined this session
      try {
        joinedRoomsRef.current.forEach(r => {
          console.debug('re-joining tracked room after connect', r);
          socket.emit('join', { room: r });
        });
      } catch (e) {
        console.debug('rejoin error', e);
      }
    };
    socket.on('connect', onConnect);
    return () => { try { socket.off('connect', onConnect); } catch {} };
  }, [selectedConversation, user?.username]);

  // Log selection changes
  useEffect(() => {
    console.debug('MessagesView selectedConversation changed ->', selectedConversation);
  }, [selectedConversation]);

  // Keep selection pinned briefly to avoid accidental clearing by parent updates
  useEffect(() => {
    selectedConversationRef.current = selectedConversation;
    if (!selectedConversation && pinnedSelectedRef.current.id) {
      const age = Date.now() - pinnedSelectedRef.current.ts;
      if (age < 2000) {
        console.debug('Restoring pinned selectedConversation', pinnedSelectedRef.current.id);
        selectConversation(pinnedSelectedRef.current.id);
      } else {
        pinnedSelectedRef.current = { id: null, ts: 0 };
      }
    }
  }, [selectedConversation]);

  // Ensure the chat window remains open during parent updates
  useEffect(() => {
    if (selectedConversation) {
      pinnedSelectedRef.current = { id: selectedConversation, ts: Date.now() };
    }
  }, [selectedConversation]);

  // Listen for local dispatched messages (fallback when server ack/broadcast fails)
  useEffect(() => {
    const handler = (e: any) => {
      try {
        const payload = e?.detail;
        if (!payload) return;

        let m: Message;
        const myUsername = user?.username ?? 'Me';
        
        if (payload.message && payload.from && payload.to) {
          m = {
            id: payload.id ?? Date.now().toString(),
            from: payload.from,
            to: payload.to,
            message: payload.message,
            timestamp: payload.timestamp ?? new Date().toISOString(),
            read: payload.from === myUsername,
          };
        } else if (payload.sender_name && payload.receiver_name) {
          m = {
            id: payload.id ?? Date.now().toString(),
            from: payload.sender_name,
            to: payload.receiver_name,
            message: payload.content,
            timestamp: payload.timestamp ?? new Date().toISOString(),
            read: payload.sender_name === myUsername,
          };
        } else {
          console.debug('Unrecognized message payload format', payload);
          return;
        }

        setLocalMessages(prev => addUnique(prev, m));
        
        if (!selectedConversation && m.from === myUsername) {
          selectConversation(m.to);
          pinnedSelectedRef.current = { id: m.to, ts: Date.now() };
        }
      } catch (err) {
        console.debug('local_chat_message handler error', err);
      }
    };
    window.addEventListener('local_chat_message', handler as EventListener);
    return () => { window.removeEventListener('local_chat_message', handler as EventListener); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedConversation, user?.username]);

  // Function to fetch room history with optional cooldown bypass
  const fetchRoomHistory = async (room: string, bypassCooldown = false) => {
    // Add cooldown mechanism for fetching room history (module-level cache)
    const now = Date.now();
    const lastFetched = _roomFetchCache.get(room) || 0;
    const timeSinceLastFetch = now - lastFetched;

    if (!bypassCooldown && timeSinceLastFetch < _ROOM_FETCH_COOLDOWN_MS) {
      console.debug(`Skipping fetch for room ${room}, cooldown active (${Math.round(((_ROOM_FETCH_COOLDOWN_MS - timeSinceLastFetch) / 1000))}s remaining)`);
      return;
    }

    _roomFetchCache.set(room, now);
    console.debug(`Fetching room ${room} - last fetched ${Math.round(timeSinceLastFetch / 1000)}s ago`);

    try {
      console.debug('Fetching history for room', room);
      const headers = { 'Content-Type': 'application/json', ...(authHeader() as any) };
      const res = await fetch(`${API_BASE}/api/messages/?room=${encodeURIComponent(room)}`, { headers });
      if (res.ok) {
        const data = await res.json();
        const myUsername = user?.username ?? 'Me';
        const mapped: Message[] = data.map((d: any) => {
          const senderName = d.sender_name ?? 'Unknown';
          const receiverName = d.receiver_name ?? 'Unknown';

          return {
            id: d.id?.toString() ?? Date.now().toString(),
            from: senderName,
            to: receiverName,
            message: d.content,
            timestamp: d.timestamp,
            read: senderName === myUsername,
          };
        });
        setLocalMessages(prev => {
          let updated = prev;
          let added = 0;
          mapped.forEach(m => {
            const fp = getMessageFingerprint(m);
            if (!seenFingerprintsRef.current.has(fp)) {
              updated = addUnique(updated, m);
              added++;
            }
          });
          if (added > 0) {
            console.debug(`Room history: added ${added} new messages`);
          }
          return updated;
        });
      } else {
        console.warn('Failed to load history', await res.text());
      }
    } catch (e) {
      console.warn('Failed to load history', e);
    }
  };

  // When selecting a conversation, join room and fetch history
  useEffect(() => {
        if (!selectedConversation) return;
        const room = getRoomName(user?.username ?? 'Me', selectedConversation);

        // join room on socket (emit join only once per session)
        if (socketRef.current && socketRef.current.connected) {
            if (!joinedRoomsRef.current.has(room)) {
                console.debug('Joining room (first time this session)', room);
                socketRef.current.emit('join', { room });
                joinedRoomsRef.current.add(room);
            } else {
                console.debug('Already joined room this session, skipping join emit:', room);
            }
        }

        fetchRoomHistory(room);

        // mark messages in this conversation as read locally
        setLocalMessages(prev => prev.map(m => {
            const partner = m.from === (user?.username ?? 'Me') ? m.to : m.from;
            if (partner === selectedConversation && m.to === (user?.username ?? 'Me')) {
                return { ...m, read: true };
            }
            return m;
        }));

        // scroll thread to bottom after messages load
        setTimeout(() => {
            try { threadEndRef.current?.scrollIntoView({ behavior: 'smooth' }); } catch (e) {}
        }, 50);

        return () => {
            if (socketRef.current && socketRef.current.connected) {
                socketRef.current.emit('leave', { room });
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedConversation]);

  const handleSendMessage = async () => {
    console.debug('handleSendMessage called; selectedConversation=', selectedConversation, 'newMessageLen=', newMessage.length);
    if (!selectedConversation || !newMessage.trim()) {
      toast.error('Please enter a message');
      return;
    }
    const now = Date.now();
    if (now - sendLockRef.current < 700) {
      console.debug('Send locked to prevent rapid duplicate submissions');
      return;
    }
    sendLockRef.current = now;

    let room = getRoomName(user?.username ?? 'Me', selectedConversation);
    const socket = socketRef.current || getSocket();

    if (socket && socket.connected) {
      try {
        // Fetch receiver's ID
        let receiverId: number | undefined = undefined;
        let receiverName = selectedConversation;
        try {
          const headers = authHeader() as Record<string, string>;
          const response = await fetch(`${API_BASE}/api/users/${selectedConversation}/`, {
            headers,
          });
          if (response.ok) {
            const data = await response.json();
            receiverId = data.user?.id;
            receiverName = data.user?.username ?? selectedConversation;
          }
        } catch (err) {
          console.warn('Failed to fetch receiver ID:', err);
        }

        // Normalize room to use actual usernames so both sides join the same room
        if (receiverName) {
          room = getRoomName(user?.username ?? 'Me', receiverName);
        }

        const tempId = Date.now().toString();
        const payload = {
          room,
          sender_id: user?.id,
          sender_name: user?.username ?? 'Me',
          receiver_id: receiverId,
          receiver_name: receiverName,
          content: newMessage.trim(),
        };
        
        console.debug('Sending message via WebSocket:', { room, sender: user?.username, receiver: receiverName, content: newMessage.trim(), socketConnected: socket.connected });
        
        // optimistic add
        const m: Message = {
          id: tempId,
          from: user?.username ?? 'Me',
          to: receiverName ?? selectedConversation,
          message: newMessage,
          timestamp: new Date().toISOString(),
          read: true,
        };
        console.debug('Optimistically adding message', m.id, 'to', selectedConversation);
        setLocalMessages(prev => addUnique(prev, m));
        try { addMessage(m); } catch (e) {}

        // send with ack callback so we can replace optimistic id with server id
        socket.emit('send_message', payload, (ack: any) => {
          console.debug('send_message ack received:', ack);
          if (ack && ack.ok) {
            const serverId = ack.id?.toString() ?? null;
            const serverTimestamp = ack.timestamp ?? null;
            console.debug('Message saved on server:', { serverId, serverTimestamp });
            setLocalMessages(prev => {
              // If server already broadcasted this message (we already have serverId), remove the optimistic temp entry
              if (serverId && prev.some(x => x.id === serverId)) {
                console.debug('Server id already present, removing optimistic id', tempId, 'serverId=', serverId);
                return prev.filter(x => x.id !== tempId);
              }
              return prev.map(x => x.id === tempId ? ({ ...x, id: serverId ?? x.id, timestamp: serverTimestamp ?? x.timestamp }) : x);
            });
            toast.success('Message sent!');

            // Refresh room history to ensure all messages are loaded without requiring page refresh
            fetchRoomHistory(room, true);
          } else {
            console.warn('send_message ack negative', ack);
            toast.error('Message delivery failed');
            // Remove optimistic message on failure
            setLocalMessages(prev => prev.filter(x => x.id !== tempId));
          }
        });

        setNewMessage('');
      } catch (err) {
        console.error('Error in handleSendMessage:', err);
        toast.error('Failed to send message');
      }
    } else {
      console.warn('WebSocket not connected. Socket:', { connected: socket?.connected, exists: !!socket });
      toast.error('Not connected. Please wait for connection.');
    }
  };

  const unreadCount = (partner: string) => {
    return conversations[partner]?.filter((m: Message) => !m.read && m.to === (user?.username ?? 'Me')).length || 0;
  };

  return (
    <div className="p-4 sm:p-4 sm:p-6 lg:p-8 lg:p-8">
      <div className="mb-6">
        <h1>Messages</h1>
        <p className="text-muted-foreground">Communicate with hotels about donations</p>
      </div>

      <div className="grid md:grid-cols-3 gap-6 h-[calc(100vh-200px)]">
        {/* Conversations List */}
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle>Conversations</CardTitle>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search conversations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardHeader>
          <ScrollArea className="h-[calc(100%-120px)]">
            <CardContent className="space-y-2">
              {orderedFilteredConversations.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-8">No conversations yet</p>
              ) : (
                // Ensure unique keys for filteredConversations
                orderedFilteredConversations.map((partner: string, index: number) => {
                  const unread = unreadCount(partner);
                  const lastMessage = conversations[partner][conversations[partner].length - 1];
                  
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
                          <p className="text-sm text-gray-600 truncate">
                            {lastMessage.message}
                          </p>
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

        {/* Message Thread */}
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
                    <CardDescription className="text-sm">{viewerType === 'hotel' ? 'NGO Partner' : 'Hotel Partner'}</CardDescription>
                  </div>
                </div>
              </CardHeader>

              <ScrollArea className="flex-1 p-6">
                <div className="space-y-4">
                  {conversations[selectedConversation]?.map((msg: Message, index: number) => {
                    const isMe = msg.from === (user?.username ?? 'Me');
                    const senderLabel = viewerType === 'hotel'
                      ? (isMe ? 'You (Hotel)' : `${msg.from} (NGO)`) 
                      : (isMe ? 'You (NGO)' : `${msg.from} (Hotel)`);
                    return (
                      <div key={msg.id || `${msg.timestamp}-${index}`} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
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
                    <div ref={(el) => { threadEndRef.current = el ?? null; }} />
                </div>
              </ScrollArea>

              <CardContent className="border-t p-4">
                <div className="flex gap-2">
                  <Textarea
                    placeholder="Type your message..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    rows={2}
                    className="resize-none"
                  />
                  <Button 
                    onClick={handleSendMessage}
                    className="bg-teal-600 hover:bg-teal-700"
                  >
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
