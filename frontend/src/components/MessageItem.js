import { useState } from "react";
import { motion } from "framer-motion";
import { Reply, Smile, MoreHorizontal, Edit2, Trash2, Check } from "lucide-react";
import { useChat } from "@/contexts/ChatContext";
import { useAuth } from "@/contexts/AuthContext";
import UserAvatar from "@/components/UserAvatar";
import EmojiPicker from "@/components/EmojiPicker";
import { formatTime, formatRelativeDate } from "@/utils/dateUtils";

export default function MessageItem({ message, isGrouped, showHeader, onReply, isOwn, index }) {
  const { addReaction, editMessage, deleteMessage } = useChat();
  const { user } = useAuth();
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content);
  const [showActions, setShowActions] = useState(false);

  if (message.is_deleted) {
    return (
      <div className={`flex gap-3 px-2 py-0.5 ${isGrouped ? "pl-12" : ""}`}>
        <p className="text-sm text-[#52525b] italic">This message was deleted</p>
      </div>
    );
  }

  const handleReaction = (emoji) => {
    addReaction(message.id, emoji);
    setShowEmojiPicker(false);
  };

  const handleEdit = async () => {
    if (editContent.trim() && editContent !== message.content) {
      await editMessage(message.id, editContent.trim());
    }
    setIsEditing(false);
  };

  const handleDelete = async () => {
    if (window.confirm("Delete this message?")) {
      await deleteMessage(message.id);
    }
  };

  const sender = message.sender || {};
  const senderName = sender.display_name || sender.username || "Unknown";

  return (
    <motion.div
      initial={index < 3 ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.15 }}
      className="message-row group relative flex gap-3 px-2 py-0.5 rounded-lg hover:bg-[#27272a]/30 transition-colors"
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => { setShowActions(false); setShowEmojiPicker(false); }}
      data-testid={`message-${message.id}`}
    >
      {/* Avatar column */}
      <div className="w-9 flex-shrink-0 mt-0.5">
        {!isGrouped ? (
          <UserAvatar user={sender} size="sm" />
        ) : (
          <span className="text-[10px] text-[#52525b] text-right block pt-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {formatTime(message.created_at)}
          </span>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {!isGrouped && (
          <div className="flex items-baseline gap-2 mb-0.5">
            <span className="font-semibold text-sm text-white hover:underline cursor-pointer">{senderName}</span>
            <span className="text-xs text-[#52525b]">{formatTime(message.created_at)}</span>
            {message.edited_at && <span className="text-xs text-[#52525b] italic">(edited)</span>}
          </div>
        )}

        {/* Reply preview */}
        {message.reply_preview && (
          <div className="flex items-start gap-1.5 mb-1 pl-2 border-l-2 border-[#6366f1]/60">
            <div>
              <span className="text-xs font-medium text-[#818cf8]">{message.reply_preview.sender_name}</span>
              <p className="text-xs text-[#71717a] truncate max-w-xs">{message.reply_preview.content}</p>
            </div>
          </div>
        )}

        {/* Message content */}
        {isEditing ? (
          <div className="space-y-2">
            <textarea
              data-testid="edit-message-input"
              value={editContent}
              onChange={e => setEditContent(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleEdit(); } if (e.key === "Escape") setIsEditing(false); }}
              className="w-full px-3 py-2 rounded-lg bg-[#27272a] border border-[#6366f1] text-white text-sm focus:outline-none resize-none"
              rows={2}
              autoFocus
            />
            <div className="flex gap-2 text-xs">
              <button onClick={handleEdit} className="flex items-center gap-1 text-[#10b981] hover:text-emerald-400">
                <Check className="w-3 h-3" /> Save
              </button>
              <button onClick={() => { setIsEditing(false); setEditContent(message.content); }} className="text-[#a1a1aa] hover:text-white">Cancel</button>
            </div>
          </div>
        ) : (
          <p className="text-[15px] text-[#e4e4e7] leading-relaxed whitespace-pre-wrap break-words">{message.content}</p>
        )}

        {/* Reactions */}
        {message.reactions && Object.keys(message.reactions).length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1.5">
            {Object.entries(message.reactions).map(([emoji, data]) => (
              <button
                key={emoji}
                onClick={() => handleReaction(emoji)}
                data-testid={`reaction-${emoji}`}
                className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border transition-colors ${data.users.includes(user?.id) ? "bg-[#6366f1]/20 border-[#6366f1]/50 text-[#818cf8]" : "bg-[#27272a] border-[#3f3f46] text-[#a1a1aa] hover:border-[#6366f1]/30"}`}
              >
                <span>{emoji}</span>
                <span>{data.count}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Action buttons (hover) */}
      {showActions && !isEditing && (
        <div className="message-actions absolute right-2 -top-4 flex items-center gap-0.5 bg-[#18181b] border border-[#27272a] rounded-lg px-1 py-0.5 shadow-lg z-10">
          <button onClick={() => setShowEmojiPicker(p => !p)} className="p-1.5 rounded-md text-[#a1a1aa] hover:text-white hover:bg-[#27272a] transition-colors" title="Add reaction" data-testid="add-reaction-button">
            <Smile className="w-3.5 h-3.5" />
          </button>
          <button onClick={onReply} className="p-1.5 rounded-md text-[#a1a1aa] hover:text-white hover:bg-[#27272a] transition-colors" title="Reply" data-testid="reply-button">
            <Reply className="w-3.5 h-3.5" />
          </button>
          {isOwn && (
            <>
              <button onClick={() => setIsEditing(true)} className="p-1.5 rounded-md text-[#a1a1aa] hover:text-white hover:bg-[#27272a] transition-colors" title="Edit" data-testid="edit-message-button">
                <Edit2 className="w-3.5 h-3.5" />
              </button>
              <button onClick={handleDelete} className="p-1.5 rounded-md text-[#a1a1aa] hover:text-red-400 hover:bg-red-500/10 transition-colors" title="Delete" data-testid="delete-message-button">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </>
          )}
        </div>
      )}

      {/* Emoji picker dropdown */}
      {showEmojiPicker && (
        <div className="absolute right-2 top-6 z-20">
          <EmojiPicker onSelect={handleReaction} onClose={() => setShowEmojiPicker(false)} />
        </div>
      )}
    </motion.div>
  );
}
