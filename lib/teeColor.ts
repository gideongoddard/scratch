const TEE_COLORS: Record<string, string> = {
  white: "#f5f5f0",
  yellow: "#e8c547",
  gold: "#d4af37",
  blue: "#3b6bc9",
  red: "#c9433b",
  black: "#2a2a28",
  green: "#3e8a54",
  orange: "#e07a2c",
  silver: "#b8bcc0",
  championship: "#2a2a28",
};

/** Best-effort literal colour for a course tee name — these mirror real
 * tee-marker colours on the course, so showing the actual colour is a
 * recognition aid, not an arbitrary categorical assignment. */
export function teeMarkerColor(tee: string): string | null {
  const key = tee.trim().toLowerCase();
  for (const [name, color] of Object.entries(TEE_COLORS)) {
    if (key.includes(name)) return color;
  }
  return null;
}
