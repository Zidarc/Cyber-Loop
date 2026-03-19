import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import GameNavbar     from '../components/GameNavbar'
import GameGraph      from '../components/Gamegraph'
import PuzzleModal    from '../components/PuzzleModal'
import PenaltyCounter from '../components/PenaltyCounter'
import EmberCanvas    from '../components/EmberCanvas'
import { authFetch }  from '../lib/api'

const GAME_PATH = [1, 2, 3, 4, 5, 6, 7, 8]

function LoadingScreen() {
  return (
    <div style={{minHeight:'100vh',background:'#03020a',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:18}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Share+Tech+Mono&display=swap');
        @keyframes spin{to{transform:rotate(360deg)}}
      `}</style>
      <div style={{width:24,height:24,borderRadius:'50%',border:'2px solid rgba(227,18,18,0.18)',borderTopColor:'#e31212',animation:'spin 0.9s linear infinite'}}/>
      <div style={{fontFamily:'"Share Tech Mono",monospace',fontSize:'0.7rem',color:'rgba(227,18,18,0.55)',letterSpacing:'0.22em',textTransform:'uppercase'}}>
        Entering the upside down...
      </div>
    </div>
  )
}

function ScreenFlash({active}) {
  if(!active) return null
  return <div style={{position:'fixed',inset:0,zIndex:55,pointerEvents:'none',background:'rgba(200,0,0,0.18)',animation:'flashOut 0.65s ease-out forwards'}}/>
}

export default function MainGamePage() {
  const navigate = useNavigate()
  const [gameData,    setGameData]    = useState(null)
  const [loading,     setLoading]     = useState(true)
  const [activeNode,  setActiveNode]  = useState(null)
  const [showModal,   setShowModal]   = useState(false)
  const [animEvents,  setAnimEvents]  = useState([])
  const [screenFlash, setScreenFlash] = useState(false)
  const evIdRef = useRef(0)

  const pushEvent = useCallback((ev) => {
    const evId = ++evIdRef.current
    setAnimEvents(prev => [...prev.slice(-30), {...ev, evId}])
  }, [])

  const fetchState = useCallback(async () => {
    const token = sessionStorage.getItem('token')
    if (!token) { navigate('/login'); return }
    try {
      const res = await authFetch('/api/game/state')
      if (res.status === 401 || res.status === 403) {
        const d = await res.json().catch(()=>({}))
        if (d.error === 'Competition has ended') {
          navigate('/endscreen', {state:{result:'loss',score:0,teamName:sessionStorage.getItem('teamName')}})
          return
        }
        navigate('/login'); return
      }
      if (!res.ok) return
      const data = await res.json()
      setGameData(data)
      if (data.gameState?.isFinished) {
        navigate('/endscreen', {state:{result:'win',score:data.gameState.score,teamName:sessionStorage.getItem('teamName')}})
      }
    } catch {}
    finally { setLoading(false) }
  }, [navigate])

  useEffect(()=>{ fetchState() }, [fetchState])

  const handleNodeClick = useCallback((sn) => {
    if (sn.status !== 'unlocked') return
    setActiveNode(sn); setShowModal(true)
  }, [])

  const handleSubmitResult = useCallback((result) => {
    const {submitResult, nodes, gameState, competition} = result
    const prevMap = {}
    ;(gameData?.nodes||[]).forEach(n=>{prevMap[n.id]=n})

    const newlyLocked = []
    ;(nodes||[]).forEach(n=>{
      const prev = prevMap[n.id]
      if (prev && prev.status!=='locked' && n.status==='locked' && n.nodeType!=='penalty')
        newlyLocked.push(n.id)
    })
    const pathIdx = {}
    GAME_PATH.forEach((id,i)=>{pathIdx[id]=i})
    newlyLocked.sort((a,b)=>(pathIdx[b]??99)-(pathIdx[a]??99))

    setGameData({nodes,gameState,competition})
    setShowModal(false); setActiveNode(null)

    if (submitResult.correct) {
      pushEvent({type:'solve',nodeId:activeNode?.id,nodeType:activeNode?.nodeType})
      const finalN    = (nodes||[]).find(n=>n.nodeType==='final')
      const prevFinal = prevMap[finalN?.id]
      if (finalN?.status==='unlocked' && prevFinal?.status==='locked')
        pushEvent({type:'finalUnlock'})
      if (submitResult.isFinished || gameState?.isFinished) {
        setTimeout(()=>navigate('/endscreen',{
          state:{result:'win',score:gameState?.score??0,teamName:sessionStorage.getItem('teamName')}
        }),1600)
      }
    } else {
      setScreenFlash(true)
      setTimeout(()=>setScreenFlash(false),700)
      if (newlyLocked.length>0) pushEvent({type:'lockChain',nodeIds:newlyLocked})
      if (submitResult.penaltyNodeUnlocked) pushEvent({type:'penaltyAppear',nodeId:submitResult.penaltyNodeUnlocked})
    }
  }, [gameData,activeNode,navigate,pushEvent])

  const handleTimerExpire = useCallback(() => {
    if (gameData?.gameState?.isFinished) return
    navigate('/endscreen',{
      state:{result:'loss',score:gameData?.gameState?.score??0,teamName:sessionStorage.getItem('teamName')}
    })
  }, [gameData,navigate])

  const penaltyCounter = gameData?.gameState?.penaltyCounter ?? 0
  const teamName       = sessionStorage.getItem('teamName') || 'TEAM'
  const score          = gameData?.gameState?.score ?? 0

  if (loading) return <LoadingScreen/>

  return (
    // game-root overrides the global cursor:none — the game page must show the cursor
    // .node-unlocked (injected by Gamegraph.jsx) restores pointer on clickable nodes
    <div className="game-root"
      style={{width:'100vw',height:'100vh',background:'#03020a',overflow:'hidden',position:'relative'}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@700;900&family=Share+Tech+Mono&display=swap');
        .game-root, .game-root * { cursor: default !important; }
        .game-root .node-unlocked { cursor: pointer !important; }
        @keyframes flashOut { 0%{opacity:1} 100%{opacity:0} }
      `}</style>

      <div style={{position:'fixed',inset:0,background:'radial-gradient(ellipse 85% 70% at 50% 105%,rgba(227,18,18,0.06) 0%,transparent 60%)'}}/>

      <EmberCanvas count={22} vxSpread={0.22} vyMin={0.14} vyRange={0.22}
        sizeMin={0.5} sizeRange={1.6} travelMin={0.28} travelRange={0.18}
        alphaScale={0.45} zIndex={0}/>

      <ScreenFlash active={screenFlash}/>

      <GameNavbar
        endsAt={gameData?.competition?.endsAt}
        teamName={teamName}
        score={score}
        onTimerExpire={handleTimerExpire}
      />

      <div style={{position:'absolute',inset:'54px 0 0 0',zIndex:10}}>
        <GameGraph
          nodes={gameData?.nodes}
          onNodeClick={handleNodeClick}
          animEvents={animEvents}
        />
      </div>

      <PenaltyCounter count={penaltyCounter}/>

      {showModal&&activeNode&&(
        <PuzzleModal
          nodeId={activeNode.id}
          nodeLabel={activeNode.label}
          nodeType={activeNode.nodeType}
          onClose={()=>{setShowModal(false);setActiveNode(null)}}
          onSubmitResult={handleSubmitResult}
        />
      )}
    </div>
  )
}