import UserAvatar from "@/components/UserAvatar";
import { formatRelativeTime } from "@/utils/dateUtils";

export default function DMList({ conversations, activeRoom, onlineUsers, onSelect }) {
  if (!conversations.length) {
    return <p className="px-4 py-2 text-xs text-[#52525b]">No conversations yet</p>;
  }

  return conversations.map(dm => (
    <button
      key={dm.room_id || dm.id}
      type="button"
      data-testid={`dm-item-${dm.username}`}
      onClick={() => onSelect(dm)}
      className={`w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-sm transition-colors ${activeRoom?.id === dm.room_id ? "bg-[#6366f1]/15 text-white" : "text-[#a1a1aa] hover:text-white hover:bg-[#27272a]"}`}
    >
      <div className="relative flex-shrink-0">
        <UserAvatar user={dm} size="sm" />
        <div className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-[#18181b] ${onlineUsers.has(dm.id) || dm.is_online || dm.isOnline ? "bg-[#10b981]" : "bg-[#71717a]"}`} />
      </div>
      <div className="min-w-0 flex-1 text-left">
        <div className="flex items-center gap-2">
          <p className="truncate font-medium text-sm">{dm.display_name || dm.displayName || dm.username}</p>
          {dm.last_message_at && (
            <span className="ml-auto flex-shrink-0 text-[10px] text-[#52525b]">{formatRelativeTime(dm.last_message_at)}</span>
          )}
        </div>
        {dm.last_message_preview && (
          <p className="truncate text-xs text-[#52525b]">{dm.last_message_preview}</p>
        )}
      </div>
    </button>
  ));
}
