import { useCallback, useEffect, useState } from "react"
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DeltaChip } from "@/components/delta-chip"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { api } from "@/lib/api"
import { fmtDate, fmtInt, romeDaysAgo, romeToday } from "@/lib/format"
import { VIZ } from "@/lib/viz"

interface SeriesPoint {
  date: string
  new: number
  lost: number
}

interface Backlinks {
  refdomains: number | null
  refdomains_delta: number | null
  refdomains_new: boolean
  backlinks: number | null
  backlinks_delta: number | null
  series: SeriesPoint[] | null
  manual: { id: number; note: string; value: number | null; ts: string }[]
}

const EST_SUMMARY = "~$0.005"
const EST_TIMESERIES = "~$0.02"

export function Backlinks() {
  const [data, setData] = useState<Backlinks | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const [summaryBusy, setSummaryBusy] = useState(false)
  const [summaryCost, setSummaryCost] = useState<number | null>(null)
  const [summaryError, setSummaryError] = useState<string | null>(null)

  const [range, setRange] = useState({ from: romeDaysAgo(27), to: romeToday() })
  const [tsBusy, setTsBusy] = useState(false)
  const [tsCost, setTsCost] = useState<number | null>(null)
  const [tsError, setTsError] = useState<string | null>(null)
  const [series, setSeries] = useState<SeriesPoint[] | null>(null)

  const [note, setNote] = useState("")
  const [value, setValue] = useState("")
  const [adding, setAdding] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const d = await api<Backlinks>("/api/backlinks")
      setData(d)
      setSeries(d.series)
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

  const checkSummary = async () => {
    setSummaryBusy(true)
    setSummaryError(null)
    try {
      const res = await api<{ refdomains: number; backlinks: number; cost: number; error?: string }>(
        "/api/backlinks/summary",
        { method: "POST" },
      )
      if (res.error) setSummaryError(res.error)
      else {
        setSummaryCost(res.cost)
        await load()
      }
    } catch (e) {
      setSummaryError(String(e))
    } finally {
      setSummaryBusy(false)
    }
  }

  const fetchTimeseries = async () => {
    setTsBusy(true)
    setTsError(null)
    try {
      const res = await api<{ series: SeriesPoint[]; cost: number; error?: string }>(
        "/api/backlinks/timeseries",
        { method: "POST", body: JSON.stringify(range) },
      )
      if (res.error) setTsError(res.error)
      else {
        setTsCost(res.cost)
        setSeries(res.series)
      }
    } catch (e) {
      setTsError(String(e))
    } finally {
      setTsBusy(false)
    }
  }

  const addManual = async () => {
    const n = note.trim()
    if (!n) return
    setAdding(true)
    try {
      await api("/api/manual_log", {
        method: "POST",
        body: JSON.stringify({
          kind: "backlink",
          note: n,
          value: value ? Number(value) : undefined,
        }),
      })
      setNote("")
      setValue("")
      await load()
    } finally {
      setAdding(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-lg font-semibold">Backlinks</h1>
        <span className="text-sm text-muted-foreground">DataForSEO + manual ledger</span>
        <a
          href="https://app.dataforseo.com/"
          target="_blank"
          rel="noreferrer"
          className="ml-auto text-sm text-muted-foreground hover:text-foreground"
        >
          Open DataForSEO ↗
        </a>
      </div>

      {loadError && (
        <Alert variant="destructive">
          <AlertTitle>Could not load</AlertTitle>
          <AlertDescription>{loadError}</AlertDescription>
        </Alert>
      )}

      {!data && loading && <Skeleton className="h-64" />}

      {data && (
        <>
          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-center gap-3">
                <CardTitle className="text-sm font-medium">Link counts</CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={summaryBusy}
                  onClick={checkSummary}
                >
                  {summaryBusy ? "checking…" : "Check backlinks now (paid)"}
                </Button>
                <span className="text-xs text-muted-foreground">
                  {summaryCost != null
                    ? `last: $${summaryCost.toFixed(3)}`
                    : EST_SUMMARY}
                </span>
              </div>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {summaryError && (
                <Alert variant="destructive">
                  <AlertTitle>Backlink check failed</AlertTitle>
                  <AlertDescription>{summaryError}</AlertDescription>
                </Alert>
              )}
              <div className="flex flex-wrap gap-x-12 gap-y-3">
                <div>
                  <div className="text-sm text-muted-foreground">Referring domains</div>
                  <div className="flex items-end gap-2">
                    <span className="text-3xl font-semibold tabular-nums">
                      {fmtInt(data.refdomains)}
                    </span>
                    <DeltaChip
                      delta={data.refdomains_delta}
                      isNew={data.refdomains_new}
                      className="mb-1.5"
                    />
                  </div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Backlinks</div>
                  <div className="flex items-end gap-2">
                    <span className="text-3xl font-semibold tabular-nums">
                      {fmtInt(data.backlinks)}
                    </span>
                    <DeltaChip delta={data.backlinks_delta} className="mb-1.5" />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">New / lost referrers</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <input
                  type="date"
                  className="rounded-md border bg-background px-2 py-1"
                  value={range.from}
                  onChange={(e) => setRange((r) => ({ ...r, from: e.target.value }))}
                />
                <span className="text-muted-foreground">→</span>
                <input
                  type="date"
                  className="rounded-md border bg-background px-2 py-1"
                  value={range.to}
                  onChange={(e) => setRange((r) => ({ ...r, to: e.target.value }))}
                />
                <Button
                  variant="outline"
                  size="sm"
                  disabled={tsBusy}
                  onClick={fetchTimeseries}
                >
                  {tsBusy ? "fetching…" : "Fetch new/lost (paid)"}
                </Button>
                <span className="text-xs text-muted-foreground">
                  {tsCost != null ? `last: $${tsCost.toFixed(3)}` : EST_TIMESERIES}
                </span>
              </div>
              {tsError && (
                <Alert variant="destructive">
                  <AlertTitle>Timeseries fetch failed</AlertTitle>
                  <AlertDescription>{tsError}</AlertDescription>
                </Alert>
              )}
              {series == null ? (
                <p className="text-sm text-muted-foreground">
                  never fetched — use the paid fetch
                </p>
              ) : series.length === 0 ? (
                <p className="text-sm text-muted-foreground">no data in range</p>
              ) : (
                <>
                  <NewLostChart data={series} />
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <span
                        className="size-2 rounded-sm"
                        style={{ background: VIZ.series1 }}
                      />
                      new referrers
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span
                        className="size-2 rounded-sm"
                        style={{ background: VIZ.down }}
                      />
                      lost referrers
                    </span>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <section className="flex flex-col gap-3">
            <h2 className="text-sm font-medium text-muted-foreground">
              Manual ledger — links crawlers haven&apos;t seen
            </h2>
            <form
              className="flex flex-wrap items-center gap-2"
              onSubmit={(e) => {
                e.preventDefault()
                addManual()
              }}
            >
              <Input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="e.g. Discord drop in #plush-chat"
                className="max-w-sm"
              />
              <Input
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder="value?"
                className="w-24"
                type="number"
                step="any"
              />
              <Button type="submit" size="sm" disabled={adding || !note.trim()}>
                {adding ? "adding…" : "Add"}
              </Button>
            </form>
            {data.manual.length === 0 ? (
              <p className="text-sm text-muted-foreground">nothing logged yet</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Note</TableHead>
                    <TableHead className="text-right">Value</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.manual.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell>{fmtDate(m.ts.slice(0, 10))}</TableCell>
                      <TableCell className="max-w-96 truncate">{m.note}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {m.value == null ? "–" : m.value}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </section>
        </>
      )}
    </div>
  )
}

/** New referrers as blue bars, lost as red bars, grouped per day. */
function NewLostChart({ data }: { data: SeriesPoint[] }) {
  return (
    <div style={{ height: 220 }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 0, bottom: 0, left: 0 }} barCategoryGap="30%">
          <CartesianGrid stroke={VIZ.grid} vertical={false} />
          <XAxis
            dataKey="date"
            tick={{ fill: VIZ.axis, fontSize: 11 }}
            tickLine={false}
            axisLine={{ stroke: VIZ.grid }}
            tickFormatter={(d: string) => fmtDate(d)}
            minTickGap={24}
          />
          <YAxis
            tick={{ fill: VIZ.axis, fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            width={32}
            allowDecimals={false}
          />
          <Tooltip
            cursor={{ fill: "rgba(255,255,255,0.04)" }}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null
              const p = payload[0].payload as SeriesPoint
              return (
                <div className="rounded-md border bg-popover px-3 py-2 text-sm shadow-md">
                  <div className="text-muted-foreground">{fmtDate(p.date)}</div>
                  <div className="font-medium">+{p.new} new · −{p.lost} lost</div>
                </div>
              )
            }}
          />
          <Bar dataKey="new" fill={VIZ.series1} radius={[4, 4, 0, 0]} minPointSize={2} maxBarSize={20} />
          <Bar dataKey="lost" fill={VIZ.down} radius={[4, 4, 0, 0]} minPointSize={2} maxBarSize={20} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
