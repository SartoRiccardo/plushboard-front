import { Route, Routes } from "react-router-dom"
import { Shell } from "@/components/shell"
import { Login } from "@/pages/login"
import { Overview } from "@/pages/overview"
import { Merchant } from "@/pages/merchant"
import { Search } from "@/pages/search"
import { Geo } from "@/pages/geo"
import { Keywords } from "@/pages/keywords"
import { Backlinks } from "@/pages/backlinks"
import { Sales } from "@/pages/sales"
import { Finance } from "@/pages/finance"
import { Settings } from "@/pages/settings"
import { Traffic } from "@/pages/traffic"
import { Wip } from "@/pages/wip"

export default function App() {
  return (
    <Routes>
      <Route path="/auth/login" element={<Login />} />
      <Route element={<Shell />}>
        <Route path="/" element={<Overview />} />
        <Route path="/traffic" element={<Traffic />} />
        <Route path="/search" element={<Search />} />
        <Route path="/merchant" element={<Merchant />} />
        <Route path="/geo" element={<Geo />} />
        <Route path="/keywords" element={<Keywords />} />
        <Route path="/backlinks" element={<Backlinks />} />
        <Route path="/sales" element={<Sales />} />
        <Route path="/finance" element={<Finance />} />
        <Route path="/settings" element={<Settings />} />
        {/* All routes wired; the Wip fallback no longer renders. */}
        <Route path="*" element={<Wip />} />
      </Route>
    </Routes>
  )
}
