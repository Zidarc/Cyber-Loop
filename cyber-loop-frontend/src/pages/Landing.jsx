import { useState, useEffect, useRef } from 'react'

/* ─── Countdown target — change this date for real contest ─── */
const CONTEST_START = new Date(Date.now() + 12 * 60 * 1000) // 12 min from now for demo

function getTimeLeft() {
  const diff = CONTEST_START - Date.now()
  if (diff <= 0) return { h: '00', m: '00', s: '00', over: true }
  const h = Math.floor(diff / 3600000)
  const m = Math.floor((diff % 3600000) / 60000)
  const s = Math.floor((diff % 60000) / 1000)
  return {
    h: String(h).padStart(2, '0'),
    m: String(m).padStart(2, '0'),
    s: String(s).padStart(2, '0'),
    over: false,
  }
}

/* ─── Canvas: same volcano atmosphere as Login ─── */
function SceneCanvas() {
  const ref = useRef(null)
  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    function resize() { canvas.width = window.innerWidth; canvas.height = window.innerHeight }
    resize()
    window.addEventListener('resize', resize)

    const PALETTE = [[255,80,0],[230,50,0],[200,30,0],[255,120,0],[180,20,0],[220,60,0],[255,160,40]]
    const EMBER_COUNT = 90

    function spawnEmber(W, H) {
      const rgb = PALETTE[Math.floor(Math.random() * PALETTE.length)]
      const size = 1.2 + Math.random() * 2.8
      const travel = H * (0.48 + Math.random() * 0.08)
      return { x: Math.random()*W, y: H, size, vx: (Math.random()-0.5)*0.35, vy: -(0.28+Math.random()*0.48), travel, dist: 0, rgb, wobble: Math.random()*Math.PI*2, wobbleSpd: 0.012+Math.random()*0.018 }
    }

    const W0 = canvas.width, H0 = canvas.height
    const embers = Array.from({ length: EMBER_COUNT }, (_, i) => {
      const e = spawnEmber(W0, H0)
      e._delay = Math.floor(i * (120 / EMBER_COUNT))
      e._ticks = 0; e.dist = e.travel
      return e
    })

    let t = 0, rafId, paused = false
    const onVis = () => { paused = document.hidden }
    document.addEventListener('visibilitychange', onVis)

    function render() {
      rafId = requestAnimationFrame(render)
      if (paused) return
      t++
      const W = canvas.width, H = canvas.height
      ctx.clearRect(0, 0, W, H)

      // Vignette
      const bv = 0.52 + Math.sin(t * 0.016) * 0.06
      const vig = ctx.createRadialGradient(W/2, H/2, H*0.15, W/2, H/2, H*0.9)
      vig.addColorStop(0, 'rgba(0,0,0,0)')
      vig.addColorStop(0.5, `rgba(0,0,0,${bv*0.28})`)
      vig.addColorStop(1, `rgba(0,0,0,${bv})`)
      ctx.fillStyle = vig; ctx.fillRect(0, 0, W, H)

      // Lava glow
      const g1 = 0.28 + Math.sin(t*0.035)*0.09
      const g2 = 0.15 + Math.sin(t*0.08+1.1)*0.07
      const g3 = 0.12 + Math.sin(t*0.17+2.5)*0.05
      const lg = ctx.createLinearGradient(0, H*0.65, 0, H)
      lg.addColorStop(0, 'rgba(0,0,0,0)')
      lg.addColorStop(0.5, `rgba(140,35,0,${g1*0.4})`)
      lg.addColorStop(1, `rgba(230,65,0,${g1})`)
      ctx.fillStyle = lg; ctx.fillRect(0, H*0.65, W, H*0.35)
      const hc = ctx.createRadialGradient(W*0.5, H, 0, W*0.5, H, W*0.5)
      hc.addColorStop(0, `rgba(255,100,0,${g2})`)
      hc.addColorStop(0.4, `rgba(180,50,0,${g2*0.5})`)
      hc.addColorStop(1, 'rgba(0,0,0,0)')
      ctx.fillStyle = hc; ctx.fillRect(0, H*0.6, W, H*0.4)
      ;[0, W].forEach(cx => {
        const cg = ctx.createRadialGradient(cx, H, 0, cx, H, W*0.25)
        cg.addColorStop(0, `rgba(200,55,0,${g3*1.1})`)
        cg.addColorStop(0.5, `rgba(140,30,0,${g3*0.4})`)
        cg.addColorStop(1, 'rgba(0,0,0,0)')
        ctx.fillStyle = cg; ctx.fillRect(0, 0, W, H)
      })

      // Embers
      for (let i = 0; i < embers.length; i++) {
        const e = embers[i]
        if (e._ticks < e._delay) { e._ticks++; continue }
        if (e.dist >= e.travel) { Object.assign(e, spawnEmber(W, H)); e._delay=0; e._ticks=0; continue }
        e.wobble += e.wobbleSpd
        e.x += e.vx + Math.sin(e.wobble)*0.10
        e.y += e.vy; e.dist -= e.vy
        const prog = e.dist / e.travel
        const alpha = prog < 0.08 ? prog/0.08 : prog > 0.65 ? Math.pow(1-(prog-0.65)/0.35,1.6) : 1
        if (alpha < 0.015) continue
        const [r, g, b] = e.rgb
        const bodyR = e.size * (1 - prog*0.3)
        ctx.save(); ctx.globalAlpha = alpha
        ctx.translate(e.x, e.y); ctx.rotate(e.wobble*0.5)
        const s = bodyR
        ctx.beginPath()
        ctx.moveTo(s*0.0, -s*1.1); ctx.lineTo(s*0.7, -s*0.6)
        ctx.lineTo(s*1.0, s*0.1);  ctx.lineTo(s*0.5, s*0.9)
        ctx.lineTo(-s*0.2, s*1.0); ctx.lineTo(-s*0.9, s*0.3)
        ctx.lineTo(-s*0.8, -s*0.7); ctx.closePath()
        ctx.fillStyle = `rgba(${Math.floor(r*0.28)},${Math.floor(g*0.08)},0,1)`; ctx.fill()
        ctx.save(); ctx.clip()
        const inner = ctx.createRadialGradient(s*0.05,-s*0.1,0,s*0.05,-s*0.1,s*0.85)
        inner.addColorStop(0, 'rgba(255,230,160,1)')
        inner.addColorStop(0.3, `rgba(${r},${Math.max(g,30)},0,1)`)
        inner.addColorStop(0.7, `rgba(${Math.floor(r*0.55)},0,0,1)`)
        inner.addColorStop(1, 'rgba(0,0,0,0)')
        ctx.fillStyle = inner; ctx.fill()
        ctx.restore(); ctx.restore()
      }
    }
    rafId = requestAnimationFrame(render)
    return () => { cancelAnimationFrame(rafId); window.removeEventListener('resize', resize); document.removeEventListener('visibilitychange', onVis) }
  }, [])
  return <canvas ref={ref} style={{ position:'fixed', inset:0, width:'100%', height:'100%', zIndex:1, pointerEvents:'none' }} />
}

/* ─── Flip clock digit ─── */
function FlipDigit({ value, label }) {
  const [display, setDisplay] = useState(value)
  const [flip, setFlip]       = useState(false)
  const prev = useRef(value)

  useEffect(() => {
    if (value !== prev.current) {
      setFlip(true)
      setTimeout(() => { setDisplay(value); setFlip(false) }, 280)
      prev.current = value
    }
  }, [value])

  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:'0.5rem' }}>
      <div style={{ position:'relative', width:'72px', height:'88px' }}>
        {/* Back plate */}
        <div style={{ position:'absolute', inset:0, background:'rgba(12,5,0,0.9)', border:'1px solid rgba(200,80,0,0.3)', borderRadius:'8px', boxShadow:'0 8px 32px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,120,0,0.1)' }} />
        {/* Center line */}
        <div style={{ position:'absolute', top:'50%', left:0, right:0, height:'1px', background:'rgba(0,0,0,0.8)', zIndex:3 }} />
        {/* Digit */}
        <div style={{
          position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center',
          fontFamily:'"Cinzel",serif', fontSize:'2.8rem', fontWeight:900,
          background:'linear-gradient(180deg,#FFD060 0%,#FF8C00 50%,#C04000 100%)',
          WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text',
          transform: flip ? 'scaleY(0.1)' : 'scaleY(1)',
          transition: flip ? 'transform 0.14s ease-in' : 'transform 0.14s ease-out',
          zIndex:2,
        }}>{display}</div>
        {/* Subtle gloss top half */}
        <div style={{ position:'absolute', top:0, left:0, right:0, height:'50%', background:'rgba(255,255,255,0.03)', borderRadius:'8px 8px 0 0', pointerEvents:'none', zIndex:4 }} />
      </div>
      <span style={{ fontFamily:'"JetBrains Mono",monospace', fontSize:'0.55rem', letterSpacing:'0.2em', color:'rgba(255,120,0,0.4)', textTransform:'uppercase' }}>{label}</span>
    </div>
  )
}

/* ─── Rulebook section ─── */
const RULES = [
  {
    title: '// GRAPH STRUCTURE',
    body: 'The game is a node-based puzzle graph. Each node is a question. Only the Start node is unlocked initially. Solve a node to unlock its connected neighbors and progress forward.',
  },
  {
    title: '// CHECKPOINTS',
    body: 'Certain nodes are checkpoints. Reach one and it becomes your respawn point. A wrong answer before any checkpoint sends you back to Start. After a checkpoint, wrong answers send you back to your last checkpoint — all progress after it resets.',
  },
  {
    title: '// THE LOOP — PENALTY SYSTEM',
    body: 'Every wrong answer adds a penalty node to your path. Up to 7 special penalty nodes exist — each harder than the main path. The Final Node only unlocks after you\'ve solved base_required + mistakes_made nodes. Wrong answers literally make the game longer.',
  },
  {
    title: '// QUESTION RULES',
    body: 'Questions are dynamic — no immediate repeats after a wrong answer. Nodes solved correctly after a checkpoint never reappear. Before a checkpoint, previously seen questions may resurface — but always reshuffled, never the one you just failed.',
  },
  {
    title: '// SCORING',
    body: 'Scoreboard ranks by: (1) highest correct solves, then (2) fewest penalties accumulated. Speed may be a tiebreaker. Play clean — every mistake costs you more than time.',
  },
]

function Rulebook() {
  const [open, setOpen] = useState(false)
  const [openIdx, setOpenIdx] = useState(null)

  return (
    <div style={{ width:'100%', maxWidth:'680px', margin:'0 auto' }}>
      {/* Header toggle */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width:'100%', background:'rgba(8,3,0,0.55)', border:'1px solid rgba(200,80,0,0.35)',
          borderRadius: open ? '10px 10px 0 0' : '10px',
          padding:'1rem 1.4rem', cursor:'pointer',
          display:'flex', alignItems:'center', justifyContent:'space-between',
          backdropFilter:'blur(6px)', transition:'border-radius 0.2s',
        }}
      >
        <span style={{ fontFamily:'"Cinzel",serif', fontSize:'0.85rem', fontWeight:700, letterSpacing:'0.15em', color:'rgba(255,180,80,0.9)' }}>
          RULEBOOK — THE LOOP
        </span>
        <span style={{ fontFamily:'"JetBrains Mono",monospace', fontSize:'0.7rem', color:'rgba(255,120,0,0.6)', transition:'transform 0.3s', display:'inline-block', transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}>▼</span>
      </button>

      {/* Rules list */}
      <div style={{
        maxHeight: open ? '800px' : '0px',
        overflow:'hidden', transition:'max-height 0.5s cubic-bezier(0.4,0,0.2,1)',
        background:'rgba(6,2,0,0.6)', border: open ? '1px solid rgba(200,80,0,0.35)' : 'none',
        borderTop:'none', borderRadius:'0 0 10px 10px', backdropFilter:'blur(6px)',
      }}>
        {RULES.map((rule, i) => (
          <div key={i} style={{ borderBottom: i < RULES.length-1 ? '1px solid rgba(150,50,0,0.2)' : 'none' }}>
            <button
              onClick={() => setOpenIdx(openIdx === i ? null : i)}
              style={{
                width:'100%', background:'transparent', border:'none', cursor:'pointer',
                padding:'0.9rem 1.4rem', display:'flex', alignItems:'center', justifyContent:'space-between',
              }}
            >
              <span style={{ fontFamily:'"JetBrains Mono",monospace', fontSize:'0.72rem', letterSpacing:'0.08em', color:'rgba(255,140,0,0.75)' }}>
                {rule.title}
              </span>
              <span style={{ color:'rgba(255,100,0,0.4)', fontSize:'0.65rem', transition:'transform 0.2s', display:'inline-block', transform: openIdx===i?'rotate(90deg)':'rotate(0deg)' }}>▶</span>
            </button>
            <div style={{
              maxHeight: openIdx === i ? '300px' : '0px',
              overflow:'hidden', transition:'max-height 0.3s ease',
              padding: openIdx === i ? '0 1.4rem 1rem' : '0 1.4rem',
            }}>
              <p style={{ fontFamily:'"Barlow",sans-serif', fontSize:'0.88rem', lineHeight:1.7, color:'rgba(240,210,170,0.7)', margin:0 }}>
                {rule.body}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ─── Main Landing Page ─── */
export default function Landing() {
  const teamName = sessionStorage.getItem('teamName') || 'TEAM ALPHA'
  const [time, setTime]         = useState(getTimeLeft())
  const [glitch, setGlitch]     = useState(false)
  const [videoReady, setVideoReady] = useState(false)
  const scrollRef               = useRef(null)
  const lastSnap                = useRef(0)

  // Live countdown
  useEffect(() => {
    const id = setInterval(() => setTime(getTimeLeft()), 1000)
    return () => clearInterval(id)
  }, [])

  // Infinite scroll illusion
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const onScroll = () => {
      const mid = el.scrollHeight / 2
      if (el.scrollTop > mid && Date.now() - lastSnap.current > 800) {
        lastSnap.current = Date.now()
        setGlitch(true)
        setTimeout(() => setGlitch(false), 350)
        el.scrollTop = el.scrollTop - mid
      }
    }
    el.addEventListener('scroll', onScroll)
    return () => el.removeEventListener('scroll', onScroll)
  }, [])

  const contestLive = time.over

  return (
    <div style={{ position:'fixed', inset:0, background:'#0a0200', overflow:'hidden', userSelect:'none' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@700;900&family=Barlow:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap');
        * { user-select:none; -webkit-user-select:none; box-sizing:border-box; margin:0; padding:0; }

        @keyframes blink { 0%,49%{opacity:1} 50%,100%{opacity:0} }
        @keyframes glitchFlash {
          0%   { opacity:1; transform:translate(0); filter:none; }
          20%  { opacity:0.2; transform:translate(-4px,0); filter:hue-rotate(90deg); }
          40%  { opacity:1; transform:translate(3px,0); filter:saturate(3); }
          60%  { opacity:0.3; transform:translate(0,-2px); filter:hue-rotate(-90deg); }
          80%  { opacity:1; transform:translate(2px,0); filter:none; }
          100% { opacity:1; transform:translate(0); filter:none; }
        }
        @keyframes shimmer {
          0%   { background-position:-200% center; }
          100% { background-position:200% center; }
        }
        @keyframes pulseGlow {
          0%,100% { box-shadow:0 0 30px rgba(255,120,0,0.3), 0 4px 20px rgba(0,0,0,0.6); }
          50%      { box-shadow:0 0 60px rgba(255,150,0,0.55), 0 4px 20px rgba(0,0,0,0.6), 0 0 100px rgba(200,80,0,0.2); }
        }
        @keyframes btnSweep { 0%{left:-80%} 100%{left:140%} }
        @keyframes navFadeIn { from{opacity:0;transform:translateY(-12px)} to{opacity:1;transform:translateY(0)} }
        @keyframes heroFadeIn { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
        @keyframes sectionFadeIn { from{opacity:0;transform:translateY(30px)} to{opacity:1;transform:translateY(0)} }

        .glitch-page { animation: glitchFlash 0.35s steps(1) forwards; }

        .nav-btn {
          background:transparent; border:1px solid rgba(200,80,0,0.3);
          border-radius:6px; padding:7px 16px; cursor:pointer;
          fontFamily:'Cinzel',serif; font-size:0.72rem; font-weight:700;
          letter-spacing:0.12em; color:rgba(240,200,140,0.75);
          transition:all 0.2s; font-family:'Cinzel',serif;
        }
        .nav-btn:hover { background:rgba(255,100,0,0.12); border-color:rgba(255,130,0,0.6); color:#F5ECD7; }

        .start-btn-live {
          background:linear-gradient(180deg,#FF9500 0%,#E06200 45%,#961800 100%);
          color:#fff; border:none; cursor:pointer;
          animation:pulseGlow 2.5s ease-in-out infinite;
          position:relative; overflow:hidden;
        }
        .start-btn-live::after {
          content:''; position:absolute; top:0; left:-80%; width:55%; height:100%;
          background:linear-gradient(90deg,transparent,rgba(255,255,255,0.15),transparent);
          transform:skewX(-18deg); animation:btnSweep 3s ease-in-out infinite;
        }
        .start-btn-live:hover { filter:brightness(1.1); transform:translateY(-2px); }
        .start-btn-disabled {
          background:rgba(255,255,255,0.04); color:rgba(240,200,150,0.2);
          cursor:not-allowed; border:1px solid rgba(100,40,0,0.2);
        }

        .section-card {
          background:rgba(8,3,0,0.45); border:1px solid rgba(200,80,0,0.25);
          border-radius:12px; backdrop-filter:blur(6px);
          padding:2rem 2rem;
        }
      `}</style>

      {/* BG video */}
      <video autoPlay loop muted playsInline onCanPlay={() => setVideoReady(true)}
        style={{ position:'fixed', inset:0, width:'100%', height:'100%', objectFit:'cover', zIndex:0, opacity: videoReady?0.78:0, transition:'opacity 1.2s ease' }}>
        <source src="/lava-bg.mp4" type="video/mp4" />
      </video>

      <SceneCanvas />

      {/* Glitch overlay */}
      {glitch && <div style={{ position:'fixed', inset:0, zIndex:99, pointerEvents:'none', background:'rgba(255,80,0,0.06)', mixBlendMode:'screen', animation:'glitchFlash 0.35s steps(1) forwards' }} />}

      {/* ── NAVBAR ── */}
      <nav style={{
        position:'fixed', top:0, left:0, right:0, zIndex:50,
        background:'rgba(6,2,0,0.72)', borderBottom:'1px solid rgba(200,80,0,0.2)',
        backdropFilter:'blur(10px)', padding:'0 2rem', height:'56px',
        display:'flex', alignItems:'center', justifyContent:'space-between',
        animation:'navFadeIn 0.6s ease both',
      }}>
        <span style={{ fontFamily:'"Cinzel",serif', fontSize:'0.85rem', fontWeight:900, letterSpacing:'0.12em', background:'linear-gradient(90deg,#FFD060,#FF8C00)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text' }}>
          RECURSION HELL
        </span>
        <div style={{ display:'flex', alignItems:'center', gap:'0.6rem' }}>
          <span style={{ fontFamily:'"JetBrains Mono",monospace', fontSize:'0.65rem', color:'rgba(255,160,60,0.6)', marginRight:'0.6rem', letterSpacing:'0.08em' }}>
            {teamName.toUpperCase()}
          </span>
          <button className="nav-btn" onClick={() => window.location.assign('/scoreboard')}>SCOREBOARD</button>
          <button className="nav-btn" onClick={() => window.location.assign('/game')}>GAME</button>
          <button className="nav-btn" onClick={() => { sessionStorage.clear(); window.location.assign('/') }}
            style={{ borderColor:'rgba(180,30,0,0.4)', color:'rgba(255,100,80,0.6)' }}>
            LOGOUT
          </button>
        </div>
      </nav>

      {/* ── SCROLLABLE CONTENT ── */}
      <div ref={scrollRef} style={{ position:'absolute', inset:0, overflowY:'auto', zIndex:10, paddingTop:'56px' }}>
        {/* Render content twice for infinite loop illusion */}
        {[0, 1].map(pass => (
          <div key={pass}>
            {/* ── HERO ── */}
            <section style={{ minHeight:'100vh', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'4rem 2rem 2rem', animation: pass===0 ? 'heroFadeIn 0.9s 0.2s ease both' : 'none' }}>
              <p style={{ fontFamily:'"JetBrains Mono",monospace', fontSize:'0.65rem', letterSpacing:'0.35em', color:'rgba(240,200,150,0.4)', marginBottom:'1rem', textTransform:'uppercase' }}>
                // welcome, {teamName.toLowerCase()}
              </p>
              <h1 style={{
                fontFamily:'"Cinzel",serif', fontSize:'clamp(2rem,6vw,4rem)', fontWeight:900,
                letterSpacing:'0.06em', textAlign:'center', lineHeight:1.1, marginBottom:'1rem',
                background:'linear-gradient(180deg,#FFD060 0%,#FF8C00 40%,#FF4500 75%,#B81A00 100%)',
                WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text',
              }}>
                ENTER THE LOOP
              </h1>
              <p style={{ fontFamily:'"Barlow",sans-serif', fontSize:'1rem', color:'rgba(240,210,170,0.45)', textAlign:'center', maxWidth:'480px', lineHeight:1.7, marginBottom:'3.5rem' }}>
                Solve or be sent back. Every mistake makes the path longer.<br/>There is no escape — only completion.
              </p>

              {/* ── COUNTDOWN ── */}
              <div style={{ marginBottom:'2.5rem', animation: pass===0 ? 'sectionFadeIn 0.9s 0.4s ease both' : 'none', opacity: pass===0?0:1, animationFillMode:'both' }}>
                <p style={{ fontFamily:'"JetBrains Mono",monospace', fontSize:'0.6rem', letterSpacing:'0.25em', color:'rgba(255,120,0,0.45)', textAlign:'center', marginBottom:'1.2rem' }}>
                  {contestLive ? '// CONTEST IS LIVE' : '// CONTEST BEGINS IN'}
                </p>
                <div style={{ display:'flex', alignItems:'center', gap:'1rem' }}>
                  <FlipDigit value={time.h} label="HRS" />
                  <span style={{ fontFamily:'"Cinzel",serif', fontSize:'2rem', color:'rgba(255,100,0,0.4)', marginBottom:'1.5rem' }}>:</span>
                  <FlipDigit value={time.m} label="MIN" />
                  <span style={{ fontFamily:'"Cinzel",serif', fontSize:'2rem', color:'rgba(255,100,0,0.4)', marginBottom:'1.5rem' }}>:</span>
                  <FlipDigit value={time.s} label="SEC" />
                </div>
              </div>

              {/* ── START GAME BUTTON ── */}
              <div style={{ textAlign:'center', animation: pass===0 ? 'sectionFadeIn 0.9s 0.6s ease both' : 'none', opacity: pass===0?0:1, animationFillMode:'both' }}>
                <button
                  disabled={!contestLive}
                  onClick={() => contestLive && window.location.assign('/game')}
                  className={contestLive ? 'start-btn-live' : 'start-btn-disabled'}
                  style={{
                    padding:'16px 56px', borderRadius:'10px',
                    fontFamily:'"Cinzel",serif', fontSize:'0.95rem', fontWeight:700,
                    letterSpacing:'0.22em', textTransform:'uppercase',
                    transition:'filter 0.2s, transform 0.15s',
                  }}
                >
                  {contestLive ? 'ENTER THE LOOP' : 'AWAITING IGNITION'}
                </button>
                {!contestLive && (
                  <p style={{ fontFamily:'"JetBrains Mono",monospace', fontSize:'0.58rem', color:'rgba(255,100,0,0.3)', marginTop:'0.8rem', letterSpacing:'0.1em' }}>
                    // contest has not started yet
                  </p>
                )}
              </div>
            </section>

            {/* ── RULEBOOK ── */}
            <section style={{ padding:'2rem 2rem 6rem', display:'flex', flexDirection:'column', alignItems:'center', animation: pass===0 ? 'sectionFadeIn 0.9s 0.8s ease both' : 'none', opacity: pass===0?0:1, animationFillMode:'both' }}>
              {/* Divider */}
              <div style={{ width:'100%', maxWidth:'680px', marginBottom:'2rem', display:'flex', alignItems:'center', gap:'1rem' }}>
                <div style={{ flex:1, height:'1px', background:'linear-gradient(90deg,transparent,rgba(200,80,0,0.4))' }} />
                <span style={{ fontFamily:'"JetBrains Mono",monospace', fontSize:'0.58rem', color:'rgba(255,100,0,0.35)', letterSpacing:'0.15em', whiteSpace:'nowrap' }}>// GAME RULES</span>
                <div style={{ flex:1, height:'1px', background:'linear-gradient(90deg,rgba(200,80,0,0.4),transparent)' }} />
              </div>
              <Rulebook />

              {/* Status bar */}
              <div style={{ marginTop:'4rem', display:'flex', alignItems:'center', gap:'0.5rem' }}>
                <span style={{ width:'5px', height:'5px', borderRadius:'50%', background: contestLive?'#FF4500':'rgba(255,69,0,0.3)', boxShadow: contestLive?'0 0 6px rgba(255,69,0,0.9)':'none', display:'inline-block', animation: contestLive?'blink 1.4s step-start infinite':'none' }} />
                <span style={{ fontFamily:'"JetBrains Mono",monospace', fontSize:'0.58rem', color:'rgba(255,100,0,0.3)', letterSpacing:'0.08em' }}>
                  {contestLive ? '// CONTEST LIVE — LOOP ACTIVE' : '// RECURSION HELL v1.0 — STANDING BY'}
                </span>
              </div>
            </section>
          </div>
        ))}
      </div>
    </div>
  )
}