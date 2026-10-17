import { useCallback, useEffect, useMemo, useState } from "react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
import { DailyBarChart } from "@/components/daily-bar-chart"
import { api } from "@/lib/api"
import { dayKey, fmtDate, fmtInt } from "@/lib/format"

interface SaleRow {
  id: number
  value: number | null
  note: string | null
  ts: string
}

// Manual-entry stub until a Bagisto admin token exists (§10.9). Every number
// here comes from manual_log kind=sale.
export function Sales() {
  const [rows, setRows] = useState<SaleRow[] | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const [value, setValue] = useState("")
  const [note, setNote] = useState("")
  const [adding, setAdding] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setRows((await api<SaleRow[]>("/api/manual_log?kind=sale")).slice().reverse())
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

  const add = async () => {
    if (!value.trim()) return
    setAdding(true)
    setAddError(null)
    try {
      await api("/api/manual_log", {
        method: "POST",
        body: JSON.stringify({
          kind: "sale",
          value: Number(value),
          note: note.trim() || undefined,
        }),
      })
      setValue("")
      setNote("")
      await load()
    } catch (e) {
      setAddError(String(e))
    } finally {
      setAdding(false)
    }
  }

  const stats = useMemo(() => {
    const rowslist = rows ?? []
    const today = dayKey(new Date().toISOString())
    const sum = (rs: SaleRow[]) => rs.reduce((a, r) => a + (r.value ?? 0), 0)
    const todays = rowslist.filter((r) => dayKey(r.ts) === today)
    const byDay = new Map<string, number>()
    for (const r of rowslist) {
      const k = dayKey(r.ts)
      byDay.set(k, (byDay.get(k) ?? 0) + (r.value ?? 0))
    }
    const daily = [...byDay.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-30)
      .map(([date, value]) => ({ date, sales: value }))
    return {
      todayCount: todays.length,
      todaySum: sum(todays),
      total: sum(rowslist),
      daily,
    }
  }, [rows])

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-lg font-semibold">Sales</h1>
        <span className="text-sm text-muted-foreground">
          manual ledger — Bagisto sync comes later
        </span>
      </div>

      {loadError && (
        <Alert variant="destructive">
          <AlertTitle>Could not load</AlertTitle>
          <AlertDescription>{loadError}</AlertDescription>
        </Alert>
      )}

      {!rows && loading && <Skeleton className="h-64" />}

      {rows != null && (
        <>
          <div className="flex flex-wrap gap-4">
            <Card className="flex-1">
              <CardContent>
                <div className="text-sm text-muted-foreground">Orders today</div>
                <div className="flex items-end gap-3">
                  <span className="text-3xl font-semibold tabular-nums">
                    {stats.todayCount}
                  </span>
                  {stats.todaySum > 0 && (
                    <span className="mb-1 text-sm text-muted-foreground tabular-nums">
                      ${fmtInt(stats.todaySum)}
                    </span>
                  )}
                  <span className="mb-1 text-xs text-muted-foreground">in progress</span>
                </div>
              </CardContent>
            </Card>
            <Card className="flex-1">
              <CardContent>
                <div className="text-sm text-muted-foreground">Running total</div>
                <div className="text-3xl font-semibold tabular-nums">
                  ${fmtInt(stats.total)}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Quick entry</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {addError && (
                <Alert variant="destructive">
                  <AlertTitle>Could not add</AlertTitle>
                  <AlertDescription>{addError}</AlertDescription>
                </Alert>
              )}
              <form
                className="flex flex-wrap items-center gap-2"
                onSubmit={(e) => {
                  e.preventDefault()
                  add()
                }}
              >
                <Input
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  placeholder="order value, $"
                  type="number"
                  step="any"
                  min="0"
                  className="w-40"
                />
                <Input
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="note — e.g. Etsy crosspost, gift wrap"
                  className="max-w-sm"
                />
                <Button type="submit" size="sm" disabled={adding || !value.trim()}>
                  {adding ? "adding…" : "Log order"}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Daily sales (30d)</CardTitle>
            </CardHeader>
            <CardContent>
              {stats.daily.length > 0 ? (
                <DailyBarChart data={stats.daily} valueKey="sales" unit="$" height={180} />
              ) : (
                <p className="text-sm text-muted-foreground">
                  no orders logged yet — first sale lands here
                </p>
              )}
            </CardContent>
          </Card>

          {rows.length > 0 && (
            <section className="flex flex-col gap-2">
              <h2 className="text-sm font-medium text-muted-foreground">Ledger</h2>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Value</TableHead>
                    <TableHead>Note</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[...rows].reverse().map((r) => (
                    <TableRow key={r.id}>
                      <TableCell>{fmtDate(r.ts.slice(0, 10))}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        ${fmtInt(r.value ?? 0)}
                      </TableCell>
                      <TableCell className="max-w-96 truncate">
                        {r.note ?? "–"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </section>
          )}
        </>
      )}
    </div>
  )
}
