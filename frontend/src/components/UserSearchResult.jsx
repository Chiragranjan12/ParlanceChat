import { MessageSquare } from "lucide-react";
import UserAvatar from "@/components/UserAvatar";

export default function UserSearchResult({ user, isOnline, onSelect }) {
  return (
    <button
      type="button"
      onClick={() => onSelect(user)}
      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-[#27272a] transition-colors"
      data-testid={`dm-select-${user.username}`}
    >
      <div className="relative flex-shrink-0">
        <UserAvatar user={user} size="sm" />
        <div className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-[#09090b] ${isOnline ? "bg-[#10b981]" : "bg-[#71717a]"}`} />
      </div>
      <div className="flex-1 text-left min-w-0">
        <p className="text-sm font-medium text-white truncate">{user.display_name || user.displayName || user.username}</p>
        <p className="text-xs text-[#52525b] truncate">@{user.username}</p>
      </div>
      <MessageSquare className="w-4 h-4 text-[#52525b]" />
    </button>
  );
}
