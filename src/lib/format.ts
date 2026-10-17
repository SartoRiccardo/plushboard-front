// Formatting helpers. Day semantics are Europe/Rome (spec §6).

export function fmtInt(n: number | null | undefined): string {
  if (n == null) return "–"
  return new Intl.NumberFormat("en-US").format(n)
}

export function fmtDelta(n: number | null | undefined): string {
  if (n == null) return ""
  const r = Math.round(n)
  return r > 0 ? `+${r}` : `${r}` // includes "0", "-3"
}

export function fmtDate(iso: string): string {
  return new Date(iso + "T00:00:00Z").toLocaleDateString("en-US", {
    month: "short", day: "numeric", timeZone: "UTC",
  })
}

export function relTime(iso: string | null | undefined): string {
  if (!iso) return "never"
  const s = (Date.now() - new Date(iso).getTime()) / 1000
  if (s < 60) return "just now"
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  return `${Math.floor(s / 86400)}d ago`
}

export function dayKey(isoTs: string): string {
  // Group timestamps by Europe/Rome calendar day.
  return new Date(isoTs).toLocaleDateString("en-CA", { timeZone: "Europe/Rome" })
}

export function dayLabel(key: string): string {
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Europe/Rome" })
  if (key === today) return "Today"
  return new Date(key + "T00:00:00Z").toLocaleDateString("en-US", {
    weekday: "short", month: "short", day: "numeric", timeZone: "UTC",
  })
}

export function romeToday(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Europe/Rome" })
}

export function romeDaysAgo(n: number): string {
  const d = new Date(Date.now() - n * 86400_000)
  return d.toLocaleDateString("en-CA", { timeZone: "Europe/Rome" })
}
