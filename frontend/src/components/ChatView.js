import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Hash, Users, MessageSquare, Users2, Search, X } from "lucide-react";
import { useChat } from "@/contexts/ChatContext";
import { useAuth } from "@/contexts/AuthContext";
import MessageItem from "@/components/MessageItem";
import MessageInput from "@/components/MessageInput";
import TypingIndicator from "@/components/TypingIndicator";

export default function ChatView({ onToggleRightPanel, rightPanelOpen }) {
  const { activeRoom, messages, typingUsers, isLoadingMessages, searchMessages } = useChat();
  const { user } = useAuth();
  const bottomRef = useRef(null);
  const [replyTo, setReplyTo] = useState(null);
  const [searchMode, setSearchMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  const roomMessages = messages[activeRoom?.id] || [];
  const typing = typingUsers[activeRoom?.id] || {};
  const typingNames = Object.values(typing);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [roomMessages.length]);

  // Group messages by sender + time (within 5 minutes = grouped)
  const groupedMessages = groupMessages(roomMessages);

  useEffect(() => {
    if (!searchMode || !activeRoom || !searchQuery.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    let cancelled = false;
    const timer = setTimeout(async () => {
      setIsSearching(true);
      const results = await searchMessages({ query: searchQuery, limit: 30 });
      if (!cancelled) {
        setSearchResults(results);
        setIsSearching(false);
      }
    }, 250);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [searchMode, searchQuery, activeRoom?.id, searchMessages]);

  const getRoomIcon = () => {
    if (!activeRoom) return null;
    if (activeRoom.type === "channel") return null;
    if (activeRoom.type === "group") return <Users className="w-4 h-4" />;
    return <MessageSquare className="w-4 h-4" />;
  };

  return (
    <div className="flex flex-col h-full bg-[#09090b]" data-testid="chat-view">
      {/* Chat header */}
      <div className="flex-shrink-0 flex items-center justify-between px-4 h-14 border-b border-[#27272a] bg-[#09090b]">
        <div className="flex items-center gap-2.5">
          <span className="text-[#818cf8]">{getRoomIcon()}</span>
          <div>
            <h2 className="font-semibold text-white text-sm leading-tight" data-testid="chat-room-name">
              {activeRoom?.name}
            </h2>
            {activeRoom?.description && (
              <p className="text-xs text-[#71717a] hidden sm:block truncate max-w-xs">{activeRoom.description}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => { setSearchMode(p => !p); setSearchQuery(""); }}
            className={`p-2 rounded-lg transition-colors ${searchMode ? "text-[#818cf8] bg-[#6366f1]/10" : "text-[#a1a1aa] hover:text-white hover:bg-[#27272a]"}`}
            data-testid="search-messages-button"
          >
            <Search className="w-4 h-4" />
          </button>
          <button
            onClick={onToggleRightPanel}
            className={`p-2 rounded-lg transition-colors ${rightPanelOpen ? "text-[#818cf8] bg-[#6366f1]/10" : "text-[#a1a1aa] hover:text-white hover:bg-[#27272a]"}`}
            data-testid="toggle-members-button"
          >
            <Users2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Search bar */}
      <AnimatePresence>
        {searchMode && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="flex-shrink-0 px-4 py-2 border-b border-[#27272a] bg-[#09090b]"
          >
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#52525b]" />
              <input
                data-testid="message-search-input"
                autoFocus
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search messages..."
                className="w-full pl-9 pr-9 py-2 rounded-lg bg-[#18181b] border border-[#27272a] text-white placeholder-[#52525b] text-sm focus:outline-none focus:border-[#6366f1] transition-colors"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#52525b] hover:text-[#a1a1aa]">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            {searchQuery.trim() && (
              <div className="mt-2 rounded-lg border border-[#27272a] bg-[#18181b] overflow-hidden">
                <div className="flex items-center justify-between px-3 py-2 border-b border-[#27272a]">
                  <span className="text-xs font-medium text-[#a1a1aa]">
                    {isSearching ? "Searching..." : `${searchResults.length} result${searchResults.length === 1 ? "" : "s"}`}
                  </span>
                </div>
                <div className="max-h-56 overflow-y-auto">
                  {!isSearching && searchResults.length === 0 ? (
                    <p className="px-3 py-3 text-sm text-[#71717a]">No messages found</p>
                  ) : (
                    searchResults.map(result => (
                      <button
                        key={result.id}
                        type="button"
                        className="w-full text-left px-3 py-2 hover:bg-[#27272a] transition-colors border-b border-[#27272a]/60 last:border-b-0"
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-semibold text-white">{result.sender?.display_name || result.sender?.username || "Unknown"}</span>
                          <span className="text-[11px] text-[#52525b]">{new Date(result.created_at).toLocaleString()}</span>
                        </div>
                        <p className="text-sm text-[#d4d4d8] line-clamp-2">
                          <HighlightedText text={result.content} query={searchQuery} />
                        </p>
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Messages list */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1" data-testid="messages-list">
        {isLoadingMessages ? (
          <MessageSkeletons />
        ) : roomMessages.length === 0 ? (
          <EmptyMessages room={activeRoom} />
        ) : (
          groupedMessages.map((group, i) => (
            <MessageGroup
              key={group.messages[0].id}
              group={group}
              index={i}
              onReply={(msg) => setReplyTo(msg)}
              currentUserId={user?.id}
              searchQuery={searchQuery}
            />
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* Typing indicator */}
      {typingNames.length > 0 && (
        <div className="flex-shrink-0 px-4 pb-1">
          <TypingIndicator names={typingNames} />
        </div>
      )}

      {/* Message input */}
      <div className="flex-shrink-0 px-4 pb-4 pt-2">
        <MessageInput replyTo={replyTo} onCancelReply={() => setReplyTo(null)} roomName={activeRoom?.name} />
      </div>
    </div>
  );
}

function MessageGroup({ group, index, onReply, currentUserId, searchQuery }) {
  return (
    <div className="space-y-0.5">
      {group.messages.map((msg, i) => (
        <MessageItem
          key={msg.id}
          message={msg}
          isGrouped={i > 0}
          showHeader={i === 0}
          onReply={() => onReply(msg)}
          isOwn={msg.sender_id === currentUserId}
          index={index * 10 + i}
          searchQuery={searchQuery}
        />
      ))}
    </div>
  );
}

function HighlightedText({ text = "", query = "" }) {
  if (!query.trim()) return text;
  const escaped = query.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const parts = text.split(new RegExp(`(${escaped})`, "ig"));
  return parts.map((part, index) =>
    part.toLowerCase() === query.trim().toLowerCase()
      ? <mark key={index} className="bg-[#facc15]/20 text-[#fde68a] rounded px-0.5">{part}</mark>
      : <span key={index}>{part}</span>
  );
}

function groupMessages(msgs) {
  if (!msgs.length) return [];
  const groups = [];
  let currentGroup = null;
  for (const msg of msgs) {
    const msgTime = new Date(msg.created_at).getTime();
    const lastTime = currentGroup ? new Date(currentGroup.messages[currentGroup.messages.length - 1].created_at).getTime() : 0;
    const sameUser = currentGroup && currentGroup.messages[0].sender_id === msg.sender_id;
    const within5Min = msgTime - lastTime < 5 * 60 * 1000;
    if (sameUser && within5Min) {
      currentGroup.messages.push(msg);
    } else {
      currentGroup = { messages: [msg] };
      groups.push(currentGroup);
    }
  }
  return groups;
}

function EmptyMessages({ room }) {
  return (
    <div className="flex flex-col items-center justify-center h-full py-16 text-center">
      <div className="w-14 h-14 rounded-2xl bg-[#18181b] border border-[#27272a] flex items-center justify-center mb-4">
        {room?.type === "group" ? <Users className="w-7 h-7 text-[#6366f1]" /> : <MessageSquare className="w-7 h-7 text-[#6366f1]" />}
      </div>
      <h3 className="font-semibold text-white mb-1">Beginning of {room?.name}</h3>
      <p className="text-[#a1a1aa] text-sm max-w-xs">{room?.description || "Send a message to get the conversation started!"}</p>
    </div>
  );
}

function MessageSkeletons() {
  return (
    <div className="space-y-4">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="flex gap-3 animate-pulse">
          <div className="w-9 h-9 rounded-full bg-[#27272a] flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="flex gap-2 items-center">
              <div className="h-3 bg-[#27272a] rounded w-24" />
              <div className="h-2 bg-[#27272a] rounded w-12" />
            </div>
            <div className="h-4 bg-[#27272a] rounded w-full" />
            {i % 2 === 0 && <div className="h-4 bg-[#27272a] rounded w-3/4" />}
          </div>
        </div>
      ))}
    </div>
  );
}
