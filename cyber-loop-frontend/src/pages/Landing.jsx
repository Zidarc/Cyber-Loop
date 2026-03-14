import { useState, useEffect, useRef } from 'react'
import SplashCursor from '../components/SplashCursor'
import Lightning from '../components/Lightning'

/* ══════════════════════════════════════════════════════
    GLOBAL THEME VARIABLES
══════════════════════════════════════════════════════ */
const COLORS = {
  bg: '#050405',
  primaryRed: '#e31212',      
  glowRed: 'rgba(227, 18, 18, 0.4)',
  textAsh: 'rgba(255, 255, 255, 0.6)',
  glassBg: 'rgba(15, 10, 12, 0.7)',
  rulebookPdf: '/rulebook.pdf'
}

/* ══════════════════════════════════════════════════════
    EMBER CANVAS (Original Logic - Untouched)
══════════════════════════════════════════════════════ */
const EP = [[255, 90, 0], [235, 55, 0], [210, 35, 0], [255, 130, 20], [185, 30, 0], [140, 10, 0]]
function EmberCanvas() {
  const ref = useRef(null)
  useEffect(() => {
    const c = ref.current; if (!c) return
    const x = c.getContext('2d')
    const rsz = () => { c.width = window.innerWidth; c.height = window.innerHeight }
    rsz(); window.addEventListener('resize', rsz)
    const se = () => {
      const rgb = EP[Math.floor(Math.random() * EP.length)]
      return {
        x: Math.random() * c.width, y: c.height + 10, vx: (Math.random() - .5) * .28, vy: -(.16 + Math.random() * .28),
        size: .6 + Math.random() * 1.8, travel: c.height * (.32 + Math.random() * .18), dist: 0, rgb,
        wobble: Math.random() * Math.PI * 2, wSpd: .006 + Math.random() * .010
      }
    }
    const em = Array.from({ length: 30 }, () => { const e = se(); e.y = Math.random() * c.height; return e })
    let raf, paused = false
    const handleVis = () => { paused = document.hidden }
    document.addEventListener('visibilitychange', handleVis)
    function draw() {
      raf = requestAnimationFrame(draw); if (paused) return
      const W = c.width, H = c.height; x.clearRect(0, 0, W, H)
      for (const e of em) {
        if (e.dist >= e.travel) { Object.assign(e, se()); continue }
        e.wobble += e.wSpd; e.x += e.vx + Math.sin(e.wobble) * .07; e.y += e.vy; e.dist -= e.vy
        const p = e.dist / e.travel, al = p < .12 ? p / .12 : p > .55 ? Math.pow(1 - (p - .55) / .45, 1.8) : 1
        if (al < .02) continue
        const [r, g] = e.rgb, sz = e.size * (1 - p * .25)
        x.save(); x.globalAlpha = al * .5; x.translate(e.x, e.y); x.rotate(e.wobble * .4)
        x.beginPath()
        x.moveTo(0, -sz * 1.1); x.lineTo(sz * .7, -sz * .5); x.lineTo(sz * .9, sz * .2)
        x.lineTo(sz * .4, sz * .9); x.lineTo(-sz * .3, sz * .9); x.lineTo(-sz * .9, sz * .2); x.lineTo(-sz * .7, -sz * .5); x.closePath()
        x.fillStyle = `rgba(${r * .25 | 0},0,0,1)`; x.fill(); x.save(); x.clip()
        const ig = x.createRadialGradient(0, -sz * .1, 0, 0, -sz * .1, sz * .8)
        ig.addColorStop(0, 'rgba(255,200,120,1)'); ig.addColorStop(.3, `rgba(${r},${Math.max(g, 8)},0,1)`)
        ig.addColorStop(.75, `rgba(${r * .45 | 0},0,0,1)`); ig.addColorStop(1, 'rgba(0,0,0,0)')
        x.fillStyle = ig; x.fill(); x.restore(); x.restore()
      }
    }
    raf = requestAnimationFrame(draw)
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', rsz); document.removeEventListener('visibilitychange', handleVis) }
  }, [])
  return <canvas ref={ref} style={{ position: 'fixed', inset: 0, zIndex: 4, pointerEvents: 'none' }} />
}

/* ══════════════════════════════════════════════════════
    LIGHTNING LAYER (Original Logic - Untouched)
══════════════════════════════════════════════════════ */
function LightningLayer() {
  const [bolts, setBolts] = useState([])
  useEffect(() => {
    const CONFIGS = [
      { id: 'L', hue: 18, xOffset: -.80, speed: 1.1, intensity: 3.2, size: 1.3, opacity: .60 },
      { id: 'C', hue: 8, xOffset: 0, speed: .90, intensity: 4.0, size: 1.6, opacity: .70 },
      { id: 'R', hue: 355, xOffset: .80, speed: .85, intensity: 3.0, size: 1.2, opacity: .55 },
    ]
    let ts = []
    const fire = () => {
      const count = Math.random() < .4 ? 2 : 1
      const picked = [...CONFIGS].sort(() => Math.random() - .5).slice(0, count)
      setBolts(picked)
      ts.push(setTimeout(() => {
        setBolts([])
        ts.push(setTimeout(fire, 8000 + Math.random() * 6000))
      }, 500 + Math.random() * 300))
    }
    ts.push(setTimeout(fire, 3000))
    return () => ts.forEach(clearTimeout)
  }, [])
  if (!bolts.length) return null
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 3, pointerEvents: 'none', mixBlendMode: 'screen' }}>
      {bolts.map(b => (
        <div key={b.id} style={{ position: 'absolute', inset: 0, opacity: b.opacity }}>
          <Lightning hue={b.hue} xOffset={b.xOffset} speed={b.speed} intensity={b.intensity} size={b.size} />
        </div>
      ))}
    </div>
  )
}

/* ══════════════════════════════════════════════════════
    FIXED MAGNETIC BUTTON (CENTERED & STABLE)
══════════════════════════════════════════════════════ */
function MagneticEnterBtn({ onClick }) {
  const wrapRef = useRef(null); const btnRef = useRef(null)
  const pos = useRef({ x: 0, y: 0 }); const raf = useRef(null)

  function onMove(e) {
    const r = wrapRef.current?.getBoundingClientRect(); if (!r) return
    const dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2)
    const dist = Math.sqrt(dx * dx + dy * dy), radius = 140
    pos.current = dist < radius ? { x: dx / dist * (1 - dist / radius) * 28, y: dy / dist * (1 - dist / radius) * 28 } : { x: 0, y: 0 }
    if (!raf.current) raf.current = requestAnimationFrame(() => {
      raf.current = null; if (wrapRef.current) wrapRef.current.style.transform = `translate(${pos.current.x}px,${pos.current.y}px)`
    })
  }

  function onEnter() { if (btnRef.current) btnRef.current.style.transform = 'rotateX(180deg)' }
  function onLeave() { if (btnRef.current) btnRef.current.style.transform = 'rotateX(0deg)'; pos.current = { x: 0, y: 0 }; if (wrapRef.current) wrapRef.current.style.transform = 'translate(0,0)' }
  
  useEffect(() => { window.addEventListener('mousemove', onMove); return () => window.removeEventListener('mousemove', onMove) }, [])

  return (
    <div style={{ display: 'flex', justifyContent: 'center', width: '100%', perspective: '1000px', zIndex: 20 }}>
      <div ref={wrapRef} style={{ transition: 'transform .35s cubic-bezier(.23,1,.32,1)', animation: 'cinematicText 1.2s cubic-bezier(0.23, 1, 0.32, 1) 3s both' }}>
        <div ref={btnRef} style={{ transition: 'transform .55s cubic-bezier(.23,1,.32,1)', transformStyle: 'preserve-3d', position: 'relative' }}>
          <button
            onClick={onClick} onMouseEnter={onEnter} onMouseLeave={onLeave}
            style={{
              position: 'relative', width: '340px', height: '65px', borderRadius: 50, background: COLORS.glassBg,
              border: `1px solid ${COLORS.primaryRed}`, backdropFilter: 'blur(20px)',
              boxShadow: `0 8px 40px ${COLORS.glowRed}`,
              overflow: 'hidden', cursor: 'none', transition: 'all .25s', display: 'block',
            }}
          >
            <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: '"Cinzel",serif', fontWeight: 700, fontSize: '0.95rem', letterSpacing: '.28em', textTransform: 'uppercase', color: '#F5E8DC', textShadow: `0 0 12px ${COLORS.primaryRed}`, whiteSpace: 'nowrap', backfaceVisibility: 'hidden' }}>
              Enter the Upside Down
            </span>
            <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', transform: 'rotateX(180deg)', fontFamily: '"Cinzel",serif', fontWeight: 700, fontSize: '0.95rem', letterSpacing: '.28em', textTransform: 'uppercase', color: COLORS.primaryRed, whiteSpace: 'nowrap', backfaceVisibility: 'hidden' }}>
              NO WAY OUT
            </span>
          </button>
        </div>
      </div>
    </div>
  )
}
 
/* ══════════════════════════════════════════════════════
    UI HELPERS
══════════════════════════════════════════════════════ */
function CornerBtn({ label, onClick }) {
  const s = 7, t = 1
  return (
    <button onClick={onClick} style={{ position: 'relative', background: 'none', border: 'none', cursor: 'none', padding: '8px 16px', fontFamily: '"Share Tech Mono",monospace', fontSize: '.75rem', letterSpacing: '.14em', color: COLORS.textAsh, transition: 'all .2s' }}
      onMouseEnter={e => { e.currentTarget.style.color = '#fff'; e.currentTarget.querySelectorAll('.cb').forEach(el => el.style.opacity = '1') }}
      onMouseLeave={e => { e.currentTarget.style.color = COLORS.textAsh; e.currentTarget.querySelectorAll('.cb').forEach(el => el.style.opacity = '0') }}
    >
      {[
        { top: 0, left: 0, borderTop: `${t}px solid ${COLORS.primaryRed}`, borderLeft: `${t}px solid ${COLORS.primaryRed}` },
        { top: 0, right: 0, borderTop: `${t}px solid ${COLORS.primaryRed}`, borderRight: `${t}px solid ${COLORS.primaryRed}` },
        { bottom: 0, left: 0, borderBottom: `${t}px solid ${COLORS.primaryRed}`, borderLeft: `${t}px solid ${COLORS.primaryRed}` },
        { bottom: 0, right: 0, borderBottom: `${t}px solid ${COLORS.primaryRed}`, borderRight: `${t}px solid ${COLORS.primaryRed}` },
      ].map((st, i) => <span key={i} className="cb" style={{ position: 'absolute', width: s, height: s, opacity: 0, transition: 'opacity .2s', ...st }} />)}
      {label}
    </button>
  )
}

function FloatingRulebookBtn({ onClick }) {
  const [hovered, setHovered] = useState(false)
  return (
    <div style={{ position: 'fixed', bottom: 32, right: 32, zIndex: 100, animation: 'floatY 3s ease-in-out infinite' }}>
      <button onClick={onClick} onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
        style={{ display: 'flex', alignItems: 'center', gap: hovered ? 12 : 0, padding: '12px 16px', borderRadius: 50, background: COLORS.glassBg, border: `1px solid rgba(255,255,255,0.1)`, backdropFilter: 'blur(10px)', color: '#fff', cursor: 'none', transition: 'all .4s cubic-bezier(.23,1,.32,1)' }}
      >
        <span style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>ⓘ</span>
        <span style={{ fontFamily: '"Share Tech Mono",monospace', fontSize: '.7rem', maxWidth: hovered ? 150 : 0, opacity: hovered ? 1 : 0, overflow: 'hidden', whiteSpace: 'nowrap', transition: 'all .3s' }}>RULEBOOK</span>
      </button>
    </div>
  )
}

/* ══════════════════════════════════════════════════════
    MAIN LANDING
══════════════════════════════════════════════════════ */
export default function Landing() {
  const [showRules, setShowRules] = useState(false)
  const videoA = useRef(null);
  const videoB = useRef(null);
  const [activeVideo, setActiveVideo] = useState('A');
  const teamName = sessionStorage.getItem('teamName') || 'WANDERER'

  // ADVANCED SYNC LOGIC: Fades between two video nodes for a truly seamless loop
  useEffect(() => {
    let raf;
    const checkSync = () => {
      const vA = videoA.current;
      const vB = videoB.current;
      if (!vA || !vB) return;

      // When primary video is near end (0.5s), start fading it out
      if (activeVideo === 'A' && vA.duration - vA.currentTime < 0.5) {
        vB.currentTime = 0; // Reset B to start
        vB.play();
        setActiveVideo('B');
      } 
      else if (activeVideo === 'B' && vB.duration - vB.currentTime < 0.5) {
        vA.currentTime = 0; // Reset A to start
        vA.play();
        setActiveVideo('A');
      }
      raf = requestAnimationFrame(checkSync);
    };
    raf = requestAnimationFrame(checkSync);
    return () => cancelAnimationFrame(raf);
  }, [activeVideo]);

  return (
    <div style={{ minHeight: '100vh', background: COLORS.bg, position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@700;900&family=Share+Tech+Mono&display=swap');
        html,body,*{cursor:none!important; user-select:none;}
        @keyframes cinematicVideo { from { opacity: 0; transform: scale(1.1); } to { opacity: 0.6; transform: scale(1); } }
        @keyframes cinematicText { from { opacity: 0; transform: translateY(30px) scale(0.95); filter: blur(10px); } to { opacity: 1; transform: translateY(0) scale(1); filter: blur(0); } }
        @keyframes floatY { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-10px)} }
        .st-title {
          color: transparent;
          -webkit-text-stroke: 1.5px ${COLORS.primaryRed};
          filter: drop-shadow(0 0 10px ${COLORS.glowRed});
        }
      `}</style>

      /* ══ SEAMLESS SYNC VIDEO BACKGROUND (FIXED FOR NO FADE) ══ */
<div style={{ position: 'fixed', inset: 0, zIndex: 0, background: '#000' }}>
  <video 
    ref={videoA} 
    autoPlay 
    muted 
    playsInline 
    style={{ 
      position: 'absolute', 
      inset: 0, 
      width: '100%', 
      height: '100%', 
      objectFit: 'cover', 
      opacity: 0.6,
      // Change: Removed transition and used zIndex for instant swap
      zIndex: activeVideo === 'A' ? 2 : 1 
    }}
  >
    <source src="/Mindflayer.mp4" type="video/mp4" />
  </video>
  <video 
    ref={videoB} 
    muted 
    playsInline 
    style={{ 
      position: 'absolute', 
      inset: 0, 
      width: '100%', 
      height: '100%', 
      objectFit: 'cover', 
      opacity: 0.6,
      // Change: Removed transition and used zIndex for instant swap
      zIndex: activeVideo === 'B' ? 2 : 1
    }}
  >
    <source src="/Mindflayer.mp4" type="video/mp4" />
  </video>
</div>
      
      <EmberCanvas />
      <LightningLayer />
      <SplashCursor />

      {/* ══ NAV BAR ══ */}
      <nav style={{ position: 'fixed', top: 0, width: '100%', display: 'flex', justifyContent: 'space-between', padding: '30px 50px', zIndex: 100 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 8, height: 8, background: COLORS.primaryRed, borderRadius: '50%', boxShadow: `0 0 10px ${COLORS.primaryRed}` }} />
          <span style={{ fontFamily: '"Cinzel"', fontSize: '.8rem', color: COLORS.primaryRed, letterSpacing: '.2em' }}>RECURSION HELL</span>
        </div>
        <div style={{ display: 'flex', gap: 20 }}>
          <CornerBtn label="SCOREBOARD" onClick={() => window.location.assign('/scoreboard')} />
          <CornerBtn label="LOGOUT" onClick={() => { sessionStorage.clear(); window.location.assign('/') }} />
        </div>
      </nav>

      {/* ══ HERO SECTION ══ */}
      <div style={{ position: 'relative', zIndex: 10, textAlign: 'center' }}>
        <p style={{ fontFamily: '"Share Tech Mono"', color: COLORS.textAsh, animation: 'cinematicText 1.2s ease-out 0.8s both', marginBottom: 20, fontSize: '0.9rem', letterSpacing: '0.5em' }}>YOU HAVE BEEN SUMMONED</p>
        
        <h1 className="st-title" style={{ fontFamily: '"Cinzel"', fontWeight: 900, fontSize: 'clamp(3rem, 10vw, 7.5rem)', marginBottom: 20, lineHeight: 1, animation: 'cinematicText 1.5s ease-out 1.5s both' }}>
          {teamName}
        </h1>

        <div style={{ marginBottom: 50, animation: 'cinematicText 1.2s ease-out 2.2s both' }}>
          <p style={{ fontFamily: '"Cinzel"', color: COLORS.textAsh, fontSize: '0.8rem', letterSpacing: '.4em', marginBottom: 8 }}>TO THE UPSIDE DOWN</p>
          <p style={{ fontFamily: '"Cinzel"', color: COLORS.primaryRed, fontSize: '1.8rem', fontWeight: 900, letterSpacing: '.3em', textShadow: `0 0 20px ${COLORS.glowRed}` }}>RECURSION HELL</p>
        </div>

        <MagneticEnterBtn onClick={() => window.location.assign('/game')} />
      </div>

      <FloatingRulebookBtn onClick={() => setShowRules(true)} />
    </div>
  )
}