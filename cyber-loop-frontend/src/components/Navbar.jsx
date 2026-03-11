import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

export default function Navbar() {
  const navigate = useNavigate()

  // Placeholder timer state — backend team will control this
  const [timeLeft, setTimeLeft] = useState(7142) // 01:59:02 in seconds
  const isLowTime = timeLeft < 60

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0))
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  const formatTime = (seconds) => {
    const h = String(Math.floor(seconds / 3600)).padStart(2, '0')
    const m = String(Math.floor((seconds % 3600) / 60)).padStart(2, '0')
    const s = String(seconds % 60).padStart(2, '0')
    return `${h}:${m}:${s}`
  }

  // Placeholder team name — backend team will control this
  const teamName = sessionStorage.getItem('teamName') || 'Team Alpha'

  return (
    <nav
      className="w-full flex items-center justify-between px-6 py-3 relative z-50"
      style={{
        background: 'rgba(11, 11, 15, 0.95)',
        borderBottom: '1px solid rgba(255, 179, 0, 0.15)',
        backdropFilter: 'blur(10px)',
      }}
    >
      {/* LEFT — Title */}
      <div
        className="select-none cursor-pointer"
        onClick={() => navigate('/')}
        style={{
          fontFamily: "'Space Grotesk', sans-serif",
          fontSize: '1.25rem',
          fontWeight: 700,
          color: '#FFB300',
          letterSpacing: '0.1em',
          textShadow: '0 0 15px rgba(255,179,0,0.4)',
        }}
      >
        RECURSION HELL
      </div>

      {/* CENTER — Timer + Team */}
      <div className="flex flex-col items-center">
        <div
          className="select-none"
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: '1.4rem',
            fontWeight: 600,
            color: isLowTime ? '#ff4444' : '#e0e0e0',
            letterSpacing: '0.12em',
            animation: isLowTime ? 'redPulse 1s ease-in-out infinite' : 'none',
            textShadow: isLowTime ? '0 0 10px rgba(255,0,0,0.5)' : 'none',
          }}
        >
          {formatTime(timeLeft)}
        </div>
        <div
          style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: '0.7rem',
            color: 'rgba(255,179,0,0.6)',
            letterSpacing: '0.08em',
            marginTop: '2px',
          }}
        >
          {teamName}
        </div>
      </div>

      {/* RIGHT — Buttons */}
      <div className="flex gap-3">
        <button
          onClick={() => navigate('/scoreboard')}
          className="px-4 py-2 rounded border cursor-pointer transition-all duration-200"
          style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: '0.8rem',
            fontWeight: 500,
            color: '#FFB300',
            borderColor: 'rgba(255,179,0,0.3)',
            background: 'rgba(255,179,0,0.05)',
            letterSpacing: '0.05em',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(255,179,0,0.15)'
            e.currentTarget.style.borderColor = 'rgba(255,179,0,0.5)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(255,179,0,0.05)'
            e.currentTarget.style.borderColor = 'rgba(255,179,0,0.3)'
          }}
        >
          Scoreboard
        </button>
        <button
          onClick={() => navigate('/login')}
          className="px-4 py-2 rounded border cursor-pointer transition-all duration-200"
          style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: '0.8rem',
            fontWeight: 500,
            color: '#B71C1C',
            borderColor: 'rgba(183,28,28,0.3)',
            background: 'rgba(183,28,28,0.05)',
            letterSpacing: '0.05em',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(183,28,28,0.15)'
            e.currentTarget.style.borderColor = 'rgba(183,28,28,0.5)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(183,28,28,0.05)'
            e.currentTarget.style.borderColor = 'rgba(183,28,28,0.3)'
          }}
        >
          Logout
        </button>
      </div>
    </nav>
  )
}
