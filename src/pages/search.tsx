import { useCallback, useEffect, useState } from "react"
import { Check, CircleX, ExternalLink, Minus, TriangleAlert } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { DailyLineChart } from "@/components/daily-line-chart"
import { DeltaChip } from "@/components/delta-chip"
import { api } from "@/lib/api"
import { fmtDate, fmtInt } from "@/lib/format"
import { cn } from "@/lib/utils"

interface QueryRow {
  key: string
  clicks: number
  delta: number | null
  new: boolean
  impr: number
  impr_delta: number | null
  pos: number | null
}

interface PageRow extends QueryRow {
  known: boolean
  index: { verdict: string; coverage: string; checked_at: string } | null
}

interface Search {
  status: "fresh" | "stale" | "error" | "never"
  error: string | null
  data_through: string | null
  empty?: boolean
  totals: {
    clicks: number
    clicks_delta: number | null
    clicks_new?: boolean
    impressions: number
    impressions_delta: number | null
    impressions_new?: boolean
    ctr: number
    ctr_delta: number | null
    position: number | null
    position_delta: number | null
  }
  daily: { date: string; clicks: number; impr: number }[]
  queries: QueryRow[]
  pages: PageRow[]
  sitemaps: {
    path: string
    last_submitted: string
    is_pending: boolean
    errors: string
    warnings: string
  }[] | null
}

function Stat({
  label,
  value,
  delta,
}: {
  label: string
  value: string
  delta?: number | null
}) {
  return (
    <Card>
      <CardContent>
        <div className="text-sm text-muted-foreground">{label}</div>
        <div className="flex items-end gap-2">
          <div className="text-3xl font-semibold tracking-tight tabular-nums">
            {value}
          </div>
          <DeltaChip delta={delta} className="mb-1.5" />
        </div>
      </CardContent>
    </Card>
  )
}

export function Search() {
  const [data, setData] = useState<Search | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setData(await api<Search>("/api/gsc/latest"))
      setLoadError(null)
    } catch (e) {
      setLoadError(String(e))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-2">
        <h1 className="text-lg font-semibold">Search</h1>
        <a
          href="https://search.google.com/search-console?resource_id=sc-domain%3Asmallplushies.com"
          target="_blank"
          rel="noreferrer"
          title="Open Search Console"
          className="text-muted-foreground hover:text-foreground"
        >
          <ExternalLink className="size-4" />
        </a>
      </div>

      {loadError && (
        <Alert variant="destructive">
          <AlertTitle>Could not load</AlertTitle>
          <AlertDescription>{loadError}</AlertDescription>
        </Alert>
      )}
      {data?.status === "error" && (
        <Alert variant="destructive">
          <AlertTitle>GSC upstream error — showing last good data</AlertTitle>
          <AlertDescription>{data.error}</AlertDescription>
        </Alert>
      )}

      {!data && loading && <Skeleton className="h-64" />}

      {data && (data.empty || !data.totals) && (
        <p className="py-16 text-center text-sm text-muted-foreground">
          never fetched — the scheduler runs every 6h
        </p>
      )}

      {data && !data.empty && data.totals && (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Stat
              label="Clicks"
              value={fmtInt(data.totals.clicks)}
              delta={data.totals.clicks_delta}
            />
            <Stat
              label="Impressions"
              value={fmtInt(data.totals.impressions)}
              delta={data.totals.impressions_delta}
            />
            <Stat
              label="CTR"
              value={`${(data.totals.ctr * 100).toFixed(1)}%`}
              delta={
                data.totals.ctr_delta == null
                  ? null
                  : Math.round(data.totals.ctr_delta * 1000) / 10
              }
            />
            <Stat
              label="Avg position"
              value={data.totals.position?.toFixed(1) ?? "–"}
              delta={
                data.totals.position_delta == null
                  ? null
                  : Math.round(data.totals.position_delta * 10) / 10
              }
            />
          </div>

          {/* sitemap banner: only when Google reports real problems */}
          {data.sitemaps?.some(
            (s) => Number(s.errors) > 0 || Number(s.warnings) > 0,
          ) && (
            <Alert variant="destructive">
              <AlertTitle>Sitemap problems</AlertTitle>
              <AlertDescription>
                <div className="flex flex-col gap-1">
                  {data.sitemaps
                    .filter((s) => Number(s.errors) > 0 || Number(s.warnings) > 0)
                    .map((s) => (
                      <div key={s.path}>
                        <span className="font-medium">{s.path.split("/").pop()}</span>
                        {" — "}
                        submitted {fmtDate(s.last_submitted.slice(0, 10))} ·{" "}
                        {s.errors} errors · {s.warnings} warnings
                      </div>
                    ))}
                  <p className="text-xs">
                    "Could not fetch" status = Google's pending-queue mislabel,
                    not an error. Never resubmitted.
                  </p>
                </div>
              </AlertDescription>
            </Alert>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Daily clicks</CardTitle>
            </CardHeader>
            <CardContent>
              {data.daily.length > 0 ? (
                <DailyLineChart
                  data={data.daily}
                  valueKey="clicks"
                  unit="clicks"
                />
              ) : (
                <p className="text-sm text-muted-foreground">no data yet</p>
              )}
            </CardContent>
          </Card>

          <section className="flex flex-col gap-2">
            <h2 className="text-sm font-medium text-muted-foreground">Queries</h2>
            <QueryTable rows={data.queries} />
          </section>

          <section className="flex flex-col gap-2">
            <h2 className="text-sm font-medium text-muted-foreground">Pages</h2>
            <PageTable rows={data.pages} />
          </section>
        </>
      )}
    </div>
  )
}

function QueryTable({ rows }: { rows: QueryRow[] }) {
  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground">no queries yet</p>
  }
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Query</TableHead>
          <TableHead className="text-right">Clicks</TableHead>
          <TableHead className="text-right">Impr.</TableHead>
          <TableHead className="text-right">Pos.</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((r) => (
          <TableRow key={r.key}>
            <TableCell className="max-w-64 truncate">{r.key}</TableCell>
            <TableCell className="text-right tabular-nums">
              <span className="mr-1.5">{fmtInt(r.clicks)}</span>
              <DeltaChip delta={r.delta} className="align-middle" />
            </TableCell>
            <TableCell className="text-right tabular-nums">
              <span className="mr-1.5">{fmtInt(r.impr)}</span>
              <DeltaChip delta={r.impr_delta} className="align-middle" />
            </TableCell>
            <TableCell className="text-right tabular-nums">
              {r.pos?.toFixed(1) ?? "–"}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

/** Index status as an inline icon left of the URL: check = indexed,
 * alert = partial, circle-x = failed, dash = unknown/not checked yet. */
const VERDICT_ICON: Record<string, { icon: typeof Check; className: string }> = {
  PASS: { icon: Check, className: "text-[#0ca30c]" },
  PARTIAL: { icon: TriangleAlert, className: "text-[#fab219]" },
  FAIL: { icon: CircleX, className: "text-[#d03b3b]" },
  NEUTRAL: { icon: Minus, className: "text-muted-foreground" },
}

function IndexIcon({ row }: { row: PageRow }) {
  if (!row.known) return <span className="inline-block w-4" />
  const v = row.index?.verdict
  const entry = v ? VERDICT_ICON[v] : undefined
  const icon = entry ? (
    <entry.icon className={cn("size-3.5", entry.className)} />
  ) : (
    <Minus className="size-3.5 text-muted-foreground/40" />
  )
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger
          render={<span className="inline-flex w-4 justify-center">{icon}</span>}
        />
        <TooltipContent side="top">
          {row.index
            ? `${row.index.verdict} — ${row.index.coverage} (checked ${fmtDate(row.index.checked_at.slice(0, 10))})`
            : "not checked yet — auto-checks every 12h"}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

function PageTable({ rows }: { rows: PageRow[] }) {
  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground">no pages yet</p>
  }
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Page</TableHead>
          <TableHead className="text-right">Clicks</TableHead>
          <TableHead className="text-right">Impr.</TableHead>
          <TableHead className="text-right">Pos.</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((r) => (
          <TableRow key={r.key}>
            <TableCell className="max-w-56 truncate">
              <span className="flex items-center gap-1.5">
                <IndexIcon row={r} />
                <span className="truncate">{r.key}</span>
              </span>
            </TableCell>
            <TableCell className="text-right tabular-nums">
              <span className="mr-1.5">{fmtInt(r.clicks)}</span>
              <DeltaChip delta={r.delta} className="align-middle" />
            </TableCell>
            <TableCell className="text-right tabular-nums">
              <span className="mr-1.5">{fmtInt(r.impr)}</span>
              <DeltaChip delta={r.impr_delta} className="align-middle" />
            </TableCell>
            <TableCell className="text-right tabular-nums">
              {r.pos?.toFixed(1) ?? "–"}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
