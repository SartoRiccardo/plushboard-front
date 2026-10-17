import { useCallback, useEffect, useState } from "react"
import {
  AtSign,
  Bird,
  Globe,
  Mail,
  MousePointerClick,
  Music2,
  Search,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { DailyLineChart } from "@/components/daily-line-chart"
import { api } from "@/lib/api"
import { fmtInt, romeDaysAgo, romeToday } from "@/lib/format"
import { cn } from "@/lib/utils"

interface BreakdownRow {
  key: string
  visitors: number
}

interface Traffic {
  status: "fresh" | "stale" | "error" | "never"
  error: string | null
  last_ok: string | null
  daily: { date: string; visitors: number }[]
  sources: BreakdownRow[]
  pages: BreakdownRow[]
  product_pages: { visitors: number }
  realtime: number | null
}

type Preset = "7d" | "28d" | "custom"

function rangeFor(preset: Preset): { from?: string; to: string } {
  if (preset === "7d") return { from: romeDaysAgo(6), to: romeToday() }
  return { from: romeDaysAgo(27), to: romeToday() }
}

// source name → icon (best-effort brand mapping; anything else gets a globe)
function sourceIcon(key: string): LucideIcon {
  const k = key.toLowerCase()
  if (k.includes("direct")) return MousePointerClick
  if (k.includes("instagram") || k === "ig") return AtSign
  if (k.includes("twitter") || k.includes("t.co")) return Bird
  if (k.includes("gmail")) return Mail
  if (k.includes("mail")) return Mail
  if (k.includes("tiktok")) return Music2
  if (k.includes("google") || k.includes("search")) return Search
  return Globe
}

const HIDDEN_KEY = "traffic-hidden-pages"

export function Traffic() {
  const [preset, setPreset] = useState<Preset>("7d")
  const [custom, setCustom] = useState({ from: "", to: "" })
  const [data, setData] = useState<Traffic | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [hidden, setHidden] = useState<string[]>(
    () => JSON.parse(localStorage.getItem(HIDDEN_KEY) ?? "[]"),
  )
  const [showHidden, setShowHidden] = useState(false)
  const [confirm, setConfirm] = useState<{ key: string; hide: boolean } | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (preset === "custom") {
      if (custom.from) params.set("from", custom.from)
      if (custom.to) params.set("to", custom.to)
    } else {
      const r = rangeFor(preset)
      params.set("from", r.from!)
      params.set("to", r.to)
    }
    try {
      setData(await api<Traffic>(`/api/plausible/latest?${params}`))
      setLoadError(null)
    } catch (e) {
      setLoadError(String(e))
    } finally {
      setLoading(false)
    }
  }, [preset, custom])

  useEffect(() => {
    load()
  }, [load])

  const toggleHidden = (key: string) => {
    const next = hidden.includes(key)
      ? hidden.filter((k) => k !== key)
      : [...hidden, key]
    setHidden(next)
    localStorage.setItem(HIDDEN_KEY, JSON.stringify(next))
    setConfirm(null)
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-2">
        <h1 className="text-lg font-semibold">Traffic</h1>
        <a
          href="https://analytics.sarto.dev/smallplushies.com"
          target="_blank"
          rel="noreferrer"
          title="Open Plausible"
          className="text-muted-foreground hover:text-foreground"
        >
          <Globe className="size-4" />
        </a>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <ToggleGroup
          value={preset ? [preset] : []}
          onValueChange={(v: string[]) => {
            if (v.length) setPreset(v[v.length - 1] as Preset)
          }}
          size="sm"
          variant="outline"
        >
          <ToggleGroupItem value="7d">7d</ToggleGroupItem>
          <ToggleGroupItem value="28d">28d</ToggleGroupItem>
          <ToggleGroupItem value="custom">Custom</ToggleGroupItem>
        </ToggleGroup>
        {preset === "custom" && (
          <div className="flex items-center gap-2 text-sm">
            <input
              type="date"
              className="rounded-md border bg-background px-2 py-1"
              value={custom.from}
              onChange={(e) => setCustom((c) => ({ ...c, from: e.target.value }))}
            />
            <span className="text-muted-foreground">→</span>
            <input
              type="date"
              className="rounded-md border bg-background px-2 py-1"
              value={custom.to}
              onChange={(e) => setCustom((c) => ({ ...c, to: e.target.value }))}
            />
          </div>
        )}
      </div>

      {loadError && (
        <Alert variant="destructive">
          <AlertTitle>Could not load</AlertTitle>
          <AlertDescription>{loadError}</AlertDescription>
        </Alert>
      )}

      {data?.status === "error" && (
        <Alert variant="destructive">
          <AlertTitle>Plausible upstream error — showing last good data</AlertTitle>
          <AlertDescription>{data.error}</AlertDescription>
        </Alert>
      )}

      {!data && loading && <Skeleton className="h-64" />}

      {data && (
        <>
          <div className="flex items-end gap-3">
            <div>
              <div className="text-sm text-muted-foreground">Visitors in range</div>
              <div className="text-4xl font-semibold tracking-tight tabular-nums">
                {fmtInt(data.daily.reduce((a, d) => a + d.visitors, 0))}
              </div>
            </div>
          </div>

          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <div className="flex items-center gap-2">
                <CardTitle className="text-sm font-medium">Daily visitors</CardTitle>
                {data.realtime != null && (
                  <Badge variant="outline" className="gap-1.5 px-1.5 py-0 text-[10px]">
                    <span className="size-1.5 rounded-full bg-[#0ca30c]" />
                    {data.realtime} now
                  </Badge>
                )}
              </div>
              <span className="text-xs text-muted-foreground">
                today in progress
              </span>
            </CardHeader>
            <CardContent>
              {data.daily.length > 0 ? (
                <DailyLineChart data={data.daily} valueKey="visitors" unit="visitors" />
              ) : (
                <p className="text-sm text-muted-foreground">
                  never fetched — the scheduler runs every 15m
                </p>
              )}
            </CardContent>
          </Card>

          <section className="flex flex-col gap-2">
            <h2 className="text-sm font-medium text-muted-foreground">Sources</h2>
            {data.sources.length === 0 ? (
              <p className="text-sm text-muted-foreground">no data yet</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Source</TableHead>
                    <TableHead className="text-right">Visitors</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.sources.map((r) => {
                    const Icon = sourceIcon(r.key)
                    return (
                      <TableRow key={r.key}>
                        <TableCell>
                          <span className="flex items-center gap-2">
                            <Icon className="size-3.5 shrink-0 text-muted-foreground" />
                            {r.key}
                          </span>
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {fmtInt(r.visitors)}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            )}
          </section>

          <section className="flex flex-col gap-2">
            <div className="flex items-center gap-3">
              <h2 className="text-sm font-medium text-muted-foreground">Top pages</h2>
              {hidden.length > 0 && (
                <button
                  className="text-xs text-muted-foreground hover:text-foreground"
                  onClick={() => setShowHidden((s) => !s)}
                >
                  {showHidden ? "hide hidden rows" : `show hidden rows (${hidden.length})`}
                </button>
              )}
            </div>
            {data.pages.length === 0 ? (
              <p className="text-sm text-muted-foreground">no data yet</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Page</TableHead>
                    <TableHead className="text-right">Visitors</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.pages
                    .filter((r) => showHidden || !hidden.includes(r.key))
                    .map((r) => {
                      const isHidden = hidden.includes(r.key)
                      return (
                        <TableRow
                          key={r.key}
                          className="cursor-pointer"
                          onClick={() => setConfirm({ key: r.key, hide: !isHidden })}
                        >
                          <TableCell
                            className={cn(
                              "max-w-64 truncate",
                              isHidden && "text-muted-foreground/50",
                            )}
                          >
                            {r.key}
                          </TableCell>
                          <TableCell
                            className={cn(
                              "text-right tabular-nums",
                              isHidden && "text-muted-foreground/50",
                            )}
                          >
                            {fmtInt(r.visitors)}
                          </TableCell>
                        </TableRow>
                      )
                    })}
                </TableBody>
              </Table>
            )}
          </section>

        </>
      )}

      <AlertDialog open={confirm != null} onOpenChange={(o) => !o && setConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogTitle>
            {confirm?.hide ? "Hide" : "Unhide"} {confirm?.key}?
          </AlertDialogTitle>
          <AlertDialogDescription>
            {confirm?.hide
              ? "Hidden pages drop out of the list (they come back via \"show hidden rows\")."
              : "The page returns to the normal list."}
          </AlertDialogDescription>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => confirm && toggleHidden(confirm.key)}>
              {confirm?.hide ? "Hide" : "Unhide"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
