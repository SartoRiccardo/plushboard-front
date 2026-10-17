import { Link, useNavigate } from "react-router-dom"
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { StatusDot } from "@/components/status-dot"
import { useOverview, type CardItem, type Days } from "@/hooks/use-overview"
import type { SourceStatus } from "@/lib/sources"
import { api } from "@/lib/api"
import { dayKey, dayLabel, fmtDate, fmtInt } from "@/lib/format"
import { cn } from "@/lib/utils"
import { VIZ } from "@/lib/viz"

const SEVERITY_CLASS: Record<string, string> = {
  win: "text-[#0ca30c]",
  warn: "text-[#fab219]",
  info: "text-muted-foreground",
}

/** 30-day visitors trend — full row at the top, the page's anchor. */
function TrendCard() {
  const { data } = useOverview()
  const rt = data?.today.realtime
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <CardTitle className="text-sm font-medium">Visitors — 30 days</CardTitle>
          {rt != null && (
            <Badge variant="outline" className="gap-1.5 px-1.5 py-0 text-[10px]">
              <span className="size-1.5 rounded-full bg-[#0ca30c]" />
              {fmtInt(rt)} now
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {data ? (
          data.sparkline.length > 1 ? (
            <div style={{ height: 140 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.sparkline} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
                  <CartesianGrid stroke={VIZ.grid} vertical={false} />
                  <XAxis
                    dataKey="date"
                    tick={{ fill: VIZ.axis, fontSize: 10 }}
                    tickLine={false}
                    axisLine={{ stroke: VIZ.grid }}
                    tickFormatter={(d: string) => fmtDate(d)}
                    minTickGap={40}
                  />
                  <YAxis hide domain={[0, "dataMax"]} />
                  <Tooltip
                    cursor={{ stroke: VIZ.axis, strokeWidth: 1 }}
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null
                      const p = payload[0].payload as { date: string; visitors: number }
                      return (
                        <div className="rounded-md border bg-popover px-2.5 py-1.5 text-xs shadow-md">
                          <span className="text-muted-foreground">{fmtDate(p.date)}</span>
                          {" · "}
                          <span className="font-medium">{fmtInt(p.visitors)}</span>
                        </div>
                      )
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="visitors"
                    stroke={VIZ.series1}
                    strokeWidth={2}
                    fill="url(#spark)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">not enough data yet</p>
          )
        ) : (
          <Skeleton className="h-28" />
        )}
      </CardContent>
    </Card>
  )
}

/** Compact 2-col source cards (mobile-first); whole card deep-links. */
function SourceCards() {
  const { data } = useOverview()
  const cards = data?.cards ?? []
  if (!data) {
    return (
      <div className="grid grid-cols-2 gap-3">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
    )
  }
  if (cards.length === 0) {
    return <p className="text-sm text-muted-foreground">never fetched — hit Refresh</p>
  }
  return (
    <div className="grid grid-cols-2 gap-3">
      {cards.map((card) => (
        <SourceCard key={card.source} card={card} status={data.sources[card.source]?.status ?? "never"} />
      ))}
    </div>
  )
}

function SourceCard({ card, status }: { card: CardItem; status: SourceStatus }) {
  return (
    <div className="relative">
      <Link to={card.page} className="block">
        <Card className="h-full gap-0 p-3 transition-colors hover:bg-muted/40">
          <div className="flex items-center gap-1.5">
            <StatusDot status={status} />
            <span className="text-xs font-medium text-muted-foreground">{card.label}</span>
            {card.delta_new && (
              <Badge variant="secondary" className="ml-auto px-1.5 py-0 text-[10px]">
                new
              </Badge>
            )}
          </div>
          <div className="mt-1.5 line-clamp-2 text-sm font-semibold leading-snug tracking-tight">
            {card.headline}
          </div>
          {card.lines.slice(0, 2).map((l) => (
            <div key={l} className="mt-0.5 truncate text-[11px] text-muted-foreground">
              {l}
            </div>
          ))}
        </Card>
      </Link>
      <a
        href={card.og}
        target="_blank"
        rel="noreferrer"
        title={`open ${card.label}`}
        className="absolute right-1.5 bottom-1.5 rounded px-1 text-[11px] text-muted-foreground/60 hover:text-foreground"
      >
        ↗
      </a>
    </div>
  )
}

/** Alerts live at the very bottom of Overview, below everything. */
function AlertFeed() {
  const { data, refresh } = useOverview()
  const navigate = useNavigate()
  const alerts = data?.alerts ?? []

  const dismiss = async (id?: number) => {
    await api("/api/alerts/seen", { method: "POST", body: JSON.stringify({ id }) })
    refresh()
  }

  const byDay = new Map<string, typeof alerts>()
  for (const a of alerts) {
    const k = dayKey(a.created_at)
    if (!byDay.has(k)) byDay.set(k, [])
    byDay.get(k)!.push(a)
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <CardTitle className="text-sm font-medium">Unseen changes</CardTitle>
          {alerts.length > 0 && (
            <Badge variant="secondary" className="px-1.5 py-0 text-[10px]">
              {alerts.length}
            </Badge>
          )}
          {alerts.length > 0 && (
            <button
              className="ml-auto text-xs text-muted-foreground hover:text-foreground"
              onClick={() => dismiss()}
            >
              mark all read
            </button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {!data ? (
          <Skeleton className="h-16" />
        ) : alerts.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nothing new — you're all caught up.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {[...byDay.entries()].map(([day, items]) => (
              <div key={day} className="flex flex-col gap-1.5">
                <div className="text-[11px] text-muted-foreground">{dayLabel(day)}</div>
                {items.map((a) => (
                  <div key={a.id} className="flex items-start gap-2 text-sm">
                    <span
                      className={cn("mt-1.5 size-1.5 shrink-0 rounded-full", SEVERITY_CLASS[a.severity])}
                    />
                    <button
                      className="flex-1 text-left leading-snug hover:underline"
                      onClick={() => navigate(a.page)}
                    >
                      {a.one_liner}
                    </button>
                    <button
                      className="shrink-0 text-xs text-muted-foreground hover:text-foreground"
                      onClick={() => dismiss(a.id)}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export function Overview() {
  const { refreshing, refreshAll, days, setDays } = useOverview()
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-end gap-2">
        <ToggleGroup
          value={[String(days)]}
          onValueChange={(v: string[]) => {
            if (v.length) setDays(Number(v[v.length - 1]) as Days)
          }}
          size="sm"
          variant="outline"
        >
          <ToggleGroupItem value="1">1d</ToggleGroupItem>
          <ToggleGroupItem value="7">7d</ToggleGroupItem>
          <ToggleGroupItem value="30">30d</ToggleGroupItem>
        </ToggleGroup>
        <Button variant="outline" size="sm" disabled={refreshing} onClick={refreshAll}>
          Refresh
        </Button>
      </div>
      <TrendCard />
      <SourceCards />
      <AlertFeed />
    </div>
  )
}
