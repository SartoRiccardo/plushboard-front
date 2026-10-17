import { useCallback, useEffect, useState } from "react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import { api } from "@/lib/api"
import { useOverview } from "@/hooks/use-overview"

interface SettingsPayload {
  settings: {
    intervals: Record<string, number>
    enabled: Record<string, boolean>
    giphy_tags: string[]
    tracked_keywords: string[]
    store_urls: string[]
    retention_days: number
    alert_rules: Record<string, boolean>
  }
  credentials: { var: string; set: boolean }[]
}

const SOURCES = ["plausible", "gsc", "mc", "giphy"]
const RULE_LABELS: Record<string, string> = {
  mc_review_cleared: "Merchant: review cleared",
  mc_disapproved: "Merchant: disapproved",
  mc_first_serving: "Merchant: first serving",
  gsc_first_click: "Search: first click on a page",
  gsc_new_query: "Search: new query",
  gsc_index_flip: "Search: index verdict changed",
  plausible_new_source: "Traffic: new source",
  plausible_spike: "Traffic: visitor spike",
  giphy_indexed: "GEO: channel indexed",
  giphy_tag_moved: "GEO: tag count moved",
  df_rank_change: "Keywords: rank moved ≥3",
  backlinks_change: "Backlinks: count changed",
}

export function Settings() {
  const [data, setData] = useState<SettingsPayload | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [saved, setSaved] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const { refresh: refreshOverview } = useOverview()

  const [lists, setLists] = useState<Record<string, string>>({})
  const [confirmWipe, setConfirmWipe] = useState("")

  const load = useCallback(async () => {
    try {
      const d = await api<SettingsPayload>("/api/settings")
      setData(d)
      setLists({
        giphy_tags: d.settings.giphy_tags.join("\n"),
        tracked_keywords: d.settings.tracked_keywords.join("\n"),
        store_urls: d.settings.store_urls.join("\n"),
      })
      setLoadError(null)
    } catch (e) {
      setLoadError(String(e))
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const put = async (k: string, v: unknown, label: string) => {
    setError(null)
    setSaved(null)
    try {
      await api("/api/settings", { method: "PUT", body: JSON.stringify({ k, v }) })
      setSaved(`${label} saved`)
      refreshOverview()
    } catch (e) {
      setError(String(e))
    }
  }

  const saveList = (key: keyof SettingsPayload["settings"], label: string) => {
    const items = (lists[key] ?? "")
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean)
    put(key, items, label)
  }

  const purge = async () => {
    const r = await api<{ deleted: number }>("/api/settings/purge", { method: "POST" })
    setSaved(`purged ${r.deleted} old snapshots`)
  }

  const wipe = async () => {
    setError(null)
    try {
      await api("/api/settings/wipe", {
        method: "POST",
        body: JSON.stringify({ confirm: confirmWipe }),
      })
      setConfirmWipe("")
      setSaved("all data wiped — hit Refresh to start a new baseline")
      refreshOverview()
    } catch (e) {
      setError(String(e))
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-lg font-semibold">Settings</h1>
        {saved && <span className="text-sm text-[#0ca30c]">{saved}</span>}
      </div>

      {loadError && (
        <Alert variant="destructive">
          <AlertTitle>Could not load</AlertTitle>
          <AlertDescription>{loadError}</AlertDescription>
        </Alert>
      )}
      {error && (
        <Alert variant="destructive">
          <AlertTitle>Save failed</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {!data && <Skeleton className="h-64" />}

      {data && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Sources</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              {SOURCES.map((sid) => (
                <div key={sid} className="flex items-center gap-3 text-sm">
                  <Switch
                    checked={data.settings.enabled[sid] ?? true}
                    onCheckedChange={(v) =>
                      put("enabled", { ...data.settings.enabled, [sid]: v }, `${sid} enabled`)
                    }
                  />
                  <span className="w-20 font-medium">{sid}</span>
                  <span className="text-muted-foreground">refresh every</span>
                  <Input
                    type="number"
                    min={60}
                    className="w-24"
                    defaultValue={data.settings.intervals[sid] ?? 900}
                    onBlur={(e) => {
                      const n = Number(e.target.value)
                      if (n > 0 && n !== (data.settings.intervals[sid] ?? 900)) {
                        put("intervals", { ...data.settings.intervals, [sid]: n }, `${sid} interval`)
                      }
                    }}
                  />
                  <span className="text-muted-foreground">seconds</span>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Alert rules</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2 md:grid-cols-2">
              {Object.entries(RULE_LABELS).map(([rule, label]) => (
                <div key={rule} className="flex items-center gap-3 text-sm">
                  <Switch
                    checked={data.settings.alert_rules?.[rule] ?? true}
                    onCheckedChange={(v) =>
                      put(
                        "alert_rules",
                        { ...(data.settings.alert_rules ?? {}), [rule]: v },
                        label,
                      )
                    }
                  />
                  {label}
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Lists</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-3">
              {(
                [
                  ["giphy_tags", "GIPHY tags"],
                  ["tracked_keywords", "Tracked keywords"],
                  ["store_urls", "Store URLs"],
                ] as const
              ).map(([key, label]) => (
                <div key={key} className="flex flex-col gap-2">
                  <div className="text-sm text-muted-foreground">
                    {label} <span className="text-xs">(one per line)</span>
                  </div>
                  <Textarea
                    rows={6}
                    value={lists[key] ?? ""}
                    onChange={(e) => setLists((l) => ({ ...l, [key]: e.target.value }))}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => saveList(key, label)}
                  >
                    Save
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Credentials</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-x-5 gap-y-1.5 text-sm">
              {data.credentials.map((c) => (
                <span key={c.var} className="flex items-center gap-1.5">
                  <span
                    className="size-1.5 rounded-full"
                    style={{ background: c.set ? "#0ca30c" : "#d03b3b" }}
                  />
                  <span className={c.set ? "" : "text-muted-foreground"}>{c.var}</span>
                </span>
              ))}
              <p className="w-full text-xs text-muted-foreground">
                Values never leave the server — only whether each var is set.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Paid API spend</CardTitle>
            </CardHeader>
            <CardContent>
              <SpendTable />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Data</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span className="text-muted-foreground">Keep snapshots for</span>
                <Input
                  type="number"
                  min={1}
                  className="w-20"
                  defaultValue={data.settings.retention_days}
                  onBlur={(e) => {
                    const n = Number(e.target.value)
                    if (n > 0 && n !== data.settings.retention_days) {
                      put("retention_days", n, "retention")
                    }
                  }}
                />
                <span className="text-muted-foreground">days</span>
                <Button variant="outline" size="sm" onClick={purge}>
                  Purge old snapshots now
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => api("/api/watermarks/seen", { method: "POST", body: "{}" })}
                >
                  Mark all seen
                </Button>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span className="text-muted-foreground">Export CSV:</span>
                {["snapshots", "alerts", "runs", "manual_log", "settings", "watermarks"].map(
                  (t) => (
                    <a
                      key={t}
                      href={`/api/export?table=${t}`}
                      className="rounded-md border px-2 py-1 text-xs hover:bg-muted"
                    >
                      {t}.csv
                    </a>
                  ),
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="border-destructive/40">
            <CardHeader>
              <CardTitle className="text-sm font-medium text-destructive">
                Danger zone
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap items-center gap-2 text-sm">
              <span className="text-muted-foreground">
                Wipe all snapshots, alerts, runs, ledger and watermarks (settings
                survive). Type “wipe”:
              </span>
              <Input
                value={confirmWipe}
                onChange={(e) => setConfirmWipe(e.target.value)}
                className="w-32"
              />
              <Button
                variant="destructive"
                size="sm"
                disabled={confirmWipe !== "wipe"}
                onClick={wipe}
              >
                Wipe everything
              </Button>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}

function SpendTable() {
  const [rows, setRows] = useState<
    { id: number; kind: string; cost: number; status: string; error: string | null; ts: string }[]
  >([])
  useEffect(() => {
    api<typeof rows>("/api/runs?kind=paid").then(setRows).catch(() => {})
  }, [])
  if (rows.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        no paid calls yet — every DataForSEO button press lands here with its cost
      </p>
    )
  }
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>When</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Cost</TableHead>
          <TableHead>Error</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((r) => (
          <TableRow key={r.id}>
            <TableCell>{r.ts.slice(0, 16).replace("T", " ")}</TableCell>
            <TableCell>{r.status}</TableCell>
            <TableCell className="text-right tabular-nums">
              ${r.cost.toFixed(4)}
            </TableCell>
            <TableCell className="max-w-64 truncate text-muted-foreground">
              {r.error ?? "–"}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
