import { createContext, useCallback, useContext, useEffect, useState } from "react"
import type { ReactNode } from "react"
import { api } from "@/lib/api"

export interface SourceInfo {
  status: "fresh" | "stale" | "error" | "never"
  error: string | null
  last_ok: string | null
  label: string
  free: boolean
  enabled: boolean
  creds: boolean
  interval: number
}

export interface AlertItem {
  id: number
  rule: string
  severity: "info" | "win" | "warn"
  one_liner: string
  page: string
  created_at: string
}

export interface CardItem {
  source: string
  label: string
  page: string
  og: string
  headline: string
  delta_new: boolean
  lines: string[]
}

export type Days = 1 | 7 | 30

export interface Overview {
  sources: Record<string, SourceInfo>
  alerts: AlertItem[]
  cards: CardItem[]
  today: { visitors: number | null; realtime: number | null }
  sparkline: { date: string; visitors: number }[]
}

interface Ctx {
  data: Overview | null
  error: string | null
  refresh: () => Promise<void>
  refreshAll: () => Promise<void>
  refreshing: boolean
  days: Days
  setDays: (d: Days) => void
}

const OverviewCtx = createContext<Ctx>({
  data: null,
  error: null,
  refresh: async () => {},
  refreshAll: async () => {},
  refreshing: false,
  days: 7,
  setDays: () => {},
})

export function OverviewProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<Overview | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [days, setDays] = useState<Days>(7)

  const refresh = useCallback(async () => {
    try {
      setData(await api<Overview>(`/api/overview?days=${days}`))
      setError(null)
    } catch (e) {
      setError(String(e))
    }
  }, [days])

  useEffect(() => {
    refresh()
  }, [refresh])

  const refreshAll = useCallback(async () => {
    setRefreshing(true)
    try {
      await api("/api/refresh", { method: "POST" })
      await refresh()
    } finally {
      setRefreshing(false)
    }
  }, [refresh])

  return (
    <OverviewCtx.Provider
      value={{ data, error, refresh, refreshAll, refreshing, days, setDays }}
    >
      {children}
    </OverviewCtx.Provider>
  )
}

export function useOverview() {
  return useContext(OverviewCtx)
}
