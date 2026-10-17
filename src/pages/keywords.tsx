import { useCallback, useEffect, useState } from "react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
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
import { Sparkline } from "@/components/sparkline"
import { api } from "@/lib/api"
import { fmtInt, relTime } from "@/lib/format"

type SeriesPoint = { ts: string; value: number }

interface KwRow {
  keyword: string
  gsc_pos: number | null
  gsc_pos_ts: string | null
  gsc_series: SeriesPoint[]
  df_rank: number | null
  df_rank_ts: string | null
  df_rank_series: SeriesPoint[]
  difficulty: number | null
}

interface Idea {
  keyword: string
  volume?: number
  competition?: string | number
}

const OG_LINK = "https://app.dataforseo.com/"
const EST_SERP = "~$0.005"
const EST_BULK = "~$0.01"

export function Keywords() {
  const [rows, setRows] = useState<KwRow[] | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const [addKw, setAddKw] = useState("")
  const [adding, setAdding] = useState(false)
  const [removing, setRemoving] = useState<string | null>(null)

  const [serping, setSerping] = useState<string | null>(null)
  const [serpCosts, setSerpCosts] = useState<Record<string, number>>({})
  const [rowError, setRowError] = useState<{ kw: string; msg: string } | null>(
    null,
  )

  const [diffBusy, setDiffBusy] = useState(false)
  const [diffCost, setDiffCost] = useState<number | null>(null)
  const [diffError, setDiffError] = useState<string | null>(null)

  const [ideaKw, setIdeaKw] = useState("")
  const [ideaBusy, setIdeaBusy] = useState(false)
  const [ideas, setIdeas] = useState<Idea[] | null>(null)
  const [ideaCost, setIdeaCost] = useState<number | null>(null)
  const [ideaError, setIdeaError] = useState<string | null>(null)
  const [tracking, setTracking] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setRows((await api<{ tracked: KwRow[] }>("/api/keywords")).tracked)
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
    const kw = addKw.trim()
    if (!kw) return
    setAdding(true)
    try {
      await api("/api/keywords", {
        method: "POST",
        body: JSON.stringify({ kws: [kw] }),
      })
      setAddKw("")
      await load()
    } finally {
      setAdding(false)
    }
  }

  const remove = async (kw: string) => {
    setRemoving(kw)
    try {
      await api(`/api/keywords/${encodeURIComponent(kw)}`, { method: "DELETE" })
      await load()
    } finally {
      setRemoving(null)
    }
  }

  const checkSerp = async (kw: string) => {
    setSerping(kw)
    setRowError(null)
    try {
      const res = await api<{ cost: number; error?: string }>(
        "/api/keywords/serp",
        { method: "POST", body: JSON.stringify({ keyword: kw }) },
      )
      if (res.error) {
        setRowError({ kw, msg: res.error })
      } else {
        setSerpCosts((c) => ({ ...c, [kw]: res.cost }))
        await load()
      }
    } catch (e) {
      setRowError({ kw, msg: String(e) })
    } finally {
      setSerping(null)
    }
  }

  const checkDifficulty = async () => {
    setDiffBusy(true)
    setDiffError(null)
    try {
      const res = await api<{ cost: number }>("/api/keywords/difficulty", {
        method: "POST",
      })
      setDiffCost(res.cost)
      await load()
    } catch (e) {
      setDiffError(String(e))
    } finally {
      setDiffBusy(false)
    }
  }

  const searchIdeas = async () => {
    const kw = ideaKw.trim()
    // Guard client-side: the server does not reject empty seeds before the
    // paid upstream call, so an empty input must never leave the browser.
    if (!kw) {
      setIdeaError("enter a seed keyword first")
      return
    }
    setIdeaBusy(true)
    setIdeaError(null)
    try {
      const res = await api<{ ideas: Idea[]; cost: number }>(
        "/api/keywords/ideas",
        { method: "POST", body: JSON.stringify({ keyword: kw }) },
      )
      setIdeas(res.ideas)
      setIdeaCost(res.cost)
    } catch (e) {
      setIdeaError(String(e))
    } finally {
      setIdeaBusy(false)
    }
  }

  const track = async (kw: string) => {
    setTracking(kw)
    try {
      await api("/api/keywords", {
        method: "POST",
        body: JSON.stringify({ kws: [kw] }),
      })
      await load()
    } finally {
      setTracking(null)
    }
  }

  const tracked = new Set(rows?.map((r) => r.keyword) ?? [])

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-lg font-semibold">Keywords</h1>
        <span className="text-sm text-muted-foreground">GSC + DataForSEO</span>
        <a
          href={OG_LINK}
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

      {rows == null && loading && <Skeleton className="h-64" />}

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-muted-foreground">Tracked keywords</h2>
        {rowError && (
          <Alert variant="destructive">
            <AlertTitle>Check SERP failed for “{rowError.kw}”</AlertTitle>
            <AlertDescription>{rowError.msg}</AlertDescription>
          </Alert>
        )}
        {rows != null && rows.length === 0 && (
          <p className="text-sm text-muted-foreground">
            nothing tracked yet — add a keyword below
          </p>
        )}
        {rows != null && rows.length > 0 && (
          <TrackedTable
            rows={rows}
            serping={serping}
            serpCosts={serpCosts}
            removing={removing}
            onCheckSerp={checkSerp}
            onRemove={remove}
          />
        )}
        <form
          className="flex items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            add()
          }}
        >
          <Input
            value={addKw}
            onChange={(e) => setAddKw(e.target.value)}
            placeholder="keyword to track"
          />
          <Button type="submit" size="sm" disabled={adding || !addKw.trim()}>
            {adding ? "adding…" : "Add"}
          </Button>
        </form>
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-sm font-medium text-muted-foreground">Keyword ideas</h2>
          <Badge variant="outline">paid</Badge>
        </div>
        <form
          className="flex flex-wrap items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            searchIdeas()
          }}
        >
          <Input
            value={ideaKw}
            onChange={(e) => setIdeaKw(e.target.value)}
            placeholder="seed keyword, e.g. anime plush"
            className="max-w-xs"
          />
          <Button type="submit" size="sm" disabled={ideaBusy}>
            {ideaBusy ? "searching…" : "Search ideas"}
          </Button>
          <span className="text-xs text-muted-foreground">
            {ideaCost != null ? `last: $${ideaCost.toFixed(3)}` : EST_SERP}
          </span>
        </form>
        {ideaError && (
          <Alert variant="destructive">
            <AlertTitle>Idea search failed</AlertTitle>
            <AlertDescription>{ideaError}</AlertDescription>
          </Alert>
        )}
        {ideas != null &&
          (ideas.length === 0 ? (
            <p className="text-sm text-muted-foreground">no ideas returned</p>
          ) : (
            <IdeasTable
              ideas={ideas}
              tracked={tracked}
              tracking={tracking}
              onTrack={track}
            />
          ))}
      </section>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Bulk difficulty</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={diffBusy}
              onClick={checkDifficulty}
            >
              {diffBusy ? "checking…" : "Check difficulty for all (paid)"}
            </Button>
            <span className="text-xs text-muted-foreground">
              {diffCost != null ? `last: $${diffCost.toFixed(3)}` : EST_BULK}
            </span>
          </div>
          {diffError && (
            <Alert variant="destructive">
              <AlertTitle>Difficulty check failed</AlertTitle>
              <AlertDescription>{diffError}</AlertDescription>
            </Alert>
          )}
          <p className="text-xs text-muted-foreground">
            One paid call for every tracked keyword; difficulties appear in the
            table above once the list reloads.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

function TrackedTable({
  rows,
  serping,
  serpCosts,
  removing,
  onCheckSerp,
  onRemove,
}: {
  rows: KwRow[]
  serping: string | null
  serpCosts: Record<string, number>
  removing: string | null
  onCheckSerp: (kw: string) => void
  onRemove: (kw: string) => void
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Keyword</TableHead>
          <TableHead>GSC position</TableHead>
          <TableHead>DataForSEO</TableHead>
          <TableHead className="text-right">Difficulty</TableHead>
          <TableHead />
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((r) => (
          <TableRow key={r.keyword}>
            <TableCell className="font-medium">{r.keyword}</TableCell>
            <TableCell>
              <div className="flex items-center gap-2">
                <span className="tabular-nums">
                  {r.gsc_pos == null ? "–" : `#${r.gsc_pos}`}
                </span>
                {r.gsc_series.length > 1 && (
                  <Sparkline
                    data={r.gsc_series}
                    valueKey="value"
                    width={60}
                    height={24}
                  />
                )}
              </div>
            </TableCell>
            <TableCell>
              <div className="flex flex-wrap items-center gap-2">
                {r.df_rank == null ? (
                  <span className="text-muted-foreground">not checked</span>
                ) : r.df_rank === 0 ? (
                  <span>not in top 10</span>
                ) : (
                  <span className="tabular-nums">#{r.df_rank}</span>
                )}
                {r.df_rank_ts && (
                  <span className="text-xs text-muted-foreground">
                    {relTime(r.df_rank_ts)}
                  </span>
                )}
                <Button
                  variant="outline"
                  size="xs"
                  disabled={serping === r.keyword}
                  onClick={() => onCheckSerp(r.keyword)}
                >
                  {serping === r.keyword ? "checking…" : "Check SERP"}
                </Button>
                <span className="text-xs text-muted-foreground">
                  {serpCosts[r.keyword] != null
                    ? `last: $${serpCosts[r.keyword].toFixed(3)}`
                    : EST_SERP}
                </span>
              </div>
            </TableCell>
            <TableCell className="text-right tabular-nums">
              {r.difficulty ?? "–"}
            </TableCell>
            <TableCell className="text-right">
              <Button
                variant="ghost"
                size="xs"
                disabled={removing === r.keyword}
                onClick={() => onRemove(r.keyword)}
              >
                remove
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

function IdeasTable({
  ideas,
  tracked,
  tracking,
  onTrack,
}: {
  ideas: Idea[]
  tracked: Set<string>
  tracking: string | null
  onTrack: (kw: string) => void
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Keyword</TableHead>
          <TableHead className="text-right">Volume</TableHead>
          <TableHead>Competition</TableHead>
          <TableHead />
        </TableRow>
      </TableHeader>
      <TableBody>
        {ideas.map((i) => {
          const isTracked = tracked.has(i.keyword)
          return (
            <TableRow key={i.keyword}>
              <TableCell className="max-w-64 truncate">{i.keyword}</TableCell>
              <TableCell className="text-right tabular-nums">
                {i.volume == null ? "–" : fmtInt(i.volume)}
              </TableCell>
              <TableCell>{i.competition ?? "–"}</TableCell>
              <TableCell className="text-right">
                <Button
                  variant="ghost"
                  size="xs"
                  disabled={isTracked || tracking === i.keyword}
                  onClick={() => onTrack(i.keyword)}
                >
                  {isTracked
                    ? "tracked ✓"
                    : tracking === i.keyword
                      ? "adding…"
                      : "Track"}
                </Button>
              </TableCell>
            </TableRow>
          )
        })}
      </TableBody>
    </Table>
  )
}
