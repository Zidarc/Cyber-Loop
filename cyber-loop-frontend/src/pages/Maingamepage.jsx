import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import GameNavbar     from '../components/Gamenavbar'
import GameGraph      from '../components/Gamegraph'
import PuzzleModal    from '../components/Puzzlemodal'
import PenaltyCounter from '../components/Penaltycounter'
import EmberCanvas    from '../components/EmberCanvas'
import SolveRipple    from '../components/Solveripple'
import { authFetch }  from '../lib/api'

const GAME_PATH = [1, 2, 3, 4, 5, 6, 7, 8]
// SVG viewBox dimensions — must match Gamegraph.jsx
const SVG_W = 1400
const SVG_H = 860

// ── Intensity curve: calm → panic as time runs out ──────────────────────────
function calcEmberIntensity(msLeft, totalMs) {
  if (msLeft === null || !totalMs) return 0
  const ratio = msLeft / totalMs
  if (ratio > 0.5)  return 0
  if (ratio > 0.25) return (0.5 - ratio) * 2.4
  if (ratio > 0.1)  return 0.6 + (0.25 - ratio) / 0.15 * 0.8
  return 1.4 + (0.1 - ratio) / 0.1 * 1.6
}

/**
 * Convert SVG viewBox coords → screen pixels.
 * The SVG uses preserveAspectRatio="xMidYMid meet" so we must account for
 * letterboxing inside the game canvas (below the 54px navbar).
 */
function svgToScreen(svgX, svgY) {
  const svgEl = document.querySelector('.game-svg')
  if (!svgEl) return { x: window.innerWidth / 2, y: window.innerHeight / 2 }

  const rect   = svgEl.getBoundingClientRect()
  const scaleX = rect.width  / SVG_W
  const scaleY = rect.height / SVG_H
  const scale  = Math.min(scaleX, scaleY)
  const offX   = (rect.width  - SVG_W * scale) / 2
  const offY   = (rect.height - SVG_H * scale) / 2

  return {
    x: rect.left + offX + svgX * scale,
    y: rect.top  + offY + svgY * scale,
  }
}

function LoadingScreen() {
  return (
    <div style={{ minHeight:'100vh', background:'#03020a', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:18 }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Share+Tech+Mono&display=swap');
        @keyframes spin { to { transform:rotate(360deg) } }
      `}</style>
      <div style={{ width:24, height:24, borderRadius:'50%', border:'2px solid rgba(227,18,18,0.18)', borderTopColor:'#e31212', animation:'spin 0.9s linear infinite' }}/>
      <div style={{ fontFamily:'"Share Tech Mono",monospace', fontSize:'0.7rem', color:'rgba(227,18,18,0.55)', letterSpacing:'0.22em', textTransform:'uppercase' }}>
        Entering the upside down...
      </div>
    </div>
  )
}

function ScreenFlash({ active }) {
  if (!active) return null
  return <div style={{ position:'fixed', inset:0, zIndex:55, pointerEvents:'none', background:'rgba(200,0,0,0.18)', animation:'flashOut 0.65s ease-out forwards' }}/>
}

export default function MainGamePage() {
  const navigate = useNavigate()

  const [gameData,     setGameData]     = useState(null)
  const [loading,      setLoading]      = useState(true)
  const [activeNode,   setActiveNode]   = useState(null)
  const [showModal,    setShowModal]    = useState(false)
  const [animEvents,   setAnimEvents]   = useState([])
  const [screenFlash,  setScreenFlash]  = useState(false)

  // ── Ripple ───────────────────────────────────────────────────────────────
  const [rippleActive, setRippleActive] = useState(false)
  const [rippleOrigin, setRippleOrigin] = useState(null)
  const rippleKeyRef   = useRef(0)

  // ── Ember intensity ──────────────────────────────────────────────────────
  const [emberIntensity, setEmberIntensity] = useState(0)
  const totalMsRef = useRef(null)
  const endsAtRef  = useRef(null)

  const evIdRef = useRef(0)

  const pushEvent = useCallback((ev) => {
    const id = ++evIdRef.current
    setAnimEvents(prev => [...prev.slice(-30), { ...ev, evId: id }])
  }, [])

  // Compute total game duration once
  useEffect(() => {
    const ea = gameData?.competition?.endsAt
    if (!ea || endsAtRef.current === ea) return
    endsAtRef.current = ea
    const startedAt = gameData?.competition?.startedAt
    totalMsRef.current = startedAt
      ? new Date(ea).getTime() - new Date(startedAt).getTime()
      : 2 * 60 * 60 * 1000
  }, [gameData])

  const handleTick = useCallback((ms) => {
    setEmberIntensity(calcEmberIntensity(ms, totalMsRef.current))
  }, [])

  const fetchState = useCallback(async () => {
    const token = sessionStorage.getItem('token')
    if (!token) { navigate('/login'); return }
    try {
      const res = await authFetch('/api/game/state')
      if (res.status === 401 || res.status === 403) {
        const d = await res.json().catch(() => ({}))
        if (d.error === 'Competition has ended') {
          navigate('/endscreen', { state: { result:'loss', score:0, teamName:sessionStorage.getItem('teamName') } })
          return
        }
        navigate('/login'); return
      }
      if (!res.ok) return
      const data = await res.json()
      setGameData(data)
      if (data.gameState?.isFinished) {
        navigate('/endscreen', { state: { result:'win', score:data.gameState.score, teamName:sessionStorage.getItem('teamName') } })
      }
    } catch {}
    finally { setLoading(false) }
  }, [navigate])

  useEffect(() => { fetchState() }, [fetchState])

  const handleNodeClick = useCallback((sn) => {
    if (sn.status !== 'unlocked') return
    setActiveNode(sn); setShowModal(true)
  }, [])

  // ── Gamegraph fires this when a solve event is processed ─────────────────
  const handleNodeSolvedAt = useCallback((nodeId, svgX, svgY) => {
    const screenPt = svgToScreen(svgX, svgY)
    rippleKeyRef.current += 1
    setRippleOrigin(screenPt)
    setRippleActive(false)
    // Let React flush the false first, then set true to re-trigger
    requestAnimationFrame(() => setRippleActive(true))
  }, [])

  const handleSubmitResult = useCallback((result) => {
    const { submitResult, nodes, gameState, competition } = result
    const prevMap = {}
    ;(gameData?.nodes || []).forEach(n => { prevMap[n.id] = n })

    const newlyLocked = []
    ;(nodes || []).forEach(n => {
      const prev = prevMap[n.id]
      if (prev && prev.status !== 'locked' && n.status === 'locked' && n.nodeType !== 'penalty')
        newlyLocked.push(n.id)
    })
    const pathIdx = {}
    GAME_PATH.forEach((id, i) => { pathIdx[id] = i })
    newlyLocked.sort((a, b) => (pathIdx[b] ?? 99) - (pathIdx[a] ?? 99))

    setGameData(prev => ({
      nodes,
      gameState,
      competition: competition ?? prev?.competition,
    }))
    setShowModal(false); setActiveNode(null)

    if (submitResult.correct) {
      pushEvent({ type:'solve', nodeId:activeNode?.id, nodeType:activeNode?.nodeType })
      const finalN    = (nodes || []).find(n => n.nodeType === 'final')
      const prevFinal = prevMap[finalN?.id]
      if (finalN?.status === 'unlocked' && prevFinal?.status === 'locked')
        pushEvent({ type:'finalUnlock' })
      if (submitResult.isFinished || gameState?.isFinished) {
        setTimeout(() => navigate('/endscreen', {
          state: { result:'win', score:gameState?.score ?? 0, teamName:sessionStorage.getItem('teamName') }
        }), 1800)
      }
    } else {
      setScreenFlash(true)
      setTimeout(() => setScreenFlash(false), 700)
      if (newlyLocked.length > 0) pushEvent({ type:'lockChain', nodeIds:newlyLocked })
      if (submitResult.penaltyNodeUnlocked) pushEvent({ type:'penaltyAppear', nodeId:submitResult.penaltyNodeUnlocked })
    }
  }, [gameData, activeNode, navigate, pushEvent])

  const handleTimerExpire = useCallback(() => {
    if (gameData?.gameState?.isFinished) return
    navigate('/endscreen', {
      state: { result:'loss', score:gameData?.gameState?.score ?? 0, teamName:sessionStorage.getItem('teamName') }
    })
  }, [gameData, navigate])

  const penaltyCounter = gameData?.gameState?.penaltyCounter ?? 0
  const teamName       = sessionStorage.getItem('teamName') || 'TEAM'
  const score          = gameData?.gameState?.score ?? 0

  if (loading) return <LoadingScreen/>

  return (
    <div
      className="game-root"
      style={{ width:'100vw', height:'100vh', background:'#03020a', overflow:'hidden', position:'relative' }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@700;900&family=Share+Tech+Mono&display=swap');
        .game-root, .game-root * { cursor: default !important; }
        .game-root .node-unlocked { cursor: pointer !important; }
        @keyframes flashOut { 0%{opacity:1} 100%{opacity:0} }
      `}</style>

      <div style={{ position:'fixed', inset:0, background:'radial-gradient(ellipse 85% 70% at 50% 105%,rgba(227,18,18,0.06) 0%,transparent 60%)' }}/>

      <EmberCanvas
        count={22} vxSpread={0.22} vyMin={0.14} vyRange={0.22}
        sizeMin={0.5} sizeRange={1.6} travelMin={0.28} travelRange={0.18}
        alphaScale={0.45} zIndex={0}
        intensityMultiplier={emberIntensity}
      />

      <ScreenFlash active={screenFlash}/>

      {/* Ripple fires from solved node's screen position */}
      <SolveRipple
        key={rippleKeyRef.current}
        active={rippleActive}
        origin={rippleOrigin}
        onComplete={() => setRippleActive(false)}
      />

      <GameNavbar
        endsAt={gameData?.competition?.endsAt}
        remainingMs={gameData?.competition?.remainingMs}
        teamName={teamName}
        score={score}
        onTimerExpire={handleTimerExpire}
        onTick={handleTick}
      />

      <div style={{ position:'absolute', inset:'54px 0 0 0', zIndex:10 }}>
        <GameGraph
          nodes={gameData?.nodes}
          onNodeClick={handleNodeClick}
          animEvents={animEvents}
          onNodeSolvedAt={handleNodeSolvedAt}
        />
      </div>

      <PenaltyCounter count={penaltyCounter}/>

      {showModal && activeNode && (
        <PuzzleModal
          nodeId={activeNode.id}
          nodeLabel={activeNode.label}
          nodeType={activeNode.nodeType}
          onClose={() => { setShowModal(false); setActiveNode(null) }}
          onSubmitResult={handleSubmitResult}
        />
      )}
    </div>
  )
}