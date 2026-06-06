import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Search, Check } from "lucide-react";
import axios from "axios";
import toast from "react-hot-toast";
import { API } from "@/contexts/AuthContext";
import { useAuth } from "@/contexts/AuthContext";
import UserAvatar from "@/components/UserAvatar";

export default function CreateGroupModal({ open, onClose, onCreated }) {
  const { user } = useAuth();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [searchQ, setSearchQ] = useState("");
  const [users, setUsers] = useState([]);
  const [selected, setSelected] = useState([]);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) searchUsers("");
  }, [open]);

  useEffect(() => {
    const timer = setTimeout(() => searchUsers(searchQ), 300);
    return () => clearTimeout(timer);
  }, [searchQ]);

  const searchUsers = async (q) => {
    try {
      const { data } = await axios.get(`${API}/users?q=${q}`, { withCredentials: true });
      setUsers(data.filter(u => u.id !== user?.id));
    } catch (e) {}
  };

  const toggleUser = (u) => {
    setSelected(prev => prev.find(s => s.id === u.id) ? prev.filter(s => s.id !== u.id) : [...prev, u]);
  };

  const handleCreate = async () => {
    if (!name.trim()) {
      setError("Group name is required");
      return;
    }
    if (selected.length === 0) {
      setError("Select at least 1 other member");
      return;
    }
    
    setError("");
    setIsCreating(true);
    try {
      // Include current user + selected members
      const memberIds = [user?.id, ...selected.map(u => u.id)];
      await axios.post(`${API}/groups`, {
        name: name.trim(),
        description: description.trim(),
        memberIds: memberIds
      }, { withCredentials: true });
      toast.success(`Group "${name}" created!`);
      setName("");
      setDescription("");
      setSelected([]);
      onCreated?.();
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to create group");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-backdrop" data-testid="create-group-modal">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.15 }} className="bg-[#09090b] border border-[#27272a] rounded-2xl shadow-2xl w-full max-w-md p-6 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between mb-6 flex-shrink-0">
              <h2 className="font-outfit text-xl font-semibold text-white">Create Group</h2>
              <button onClick={onClose} className="p-2 rounded-lg text-[#71717a] hover:text-white hover:bg-[#27272a] transition-colors" data-testid="close-group-modal"><X className="w-4 h-4" /></button>
            </div>

            {error && <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex-shrink-0">{error}</div>}

            <div className="space-y-4 flex-shrink-0">
              <div>
                <label className="block text-sm font-medium text-[#a1a1aa] mb-1.5">Group Name</label>
                <input data-testid="group-name-input" value={name} onChange={e => setName(e.target.value)} placeholder="Group name" required className="w-full px-4 py-3 rounded-lg bg-[#18181b] border border-[#27272a] text-white placeholder-[#52525b] focus:outline-none focus:border-[#6366f1] transition-colors" />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#a1a1aa] mb-1.5">Add Members</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#52525b]" />
                  <input data-testid="group-member-search" value={searchQ} onChange={e => setSearchQ(e.target.value)} placeholder="Search users..." className="w-full pl-9 pr-4 py-3 rounded-lg bg-[#18181b] border border-[#27272a] text-white placeholder-[#52525b] focus:outline-none focus:border-[#6366f1] transition-colors" />
                </div>
              </div>
            </div>

            {/* Selected members */}
            {selected.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-3 flex-shrink-0">
                {selected.map(u => (
                  <div key={u.id} className="flex items-center gap-1.5 bg-[#6366f1]/20 rounded-full px-2.5 py-1">
                    <span className="text-xs text-[#818cf8] font-medium">{u.display_name || u.username}</span>
                    <button onClick={() => toggleUser(u)} className="text-[#818cf8] hover:text-white"><X className="w-3 h-3" /></button>
                  </div>
                ))}
              </div>
            )}

            {/* Users list */}
            <div className="flex-1 overflow-y-auto mt-3 space-y-1 min-h-[100px]">
              {users.map(u => {
                const isSelected = selected.find(s => s.id === u.id);
                return (
                  <button key={u.id} onClick={() => toggleUser(u)} className={`w-full flex items-center gap-2.5 px-2 py-2 rounded-lg transition-colors ${isSelected ? "bg-[#6366f1]/15" : "hover:bg-[#27272a]"}`} data-testid={`group-user-${u.username}`}>
                    <UserAvatar user={u} size="sm" />
                    <div className="flex-1 text-left min-w-0">
                      <p className="text-sm font-medium text-white truncate">{u.display_name || u.username}</p>
                      <p className="text-xs text-[#52525b]">@{u.username}</p>
                    </div>
                    {isSelected && <Check className="w-4 h-4 text-[#818cf8] flex-shrink-0" />}
                  </button>
                );
              })}
            </div>

            <div className="flex gap-3 pt-4 flex-shrink-0 mt-2">
              <button onClick={onClose} className="flex-1 py-3 rounded-lg border border-[#27272a] text-[#a1a1aa] hover:text-white transition-colors text-sm font-medium">Cancel</button>
              <button data-testid="create-group-submit" onClick={handleCreate} disabled={isCreating || !name.trim()} className="flex-1 py-3 rounded-lg bg-[#6366f1] hover:bg-[#4f46e5] text-white text-sm font-semibold transition-colors disabled:opacity-50">
                {isCreating ? "Creating..." : `Create Group${selected.length > 0 ? ` (${selected.length})` : ""}`}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
