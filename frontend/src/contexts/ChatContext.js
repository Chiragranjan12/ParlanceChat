import { createContext, useContext, useState, useEffect, useRef, useCallback } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import { useAuth, API } from "@/contexts/AuthContext";

const WS_BASE = process.env.REACT_APP_BACKEND_URL
  .replace("https://", "wss://")
  .replace("http://", "ws://");

const ChatContext = createContext(null);

export function ChatProvider({ children }) {
  const { user } = useAuth();
  const [channels, setChannels] = useState([]);
  const [groups, setGroups] = useState([]);
  const [dmList, setDmList] = useState([]);
  const [activeRoom, setActiveRoomState] = useState(null);
  const [messages, setMessages] = useState({});
  const [typingUsers, setTypingUsers] = useState({});
  const [onlineUsers, setOnlineUsers] = useState(new Set());
  const [wsConnected, setWsConnected] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const wsRef = useRef(null);
  const reconnectAttempts = useRef(0);
  const reconnectTimeout = useRef(null);
  const typingTimeouts = useRef({});
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);

  const handleWSMessage = useCallback((msg) => {
    if (!isMounted.current) return;
    switch (msg.type) {
      case "connected":
        setOnlineUsers(new Set(msg.online_users || []));
        break;
      case "message":
        const newMsg = msg.data;
        setMessages(prev => {
          const existing = prev[newMsg.room_id] || [];
          // Dedup: skip if message ID already exists
          if (existing.some(m => m.id === newMsg.id)) return prev;
          return { ...prev, [newMsg.room_id]: [...existing, newMsg] };
        });
        // Update DM list if DM message
        if (newMsg.room_type === "dm") {
          setDmList(prev => {
            const exists = prev.find(d => d.room_id === newMsg.room_id);
            if (exists) {
              return prev.map(d => d.room_id === newMsg.room_id
                ? { ...d, last_message_preview: newMsg.content }
                : d
              );
            }
            return prev;
          });
        }
        break;
      case "typing":
        const { room_id: tRoom, user_id: tUid, username: tName, is_typing } = msg;
        setTypingUsers(prev => {
          const room = { ...(prev[tRoom] || {}) };
          if (is_typing) {
            room[tUid] = tName;
            const key = `${tRoom}:${tUid}`;
            if (typingTimeouts.current[key]) clearTimeout(typingTimeouts.current[key]);
            typingTimeouts.current[key] = setTimeout(() => {
              setTypingUsers(p => {
                const r = { ...(p[tRoom] || {}) };
                delete r[tUid];
                return { ...p, [tRoom]: r };
              });
            }, 3500);
          } else {
            delete room[tUid];
          }
          return { ...prev, [tRoom]: room };
        });
        break;
      case "presence":
        setOnlineUsers(prev => {
          const next = new Set(prev);
          if (msg.status === "online") next.add(msg.user_id);
          else next.delete(msg.user_id);
          return next;
        });
        break;
      case "message_edited":
        const edited = msg.data;
        setMessages(prev => ({
          ...prev,
          [edited.room_id]: (prev[edited.room_id] || []).map(m => m.id === edited.id ? edited : m)
        }));
        break;
      case "message_deleted":
        setMessages(prev => ({
          ...prev,
          [msg.room_id]: (prev[msg.room_id] || []).map(m =>
            m.id === msg.message_id ? { ...m, is_deleted: true, content: "This message was deleted" } : m
          )
        }));
        break;
      case "reaction":
        setMessages(prev => {
          const updated = { ...prev };
          for (const roomId in updated) {
            updated[roomId] = updated[roomId].map(m => {
              if (m.id !== msg.message_id) return m;
              const reactions = { ...m.reactions };
              if (msg.action === "add") {
                if (!reactions[msg.emoji]) reactions[msg.emoji] = { count: 0, users: [] };
                if (!reactions[msg.emoji].users.includes(msg.user_id)) {
                  reactions[msg.emoji] = { count: reactions[msg.emoji].count + 1, users: [...reactions[msg.emoji].users, msg.user_id] };
                }
              } else {
                if (reactions[msg.emoji]) {
                  const newCount = reactions[msg.emoji].count - 1;
                  if (newCount <= 0) delete reactions[msg.emoji];
                  else reactions[msg.emoji] = { count: newCount, users: reactions[msg.emoji].users.filter(u => u !== msg.user_id) };
                }
              }
              return { ...m, reactions };
            });
          }
          return updated;
        });
        break;
      default:
        break;
    }
  }, []);

  const connectWS = useCallback(() => {
    if (!user || !isMounted.current) return;
    const token = localStorage.getItem("parlance_token");
    if (!token) return;
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) return;

    const ws = new WebSocket(`${WS_BASE}/api/ws?token=${token}`);
    wsRef.current = ws;

    ws.onopen = () => {
      if (isMounted.current) {
        setWsConnected(true);
        reconnectAttempts.current = 0;
      }
    };
    ws.onmessage = (e) => {
      try { handleWSMessage(JSON.parse(e.data)); } catch (err) {}
    };
    ws.onclose = (e) => {
      if (isMounted.current) {
        setWsConnected(false);
        wsRef.current = null;
        if (e.code !== 4001 && user) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000);
          reconnectAttempts.current++;
          reconnectTimeout.current = setTimeout(() => { if (isMounted.current) connectWS(); }, delay);
        }
      }
    };
    ws.onerror = () => ws.close();
  }, [user, handleWSMessage]);

  useEffect(() => {
    if (user) {
      connectWS();
      loadChannels();
      loadGroups();
      loadDMs();
    }
    return () => {
      if (reconnectTimeout.current) clearTimeout(reconnectTimeout.current);
      if (wsRef.current) { wsRef.current.close(1000); wsRef.current = null; }
    };
  }, [user?.id]);

  const loadChannels = async () => {
    try {
      const { data } = await axios.get(`${API}/channels/mine`, { withCredentials: true });
      if (isMounted.current) setChannels(data);
    } catch (e) {}
  };

  const loadGroups = async () => {
    try {
      const { data } = await axios.get(`${API}/groups`, { withCredentials: true });
      if (isMounted.current) setGroups(data);
    } catch (e) {}
  };

  const loadDMs = async () => {
    try {
      const { data } = await axios.get(`${API}/dm/list`, { withCredentials: true });
      if (isMounted.current) setDmList(data);
    } catch (e) {}
  };

  const loadMessages = useCallback(async (room) => {
    if (messages[room.id] && messages[room.id].length > 0) {
      subscribeRoom(room.id);
      return;
    }
    setIsLoadingMessages(true);
    try {
      let url;
      if (room.type === "channel") url = `${API}/channels/${room.id}/messages`;
      else if (room.type === "group") url = `${API}/groups/${room.id}/messages`;
      else if (room.type === "dm") url = `${API}/dm/${room.otherId}/messages`;
      const { data } = await axios.get(url, { withCredentials: true });
      if (isMounted.current) {
        setMessages(prev => ({ ...prev, [room.id]: data }));
        subscribeRoom(room.id);
      }
    } catch (e) {
      toast.error("Failed to load messages");
    } finally {
      if (isMounted.current) setIsLoadingMessages(false);
    }
  }, [messages]);

  const subscribeRoom = (roomId) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "subscribe_room", room_id: roomId }));
    }
  };

  const setActiveRoom = useCallback((room) => {
    setActiveRoomState(room);
    if (room) loadMessages(room);
  }, [loadMessages]);

  const sendMessage = async (content, replyTo = null) => {
    if (!activeRoom || !content.trim()) return;
    try {
      if (activeRoom.type === "dm") {
        await axios.post(`${API}/dm`, { recipient_id: activeRoom.otherId, content: content.trim(), reply_to: replyTo }, { withCredentials: true });
      } else {
        await axios.post(`${API}/messages`, { content: content.trim(), room_type: activeRoom.type, room_id: activeRoom.id, reply_to: replyTo }, { withCredentials: true });
      }
    } catch (e) {
      toast.error("Failed to send message");
    }
  };

  const editMessage = async (messageId, content) => {
    try {
      await axios.put(`${API}/messages/${messageId}`, { content }, { withCredentials: true });
    } catch (e) {
      toast.error("Failed to edit message");
    }
  };

  const deleteMessage = async (messageId) => {
    try {
      await axios.delete(`${API}/messages/${messageId}`, { withCredentials: true });
    } catch (e) {
      toast.error("Failed to delete message");
    }
  };

  const addReaction = async (messageId, emoji) => {
    try {
      await axios.post(`${API}/messages/${messageId}/reactions`, { emoji }, { withCredentials: true });
    } catch (e) {}
  };

  const sendTyping = useCallback((isTyping) => {
    if (!activeRoom || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    wsRef.current.send(JSON.stringify({ type: isTyping ? "typing_start" : "typing_stop", room_id: activeRoom.id }));
  }, [activeRoom]);

  return (
    <ChatContext.Provider value={{
      channels, groups, dmList,
      activeRoom, setActiveRoom,
      messages, typingUsers, onlineUsers,
      wsConnected, wsRef, isLoadingMessages,
      sendMessage, editMessage, deleteMessage, addReaction, sendTyping,
      loadChannels, loadGroups, loadDMs, loadMessages
    }}>
      {children}
    </ChatContext.Provider>
  );
}

export const useChat = () => useContext(ChatContext);
