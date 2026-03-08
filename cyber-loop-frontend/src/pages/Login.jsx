import { useMemo, useState, useEffect, useRef } from 'react'

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

const EMBERS = Array.from({ length: 38 }, (_, i) => ({
  id: i,
  left: Math.random() * 100,
  delay: Math.random() * 6,
  duration: 4 + Math.random() * 5,
  size: 2 + Math.random() * 3,
  drift: (Math.random() - 0.5) * 60,
}))

function Ember({ left, delay, duration, size, drift }) {
  return (
    <div
      style={{
        position: 'absolute',
        bottom: '-10px',
        left: `${left}%`,
        width: size,
        height: size,
        borderRadius: '50%',
        background: `radial-gradient(circle, #ffcc44, #e8820c 60%, transparent 100%)`,
        boxShadow: `0 0 ${size * 2}px #e8820c`,
        animation: `emberRise ${duration}s ${delay}s ease-in infinite`,
        '--drift': `${drift}px`,
        pointerEvents: 'none',
      }}
    />
  )
}

export default function Login() {
  const [teamName, setTeamName] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [shake, setShake] = useState(false)
  const [focused, setFocused] = useState(null)
  const [glitch, setGlitch] = useState(false)
  const canvasRef = useRef(null)

  const canSubmit = useMemo(() => {
    return teamName.trim().length > 0 && password.trim().length > 0 && !loading
  }, [teamName, password, loading])

  useEffect(() => {
    const interval = setInterval(() => {
      setGlitch(true)
      setTimeout(() => setGlitch(false), 200)
    }, 4000)
    return () => clearInterval(interval)
  }, [])

  // Recursive ring canvas
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    let frame = 0

    function resize() {
      canvas.width = canvas.offsetWidth
      canvas.height = canvas.offsetHeight
    }
    resize()
    window.addEventListener('resize', resize)

    function draw() {
      const { width, height } = canvas
      ctx.clearRect(0, 0, width, height)
      const cx = width / 2
      const cy = height * 0.46
      const time = frame * 0.008

      for (let i = 20; i >= 1; i--) {
        const r = (i / 20) * Math.min(width, height) * 0.52
        const alpha = (1 - i / 22) * 0.28 + Math.sin(time + i * 0.4) * 0.04
        const hue = 28 + i * 1.2 + time * 8
        ctx.beginPath()
        ctx.ellipse(cx, cy, r, r * 0.55, 0, 0, Math.PI * 2)
        ctx.strokeStyle = `hsla(${hue},85%,55%,${alpha})`
        ctx.lineWidth = 1.2
        ctx.stroke()
      }

      // Center glow
      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, 90)
      grad.addColorStop(0, `rgba(232,130,12,${0.12 + Math.sin(time) * 0.04})`)
      grad.addColorStop(1, 'transparent')
      ctx.fillStyle = grad
      ctx.beginPath()
      ctx.ellipse(cx, cy, 90, 50, 0, 0, Math.PI * 2)
      ctx.fill()

      frame++
      requestAnimationFrame(draw)
    }

    const raf = requestAnimationFrame(draw)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
    }
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    if (loading) return
    const tn = teamName.trim()
    const pw = password.trim()
    setError('')
    if (!tn || !pw) {
      setShake(true)
      setError('Team Name and Password are required.')
      setTimeout(() => setShake(false), 500)
      return
    }
    setLoading(true)
    try {
      await sleep(850)
      sessionStorage.setItem('teamName', tn)
      window.location.assign('/landing')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#080503', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: '"IBM Plex Mono", monospace', overflow: 'hidden', position: 'relative' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@700;900&family=IBM+Plex+Mono:wght@300;400;500&display=swap');

        * { box-sizing: border-box; margin: 0; padding: 0; }

        @keyframes emberRise {
          0%   { transform: translateY(0) translateX(0) scale(1); opacity: 0.9; }
          60%  { opacity: 0.6; }
          100% { transform: translateY(-100vh) translateX(var(--drift)) scale(0.3); opacity: 0; }
        }
        @keyframes shakeX {
          0%,100% { transform: translateX(0); }
          18%     { transform: translateX(-11px); }
          36%     { transform: translateX(11px); }
          54%     { transform: translateX(-7px); }
          72%     { transform: translateX(7px); }
        }
        @keyframes spinFast {
          to { transform: rotate(360deg); }
        }
        @keyframes scanline {
          0%   { transform: translateY(-100%); }
          100% { transform: translateY(100vh); }
        }
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(18px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes glitchLeft {
          0%,100% { clip-path: none; transform: translateX(0); }
          20% { clip-path: polygon(0 20%, 100% 20%, 100% 40%, 0 40%); transform: translateX(-4px); }
          40% { clip-path: polygon(0 60%, 100% 60%, 100% 75%, 0 75%); transform: translateX(4px); }
          60% { clip-path: polygon(0 5%, 100% 5%, 100% 12%, 0 12%); transform: translateX(-2px); }
          80% { clip-path: none; transform: translateX(0); }
        }
        @keyframes glitchRight {
          0%,100% { clip-path: none; transform: translateX(0); opacity: 0; }
          20% { clip-path: polygon(0 20%, 100% 20%, 100% 40%, 0 40%); transform: translateX(4px); opacity: 0.7; }
          40% { clip-path: polygon(0 60%, 100% 60%, 100% 75%, 0 75%); transform: translateX(-4px); opacity: 0.5; }
          80% { clip-path: none; opacity: 0; }
        }
        @keyframes pulseGlow {
          0%,100% { box-shadow: 0 0 28px rgba(232,130,12,0.20), 0 0 0 1px rgba(196,94,0,0.30) inset; }
          50%      { box-shadow: 0 0 52px rgba(232,130,12,0.34), 0 0 0 1px rgba(232,130,12,0.45) inset; }
        }
        @keyframes flicker {
          0%,100% { opacity: 1; }
          92% { opacity: 1; }
          93% { opacity: 0.7; }
          94% { opacity: 1; }
          97% { opacity: 0.85; }
          98% { opacity: 1; }
        }

        .shake { animation: shakeX 500ms ease-in-out; }
        .spin  { animation: spinFast 0.9s linear infinite; }
        .card-glow { animation: pulseGlow 3.5s ease-in-out infinite; }
        .flicker { animation: flicker 5s ease-in-out infinite; }

        .fade-in { animation: fadeSlideUp 0.7s cubic-bezier(0.22, 1, 0.36, 1) both; }
        .fade-in-1 { animation: fadeSlideUp 0.7s 0.05s cubic-bezier(0.22, 1, 0.36, 1) both; }
        .fade-in-2 { animation: fadeSlideUp 0.7s 0.14s cubic-bezier(0.22, 1, 0.36, 1) both; }
        .fade-in-3 { animation: fadeSlideUp 0.7s 0.23s cubic-bezier(0.22, 1, 0.36, 1) both; }
        .fade-in-4 { animation: fadeSlideUp 0.7s 0.32s cubic-bezier(0.22, 1, 0.36, 1) both; }

        .glitch-title { position: relative; display: inline-block; }
        .glitch-title::before, .glitch-title::after {
          content: attr(data-text);
          position: absolute; top: 0; left: 0; width: 100%;
          color: inherit;
          pointer-events: none;
        }
        .glitch-active::before {
          color: #ff3a3a;
          animation: glitchLeft 200ms steps(1) forwards;
        }
        .glitch-active::after {
          color: #00e5ff;
          animation: glitchRight 200ms steps(1) forwards;
        }

        input:-webkit-autofill {
          -webkit-box-shadow: 0 0 0 100px #130d06 inset !important;
          -webkit-text-fill-color: #F5ECD7 !important;
        }

        .hell-input {
          width: 100%;
          background: rgba(9,6,3,0.75);
          border: 1px solid rgba(196,94,0,0.28);
          border-radius: 6px;
          padding: 11px 14px;
          color: #F5ECD7;
          font-family: 'IBM Plex Mono', monospace;
          font-size: 14px;
          outline: none;
          transition: border-color 0.25s, box-shadow 0.25s;
          letter-spacing: 0.03em;
        }
        .hell-input:focus {
          border-color: rgba(232,130,12,0.7);
          box-shadow: 0 0 0 3px rgba(232,130,12,0.10), 0 0 16px rgba(232,130,12,0.12);
        }
        .hell-input::placeholder { color: rgba(245,236,215,0.28); }

        .hell-btn {
          width: 100%;
          padding: 12px;
          border-radius: 6px;
          border: none;
          font-family: 'Cinzel', serif;
          font-size: 13px;
          font-weight: 700;
          letter-spacing: 0.18em;
          cursor: pointer;
          transition: opacity 0.2s, box-shadow 0.2s, transform 0.15s;
          position: relative;
          overflow: hidden;
        }
        .hell-btn:not(:disabled):hover {
          transform: translateY(-1px);
          box-shadow: 0 6px 32px rgba(232,130,12,0.38) !important;
        }
        .hell-btn:not(:disabled):active { transform: translateY(0px); }
        .hell-btn:disabled { cursor: not-allowed; }

        .divider-line {
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(196,94,0,0.40), transparent);
        }
      `}</style>

      {/* Canvas — recursive rings */}
      <canvas
        ref={canvasRef}
        style={{ position: 'fixed', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 0 }}
      />

      {/* Ember particles */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 1 }}>
        {EMBERS.map(e => <Ember key={e.id} {...e} />)}
      </div>

      {/* Background blobs */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
        <div style={{ position: 'absolute', bottom: '-10%', left: '-8%', width: '55vw', height: '55vw', borderRadius: '50%', background: 'radial-gradient(circle, rgba(139,26,26,0.17) 0%, transparent 65%)', filter: 'blur(2px)' }} />
        <div style={{ position: 'absolute', top: '-12%', right: '-10%', width: '48vw', height: '48vw', borderRadius: '50%', background: 'radial-gradient(circle, rgba(232,130,12,0.12) 0%, transparent 65%)', filter: 'blur(2px)' }} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(8,5,3,0.5) 0%, rgba(8,5,3,0.0) 40%, rgba(8,5,3,0.65) 100%)' }} />
      </div>

      {/* Scanline */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 2, overflow: 'hidden' }}>
        <div style={{ position: 'absolute', left: 0, right: 0, height: '120px', background: 'linear-gradient(180deg, transparent, rgba(255,160,40,0.025), transparent)', animation: 'scanline 8s linear infinite', top: 0 }} />
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'repeating-linear-gradient(0deg, rgba(0,0,0,0.035) 0px, rgba(0,0,0,0.035) 1px, transparent 1px, transparent 3px)', pointerEvents: 'none' }} />
      </div>

      {/* Card */}
      <div className={`fade-in ${shake ? 'shake' : ''}`} style={{ position: 'relative', zIndex: 10, width: '100%', maxWidth: '420px', padding: '0 16px' }}>
        <div
          className="card-glow"
          style={{
            background: 'linear-gradient(160deg, rgba(28,16,6,0.92) 0%, rgba(16,9,4,0.96) 100%)',
            border: '1px solid rgba(196,94,0,0.32)',
            borderRadius: '14px',
            padding: '40px 36px 36px',
            backdropFilter: 'blur(18px)',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Top-edge accent */}
          <div style={{ position: 'absolute', top: 0, left: '20%', right: '20%', height: '1px', background: 'linear-gradient(90deg, transparent, rgba(232,130,12,0.7), transparent)' }} />
          {/* Inner corner decorations */}
          <div style={{ position: 'absolute', top: 10, left: 10, width: 18, height: 18, borderTop: '1.5px solid rgba(232,130,12,0.5)', borderLeft: '1.5px solid rgba(232,130,12,0.5)', borderRadius: '2px 0 0 0' }} />
          <div style={{ position: 'absolute', top: 10, right: 10, width: 18, height: 18, borderTop: '1.5px solid rgba(232,130,12,0.5)', borderRight: '1.5px solid rgba(232,130,12,0.5)', borderRadius: '0 2px 0 0' }} />
          <div style={{ position: 'absolute', bottom: 10, left: 10, width: 18, height: 18, borderBottom: '1.5px solid rgba(232,130,12,0.5)', borderLeft: '1.5px solid rgba(232,130,12,0.5)', borderRadius: '0 0 0 2px' }} />
          <div style={{ position: 'absolute', bottom: 10, right: 10, width: 18, height: 18, borderBottom: '1.5px solid rgba(232,130,12,0.5)', borderRight: '1.5px solid rgba(232,130,12,0.5)', borderRadius: '0 0 2px 0' }} />

          {/* Header */}
          <div className="fade-in" style={{ marginBottom: 28 }}>
            <div style={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: 10, letterSpacing: '0.38em', color: 'rgba(232,130,12,0.7)', textTransform: 'uppercase', marginBottom: 10 }}>
              ∞ &nbsp; LEVEL — 0x00
            </div>

            <div className={`glitch-title ${glitch ? 'glitch-active' : ''}`} data-text="RECURSION HELL">
              <h1 className="flicker" style={{
                fontFamily: '"Cinzel", serif',
                fontSize: 'clamp(26px, 6vw, 34px)',
                fontWeight: 900,
                color: '#F5ECD7',
                letterSpacing: '0.08em',
                lineHeight: 1.1,
                textShadow: '0 0 40px rgba(232,130,12,0.35), 0 2px 0 rgba(0,0,0,0.6)',
              }}>
                RECURSION HELL
              </h1>
            </div>

            <div style={{ marginTop: 12 }} className="divider-line" />

            <p style={{ marginTop: 12, fontFamily: '"IBM Plex Mono", monospace', fontSize: 12, color: 'rgba(245,236,215,0.5)', letterSpacing: '0.04em', lineHeight: 1.7 }}>
              <span style={{ color: 'rgba(232,130,12,0.7)' }}>$</span> authenticate --descent --loop=∞
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="fade-in" style={{
              marginBottom: 18,
              background: 'rgba(139,26,26,0.22)',
              border: '1px solid rgba(200,50,50,0.40)',
              borderRadius: 6,
              padding: '9px 14px',
              fontFamily: '"IBM Plex Mono", monospace',
              fontSize: 12,
              color: 'rgba(255,180,180,0.92)',
              letterSpacing: '0.03em',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }} role="alert" aria-live="polite">
              <span style={{ color: '#ff5555', fontSize: 14 }}>⚠</span> {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit}>
            <div className="fade-in-1" style={{ marginBottom: 18 }}>
              <label style={{ display: 'block', fontFamily: '"IBM Plex Mono", monospace', fontSize: 11, letterSpacing: '0.12em', color: 'rgba(232,130,12,0.75)', textTransform: 'uppercase', marginBottom: 7 }}>
                Team Name
              </label>
              <input
                className="hell-input"
                value={teamName}
                onChange={e => setTeamName(e.target.value)}
                onFocus={() => setFocused('team')}
                onBlur={() => setFocused(null)}
                autoComplete="username"
                placeholder="e.g. StackSmashers"
              />
            </div>

            <div className="fade-in-2" style={{ marginBottom: 26 }}>
              <label style={{ display: 'block', fontFamily: '"IBM Plex Mono", monospace', fontSize: 11, letterSpacing: '0.12em', color: 'rgba(232,130,12,0.75)', textTransform: 'uppercase', marginBottom: 7 }}>
                Password
              </label>
              <input
                className="hell-input"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                onFocus={() => setFocused('pw')}
                onBlur={() => setFocused(null)}
                autoComplete="current-password"
                placeholder="••••••••"
              />
            </div>

            <div className="fade-in-3">
              <button
                type="submit"
                disabled={!canSubmit}
                className="hell-btn"
                style={{
                  background: canSubmit
                    ? 'linear-gradient(92deg, #e8820c 0%, #c45e00 55%, #a34d00 100%)'
                    : 'rgba(245,236,215,0.07)',
                  color: canSubmit ? '#0D0A07' : 'rgba(245,236,215,0.35)',
                  boxShadow: canSubmit ? '0 2px 24px rgba(232,130,12,0.28)' : 'none',
                  opacity: !canSubmit ? 0.6 : 1,
                }}
              >
                <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 9 }}>
                  {loading ? (
                    <>
                      <span className="spin" style={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid rgba(13,10,7,0.3)', borderTopColor: '#0D0A07', display: 'inline-block' }} />
                      DESCENDING…
                    </>
                  ) : (
                    <>ENTER THE LOOP ↓</>
                  )}
                </span>
              </button>
            </div>
          </form>

          {/* Footer */}
          <div className="fade-in-4" style={{ marginTop: 24, paddingTop: 18, borderTop: '1px solid rgba(196,94,0,0.15)', textAlign: 'center' }}>
            <span style={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: 10, color: 'rgba(245,236,215,0.28)', letterSpacing: '0.06em' }}>
              stack depth: <span style={{ color: 'rgba(232,130,12,0.55)' }}>∞</span> &nbsp;·&nbsp; nodes: <span style={{ color: 'rgba(232,130,12,0.55)' }}>??</span> &nbsp;·&nbsp; escape: <span style={{ color: 'rgba(232,130,12,0.55)' }}>false</span>
            </span>
          </div>
        </div>

        {/* Below-card tag */}
        <div style={{ textAlign: 'center', marginTop: 16, fontFamily: '"IBM Plex Mono", monospace', fontSize: 10, color: 'rgba(245,236,215,0.2)', letterSpacing: '0.08em' }}>
          RECURSION HELL &nbsp;·&nbsp; v6.6.6
        </div>
      </div>
    </div>
  )
}
