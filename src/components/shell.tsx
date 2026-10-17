import { useState } from "react"
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom"
import { Menu } from "lucide-react"
import { NAV } from "@/lib/sources"
import { StatusDot } from "@/components/status-dot"
import type { SourceStatus } from "@/lib/sources"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { OverviewProvider, useOverview } from "@/hooks/use-overview"
import { cn } from "@/lib/utils"

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const { data } = useOverview()
  const sources = data?.sources ?? {}
  return (
    <>
      {NAV.map((item) => {
        const sid = item.source
        const info = sid ? sources[sid] : undefined
        const status: SourceStatus = info ? info.status : "never"
        return (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === "/"}
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm whitespace-nowrap text-muted-foreground hover:text-foreground",
                isActive && "bg-muted text-foreground",
              )
            }
            title={info?.error ?? undefined}
          >
            {item.label}
            {sid && <StatusDot status={status} title={`${item.label}: ${status}`} />}
          </NavLink>
        )
      })}
    </>
  )
}

function Nav() {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)

  return (
    <header className="sticky top-0 z-10 border-b bg-background">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-6 px-4">
        {/* mobile: hamburger drawer */}
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger
            render={
              <Button variant="ghost" size="icon" className="-ml-2 sm:hidden" aria-label="Menu">
                <Menu />
              </Button>
            }
          />
          <SheetContent side="left" className="w-64">
            <SheetHeader>
              <SheetTitle>Plushboard</SheetTitle>
            </SheetHeader>
            <nav className="flex flex-col gap-1 px-2">
              <NavLinks onNavigate={() => setOpen(false)} />
            </nav>
            <div className="mt-auto px-2 pb-4">
              <form
                method="post"
                action="/api/auth/logout"
                onSubmit={() => {
                  setOpen(false)
                  navigate("/auth/login")
                }}
              >
                <button
                  type="submit"
                  className="w-full rounded-md px-2.5 py-1.5 text-left text-sm text-muted-foreground hover:text-foreground"
                >
                  Log out
                </button>
              </form>
            </div>
          </SheetContent>
        </Sheet>

        <Link to="/" className="flex items-center gap-2 text-base font-semibold tracking-tight">
          Plushboard
        </Link>

        {/* desktop nav */}
        <nav className="hidden flex-1 items-center gap-1 overflow-x-auto sm:flex">
          <NavLinks />
        </nav>

        <form
          method="post"
          action="/api/auth/logout"
          onSubmit={() => navigate("/auth/login")}
          className="hidden sm:block"
        >
          <button type="submit" className="text-sm text-muted-foreground hover:text-foreground">
            Log out
          </button>
        </form>
      </div>
    </header>
  )
}

export function Shell() {
  return (
    <OverviewProvider>
      <div className="min-h-svh">
        <Nav />
        <main className="mx-auto max-w-6xl px-3 py-4 sm:px-4 sm:py-6">
          <Outlet />
        </main>
      </div>
    </OverviewProvider>
  )
}
