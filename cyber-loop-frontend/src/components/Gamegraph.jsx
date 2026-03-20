import { useMemo, useState, useEffect, useRef } from 'react'

// ─────────────────────────────────────────────────────────────────────────────
// LAYOUT  — radii increased across the board
// ─────────────────────────────────────────────────────────────────────────────
const NODE_LAYOUT = {
  1:  { x: 700,  y: 80,  r: 30 },  // start
  2:  { x: 185,  y: 240, r: 24 },  // normal
  3:  { x: 1215, y: 255, r: 28 },  // checkpoint
  4:  { x: 420,  y: 430, r: 24 },  // normal
  5:  { x: 980,  y: 445, r: 28 },  // checkpoint
  6:  { x: 145,  y: 630, r: 24 },  // normal
  7:  { x: 1255, y: 635, r: 24 },  // normal
  8:  { x: 700,  y: 790, r: 32 },  // final
  9:  { x: 52,   y: 430, r: 26 },  // penalty
  10: { x: 1348, y: 430, r: 26 },  // penalty
  11: { x: 52,   y: 660, r: 26 },  // penalty
}

const DECOYS = [
  { id:'d1',  x:420,  y:88,  r:11 }, { id:'d2',  x:980,  y:82,  r:13 },
  { id:'d3',  x:128,  y:148, r:10 }, { id:'d4',  x:1272, y:142, r:12 },
  { id:'d5',  x:700,  y:210, r:11 }, { id:'d6',  x:308,  y:318, r:12 },
  { id:'d7',  x:1095, y:328, r:10 }, { id:'d8',  x:568,  y:295, r:11 },
  { id:'d9',  x:832,  y:300, r:13 }, { id:'d10', x:145,  y:520, r:11 },
  { id:'d11', x:1255, y:525, r:12 }, { id:'d12', x:700,  y:545, r:10 },
  { id:'d13', x:360,  y:680, r:13 }, { id:'d14', x:1040, y:685, r:11 },
  { id:'d15', x:700,  y:720, r:12 },
]

const GAME_PATH = [1, 2, 3, 4, 5, 6, 7, 8]

// ─────────────────────────────────────────────────────────────────────────────
// COLOUR CONFIG — ported directly from GameNode.jsx nodeStyles
// ─────────────────────────────────────────────────────────────────────────────
const TYPE_CFG = {
  // start: amber/gold — nodeStyles.start
  start:      { stroke:'#FFB300', fill:'rgba(255,179,0,0.18)',  glow:'rgba(255,179,0,0.40)',  anim:'nodeBreath',  dur:'2.8s' },
  // normal/active: dark red → orange — nodeStyles.active
  normal:     { stroke:'#8B0000', fill:'rgba(139,0,0,0.20)',    glow:'rgba(255,106,0,0.35)',  anim:'nodeBreath',  dur:'3.3s' },
  // checkpoint: orange checkerboard fill — nodeStyles.checkpoint
  checkpoint: { stroke:'#FF8C00', fill:'PATTERN',               glow:'rgba(255,140,0,0.50)',  anim:'checkPulse',  dur:'2.0s' },
  // penalty: deep crimson — nodeStyles.penalty
  penalty:    { stroke:'#B71C1C', fill:'rgba(183,28,28,0.22)',  glow:'rgba(183,28,28,0.40)',  anim:'penJitter',   dur:'1.5s' },
  // final: electric blue — nodeStyles.final
  final:      { stroke:'#29B6F6', fill:'rgba(41,182,246,0.18)', glow:'rgba(41,182,246,0.40)', anim:'finalBreath', dur:'2.0s' },
}
const SOLVED_CFG = {
  // solved: bright green — nodeStyles.solved
  stroke:'#00E676', fill:'rgba(0,230,118,0.15)', glow:'rgba(0,230,118,0.40)', anim:'solvedBreath', dur:'2.6s',
}
const LOCKED_CFG = {
  // inactive: muted grey, semi-transparent — nodeStyles.inactive
  stroke:'#4A4A4A', fill:'rgba(74,74,74,0.12)', glow:null, anim:null, dur:null,
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────
function ptSegDist(ax,ay,bx,by,px,py) {
  const dx=bx-ax,dy=by-ay,L=dx*dx+dy*dy
  if(!L) return Math.hypot(px-ax,py-ay)
  const t=Math.max(0,Math.min(1,((px-ax)*dx+(py-ay)*dy)/L))
  return Math.hypot(px-ax-t*dx,py-ay-t*dy)
}
function lineClear(ax,ay,bx,by,skipA,skipB,all) {
  for(const n of all){
    if(n.id===skipA||n.id===skipB) continue
    if(ptSegDist(ax,ay,bx,by,n.x,n.y)<n.r+8) return false
  }
  return true
}
// Spinning inline-style helper — used for checkpoint/final decorations only
const bs=(anim,dur,delay='0s')=>({
  transformBox:'fill-box',transformOrigin:'center',
  animation:`${anim} ${dur} ease-in-out ${delay} infinite`,
})

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
export default function GameGraph({nodes,onNodeClick,animEvents=[],onNodeSolvedAt}) {
  const [nodeAnims,    setNodeAnims]    = useState({})
  const [particles,    setParticles]    = useState([])
  const [finalBoom,    setFinalBoom]    = useState(false)
  const [screenShake,  setScreenShake]  = useState(false)
  const [litEdgeState, setLitEdgeState] = useState({})

  const processedEvIds = useRef(new Set())
  const prevLitRef     = useRef(new Set())

  const allForColl = useMemo(()=>[
    ...Object.entries(NODE_LAYOUT).map(([id,p])=>({id:Number(id),...p})),
    ...DECOYS,
  ],[])

  const webEdges = useMemo(()=>{
    const out=[]
    for(let i=0;i<allForColl.length;i++){
      for(let j=i+1;j<allForColl.length;j++){
        const a=allForColl[i],b=allForColl[j]
        const d=Math.hypot(a.x-b.x,a.y-b.y)
        if(d>300) continue
        if(!lineClear(a.x,a.y,b.x,b.y,a.id,b.id,allForColl)) continue
        const bucket=Math.floor(((a.x+b.x)/2/1400)*8)%8
        out.push({ax:a.x,ay:a.y,bx:b.x,by:b.y,d,bucket})
      }
    }
    return out
  },[allForColl])

  const nodeMap = useMemo(()=>{
    const m={}; (nodes||[]).forEach(n=>{m[n.id]=n}); return m
  },[nodes])

  const litKeyStr = useMemo(()=>{
    const keys=[]
    for(let i=0;i<GAME_PATH.length-1;i++){
      const fn=nodeMap[GAME_PATH[i]],tn=nodeMap[GAME_PATH[i+1]]
      if(fn?.status==='solved'&&(tn?.status==='unlocked'||tn?.status==='solved'))
        keys.push(`${GAME_PATH[i]}-${GAME_PATH[i+1]}`)
    }
    return keys.join(',')
  },[nodeMap])

  // Detect newly lit AND newly unlit edges
  useEffect(()=>{
    const current=new Set(litKeyStr?litKeyStr.split(','):[])
    const newly=[]
    const removed=[]
    current.forEach(k=>{if(!prevLitRef.current.has(k))newly.push(k)})
    prevLitRef.current.forEach(k=>{if(!current.has(k))removed.push(k)})
    prevLitRef.current=current
    if(!newly.length&&!removed.length) return
    setLitEdgeState(prev=>{
      const next={...prev}
      newly.forEach(k=>{next[k]='animating'})
      removed.forEach(k=>{delete next[k]})   // ← remove lines when nodes re-lock
      return next
    })
    newly.forEach(k=>{
      setTimeout(()=>setLitEdgeState(prev=>prev[k]==='animating'?{...prev,[k]:'done'}:prev),950)
    })
  },[litKeyStr])

  useEffect(()=>{
    animEvents.forEach(ev=>{
      if(processedEvIds.current.has(ev.evId)) return
      processedEvIds.current.add(ev.evId)

      if(ev.type==='solve'){
        const pos=NODE_LAYOUT[ev.nodeId]; if(!pos) return
        setNodeAnims(a=>({...a,[ev.nodeId]:'solving'}))
        setTimeout(()=>setNodeAnims(a=>({...a,[ev.nodeId]:null})),900)
        // Notify parent of SVG position for ripple origin
        onNodeSolvedAt?.(ev.nodeId, pos.x, pos.y)
        // Particle colors match GameNode.jsx nodeStyles stroke colors
        const col=ev.nodeType==='final'?'#29B6F6':ev.nodeType==='checkpoint'?'#FF8C00':'#00E676'
        const batch=Array.from({length:20},(_,i)=>({
          id:`${ev.evId}-${i}`,cx:pos.x,cy:pos.y,
          angle:(i/20)*Math.PI*2+(Math.random()-.5)*.3,
          dist:42+Math.random()*38,color:col,life:700+Math.random()*250,
        }))
        setParticles(p=>[...p,...batch])
        setTimeout(()=>setParticles(p=>p.filter(x=>!batch.find(b=>b.id===x.id))),1100)
      }

      if(ev.type==='lockChain'){
        setScreenShake(true)
        setTimeout(()=>setScreenShake(false),500)
        const pathIdx={}; GAME_PATH.forEach((id,i)=>{pathIdx[id]=i})
        const sorted=[...(ev.nodeIds||[])].sort((a,b)=>(pathIdx[b]??99)-(pathIdx[a]??99))
        sorted.forEach((nid,i)=>{
          setTimeout(()=>setNodeAnims(a=>({...a,[nid]:'locking'})),i*180)
          setTimeout(()=>setNodeAnims(a=>({...a,[nid]:null})),i*180+600)
        })
      }

      if(ev.type==='penaltyAppear'){
        setNodeAnims(a=>({...a,[ev.nodeId]:'penaltyIn'}))
        setTimeout(()=>setNodeAnims(a=>({...a,[ev.nodeId]:null})),1200)
      }

      if(ev.type==='finalUnlock'){
        setFinalBoom(true)
        setTimeout(()=>setFinalBoom(false),1800)
      }
    })
  },[animEvents])

  const getCfg=(sn,anim)=>{
    if(!sn) return null
    if(anim==='locking') return {stroke:'#ff2222',fill:'rgba(255,0,0,0.22)',glow:'rgba(255,0,0,0.85)',anim:null,dur:null}
    if(sn.status==='locked') return LOCKED_CFG
    if(sn.status==='solved') {
      // Penalty nodes breathe much slower once neutralised — the threat has dimmed
      if(sn.nodeType==='penalty') return {...SOLVED_CFG, dur:'6.5s'}
      return SOLVED_CFG
    }
    return TYPE_CFG[sn.nodeType]||TYPE_CFG.normal
  }

  return (
    <div style={{position:'absolute',inset:0,animation:screenShake?'graphShake 0.5s ease-out':'none'}}>
      <style>{`
        @keyframes webShimmer  { 0%,100%{ stroke-opacity:.038 } 50%{ stroke-opacity:.24  } }
        .ws0{animation:webShimmer 3.6s ease-in-out 0.00s infinite}
        .ws1{animation:webShimmer 3.6s ease-in-out 0.45s infinite}
        .ws2{animation:webShimmer 3.6s ease-in-out 0.90s infinite}
        .ws3{animation:webShimmer 3.6s ease-in-out 1.35s infinite}
        .ws4{animation:webShimmer 3.6s ease-in-out 1.80s infinite}
        .ws5{animation:webShimmer 3.6s ease-in-out 2.25s infinite}
        .ws6{animation:webShimmer 3.6s ease-in-out 2.70s infinite}
        .ws7{animation:webShimmer 3.6s ease-in-out 3.15s infinite}

        /* Glow pulses — opacity-only blur fills (atmosphere/main/tight layers) */
        @keyframes nodeBreath   { 0%,100%{opacity:.12} 50%{opacity:.65} }
        @keyframes solvedBreath { 0%,100%{opacity:.14} 50%{opacity:.68} }
        @keyframes finalBreath  { 0%,100%{opacity:.14} 50%{opacity:.72} }
        @keyframes atmosphereF  { 0%,100%{opacity:.03} 50%{opacity:.16} }
        @keyframes decoyPulse   { 0%,100%{opacity:.10} 50%{opacity:.30} }

        /* checkpoint — scale 1→1.08→1 + glow surge, from animationVariants.checkpoint */
        @keyframes checkPulse {
          0%,100% { opacity:.18; transform:scale(1)    }
          50%     { opacity:.85; transform:scale(1.08) }
        }
        /* penalty — subtle scale jitter + micro-rotate, from animationVariants.penalty */
        @keyframes penJitter {
          0%,100% { opacity:.22; transform:scale(1)    rotate(0deg)   }
          33%     { opacity:.80; transform:scale(1.03) rotate(.5deg)  }
          66%     { opacity:.80; transform:scale(.97)  rotate(-.5deg) }
        }

        /* Animated flow dash — moves along drawn edges like React Flow animated:true */
        @keyframes dashFlow     { from{stroke-dashoffset:22} to{stroke-dashoffset:0} }
        @keyframes spinR        { from{transform:rotate(0deg)}              to{transform:rotate(360deg)}           }
        @keyframes spinL        { from{transform:rotate(0deg)}              to{transform:rotate(-360deg)}          }

        @keyframes graphShake  { 0%,100%{transform:translate(0,0)} 15%{transform:translate(-6px,4px)} 30%{transform:translate(7px,-4px)} 50%{transform:translate(-5px,6px)} 70%{transform:translate(6px,-4px)} }
        @keyframes solvePing   { 0%{r:0;opacity:.88} 100%{r:76;opacity:0} }
        @keyframes lockFlash   { 0%{opacity:1}        100%{opacity:.12}   }
        @keyframes glitchIn    { 0%{opacity:0;transform:scale(.08)} 18%{opacity:1;transform:scale(1.40)} 36%{opacity:0;transform:scale(.82)} 54%{opacity:1;transform:scale(1.14)} 70%{opacity:0;transform:scale(.92)} 86%{opacity:1;transform:scale(1.05)} 100%{opacity:1;transform:scale(1)} }
        @keyframes solvFlash   { 0%{opacity:1} 50%{opacity:.60} 100%{opacity:1} }
        @keyframes finalBoomA  { 0%{opacity:0} 12%{opacity:.74} 100%{opacity:0} }
        @keyframes ptcFade     { 0%{opacity:1} 100%{opacity:0}  }
        @keyframes penRingPulse { 0%,100%{opacity:.25;r:var(--pr,36)} 50%{opacity:.85;r:var(--pr,44)} }

        .node-unlocked { cursor: pointer !important; }
      `}</style>

      {finalBoom&&(
        <div style={{position:'absolute',inset:0,zIndex:5,pointerEvents:'none',
          background:'radial-gradient(ellipse 72% 55% at 50% 92%,rgba(255,225,0,.45) 0%,rgba(255,255,255,.10) 40%,transparent 65%)',
          animation:'finalBoomA 1.8s ease-out forwards'}}/>
      )}

      <svg className="game-svg" viewBox="0 0 1400 860" width="100%" height="100%"
        style={{display:'block'}} preserveAspectRatio="xMidYMid meet">

        <defs>
          {/* Checkpoint checkerboard fill — matches GameNode.jsx repeating-conic-gradient */}
          <pattern id="cpPattern" x="0" y="0" width="12" height="12" patternUnits="userSpaceOnUse">
            <rect width="6"  height="6"  x="0" y="0" fill="rgba(255,140,0,0.18)"/>
            <rect width="6"  height="6"  x="6" y="6" fill="rgba(255,140,0,0.18)"/>
            <rect width="12" height="12" x="0" y="0" fill="rgba(18,18,24,0.80)"/>
            <rect width="6"  height="6"  x="0" y="0" fill="rgba(255,140,0,0.18)"/>
            <rect width="6"  height="6"  x="6" y="6" fill="rgba(255,140,0,0.18)"/>
          </pattern>
          {/* Radial fills baked as SVG gradients for start / normal / solved / final / penalty */}
          <radialGradient id="gStart"  cx="50%" cy="50%" r="50%">
            <stop offset="0%"   stopColor="#FFB300" stopOpacity=".28"/>
            <stop offset="100%" stopColor="#FFB300" stopOpacity=".08"/>
          </radialGradient>
          <radialGradient id="gNormal" cx="50%" cy="50%" r="50%">
            <stop offset="0%"   stopColor="#8B0000" stopOpacity=".32"/>
            <stop offset="100%" stopColor="#8B0000" stopOpacity=".10"/>
          </radialGradient>
          <radialGradient id="gSolved" cx="50%" cy="50%" r="50%">
            <stop offset="0%"   stopColor="#00E676" stopOpacity=".22"/>
            <stop offset="100%" stopColor="#00E676" stopOpacity=".05"/>
          </radialGradient>
          <radialGradient id="gFinal"  cx="50%" cy="50%" r="50%">
            <stop offset="0%"   stopColor="#29B6F6" stopOpacity=".28"/>
            <stop offset="100%" stopColor="#29B6F6" stopOpacity=".08"/>
          </radialGradient>
          <radialGradient id="gPenalty" cx="50%" cy="50%" r="50%">
            <stop offset="0%"   stopColor="#B71C1C" stopOpacity=".32"/>
            <stop offset="100%" stopColor="#B71C1C" stopOpacity=".10"/>
          </radialGradient>
        </defs>

        {/* No ghost path — edges are fully hidden until the connection is made */}

        {/* Web threads — shimmer wave sweeps left to right */}
        <g>
          {webEdges.map((e,i)=>(
            <line key={i} className={`ws${e.bucket}`}
              x1={e.ax} y1={e.ay} x2={e.bx} y2={e.by}
              stroke="rgba(145,28,0,1)" strokeWidth="0.65"/>
          ))}
        </g>

        {/* Lit path edges — GraphBoard.jsx style: dark #333/#444, strokeWidth 2.
            Hidden until lit. Draws in via stroke-dashoffset (matches fuse dot travel).
            Once drawn: core stays dark like GraphBoard, subtle glow halo only.
            Animated "flow" dashes mimic React Flow's animated:true edges.          */}
        <g>
          {GAME_PATH.slice(0,-1).map((fid,i)=>{
            const tid=GAME_PATH[i+1],key=`${fid}-${tid}`,eSt=litEdgeState[key]
            if(!eSt) return null
            const a=NODE_LAYOUT[fid],b=NODE_LAYOUT[tid]; if(!a||!b) return null
            const done=eSt==='done'
            const path=`M${a.x},${a.y} L${b.x},${b.y}`
            const dist=Math.hypot(b.x-a.x,b.y-a.y)
            return (
              <g key={`le-${key}`}>
                {/* Subtle halo — barely-there glow, draws in with the line */}
                <line x1={a.x} y1={a.y} x2={b.x} y2={b.y}
                  stroke="rgba(255,106,0,0.18)" strokeWidth="10"
                  strokeDasharray={dist}
                  style={{
                    strokeDashoffset: done ? 0 : dist,
                    transition: 'stroke-dashoffset 0.85s ease-out',
                    filter: 'blur(6px)',
                  }}/>
                {/* Core line — dark #444, strokeWidth 2, matches GraphBoard static edges */}
                <line x1={a.x} y1={a.y} x2={b.x} y2={b.y}
                  stroke="#444" strokeWidth="2"
                  strokeDasharray={dist}
                  style={{
                    strokeDashoffset: done ? 0 : dist,
                    transition: 'stroke-dashoffset 0.85s ease-out',
                  }}/>
                {/* Animated flow dashes — mimics React Flow animated:true.
                    Shown only after fully drawn. Moving dashes travel A→B. */}
                {done&&(
                  <line x1={a.x} y1={a.y} x2={b.x} y2={b.y}
                    stroke="#888" strokeWidth="1.5"
                    strokeDasharray="8 14"
                    style={{animation:'dashFlow 1.4s linear infinite'}}/>
                )}
                {/* Fuse dot — leads the line as it draws */}
                {eSt==='animating'&&(
                  <>
                    <circle r={12} fill="rgba(255,106,0,0.20)" style={{filter:'blur(6px)'}}>
                      <animateMotion dur="0.85s" fill="freeze" path={path}/>
                    </circle>
                    <circle r={4.5} fill="#FF6A00">
                      <animateMotion dur="0.85s" fill="freeze" path={path}/>
                    </circle>
                  </>
                )}
              </g>
            )
          })}
        </g>

        {/* Decoys — faintly alive to add ambiguity */}
        <g>
          {DECOYS.map((d,idx)=>{
            const dl=`${((idx*.37)%3.5).toFixed(2)}s`
            return (
              <g key={d.id}>
                <circle cx={d.x} cy={d.y} r={d.r+10} fill="rgba(70,50,90,0.55)"
                  style={{filter:'blur(8px)',animation:`decoyPulse 4.8s ease-in-out ${dl} infinite`}}/>
                <circle cx={d.x} cy={d.y} r={d.r} fill="rgba(14,10,24,.80)" stroke="rgba(70,50,90,.22)" strokeWidth=".9"/>
                <circle cx={d.x} cy={d.y} r={d.r-4} fill="none" stroke="rgba(55,40,72,.14)" strokeWidth=".5"/>
              </g>
            )
          })}
        </g>

        {/* Real nodes */}
        {Object.entries(NODE_LAYOUT).map(([idStr,pos])=>{
          const id=Number(idStr),sn=nodeMap[id]
          if(!sn) return null
          const anim=nodeAnims[id]
          if(sn.nodeType==='penalty'&&sn.status==='locked'&&anim!=='penaltyIn') return null

          const cfg=getCfg(sn,anim); if(!cfg) return null
          const isUnlocked = sn.status==='unlocked'
          const isSolved   = sn.status==='solved'
          const isLocked   = sn.status==='locked'
          const isLocking  = anim==='locking'
          const isSolving  = anim==='solving'
          const isPenIn    = anim==='penaltyIn'
          const isActive   = !isLocked&&!isLocking
          const isCheck    = sn.nodeType==='checkpoint'
          const isFinal    = sn.nodeType==='final'
          const isPenalty  = sn.nodeType==='penalty'
          const glow       = cfg.glow||cfg.stroke
          const dl         = `${((id*.41)%2.2).toFixed(2)}s`

          return (
            <g key={id} transform={`translate(${pos.x},${pos.y})`}
              className={isUnlocked?'node-unlocked':undefined}
              style={{animation:isPenIn?'glitchIn 1.1s ease-out':'none'}}
              onClick={()=>isUnlocked&&onNodeClick(sn)}
            >
              {/* ── LOCKED: render identically to decoys — dark featureless blob.
                   No glow, no color, no icon. Indistinguishable from background noise
                   until the player unlocks it.                                     ── */}
              {isLocked && (
                <>
                  <circle r={pos.r+9} fill="rgba(70,50,90,0.55)"
                    style={{filter:'blur(8px)',animation:`decoyPulse 4.8s ease-in-out ${dl} infinite`}}/>
                  <circle r={pos.r} fill="rgba(14,10,24,0.80)" stroke="rgba(70,50,90,0.22)" strokeWidth=".9"/>
                  <circle r={pos.r-7} fill="none" stroke="rgba(55,40,72,0.14)" strokeWidth=".5"/>
                </>
              )}

              {/* ── ACTIVE (unlocked / solved / locking): full visual treatment ── */}
              {!isLocked && (<>

              {/* Atmosphere — vast, barely-there outer bloom */}
              {isActive&&(
                <circle r={pos.r} fill={glow}
                  style={{filter:'blur(28px)',animation:`atmosphereF 4.5s ease-in-out ${dl} infinite`}}/>
              )}

              {/* Main glow — primary breathing halo right at the edge */}
              {isActive&&cfg.anim&&(
                <circle r={pos.r} fill={glow}
                  style={{filter:'blur(16px)',animation:`${cfg.anim} ${cfg.dur} ease-in-out ${dl} infinite`}}/>
              )}

              {/* Inner tight halo — extra intensity for unlocked nodes only */}
              {isUnlocked&&cfg.anim&&(
                <circle r={pos.r} fill={glow}
                  style={{filter:'blur(8px)',animation:`${cfg.anim} ${(parseFloat(cfg.dur)*.65).toFixed(1)}s ease-in-out ${dl} infinite`}}/>
              )}

              {/* Solve ping — glow burst at node radius, expands outward */}
              {isSolving&&(
                <circle r={pos.r} fill={glow}
                  style={{filter:'blur(10px)',animation:'solvePing .9s ease-out forwards'}}/>
              )}

              {/* Lock flash — red glow flood at edge */}
              {isLocking&&(
                <circle r={pos.r} fill="rgba(255,0,0,0.80)"
                  style={{filter:'blur(14px)',animation:'lockFlash .55s ease-out forwards'}}/>
              )}

              {/* Solved persistent halo — soft green corona breathing at the edge */}
              {isSolved&&(
                <circle r={pos.r} fill="rgba(0,230,118,0.55)"
                  style={{filter:'blur(14px)',animation:`solvedBreath ${cfg.dur} ease-in-out ${dl} infinite`}}/>
              )}

          {/* Penalty outer pulse ring — extra visibility */}
              {isPenalty && !isLocked && (
                <circle r={pos.r+10} fill="none"
                  stroke="rgba(183,28,28,0.7)" strokeWidth="1.5"
                  style={{animation:'penRingPulse 1.2s ease-in-out infinite'}}/>
              )}

              {/* Penalty glitch bloom on appear */}
              {isPenIn&&(
                <circle r={pos.r} fill="rgba(255,0,0,0.70)"
                  style={{filter:'blur(18px)',transformBox:'fill-box',transformOrigin:'center',animation:'glitchIn .9s ease-out'}}/>
              )}

              {/* Node body — radial gradient fill from GameNode.jsx nodeStyles */}
              {(() => {
                const bodyFill = isSolved                    ? 'url(#gSolved)'
                               : sn.nodeType==='start'       ? 'url(#gStart)'
                               : sn.nodeType==='checkpoint'  ? 'url(#cpPattern)'
                               : sn.nodeType==='penalty'     ? 'url(#gPenalty)'
                               : sn.nodeType==='final'       ? 'url(#gFinal)'
                               :                               'url(#gNormal)'
                return (
                  <circle r={pos.r} fill={bodyFill} stroke={cfg.stroke}
                    strokeWidth={isSolving ? 3.2 : 2}
                    style={{animation:isSolving?'solvFlash .9s ease-out':'none'}}/>
                )
              })()}

              {/* Icon — from GameNode.jsx nodeIcons */}
              {(()=>{
                const icon = isSolved                    ? '✓'
                           : sn.nodeType==='start'       ? '▶'
                           : sn.nodeType==='checkpoint'  ? '⚑'
                           : sn.nodeType==='penalty'     ? '☠'
                           : sn.nodeType==='final'       ? '★'
                           : isUnlocked                  ? '?'
                           :                               '○'
                const col  = isSolved                    ? '#00E676'
                           : isLocked                    ? '#4A4A4A'
                           : cfg.stroke
                return (
                  <text textAnchor="middle" dominantBaseline="central"
                    y={-4} fontSize={pos.r*.72} fill={col}
                    style={{fontFamily:"'Space Grotesk',sans-serif", pointerEvents:'none', userSelect:'none'}}>
                    {icon}
                  </text>
                )
              })()}

              {/* Label — only START and FINAL show text, all other types show nothing */}
              {(sn.nodeType==='start' || sn.nodeType==='final') && sn.label && (
                <text textAnchor="middle" dominantBaseline="central"
                  y={pos.r*.48} fontSize={pos.r*.38}
                  fill={isSolved?'#00E676':cfg.stroke}
                  opacity=".80"
                  style={{fontFamily:"'Space Grotesk',sans-serif", fontWeight:600, letterSpacing:'.05em', pointerEvents:'none', userSelect:'none'}}>
                  {sn.label}
                </text>
              )}

              {/* Solved center dot — subtle, behind the ✓ icon */}
              {isSolved && <circle r={3} fill="#00E676" opacity=".70"/>}

              </>) /* close !isLocked fragment */}
            </g>
          )
        })}

        {/* Particles */}
        <g>
          {particles.map(p=>(
            <line key={p.id}
              x1={p.cx} y1={p.cy}
              x2={p.cx+Math.cos(p.angle)*p.dist}
              y2={p.cy+Math.sin(p.angle)*p.dist}
              stroke={p.color} strokeWidth="3.2" strokeLinecap="round"
              style={{animation:`ptcFade ${p.life}ms ease-out forwards`}}/>
          ))}
        </g>

      </svg>
    </div>
  )
}