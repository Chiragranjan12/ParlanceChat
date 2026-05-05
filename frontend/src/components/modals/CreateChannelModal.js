import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Hash, Lock } from "lucide-react";
import axios from "axios";
import toast from "react-hot-toast";
import { API } from "@/contexts/AuthContext";

export default function CreateChannelModal({ open, onClose, onCreated }) {
  const [form, setForm] = useState({ name: "", description: "", channel_type: "public" });
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!form.name.trim()) return;
    setIsCreating(true);
    try {
      await axios.post(`${API}/channels`, { ...form, name: form.name.trim() }, { withCredentials: true });
      toast.success(`Channel #${form.name} created!`);
      setForm({ name: "", description: "", channel_type: "public" });
      onCreated?.();
      onClose();
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to create channel");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-backdrop" data-testid="create-channel-modal">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="bg-[#09090b] border border-[#27272a] rounded-2xl shadow-2xl w-full max-w-md p-6"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-outfit text-xl font-semibold text-white">Create Channel</h2>
              <button onClick={onClose} className="p-2 rounded-lg text-[#71717a] hover:text-white hover:bg-[#27272a] transition-colors" data-testid="close-channel-modal">
                <X className="w-4 h-4" />
              </button>
            </div>

            {error && <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{error}</div>}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#a1a1aa] mb-1.5">Channel Name</label>
                <div className="relative">
                  <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#52525b]" />
                  <input
                    data-testid="channel-name-input"
                    value={form.name}
                    onChange={e => setForm(p => ({ ...p, name: e.target.value.toLowerCase().replace(/\s+/g, "-") }))}
                    placeholder="new-channel"
                    required
                    className="w-full pl-9 pr-4 py-3 rounded-lg bg-[#18181b] border border-[#27272a] text-white placeholder-[#52525b] focus:outline-none focus:border-[#6366f1] focus:ring-1 focus:ring-[#6366f1] transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#a1a1aa] mb-1.5">Description <span className="text-[#52525b]">(optional)</span></label>
                <input
                  data-testid="channel-description-input"
                  value={form.description}
                  onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                  placeholder="What is this channel about?"
                  className="w-full px-4 py-3 rounded-lg bg-[#18181b] border border-[#27272a] text-white placeholder-[#52525b] focus:outline-none focus:border-[#6366f1] focus:ring-1 focus:ring-[#6366f1] transition-colors"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#a1a1aa] mb-2">Channel Type</label>
                <div className="grid grid-cols-2 gap-2">
                  {[{ val: "public", icon: Hash, label: "Public", desc: "Anyone can join" }, { val: "private", icon: Lock, label: "Private", desc: "Invite only" }].map(({ val, icon: Icon, label, desc }) => (
                    <button
                      key={val}
                      type="button"
                      data-testid={`channel-type-${val}`}
                      onClick={() => setForm(p => ({ ...p, channel_type: val }))}
                      className={`flex items-start gap-3 p-3 rounded-lg border transition-colors text-left ${form.channel_type === val ? "border-[#6366f1] bg-[#6366f1]/10" : "border-[#27272a] bg-[#18181b] hover:border-[#3f3f46]"}`}
                    >
                      <Icon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${form.channel_type === val ? "text-[#818cf8]" : "text-[#52525b]"}`} />
                      <div>
                        <p className={`text-sm font-medium ${form.channel_type === val ? "text-white" : "text-[#a1a1aa]"}`}>{label}</p>
                        <p className="text-xs text-[#52525b]">{desc}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={onClose} className="flex-1 py-3 rounded-lg border border-[#27272a] text-[#a1a1aa] hover:text-white hover:border-[#3f3f46] transition-colors text-sm font-medium">Cancel</button>
                <button data-testid="create-channel-submit" type="submit" disabled={isCreating || !form.name.trim()} className="flex-1 py-3 rounded-lg bg-[#6366f1] hover:bg-[#4f46e5] text-white text-sm font-semibold transition-colors disabled:opacity-50">
                  {isCreating ? "Creating..." : "Create Channel"}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
