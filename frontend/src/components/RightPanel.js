import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Users, Crown, Circle } from "lucide-react";
import axios from "axios";
import { useChat } from "@/contexts/ChatContext";
import { useAuth, API } from "@/contexts/AuthContext";
import UserAvatar from "@/components/UserAvatar";

export default function RightPanel() {
  const { activeRoom, onlineUsers } = useChat();
  const { user } = useAuth();
  const [members, setMembers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (activeRoom && activeRoom.type !== "dm") {
      loadMembers();
    } else {
      setMembers([]);
    }
  }, [activeRoom?.id]);

  const loadMembers = async () => {
    if (!activeRoom) return;
    setIsLoading(true);
    try {
      const url = activeRoom.type === "channel"
        ? `${API}/channels/${activeRoom.id}/members`
        : `${API}/groups/${activeRoom.id}/members`;
      const { data } = await axios.get(url, { withCredentials: true });
      setMembers(data);
    } catch (e) {}
    finally { setIsLoading(false); }
  };

  const online = members.filter(m => onlineUsers.has(m.id) || m.is_online);
  const offline = members.filter(m => !onlineUsers.has(m.id) && !m.is_online);

  if (!activeRoom || activeRoom.type === "dm") {
    return (
      <div className="h-full bg-[#18181b]/50 flex items-center justify-center p-4" data-testid="right-panel">
        <p className="text-[#52525b] text-sm text-center">Select a channel or group to see members</p>
      </div>
    );
  }

  return (
    <div className="h-full bg-[#18181b]/50 flex flex-col" data-testid="right-panel">
      <div className="flex-shrink-0 px-4 py-3.5 border-b border-[#27272a]">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-[#818cf8]" />
          <h3 className="font-semibold text-sm text-white">Members</h3>
          <span className="ml-auto text-xs text-[#71717a] bg-[#27272a] px-2 py-0.5 rounded-full">{members.length}</span>
        </div>
      </div>

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
                <p className="text-xs font-semibold uppercase tracking-wider text-[#71717a] px-2 mb-1">
                  Online — {online.length}
                </p>
                {online.map(m => <MemberItem key={m.id} member={m} isOnline={true} isCurrentUser={m.id === user?.id} />)}
              </div>
            )}
            {offline.length > 0 && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-[#71717a] px-2 mb-1">
                  Offline — {offline.length}
                </p>
                {offline.map(m => <MemberItem key={m.id} member={m} isOnline={false} isCurrentUser={m.id === user?.id} />)}
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
            {member.display_name || member.username}
            {isCurrentUser && <span className="text-xs text-[#818cf8] ml-1">(you)</span>}
          </p>
          {member.role === "admin" && <Crown className="w-3 h-3 text-[#f59e0b] flex-shrink-0" />}
        </div>
        <p className="text-xs text-[#52525b] truncate">@{member.username}</p>
      </div>
    </motion.div>
  );
}
