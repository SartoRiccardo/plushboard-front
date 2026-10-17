# plushboard-front

React + Vite SPA of Plushboard. Pairs with
[plushboard-back](https://github.com/SartoRiccardo/plushboard-back) (API it
calls same-origin) and
[plushboard-infra](https://github.com/SartoRiccardo/plushboard-infra)
(Caddy serves the built static files and reverse-proxies `/api` + `/mcp`).

## Dev

```bash
npm i
npm run dev        # Vite on :5173, proxies /api + /auth to :8000
npm run build
```

Note: day-to-day development happens in the plushboard monolith checkout
(single tree, `make dev` runs backend + Vite); this repo is what CI builds —
every tag push produces a GitHub release with `dist.zip`, which
plushboard-infra's `update-frontend.sh` pulls onto the VPS.
