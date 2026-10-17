import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { VIZ } from "@/lib/viz"
import { fmtDate, fmtInt } from "@/lib/format"

export interface Series {
  name: string
  color: string
  points: Record<string, string | number>[]
}

/** Multi-series daily line chart (one line per entity, legend included —
 * ≥2 series never rely on color alone). */
export function MultiLineChart({
  series,
  dateKey = "date",
  height = 200,
}: {
  series: Series[]
  dateKey?: string
  height?: number
}) {
  // merge all series into one row-per-date dataset for recharts
  const dates = [...new Set(series.flatMap((s) => s.points.map((p) => String(p[dateKey]))))].sort()
  const data = dates.map((d) => {
    const row: Record<string, string | number> = { [dateKey]: d }
    for (const s of series) {
      const pt = s.points.find((p) => String(p[dateKey]) === d)
      if (pt) for (const [k, v] of Object.entries(pt)) if (k !== dateKey) row[`${s.name}:${k}`] = v
    }
    return row
  })

  return (
    <div className="flex flex-col gap-2">
      <div style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
            <CartesianGrid stroke={VIZ.grid} vertical={false} />
            <XAxis
              dataKey={dateKey}
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
              cursor={{ stroke: VIZ.axis, strokeWidth: 1 }}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null
                const d = payload[0].payload as Record<string, string | number>
                return (
                  <div className="rounded-md border bg-popover px-3 py-2 text-sm shadow-md">
                    <div className="text-muted-foreground">{fmtDate(String(d[dateKey]))}</div>
                    {series.map((s) => (
                      <div key={s.name} className="flex items-center gap-1.5">
                        <span className="size-1.5 rounded-full" style={{ background: s.color }} />
                        <span className="truncate">{s.name}</span>
                        <span className="ml-auto pl-2 font-medium tabular-nums">
                          {fmtInt(Number(d[`${s.name}:value`] ?? 0))}
                        </span>
                      </div>
                    ))}
                  </div>
                )
              }}
            />
            {series.map((s) => (
              <Line
                key={s.name}
                type="monotone"
                dataKey={`${s.name}:value`}
                name={s.name}
                stroke={s.color}
                strokeWidth={2}
                dot={{ r: 2, fill: s.color, strokeWidth: 0 }}
                connectNulls
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
        {series.map((s) => (
          <span key={s.name} className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="size-2 rounded-full" style={{ background: s.color }} />
            {s.name}
          </span>
        ))}
      </div>
    </div>
  )
}
