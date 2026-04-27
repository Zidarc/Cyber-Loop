import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { authFetch } from '../lib/api'

/**
 * GameNavbar
 *
 * NEW prop: remainingMs — server-computed remaining milliseconds snapshot.
 * NEW prop: onTick(ms) — called every 500 ms with the current ms remaining.
 * Maingamepage uses this to drive the ember-intensity ramp.
 */
export default function GameNavbar({ endsAt, remainingMs, teamName, score, onTimerExpire, onTick }) {
  const navigate  = useNavigate()
  const [timeLeft, setTimeLeft] = useState(null)
  const firedRef  = useRef(false)
  const baseRemainingRef = useRef(null)
  const startedPerfRef   = useRef(null)

  useEffect(() => {
    if (remainingMs == null && !endsAt) return
    firedRef.current = false

    if (remainingMs != null) {
      baseRemainingRef.current = Math.max(0, Number(remainingMs) || 0)
      startedPerfRef.current   = performance.now()
    } else {
      baseRemainingRef.current = null
      startedPerfRef.current   = null
    }

    const tick = () => {
      let ms = 0
      if (baseRemainingRef.current != null && startedPerfRef.current != null) {
        const elapsed = performance.now() - startedPerfRef.current
        ms = Math.max(0, baseRemainingRef.current - elapsed)
      } else {
        ms = Math.max(0, new Date(endsAt).getTime() - Date.now())
      }

      setTimeLeft(ms)
      onTick?.(ms)                          // ← NEW: bubble up to parent
      if (ms <= 0 && !firedRef.current) {
        firedRef.current = true
        onTimerExpire?.()
      }
    }
    tick()
    const iv = setInterval(tick, 500)
    return () => clearInterval(iv)
  }, [endsAt, remainingMs, onTimerExpire, onTick])

  const fmt = (ms) => {
    if (ms === null) return '--:--:--'
    const s  = Math.floor(ms / 1000)
    const h  = String(Math.floor(s / 3600)).padStart(2, '0')
    const m  = String(Math.floor((s % 3600) / 60)).padStart(2, '0')
    const sc = String(s % 60).padStart(2, '0')
    return `${h}:${m}:${sc}`
  }

  const isLow  = timeLeft !== null && timeLeft < 60_000
  const isDead = timeLeft !== null && timeLeft <= 0

  const handleLogout = async () => {
    try { await authFetch('/api/auth/logout', { method: 'POST' }) } catch {}
    sessionStorage.clear()
    navigate('/login')
  }

  return (
    <nav style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50,
      height: 54,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 28px',
      background: 'rgba(3,2,10,0.94)',
      borderBottom: '1px solid rgba(227,18,18,0.15)',
      backdropFilter: 'blur(14px)',
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@700;900&family=Share+Tech+Mono&display=swap');
        @keyframes blink    { 0%,49%{opacity:1} 50%,100%{opacity:0} }
        @keyframes redPulse { 0%,100%{opacity:1} 50%{opacity:0.6} }
        @keyframes panicShake {
          0%,100%{transform:translateX(0)}
          20%{transform:translateX(-2px)}
          40%{transform:translateX(2px)}
          60%{transform:translateX(-1px)}
          80%{transform:translateX(1px)}
        }
        .nav-btn {
          display:inline-flex;align-items:center;gap:5px;
          padding:5px 12px;border-radius:3px;
          background:transparent;border:1px solid rgba(255,255,255,0.1);
          color:rgba(255,255,255,0.4);
          font-family:"Share Tech Mono",monospace;font-size:0.66rem;letter-spacing:0.12em;
          cursor:none;text-decoration:none;text-transform:uppercase;
          transition:all 0.18s;
        }
        .nav-btn:hover { background:rgba(255,255,255,0.04);color:rgba(255,255,255,0.75);border-color:rgba(255,255,255,0.22); }
        .nav-btn-red { border-color:rgba(227,18,18,0.28)!important;color:rgba(227,18,18,0.7)!important; }
        .nav-btn-red:hover { background:rgba(227,18,18,0.08)!important;color:#e31212!important;border-color:rgba(227,18,18,0.55)!important; }
      `}</style>

      {/* LEFT — branding */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 9, cursor: 'none' }} onClick={() => navigate('/')}>
        <div style={{
          width: 7, height: 7, borderRadius: '50%',
          background: '#e31212', boxShadow: '0 0 8px #e31212',
          animation: 'blink 2s step-start infinite',
        }}/>
        <span style={{
          fontFamily: '"Cinzel", serif', fontWeight: 700,
          fontSize: '0.78rem', letterSpacing: '0.22em',
          color: '#e31212', textShadow: '0 0 14px rgba(227,18,18,0.4)',
        }}>RECURSION HELL</span>
      </div>

      {/* CENTER — timer + team + score */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
        <div style={{
          fontFamily: '"Share Tech Mono", monospace',
          fontSize: '1.25rem', fontWeight: 700, letterSpacing: '0.1em',
          color: isDead ? '#ff2222' : isLow ? '#ff5522' : 'rgba(255,255,255,0.88)',
          animation: isLow && !isDead
            ? 'redPulse 0.9s ease-in-out infinite, panicShake 0.4s ease-in-out infinite'
            : 'none',
          textShadow: isLow
            ? '0 0 18px rgba(255,40,0,0.7), 0 0 40px rgba(255,0,0,0.3)'
            : 'none',
          transition: 'color 0.3s, text-shadow 0.3s',
        }}>
          {fmt(timeLeft)}
        </div>
        <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
          <span style={{ fontFamily: '"Share Tech Mono", monospace', fontSize: '0.58rem', color: 'rgba(255,255,255,0.35)', letterSpacing: '0.1em' }}>
            {teamName || '—'}
          </span>
          <span style={{ fontFamily: '"Share Tech Mono", monospace', fontSize: '0.58rem', color: 'rgba(227,18,18,0.7)', letterSpacing: '0.1em' }}>
            {score ?? 0} PTS
          </span>
        </div>
      </div>

      {/* RIGHT — nav buttons */}
      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        <a
          href="https://drive.google.com/file/d/1NnmVffbFOUtGUaGuph9ht3SVu4ZrpD1C/view?usp=drive_link"
          target="_blank" rel="noopener noreferrer"
          className="nav-btn"
        >
          ⓘ Rules
        </a>
        <button className="nav-btn" onClick={() => navigate('/scoreboard')}>Scoreboard</button>
        <button className="nav-btn" onClick={() => navigate('/team')}>Team</button>
        <button className="nav-btn nav-btn-red" onClick={handleLogout}>Logout</button>
      </div>
    </nav>
  )
}