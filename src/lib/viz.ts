// Chart parameters — dataviz reference palette, dark mode (validated set).
export const VIZ = {
  series1: "#3987e5", // categorical slot 1, dark step
  series1InProgress: "#86b6ef", // lighter step for today's partial bar
  grid: "#2c2c2a", // hairline gridline, dark
  axis: "#898781", // muted tick text
  up: "#0ca30c", // delta-up good, dark
  down: "#d03b3b", // delta-down, dark
  surface: "#1a1a19",
}

// Categorical slots 1–8, dark steps (validated order — never re-sort).
const PALETTE = [
  "#3987e5", "#d95926", "#199e70", "#c98500",
  "#d55181", "#008300", "#9085e9", "#e66767",
]

/** Entity-stable series color: hash of the name picks the palette slot, so a
 * product keeps its color across charts and refreshes. >8 series folds —
 * collisions just share a color. */
export function seriesColor(name: string): string {
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0
  return PALETTE[h % PALETTE.length]
}
