import { useMemo, useState, useEffect, useRef } from 'react'

function sleep(ms) { return new Promise(r => setTimeout(r, ms)) }

function SceneCanvas({ active }) {
  const ref       = useRef(null)
  const activeRef = useRef(active)
  useEffect(() => { activeRef.current = active }, [active])

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')

    function resize() {
      canvas.width  = window.innerWidth
      canvas.height = window.innerHeight
    }
    resize()
    window.addEventListener('resize', resize)

    /* ─── Ember palette: dark coals, white-hot core ─── */
    const PALETTE = [
      [255,  80,  0],  // orange
      [230,  50,  0],  // deep orange
      [200,  30,  0],  // dark red-orange
      [255, 120,  0],  // bright amber
      [180,  20,  0],  // deep red
      [220,  60,  0],  // mid orange
      [255, 160, 40],  // warm amber
    ]
    const EMBER_COUNT = 110

    function spawnEmber(W, H) {
      const rgb    = PALETTE[Math.floor(Math.random() * PALETTE.length)]
      const size   = 1.2 + Math.random() * 2.8       // 1.2–4.0px — visible but coal-small
      // Die between 40–58% up the screen — never reaches the card
      const travel = H * (0.48 + Math.random() * 0.08)  // dies right around screen midpoint = bottom of card
      return {
        x:           Math.random() * W,
        y:           H,
        size,
        vx:          (Math.random() - 0.5) * 0.35,
        vy:          -(0.28 + Math.random() * 0.48),  // slow, drifting
        travel,
        dist:        0,
        rgb,
        wobble:      Math.random() * Math.PI * 2,
        wobbleSpd:   0.012 + Math.random() * 0.018,
      }
    }

    // Build pool — stagger first launch across 4s (240 frames at 60fps)
    const W0 = canvas.width, H0 = canvas.height
    const embers = Array.from({ length: EMBER_COUNT }, (_, i) => {
      const e     = spawnEmber(W0, H0)
      e._delay    = Math.floor(i * (240 / EMBER_COUNT))
      e._ticks    = 0
      e.dist      = e.travel  // mark as "spent" so they wait for their delay
      return e
    })

    let t      = 0
    let rafId  = null
    let paused = false
    const onVis = () => { paused = document.hidden }
    document.addEventListener('visibilitychange', onVis)

    function render() {
      rafId = requestAnimationFrame(render)
      if (paused) return
      t++
      const W = canvas.width, H = canvas.height
      ctx.clearRect(0, 0, W, H)

      /* ── Breathing vignette ── */
      const bv = 0.52 + Math.sin(t * 0.016) * 0.06
      const vig = ctx.createRadialGradient(W/2, H/2, H*0.15, W/2, H/2, H*0.9)
      vig.addColorStop(0,   'rgba(0,0,0,0)')
      vig.addColorStop(0.5, `rgba(0,0,0,${bv * 0.28})`)
      vig.addColorStop(1,   `rgba(0,0,0,${bv})`)
      ctx.fillStyle = vig
      ctx.fillRect(0, 0, W, H)

      /* ── Lava glow layers ── */
      const g1 = 0.32 + Math.sin(t * 0.035) * 0.10
      const g2 = 0.18 + Math.sin(t * 0.080 + 1.1) * 0.08
      const g3 = 0.15 + Math.sin(t * 0.170 + 2.5) * 0.06

      // Wide gradient from bottom
      const lg = ctx.createLinearGradient(0, H * 0.62, 0, H)
      lg.addColorStop(0,    'rgba(0,0,0,0)')
      lg.addColorStop(0.45, `rgba(140,35,0,${g1 * 0.45})`)
      lg.addColorStop(0.8,  `rgba(210,60,0,${g1 * 0.72})`)
      lg.addColorStop(1,    `rgba(240,70,0,${g1})`)
      ctx.fillStyle = lg
      ctx.fillRect(0, H * 0.62, W, H * 0.38)

      // Hot-spot center radial
      const hc = ctx.createRadialGradient(W*0.5, H, 0, W*0.5, H, W*0.5)
      hc.addColorStop(0,    `rgba(255,100,0,${g2})`)
      hc.addColorStop(0.35, `rgba(190,55,0,${g2 * 0.55})`)
      hc.addColorStop(1,    'rgba(0,0,0,0)')
      ctx.fillStyle = hc
      ctx.fillRect(0, H * 0.6, W, H * 0.4)

      // Corner glows
      ;[0, W].forEach((cx, side) => {
        const cg = ctx.createRadialGradient(cx, H, 0, cx, H, W * 0.28)
        cg.addColorStop(0,   `rgba(210,60,0,${g3 * 1.1})`)
        cg.addColorStop(0.5, `rgba(150,35,0,${g3 * 0.45})`)
        cg.addColorStop(1,   'rgba(0,0,0,0)')
        ctx.fillStyle = cg
        ctx.fillRect(0, 0, W, H)
      })

      /* ── Cinematic ember system ── */
      if (!activeRef.current) return

      for (let i = 0; i < embers.length; i++) {
        const e = embers[i]

        // Staggered first-launch delay
        if (e._ticks < e._delay) { e._ticks++; continue }

        // Respawn at bottom when done
        if (e.dist >= e.travel) {
          const fresh = spawnEmber(W, H)
          Object.assign(e, fresh)
          e._delay = 0
          e._ticks = 0
          continue
        }

        // Move — mostly straight up, tiny sway
        e.wobble += e.wobbleSpd
        e.x      += e.vx + Math.sin(e.wobble) * 0.10
        e.y      += e.vy
        e.dist   -= e.vy   // vy negative → dist grows

        // Opacity curve:
        // 0→8%  : quick ignite (pops on)
        // 8→65% : full brightness
        // 65→100%: smooth cinematic fade as it cools and rises away
        const prog  = e.dist / e.travel
        const alpha = prog < 0.08
          ? prog / 0.08
          : prog > 0.65
            ? Math.pow(1 - (prog - 0.65) / 0.35, 1.6)
            : 1

        if (alpha < 0.015) continue

        const [r, g, b] = e.rgb
        const bodyR = e.size * (1 - prog * 0.3)  // shrinks slightly as it cools

        // ── Real ember: irregular jagged coal fragment ──
        ctx.save()
        ctx.globalAlpha = alpha
        ctx.translate(e.x, e.y)
        ctx.rotate(e.wobble * 0.5)   // slow random tilt

        // Each ember has a unique jagged polygon shape seeded from its size
        // Looks like a broken fragment of coal — asymmetric, rough edges
        const s = bodyR
        ctx.beginPath()
        // Rough irregular polygon — 7 points, intentionally uneven
        ctx.moveTo( s * 0.0,  -s * 1.1)   // top point
        ctx.lineTo( s * 0.7,  -s * 0.6)
        ctx.lineTo( s * 1.0,   s * 0.1)
        ctx.lineTo( s * 0.5,   s * 0.9)
        ctx.lineTo(-s * 0.2,   s * 1.0)
        ctx.lineTo(-s * 0.9,   s * 0.3)
        ctx.lineTo(-s * 0.8,  -s * 0.7)
        ctx.closePath()

        // Outer char — dark burnt coal
        ctx.fillStyle = `rgba(${Math.floor(r*0.28)},${Math.floor(g*0.08)},0,1)`
        ctx.fill()

        // Hot glowing interior — clipped to same shape, inset
        ctx.save()
        ctx.clip()
        // Radial only INSIDE the clipped shape — so no glow bleeds outside
        const inner = ctx.createRadialGradient(s*0.05, -s*0.1, 0, s*0.05, -s*0.1, s*0.85)
        inner.addColorStop(0,   `rgba(255,230,160,1)`)            // white-hot core
        inner.addColorStop(0.3, `rgba(${r},${Math.max(g,30)},0,1)`)  // ember orange
        inner.addColorStop(0.7, `rgba(${Math.floor(r*0.55)},0,0,1)`) // deep red
        inner.addColorStop(1,   `rgba(0,0,0,0)`)                  // fades to char
        ctx.fillStyle = inner
        ctx.fill()
        ctx.restore()

        ctx.restore()

        // Tiny upward heat trail — just a 1px smear, barely visible
        if (prog < 0.75) {
          ctx.save()
          ctx.globalAlpha = alpha * 0.18
          const trailLen = bodyR * (3 + prog * 4)
          const trail = ctx.createLinearGradient(e.x, e.y, e.x + e.vx*2, e.y + trailLen)
          trail.addColorStop(0, `rgba(${r},${Math.max(g-20,0)},0,1)`)
          trail.addColorStop(1, 'rgba(0,0,0,0)')
          ctx.strokeStyle = trail
          ctx.lineWidth = bodyR * 0.4
          ctx.beginPath()
          ctx.moveTo(e.x, e.y)
          ctx.lineTo(e.x + e.vx*2, e.y + trailLen)
          ctx.stroke()
          ctx.restore()
        }
      }
    }

    rafId = requestAnimationFrame(render)
    return () => {
      cancelAnimationFrame(rafId)
      window.removeEventListener('resize', resize)
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [])

  return (
    <canvas ref={ref} style={{
      position: 'absolute', inset: 0,
      width: '100%', height: '100%',
      zIndex: 2, pointerEvents: 'none',
    }} />
  )
}

export default function Login() {
  const [teamName, setTeamName] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)
  const [shake, setShake]       = useState(false)
  const [videoReady, setVideoReady] = useState(false)

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
      className="min-h-screen relative overflow-hidden flex items-center justify-center"
      style={{ background: '#0a0200', userSelect: 'none', WebkitUserSelect: 'none' }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@700;900&family=Barlow:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap');

        * { user-select:none; -webkit-user-select:none; }
        input { user-select:text !important; -webkit-user-select:text !important; }

        @keyframes shakeX {
          0%,100%{ transform:translateX(0); }
          20%,60%{ transform:translateX(-9px); }
          40%,80%{ transform:translateX(9px); }
        }
        @keyframes spin { to{ transform:rotate(360deg); } }
        @keyframes cardFloat {
          0%,100% { transform:translateY(0px); }
          50%      { transform:translateY(-5px); }
        }
        @keyframes glitch {
          0%,88%,100% { clip-path:none; transform:translate(0); opacity:1; }
          89%   { clip-path:polygon(0 12%,100% 12%,100% 28%,0 28%); transform:translate(-4px,0); }
          89.5% { clip-path:polygon(0 55%,100% 55%,100% 70%,0 70%); transform:translate(4px,0); }
          90%   { clip-path:none; transform:translate(0); }
          93%   { clip-path:polygon(0 30%,100% 30%,100% 38%,0 38%); transform:translate(5px,-1px); }
          93.5% { clip-path:polygon(0 60%,100% 60%,100% 80%,0 80%); transform:translate(-3px,1px); }
          94%   { clip-path:none; transform:translate(0); }
          97%   { opacity:1; }
          97.5% { opacity:0.12; transform:translate(2px,0); }
          98%   { opacity:1; transform:translate(0); }
        }
        @keyframes glitchBefore {
          0%,88%,100% { opacity:0; clip-path:none; }
          89%   { clip-path:polygon(0 10%,100% 10%,100% 32%,0 32%); transform:translate(-5px,0); opacity:0.75; }
          89.5% { clip-path:polygon(0 58%,100% 58%,100% 72%,0 72%); transform:translate(4px,0); opacity:0.75; }
          90%   { opacity:0; }
          93%   { clip-path:polygon(0 28%,100% 28%,100% 42%,0 42%); transform:translate(6px,0); opacity:0.65; }
          93.5% { clip-path:polygon(0 62%,100% 62%,100% 78%,0 78%); transform:translate(-4px,0); opacity:0.65; }
          94%   { opacity:0; }
        }
        @keyframes glitchAfter {
          0%,88%,100% { opacity:0; clip-path:none; }
          89%   { clip-path:polygon(0 20%,100% 20%,100% 42%,0 42%); transform:translate(5px,0); opacity:0.5; }
          89.5% { clip-path:polygon(0 45%,100% 45%,100% 60%,0 60%); transform:translate(-5px,0); opacity:0.5; }
          90%   { opacity:0; }
          93%   { clip-path:polygon(0 38%,100% 38%,100% 55%,0 55%); transform:translate(-6px,0); opacity:0.5; }
          93.5% { clip-path:polygon(0 65%,100% 65%,100% 82%,0 82%); transform:translate(4px,0); opacity:0.5; }
          94%   { opacity:0; }
        }
        .title-glitch { position:relative; animation:glitch 11s steps(1) infinite; }
        .title-glitch::before,
        .title-glitch::after {
          content:'RECURSION HELL'; position:absolute; inset:0;
          background:inherit; -webkit-background-clip:text; background-clip:text;
          -webkit-text-fill-color:transparent;
        }
        .title-glitch::before {
          background:linear-gradient(180deg,#ff2200 0%,#ff4400 100%);
          -webkit-background-clip:text; background-clip:text;
          -webkit-text-fill-color:transparent;
          animation:glitchBefore 11s steps(1) infinite;
        }
        .title-glitch::after {
          background:linear-gradient(180deg,#ffdd00 0%,#ff8800 100%);
          -webkit-background-clip:text; background-clip:text;
          -webkit-text-fill-color:transparent;
          animation:glitchAfter 11s steps(1) infinite;
        }
        @keyframes borderShimmer {
          0%,100% { border-color:rgba(200,90,0,0.4);  box-shadow:0 8px 32px rgba(0,0,0,0.5),inset 0 0 0 1px rgba(200,90,0,0.4); }
          50%      { border-color:rgba(255,130,0,0.55); box-shadow:0 8px 32px rgba(0,0,0,0.5),inset 0 0 0 1px rgba(255,130,0,0.55),0 0 24px rgba(255,80,0,0.1); }
        }
        @keyframes lavaReflect { 0%,100%{opacity:0.45;} 50%{opacity:0.75;} }
        @keyframes dividerShimmer {
          0%  {background-position:-200% center;}
          100%{background-position:200% center;}
        }
        @keyframes blink { 0%,49%{opacity:1;} 50%,100%{opacity:0;} }
        @keyframes btnSweep { 0%{left:-80%} 100%{left:140%} }
        @keyframes btnGlow {
          0%,100%{box-shadow:0 4px 20px rgba(255,100,0,0.45),0 2px 6px rgba(0,0,0,0.6);}
          50%    {box-shadow:0 4px 30px rgba(255,140,0,0.7),0 2px 6px rgba(0,0,0,0.6),0 0 50px rgba(220,70,0,0.22);}
        }
        .shake      {animation:shakeX 420ms ease-in-out;}
        .spin       {animation:spin 0.8s linear infinite;}
        .card-float {animation:cardFloat 7s ease-in-out infinite;}
        .card-border{animation:borderShimmer 3s ease-in-out infinite;}
        .hell-input {
          width:100%; box-sizing:border-box;
          background:rgba(6,3,1,0.55);
          border:1px solid rgba(110,45,0,0.5);
          border-radius:8px; padding:11px 14px;
          color:#F5ECD7; font-family:'Barlow',sans-serif;
          font-size:0.95rem; outline:none;
          transition:border-color .2s,box-shadow .2s,background .2s;
          caret-color:#FF8C00;
          user-select:text !important; -webkit-user-select:text !important;
        }
        .hell-input::placeholder{color:rgba(240,200,150,0.22);font-style:italic;}
        .hell-input:focus{
          border-color:rgba(255,120,0,0.8);
          background:rgba(6,3,1,0.72);
          box-shadow:0 0 0 3px rgba(255,100,0,0.13),0 0 18px rgba(255,80,0,0.1);
        }
        .login-btn{
          width:100%; padding:13px 0; border:none; border-radius:8px;
          font-family:'Cinzel',serif; font-size:0.88rem; font-weight:700;
          letter-spacing:0.2em; text-transform:uppercase; cursor:pointer;
          position:relative; overflow:hidden; transition:filter .2s,transform .15s;
        }
        .login-btn-on{
          background:linear-gradient(180deg,#FF9500 0%,#E06200 45%,#961800 100%);
          color:#fff; text-shadow:0 1px 4px rgba(0,0,0,0.55);
          animation:btnGlow 2.5s ease-in-out infinite;
        }
        .login-btn-on::before{
          content:''; position:absolute; inset:0;
          background:repeating-linear-gradient(90deg,transparent 0px,transparent 3px,rgba(255,255,255,0.03) 3px,rgba(255,255,255,0.03) 4px);
          pointer-events:none;
        }
        .login-btn-on::after{
          content:''; position:absolute; top:0; left:-80%; width:55%; height:100%;
          background:linear-gradient(90deg,transparent,rgba(255,255,255,0.15),transparent);
          transform:skewX(-18deg); animation:btnSweep 3.5s ease-in-out infinite;
        }
        .login-btn-on:hover {filter:brightness(1.1);transform:translateY(-2px);}
        .login-btn-on:active{transform:translateY(0);}
        .login-btn-off{
          background:rgba(255,255,255,0.05);
          color:rgba(240,200,150,0.2); cursor:not-allowed;
          border:1px solid rgba(100,40,0,0.25);
        }
      `}</style>

      {/* ── BG VIDEO ── */}
      <video
        autoPlay loop muted playsInline
        onCanPlay={() => setVideoReady(true)}
        className="absolute inset-0 w-full h-full object-cover"
        style={{ zIndex:0, opacity: videoReady ? 0.82 : 0, transition:'opacity 1.2s ease' }}
      >
        <source src="/lava-bg.mp4" type="video/mp4" />
      </video>

      {/* ── Canvas: vignette + lava glow + embers ── */}
      <SceneCanvas active={videoReady} />

      {/* ── LOGIN CARD ── */}
      <div
        className={`card-float card-border relative ${shake ? 'shake' : ''}`}
        style={{
          zIndex:10, width:'min(90vw, 400px)',
          background:'rgba(8,3,0,0.42)', borderRadius:'12px',
          border:'1px solid rgba(200,90,0,0.4)',
          backdropFilter:'blur(5px)',
          padding:'clamp(1.8rem,5vw,2.3rem) clamp(1.5rem,4vw,2rem)',
        }}
      >
        <div style={{
          position:'absolute', top:0, left:'10%', right:'10%', height:'1px',
          background:'linear-gradient(90deg,transparent,rgba(255,140,0,0.8),rgba(255,200,80,0.9),rgba(255,140,0,0.8),transparent)',
          backgroundSize:'200% 100%', animation:'dividerShimmer 4s linear infinite',
        }} />
        <div style={{
          position:'absolute', bottom:0, left:0, right:0, height:'60px',
          borderRadius:'0 0 12px 12px',
          background:'linear-gradient(to top,rgba(200,60,0,0.18),transparent)',
          animation:'lavaReflect 3s ease-in-out infinite', pointerEvents:'none',
        }} />

        {/* HEADER */}
        <div style={{ textAlign:'center', marginBottom:'1.4rem' }}>
          <p style={{ fontFamily:'"JetBrains Mono",monospace', fontSize:'0.65rem', letterSpacing:'0.3em', textTransform:'uppercase', color:'rgba(240,200,150,0.45)', marginBottom:'0.55rem' }}>
            // Enter the loop
          </p>
          <h1 className="title-glitch" style={{
            fontFamily:'"Cinzel","Palatino Linotype",Georgia,serif',
            fontSize:'clamp(1.5rem,5vw,1.95rem)', fontWeight:900,
            letterSpacing:'0.07em', margin:0, lineHeight:1.1,
            background:'linear-gradient(180deg,#FFD060 0%,#FF8C00 38%,#FF4500 72%,#B81A00 100%)',
            WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text',
          }}>RECURSION HELL</h1>
          <p style={{ fontFamily:'"JetBrains Mono",monospace', fontSize:'0.6rem', color:'rgba(240,180,100,0.35)', letterSpacing:'0.15em', marginTop:'0.45rem' }}>
            COMPETITIVE PROGRAMMING CONTEST
          </p>
        </div>

        <div style={{ height:'1px', marginBottom:'1.4rem', background:'linear-gradient(90deg,transparent,rgba(200,80,0,0.5),rgba(255,140,0,0.6),rgba(200,80,0,0.5),transparent)' }} />

        {error && (
          <div style={{ display:'flex', alignItems:'flex-start', gap:'0.5rem', background:'rgba(120,20,0,0.35)', border:'1px solid rgba(200,50,0,0.45)', borderRadius:'7px', padding:'9px 13px', marginBottom:'1rem', fontFamily:'"Barlow",sans-serif', fontSize:'0.88rem', color:'#F5ECD7', lineHeight:1.45 }}>
            <span style={{ color:'#FF6A00', flexShrink:0, marginTop:'1px' }}>⚠</span>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display:'flex', flexDirection:'column', gap:'1rem' }}>
          <div>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom:'0.4rem' }}>
              <label style={{ fontFamily:'"Barlow",sans-serif', fontSize:'0.82rem', fontWeight:600, color:'rgba(240,210,170,0.8)' }}>Team Name</label>
              <span style={{ fontFamily:'"JetBrains Mono",monospace', fontSize:'0.58rem', color:'rgba(255,120,0,0.4)', letterSpacing:'0.08em' }}>IDENTIFIER</span>
            </div>
            <input className="hell-input" value={teamName} onChange={e=>setTeamName(e.target.value)} autoComplete="username" spellCheck={false} placeholder="e.g. StackSmashers" />
          </div>
          <div>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom:'0.4rem' }}>
              <label style={{ fontFamily:'"Barlow",sans-serif', fontSize:'0.82rem', fontWeight:600, color:'rgba(240,210,170,0.8)' }}>Password</label>
              <span style={{ fontFamily:'"JetBrains Mono",monospace', fontSize:'0.58rem', color:'rgba(255,120,0,0.4)', letterSpacing:'0.08em' }}>ENCRYPTED</span>
            </div>
            <input className="hell-input" type="password" value={password} onChange={e=>setPassword(e.target.value)} autoComplete="current-password" placeholder="••••••••" />
          </div>
          <button type="submit" disabled={!canSubmit} className={`login-btn ${canSubmit?'login-btn-on':'login-btn-off'}`} style={{ marginTop:'0.5rem' }}>
            {loading ? (
              <span style={{ display:'inline-flex', alignItems:'center', gap:'0.5rem', justifyContent:'center' }}>
                <span className="spin" style={{ display:'inline-block', width:'14px', height:'14px', borderRadius:'50%', border:'2px solid rgba(255,255,255,0.25)', borderTop:'2px solid #fff' }} />
                Descending…
              </span>
            ) : 'Descent'}
          </button>
        </form>

        <div style={{ marginTop:'1.3rem', paddingTop:'0.9rem', borderTop:'1px solid rgba(150,60,0,0.2)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <span style={{ fontFamily:'"JetBrains Mono",monospace', fontSize:'0.58rem', color:'rgba(240,200,150,0.2)', letterSpacing:'0.06em' }}>// RECURSION HELL v1.0</span>
          <span style={{ display:'flex', alignItems:'center', gap:'0.35rem' }}>
            <span style={{ width:'5px', height:'5px', borderRadius:'50%', background:'#FF4500', boxShadow:'0 0 6px rgba(255,69,0,0.9)', animation:'blink 1.4s step-start infinite', display:'inline-block' }} />
            <span style={{ fontFamily:'"JetBrains Mono",monospace', fontSize:'0.58rem', color:'rgba(255,100,0,0.45)', letterSpacing:'0.06em' }}>CONTEST LIVE</span>
          </span>
        </div>
      </div>
    </div>
  )
}