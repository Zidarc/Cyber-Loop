import { useMemo, useState } from 'react'

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

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
    <div className="min-h-screen relative overflow-hidden flex items-center justify-center bg-black">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@700;900&family=Barlow:wght@400;500;600&family=JetBrains+Mono:wght@400&display=swap');

        @keyframes shakeX {
          0%,100%{ transform:translateX(0); }
          20%,60%{ transform:translateX(-9px); }
          40%,80%{ transform:translateX(9px); }
        }
        @keyframes spin { to { transform: rotate(360deg); } }

        /* Embers rising */
        @keyframes emberRise {
          0%   { transform: translate(0, 0) scale(1);   opacity: 0; }
          5%   { opacity: 1; }
          80%  { opacity: 0.7; }
          100% { transform: translate(var(--dx), var(--dy)) scale(0.3); opacity: 0; }
        }

        /* Card float */
        @keyframes cardFloat {
          0%,100% { transform: translateY(0px); }
          50%      { transform: translateY(-6px); }
        }

        /* Title fire glow */
        @keyframes fireGlow {
          0%,100% { filter: drop-shadow(0 0 8px rgba(255,120,0,0.7)); }
          50%      { filter: drop-shadow(0 0 20px rgba(255,160,0,1)) drop-shadow(0 0 40px rgba(255,60,0,0.5)); }
        }

        /* Border shimmer */
        @keyframes borderShimmer {
          0%,100% { border-color: rgba(100,40,0,0.55); box-shadow: 0 20px 60px rgba(0,0,0,0.75), 0 0 0 1px rgba(100,40,0,0.55) inset; }
          50%      { border-color: rgba(180,70,0,0.7);  box-shadow: 0 20px 60px rgba(0,0,0,0.75), 0 0 0 1px rgba(180,70,0,0.7) inset, 0 0 30px rgba(255,80,0,0.08); }
        }

        /* Button sweep shine */
        @keyframes btnSweep {
          0%   { left: -80%; }
          100% { left: 140%; }
        }

        /* Button glow pulse */
        @keyframes btnGlow {
          0%,100% { box-shadow: 0 4px 20px rgba(255,100,0,0.45), 0 1px 3px rgba(0,0,0,0.4); }
          50%      { box-shadow: 0 4px 30px rgba(255,140,0,0.7),  0 1px 3px rgba(0,0,0,0.4), 0 0 50px rgba(220,70,0,0.25); }
        }

        .shake       { animation: shakeX 420ms ease-in-out; }
        .spin        { animation: spin 0.8s linear infinite; }
        .card-float  { animation: cardFloat 6s ease-in-out infinite; }
        .title-fire  { animation: fireGlow 2.2s ease-in-out infinite; }
        .card-border { animation: borderShimmer 3s ease-in-out infinite; }

        /* Ember particle */
        .ember {
          position: absolute;
          border-radius: 50%;
          pointer-events: none;
          animation: emberRise var(--dur) ease-in var(--delay) infinite;
          opacity: 0;
        }

        /* Input */
        .hell-input {
          width: 100%;
          box-sizing: border-box;
          background: rgba(6, 3, 1, 0.8);
          border: 1px solid rgba(110, 45, 0, 0.5);
          border-radius: 8px;
          padding: 11px 14px;
          color: #F0E0C0;
          font-family: 'Barlow', sans-serif;
          font-size: 0.95rem;
          outline: none;
          transition: border-color .2s, box-shadow .2s, background .2s;
          caret-color: #FF8C00;
        }
        .hell-input::placeholder {
          color: rgba(240, 200, 150, 0.25);
          font-style: italic;
        }
        .hell-input:focus {
          border-color: rgba(255, 120, 0, 0.8);
          background: rgba(10, 4, 1, 0.9);
          box-shadow: 0 0 0 3px rgba(255, 100, 0, 0.13), 0 0 18px rgba(255, 80, 0, 0.1);
        }

        /* Button */
        .login-btn {
          width: 100%;
          padding: 13px 0;
          border: none;
          border-radius: 8px;
          font-family: 'Cinzel', serif;
          font-size: 0.88rem;
          font-weight: 700;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          cursor: pointer;
          position: relative;
          overflow: hidden;
          transition: filter .2s, transform .15s;
        }
        .login-btn-on {
          background: linear-gradient(180deg, #FF9500 0%, #E06200 45%, #961800 100%);
          color: #fff;
          text-shadow: 0 1px 4px rgba(0,0,0,0.55);
          animation: btnGlow 2.5s ease-in-out infinite;
        }
        .login-btn-on::after {
          content: '';
          position: absolute; top: 0; left: -80%; width: 55%; height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.14), transparent);
          transform: skewX(-18deg);
          animation: btnSweep 3s ease-in-out infinite;
        }
        .login-btn-on:hover  { filter: brightness(1.1); transform: translateY(-2px); }
        .login-btn-on:active { transform: translateY(0); }
        .login-btn-off {
          background: rgba(255,255,255,0.06);
          color: rgba(240,200,150,0.22);
          cursor: not-allowed;
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

      {/* ── Dark overlay so card pops ── */}
      <div
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse 70% 75% at 50% 50%, rgba(0,0,0,0.08) 0%, rgba(0,0,0,0.6) 100%)',
          zIndex: 1,
        }}
      />

      {/* ── EMBERS — lots of them ── */}
      {Array.from({ length: 60 }).map((_, i) => {
        const size  = 1.5 + (i % 5) * 0.8
        const left  = 3 + (i * 1.63) % 95
        const bot   = (i * 7.3) % 45
        const dx    = `${((i % 2 === 0 ? 1 : -1) * (8 + (i * 3.7) % 35)).toFixed(0)}px`
        const dy    = `-${(55 + (i * 8.1) % 55).toFixed(0)}vh`
        const dur   = `${2.5 + (i * 0.31) % 4}s`
        const delay = `${(i * 0.18) % 4}s`
        const colors = ['#FF4500', '#FF6A00', '#FF8C00', '#FFB347', '#FF3000']
        const color = colors[i % colors.length]
        return (
          <span
            key={i}
            className="ember"
            style={{
              '--dx':    dx,
              '--dy':    dy,
              '--dur':   dur,
              '--delay': delay,
              left:   `${left}%`,
              bottom: `${bot}%`,
              width:  `${size}px`,
              height: `${size}px`,
              background: color,
              boxShadow:  `0 0 ${size * 2}px ${color}`,
              zIndex: 3,
            }}
          />
        )
      })}

      {/* ── LOGIN CARD ── */}
      <div
        className={`card-float card-border relative ${shake ? 'shake' : ''}`}
        style={{
          zIndex:         10,
          width:          'min(90vw, 400px)',
          background:     'rgba(10, 5, 1, 0.88)',
          borderRadius:   '12px',
          border:         '1px solid rgba(100,40,0,0.55)',
          backdropFilter: 'blur(20px)',
          padding:        'clamp(1.8rem, 5vw, 2.3rem) clamp(1.5rem, 4vw, 2rem)',
        }}
      >
        {/* Top edge glow */}
        <div style={{
          position: 'absolute', top: 0, left: '18%', right: '18%', height: '1px',
          background: 'linear-gradient(90deg, transparent, rgba(255,120,0,0.65), transparent)',
        }} />

        {/* ── HEADER ── */}
        <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
          <p style={{
            fontFamily:    '"Barlow", sans-serif',
            fontSize:      '0.72rem',
            fontWeight:    500,
            letterSpacing: '0.25em',
            textTransform: 'uppercase',
            color:         'rgba(240,200,150,0.55)',
            marginBottom:  '0.5rem',
          }}>
            Enter the loop
          </p>

          <h1
            className="title-fire"
            style={{
              fontFamily:  '"Cinzel", "Palatino Linotype", Georgia, serif',
              fontSize:    'clamp(1.5rem, 5vw, 1.95rem)',
              fontWeight:  900,
              letterSpacing: '0.07em',
              margin:      0,
              lineHeight:  1.1,
              background:  'linear-gradient(180deg, #FFD060 0%, #FF8C00 38%, #FF4500 72%, #B81A00 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor:  'transparent',
              backgroundClip:       'text',
            }}
          >
            RECURSION HELL
          </h1>
        </div>

        {/* ── ERROR ── */}
        {error && (
          <div style={{
            display:      'flex',
            alignItems:   'flex-start',
            gap:          '0.5rem',
            background:   'rgba(120,20,0,0.28)',
            border:       '1px solid rgba(180,50,0,0.4)',
            borderRadius: '7px',
            padding:      '9px 13px',
            marginBottom: '1rem',
            fontFamily:   '"Barlow", sans-serif',
            fontSize:     '0.88rem',
            color:        '#F0DEC0',
            lineHeight:   1.45,
          }}>
            <span style={{ color: '#FF8C00', flexShrink: 0, marginTop: '1px' }}>⚠</span>
            {error}
          </div>
        )}

        {/* ── FORM ── */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>

          <div>
            <label style={{
              display:       'block',
              fontFamily:    '"Barlow", sans-serif',
              fontSize:      '0.82rem',
              fontWeight:    600,
              color:         'rgba(240,210,170,0.75)',
              marginBottom:  '0.45rem',
            }}>
              Team Name
            </label>
            <input
              className="hell-input"
              value={teamName}
              onChange={e => setTeamName(e.target.value)}
              autoComplete="username"
              spellCheck={false}
              placeholder="e.g. StackSmashers"
            />
          </div>

          <div>
            <label style={{
              display:       'block',
              fontFamily:    '"Barlow", sans-serif',
              fontSize:      '0.82rem',
              fontWeight:    600,
              color:         'rgba(240,210,170,0.75)',
              marginBottom:  '0.45rem',
            }}>
              Password
            </label>
            <input
              className="hell-input"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoComplete="current-password"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={!canSubmit}
            className={`login-btn ${canSubmit ? 'login-btn-on' : 'login-btn-off'}`}
            style={{ marginTop: '0.3rem' }}
          >
            {loading ? (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center' }}>
                <span className="spin" style={{
                  display: 'inline-block', width: '14px', height: '14px', borderRadius: '50%',
                  border: '2px solid rgba(255,255,255,0.25)', borderTop: '2px solid #fff',
                }} />
                Descending…
              </span>
            ) : 'Login'}
          </button>

        </form>

        {/* Footer */}
        <p style={{
          marginTop:   '1.2rem',
          textAlign:   'center',
          fontFamily:  '"JetBrains Mono", monospace',
          fontSize:    '0.6rem',
          color:       'rgba(240,200,150,0.14)',
          letterSpacing: '0.04em',
        }}>
          // placeholder auth · backend pending
        </p>
      </div>
    </div>
  )
}