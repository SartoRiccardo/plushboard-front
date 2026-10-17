import { cn } from "@/lib/utils"
import type { SourceStatus } from "@/lib/sources"

const COLORS: Record<SourceStatus, string> = {
  fresh: "bg-emerald-500",
  stale: "bg-amber-500",
  error: "bg-red-500",
  never: "bg-muted-foreground/30",
}

export function StatusDot({ status, title }: { status: SourceStatus; title?: string }) {
  return (
    <span
      title={title}
      className={cn("inline-block size-2 shrink-0 rounded-full", COLORS[status])}
    />
  )
}
