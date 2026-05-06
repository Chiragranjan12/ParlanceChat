import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Hash, Users, MessageSquare, Plus, Settings, Search, ChevronDown, ChevronRight, LogOut, X } from "lucide-react";
import axios from "axios";
import toast from "react-hot-toast";
import { useAuth, API } from "@/contexts/AuthContext";
import { useChat } from "@/contexts/ChatContext";
import UserAvatar from "@/components/UserAvatar";
import CreateChannelModal from "@/components/modals/CreateChannelModal";
import CreateGroupModal from "@/components/modals/CreateGroupModal";
import NewDmModal from "@/components/modals/NewDmModal";

export default function Sidebar({ onClose }) {
  const { user, logout } = useAuth();
  const { channels, groups, dmList, activeRoom, setActiveRoom, onlineUsers, loadChannels, loadGroups, loadDMs } = useChat();
  const navigate = useNavigate();
  const [expandChannels, setExpandChannels] = useState(true);
  const [expandGroups, setExpandGroups] = useState(true);
  const [expandDMs, setExpandDMs] = useState(true);
  const [showCreateChannel, setShowCreateChannel] = useState(false);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [showNewDm, setShowNewDm] = useState(false);

  const selectChannel = (ch) => {
    setActiveRoom({ type: "channel", id: ch.id, name: ch.name, description: ch.description });
    if (onClose) onClose();
  };

  const selectGroup = (g) => {
    setActiveRoom({ type: "group", id: g.id, name: g.name, description: g.description });
    if (onClose) onClose();
  };

  const selectDM = (dm) => {
    setActiveRoom({ type: "dm", id: dm.room_id, name: dm.display_name || dm.username, otherId: dm.id, avatar: dm.avatar_url });
    if (onClose) onClose();
  };

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <div className="h-full w-full bg-[#18181b] border-r border-[#27272a] flex flex-col" data-testid="sidebar">
      {/* Logo */}
      <div className="flex items-center justify-between px-4 h-14 border-b border-[#27272a] flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#6366f1] flex items-center justify-center flex-shrink-0">
            <MessageSquare className="w-4 h-4 text-white" />
          </div>
          <span className="font-outfit font-bold text-white text-lg">Parlance</span>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => navigate("/settings")} className="p-1.5 rounded-lg text-[#a1a1aa] hover:text-white hover:bg-[#27272a] transition-colors" data-testid="settings-button">
            <Settings className="w-4 h-4" />
          </button>
          {onClose && (
            <button onClick={onClose} className="p-1.5 rounded-lg text-[#a1a1aa] hover:text-white hover:bg-[#27272a] transition-colors lg:hidden">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Scrollable nav */}
      <div className="flex-1 overflow-y-auto py-2 px-2 space-y-1">

        {/* Channels */}
        <div>
        <div
            onClick={() => setExpandChannels(p => !p)}
            className="w-full flex items-center justify-between px-2 py-1.5 rounded-md text-xs font-semibold uppercase tracking-wider text-[#71717a] hover:text-[#a1a1aa] transition-colors group cursor-pointer"
            data-testid="channels-section-toggle"
          >
            <div className="flex items-center gap-1">
              {expandChannels ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
              <span>Channels</span>
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); setShowCreateChannel(true); }}
              className="opacity-0 group-hover:opacity-100 p-0.5 rounded text-[#71717a] hover:text-white hover:bg-[#3f3f46] transition-all"
              data-testid="create-channel-button"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          <AnimatePresence>
            {expandChannels && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.15 }} className="overflow-hidden">
                {channels.length === 0 ? (
                  <p className="px-4 py-2 text-xs text-[#52525b]">No channels yet</p>
                ) : (
                  channels.map(ch => (
                    <SidebarItem
                      key={ch.id}
                      label={ch.name}
                      isActive={activeRoom?.id === ch.id}
                      onClick={() => selectChannel(ch)}
                      testId={`channel-item-${ch.name}`}
                    />
                  ))
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Groups */}
        <div>
          <div
            onClick={() => setExpandGroups(p => !p)}
            className="w-full flex items-center justify-between px-2 py-1.5 rounded-md text-xs font-semibold uppercase tracking-wider text-[#71717a] hover:text-[#a1a1aa] transition-colors group mt-2 cursor-pointer"
            data-testid="groups-section-toggle"
          >
            <div className="flex items-center gap-1">
              {expandGroups ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
              <span>Groups</span>
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); setShowCreateGroup(true); }}
              className="opacity-0 group-hover:opacity-100 p-0.5 rounded text-[#71717a] hover:text-white hover:bg-[#3f3f46] transition-all"
              data-testid="create-group-button"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          <AnimatePresence>
            {expandGroups && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.15 }} className="overflow-hidden">
                {groups.length === 0 ? (
                  <p className="px-4 py-2 text-xs text-[#52525b]">No groups yet</p>
                ) : (
                  groups.map(g => (
                    <SidebarItem
                      key={g.id}
                      icon={<Users className="w-4 h-4" />}
                      label={g.name}
                      isActive={activeRoom?.id === g.id}
                      onClick={() => selectGroup(g)}
                      testId={`group-item-${g.name}`}
                    />
                  ))
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Direct Messages */}
        <div>
          <div
            onClick={() => setExpandDMs(p => !p)}
            className="w-full flex items-center justify-between px-2 py-1.5 rounded-md text-xs font-semibold uppercase tracking-wider text-[#71717a] hover:text-[#a1a1aa] transition-colors group mt-2 cursor-pointer"
            data-testid="dms-section-toggle"
          >
            <div className="flex items-center gap-1">
              {expandDMs ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
              <span>Direct Messages</span>
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); setShowNewDm(true); }}
              className="opacity-0 group-hover:opacity-100 p-0.5 rounded text-[#71717a] hover:text-white hover:bg-[#3f3f46] transition-all"
              data-testid="new-dm-button"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          <AnimatePresence>
            {expandDMs && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.15 }} className="overflow-hidden">
                {dmList.length === 0 ? (
                  <p className="px-4 py-2 text-xs text-[#52525b]">No conversations yet</p>
                ) : (
                  dmList.map(dm => (
                    <button
                      key={dm.room_id || dm.id}
                      data-testid={`dm-item-${dm.username}`}
                      onClick={() => selectDM(dm)}
                      className={`w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-sm transition-colors ${activeRoom?.id === dm.room_id ? "bg-[#6366f1]/15 text-white" : "text-[#a1a1aa] hover:text-white hover:bg-[#27272a]"}`}
                    >
                      <div className="relative flex-shrink-0">
                        <UserAvatar user={dm} size="sm" />
                        <div className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-[#18181b] ${onlineUsers.has(dm.id) ? "bg-[#10b981]" : "bg-[#71717a]"}`} />
                      </div>
                      <div className="min-w-0 flex-1 text-left">
                        <p className="truncate font-medium text-sm">{dm.display_name || dm.username}</p>
                        {dm.last_message_preview && (
                          <p className="truncate text-xs text-[#52525b]">{dm.last_message_preview}</p>
                        )}
                      </div>
                    </button>
                  ))
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* User info footer */}
      <div className="flex-shrink-0 border-t border-[#27272a] p-3">
        <div className="flex items-center gap-2.5">
          <div className="relative flex-shrink-0">
            <UserAvatar user={user} size="sm" />
            <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-[#10b981] border-2 border-[#18181b]" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">{user?.display_name || user?.username}</p>
            <p className="text-xs text-[#71717a] truncate">@{user?.username}</p>
          </div>
          <button onClick={handleLogout} className="p-1.5 rounded-lg text-[#71717a] hover:text-red-400 hover:bg-red-500/10 transition-colors" data-testid="sidebar-logout-button" title="Sign out">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Modals */}
      <CreateChannelModal open={showCreateChannel} onClose={() => setShowCreateChannel(false)} onCreated={loadChannels} />
      <CreateGroupModal open={showCreateGroup} onClose={() => setShowCreateGroup(false)} onCreated={loadGroups} />
      <NewDmModal open={showNewDm} onClose={() => setShowNewDm(false)} onSelect={(dm) => { selectDM(dm); loadDMs(); }} />
    </div>
  );
}

function SidebarItem({ icon, label, isActive, onClick, testId }) {
  return (
    <button
      data-testid={testId}
      onClick={onClick}
      className={`w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-sm transition-colors ${isActive ? "bg-[#6366f1]/15 text-white font-medium" : "text-[#a1a1aa] hover:text-white hover:bg-[#27272a]"}`}
    >
      <span className={isActive ? "text-[#818cf8]" : "text-[#71717a]"}>{icon}</span>
      <span className="truncate">{label}</span>
    </button>
  );
}
