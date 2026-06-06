import { Circle } from "lucide-react";

export default function DMConversation({ room, isOnline }) {
  if (!room || room.type !== "dm") return null;

  return (
    <p className="text-xs text-[#71717a] hidden sm:flex items-center gap-1.5">
      <Circle className={`w-2 h-2 fill-current ${isOnline ? "text-[#10b981]" : "text-[#71717a]"}`} />
      <span>{isOnline ? "Online" : "Offline"}</span>
    </p>
  );
}
