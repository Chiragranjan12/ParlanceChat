import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import { useChat } from "@/contexts/ChatContext";
import UserSearchResult from "@/components/UserSearchResult";

export default function DMSearch({ onSelectUser }) {
  const { searchUsers, getAllUsers, onlineUsers } = useChat();
  const [query, setQuery] = useState("");
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(async () => {
      setIsLoading(true);
      try {
        const results = query.trim()
          ? await searchUsers(query.trim())
          : await getAllUsers();
        if (!cancelled) setUsers(results);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }, 250);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, searchUsers, getAllUsers]);

  return (
    <div>
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#52525b]" />
        <input
          data-testid="dm-user-search"
          autoFocus
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search users..."
          className="w-full pl-9 pr-4 py-3 rounded-lg bg-[#18181b] border border-[#27272a] text-white placeholder-[#52525b] focus:outline-none focus:border-[#6366f1] transition-colors"
        />
      </div>

      <div className="space-y-1 max-h-64 overflow-y-auto">
        {isLoading ? (
          <p className="text-center text-[#52525b] text-sm py-4">Searching...</p>
        ) : users.length === 0 ? (
          <p className="text-center text-[#52525b] text-sm py-4">No users found</p>
        ) : (
          users.map(user => (
            <UserSearchResult
              key={user.id}
              user={user}
              isOnline={onlineUsers.has(user.id) || user.is_online || user.isOnline}
              onSelect={onSelectUser}
            />
          ))
        )}
      </div>
    </div>
  );
}
