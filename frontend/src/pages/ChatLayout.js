import { useState, useEffect } from "react";
import { Routes, Route, useNavigate, useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X } from "lucide-react";
import { useChat } from "@/contexts/ChatContext";
import Sidebar from "@/components/Sidebar";
import ChatView from "@/components/ChatView";
import RightPanel from "@/components/RightPanel";
import ConnectionStatus from "@/components/ConnectionStatus";

function getDmRoomId(userId1, userId2) {
  return `dm_${[userId1, userId2].sort().join("_")}`;
}

export default function ChatLayout() {
  const { activeRoom, setActiveRoom, channels, groups, dmList } = useChat();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [rightPanelOpen, setRightPanelOpen] = useState(false);
  const navigate = useNavigate();

  // Auto-select first channel on mount
  useEffect(() => {
    if (!activeRoom && channels.length > 0) {
      const general = channels.find(c => c.name === "general") || channels[0];
      setActiveRoom({ type: "channel", id: general.id, name: general.name, description: general.description });
    }
  }, [channels]);

  return (
    <div className="h-screen w-full flex overflow-hidden bg-[#09090b] text-[#fafafa]" data-testid="chat-layout">
      {/* Mobile overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/60 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.div
        className={`fixed lg:relative z-50 lg:z-auto h-full flex-shrink-0 ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}
        style={{ width: 260 }}
        transition={{ duration: 0.2 }}
      >
        <Sidebar onClose={() => setSidebarOpen(false)} />
      </motion.div>

      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0 relative">
        {/* Mobile header */}
        <div className="flex items-center gap-3 px-4 h-14 border-b border-[#27272a] lg:hidden bg-[#09090b]">
          <button onClick={() => setSidebarOpen(true)} className="p-2 rounded-lg text-[#a1a1aa] hover:text-white hover:bg-[#27272a] transition-colors" data-testid="mobile-menu-button">
            <Menu className="w-5 h-5" />
          </button>
          {activeRoom && (
            <div className="flex items-center gap-2">
              <span className="text-[#a1a1aa]">{activeRoom.type === "channel" ? "#" : activeRoom.type === "group" ? "G" : "@"}</span>
              <span className="font-medium text-white text-sm">{activeRoom.name}</span>
            </div>
          )}
        </div>

        <div className="flex-1 flex min-h-0">
          <div className="flex-1 flex flex-col min-w-0">
            {activeRoom ? (
              <ChatView onToggleRightPanel={() => setRightPanelOpen(p => !p)} rightPanelOpen={rightPanelOpen} />
            ) : (
              <EmptyState />
            )}
          </div>

          {/* Right panel */}
          <AnimatePresence>
            {(rightPanelOpen || (typeof window !== "undefined" && window.innerWidth >= 1024)) && activeRoom && (
              <motion.div
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: 272, opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="hidden lg:block flex-shrink-0 border-l border-[#27272a] overflow-hidden"
              >
                <RightPanel />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <ConnectionStatus />
    </div>
  );
}

function EmptyState() {
  return (
    <div
      className="flex-1 flex flex-col items-center justify-center p-8"
      style={{
        backgroundImage: `radial-gradient(ellipse at center, rgba(99,102,241,0.05) 0%, transparent 70%)`,
      }}
    >
      <div className="w-16 h-16 rounded-2xl bg-[#18181b] border border-[#27272a] flex items-center justify-center mb-4">
        <span className="font-outfit text-3xl font-bold text-[#6366f1]">P</span>
      </div>
      <h2 className="font-outfit text-2xl font-semibold text-white mb-2">Welcome to Parlance</h2>
      <p className="text-[#a1a1aa] text-center max-w-sm">Select a channel, group, or direct message from the sidebar to start chatting.</p>
    </div>
  );
}
