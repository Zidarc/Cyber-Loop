import { useState, useEffect, useRef } from 'react'
import SplashCursor from '../components/SplashCursor'

const COLORS = {
  bg: '#050405',
  primaryRed: '#e31212',
  glowRed: 'rgba(227, 18, 18, 0.4)',
  textAsh: 'rgba(255, 255, 255, 0.6)',
  glassBg: 'rgba(15, 10, 12, 0.7)',
}

/* ══════════════════════════════════════════════════════
    EMBER CANVAS
══════════════════════════════════════════════════════ */
const EP = [[255,90,0],[235,55,0],[210,35,0],[255,130,20],[185,30,0],[140,10,0]]
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
    MAGNETIC ENTER BTN
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
  function onLeave() {
    if (btnRef.current) btnRef.current.style.transform = 'rotateX(0deg)'
    pos.current = { x: 0, y: 0 }
    if (wrapRef.current) wrapRef.current.style.transform = 'translate(0,0)'
  }

  useEffect(() => {
    window.addEventListener('mousemove', onMove)
    return () => window.removeEventListener('mousemove', onMove)
  }, [])

  return (
    <div style={{ display: 'flex', justifyContent: 'center', width: '100%', perspective: '1000px', zIndex: 20 }}>
      <div ref={wrapRef} style={{ transition: 'transform .35s cubic-bezier(.23,1,.32,1)', animation: 'cinematicText 1.2s cubic-bezier(0.23, 1, 0.32, 1) 3s both' }}>
        <div ref={btnRef} style={{ transition: 'transform .55s cubic-bezier(.23,1,.32,1)', transformStyle: 'preserve-3d', position: 'relative' }}>
          <button
            onClick={onClick} onMouseEnter={onEnter} onMouseLeave={onLeave}
            style={{
              position: 'relative', width: '340px', height: '65px', borderRadius: 50,
              background: COLORS.glassBg, border: `1px solid ${COLORS.primaryRed}`,
              backdropFilter: 'blur(20px)', boxShadow: `0 8px 40px ${COLORS.glowRed}`,
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
    CORNER BTN
══════════════════════════════════════════════════════ */
function CornerBtn({ label, onClick }) {
  const s = 7, t = 1
  return (
    <button
      onClick={onClick}
      style={{ position: 'relative', background: 'none', border: 'none', cursor: 'none', padding: '8px 16px', fontFamily: '"Share Tech Mono",monospace', fontSize: '.75rem', letterSpacing: '.14em', color: COLORS.textAsh, transition: 'all .2s' }}
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

/* ══════════════════════════════════════════════════════
    FLOATING RULEBOOK BTN
══════════════════════════════════════════════════════ */
function FloatingRulebookBtn() {
  const [hovered, setHovered] = useState(false)
  return (
    <div style={{ position: 'fixed', bottom: 32, right: 32, zIndex: 100, animation: 'floatY 3s ease-in-out infinite' }}>
      <a
        href="https://pdflink.to/recursionhell/"
        target="_blank"
        rel="noopener noreferrer"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{ display: 'flex', alignItems: 'center', gap: hovered ? 12 : 0, padding: '12px 16px', borderRadius: 50, background: COLORS.glassBg, border: `1px solid rgba(255,255,255,0.1)`, backdropFilter: 'blur(10px)', color: '#fff', cursor: 'none', transition: 'all .4s cubic-bezier(.23,1,.32,1)', textDecoration: 'none' }}
      >
        <span style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>ⓘ</span>
        <span style={{ fontFamily: '"Share Tech Mono",monospace', fontSize: '.7rem', maxWidth: hovered ? 150 : 0, opacity: hovered ? 1 : 0, overflow: 'hidden', whiteSpace: 'nowrap', transition: 'all .3s' }}>RULEBOOK</span>
      </a>
    </div>
  )
}

/* ══════════════════════════════════════════════════════
    LORE DATA
══════════════════════════════════════════════════════ */
const LORE_SECTIONS = [
  {
    tag: '// TRANSMISSION 001',
    title: 'THE GATE HAS OPENED',
    body: 'The boundary between worlds has collapsed. What was once theory is now reality. You have been chosen, not by chance, but by something far older.',
  },
  {
    tag: '// WARNING: CLASSIFIED',
    title: 'RECURSION PROTOCOL',
    body: 'Each node you solve pulls you deeper. Each mistake echoes. The loop does not forgive, and the path back is never the same path forward.',
  },
  {
    tag: '// TRANSMISSION 002',
    title: 'THE MIND FLAYER WATCHES',
    body: 'You are not alone in the dark. Every wrong answer feeds it. Every hesitation strengthens its hold. Solve fast. Think faster.',
  },
  {
    tag: '// SYSTEM ALERT',
    title: 'PENALTY NODES ACTIVE',
    body: 'Wrong answers awaken dormant nodes. Ignore them at your peril — they drain your score with every passing second left unsolved.',
  },
  {
    tag: '// TRANSMISSION 003',
    title: 'THE FINAL NODE AWAITS',
    body: 'Only when all paths are closed and all challenges met will the exit reveal itself. Until then, you are trapped in the upside down.',
  },
]

/* ══════════════════════════════════════════════════════
    SCROLL SECTIONS
══════════════════════════════════════════════════════ */
function ScrollSections() {
  return (
    <div style={{ position: 'relative', zIndex: 10, width: '100%', maxWidth: 700, margin: '0 auto', padding: '0 32px' }}>
      {LORE_SECTIONS.map((s, i) => (
        <div
          key={i}
          style={{
            padding: '600px 32px',
            borderTop: i === 0 ? 'none' : `1px solid rgba(227,18,18,0.1)`,
            textAlign: 'center',
          }}
        >
          <p style={{ fontFamily: '"Share Tech Mono",monospace', fontSize: '.7rem', color: COLORS.primaryRed, letterSpacing: '.3em', marginBottom: 20, opacity: 0.7 }}>
            {s.tag}
          </p>
          <h2 style={{ fontFamily: '"Cinzel",serif', fontWeight: 900, fontSize: 'clamp(1.4rem, 4vw, 2.2rem)', color: '#fff', letterSpacing: '.15em', marginBottom: 28, textShadow: `0 0 30px ${COLORS.glowRed}` }}>
            {s.title}
          </h2>
          <p style={{ fontFamily: '"Share Tech Mono",monospace', fontSize: '.85rem', color: COLORS.textAsh, lineHeight: 2.2, letterSpacing: '.05em', maxWidth: 560, margin: '0 auto' }}>
            {s.body}
          </p>
        </div>
      ))}
    </div>
  )
}

/* ══════════════════════════════════════════════════════
    MAIN LANDING
══════════════════════════════════════════════════════ */
export default function Landing() {
  const videoA = useRef(null)
  const videoB = useRef(null)
  const [activeVideo, setActiveVideo] = useState('A')

  // Seamless video loop
  useEffect(() => {
    let raf
    const checkSync = () => {
      const vA = videoA.current, vB = videoB.current
      if (!vA || !vB) return
      if (activeVideo === 'A' && vA.duration - vA.currentTime < 0.5) {
        vB.currentTime = 0; vB.play(); setActiveVideo('B')
      } else if (activeVideo === 'B' && vB.duration - vB.currentTime < 0.5) {
        vA.currentTime = 0; vA.play(); setActiveVideo('A')
      }
      raf = requestAnimationFrame(checkSync)
    }
    raf = requestAnimationFrame(checkSync)
    return () => cancelAnimationFrame(raf)
  }, [activeVideo])

  useEffect(() => {
    let snapping = false
    const handleScroll = () => {
      if (snapping) return
      const scrolled = window.scrollY
      const total = document.documentElement.scrollHeight - window.innerHeight
      if (scrolled >= total - 100) {
        snapping = true
        window.scrollTo({ top: 0, behavior: 'instant' })
        setTimeout(() => { snapping = false }, 1000)
      }
    }
    const handleWheel = (e) => {
      if (snapping) return
      if (window.scrollY < 50 && e.deltaY < 0) {
        snapping = true
        const total = document.documentElement.scrollHeight - window.innerHeight
        window.scrollTo({ top: total, behavior: 'instant' })
        setTimeout(() => { snapping = false }, 1000)
      }
    }
    window.addEventListener('scroll', handleScroll)
    window.addEventListener('wheel', handleWheel)
    return () => {
      window.removeEventListener('scroll', handleScroll)
      window.removeEventListener('wheel', handleWheel)
    }
  }, [])

  return (
    <div style={{ background: COLORS.bg, position: 'relative' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@700;900&family=Share+Tech+Mono&display=swap');
        html, body, * { cursor: none !important; user-select: none; }
        html { scroll-behavior: smooth; }
        body { overflow-x: hidden; }
        * { scrollbar-width: none; -ms-overflow-style: none; }
        *::-webkit-scrollbar { display: none; }
        @keyframes cinematicText {
          from { opacity: 0; transform: translateY(30px) scale(0.95); filter: blur(10px); }
          to   { opacity: 1; transform: translateY(0) scale(1); filter: blur(0); }
        }
        @keyframes floatY {
          0%, 100% { transform: translateY(0); }
          50%      { transform: translateY(-10px); }
        }
        @keyframes blink { 0%,49%{opacity:1} 50%,100%{opacity:0} }
        .st-title {
          color: transparent;
          -webkit-text-stroke: 1.5px ${COLORS.primaryRed};
          filter: drop-shadow(0 0 10px ${COLORS.glowRed});
        }
      `}</style>

      {/* ══ VIDEO BACKGROUND ══ */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 0, background: '#000' }}>
        <video ref={videoA} autoPlay muted playsInline
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.75, zIndex: activeVideo === 'A' ? 2 : 1 }}>
          <source src="/Mindflayer.mp4" type="video/mp4" />
        </video>
        <video ref={videoB} muted playsInline
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.75, zIndex: activeVideo === 'B' ? 2 : 1 }}>
          <source src="/Mindflayer.mp4" type="video/mp4" />
        </video>
      </div>

      <EmberCanvas />
      <SplashCursor />

      {/* ══ FIXED NAVBAR ══ */}
      <nav style={{ position: 'fixed', top: 0, width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '30px 50px', zIndex: 100, boxSizing: 'border-box' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 8, height: 8, background: COLORS.primaryRed, borderRadius: '50%', boxShadow: `0 0 10px ${COLORS.primaryRed}`, animation: 'blink 2s step-start infinite' }} />
          <span style={{ fontFamily: '"Cinzel"', fontSize: '.8rem', color: COLORS.primaryRed, letterSpacing: '.2em' }}>RECURSION HELL</span>
        </div>
        <div style={{ display: 'flex', gap: 20 }}>
          <CornerBtn label="SCOREBOARD" onClick={() => window.location.assign('/scoreboard')} />
        </div>
      </nav>

      {/* ══ HERO ══ */}
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'relative', zIndex: 10, textAlign: 'center' }}>
        <p style={{ fontFamily: '"Share Tech Mono"', color: COLORS.textAsh, animation: 'cinematicText 1.2s ease-out 0.8s both', marginBottom: 20, fontSize: '0.9rem', letterSpacing: '0.5em' }}>
          YOU HAVE BEEN SUMMONED
        </p>

        <h1 className="st-title" style={{ fontFamily: '"Cinzel"', fontWeight: 900, fontSize: 'clamp(3rem, 10vw, 7.5rem)', marginBottom: 20, lineHeight: 1, animation: 'cinematicText 1.5s ease-out 1.5s both' }}>
          WANDERER
        </h1>

        <div style={{ marginBottom: 50, animation: 'cinematicText 1.2s ease-out 2.2s both' }}>
          <p style={{ fontFamily: '"Cinzel"', color: COLORS.textAsh, fontSize: '0.8rem', letterSpacing: '.4em', marginBottom: 8 }}>TO THE UPSIDE DOWN</p>
          <p style={{ fontFamily: '"Cinzel"', color: COLORS.primaryRed, fontSize: '1.8rem', fontWeight: 900, letterSpacing: '.3em', textShadow: `0 0 20px ${COLORS.glowRed}` }}>RECURSION HELL</p>
        </div>

        <MagneticEnterBtn onClick={() => window.location.assign('/login')} />

        {/* scroll hint */}
        <div style={{ position: 'absolute', bottom: 40, animation: 'floatY 2s ease-in-out infinite', opacity: 0.4 }}>
          <p style={{ fontFamily: '"Share Tech Mono"', fontSize: '.65rem', color: COLORS.textAsh, letterSpacing: '.3em' }}>SCROLL</p>
          <p style={{ textAlign: 'center', color: COLORS.textAsh, fontSize: '.8rem' }}>↓</p>
        </div>
      </div>

      {/* ══ SCROLL SECTIONS ══ */}
      <ScrollSections />

      <div style={{ height: '40vh', position: 'relative', zIndex: 10 }} />
      {/* bottom fade — softens the snap-back point */}

      <FloatingRulebookBtn />
    </div>
  )
}