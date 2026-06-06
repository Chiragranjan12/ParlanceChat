import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Users, Crown, Plus, X, Search } from "lucide-react";
import axios from "axios";
import { useChat } from "@/contexts/ChatContext";
import { useAuth, API, authHeaders } from "@/contexts/AuthContext";
import UserAvatar from "@/components/UserAvatar";
import toast from "react-hot-toast";

export default function RightPanel() {
  const { activeRoom, onlineUsers } = useChat();
  const { user } = useAuth();
  const [members, setMembers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);
  const [searchQ, setSearchQ] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    if (activeRoom && activeRoom.type !== "dm") {
      loadMembers();
      setShowAddMember(false);
      setSearchQ("");
      setSearchResults([]);
    } else {
      setMembers([]);
    }
  }, [activeRoom?.id]);

  useEffect(() => {
    if (!searchQ.trim()) { setSearchResults([]); return; }
    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const { data } = await axios.get(`${API}/users?q=${encodeURIComponent(searchQ)}`, { headers: authHeaders() });
        const memberIds = new Set(members.map(m => m.id || m.user_id || m.userId));
        setSearchResults(data.filter(u => u.id !== user?.id && !memberIds.has(u.id)));
      } catch (e) {}
      finally { setIsSearching(false); }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQ, members]);

  const loadMembers = async () => {
    if (!activeRoom) return;
    setIsLoading(true);
    try {
      const url = activeRoom.type === "channel"
        ? `${API}/channels/${activeRoom.id}/members`
        : `${API}/groups/${activeRoom.id}/members`;
      const { data } = await axios.get(url, { headers: authHeaders() });
      setMembers(data);
    } catch (e) {}
    finally { setIsLoading(false); }
  };

  const handleAddMember = async (targetUser) => {
    try {
      if (activeRoom.type === "channel") {
        await axios.post(`${API}/channels/${activeRoom.id}/members`, { user_id: targetUser.id }, { headers: authHeaders() });
      } else {
        await axios.post(`${API}/groups/${activeRoom.id}/members`, { user_id: targetUser.id }, { headers: authHeaders() });
      }
      toast.success(`${targetUser.display_name || targetUser.username} added`);
      setSearchQ("");
      setSearchResults([]);
      setShowAddMember(false);
      loadMembers();
    } catch (e) {
      toast.error(e.response?.data?.message || "Failed to add member");
    }
  };

  const online = members.filter(m => onlineUsers.has(m.id) || m.is_online);
  const offline = members.filter(m => !onlineUsers.has(m.id) && !m.is_online);

  return (
    <div className="h-full bg-[#18181b]/50 flex flex-col" data-testid="right-panel">
      <div className="flex-shrink-0 px-4 py-3.5 border-b border-[#27272a]">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-[#818cf8]" />
          <h3 className="font-semibold text-sm text-white">Members</h3>
          <span className="ml-auto text-xs text-[#71717a] bg-[#27272a] px-2 py-0.5 rounded-full">{members.length}</span>
          <button
            onClick={() => { setShowAddMember(p => !p); setSearchQ(""); setSearchResults([]); }}
            className="p-1 rounded-md text-[#71717a] hover:text-white hover:bg-[#27272a] transition-colors"
            title="Add member"
          >
            {showAddMember ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {showAddMember && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="flex-shrink-0 overflow-hidden border-b border-[#27272a]"
          >
            <div className="p-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#52525b]" />
                <input
                  autoFocus
                  value={searchQ}
                  onChange={e => setSearchQ(e.target.value)}
                  placeholder="Search users to add..."
                  className="w-full pl-8 pr-3 py-2 text-sm rounded-lg bg-[#09090b] border border-[#27272a] text-white placeholder-[#52525b] focus:outline-none focus:border-[#6366f1] transition-colors"
                />
              </div>
              <div className="mt-2 space-y-1 max-h-48 overflow-y-auto">
                {isSearching ? (
                  <p className="text-xs text-[#52525b] text-center py-2">Searching...</p>
                ) : !searchQ.trim() ? (
                  <p className="text-xs text-[#52525b] text-center py-2">Type a name to search</p>
                ) : searchResults.length === 0 ? (
                  <p className="text-xs text-[#52525b] text-center py-2">No users found</p>
                ) : searchResults.map(u => (
                  <button
                    key={u.id}
                    onClick={() => handleAddMember(u)}
                    className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-[#27272a] transition-colors text-left"
                  >
                    <UserAvatar user={u} size="sm" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white truncate">{u.display_name || u.username}</p>
                      <p className="text-xs text-[#52525b]">@{u.username}</p>
                    </div>
                    <Plus className="w-3.5 h-3.5 text-[#6366f1] flex-shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex-1 overflow-y-auto px-3 py-2">
        {isLoading ? (
          <div className="space-y-2 animate-pulse">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-2.5 px-2 py-1.5">
                <div className="w-8 h-8 rounded-full bg-[#27272a]" />
                <div className="flex-1 space-y-1">
                  <div className="h-3 bg-[#27272a] rounded w-20" />
                  <div className="h-2 bg-[#27272a] rounded w-12" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <>
            {online.length > 0 && (
              <div className="mb-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-[#71717a] px-2 mb-1">Online — {online.length}</p>
                {online.map(m => <MemberItem key={m.id || m.user_id} member={m} isOnline={true} isCurrentUser={(m.id || m.user_id) === user?.id} />)}
              </div>
            )}
            {offline.length > 0 && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-[#71717a] px-2 mb-1">Offline — {offline.length}</p>
                {offline.map(m => <MemberItem key={m.id || m.user_id} member={m} isOnline={false} isCurrentUser={(m.id || m.user_id) === user?.id} />)}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function MemberItem({ member, isOnline, isCurrentUser }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-[#27272a]/50 transition-colors cursor-default"
      data-testid={`member-${member.username}`}
    >
      <div className="relative flex-shrink-0">
        <UserAvatar user={member} size="sm" />
        <div className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-[#18181b] ${isOnline ? "bg-[#10b981]" : "bg-[#71717a]"}`} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1">
          <p className={`text-sm font-medium truncate ${isOnline ? "text-white" : "text-[#71717a]"}`}>
            {member.display_name || member.displayName || member.username}
            {isCurrentUser && <span className="text-xs text-[#818cf8] ml-1">(you)</span>}
          </p>
          {member.role === "admin" && <Crown className="w-3 h-3 text-[#f59e0b] flex-shrink-0" />}
        </div>
        <p className="text-xs text-[#52525b] truncate">@{member.username}</p>
      </div>
    </motion.div>
  );
}
