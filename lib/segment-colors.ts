export const SEGMENT_COLORS: Record<string, { fg: string; bg: string }> = {
  "Champions": { fg: "var(--seg-champions)", bg: "var(--seg-champions-bg)" },
  "Loyal": { fg: "var(--seg-loyal)", bg: "var(--seg-loyal-bg)" },
  "New / Potential": { fg: "var(--seg-new)", bg: "var(--seg-new-bg)" },
  "At Risk": { fg: "var(--seg-atrisk)", bg: "var(--seg-atrisk-bg)" },
  "Dormant": { fg: "var(--seg-dormant)", bg: "var(--seg-dormant-bg)" },
  "Needs Attention": { fg: "var(--seg-needs)", bg: "var(--seg-needs-bg)" },
};

export function segmentColor(segment: string): { fg: string; bg: string } {
  return SEGMENT_COLORS[segment] ?? { fg: "var(--muted)", bg: "var(--surface-2)" };
}

export const CHANNEL_COLORS: Record<string, string> = {
  whatsapp: "#16a34a",
  sms: "#2f6fed",
  email: "#7c3aed",
  digital: "#d97706",
};

export function channelColor(channel: string): string {
  return CHANNEL_COLORS[channel] ?? "var(--muted)";
}
