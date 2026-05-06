/**
 * Design Tokens for ParlanceChat
 * Extracted from design_guidelines.json
 */

export const designTokens = {
  theme: "dark",
  archetype: "Swiss & High-Contrast mixed with Jewel & Luxury (Premium Dark Mode SaaS)",
  domain: "Productivity & Team Communication",

  colors: {
    backgroundBase: "#09090b",
    backgroundSidebar: "#18181b",
    backgroundPanel: "rgba(24, 24, 27, 0.5)",
    backgroundMessageHover: "#27272a",
    primaryAccent: "#6366f1",
    primaryAccentHover: "#4f46e5",
    statusOnline: "#10b981",
    statusOffline: "#71717a",
    statusIdle: "#f59e0b",
    statusDnd: "#ef4444",
    textPrimary: "#fafafa",
    textSecondary: "#a1a1aa",
    textAccent: "#818cf8",
    borderSubtle: "#27272a"
  },

  typography: {
    headingFont: "Outfit, sans-serif",
    bodyFont: "Inter, sans-serif",
    scale: {
      h1: "text-4xl sm:text-5xl tracking-tight font-bold",
      h2: "text-2xl sm:text-3xl tracking-tight font-semibold",
      h3: "text-xl sm:text-2xl font-medium",
      body: "text-base leading-relaxed",
      message: "text-[15px] leading-relaxed",
      small: "text-sm text-secondary",
      tinyLabel: "text-xs uppercase tracking-[0.2em]"
    }
  },

  layout: {
    spacingScale: "generous",
    gridStrategy: "Control Room Grid (Dense & Structured)",
    structure: {
      appContainer: "h-screen w-full flex overflow-hidden bg-[#09090b] text-[#fafafa]",
      sidebar: "w-64 flex-shrink-0 border-r border-[#27272a] bg-[#18181b] flex flex-col",
      mainChat: "flex-1 flex flex-col min-w-0 bg-[#09090b]",
      rightPanel: "w-72 flex-shrink-0 border-l border-[#27272a] bg-[#18181b]/50 hidden lg:flex flex-col"
    }
  },

  components: {
    buttons: "Shadcn UI Buttons, customized with primary accent color and crisp edges (rounded-md). Include hover states (lighter hue) and focus rings (ring-2 ring-primary/50).",
    inputs: "Shadcn UI Inputs, bg-zinc-900 border-zinc-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-md.",
    chatMessage: "Optical alignment with avatar on left. Generous line height. Hover state slightly highlights the message row (bg-zinc-800/30). Group consecutive messages from the same user (hide avatar/name on subsequent messages within 5 mins).",
    presenceIndicator: "Absolute positioned bottom-right of avatar, circular, 3px border matching parent background to cut out the avatar.",
    scrollbars: "Custom thin scrollbars, dark thumb, no gutter.",
    modalsDialogs: "Shadcn Dialog with Glassmorphism overlay (backdrop-blur-sm bg-black/60). Dialog body solid bg-zinc-950 border border-zinc-800."
  },

  motion: {
    hoverStates: "transition-colors duration-200 ease-in-out",
    messageEntrance: "Framer motion staggered fade-up for new messages (y: 10, opacity: 0 -> y: 0, opacity: 1, duration: 0.2s)",
    typingIndicator: "3-dot bouncing animation using framer-motion (staggerChildren, repeat: Infinity)"
  },

  media: {
    loginBackground: {
      url: "https://images.unsplash.com/photo-1760992795200-52321e30d64c?crop=entropy&cs=srgb&fm=jpg&q=85",
      description: "Abstract glowing crosses against dark background"
    },
    avatars: [
      {
        url: "https://images.unsplash.com/photo-1601944294379-2947903604da?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA1MDZ8MHwxfHNlYXJjaHwzfHxwb3J0cmFpdCUyMG1vZGVybnxlbnwwfHx8fDE3NzgwMDk0NDl8MA&ixlib=rb-4.1.0&q=85",
        description: "Woman in black crew neck"
      },
      {
        url: "https://images.unsplash.com/photo-1757773871358-2ee450d2d9e8?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA1MDZ8MHwxfHNlYXJjaHwxfHxwb3J0cmFpdCUyMG1vZGVybnxlbnwwfHx8fDE3NzgwMDk0NDl8MA&ixlib=rb-4.1.0&q=85",
        description: "Man with braided hair"
      },
      {
        url: "https://images.unsplash.com/photo-1519744434498-a0de604df9db?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA1MDZ8MHwxfHNlYXJjaHwxfHxwb3J0cmFpdCUyMG1vZGVybnxlbnwwfHx8fDE3NzgwMDk0NDl8MA&ixlib=rb-4.1.0&q=85",
        description: "Woman in white shirt"
      }
    ]
  },

  accessibilityAndTesting: {
    dataTestidRule: "ALL interactive elements MUST include a data-testid attribute (e.g., data-testid='login-submit-button', data-testid='message-input')",
    contrast: "Ensure minimum 4.5:1 ratio for text. Use APCA guidelines.",
    focus: "Clear focus rings on keyboard navigation."
  }
};