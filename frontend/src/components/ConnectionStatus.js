import { motion, AnimatePresence } from "framer-motion";
import { WifiOff, Wifi, Loader } from "lucide-react";
import { useChat } from "@/contexts/ChatContext";

export default function ConnectionStatus() {
  const { wsConnected } = useChat();

  // Only show banner when disconnected
  return (
    <AnimatePresence>
      {!wsConnected && (
        <motion.div
          initial={{ y: 60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 60, opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50"
          data-testid="connection-status-banner"
        >
          <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-[#18181b] border border-[#27272a] shadow-2xl">
            <Loader className="w-3.5 h-3.5 text-[#f59e0b] animate-spin" />
            <span className="text-sm text-[#a1a1aa] font-medium">Reconnecting...</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
