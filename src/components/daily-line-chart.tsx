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

export interface DailyPoint {
  date: string
  [key: string]: unknown
}

/** Single-series daily line — zero days read as explicit dips to 0. */
export function DailyLineChart({
  data,
  valueKey = "clicks",
  unit = "clicks",
  height = 220,
}: {
  data: DailyPoint[]
  valueKey?: string
  unit?: string
  height?: number
}) {
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
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
            cursor={{ stroke: VIZ.axis, strokeWidth: 1 }}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null
              const p = payload[0].payload as DailyPoint
              return (
                <div className="rounded-md border bg-popover px-3 py-2 text-sm shadow-md">
                  <div className="text-muted-foreground">{fmtDate(p.date)}</div>
                  <div className="font-medium">
                    {fmtInt(Number(p[valueKey]))} {unit}
                  </div>
                </div>
              )
            }}
          />
          <Line
            type="monotone"
            dataKey={valueKey}
            stroke={VIZ.series1}
            strokeWidth={2}
            dot={{ r: 2.5, fill: VIZ.series1, strokeWidth: 0 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
