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
import { DeltaChip } from "@/components/delta-chip"
import { api } from "@/lib/api"
import { fmtDate } from "@/lib/format"
import { VIZ } from "@/lib/viz"

interface Gif {
  id: string
  title: string | null
  username: string | null
  new: boolean
}

interface TagRow {
  tag: string
  count: number
  delta: number | null
  new: boolean
  saturated: boolean
}

interface Geo {
  status: "fresh" | "stale" | "error" | "never"
  error: string | null
  last_ok: string | null
  channel: {
    indexed: boolean
    channel_count: number
    gifs: Gif[]
  }
  tags: TagRow[]
}

interface LogRow {
  id: number
  kind: string
  value: string | null
  note: string | null
  ts: string
}

const OG_LINKS = [
  { label: "GIPHY ↗", href: "https://giphy.com/sartouhou" },
  { label: "Tenor ↗", href: "https://tenor.com" },
  { label: "KLIPY ↗", href: "https://klipy.com" },
]

export function Geo() {
  const [data, setData] = useState<Geo | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [uploads, setUploads] = useState<LogRow[] | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setData(await api<Geo>("/api/giphy/latest"))
      setUploads(await api<LogRow[]>("/api/manual_log?kind=gif_upload"))
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

  const doRefresh = async () => {
    await api("/api/giphy/refresh", { method: "POST" })
    load()
  }

  const loadUploads = async () => {
    setUploads(await api<LogRow[]>("/api/manual_log?kind=gif_upload"))
  }

  const never = data != null && data.tags.length === 0 && data.channel.gifs.length === 0 && data.status === "never"

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-lg font-semibold">GEO</h1>
        <span className="text-sm text-muted-foreground">GIF Engine</span>
        <a
          href={OG_LINKS[0].href}
          target="_blank"
          rel="noreferrer"
          className="ml-auto text-sm text-muted-foreground hover:text-foreground"
        >
          {OG_LINKS[0].label}
        </a>
        {OG_LINKS.slice(1).map((l) => (
          <a
            key={l.href}
            href={l.href}
            target="_blank"
            rel="noreferrer"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            {l.label}
          </a>
        ))}
        <Button variant="outline" size="sm" onClick={doRefresh}>
          Refresh
        </Button>
      </div>

      {loadError && (
        <Alert variant="destructive">
          <AlertTitle>Could not load</AlertTitle>
          <AlertDescription>{loadError}</AlertDescription>
        </Alert>
      )}
      {data?.status === "error" && (
        <Alert variant="destructive">
          <AlertTitle>GIPHY upstream error — showing last good data</AlertTitle>
          <AlertDescription>{data.error}</AlertDescription>
        </Alert>
      )}

      {!data && loading && <Skeleton className="h-64" />}

      {never && (
        <p className="py-16 text-center text-sm text-muted-foreground">
          never fetched — hit Refresh
        </p>
      )}

      {data && !never && (
        <>
          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-center gap-2">
                <CardTitle className="text-sm font-medium">
                  Channel: sartouhou
                </CardTitle>
                <Badge
                  variant="outline"
                  style={{ color: data.channel.indexed ? VIZ.up : VIZ.down }}
                >
                  {data.channel.indexed ? "indexed" : "not indexed"}
                </Badge>
                <Button
                  variant="ghost"
                  size="xs"
                  className="ml-auto"
                  onClick={doRefresh}
                >
                  Check again
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                {data.channel.channel_count} channel hits ·{" "}
                {data.channel.gifs.length} GIFs found via @sartouhou search
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Tracked tags</CardTitle>
            </CardHeader>
            <CardContent>
              {data.tags.length === 0 ? (
                <p className="text-sm text-muted-foreground">no tags yet</p>
              ) : (
                <TagTable rows={data.tags} />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">GIFs on GIPHY</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              {data.channel.gifs.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No GIFs found in @sartouhou search yet.
                </p>
              ) : (
                data.channel.gifs.map((g) => (
                  <div key={g.id} className="flex flex-wrap items-center gap-2 text-sm">
                    <span className="font-mono">{g.id}</span>
                    <span className="text-muted-foreground">— {g.title ?? "untitled"}</span>
                    {g.new && <Badge variant="secondary">new</Badge>}
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <p className="text-xs text-muted-foreground">
            GIPHY exposes no public view counts via its API — GIF reach is tracked
            here via tag-saturation deltas and presence only.
          </p>
        </>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <PlaceholderCard
          title="Tenor"
          line="Tenor has no public API for channel stats — uploads tracked manually."
          link={{ label: "Open Tenor ↗", href: "https://tenor.com" }}
          onLogged={loadUploads}
        />
        <PlaceholderCard
          title="KLIPY"
          line="KLIPY has no public API for channel stats — uploads tracked manually."
          link={{ label: "Open KLIPY ↗", href: "https://klipy.com" }}
          onLogged={loadUploads}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Upload log</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {uploads == null ? (
            <Skeleton className="h-16" />
          ) : uploads.length === 0 ? (
            <p className="text-sm text-muted-foreground">nothing logged yet</p>
          ) : (
            uploads.map((u) => (
              <div key={u.id} className="text-sm">
                <span className="text-muted-foreground">
                  {fmtDate(u.ts.slice(0, 10))}
                </span>{" "}
                · {u.note ?? u.value ?? "—"}
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function TagTable({ rows }: { rows: TagRow[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Tag</TableHead>
          <TableHead className="text-right">Count</TableHead>
          <TableHead className="text-right">Δ</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((r) => (
          <TableRow key={r.tag}>
            <TableCell>
              {r.tag}
              {r.delta != null && r.delta !== 0 && (
                <Badge variant="secondary" className="ml-2">
                  moved
                </Badge>
              )}
            </TableCell>
            <TableCell className="text-right tabular-nums">
              {r.saturated ? (
                <span>
                  {r.count}+ <span className="text-muted-foreground">(saturated)</span>
                </span>
              ) : (
                r.count
              )}
            </TableCell>
            <TableCell className="text-right">
              <DeltaChip delta={r.delta} isNew={r.new} className="align-middle" />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

function PlaceholderCard({
  title,
  line,
  link,
  onLogged,
}: {
  title: string
  line: string
  link: { label: string; href: string }
  onLogged: () => Promise<void>
}) {
  const [note, setNote] = useState("")
  const [saving, setSaving] = useState(false)

  const submit = async () => {
    const trimmed = note.trim()
    if (!trimmed) return
    setSaving(true)
    try {
      await api("/api/manual_log", {
        method: "POST",
        body: JSON.stringify({ kind: "gif_upload", note: trimmed }),
      })
      setNote("")
      await onLogged()
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center gap-2">
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
          <Badge variant="outline">no key</Badge>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <p className="text-sm text-muted-foreground">{line}</p>
        <a
          href={link.href}
          target="_blank"
          rel="noreferrer"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          {link.label}
        </a>
        <form
          className="flex items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            submit()
          }}
        >
          <Input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={`which GIF + where (${title.toLowerCase()})`}
          />
          <Button type="submit" size="sm" disabled={saving || !note.trim()}>
            Mark uploaded
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
