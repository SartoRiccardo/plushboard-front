import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export function Login() {
  const [devBypass, setDevBypass] = useState(false)

  useEffect(() => {
    fetch("/api/auth/mode")
      .then((r) => r.json())
      .then((m) => setDevBypass(Boolean(m.dev_bypass)))
      .catch(() => {})
  }, [])

  return (
    <div className="flex min-h-svh items-center justify-center px-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="items-center text-center">
          <CardTitle className="text-2xl tracking-tight">Plushboard</CardTitle>
          <CardDescription>smallplushies.com ops</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-3">
          <Button render={<a href="/api/auth/google" />} className="w-full">
            Sign in with Google
          </Button>
          {devBypass && (
            <Button variant="outline" className="w-full" onClick={devLogin}>
              Dev login (local only)
            </Button>
          )}
          <p className="text-sm text-muted-foreground">
            Single-user dashboard. Access is by allowlist.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

// The button only renders when the backend says APP_ENV=local; the server
// also refuses unless APP_ENV=local, so this can't work anywhere else.
function devLogin() {
  fetch("/api/auth/dev-login", { method: "POST" }).then((r) => {
    if (r.ok) window.location.href = "/"
  })
}
