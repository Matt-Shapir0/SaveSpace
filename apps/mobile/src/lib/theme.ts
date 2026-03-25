export const colors = {
  background: "#f6f1ea",
  card: "#fffaf4",
  surface: "#f0e7dc",
  border: "#e7d8c6",
  text: "#2d2118",
  muted: "#7b6858",
  primary: "#d96f45",
  primarySoft: "#f3dfd2",
  danger: "#b44f3f",
  success: "#5d8b6d",
};

export const themeColors = {
  growth: {
    name: "Growth Mindset",
    icon: "🌱",
    color: "#e97b4f",
  },
  selfcare: {
    name: "Self-Care",
    icon: "💝",
    color: "#f4a261",
  },
  motivation: {
    name: "Motivation",
    icon: "🔥",
    color: "#e9c46a",
  },
  confidence: {
    name: "Confidence",
    icon: "💪",
    color: "#a8dadc",
  },
  mindfulness: {
    name: "Mindfulness",
    icon: "🧘",
    color: "#457b9d",
  },
};

export type ThemeId = keyof typeof themeColors;
