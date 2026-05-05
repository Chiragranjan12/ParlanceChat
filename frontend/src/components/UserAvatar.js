export default function UserAvatar({ user, size = "md" }) {
  const sizes = {
    xs: "w-6 h-6 text-xs",
    sm: "w-8 h-8 text-sm",
    md: "w-10 h-10 text-base",
    lg: "w-12 h-12 text-lg",
    xl: "w-16 h-16 text-2xl",
  };

  const sizeClass = sizes[size] || sizes.md;
  const name = user?.display_name || user?.username || "?";
  const initials = name[0]?.toUpperCase() || "?";
  
  // Generate consistent color from username
  const colors = [
    "bg-[#6366f1]", "bg-[#8b5cf6]", "bg-[#ec4899]",
    "bg-[#10b981]", "bg-[#f59e0b]", "bg-[#3b82f6]", "bg-[#ef4444]"
  ];
  const colorIndex = (user?.username || "").split("").reduce((a, c) => a + c.charCodeAt(0), 0) % colors.length;
  const bgColor = colors[colorIndex];

  if (user?.avatar_url) {
    return (
      <img
        src={user.avatar_url}
        alt={name}
        className={`${sizeClass} rounded-full object-cover flex-shrink-0`}
        onError={(e) => {
          e.target.style.display = "none";
          e.target.nextSibling.style.display = "flex";
        }}
      />
    );
  }

  return (
    <div className={`${sizeClass} ${bgColor} rounded-full flex items-center justify-center font-semibold text-white flex-shrink-0`}>
      {initials}
    </div>
  );
}
