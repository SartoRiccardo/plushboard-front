import { Area, AreaChart, ResponsiveContainer, YAxis } from "recharts"
import { VIZ } from "@/lib/viz"

/** Bare 30-day sparkline — no axes, the number beside it carries the value. */
export function Sparkline({
  data,
  height = 40,
  width,
  valueKey = "visitors",
}: {
  data: Record<string, string | number>[]
  height?: number
  width?: number
  valueKey?: string
}) {
  return (
    <div
      style={{
        height,
        width,
        minWidth: width ?? 120,
        flex: width ? "0 0 auto" : 1,
      }}
    >
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 2, right: 0, bottom: 2, left: 0 }}>
          <defs>
            <linearGradient id="spark" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={VIZ.series1} stopOpacity={0.25} />
              <stop offset="100%" stopColor={VIZ.series1} stopOpacity={0} />
            </linearGradient>
          </defs>
          <YAxis hide domain={[0, "dataMax"]} />
          <Area
            type="monotone"
            dataKey={valueKey}
            stroke={VIZ.series1}
            strokeWidth={2}
            fill="url(#spark)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
