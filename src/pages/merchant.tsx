import { useCallback, useEffect, useState } from "react"
import { Check, CircleX, ExternalLink, Hourglass } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { MultiLineChart } from "@/components/multi-line-chart"
import { seriesColor } from "@/lib/viz"
import { api } from "@/lib/api"
import { fmtDate, fmtInt } from "@/lib/format"

interface McIssue {
  code: string
  detail: string
  severity: string
}

interface McProduct {
  offer_id: string
  title: string
  image: string | null
  state: string
  since: string | null
  issues: McIssue[]
  pending_countries: string[]
}

interface Merchant {
  status: "fresh" | "stale" | "error" | "never"
  error: string | null
  last_ok: string | null
  products: McProduct[]
  serving: {
    serving_ever: boolean
    products: {
      offer_id: string
      series: { date: string; impressions: number; clicks: number }[]
    }[]
  }
}

// state → icon + color: check = approved, hourglass = in review, x = disapproved
const STATE_ICON: Record<string, { icon: typeof Check; className: string }> = {
  approved: { icon: Check, className: "text-[#0ca30c]" },
  in_review: { icon: Hourglass, className: "text-[#fab219]" },
  disapproved: { icon: CircleX, className: "text-[#d03b3b]" },
}

export function Merchant() {
  const [data, setData] = useState<Merchant | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setData(await api<Merchant>("/api/mc/latest"))
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

  // 7-day serving sums per offer, from the same series the charts use
  const sums = new Map<string, { impressions: number; clicks: number }>()
  for (const p of data?.serving.products ?? []) {
    sums.set(
      p.offer_id,
      p.series.reduce(
        (a, pt) => ({
          impressions: a.impressions + pt.impressions,
          clicks: a.clicks + pt.clicks,
        }),
        { impressions: 0, clicks: 0 },
      ),
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-2">
        <h1 className="text-lg font-semibold">Merchant</h1>
        <a
          href="https://merchant.google.com/mc/products?a=5857930633"
          target="_blank"
          rel="noreferrer"
          title="Open Merchant Center"
          className="text-muted-foreground hover:text-foreground"
        >
          <ExternalLink className="size-4" />
        </a>
      </div>

      {loadError && (
        <Alert variant="destructive">
          <AlertTitle>Could not load</AlertTitle>
          <AlertDescription>{loadError}</AlertDescription>
        </Alert>
      )}
      {data?.status === "error" && (
        <Alert variant="destructive">
          <AlertTitle>Merchant Center upstream error — showing last good data</AlertTitle>
          <AlertDescription>{data.error}</AlertDescription>
        </Alert>
      )}

      {!data && loading && <Skeleton className="h-64" />}

      {data && data.products.length === 0 && (
        <p className="py-16 text-center text-sm text-muted-foreground">
          never fetched — the scheduler runs every 6h
        </p>
      )}

      {data && data.products.length > 0 && (
        <>
          <section className="flex flex-col gap-2">
            <h2 className="text-sm font-medium text-muted-foreground">Products</h2>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Impr.</TableHead>
                  <TableHead className="text-right">Clicks</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.products.map((p) => {
                  const s = sums.get(p.offer_id) ?? { impressions: 0, clicks: 0 }
                  const entry = STATE_ICON[p.state]
                  const Icon = entry?.icon ?? CircleX
                  return (
                    <TableRow key={p.offer_id}>
                      <TableCell className="w-1/2">
                        <span className="flex items-center gap-2">
                          {p.image ? (
                            <img
                              src={p.image}
                              alt=""
                              className="size-8 shrink-0 rounded object-cover"
                            />
                          ) : (
                            <span className="size-8 shrink-0 rounded bg-muted" />
                          )}
                          <span className="line-clamp-2 min-w-0 max-w-36 text-xs leading-snug sm:max-w-none">
                            {p.title || p.offer_id}
                          </span>
                        </span>
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        <Popover>
                          <PopoverTrigger
                            render={
                              <button
                                className="inline-flex"
                                aria-label={`${p.offer_id} status`}
                              >
                                <Icon className={`size-4 ${entry?.className ?? ""}`} />
                              </button>
                            }
                          />
                          <PopoverContent className="w-64 text-sm">
                            <div className="flex items-center gap-2 font-medium">
                              <Icon className={`size-4 ${entry?.className ?? ""}`} />
                              {p.state === "in_review"
                                ? `In review since ${p.since ? fmtDate(p.since) : "—"}.`
                                : `${p.state === "approved" ? "Approved" : "Disapproved"}.`}
                            </div>
                            {p.issues.length > 0 ? (
                              <div className="mt-2 flex flex-col gap-1.5">
                                {p.issues.map((iss) => (
                                  <div key={iss.code}>
                                    <span className="font-medium text-xs">{iss.code}</span>
                                    <div className="text-xs text-muted-foreground">
                                      {iss.detail}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="mt-2 text-xs text-muted-foreground">
                                No item-level issues.
                              </p>
                            )}
                            {p.pending_countries.length > 0 && (
                              <p className="mt-2 text-xs text-muted-foreground">
                                pending: {p.pending_countries.join(", ")}
                              </p>
                            )}
                          </PopoverContent>
                        </Popover>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-right tabular-nums">
                        {fmtInt(s.impressions)}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-right tabular-nums">
                        {fmtInt(s.clicks)}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </section>

          {data.serving.serving_ever && (
            <section className="flex flex-col gap-4">
              <h2 className="text-sm font-medium text-muted-foreground">
                Last 7 days by product
              </h2>
              <ServingChart
                title="Impressions"
                products={data.serving.products}
                field="impressions"
              />
              <ServingChart
                title="Clicks"
                products={data.serving.products}
                field="clicks"
              />
            </section>
          )}
        </>
      )}
    </div>
  )
}

function ServingChart({
  title,
  products,
  field,
}: {
  title: string
  products: { offer_id: string; series: { date: string; impressions: number; clicks: number }[] }[]
  field: "impressions" | "clicks"
}) {
  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
      <MultiLineChart
        series={products.map((p) => ({
          name: p.offer_id,
          color: seriesColor(p.offer_id),
          points: p.series.map((pt) => ({ date: pt.date, value: pt[field] })),
        }))}
        height={180}
      />
    </div>
  )
}
