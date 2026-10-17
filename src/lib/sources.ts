export type SourceStatus = "fresh" | "stale" | "error" | "never"

// Nav item → upstream source owning its status dot. `null` = no dot.
export interface NavItem {
  label: string
  path: string
  source: string | null
}

// Slice 1 wires real statuses from /api/overview; until then every dot reads "never".
export const NAV: NavItem[] = [
  { label: "Overview", path: "/", source: null },
  { label: "Traffic", path: "/traffic", source: "plausible" },
  { label: "Search", path: "/search", source: "gsc" },
  { label: "Merchant", path: "/merchant", source: "mc" },
  { label: "GEO", path: "/geo", source: "giphy" },
  { label: "Keywords", path: "/keywords", source: "dataforseo" },
  { label: "Backlinks", path: "/backlinks", source: "dataforseo" },
  { label: "Sales", path: "/sales", source: null },
  { label: "Finance", path: "/finance", source: null },
  { label: "Settings", path: "/settings", source: null },
]
