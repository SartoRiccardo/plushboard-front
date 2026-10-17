import { useCallback, useEffect, useState } from "react"
import { ArrowDownRight, ArrowRight, ArrowUpRight, Trash2 } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { api } from "@/lib/api"
import { fmtDate, romeToday } from "@/lib/format"

interface Account {
  id: number
  name: string
  description: string | null
  dare_increases: boolean
  dare_sum: number
  avere_sum: number
  balance: number
}

interface Movement {
  id: number
  date: string
  description: string | null
  currency: "EUR" | "USD"
  dare_accounts: string[]
  avere_accounts: string[]
  eur_amount: number
  source: string
}

interface LedgerPage {
  items: Movement[]
  total: number
  page: number
  pages: number
}

interface Product {
  id: number
  name: string
  unit_price: number
  currency: string
  active: boolean
}

interface Overview {
  accounts: Account[]
  totals: { dare_eur: number; avere_eur: number; movements: number }
}

const fmtEur = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "EUR" }).format(n)

// api() rejects with "${status}: ${body}" — surface just the server's detail text.
function detailOf(e: unknown): string {
  const msg = e instanceof Error ? e.message : String(e)
  const m = /^\d+: ([\s\S]*)$/.exec(msg)
  if (!m) return msg
  try {
    const d = JSON.parse(m[1])?.detail
    if (typeof d === "string") return d
    if (Array.isArray(d))
      // pydantic 422: [{loc: ["body","description"], msg: "Field required"}, …]
      return d
        .map((x: { loc?: (string | number)[]; msg?: string }) => {
          const loc = (x.loc ?? []).filter((p) => p !== "body").join(".")
          return loc ? `${loc}: ${x.msg}` : (x.msg ?? "")
        })
        .join("; ")
  } catch {
    // body wasn't JSON — show it raw
  }
  return m[1]
}

// Plain <select> styled to sit next to Input.
const selectCls =
  "h-8 rounded-lg border border-input bg-transparent px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"

type Confirm =
  | { kind: "account"; id: number; name: string }
  | { kind: "movement"; id: number; label: string }
  | { kind: "product"; id: number; name: string }
  | null

export function Finance() {
  const [overview, setOverview] = useState<Overview | null>(null)
  const [ledger, setLedger] = useState<LedgerPage | null>(null)
  const [page, setPage] = useState(1)
  const [products, setProducts] = useState<Product[] | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const loadOverview = useCallback(async () => {
    setOverview(await api<Overview>("/api/finance/overview"))
  }, [])

  const loadLedger = useCallback(async (p: number) => {
    setLedger(await api<LedgerPage>(`/api/finance/movements?page=${p}&per_page=25`))
  }, [])

  const loadProducts = useCallback(async () => {
    setProducts(await api<Product[]>("/api/finance/products"))
  }, [])

  useEffect(() => {
    setLoading(true)
    Promise.all([loadOverview(), loadLedger(1), loadProducts()])
      .then(() => setLoadError(null))
      .catch((e) => setLoadError(detailOf(e)))
      .finally(() => setLoading(false))
  }, [loadOverview, loadLedger, loadProducts])

  const accounts = overview?.accounts ?? []

  // --- accounts ---
  const [accName, setAccName] = useState("")
  const [accDesc, setAccDesc] = useState("")
  const [accDare, setAccDare] = useState(true)
  const [addingAcc, setAddingAcc] = useState(false)
  const [accError, setAccError] = useState<string | null>(null)

  const addAccount = async () => {
    if (!accName.trim()) return
    setAddingAcc(true)
    setAccError(null)
    try {
      await api("/api/finance/accounts", {
        method: "POST",
        body: JSON.stringify({
          name: accName.trim(),
          description: accDesc.trim() || undefined,
          dare_increases: accDare,
        }),
      })
      setAccName("")
      setAccDesc("")
      await loadOverview()
    } catch (e) {
      setAccError(detailOf(e))
    } finally {
      setAddingAcc(false)
    }
  }

  // --- movements ---
  const [mDate, setMDate] = useState(romeToday())
  const [mDesc, setMDesc] = useState("")
  const [mAmount, setMAmount] = useState("")
  const [mCurrency, setMCurrency] = useState<"EUR" | "USD">("EUR")
  const [mDare, setMDare] = useState("")
  const [mAvere, setMAvere] = useState("")
  const [mRate, setMRate] = useState("")
  const [addingMov, setAddingMov] = useState(false)
  const [movError, setMovError] = useState<string | null>(null)

  const addMovement = async () => {
    const amount = Number(mAmount)
    if (!mDare || !mAvere || !(amount > 0)) return
    if (mDare === mAvere) return
    setAddingMov(true)
    setMovError(null)
    try {
      await api("/api/finance/movements", {
        method: "POST",
        body: JSON.stringify({
          date: mDate,
          description: mDesc.trim() || undefined,
          currency: mCurrency,
          legs: [
            { account_id: Number(mDare), dare: amount, avere: 0 },
            { account_id: Number(mAvere), dare: 0, avere: amount },
          ],
          manual_rate: mCurrency === "USD" && mRate ? Number(mRate) : undefined,
        }),
      })
      setMDesc("")
      setMAmount("")
      setMRate("")
      setPage(1)
      await Promise.all([loadLedger(1), loadOverview()])
    } catch (e) {
      setMovError(detailOf(e))
    } finally {
      setAddingMov(false)
    }
  }

  // --- products ---
  const [prodName, setProdName] = useState("")
  const [prodPrice, setProdPrice] = useState("")
  const [addingProd, setAddingProd] = useState(false)
  const [prodError, setProdError] = useState<string | null>(null)

  const addProduct = async () => {
    const price = Number(prodPrice)
    if (!prodName.trim() || !(price > 0)) return
    setAddingProd(true)
    setProdError(null)
    try {
      await api("/api/finance/products", {
        method: "POST",
        body: JSON.stringify({ name: prodName.trim(), unit_price: price }),
      })
      setProdName("")
      setProdPrice("")
      await loadProducts()
    } catch (e) {
      setProdError(detailOf(e))
    } finally {
      setAddingProd(false)
    }
  }

  // --- deletes (one shared confirm dialog) ---
  const [confirm, setConfirm] = useState<Confirm>(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const doDelete = async () => {
    if (!confirm) return
    setDeleting(true)
    setDeleteError(null)
    try {
      const path =
        confirm.kind === "account"
          ? `/api/finance/accounts/${confirm.id}`
          : confirm.kind === "movement"
            ? `/api/finance/movements/${confirm.id}`
            : `/api/finance/products/${confirm.id}`
      await api(path, { method: "DELETE" })
      setConfirm(null)
      if (confirm.kind === "account") await loadOverview()
      if (confirm.kind === "movement")
        await Promise.all([loadLedger(page), loadOverview()])
      if (confirm.kind === "product") await loadProducts()
    } catch (e) {
      setDeleteError(detailOf(e))
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-lg font-semibold">Finance</h1>

      {loadError && (
        <Alert variant="destructive">
          <AlertTitle>Could not load</AlertTitle>
          <AlertDescription>{loadError}</AlertDescription>
        </Alert>
      )}

      {loading && overview == null && <Skeleton className="h-64" />}

      {overview != null && (
        <>
          {/* Overview strip: one card per account + movement count */}
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {overview.accounts.map((a) => (
              <Card key={a.id}>
                <CardContent>
                  <div className="truncate text-sm text-muted-foreground">{a.name}</div>
                  <div
                    className="text-3xl font-semibold tabular-nums"
                    style={a.balance < 0 ? { color: "#d03b3b" } : undefined}
                  >
                    {fmtEur(a.balance)}
                  </div>
                </CardContent>
              </Card>
            ))}
            <Card>
              <CardContent>
                <div className="text-sm text-muted-foreground">Movements</div>
                <div className="text-3xl font-semibold tabular-nums">
                  {overview.totals.movements}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Accounts */}
          <section className="flex flex-col gap-3">
            <h2 className="text-sm font-medium text-muted-foreground">Accounts</h2>
            {accError && (
              <Alert variant="destructive">
                <AlertTitle>Could not add account</AlertTitle>
                <AlertDescription>{accError}</AlertDescription>
              </Alert>
            )}
            {accounts.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Balance</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {accounts.map((a) => (
                    <TableRow key={a.id}>
                      <TableCell className="font-medium">
                        {a.name}
                        {a.description && (
                          <span className="ml-2 text-xs text-muted-foreground">
                            {a.description}
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          {a.dare_increases ? (
                            <ArrowUpRight className="size-3.5 text-[#0ca30c]" />
                          ) : (
                            <ArrowDownRight className="size-3.5" />
                          )}
                          {a.dare_increases ? "grows with Dare" : "grows with Avere"}
                        </span>
                      </TableCell>
                      <TableCell
                        className="text-right font-medium tabular-nums"
                        style={a.balance < 0 ? { color: "#d03b3b" } : undefined}
                      >
                        {fmtEur(a.balance)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          aria-label={`Delete ${a.name}`}
                          onClick={() =>
                            setConfirm({ kind: "account", id: a.id, name: a.name })
                          }
                        >
                          <Trash2 />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-sm text-muted-foreground">
                no accounts yet — add one below
              </p>
            )}
            <form
              className="flex flex-wrap items-center gap-2"
              onSubmit={(e) => {
                e.preventDefault()
                addAccount()
              }}
            >
              <Input
                value={accName}
                onChange={(e) => setAccName(e.target.value)}
                placeholder="account name"
                className="w-44"
              />
              <Input
                value={accDesc}
                onChange={(e) => setAccDesc(e.target.value)}
                placeholder="description (optional)"
                className="w-52"
              />
              <label className="flex items-center gap-2 text-sm text-muted-foreground">
                <Switch
                  size="sm"
                  checked={accDare}
                  onCheckedChange={(v) => setAccDare(Boolean(v))}
                />
                grows with Dare
              </label>
              <Button type="submit" size="sm" disabled={addingAcc || !accName.trim()}>
                {addingAcc ? "adding…" : "Add account"}
              </Button>
            </form>
          </section>

          {/* Movements */}
          <section className="flex flex-col gap-3">
            <div className="flex flex-wrap items-baseline gap-2">
              <h2 className="text-sm font-medium text-muted-foreground">Movements</h2>
              <span className="text-xs text-muted-foreground">
                {ledger ? `${ledger.total} total` : ""}
              </span>
            </div>
            {movError && (
              <Alert variant="destructive">
                <AlertTitle>Could not log movement</AlertTitle>
                <AlertDescription>{movError}</AlertDescription>
              </Alert>
            )}
            <form
              className="flex flex-wrap items-center gap-2"
              onSubmit={(e) => {
                e.preventDefault()
                addMovement()
              }}
            >
              <Input
                type="date"
                value={mDate}
                onChange={(e) => setMDate(e.target.value)}
                className="w-40"
              />
              <Input
                value={mDesc}
                onChange={(e) => setMDesc(e.target.value)}
                placeholder="description"
                className="min-w-40 flex-1 sm:max-w-xs"
              />
              <Input
                type="number"
                step="any"
                min="0"
                value={mAmount}
                onChange={(e) => setMAmount(e.target.value)}
                placeholder="amount"
                className="w-24"
              />
              <ToggleGroup
                size="sm"
                variant="outline"
                value={[mCurrency]}
                onValueChange={(v: string[]) => {
                  if (v.length) setMCurrency(v[v.length - 1] as "EUR" | "USD")
                }}
              >
                <ToggleGroupItem value="EUR">EUR</ToggleGroupItem>
                <ToggleGroupItem value="USD">USD</ToggleGroupItem>
              </ToggleGroup>
              <select
                className={selectCls}
                value={mDare}
                onChange={(e) => setMDare(e.target.value)}
                aria-label="Dare account"
              >
                <option value="">Dare account…</option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
              <ArrowRight className="size-4 text-muted-foreground" />
              <select
                className={selectCls}
                value={mAvere}
                onChange={(e) => setMAvere(e.target.value)}
                aria-label="Avere account"
              >
                <option value="">Avere account…</option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
              {mCurrency === "USD" && (
                <Input
                  type="number"
                  step="any"
                  min="0"
                  value={mRate}
                  onChange={(e) => setMRate(e.target.value)}
                  placeholder="manual rate (optional)"
                  className="w-32"
                />
              )}
              <Button
                type="submit"
                size="sm"
                disabled={
                  addingMov || !mDate || !(Number(mAmount) > 0) ||
                  !mDare || !mAvere || mDare === mAvere
                }
              >
                {addingMov ? "logging…" : "Log movement"}
              </Button>
            </form>
            {ledger != null &&
              (ledger.items.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  no movements yet — log one above
                </p>
              ) : (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Dare → Avere</TableHead>
                        <TableHead className="text-right">EUR</TableHead>
                        <TableHead />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {ledger.items.map((m) => (
                        <TableRow key={m.id}>
                          <TableCell className="whitespace-nowrap">
                            {fmtDate(m.date)}
                          </TableCell>
                          <TableCell className="max-w-40 truncate">
                            {m.description ?? "–"}
                          </TableCell>
                          <TableCell>
                            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                              {m.dare_accounts.join(", ")}
                              <ArrowRight className="size-3 shrink-0" />
                              {m.avere_accounts.join(", ")}
                            </span>
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {m.currency === "USD" && "≈ "}
                            {fmtEur(m.eur_amount)}
                          </TableCell>
                          <TableCell>
                            <span className="flex items-center justify-end gap-1">
                              {m.source !== "manual" && (
                                <Badge variant="outline" className="text-[10px]">
                                  {m.source}
                                </Badge>
                              )}
                              <Button
                                variant="ghost"
                                size="icon-xs"
                                aria-label="Delete movement"
                                onClick={() =>
                                  setConfirm({
                                    kind: "movement",
                                    id: m.id,
                                    label: `${fmtDate(m.date)} ${fmtEur(m.eur_amount)}`,
                                  })
                                }
                              >
                                <Trash2 />
                              </Button>
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground tabular-nums">
                      page {ledger.page} of {ledger.pages} · {ledger.total} movements
                    </span>
                    <Button
                      variant="ghost"
                      size="xs"
                      disabled={ledger.page <= 1}
                      onClick={() => {
                        const p = page - 1
                        setPage(p)
                        loadLedger(p)
                      }}
                    >
                      Prev
                    </Button>
                    <Button
                      variant="ghost"
                      size="xs"
                      disabled={ledger.page >= ledger.pages}
                      onClick={() => {
                        const p = page + 1
                        setPage(p)
                        loadLedger(p)
                      }}
                    >
                      Next
                    </Button>
                  </div>
                </>
              ))}
          </section>

          {/* Products */}
          <section className="flex flex-col gap-3">
            <h2 className="text-sm font-medium text-muted-foreground">Products</h2>
            {prodError && (
              <Alert variant="destructive">
                <AlertTitle>Could not add product</AlertTitle>
                <AlertDescription>{prodError}</AlertDescription>
              </Alert>
            )}
            {products != null && products.length > 0 && (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead className="text-right">Unit price</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">
                        {p.name}
                        {!p.active && (
                          <Badge variant="outline" className="ml-2 text-[10px]">
                            inactive
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        € {p.unit_price.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          aria-label={`Delete ${p.name}`}
                          onClick={() =>
                            setConfirm({ kind: "product", id: p.id, name: p.name })
                          }
                        >
                          <Trash2 />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
            <form
              className="flex flex-wrap items-center gap-2"
              onSubmit={(e) => {
                e.preventDefault()
                addProduct()
              }}
            >
              <Input
                value={prodName}
                onChange={(e) => setProdName(e.target.value)}
                placeholder="product name"
                className="w-52"
              />
              <Input
                type="number"
                step="any"
                min="0"
                value={prodPrice}
                onChange={(e) => setProdPrice(e.target.value)}
                placeholder="unit price €"
                className="w-28"
              />
              <Button
                type="submit"
                size="sm"
                disabled={addingProd || !prodName.trim() || !(Number(prodPrice) > 0)}
              >
                {addingProd ? "adding…" : "Add"}
              </Button>
            </form>
          </section>
        </>
      )}

      {deleteError && (
        <Alert variant="destructive">
          <AlertTitle>Delete failed</AlertTitle>
          <AlertDescription>{deleteError}</AlertDescription>
        </Alert>
      )}

      <AlertDialog open={confirm != null} onOpenChange={(o) => !o && setConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogTitle>
            {confirm?.kind === "movement"
              ? `Delete movement ${confirm.label}?`
              : `Delete ${confirm?.name}?`}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {confirm?.kind === "account"
              ? "Accounts referenced by movements cannot be deleted."
              : "This removes the row for good."}
          </AlertDialogDescription>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" disabled={deleting} onClick={doDelete}>
              {deleting ? "deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
