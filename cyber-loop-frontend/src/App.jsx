import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Login from './pages/Login'
import Landing from './pages/Landing'
import Scoreboard from './pages/scoreboard'
import GamePage from './pages/gamepage'
import Team from './pages/team'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/landing" element={<Landing />} />
        <Route path="/Scoreboard" element={<Scoreboard />} />
        <Route path="/game" element={<GamePage />} />
        <Route path="/team" element={<Team />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App