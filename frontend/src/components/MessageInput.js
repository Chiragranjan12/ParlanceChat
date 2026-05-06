import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, X, Smile, Reply } from "lucide-react";
import { useChat } from "@/contexts/ChatContext";
import EmojiPicker from "@/components/EmojiPicker";

export default function MessageInput({ replyTo, onCancelReply, roomName }) {
  const { sendMessage, sendTyping, activeRoom } = useChat();
  const [content, setContent] = useState("");
  const [showEmoji, setShowEmoji] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const textareaRef = useRef(null);
  const typingTimerRef = useRef(null);
  const isTypingRef = useRef(false);

  // Reset content when room changes
  useEffect(() => {
    setContent("");
    setShowEmoji(false);
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  }, [activeRoom?.id]);

  const handleTyping = useCallback(() => {
    if (!isTypingRef.current) {
      isTypingRef.current = true;
      sendTyping(true);
    }
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => {
      isTypingRef.current = false;
      sendTyping(false);
    }, 2000);
  }, [sendTyping]);

  const handleChange = (e) => {
    setContent(e.target.value);
    handleTyping();
    // Auto-resize
    const ta = e.target;
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 120) + "px";
  };

  const handleSubmit = async (e) => {
    e?.preventDefault();
    if (!content.trim() || isSending) return;
    const msg = content.trim();
    setContent("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
    // Stop typing
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    if (isTypingRef.current) { sendTyping(false); isTypingRef.current = false; }
    setIsSending(true);
    try {
      await sendMessage(msg, replyTo?.id || null);
      if (onCancelReply) onCancelReply();
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleEmojiSelect = (emoji) => {
    setContent(prev => prev + emoji);
    setShowEmoji(false);
    textareaRef.current?.focus();
  };

  const placeholder = activeRoom
    ? `Message ${roomName || activeRoom.name || "..."}`
    : "Select a channel to start messaging";

  return (
    <div className="relative" data-testid="message-input-container">
      {/* Reply preview */}
      <AnimatePresence>
        {replyTo && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="flex items-center gap-2 px-3 py-2 mb-1 rounded-t-lg bg-[#18181b] border border-b-0 border-[#27272a]"
          >
            <Reply className="w-4 h-4 text-[#6366f1] flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <span className="text-xs text-[#818cf8] font-medium">
                Replying to {replyTo.sender?.display_name || replyTo.sender?.username}
              </span>
              <p className="text-xs text-[#71717a] truncate">{replyTo.content}</p>
            </div>
            <button onClick={onCancelReply} className="text-[#52525b] hover:text-[#a1a1aa] transition-colors flex-shrink-0" data-testid="cancel-reply-button">
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input area */}
      <div className={`flex items-end gap-2 bg-[#18181b] border border-[#27272a] rounded-xl px-3 py-2.5 focus-within:border-[#6366f1]/50 transition-colors ${replyTo ? "rounded-t-none border-t-0" : ""}`}>
        <textarea
          ref={textareaRef}
          data-testid="message-input"
          value={content}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={!activeRoom}
          rows={1}
          className="flex-1 bg-transparent text-white text-sm placeholder-[#52525b] resize-none focus:outline-none leading-relaxed max-h-[120px] disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ minHeight: "24px" }}
        />

        <div className="flex items-center gap-1 flex-shrink-0 pb-0.5">
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowEmoji(p => !p)}
              className={`p-1.5 rounded-lg transition-colors ${showEmoji ? "text-[#818cf8] bg-[#6366f1]/10" : "text-[#52525b] hover:text-[#a1a1aa]"}`}
              data-testid="emoji-picker-button"
            >
              <Smile className="w-4 h-4" />
            </button>
            {showEmoji && (
              <div className="absolute bottom-full right-0 mb-2 z-20">
                <EmojiPicker onSelect={handleEmojiSelect} onClose={() => setShowEmoji(false)} />
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!content.trim() || !activeRoom || isSending}
            className="p-1.5 rounded-lg bg-[#6366f1] hover:bg-[#4f46e5] disabled:opacity-40 disabled:cursor-not-allowed text-white transition-colors"
            data-testid="send-message-button"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
