import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, User, Bell, Moon, Sun, Shield, LogOut, Trash2 } from "lucide-react";
import axios from "axios";
import toast from "react-hot-toast";
import { useAuth, API, authHeaders } from "@/contexts/AuthContext";

export default function SettingsPage() {
  const { user, logout, updateUser } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("profile");
  const [form, setForm] = useState({
    display_name: user?.display_name || "",
    bio: user?.bio || "",
    avatar_url: user?.avatar_url || "",
  });
  const [isSaving, setIsSaving] = useState(false);
  const [theme, setTheme] = useState(localStorage.getItem("parlance_theme") || "dark");

  const update = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }));

  const handleSaveProfile = async () => {
    setIsSaving(true);
    try {
      const { data } = await axios.put(`${API}/users/me`, form, { headers: authHeaders() });
      updateUser(data);
      toast.success("Profile updated!");
    } catch (e) {
      toast.error("Failed to update profile");
    } finally {
      setIsSaving(false);
    }
  };

  const toggleTheme = () => {
    const newTheme = theme === "dark" ? "light" : "dark";
    setTheme(newTheme);
    localStorage.setItem("parlance_theme", newTheme);
    document.documentElement.classList.toggle("dark", newTheme === "dark");
    toast.success(`Switched to ${newTheme} mode`);
  };

  const tabs = [
    { id: "profile", label: "Profile", icon: User },
    { id: "appearance", label: "Appearance", icon: theme === "dark" ? Moon : Sun },
    { id: "notifications", label: "Notifications", icon: Bell },
    { id: "privacy", label: "Privacy", icon: Shield },
  ];

  return (
    <div className="h-screen bg-[#09090b] text-white flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-4 px-6 h-14 border-b border-[#27272a] bg-[#18181b]">
        <button onClick={() => navigate(-1)} className="p-2 rounded-lg text-[#a1a1aa] hover:text-white hover:bg-[#27272a] transition-colors" data-testid="settings-back-button">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="font-outfit text-lg font-semibold">Settings</h1>
      </div>

      <div className="flex flex-1 min-h-0">
        {/* Sidebar tabs */}
        <div className="w-56 border-r border-[#27272a] bg-[#18181b] flex-shrink-0 p-3">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              data-testid={`settings-tab-${id}`}
              onClick={() => setActiveTab(id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors mb-1 ${activeTab === id ? "bg-[#6366f1]/15 text-[#818cf8]" : "text-[#a1a1aa] hover:text-white hover:bg-[#27272a]"}`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
          <div className="mt-4 pt-4 border-t border-[#27272a]">
            <button
              data-testid="settings-logout-button"
              onClick={async () => { await logout(); navigate("/login"); }}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Sign out
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 p-8 overflow-y-auto">
          <motion.div key={activeTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
            {activeTab === "profile" && (
              <div className="max-w-lg space-y-6">
                <div>
                  <h2 className="font-outfit text-2xl font-semibold mb-1">Profile</h2>
                  <p className="text-[#a1a1aa] text-sm">Manage your public profile</p>
                </div>

                {/* Avatar preview */}
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-[#6366f1] flex items-center justify-center text-white text-2xl font-bold overflow-hidden">
                    {form.avatar_url ? (
                      <img src={form.avatar_url} alt="avatar" className="w-full h-full object-cover" onError={(e) => { e.target.style.display = "none"; }} />
                    ) : (
                      (user?.display_name || user?.username || "U")[0].toUpperCase()
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-white">{user?.display_name || user?.username}</p>
                    <p className="text-[#a1a1aa] text-sm">@{user?.username}</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-[#a1a1aa] mb-1.5">Display Name</label>
                    <input data-testid="settings-displayname-input" type="text" value={form.display_name} onChange={update("display_name")} className="w-full px-4 py-3 rounded-lg bg-[#18181b] border border-[#27272a] text-white focus:outline-none focus:border-[#6366f1] focus:ring-1 focus:ring-[#6366f1] transition-colors" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#a1a1aa] mb-1.5">Bio</label>
                    <textarea data-testid="settings-bio-input" value={form.bio} onChange={update("bio")} rows={3} placeholder="Tell us about yourself..." className="w-full px-4 py-3 rounded-lg bg-[#18181b] border border-[#27272a] text-white placeholder-[#52525b] focus:outline-none focus:border-[#6366f1] focus:ring-1 focus:ring-[#6366f1] transition-colors resize-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#a1a1aa] mb-1.5">Avatar URL</label>
                    <input data-testid="settings-avatar-input" type="url" value={form.avatar_url} onChange={update("avatar_url")} placeholder="https://..." className="w-full px-4 py-3 rounded-lg bg-[#18181b] border border-[#27272a] text-white placeholder-[#52525b] focus:outline-none focus:border-[#6366f1] focus:ring-1 focus:ring-[#6366f1] transition-colors" />
                  </div>
                  <button data-testid="settings-save-button" onClick={handleSaveProfile} disabled={isSaving} className="px-6 py-3 rounded-lg bg-[#6366f1] hover:bg-[#4f46e5] text-white font-semibold transition-colors disabled:opacity-50">
                    {isSaving ? "Saving..." : "Save changes"}
                  </button>
                </div>
              </div>
            )}

            {activeTab === "appearance" && (
              <div className="max-w-lg space-y-6">
                <div>
                  <h2 className="font-outfit text-2xl font-semibold mb-1">Appearance</h2>
                  <p className="text-[#a1a1aa] text-sm">Customize how Parlance looks</p>
                </div>
                <div className="flex items-center justify-between p-4 rounded-xl bg-[#18181b] border border-[#27272a]">
                  <div>
                    <p className="font-medium text-white">Theme</p>
                    <p className="text-sm text-[#a1a1aa]">Currently: {theme === "dark" ? "Dark" : "Light"}</p>
                  </div>
                  <button data-testid="theme-toggle-button" onClick={toggleTheme} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#27272a] hover:bg-[#3f3f46] text-white text-sm font-medium transition-colors">
                    {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                    Switch to {theme === "dark" ? "Light" : "Dark"}
                  </button>
                </div>
              </div>
            )}

            {activeTab === "notifications" && (
              <div className="max-w-lg space-y-6">
                <div>
                  <h2 className="font-outfit text-2xl font-semibold mb-1">Notifications</h2>
                  <p className="text-[#a1a1aa] text-sm">Control what notifications you receive</p>
                </div>
                <div className="space-y-3">
                  {["New messages", "@mentions", "DMs", "Channel activity"].map(item => (
                    <div key={item} className="flex items-center justify-between p-4 rounded-xl bg-[#18181b] border border-[#27272a]">
                      <span className="text-white">{item}</span>
                      <div className="w-10 h-6 rounded-full bg-[#6366f1] relative cursor-pointer">
                        <div className="absolute right-1 top-1 w-4 h-4 rounded-full bg-white" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === "privacy" && (
              <div className="max-w-lg space-y-6">
                <div>
                  <h2 className="font-outfit text-2xl font-semibold mb-1">Privacy & Security</h2>
                  <p className="text-[#a1a1aa] text-sm">Manage your privacy settings</p>
                </div>
                <div className="p-4 rounded-xl bg-[#18181b] border border-[#27272a]">
                  <p className="text-sm text-[#a1a1aa]">
                    <strong className="text-white">Account:</strong> {user?.email}
                  </p>
                  <p className="text-sm text-[#a1a1aa] mt-2">
                    <strong className="text-white">Username:</strong> @{user?.username}
                  </p>
                  <p className="text-sm text-[#a1a1aa] mt-2">
                    <strong className="text-white">Member since:</strong> {user?.created_at ? new Date(user.created_at).toLocaleDateString() : "N/A"}
                  </p>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
