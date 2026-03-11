import { useState, useEffect, useRef, useCallback } from 'react'
import Lightning from '../components/Lightning'
import SplashCursor from '../components/SplashCursor'

/* ══════════════════════════════════════════════════════
   THEME
══════════════════════════════════════════════════════ */
const C = {
  /* backgrounds */
  bg:          '#050405',
  rowAlt:      'rgba(255,255,255,0.012)',
  rowHov:      'rgba(255,255,255,0.04)',
  youBg:       'rgba(227,18,18,0.08)',

  /* reds */
  red:         '#e31212',
  glowRed:     'rgba(227,18,18,0.35)',
  redDiv:      'rgba(227,18,18,0.30)',
  redBorder:   'rgba(227,18,18,0.25)',

  /* rank colours */
  gold:        '#FFD700',
  goldGlow:    'rgba(255,215,0,0.25)',
  goldBg:      'rgba(255,215,0,0.06)',
  silver:      '#C8C8D4',
  silverGlow:  'rgba(192,192,192,0.18)',
  silverBg:    'rgba(192,192,192,0.04)',
  bronze:      '#CD9060',
  bronzeGlow:  'rgba(205,127,50,0.20)',
  bronzeBg:    'rgba(205,127,50,0.05)',

  /* text */
  textPrimary: 'rgba(255,255,255,0.82)',
  textMuted:   'rgba(255,255,255,0.38)',
  textDim:     'rgba(255,255,255,0.18)',
  textHeader:  'rgba(255,255,255,0.32)',
  ash:         'rgba(255,255,255,0.55)',

  /* greens */
  green:       '#4ade80',
  greenMuted:  'rgba(74,222,128,0.55)',
  greenPen:    'rgba(100,220,100,0.80)',
  greenPenMut: 'rgba(100,220,100,0.50)',

  /* wrong */
  wrong:       '#f87171',
  wrongMuted:  'rgba(248,113,113,0.50)',

  /* borders */
  border:      'rgba(255,255,255,0.07)',

  /* fonts */
  fontTitle:   '"Cinzel", serif',
  fontMono:    '"Share Tech Mono", monospace',

  /* font sizes */
  fzXs:   '.72rem',
  fzSm:   '.85rem',
  fzBase: '1.00rem',
  fzMd:   '1.08rem',
  fzLg:   '1.18rem',
}

/* ══════════════════════════════════════════════════════
   DUMMY DATA  ← replace fetchScores() with real API
   Shape per team:
   {
     rank: number,
     team: string,
     score: number,
     time: string,          // "HH:MM:SS"
     problems: Array<       // always length 7
       null                 // unattempted
       | { solved: true,  solveTime: string }   // "MM:SS"
       | { solved: false, attempts: number }
     >,
     penalties: Array<      // length = penCount (max 5)
       null
       | { solved: true,  solveTime: string }
       | { solved: false, attempts: number }
     >,
     penCount: number,      // how many penalty Qs unlocked for this team
   }
══════════════════════════════════════════════════════ */
const DUMMY_DATA = [
  {
    rank: 1, team: 'NightOwls', score: 1420, time: '01:12:34',
    problems: [
      { solved: true,  solveTime: '08:22' },
      { solved: true,  solveTime: '22:10' },
      { solved: true,  solveTime: '45:03' },
      { solved: true,  solveTime: '65:11' },
      { solved: false, attempts:  2       },
      { solved: true,  solveTime: '33:44' },
      null,
    ],
    penalties: [
      { solved: true,  solveTime: '15:20' },
      { solved: false, attempts:  1       },
      null, null, null,
    ],
    penCount: 2,
  },
  {
    rank: 2, team: 'ByteForce', score: 1310, time: '01:28:10',
    problems: [
      { solved: true,  solveTime: '11:05' },
      { solved: true,  solveTime: '30:22' },
      { solved: false, attempts:  3       },
      { solved: true,  solveTime: '70:15' },
      { solved: true,  solveTime: '55:40' },
      null, null,
    ],
    penalties: [
      { solved: true, solveTime: '20:10' },
      null, null, null, null,
    ],
    penCount: 1,
  },
  {
    rank: 3, team: 'KJNWKJWEN', score: 1180, time: '01:45:00',
    problems: [
      { solved: true,  solveTime: '09:14' },
      { solved: false, attempts:  1       },
      { solved: true,  solveTime: '40:30' },
      null,
      { solved: true,  solveTime: '80:22' },
      { solved: true,  solveTime: '50:11' },
      null,
    ],
    penalties: [null, null, null, null, null],
    penCount: 0,
  },
  {
    rank: 4, team: 'SegFault', score: 980, time: '02:01:22',
    problems: [
      { solved: true,  solveTime: '14:10' },
      { solved: true,  solveTime: '38:05' },
      null,
      null,
      { solved: false, attempts: 2 },
      null, null,
    ],
    penalties: [
      { solved: true,  solveTime: '28:40' },
      { solved: false, attempts:  2       },
      null, null, null,
    ],
    penCount: 2,
  },
  {
    rank: 5, team: 'RecurseThis', score: 870, time: '02:15:44',
    problems: [
      { solved: false, attempts: 4 },
      { solved: true,  solveTime: '25:30' },
      null,
      { solved: true,  solveTime: '90:12' },
      null, null, null,
    ],
    penalties: [null, null, null, null, null],
    penCount: 0,
  },
  {
    rank: 6, team: 'NullPointer', score: 760, time: '02:30:05',
    problems: [
      { solved: true, solveTime: '19:22' },
      null, null,
      { solved: true, solveTime: '95:10' },
      null, null, null,
    ],
    penalties: [
      { solved: true, solveTime: '35:00' },
      null, null, null, null,
    ],
    penCount: 1,
  },
  {
    rank: 7, team: 'InfiniLoop', score: 640, time: '02:48:12',
    problems: [
      null,
      { solved: true, solveTime: '44:10' },
      null, null, null, null, null,
    ],
    penalties: [null, null, null, null, null],
    penCount: 0,
  },
  {
    rank: 8, team: 'StackTrace', score: 520, time: '02:55:00',
    problems: [
      { solved: true, solveTime: '31:05' },
      null, null, null, null, null, null,
    ],
    penalties: [null, null, null, null, null],
    penCount: 0,
  },
  {
    rank: 9, team: 'Dumbo', score: 410, time: '03:10:22',
    problems: [
      null,
      { solved: true, solveTime: '52:10' },
      null, null, null, null, null,
    ],
    penalties: [null, null, null, null, null],
    penCount: 0,
  },
]

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
      return { x: Math.random() * c.width, y: c.height + 10, vx: (Math.random() - .5) * .28, vy: -(.16 + Math.random() * .28), size: .6 + Math.random() * 1.8, travel: c.height * (.32 + Math.random() * .18), dist: 0, rgb, wobble: Math.random() * Math.PI * 2, wSpd: .006 + Math.random() * .010 }
    }
    const em = Array.from({ length: 40 }, () => { const e = se(); e.y = Math.random() * c.height; return e })
    let raf, paused = false
    document.addEventListener('visibilitychange', () => { paused = document.hidden })
    function draw() {
      raf = requestAnimationFrame(draw); if (paused) return
      const W = c.width; x.clearRect(0, 0, W, c.height)
      for (const e of em) {
        if (e.dist >= e.travel) { Object.assign(e, se()); continue }
        e.wobble += e.wSpd; e.x += e.vx + Math.sin(e.wobble) * .07; e.y += e.vy; e.dist -= e.vy
        const p = e.dist / e.travel, al = p < .12 ? p / .12 : p > .55 ? Math.pow(1 - (p - .55) / .45, 1.8) : 1
        if (al < .02) continue
        const [r, g] = e.rgb, sz = e.size * (1 - p * .25)
        x.save(); x.globalAlpha = al * .55; x.translate(e.x, e.y); x.rotate(e.wobble * .4)
        x.beginPath()
        x.moveTo(0, -sz*1.1); x.lineTo(sz*.7,-sz*.5); x.lineTo(sz*.9,sz*.2)
        x.lineTo(sz*.4,sz*.9); x.lineTo(-sz*.3,sz*.9); x.lineTo(-sz*.9,sz*.2); x.lineTo(-sz*.7,-sz*.5); x.closePath()
        x.fillStyle = `rgba(${r*.25|0},0,0,1)`; x.fill(); x.save(); x.clip()
        const ig = x.createRadialGradient(0,-sz*.1,0,0,-sz*.1,sz*.8)
        ig.addColorStop(0,'rgba(255,200,120,1)'); ig.addColorStop(.3,`rgba(${r},${Math.max(g,8)},0,1)`)
        ig.addColorStop(.75,`rgba(${r*.45|0},0,0,1)`); ig.addColorStop(1,'rgba(0,0,0,0)')
        x.fillStyle = ig; x.fill(); x.restore(); x.restore()
      }
    }
    raf = requestAnimationFrame(draw)
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', rsz) }
  }, [])
  return <canvas ref={ref} style={{ position:'fixed', inset:0, zIndex:1, pointerEvents:'none' }} />
}

/* ══════════════════════════════════════════════════════
   LIGHTNING
══════════════════════════════════════════════════════ */
function LightningLayer() {
  const [bolts, setBolts] = useState([])
  useEffect(() => {
    const CONFIGS = [
      { id:'L', hue:18,  xOffset:-.80, speed:1.1, intensity:3.2, size:1.3, opacity:.40 },
      { id:'C', hue:8,   xOffset:0,    speed:.90, intensity:4.0, size:1.6, opacity:.50 },
      { id:'R', hue:355, xOffset:.80,  speed:.85, intensity:3.0, size:1.2, opacity:.38 },
    ]
    let ts = []
    const fire = () => {
      setBolts([...CONFIGS].sort(() => Math.random()-.5).slice(0, Math.random()<.3?2:1))
      ts.push(setTimeout(() => { setBolts([]); ts.push(setTimeout(fire, 12000 + Math.random()*8000)) }, 500))
    }
    ts.push(setTimeout(fire, 6000))
    return () => ts.forEach(clearTimeout)
  }, [])
  if (!bolts.length) return null
  return (
    <div style={{ position:'fixed', inset:0, zIndex:2, pointerEvents:'none', mixBlendMode:'screen' }}>
      {bolts.map(b => <div key={b.id} style={{ position:'absolute', inset:0, opacity:b.opacity }}><Lightning hue={b.hue} xOffset={b.xOffset} speed={b.speed} intensity={b.intensity} size={b.size}/></div>)}
    </div>
  )
}

/* ══════════════════════════════════════════════════════
   RANK STYLES
══════════════════════════════════════════════════════ */
const RANK_CFG = {
  1: { color: C.gold,   border: C.gold,   bg: C.goldBg,   glow: C.goldGlow,   medal: '🥇' },
  2: { color: C.silver, border: C.silver, bg: C.silverBg, glow: C.silverGlow, medal: '🥈' },
  3: { color: C.bronze, border: C.bronze, bg: C.bronzeBg, glow: C.bronzeGlow, medal: '🥉' },
}

/* ══════════════════════════════════════════════════════
   PROBLEM CELL
══════════════════════════════════════════════════════ */
function PCell({ p, isPenalty }) {
  const base = {
    padding: '8px 4px', textAlign:'center',
    borderBottom: `1px solid ${C.border}`,
    verticalAlign: 'middle', minWidth: 52,
  }
  if (!p || p === null) return (
    <td style={base}>
      <span style={{ color:C.textDim, fontSize:C.fzSm }}>—</span>
    </td>
  )
  if (p.solved) return (
    <td style={base}>
      <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:2 }}>
        <span style={{ color: isPenalty ? C.greenPen : C.green, fontSize:C.fzBase, lineHeight:1 }}>✓</span>
        <span style={{ color: isPenalty ? C.greenPenMut : C.greenMuted, fontSize:C.fzXs, fontFamily:C.fontMono, letterSpacing:'.03em' }}>{p.solveTime}</span>
      </div>
    </td>
  )
  return (
    <td style={base}>
      <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:2 }}>
        <span style={{ color:C.wrong, fontSize:C.fzBase, lineHeight:1 }}>✗</span>
        <span style={{ color:C.wrongMuted, fontSize:C.fzXs, fontFamily:C.fontMono }}>×{p.attempts}</span>
      </div>
    </td>
  )
}

/* ══════════════════════════════════════════════════════
   SCORE ROW
══════════════════════════════════════════════════════ */
function ScoreRow({ row, isYou, index, rowRef }) {
  const [hov, setHov] = useState(false)
  const rs = RANK_CFG[row.rank]
  const textColor = rs ? rs.color : (isYou ? '#fff' : 'rgba(255,255,255,0.78)')

  const tdStyle = {
    padding: '10px 8px',
    borderBottom: `1px solid ${C.border}`,
    verticalAlign: 'middle',
  }

  return (
    <tr
      ref={rowRef}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background: isYou
          ? C.youBg
          : hov
            ? (rs ? rs.bg.replace(/[\d.]+\)$/, '0.12)') : C.rowHov)
            : (rs ? rs.bg : index % 2 === 0 ? C.rowAlt : 'transparent'),
        borderLeft: `3px solid ${isYou ? C.red : rs ? rs.border : 'transparent'}`,
        outline: isYou ? `1px solid rgba(227,18,18,0.35)` : 'none',
        boxShadow: isYou ? `inset 0 0 40px rgba(227,18,18,0.07), 0 0 0 1px rgba(227,18,18,0.20)` : 'none',
        transition: 'background .18s',
        animation: `rowIn .45s cubic-bezier(.23,1,.32,1) ${index * 0.07}s both`,
      }}
    >
      {/* RANK */}
      <td style={{ ...tdStyle, width:60, paddingLeft:18, textAlign:'center' }}>
        {rs
          ? <span style={{ fontFamily:C.fontTitle, fontWeight:900, fontSize:C.fzLg, color:rs.color, textShadow:`0 0 16px ${rs.glow}`, letterSpacing:'.04em' }}>{rs.medal}</span>
          : <span style={{ fontFamily:C.fontMono, fontSize:C.fzBase, color:C.textHeader }}>#{row.rank}</span>
        }
      </td>

      {/* TEAM NAME */}
      <td style={{ ...tdStyle, minWidth:160 }}>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <span style={{ fontFamily:C.fontTitle, fontWeight:700, fontSize:C.fzLg, color:textColor, textShadow: rs ? `0 0 12px ${rs.glow}` : 'none', letterSpacing:'.04em' }}>
            {row.team}
          </span>
          {isYou && (
            <span style={{ fontFamily:C.fontMono, fontSize:C.fzXs, letterSpacing:'.14em', color:C.red, border:`1px solid ${C.red}`, borderRadius:3, padding:'2px 6px', textShadow:`0 0 8px ${C.glowRed}`, boxShadow:`0 0 10px ${C.glowRed}`, animation:'pulse 2s ease-in-out infinite', background:'rgba(227,18,18,0.10)' }}>
              YOU
            </span>
          )}
        </div>
      </td>

      {/* SCORE */}
      <td style={{ ...tdStyle, width:80, textAlign:'center' }}>
        <span style={{ fontFamily:C.fontMono, fontSize:C.fzLg, fontWeight:700, color:textColor }}>
          {row.score}
        </span>
      </td>

      {/* TIME */}
      <td style={{ ...tdStyle, width:90, textAlign:'center' }}>
        <span style={{ fontFamily:C.fontMono, fontSize:C.fzSm, color:C.textMuted, letterSpacing:'.06em' }}>
          {row.time}
        </span>
      </td>

      {/* Q1–Q7 */}
      {Array.from({ length: 7 }, (_, i) => (
        <PCell key={`q${i}`} p={row.problems[i]} isPenalty={false} />
      ))}

      {/* divider between regular and penalty questions */}
      <td style={{ padding:0, borderBottom:`1px solid ${C.border}`, width:20 }}>
        <div style={{ width:1, height:40, background:C.redDiv, margin:'0 auto' }} />
      </td>

      {/* PQ1–PQ5 */}
      {Array.from({ length: 5 }, (_, i) => (
        <PCell key={`pq${i}`} p={row.penalties[i] ?? null} isPenalty={true} />
      ))}

      {/* PENALTY COUNT */}
      <td style={{ ...tdStyle, width:56, textAlign:'center' }}>
        {row.penCount > 0
          ? <span style={{ fontFamily:C.fontMono, fontSize:C.fzBase, color:C.wrong, fontWeight:700 }}>+{row.penCount}</span>
          : <span style={{ fontFamily:C.fontMono, fontSize:C.fzSm, color:C.textDim }}>—</span>
        }
      </td>
    </tr>
  )
}

/* ══════════════════════════════════════════════════════
   COLUMN HEADER
══════════════════════════════════════════════════════ */
function Th({ children, width, align='center' }) {
  return (
    <th style={{
      padding: '12px 8px', textAlign: align,
      fontFamily: C.fontMono,
      fontSize: C.fzXs, letterSpacing: '.12em',
      color: C.textHeader,
      borderBottom: `1px solid ${C.redBorder}`,
      fontWeight: 400, whiteSpace: 'nowrap',
      width: width ?? 'auto',
    }}>{children}</th>
  )
}

/* ══════════════════════════════════════════════════════
   MAIN SCOREBOARD
══════════════════════════════════════════════════════ */
export default function Scoreboard() {
  const teamName = sessionStorage.getItem('teamName') || ''

  // inject current team into dummy data so YOU row always shows
  // ← backend replaces this entirely via fetchScores()
  const getDummyWithTeam = (name) => {
    if (!name) return DUMMY_DATA
    const already = DUMMY_DATA.some(r => r.team.toLowerCase() === name.toLowerCase())
    if (already) return DUMMY_DATA
    return [...DUMMY_DATA, {
      rank: DUMMY_DATA.length + 1,
      team: name,
      score: 0,
      time: '--:--:--',
      problems: Array(7).fill(null),
      penalties: Array(5).fill(null),
      penCount: 0,
    }]
  }

  const [data, setData]         = useState(() => getDummyWithTeam(teamName))
  const [lastRefresh, setLast]  = useState(new Date())
  const [spinning, setSpinning] = useState(false)
  const [loading, setLoading]   = useState(false)

  const yourRowRef = useRef(null)

  // scroll to your row after data loads
  useEffect(() => {
    if (yourRowRef.current) {
      setTimeout(() => {
        yourRowRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }, 600)
    }
  }, [data])

  /* ── BACKEND HOOK ───────────────────────────────────
     Replace the body of this function with your real fetch.
     Expected response shape: array matching DUMMY_DATA structure above.
  ─────────────────────────────────────────────────── */
  const fetchScores = useCallback(async () => {
    setLoading(true)
    try {
      // const res  = await fetch('/api/scoreboard')
      // const json = await res.json()
      // setData(json)
      await new Promise(r => setTimeout(r, 300)) // simulate latency
      setData(DUMMY_DATA)
      setLast(new Date())
    } catch (err) {
      console.error('Scoreboard fetch failed:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  // initial load + 30s auto-poll
  useEffect(() => {
    fetchScores()
    const id = setInterval(fetchScores, 30000)
    return () => clearInterval(id)
  }, [fetchScores])

  const handleRefresh = () => {
    if (spinning) return
    setSpinning(true)
    fetchScores()
    setTimeout(() => setSpinning(false), 700)
  }

  return (
    <div style={{ minHeight:'100vh', background:C.bg, position:'relative', overflow:'hidden', userSelect:'none', WebkitUserSelect:'none' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@700;900&family=Share+Tech+Mono&display=swap');
        *, *::before, *::after { box-sizing:border-box; margin:0; padding:0; user-select:none; -webkit-user-select:none; }
        html, body, * { cursor: none !important; }

        @keyframes rowIn    { from { opacity:0; transform:translateX(-12px) } to { opacity:1; transform:translateX(0) } }
        @keyframes blink    { 0%,49%{opacity:1} 50%,100%{opacity:0} }
        @keyframes spin     { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        @keyframes fadeIn   { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        @keyframes pulse    { 0%,100%{opacity:.6} 50%{opacity:1} }

        ::-webkit-scrollbar { width:4px; height:4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(227,18,18,0.35); border-radius:2px; }

        .refresh-btn:hover { color: #fff !important; border-color: rgba(227,18,18,0.70) !important; background: rgba(227,18,18,0.12) !important; }
        .back-btn:hover    { color: #fff !important; }
      `}</style>

      {/* ── BG LAYERS ── */}
      <div style={{ position:'fixed', inset:0, zIndex:0, background:`radial-gradient(ellipse 90% 80% at 50% 100%, rgba(227,18,18,0.07) 0%, transparent 65%)` }} />
      <EmberCanvas />
      <LightningLayer />
      <SplashCursor />

      {/* ── NAVBAR ── */}
      <nav style={{ position:'fixed', top:0, left:0, right:0, zIndex:50, display:'flex', alignItems:'center', justifyContent:'space-between', padding:'18px 40px', borderBottom:`1px solid rgba(255,255,255,0.05)`, backdropFilter:'blur(10px)', background:'rgba(5,4,5,0.60)' }}>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <div style={{ width:7, height:7, background:C.red, borderRadius:'50%', boxShadow:`0 0 10px ${C.red}`, animation:'blink 2s step-start infinite' }} />
          <span style={{ fontFamily:C.fontTitle, fontSize:C.fzSm, fontWeight:700, color:C.red, letterSpacing:'.20em', textShadow:`0 0 10px ${C.glowRed}` }}>RECURSION HELL</span>
        </div>

        <span style={{ fontFamily:C.fontTitle, fontSize:C.fzBase, fontWeight:700, letterSpacing:'.28em', color:C.textPrimary }}>
          SCOREBOARD
        </span>

        <div style={{ display:'flex', alignItems:'center', gap:16 }}>
          {/* last updated */}
          <span style={{ fontFamily:C.fontMono, fontSize:C.fzXs, letterSpacing:'.10em', color:C.textDim, animation:'pulse 3s ease-in-out infinite' }}>
            {loading ? 'FETCHING...' : `UPDATED ${lastRefresh.toLocaleTimeString([], { hour:'2-digit', minute:'2-digit', second:'2-digit' })}`}
          </span>

          {/* refresh btn */}
          <button className="refresh-btn" onClick={handleRefresh} style={{ background:'rgba(255,255,255,0.04)', border:`1px solid rgba(255,255,255,0.12)`, borderRadius:8, color:'rgba(255,255,255,0.50)', fontFamily:C.fontMono, fontSize:C.fzXs, letterSpacing:'.10em', padding:'6px 14px', cursor:'none', display:'flex', alignItems:'center', gap:6, transition:'all .18s' }}>
            <span style={{ display:'inline-block', animation: spinning ? 'spin .7s linear' : 'none', fontSize:'.80rem' }}>↻</span>
            REFRESH
          </button>

          {/* back to game */}
          <button className="back-btn" onClick={() => window.location.assign('/landing')} style={{ background:'none', border:'none', cursor:'none', fontFamily:C.fontMono, fontSize:C.fzXs, letterSpacing:'.10em', color:C.textHeader, transition:'color .18s' }}>
            ← BACK
          </button>
        </div>
      </nav>

      {/* ── TABLE WRAPPER ── */}
      <div style={{ position:'relative', zIndex:10, paddingTop:80, paddingBottom:48, overflowX:'auto', animation:'fadeIn .5s ease-out' }}>
        <table style={{ width:'100%', minWidth:960, borderCollapse:'collapse', tableLayout:'fixed' }}>
          <thead>
            <tr>
              <Th width={60}>RNK</Th>
              <Th width={160} align="left">TEAM</Th>
              <Th width={80}>SCORE</Th>
              <Th width={90}>TIME</Th>
              {Array.from({ length:7 }, (_,i) => <Th key={i} width={52}>Q{i+1}</Th>)}
              <Th width={20}> </Th>
              {Array.from({ length:5 }, (_,i) => (
                <Th key={i} width={52} >
                  <span style={{ color:'rgba(227,18,18,0.55)' }}>P{i+1}</span>
                </Th>
              ))}
              <Th width={56}>PEN</Th>
            </tr>
          </thead>
          <tbody>
            {data.map((row, i) => (
              <ScoreRow
                key={row.team}
                row={row}
                isYou={row.team.toLowerCase() === teamName.toLowerCase()}
                index={i}
                rowRef={row.team.toLowerCase() === teamName.toLowerCase() ? yourRowRef : null}
              />
            ))}
          </tbody>
        </table>

        {/* empty state */}
        {data.length === 0 && (
          <div style={{ textAlign:'center', padding:'80px 0', fontFamily:C.fontMono, fontSize:C.fzSm, letterSpacing:'.18em', color:C.textDim }}>
            NO DATA YET — WAITING FOR TEAMS
          </div>
        )}
      </div>

      {/* bottom ember source — red glow at base */}
      <div style={{ position:'fixed', bottom:0, left:0, right:0, height:120, zIndex:0, pointerEvents:'none', background:'linear-gradient(0deg, rgba(180,20,0,0.18) 0%, transparent 100%)' }} />
    </div>
  )
}