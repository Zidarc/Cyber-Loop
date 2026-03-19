import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Login       from './pages/Login'
import Landing     from './pages/Landing'
import Scoreboard  from './pages/scoreboard'
import MainGamePage from './pages/Maingamepage'
import Team        from './pages/team'
import EndScreen   from './pages/Endscreen'

// ── FIX #7: All routes are lowercase so they work on case-sensitive Linux servers.
//            Previously /Scoreboard and /Maingamepage used mixed case, which matched
//            on macOS/Windows dev but silently 404'd in production.
//
// ── FIX #14: Removed the redundant /landing alias (both / and /landing rendered Landing).
//
// ── FIX #13: Added a catch-all * route so unknown URLs redirect to / instead of blank screen.

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/"            element={<Landing />}      />
        <Route path="/login"       element={<Login />}        />
        <Route path="/scoreboard"  element={<Scoreboard />}   />
        <Route path="/maingamepage" element={<MainGamePage />} />
        <Route path="/team"        element={<Team />}         />
        <Route path="/endscreen"   element={<EndScreen />}    />

        {/* Catch-all: redirect unknown paths back to landing */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App