import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Login from './pages/Login'
import Landing from './pages/Landing'
import Scoreboard from './pages/scoreboard'
import GamePage from './pages/gamepage'


function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/Login" element={<Login />} />
        <Route path="/Scoreboard" element={<Scoreboard />} />
        <Route path="/GamePage" element={<GamePage />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App