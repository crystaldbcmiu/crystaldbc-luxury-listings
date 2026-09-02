/**
 * Hex values mirroring the dark tokens in client/src/index.css.
 * Use these where a raw color is required (navigation options, SVG, StatusBar);
 * prefer Tailwind classes everywhere else.
 */
export const colors = {
  background: "#131720",
  foreground: "#F5F3F0",
  card: "#191E29",
  border: "#29303D",
  muted: "#29303D",
  mutedForeground: "#A89E8A",
  gold: "#D8A631",
  goldLight: "#E2BE69",
  goldDark: "#AB8221",
  destructive: "#CC3333",
  success: "#3FA96A",
  warning: "#D9903A",
} as const;

export const statusColors: Record<string, string> = {
  Pending: colors.warning,
  Approved: colors.success,
  Rejected: colors.destructive,
  Declined: colors.destructive,
  Paid: colors.success,
  "Partially Paid": colors.warning,
  "Not Paid": colors.destructive,
};
