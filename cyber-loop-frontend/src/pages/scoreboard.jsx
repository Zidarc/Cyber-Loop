import { useState, useEffect, useRef, useCallback } from 'react'
import Lightning from '../components/Lightning'
import SplashCursor from '../components/SplashCursor'
import { apiFetch } from '../lib/api'
import { supabase } from '../lib/supabase'

/* ══════════════════════════════════════════════════════
   THEME
══════════════════════════════════════════════════════ */
const C = {
  bg:          '#050405',
  rowAlt:      'rgba(255,255,255,0.012)',
  rowHov:      'rgba(255,255,255,0.04)',
  youBg:       'rgba(227,18,18,0.08)',
  red:         '#e31212',
  glowRed:     'rgba(227,18,18,0.35)',
  redDiv:      'rgba(227,18,18,0.30)',
  redBorder:   'rgba(227,18,18,0.25)',
  gold:        '#F5C842',
  goldGlow:    'rgba(245,200,66,0.28)',
  goldBg:      'rgba(245,200,66,0.07)',
  silver:      '#C8C8D4',
  silverGlow:  'rgba(192,192,192,0.18)',
  silverBg:    'rgba(192,192,192,0.04)',
  bronze:      '#CD9060',
  bronzeGlow:  'rgba(205,127,50,0.20)',
  bronzeBg:    'rgba(205,127,50,0.05)',
  textPrimary: 'rgba(255,255,255,0.82)',
  textMuted:   'rgba(255,255,255,0.38)',
  textDim:     'rgba(255,255,255,0.18)',
  textHeader:  'rgba(255,255,255,0.32)',
  ash:         'rgba(255,255,255,0.55)',
  green:       '#4ade80',
  greenMuted:  'rgba(74,222,128,0.55)',
  wrong:       '#f87171',
  wrongMuted:  'rgba(248,113,113,0.50)',
  border:      'rgba(255,255,255,0.07)',
  fontTitle:   '"Cinzel", serif',
  fontMono:    '"Share Tech Mono", monospace',
  fzXs:   '.72rem',
  fzSm:   '.85rem',
  fzBase: '1.00rem',
  fzMd:   '1.08rem',
  fzLg:   '1.18rem',
}

/* ══════════════════════════════════════════════════════
   MAP API RESPONSE → ROW SHAPE  (backend untouched)
══════════════════════════════════════════════════════ */
function mapLeaderboardRow(entry, index) {
  return {
    rank:           index + 1,
    team:           entry.team_name,
    score:          entry.score,
    totalMistakes:  entry.total_mistakes  ?? 0,
    penaltyCounter: entry.penalty_counter ?? 0,
    nodes:          entry.nodes           ?? [],
  }
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
        x.moveTo(0,-sz*1.1); x.lineTo(sz*.7,-sz*.5); x.lineTo(sz*.9,sz*.2)
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
   SCORE ROW
══════════════════════════════════════════════════════ */
function ScoreRow({ row, isYou, index, rowRef }) {
  const [hov, setHov] = useState(false)
  const rs = RANK_CFG[row.rank]
  const textColor = rs ? rs.color : (isYou ? '#fff' : 'rgba(255,255,255,0.78)')

  const tdStyle = {
    padding: '14px 12px',
    borderBottom: `1px solid ${C.border}`,
    borderRight: `1px solid ${C.border}`,
    verticalAlign: 'middle',
    textAlign: 'center',
  }

  const getNodeColor = (node) => {
    const isSolved = node.status === 'solved'
    const isPenalty = node.node_id >= 9
    const isFinal   = node.node_id === 8
    const isCheck   = node.node_id === 3 || node.node_id === 5
    // all in ember/red/gold palette — no teal, no green
    if (isPenalty) return isSolved ? '#FF6B35'              : 'rgba(255,107,53,0.28)'   // ember orange
    if (isFinal)   return isSolved ? '#F5C842'              : 'rgba(245,200,66,0.28)'   // gold
    if (isCheck)   return isSolved ? '#FF9944'              : 'rgba(255,153,68,0.28)'   // warm amber
    return           isSolved      ? '#FF4422'              : 'rgba(255,68,34,0.28)'    // bright red
  }

  const getNodeBg = (node) => {
    return 'transparent'  // no column bg tints — they cause color mixing issues
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
      <td style={{ ...tdStyle, width:60, paddingLeft:18 }}>
        {rs
          ? <span style={{ fontFamily:C.fontTitle, fontWeight:900, fontSize:C.fzLg, color:rs.color, textShadow:`0 0 16px ${rs.glow}` }}>{rs.medal}</span>
          : <span style={{ fontFamily:C.fontMono, fontSize:C.fzBase, color:C.textHeader }}>#{row.rank}</span>
        }
      </td>

      {/* TEAM NAME */}
      <td style={{ ...tdStyle, minWidth:180, textAlign:'left' }}>
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
      <td style={{ ...tdStyle, width:80 }}>
        <span style={{ fontFamily:C.fontMono, fontSize:C.fzLg, fontWeight:700, color:textColor }}>
          {row.score}
        </span>
      </td>

      {/* NODES 1-8 */}
      {row.nodes.filter(n => n.node_id >= 1 && n.node_id <= 8).map(node => (
        <td key={node.node_id} style={{ ...tdStyle, width:50, background: getNodeBg(node) }}>
          <span style={{ fontFamily:C.fontMono, fontSize:C.fzBase, fontWeight: node.status === 'solved' ? 700 : 400, color: getNodeColor(node) }}>
            {node.status === 'solved' ? '✓' : '--'}
          </span>
        </td>
      ))}

      {/* PENALTIES */}
      {row.nodes.filter(n => n.node_id >= 9).map(node => (
        <td key={node.node_id} style={{ ...tdStyle, width:50, background: getNodeBg(node) }}>
          <span style={{ fontFamily:C.fontMono, fontSize:C.fzBase, fontWeight: node.status === 'solved' ? 700 : 400, color: getNodeColor(node) }}>
            {node.status === 'solved' ? '✓' : '--'}
          </span>
        </td>
      ))}

      {/* MISTAKES */}
      <td style={{ ...tdStyle, width:70 }}>
        <span style={{ fontFamily:C.fontMono, fontSize:C.fzBase, color: row.totalMistakes > 0 ? C.wrong : C.textDim }}>
          {row.totalMistakes > 0 ? row.totalMistakes : '—'}
        </span>
      </td>

      {/* PENALTY COUNTER */}
      <td style={{ ...tdStyle, width:70, borderRight:'none' }}>
        {row.penaltyCounter > 0
          ? <span style={{ fontFamily:C.fontMono, fontSize:C.fzBase, color:C.wrong, fontWeight:700 }}>+{row.penaltyCounter}</span>
          : <span style={{ fontFamily:C.fontMono, fontSize:C.fzSm, color:C.textDim }}>—</span>
        }
      </td>
    </tr>
  )
}

/* ══════════════════════════════════════════════════════
   COLUMN HEADER
══════════════════════════════════════════════════════ */
function Th({ children, width, borderColor }) {
  return (
    <th style={{
      padding: '12px 12px',
      textAlign: 'center',
      fontFamily: C.fontMono,
      fontSize: C.fzXs,
      letterSpacing: '.12em',
      color: borderColor ? borderColor : C.textHeader,
      borderBottom: `2px solid ${borderColor ?? C.redBorder}`,
      borderRight: `1px solid ${C.redBorder}`,
      fontWeight: 400,
      whiteSpace: 'nowrap',
      width: width ?? 'auto',
      background: 'transparent',
    }}>{children}</th>
  )
}

/* ══════════════════════════════════════════════════════
   LIVE DOT
══════════════════════════════════════════════════════ */
function LiveDot({ connected }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:6 }}>
      <div style={{
        width:6, height:6, borderRadius:'50%',
        background: connected ? C.green : 'rgba(255,255,255,0.20)',
        boxShadow: connected ? `0 0 8px ${C.green}` : 'none',
        animation: connected ? 'pulse 2s ease-in-out infinite' : 'none',
        transition: 'background .4s, box-shadow .4s',
      }}/>
      <span style={{ fontFamily:C.fontMono, fontSize:C.fzXs, letterSpacing:'.10em', color: connected ? C.greenMuted : C.textDim, transition:'color .4s' }}>
        {connected ? 'LIVE' : 'CONNECTING...'}
      </span>
    </div>
  )
}

/* ══════════════════════════════════════════════════════
   CENTERED FULL PAGE STATE — loading / error / empty
══════════════════════════════════════════════════════ */
function FullPageState({ children }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 20,
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      gap: 24,
    }}>
      {children}
    </div>
  )
}

/* ══════════════════════════════════════════════════════
   LOADING SPINNER
══════════════════════════════════════════════════════ */
function LoadingScreen() {
  return (
    <FullPageState>
      {/* spinning ring */}
      <div style={{
        width: 56, height: 56, borderRadius: '50%',
        border: `2px solid rgba(227,18,18,0.15)`,
        borderTop: `2px solid ${C.red}`,
        animation: 'spin 1s linear infinite',
      }}/>
      <div style={{ textAlign: 'center' }}>
        <p style={{ fontFamily: C.fontTitle, fontSize: C.fzBase, fontWeight: 700, letterSpacing: '.28em', color: 'rgba(255,255,255,0.70)', marginBottom: 8 }}>
          LOADING SCOREBOARD
        </p>
        <p style={{ fontFamily: C.fontMono, fontSize: C.fzXs, letterSpacing: '.18em', color: C.textDim, animation: 'pulse 2s ease-in-out infinite' }}>
          CONNECTING TO DATABASE...
        </p>
      </div>
    </FullPageState>
  )
}

/* ══════════════════════════════════════════════════════
   MAIN SCOREBOARD
══════════════════════════════════════════════════════ */
export default function Scoreboard() {
  const [teamName, setTeamName] = useState('')
  useEffect(() => {
    if (typeof window !== 'undefined') setTeamName(sessionStorage.getItem('teamName') || '')
  }, [])

  const [data,        setData]        = useState([])
  const [loading,     setLoading]     = useState(true)
  const [error,       setError]       = useState('')
  const [rtConnected, setRtConnected] = useState(false)
  const yourRowRef = useRef(null)

  useEffect(() => {
    if (yourRowRef.current) {
      setTimeout(() => { yourRowRef.current.scrollIntoView({ behavior:'smooth', block:'center' }) }, 600)
    }
  }, [data])

  // ─── fetch from backend — UNTOUCHED ───
  const fetchScores = useCallback(async () => {
    setError('')
    try {
      const res = await apiFetch('/api/leaderboard')
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = await res.json()
      console.log('API Response:', json)
      const mapped = (json || []).map((entry, i) => mapLeaderboardRow(entry, i))
      setData(mapped)
    } catch (err) {
      console.error('Scoreboard fetch failed:', err)
      setError('Failed to load scoreboard.')
    } finally {
      setLoading(false)
    }
  }, [])

  // ─── initial load + poll — UNTOUCHED ───
  useEffect(() => {
    fetchScores()
    const id = setInterval(fetchScores, 30_000)
    return () => clearInterval(id)
  }, [fetchScores])

  // ─── Supabase realtime — UNTOUCHED ───
  useEffect(() => {
    const channel = supabase
      .channel('scoreboard-live')
      .on('postgres_changes', { event:'*', schema:'public', table:'participant_game_state' },   fetchScores)
      .on('postgres_changes', { event:'*', schema:'public', table:'participant_node_progress' }, fetchScores)
      .on('postgres_changes', { event:'*', schema:'public', table:'leaderboard' },              fetchScores)
      .subscribe((status) => { setRtConnected(status === 'SUBSCRIBED') })
    return () => { supabase.removeChannel(channel) }
  }, [fetchScores])

  return (
    <div style={{ minHeight:'100vh', background:C.bg, position:'relative', overflow:'hidden', userSelect:'none', WebkitUserSelect:'none' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@700;900&family=Share+Tech+Mono&display=swap');
        *, *::before, *::after { box-sizing:border-box; margin:0; padding:0; user-select:none; -webkit-user-select:none; }
        html, body, * { cursor: none !important; }
        @keyframes rowIn  { from{opacity:0;transform:translateX(-12px)} to{opacity:1;transform:translateX(0)} }
        @keyframes blink  { 0%,49%{opacity:1} 50%,100%{opacity:0} }
        @keyframes fadeIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        @keyframes pulse  { 0%,100%{opacity:.6} 50%{opacity:1} }
        @keyframes spin   { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        .back-btn:hover { color:#fff!important; }
        ::-webkit-scrollbar { width:4px; height:4px; }
        ::-webkit-scrollbar-track { background:transparent; }
        ::-webkit-scrollbar-thumb { background:rgba(227,18,18,0.35); border-radius:2px; }
      `}</style>

      {/* BG */}
      <div style={{ position:'fixed', inset:0, zIndex:0, background:`radial-gradient(ellipse 90% 80% at 50% 100%, rgba(227,18,18,0.07) 0%, transparent 65%)` }}/>
      <EmberCanvas/>
      <LightningLayer/>
      <SplashCursor/>

      {/* NAVBAR */}
      <nav style={{ position:'fixed', top:0, left:0, right:0, zIndex:50, display:'flex', alignItems:'center', justifyContent:'space-between', padding:'18px 40px', borderBottom:`1px solid rgba(255,255,255,0.05)`, backdropFilter:'blur(10px)', background:'rgba(5,4,5,0.60)' }}>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <div style={{ width:7, height:7, background:C.red, borderRadius:'50%', boxShadow:`0 0 10px ${C.red}`, animation:'blink 2s step-start infinite' }}/>
          <span style={{ fontFamily:C.fontTitle, fontSize:C.fzSm, fontWeight:700, color:C.red, letterSpacing:'.20em', textShadow:`0 0 10px ${C.glowRed}` }}>RECURSION HELL</span>
        </div>
        <span style={{ fontFamily:C.fontTitle, fontSize:C.fzBase, fontWeight:700, letterSpacing:'.28em', color:C.textPrimary }}>SCOREBOARD</span>
        <div style={{ display:'flex', alignItems:'center', gap:20 }}>
          <LiveDot connected={rtConnected}/>
          <button className="back-btn" onClick={() => window.location.assign('/gamepage')} style={{ background:'none', border:'none', cursor:'none', fontFamily:C.fontMono, fontSize:C.fzXs, letterSpacing:'.10em', color:C.textHeader, transition:'color .18s' }}>
            ← BACK
          </button>
        </div>
      </nav>

      {/* ── LOADING STATE — perfectly centred ── */}
      {loading && data.length === 0 && <LoadingScreen/>}

      {/* ── ERROR STATE — centred ── */}
      {error && data.length === 0 && (
        <FullPageState>
          <span style={{ fontSize:'2rem' }}>⚠</span>
          <div style={{ textAlign:'center' }}>
            <p style={{ fontFamily:C.fontTitle, fontSize:C.fzBase, fontWeight:700, letterSpacing:'.20em', color:'rgba(255,255,255,0.70)', marginBottom:8 }}>
              FAILED TO LOAD
            </p>
            <p style={{ fontFamily:C.fontMono, fontSize:C.fzXs, letterSpacing:'.14em', color:C.textDim, marginBottom:24 }}>
              {error}
            </p>
            <button onClick={fetchScores} style={{ background:'rgba(227,18,18,0.10)', border:`1px solid rgba(227,18,18,0.40)`, borderRadius:6, color:C.red, fontFamily:C.fontMono, fontSize:C.fzXs, padding:'8px 24px', cursor:'none', letterSpacing:'.12em', transition:'all .2s' }}
              onMouseEnter={e=>{ e.currentTarget.style.background='rgba(227,18,18,0.22)' }}
              onMouseLeave={e=>{ e.currentTarget.style.background='rgba(227,18,18,0.10)' }}
            >RETRY</button>
          </div>
        </FullPageState>
      )}

      {/* ── ERROR BANNER (when data exists but refresh failed) ── */}
      {error && data.length > 0 && (
        <div style={{ position:'fixed', top:72, left:40, right:40, zIndex:40, padding:'10px 18px', background:'rgba(90,0,0,0.28)', border:'1px solid rgba(160,0,0,0.35)', borderRadius:8, fontFamily:C.fontMono, fontSize:C.fzSm, color:'#EDE0D4', display:'flex', gap:10, alignItems:'center' }}>
          <span style={{ color:'#DD2200' }}>⚠</span> {error}
          <button onClick={fetchScores} style={{ marginLeft:'auto', background:'none', border:`1px solid rgba(227,18,18,0.4)`, borderRadius:6, color:C.red, fontFamily:C.fontMono, fontSize:C.fzXs, padding:'4px 12px', cursor:'none', letterSpacing:'.1em' }}>RETRY</button>
        </div>
      )}

      {/* ── TABLE ── */}
      {data.length > 0 && (
        <div style={{ position:'relative', zIndex:10, paddingTop:80, paddingBottom:48, overflowX:'auto', animation:'fadeIn .5s ease-out' }}>
          <div style={{ marginLeft:40, marginRight:40 }}>
            <table style={{ width:'100%', borderCollapse:'collapse' }}>
              <thead>
                <tr>
                  <Th width={60}>RNK</Th>
                  <Th width={180}>TEAM</Th>
                  <Th width={80}>SCORE</Th>
                  <Th width={60}>START</Th>
                  <Th width={50}>N1</Th>
                  <Th width={50}>N2</Th>
                  <Th width={50} borderColor='rgba(255,153,68,0.60)'>N3◆</Th>
                  <Th width={50}>N4</Th>
                  <Th width={50} borderColor='rgba(255,153,68,0.60)'>N5◆</Th>
                  <Th width={50}>N6</Th>
                  <Th width={50}>N7</Th>
                  <Th width={50} borderColor='rgba(245,200,66,0.75)'>Final</Th>
                  <Th width={50} borderColor='rgba(227,18,18,0.60)'>P1</Th>
                  <Th width={50} borderColor='rgba(227,18,18,0.60)'>P2</Th>
                  <Th width={50} borderColor='rgba(227,18,18,0.60)'>P3</Th>
                  <Th width={70}>✗</Th>
                  <Th width={70}>PEN</Th>
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
          </div>
        </div>
      )}

      {/* empty state */}
      {!loading && !error && data.length === 0 && (
        <FullPageState>
          <p style={{ fontFamily:C.fontMono, fontSize:C.fzSm, letterSpacing:'.18em', color:C.textDim }}>
            NO TEAMS REGISTERED YET
          </p>
        </FullPageState>
      )}

      <div style={{ position:'fixed', bottom:0, left:0, right:0, height:120, zIndex:0, pointerEvents:'none', background:'linear-gradient(0deg, rgba(180,20,0,0.18) 0%, transparent 100%)' }}/>
    </div>
  )
}