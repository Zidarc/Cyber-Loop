import { useMemo, useState, useEffect, useRef } from 'react'

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

/* ── Cinematic overlay: breathing vignette + heat shimmer only ── */
function CinematicOverlay() {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')

    function resize() {
      canvas.width  = window.innerWidth
      canvas.height = window.innerHeight
    }
    resize()
    window.addEventListener('resize', resize)

    let t = 0

    function render() {
      t++
      const W = canvas.width, H = canvas.height
      ctx.clearRect(0, 0, W, H)

      /* ── Breathing vignette ── */
      const breathe = 0.55 + Math.sin(t * 0.018) * 0.07
      const vig = ctx.createRadialGradient(W/2, H/2, H*0.18, W/2, H/2, H*0.85)
      vig.addColorStop(0,   'rgba(0,0,0,0)')
      vig.addColorStop(0.5, `rgba(0,0,0,${breathe * 0.3})`)
      vig.addColorStop(1,   `rgba(0,0,0,${breathe})`)
      ctx.fillStyle = vig
      ctx.fillRect(0, 0, W, H)

      /* ── Bottom lava glow reflecting up ── */
      const lavaGlow = 0.18 + Math.sin(t * 0.04) * 0.06
      const lg = ctx.createLinearGradient(0, H * 0.7, 0, H)
      lg.addColorStop(0, 'rgba(0,0,0,0)')
      lg.addColorStop(1, `rgba(180,50,0,${lavaGlow})`)
      ctx.fillStyle = lg
      ctx.fillRect(0, H * 0.7, W, H * 0.3)

      /* ── Heat shimmer lines ── */
      if (t % 3 === 0) {
        const shimmerY = H * (0.6 + Math.random() * 0.35)
        const shimmerW = 80 + Math.random() * 200
        const shimmerX = Math.random() * W
        ctx.fillStyle = `rgba(255,100,0,${0.02 + Math.random() * 0.03})`
        ctx.fillRect(shimmerX, shimmerY, shimmerW, 1 + Math.random() * 2)
      }

      requestAnimationFrame(render)
    }

    const raf = requestAnimationFrame(render)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute', inset: 0,
        width: '100%', height: '100%',
        zIndex: 2, pointerEvents: 'none',
      }}
    />
  )
}

/* ── Ember data — generated once, stable across renders ── */
const EMBER_COUNT = 150
const embers = Array.from({ length: EMBER_COUNT }, (_, i) => {
  // Realistic small sizes — actual embers are tiny
  const size  = 1.5 + (i % 9) * 0.6           // 1.5px – 6.3px
  // Denser toward the bottom/sides where the lava is
  const left  = 1 + (i * 1.41) % 98
  const bot   = (i * 4.7) % 50                 // spread a bit higher
  // Gentle natural drift — not too wild
  const dx    = `${((i % 2 === 0 ? 1 : -1) * (4 + (i * 2.3) % 18)).toFixed(1)}px`
  const dy    = `-${(30 + (i * 7.1) % 55).toFixed(0)}vh`
  const wx    = `${((i % 2 === 0 ? 1 : -1) * (5 + (i * 1.8) % 14)).toFixed(1)}px`
  const dur   = `${2.8 + (i * 0.23) % 4}s`
  const pd    = `${0.9 + (i * 0.21) % 1.6}s`
  const delay = `${(i * 0.13) % 5.5}s`

  // Rich varied ember palette across the full fire spectrum
  const palettes = [
    { c: '#FF5500', g: 'rgba(255,85,0,0.7)',    freq: 14 },  // bright orange
    { c: '#FF3300', g: 'rgba(255,51,0,0.75)',   freq: 13 },  // deep orange-red
    { c: '#CC2200', g: 'rgba(200,34,0,0.8)',    freq: 12 },  // dark red
    { c: '#FF7700', g: 'rgba(255,119,0,0.6)',   freq: 10 },  // amber
    { c: '#FF1100', g: 'rgba(255,17,0,0.85)',   freq: 10 },  // blood red
    { c: '#FF8800', g: 'rgba(255,136,0,0.65)',  freq: 9  },  // warm orange
    { c: '#DD1100', g: 'rgba(221,17,0,0.8)',    freq: 8  },  // crimson
    { c: '#FF4400', g: 'rgba(255,68,0,0.72)',   freq: 7  },  // fire orange
    { c: '#AA1500', g: 'rgba(170,21,0,0.85)',   freq: 6  },  // deep crimson
    { c: '#FFAA44', g: 'rgba(255,170,68,0.55)', freq: 5  },  // warm amber
    { c: '#FF6600', g: 'rgba(255,102,0,0.68)',  freq: 4  },  // mid orange
    { c: '#CC3300', g: 'rgba(204,51,0,0.78)',   freq: 1  },  // burnt red (rare)
    { c: '#FFEEBB', g: 'rgba(255,238,187,0.9)', freq: 1  },  // white-hot (rare)
  ]
  // pick by weighted index
  let pick = i % 100
  let palette = palettes[0]
  let acc = 0
  for (const p of palettes) { acc += p.freq; if (pick < acc) { palette = p; break } }

  const glowSize = `${size * 3.5}px`
  return { size, left, bot, dx, dy, wx, dur, pd, delay, ...palette, glowSize }
})

export default function Login() {
  const [teamName, setTeamName] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)
  const [shake, setShake]       = useState(false)

  const canSubmit = useMemo(() =>
    teamName.trim().length > 0 && password.trim().length > 0 && !loading,
    [teamName, password, loading]
  )

  async function handleSubmit(e) {
    e.preventDefault()
    if (loading) return
    const tn = teamName.trim(), pw = password.trim()
    setError('')
    if (!tn || !pw) {
      setShake(true)
      setError('Team name and password are required.')
      window.setTimeout(() => setShake(false), 420)
      return
    }
    setLoading(true)
    try {
      await sleep(800)
      sessionStorage.setItem('teamName', tn)

      // ── BACKEND HOOK ──────────────────────────────────────────
      // const res = await fetch('/api/auth/login', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ teamName: tn, password: pw })
      // })
      // if (!res.ok) {
      //   const d = await res.json().catch(() => ({}))
      //   setError(d.error || 'Invalid credentials.')
      //   setLoading(false); return
      // }
      // const data = await res.json()
      // sessionStorage.setItem('token', data.token)
      // ─────────────────────────────────────────────────────────

      window.location.assign('/landing')
    } catch {
      setError('Authentication failed. Try again.')
      setLoading(false)
    }
  }

  return (
    <div
      className="min-h-screen relative overflow-hidden flex items-center justify-center bg-black"
      style={{ userSelect: 'none', WebkitUserSelect: 'none' }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@700;900&family=Barlow:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap');

        * { user-select: none; -webkit-user-select: none; }
        /* Re-enable selection only on inputs */
        input { user-select: text !important; -webkit-user-select: text !important; }

        @keyframes shakeX {
          0%,100%{ transform:translateX(0); }
          20%,60%{ transform:translateX(-9px); }
          40%,80%{ transform:translateX(9px); }
        }
        @keyframes spin { to { transform: rotate(360deg); } }

        /* Ember rise with natural wobble */
        @keyframes emberRise {
          0%   { transform: translate(0, 0) scale(1); opacity: 0; }
          6%   { opacity: 1; }
          30%  { transform: translate(var(--wx), calc(var(--dy) * 0.28)) scale(0.88); }
          62%  { transform: translate(calc(var(--wx) * -0.4), calc(var(--dy) * 0.65)) scale(0.55); opacity: 0.8; }
          88%  { opacity: 0.35; }
          100% { transform: translate(var(--dx), var(--dy)) scale(0.08); opacity: 0; }
        }
        @keyframes emberPulse {
          0%,100% { box-shadow: 0 0 var(--gs) var(--gc); }
          50%      { box-shadow: 0 0 calc(var(--gs) * 2.2) var(--gc); }
        }

        @keyframes cardFloat {
          0%,100% { transform: translateY(0px); }
          50%      { transform: translateY(-5px); }
        }

        /* Glitch — rare, every ~11s */
        @keyframes glitch {
          0%, 88%, 100% { clip-path: none; transform: translate(0); opacity: 1; }
          89%   { clip-path: polygon(0 12%, 100% 12%, 100% 28%, 0 28%); transform: translate(-4px, 0); }
          89.5% { clip-path: polygon(0 55%, 100% 55%, 100% 70%, 0 70%); transform: translate(4px, 0); }
          90%   { clip-path: none; transform: translate(0); }
          93%   { clip-path: polygon(0 30%, 100% 30%, 100% 38%, 0 38%); transform: translate(5px, -1px); }
          93.5% { clip-path: polygon(0 60%, 100% 60%, 100% 80%, 0 80%); transform: translate(-3px, 1px); }
          94%   { clip-path: none; transform: translate(0); }
          97%   { opacity: 1; }
          97.5% { opacity: 0.12; transform: translate(2px, 0); }
          98%   { opacity: 1; transform: translate(0); }
        }
        @keyframes glitchBefore {
          0%, 88%, 100% { opacity: 0; clip-path: none; }
          89%   { clip-path: polygon(0 10%, 100% 10%, 100% 32%, 0 32%); transform: translate(-5px, 0); opacity: 0.75; }
          89.5% { clip-path: polygon(0 58%, 100% 58%, 100% 72%, 0 72%); transform: translate(4px, 0);  opacity: 0.75; }
          90%   { opacity: 0; }
          93%   { clip-path: polygon(0 28%, 100% 28%, 100% 42%, 0 42%); transform: translate(6px, 0);  opacity: 0.65; }
          93.5% { clip-path: polygon(0 62%, 100% 62%, 100% 78%, 0 78%); transform: translate(-4px, 0); opacity: 0.65; }
          94%   { opacity: 0; }
        }
        @keyframes glitchAfter {
          0%, 88%, 100% { opacity: 0; clip-path: none; }
          89%   { clip-path: polygon(0 20%, 100% 20%, 100% 42%, 0 42%); transform: translate(5px, 0);  opacity: 0.5; }
          89.5% { clip-path: polygon(0 45%, 100% 45%, 100% 60%, 0 60%); transform: translate(-5px, 0); opacity: 0.5; }
          90%   { opacity: 0; }
          93%   { clip-path: polygon(0 38%, 100% 38%, 100% 55%, 0 55%); transform: translate(-6px, 0); opacity: 0.5; }
          93.5% { clip-path: polygon(0 65%, 100% 65%, 100% 82%, 0 82%); transform: translate(4px, 0);  opacity: 0.5; }
          94%   { opacity: 0; }
        }

        .title-glitch {
          position: relative;
          animation: glitch 11s steps(1) infinite;
        }
        .title-glitch::before,
        .title-glitch::after {
          content: 'RECURSION HELL';
          position: absolute; inset: 0;
          background: inherit;
          -webkit-background-clip: text; background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        .title-glitch::before {
          background: linear-gradient(180deg, #ff2200 0%, #ff4400 100%);
          -webkit-background-clip: text; background-clip: text;
          -webkit-text-fill-color: transparent;
          animation: glitchBefore 11s steps(1) infinite;
        }
        .title-glitch::after {
          background: linear-gradient(180deg, #ffdd00 0%, #ff8800 100%);
          -webkit-background-clip: text; background-clip: text;
          -webkit-text-fill-color: transparent;
          animation: glitchAfter 11s steps(1) infinite;
        }

        @keyframes borderShimmer {
          0%,100% { border-color: rgba(200,90,0,0.4);  box-shadow: 0 8px 32px rgba(0,0,0,0.4), inset 0 0 0 1px rgba(200,90,0,0.4); }
          50%      { border-color: rgba(255,130,0,0.55); box-shadow: 0 8px 32px rgba(0,0,0,0.4), inset 0 0 0 1px rgba(255,130,0,0.55), 0 0 24px rgba(255,80,0,0.12); }
        }
        @keyframes lavaReflect {
          0%,100% { opacity: 0.45; }
          50%      { opacity: 0.75; }
        }
        @keyframes dividerShimmer {
          0%   { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        @keyframes blink {
          0%,49%  { opacity: 1; }
          50%,100%{ opacity: 0; }
        }
        @keyframes btnSweep { 0%{left:-80%} 100%{left:140%} }
        @keyframes btnGlow {
          0%,100% { box-shadow: 0 4px 20px rgba(255,100,0,0.45), 0 2px 6px rgba(0,0,0,0.6); }
          50%      { box-shadow: 0 4px 30px rgba(255,140,0,0.7),  0 2px 6px rgba(0,0,0,0.6), 0 0 50px rgba(220,70,0,0.25); }
        }

        .shake       { animation: shakeX 420ms ease-in-out; }
        .spin        { animation: spin 0.8s linear infinite; }
        .card-float  { animation: cardFloat 7s ease-in-out infinite; }
        .card-border { animation: borderShimmer 3s ease-in-out infinite; }

        .ember {
          position: absolute; border-radius: 50%; pointer-events: none;
          animation:
            emberRise var(--dur) ease-in var(--delay) infinite,
            emberPulse var(--pd) ease-in-out var(--delay) infinite;
          opacity: 0;
        }

        .hell-input {
          width: 100%; box-sizing: border-box;
          background: rgba(6,3,1,0.55);
          border: 1px solid rgba(110,45,0,0.5);
          border-radius: 8px; padding: 11px 14px;
          color: #F5ECD7; font-family: 'Barlow', sans-serif;
          font-size: 0.95rem; outline: none;
          transition: border-color .2s, box-shadow .2s, background .2s;
          caret-color: #FF8C00;
          user-select: text !important;
          -webkit-user-select: text !important;
        }
        .hell-input::placeholder { color: rgba(240,200,150,0.22); font-style: italic; }
        .hell-input:focus {
          border-color: rgba(255,120,0,0.8);
          background: rgba(6,3,1,0.7);
          box-shadow: 0 0 0 3px rgba(255,100,0,0.13), 0 0 18px rgba(255,80,0,0.1);
        }

        .login-btn {
          width: 100%; padding: 13px 0; border: none; border-radius: 8px;
          font-family: 'Cinzel', serif; font-size: 0.88rem; font-weight: 700;
          letter-spacing: 0.2em; text-transform: uppercase; cursor: pointer;
          position: relative; overflow: hidden; transition: filter .2s, transform .15s;
        }
        .login-btn-on {
          background: linear-gradient(180deg, #FF9500 0%, #E06200 45%, #961800 100%);
          color: #fff; text-shadow: 0 1px 4px rgba(0,0,0,0.55);
          animation: btnGlow 2.5s ease-in-out infinite;
        }
        .login-btn-on::before {
          content: ''; position: absolute; inset: 0;
          background: repeating-linear-gradient(
            90deg, transparent 0px, transparent 3px,
            rgba(255,255,255,0.03) 3px, rgba(255,255,255,0.03) 4px
          );
          pointer-events: none;
        }
        .login-btn-on::after {
          content: ''; position: absolute; top: 0; left: -80%; width: 55%; height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent);
          transform: skewX(-18deg); animation: btnSweep 3.5s ease-in-out infinite;
        }
        .login-btn-on:hover  { filter: brightness(1.1); transform: translateY(-2px); }
        .login-btn-on:active { transform: translateY(0); }
        .login-btn-off {
          background: rgba(255,255,255,0.05);
          color: rgba(240,200,150,0.2); cursor: not-allowed;
          border: 1px solid rgba(100,40,0,0.25);
        }
      `}</style>

      {/* ── BG VIDEO ── */}
      <video
        autoPlay loop muted playsInline
        className="absolute inset-0 w-full h-full object-cover"
        style={{ opacity: 0.82, zIndex: 0 }}
      >
        <source src="/lava-bg.mp4" type="video/mp4" />
      </video>

      {/* ── Cinematic overlay ── */}
      <CinematicOverlay />

      {/* ── EMBERS ── */}
      {embers.map((em, i) => (
        <span key={i} className="ember" style={{
          '--dx': em.dx, '--dy': em.dy, '--wx': em.wx,
          '--dur': em.dur, '--delay': em.delay,
          '--pd': em.pd, '--gs': em.glowSize, '--gc': em.g,
          left:   `${em.left}%`,
          bottom: `${em.bot}%`,
          width:  `${em.size}px`,
          height: `${em.size}px`,
          background:  em.c,
          boxShadow:   `0 0 ${em.glowSize} ${em.g}`,
          zIndex: 3,
        }} />
      ))}

      {/* ── LOGIN CARD ── */}
      <div
        className={`card-float card-border relative ${shake ? 'shake' : ''}`}
        style={{
          zIndex: 10, width: 'min(90vw, 400px)',
          background: 'rgba(8,3,0,0.42)', borderRadius: '12px',
          border: '1px solid rgba(200,90,0,0.4)',
          backdropFilter: 'blur(5px)',
          padding: 'clamp(1.8rem,5vw,2.3rem) clamp(1.5rem,4vw,2rem)',
        }}
      >
        {/* Top shimmer line */}
        <div style={{
          position: 'absolute', top: 0, left: '10%', right: '10%', height: '1px',
          background: 'linear-gradient(90deg, transparent, rgba(255,140,0,0.8), rgba(255,200,80,0.9), rgba(255,140,0,0.8), transparent)',
          backgroundSize: '200% 100%',
          animation: 'dividerShimmer 4s linear infinite',
        }} />

        {/* Bottom lava reflect */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0, height: '60px',
          borderRadius: '0 0 12px 12px',
          background: 'linear-gradient(to top, rgba(200,60,0,0.18), transparent)',
          animation: 'lavaReflect 3s ease-in-out infinite',
          pointerEvents: 'none',
        }} />

        {/* HEADER */}
        <div style={{ textAlign: 'center', marginBottom: '1.4rem' }}>
          <p style={{
            fontFamily: '"JetBrains Mono", monospace', fontSize: '0.65rem',
            letterSpacing: '0.3em', textTransform: 'uppercase',
            color: 'rgba(240,200,150,0.45)', marginBottom: '0.55rem',
          }}>// Enter the loop</p>

          <h1 className="title-glitch" style={{
            fontFamily: '"Cinzel", "Palatino Linotype", Georgia, serif',
            fontSize: 'clamp(1.5rem,5vw,1.95rem)', fontWeight: 900,
            letterSpacing: '0.07em', margin: 0, lineHeight: 1.1,
            background: 'linear-gradient(180deg, #FFD060 0%, #FF8C00 38%, #FF4500 72%, #B81A00 100%)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
          }}>RECURSION HELL</h1>

          <p style={{
            fontFamily: '"JetBrains Mono", monospace', fontSize: '0.6rem',
            color: 'rgba(240,180,100,0.35)', letterSpacing: '0.15em', marginTop: '0.45rem',
          }}>COMPETITIVE PROGRAMMING CONTEST</p>
        </div>

        {/* Divider */}
        <div style={{
          height: '1px', marginBottom: '1.4rem',
          background: 'linear-gradient(90deg, transparent, rgba(200,80,0,0.5), rgba(255,140,0,0.6), rgba(200,80,0,0.5), transparent)',
        }} />

        {/* ERROR */}
        {error && (
          <div style={{
            display: 'flex', alignItems: 'flex-start', gap: '0.5rem',
            background: 'rgba(120,20,0,0.35)', border: '1px solid rgba(200,50,0,0.45)',
            borderRadius: '7px', padding: '9px 13px', marginBottom: '1rem',
            fontFamily: '"Barlow", sans-serif', fontSize: '0.88rem',
            color: '#F5ECD7', lineHeight: 1.45,
          }}>
            <span style={{ color: '#FF6A00', flexShrink: 0, marginTop: '1px' }}>⚠</span>
            {error}
          </div>
        )}

        {/* FORM */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.4rem' }}>
              <label style={{ fontFamily: '"Barlow", sans-serif', fontSize: '0.82rem', fontWeight: 600, color: 'rgba(240,210,170,0.8)' }}>
                Team Name
              </label>
              <span style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '0.58rem', color: 'rgba(255,120,0,0.4)', letterSpacing: '0.08em' }}>
                IDENTIFIER
              </span>
            </div>
            <input className="hell-input" value={teamName} onChange={e => setTeamName(e.target.value)} autoComplete="username" spellCheck={false} placeholder="e.g. StackSmashers" />
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.4rem' }}>
              <label style={{ fontFamily: '"Barlow", sans-serif', fontSize: '0.82rem', fontWeight: 600, color: 'rgba(240,210,170,0.8)' }}>
                Password
              </label>
              <span style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '0.58rem', color: 'rgba(255,120,0,0.4)', letterSpacing: '0.08em' }}>
                ENCRYPTED
              </span>
            </div>
            <input className="hell-input" type="password" value={password} onChange={e => setPassword(e.target.value)} autoComplete="current-password" placeholder="••••••••" />
          </div>

          <button
            type="submit" disabled={!canSubmit}
            className={`login-btn ${canSubmit ? 'login-btn-on' : 'login-btn-off'}`}
            style={{ marginTop: '0.5rem' }}
          >
            {loading ? (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center' }}>
                <span className="spin" style={{ display: 'inline-block', width: '14px', height: '14px', borderRadius: '50%', border: '2px solid rgba(255,255,255,0.25)', borderTop: '2px solid #fff' }} />
                Descending…
              </span>
            ) : 'Descent'}
          </button>
        </form>

        {/* Status bar */}
        <div style={{
          marginTop: '1.3rem', paddingTop: '0.9rem',
          borderTop: '1px solid rgba(150,60,0,0.2)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <span style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '0.58rem', color: 'rgba(240,200,150,0.2)', letterSpacing: '0.06em' }}>
            // RECURSION HELL v1.0
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <span style={{
              width: '5px', height: '5px', borderRadius: '50%',
              background: '#FF4500', boxShadow: '0 0 6px rgba(255,69,0,0.9)',
              animation: 'blink 1.4s step-start infinite', display: 'inline-block',
            }} />
            <span style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '0.58rem', color: 'rgba(255,100,0,0.45)', letterSpacing: '0.06em' }}>
              CONTEST LIVE
            </span>
          </span>
        </div>
      </div>
    </div>
  )
}