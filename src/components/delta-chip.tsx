import { Badge } from "@/components/ui/badge"
import { fmtDelta } from "@/lib/format"

/** Delta chip per spec §6: +N / −N / new / nothing when no change. */
export function DeltaChip({
  delta,
  isNew,
  className,
}: {
  delta?: number | null
  isNew?: boolean
  className?: string
}) {
  if (isNew) {
    return (
      <Badge variant="secondary" className={className}>
        new
      </Badge>
    )
  }
  if (delta == null || delta === 0) return null
  const up = delta > 0
  return (
    <Badge
      variant="outline"
      className={`${className ?? ""} ${up ? "text-[#0ca30c]" : "text-[#d03b3b]"}`}
    >
      {fmtDelta(delta)}
    </Badge>
  )
}
