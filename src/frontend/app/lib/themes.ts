// Theme colors shared across the app
export const themeColors = {
  growth: {
    name: "Growth Mindset",
    icon: "🌱",
    bg: "bg-[#e97b4f]/10",
    border: "border-[#e97b4f]/30",
    text: "text-[#e97b4f]",
    color: "#e97b4f",
  },
  selfcare: {
    name: "Self-Care",
    icon: "💝",
    bg: "bg-[#f4a261]/10",
    border: "border-[#f4a261]/30",
    text: "text-[#f4a261]",
    color: "#f4a261",
  },
  motivation: {
    name: "Motivation",
    icon: "🔥",
    bg: "bg-[#e9c46a]/10",
    border: "border-[#e9c46a]/30",
    text: "text-[#e9c46a]",
    color: "#e9c46a",
  },
  confidence: {
    name: "Confidence",
    icon: "💪",
    bg: "bg-[#a8dadc]/10",
    border: "border-[#a8dadc]/30",
    text: "text-[#a8dadc]",
    color: "#a8dadc",
  },
  mindfulness: {
    name: "Mindfulness",
    icon: "🧘",
    bg: "bg-[#457b9d]/10",
    border: "border-[#457b9d]/30",
    text: "text-[#457b9d]",
    color: "#457b9d",
  },
};

export type ThemeId = keyof typeof themeColors;
