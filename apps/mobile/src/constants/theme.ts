import { useColorScheme } from "react-native";

const light = {
  text: "#0F172A",
  textSecondary: "#64748B",
  background: "#F8FAFC",
  card: "#FFFFFF",
  border: "#E2E8F0",
  primary: "#4F46E5",
  primaryText: "#FFFFFF",
  danger: "#B91C1C",
  warningBg: "#FEF3C7",
  warningText: "#78350F",
  successBg: "#D1FAE5",
  successText: "#065F46",
  chip: "#EEF2FF",
};

const dark: typeof light = {
  text: "#E2E8F0",
  textSecondary: "#94A3B8",
  background: "#0B1120",
  card: "#111827",
  border: "#1E293B",
  primary: "#818CF8",
  primaryText: "#0B1120",
  danger: "#F87171",
  warningBg: "#451A03",
  warningText: "#FDE68A",
  successBg: "#064E3B",
  successText: "#A7F3D0",
  chip: "#1E1B4B",
};

export const Colors = { light, dark };
export type Palette = typeof light;

export function useTheme(): Palette {
  return useColorScheme() === "dark" ? dark : light;
}

/** Course accent colours, picked by a stable hash of the course id. */
export const COURSE_COLORS = ["#6366F1", "#10B981", "#F59E0B", "#F43F5E", "#0EA5E9", "#8B5CF6"];
export function courseColor(id: string): string {
  let h = 0;
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return COURSE_COLORS[h % COURSE_COLORS.length];
}

export const Space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 } as const;
