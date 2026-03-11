import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Login from './pages/Login'
import HomePage from './pages/HomePage'
import MainGamePage from './pages/MainGamePage'
import ScoreboardPage from './pages/ScoreboardPage'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/game" element={<MainGamePage />} />
        <Route path="/scoreboard" element={<ScoreboardPage />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
