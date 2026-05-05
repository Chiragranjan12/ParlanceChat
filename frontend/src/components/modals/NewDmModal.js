import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Search, MessageSquare } from "lucide-react";
import axios from "axios";
import { API } from "@/contexts/AuthContext";
import { useAuth } from "@/contexts/AuthContext";
import { useChat } from "@/contexts/ChatContext";
import UserAvatar from "@/components/UserAvatar";

export default function NewDmModal({ open, onClose, onSelect }) {
  const { user } = useAuth();
  const { onlineUsers } = useChat();
  const [searchQ, setSearchQ] = useState("");
  const [users, setUsers] = useState([]);

  useEffect(() => {
    if (open) fetchUsers("");
  }, [open]);

  useEffect(() => {
    const timer = setTimeout(() => fetchUsers(searchQ), 300);
    return () => clearTimeout(timer);
  }, [searchQ]);

  const fetchUsers = async (q) => {
    try {
      const { data } = await axios.get(`${API}/users?q=${q}`, { withCredentials: true });
      setUsers(data.filter(u => u.id !== user?.id));
    } catch (e) {}
  };

  const handleSelect = (u) => {
    const ids = [user?.id, u.id].sort();
    const room_id = `dm_${ids[0]}_${ids[1]}`;
    onSelect({ ...u, room_id });
    setSearchQ("");
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-backdrop" data-testid="new-dm-modal">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.15 }} className="bg-[#09090b] border border-[#27272a] rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-outfit text-xl font-semibold text-white">New Message</h2>
              <button onClick={onClose} className="p-2 rounded-lg text-[#71717a] hover:text-white hover:bg-[#27272a] transition-colors" data-testid="close-dm-modal"><X className="w-4 h-4" /></button>
            </div>

            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#52525b]" />
              <input
                data-testid="dm-user-search"
                autoFocus
                value={searchQ}
                onChange={e => setSearchQ(e.target.value)}
                placeholder="Search users..."
                className="w-full pl-9 pr-4 py-3 rounded-lg bg-[#18181b] border border-[#27272a] text-white placeholder-[#52525b] focus:outline-none focus:border-[#6366f1] transition-colors"
              />
            </div>

            <div className="space-y-1 max-h-64 overflow-y-auto">
              {users.length === 0 ? (
                <p className="text-center text-[#52525b] text-sm py-4">No users found</p>
              ) : (
                users.map(u => (
                  <button
                    key={u.id}
                    onClick={() => handleSelect(u)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-[#27272a] transition-colors"
                    data-testid={`dm-select-${u.username}`}
                  >
                    <div className="relative flex-shrink-0">
                      <UserAvatar user={u} size="sm" />
                      <div className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-[#09090b] ${onlineUsers.has(u.id) ? "bg-[#10b981]" : "bg-[#71717a]"}`} />
                    </div>
                    <div className="flex-1 text-left min-w-0">
                      <p className="text-sm font-medium text-white truncate">{u.display_name || u.username}</p>
                      <p className="text-xs text-[#52525b]">@{u.username}</p>
                    </div>
                    <MessageSquare className="w-4 h-4 text-[#52525b]" />
                  </button>
                ))
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
