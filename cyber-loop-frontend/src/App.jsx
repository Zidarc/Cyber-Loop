import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Login from './pages/Login'
import Landing from './pages/Landing'
import Scoreboard from './pages/scoreboard'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/landing" element={<Landing />} />
        <Route path="/Scoreboard" element={<Scoreboard />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App