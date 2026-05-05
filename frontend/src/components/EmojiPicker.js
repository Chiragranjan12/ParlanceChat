import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { X } from "lucide-react";

const EMOJI_ROWS = [
  ["👍", "👎", "❤️", "😂", "😮", "😢", "😡", "🎉"],
  ["🙏", "🔥", "✅", "💯", "🚀", "💪", "👀", "🤔"],
  ["😍", "🤣", "😎", "🥳", "😤", "🤯", "🥺", "😴"],
  ["🌟", "💡", "⚡", "🎯", "🏆", "💎", "🌈", "🍕"],
];

export default function EmojiPicker({ onSelect, onClose }) {
  const ref = useRef(null);

  useEffect(() => {
    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        onClose?.();
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [onClose]);

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, scale: 0.95, y: 4 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.1 }}
      className="bg-[#18181b] border border-[#27272a] rounded-xl shadow-2xl p-3 w-52"
      data-testid="emoji-picker"
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-[#a1a1aa]">Reactions</span>
        <button onClick={onClose} className="text-[#52525b] hover:text-[#a1a1aa] transition-colors">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
      {EMOJI_ROWS.map((row, ri) => (
        <div key={ri} className="flex gap-1 mb-1">
          {row.map((emoji) => (
            <button
              key={emoji}
              onClick={() => onSelect(emoji)}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#27272a] transition-colors text-lg"
              data-testid={`emoji-option-${emoji}`}
            >
              {emoji}
            </button>
          ))}
        </div>
      ))}
    </motion.div>
  );
}
