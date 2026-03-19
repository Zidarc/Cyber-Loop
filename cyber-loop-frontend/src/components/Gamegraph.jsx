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
  9:  { x: 52,   y: 430, r: 18 },  // penalty
  10: { x: 1348, y: 430, r: 18 },  // penalty
  11: { x: 52,   y: 660, r: 18 },  // penalty
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
// COLOUR CONFIG
// solved=green, penalty=red, checkpoint=cyan, final=gold, normal=orange
// ─────────────────────────────────────────────────────────────────────────────
const TYPE_CFG = {
  start:      { stroke:'#FFD700', fill:'rgba(255,210,0,0.13)',  glow:'rgba(255,210,0,0.72)',  anim:'nodeBreath',  dur:'2.8s' },
  normal:     { stroke:'#FF6600', fill:'rgba(255,90,0,0.10)',   glow:'rgba(255,90,0,0.68)',   anim:'nodeBreath',  dur:'3.3s' },
  checkpoint: { stroke:'#00E5FF', fill:'rgba(0,220,255,0.11)',  glow:'rgba(0,229,255,0.75)',  anim:'checkBreath', dur:'2.4s' },
  penalty:    { stroke:'#FF1A1A', fill:'rgba(220,0,0,0.12)',    glow:'rgba(255,0,0,0.78)',    anim:'penThrob',    dur:'1.0s' },
  final:      { stroke:'#FFE545', fill:'rgba(255,215,0,0.14)',  glow:'rgba(255,225,0,0.82)',  anim:'finalBreath', dur:'2.0s' },
}
const SOLVED_CFG = {
  stroke:'#00E676', fill:'rgba(0,220,110,0.12)', glow:'rgba(0,230,118,0.75)', anim:'solvedBreath', dur:'2.6s',
}
const LOCKED_CFG = {
  stroke:'rgba(50,40,70,0.40)', fill:'rgba(10,8,20,0.78)', glow:null, anim:null, dur:null,
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
export default function GameGraph({nodes,onNodeClick,animEvents=[]}) {
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

  // Detect newly lit edges and start fuse animation
  useEffect(()=>{
    const current=new Set(litKeyStr?litKeyStr.split(','):[])
    const newly=[]
    current.forEach(k=>{if(!prevLitRef.current.has(k))newly.push(k)})
    prevLitRef.current=current
    if(!newly.length) return
    setLitEdgeState(prev=>{
      const next={...prev}
      newly.forEach(k=>{next[k]='animating'})
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
        const col=ev.nodeType==='final'?'#FFD700':ev.nodeType==='checkpoint'?'#00E5FF':'#00E676'
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

        /* Glow pulses — opacity only, no ring, no scale. The blur filter on the
           filled circle is what produces the soft corona effect.               */
        @keyframes nodeBreath   { 0%,100%{opacity:.13} 50%{opacity:.72} }
        @keyframes checkBreath  { 0%,100%{opacity:.15} 50%{opacity:.82} }
        @keyframes solvedBreath { 0%,100%{opacity:.14} 50%{opacity:.74} }
        @keyframes penThrob     { 0%,100%{opacity:.20} 50%{opacity:.98} }
        @keyframes finalBreath  { 0%,100%{opacity:.20} 50%{opacity:.92} }
        @keyframes atmosphereF  { 0%,100%{opacity:.03} 50%{opacity:.18} }
        @keyframes decoyPulse   { 0%,100%{opacity:.10}                   50%{opacity:.32} }

        /* Pulsing line glow — the lit path edges breathe in opacity */
        @keyframes edgeGlow     { 0%,100%{opacity:.32} 50%{opacity:1.0} }
        @keyframes edgeGlowFast { 0%,100%{opacity:.40} 50%{opacity:1.0} }
        @keyframes spinR        { from{transform:rotate(0deg)}              to{transform:rotate(360deg)}           }
        @keyframes spinL        { from{transform:rotate(0deg)}              to{transform:rotate(-360deg)}          }

        @keyframes graphShake  { 0%,100%{transform:translate(0,0)} 15%{transform:translate(-6px,4px)} 30%{transform:translate(7px,-4px)} 50%{transform:translate(-5px,6px)} 70%{transform:translate(6px,-4px)} }
        @keyframes solvePing   { 0%{r:0;opacity:.88} 100%{r:76;opacity:0} }
        @keyframes lockFlash   { 0%{opacity:1}        100%{opacity:.12}   }
        @keyframes glitchIn    { 0%{opacity:0;transform:scale(.08)} 18%{opacity:1;transform:scale(1.40)} 36%{opacity:0;transform:scale(.82)} 54%{opacity:1;transform:scale(1.14)} 70%{opacity:0;transform:scale(.92)} 86%{opacity:1;transform:scale(1.05)} 100%{opacity:1;transform:scale(1)} }
        @keyframes solvFlash   { 0%{opacity:1} 50%{opacity:.60} 100%{opacity:1} }
        @keyframes finalBoomA  { 0%{opacity:0} 12%{opacity:.74} 100%{opacity:0} }
        @keyframes ptcFade     { 0%{opacity:1} 100%{opacity:0}  }

        .node-unlocked { cursor: pointer !important; }
      `}</style>

      {finalBoom&&(
        <div style={{position:'absolute',inset:0,zIndex:5,pointerEvents:'none',
          background:'radial-gradient(ellipse 72% 55% at 50% 92%,rgba(255,225,0,.45) 0%,rgba(255,255,255,.10) 40%,transparent 65%)',
          animation:'finalBoomA 1.8s ease-out forwards'}}/>
      )}

      <svg viewBox="0 0 1400 860" width="100%" height="100%"
        style={{display:'block'}} preserveAspectRatio="xMidYMid meet">

        {/* Ghost path — faint dashed lines hint at the structure */}
        <g>
          {GAME_PATH.slice(0,-1).map((fid,i)=>{
            const tid=GAME_PATH[i+1],a=NODE_LAYOUT[fid],b=NODE_LAYOUT[tid]
            if(!a||!b) return null
            return <line key={`ghost-${fid}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y}
              stroke="rgba(80,50,100,0.15)" strokeWidth="1.5" strokeDasharray="5 10"/>
          })}
        </g>

        {/* Web threads — shimmer wave sweeps left to right */}
        <g>
          {webEdges.map((e,i)=>(
            <line key={i} className={`ws${e.bucket}`}
              x1={e.ax} y1={e.ay} x2={e.bx} y2={e.by}
              stroke="rgba(145,28,0,1)" strokeWidth="0.65"/>
          ))}
        </g>

        {/* Lit path edges
            • Line draws itself: stroke-dashoffset transitions from full-length → 0
              in 0.85s, matching the fuse dot travel. All three layers draw together.
            • After drawn: the three layers pulse in opacity via edgeGlow.
            • Traveling pulse orb: a blurred glow ball rides the path repeatedly,
              visible only during travel (~40% of each 2.6s cycle), then hides,
              then repeats — the "energy flowing from node to node" effect.       */}
        <g>
          {GAME_PATH.slice(0,-1).map((fid,i)=>{
            const tid=GAME_PATH[i+1],key=`${fid}-${tid}`,eSt=litEdgeState[key]
            if(!eSt) return null
            const a=NODE_LAYOUT[fid],b=NODE_LAYOUT[tid]; if(!a||!b) return null
            const done=eSt==='done'
            const path=`M${a.x},${a.y} L${b.x},${b.y}`
            // Line length for stroke-dashoffset draw animation
            const dist=Math.hypot(b.x-a.x,b.y-a.y)
            return (
              <g key={`le-${key}`}>
                {/* Outer halo — blurred wide line, draws itself then pulses */}
                <line x1={a.x} y1={a.y} x2={b.x} y2={b.y}
                  stroke="rgba(255,100,0,1)" strokeWidth="28"
                  strokeDasharray={dist}
                  style={{
                    strokeDashoffset: done ? 0 : dist,
                    transition: 'stroke-dashoffset 0.85s ease-out',
                    filter: 'blur(14px)',
                    animation: done ? 'edgeGlow 2.8s ease-in-out infinite' : 'none',
                  }}/>
                {/* Mid glow — draws itself then pulses faster */}
                <line x1={a.x} y1={a.y} x2={b.x} y2={b.y}
                  stroke="rgba(255,130,0,1)" strokeWidth="8"
                  strokeDasharray={dist}
                  style={{
                    strokeDashoffset: done ? 0 : dist,
                    transition: 'stroke-dashoffset 0.85s ease-out',
                    filter: 'blur(5px)',
                    animation: done ? 'edgeGlowFast 2.8s ease-in-out infinite' : 'none',
                  }}/>
                {/* Core sharp line — draws itself */}
                <line x1={a.x} y1={a.y} x2={b.x} y2={b.y}
                  stroke="rgba(255,160,40,0.92)" strokeWidth="1.6"
                  strokeDasharray={dist}
                  style={{
                    strokeDashoffset: done ? 0 : dist,
                    transition: 'stroke-dashoffset 0.85s ease-out',
                    animation: done ? 'edgeGlowFast 2.8s ease-in-out infinite' : 'none',
                  }}/>
                {/* Fuse dot — leads the line as it draws (animating phase only) */}
                {eSt==='animating'&&(
                  <>
                    <circle r={14} fill="rgba(255,140,0,.22)" style={{filter:'blur(7px)'}}>
                      <animateMotion dur="0.85s" fill="freeze" path={path}/>
                    </circle>
                    <circle r={5} fill="#FFAA00">
                      <animateMotion dur="0.85s" fill="freeze" path={path}/>
                    </circle>
                  </>
                )}
                {/* Traveling pulse orb — repeats indefinitely on completed edges.
                    keyTimes: invisible start → fade in → travel visible → fade out → long pause */}
                {done&&(
                  <g>
                    {/* Outer bloom of the orb */}
                    <circle r={16} fill="rgba(255,110,0,0.85)" style={{filter:'blur(11px)'}}>
                      <animateMotion dur="2.6s" repeatCount="indefinite" path={path}/>
                      <animate attributeName="opacity"
                        values="0;0;1;1;0;0"
                        keyTimes="0;0.04;0.10;0.42;0.50;1"
                        dur="2.6s" repeatCount="indefinite"/>
                    </circle>
                    {/* Bright core of the orb */}
                    <circle r={5} fill="#FFD080">
                      <animateMotion dur="2.6s" repeatCount="indefinite" path={path}/>
                      <animate attributeName="opacity"
                        values="0;0;1;1;0;0"
                        keyTimes="0;0.04;0.10;0.42;0.50;1"
                        dur="2.6s" repeatCount="indefinite"/>
                    </circle>
                  </g>
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
              {/* ── Glow layers — filled blurred circles all at r=pos.r.
                   Rendered BEFORE the solid body, so the opaque body covers the
                   centre portion. Only the blur that radiates OUTWARD past the
                   circle edge is visible — a clean halo, not a blob.            ── */}

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

              {/* Penalty glitch bloom on appear */}
              {isPenIn&&(
                <circle r={pos.r} fill="rgba(255,0,0,0.70)"
                  style={{filter:'blur(18px)',transformBox:'fill-box',transformOrigin:'center',animation:'glitchIn .9s ease-out'}}/>
              )}

              {/* Node body */}
              <circle r={pos.r} fill={cfg.fill} stroke={cfg.stroke}
                strokeWidth={isSolving?3.4:isActive?2.1:.8}
                style={{animation:isSolving?'solvFlash .9s ease-out':'none'}}/>

              {/* Inner detail ring */}
              {!isLocked&&(
                <circle r={pos.r-7} fill="none" stroke={cfg.stroke} strokeWidth=".42" opacity=".30"/>
              )}

              {/* CHECKPOINT — two counter-rotating diamond rings */}
              {isCheck&&isActive&&(
                <>
                  <rect x={-6} y={-6} width={12} height={12} rx="1"
                    fill="none" stroke="#00E5FF" strokeWidth="1.1" opacity=".78"
                    style={{transformBox:'fill-box',transformOrigin:'center',animation:'spinR 9s linear infinite'}}/>
                  <rect x={-4} y={-4} width={8} height={8} rx=".5"
                    fill="none" stroke="rgba(0,229,255,.45)" strokeWidth=".8"
                    style={{transformBox:'fill-box',transformOrigin:'center',animation:'spinL 6s linear infinite'}}/>
                </>
              )}

              {/* FINAL — slowly rotating hexagon */}
              {isFinal&&isActive&&(
                <polygon
                  points={Array.from({length:6},(_,i)=>{
                    const a=(i/6)*Math.PI*2-Math.PI/2
                    return `${Math.cos(a)*9},${Math.sin(a)*9}`
                  }).join(' ')}
                  fill="rgba(255,215,0,.58)" stroke="none"
                  style={{transformBox:'fill-box',transformOrigin:'center',animation:'spinR 20s linear infinite'}}/>
              )}

              {/* Solved center dot */}
              {isSolved&&<circle r={4.5} fill="#00E676" opacity=".96"/>}

              {/* Penalty active center dot */}
              {isPenalty&&isActive&&!isSolved&&<circle r={3.5} fill="#FF1A1A" opacity=".92"/>}
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