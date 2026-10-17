import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { VIZ } from "@/lib/viz"
import { fmtDate, fmtInt, romeToday } from "@/lib/format"

export interface DailyPoint {
  date: string
  [key: string]: unknown
}

/** Single-series daily bars. Today renders lighter + "in progress" in the
 * tooltip. Generic over the value key (visitors, clicks, ...). */
export function DailyBarChart({
  data,
  valueKey = "visitors",
  unit = "visitors",
  height = 220,
}: {
  data: DailyPoint[]
  valueKey?: string
  unit?: string
  height?: number
}) {
  const today = romeToday()
  return (
    <div style={{ height }}>
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
              const p = payload[0].payload as DailyPoint
              const inProgress = p.date === today
              return (
                <div className="rounded-md border bg-popover px-3 py-2 text-sm shadow-md">
                  <div className="text-muted-foreground">
                    {fmtDate(p.date)}
                    {inProgress && " · in progress"}
                  </div>
                  <div className="font-medium">
                    {fmtInt(Number(p[valueKey]))} {unit}
                  </div>
                </div>
              )
            }}
          />
          <Bar dataKey={valueKey} radius={[4, 4, 0, 0]} minPointSize={2} maxBarSize={40}>
            {data.map((p) => (
              <Cell
                key={p.date}
                fill={p.date === today ? VIZ.series1InProgress : VIZ.series1}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
