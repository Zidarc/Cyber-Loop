import { useMemo, useState, useEffect, useRef, useCallback } from 'react'
import SplashCursor from '../components/SplashCursor'
import Lightning from '../components/Lightning'

function sleep(ms) { return new Promise(r => setTimeout(r, ms)) }

/* ═══════════════════════════════════════════
   GLOBAL THEME VARIABLES — edit here to restyle everything
═══════════════════════════════════════════ */
const THEME = {
  // ── Background ──
  bgEmberStart:   'rgb(38, 36, 35)',       // warm ember start color on load
  bgDarkEnd:      'rgb(22, 20, 20)',        // deep red-black after transition

  // ── Ember glow (phase 0) ──
  emberGlow:      'rgba(180,40,0,0.12)',
  emberMid:       'rgba(140,20,0,0.07)',
  emberBottom:    'rgba(120,15,0,0.10)',
  emberSides:     'rgba(100,10,0,0.06)',

  // ── Blood red atmosphere (phase 1) ──
  redTop:         'rgba(100,5,0,0.22)',   // lighter red top vignette
  redBottom:      'rgba(80,3,0,0.20)',    // darker red bottom
  redLeftEdge:    'rgba(60,0,10,0.08)',    // purple-crimson left
  redRightEdge:   'rgba(70,8,0,0.07)',   // amber-red right

  // ── Card ──
  cardBg:         'rgba(22,8,6,0.80)',
  cardBorderIdle: 'rgba(200,70,0,0.35)',
  cardBorderGlow: 'rgba(255,100,0,0.50)',

  // ── Canvas particles ──
  emberPalette: [
    [255,80,0],[230,50,0],[200,30,0],
    [255,120,20],[200,60,0],[180,30,0],
    [140,0,0],[100,0,0],[80,0,0],
  ],
  sporeColor:     [255,110,0],
  webNodeColor:   [210,70,0],

  // ── Bulbs ──
  bulbColors: ['#FF4400','#FF7700','#FFAA00','#FF2200','#FF6600','#FFCC33','#FF3300','#FF8800','#FF5500'],

  // ── Button ──
  btnGradient:    'linear-gradient(135deg,#FF6600 0%,#DD2200 40%,#AA0000 100%)',
  btnText:        '#FFF5E0',
  btnGlowIdle:    'rgba(220,80,0,0.55)',
  btnGlowPulse:   'rgba(255,100,0,0.70)',

  // ── Text ──
  labelColor:     '#F0DDD8',
  subtitleColor:  'rgba(255,160,60,0.85)',
  eyebrowColor:   'rgba(255,170,80,0.80)',
  tagColor:       'rgba(255,150,60,0.88)',
  footerColor:    'rgba(220,180,160,0.65)',
  footerDot:      '#FF6600',

  // ── Divider / mirror line ──
  dividerColor:   'rgba(255,110,0,0.80)',

  // ── Title ──
  titleGradient:  'linear-gradient(180deg,#FF6644 0%,#FF2200 30%,#EE0000 65%,#AA0000 100%)',
  titleGlow:      'rgba(255,60,0,1)',
  titleGlowOuter: 'rgba(220,30,0,0.8)',
}

/* ─────────────────────────────────────────
   CANVAS: embers + spores + web (ST palette)
───────────────────────────────────────── */
function SceneCanvas({ cardRef }) {
  const ref = useRef(null)

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

    const PALETTE = THEME.emberPalette

    function getCardRect() {
      if (cardRef && cardRef.current) {
        const r = cardRef.current.getBoundingClientRect()
        return { left:r.left, right:r.right, top:r.top, bottom:r.bottom, h:r.height }
      }
      const W=canvas.width, H=canvas.height
      return { left:W*0.5-200, right:W*0.5+200, top:H*0.1, bottom:H*0.9, h:H*0.8 }
    }

    function spawnEmber(W, H) {
      const rgb  = PALETTE[Math.floor(Math.random()*PALETTE.length)]
      const size = 0.9 + Math.random()*2.0
      const travel = H*(0.20+Math.random()*0.12)
      const card = getCardRect()
      const side = Math.random() < 0.5 ? -1 : 1
      const spawnX = side < 0 ? card.left : card.right
      const spawnY = card.top + Math.random()*card.h
      return {
        x:spawnX, y:spawnY, size,
        vx: side*(0.10+Math.random()*0.22),
        vy: -(0.16+Math.random()*0.28),   // slowed down
        travel, dist:0, rgb,
        wobble:Math.random()*Math.PI*2,
        wobbleSpd:0.008+Math.random()*0.012,
      }
    }

    function spawnSpore(W, H) {
      const side = Math.random()<0.5 ? -1 : 1
      return {
        x: side<0 ? -8 : W+8,
        y: H*0.04+Math.random()*H*0.88,
        r: 0.4+Math.random()*1.4,
        vx: side*(0.06+Math.random()*0.18),
        vy: (Math.random()-0.5)*0.08,
        alpha: 0.08+Math.random()*0.35,
        wobble:Math.random()*Math.PI*2,
        wobbleSpd:0.004+Math.random()*0.007,
        pulse:Math.random()*Math.PI*2,
        pulseSpd:0.012+Math.random()*0.020,
      }
    }

    const W0=canvas.width, H0=canvas.height
    const EMBER_COUNT=60, SPORE_COUNT=45   // reduced

    const embers = Array.from({length:EMBER_COUNT},(_,i)=>{
      const e=spawnEmber(W0,H0)
      e._delay=Math.floor(i*(300/EMBER_COUNT))
      e._ticks=0; e.dist=e.travel
      return e
    })

    const spores = Array.from({length:SPORE_COUNT},()=>{
      const s=spawnSpore(W0,H0); s.x=Math.random()*W0; return s
    })

    // Web nodes — red tint
    let webNodes=[]
    function buildWeb(W,H){
      webNodes=Array.from({length:16},()=>({
        x:Math.random()*W, y:Math.random()*H,
        vx:(Math.random()-0.5)*0.10, vy:(Math.random()-0.5)*0.10,
        r:0.8+Math.random()*1.0, pulse:Math.random()*Math.PI*2,
      }))
    }
    buildWeb(W0,H0)
    window.addEventListener('resize',()=>buildWeb(canvas.width,canvas.height))

    let t=0, rafId=null, paused=false
    const onVis=()=>{paused=document.hidden}
    document.addEventListener('visibilitychange',onVis)

    function render(){
      rafId=requestAnimationFrame(render)
      if(paused) return
      t++
      const W=canvas.width, H=canvas.height
      ctx.clearRect(0,0,W,H)

      // Deep vignette
      const bv=0.65+Math.sin(t*0.014)*0.05
      const vig=ctx.createRadialGradient(W/2,H/2,H*0.10,W/2,H/2,H*0.92)
      vig.addColorStop(0,'rgba(0,0,0,0)')
      vig.addColorStop(0.4,`rgba(0,0,0,${bv*0.22})`)
      vig.addColorStop(1,`rgba(0,0,0,${bv})`)
      ctx.fillStyle=vig; ctx.fillRect(0,0,W,H)

      // Subtle red edge pulse
      const ep=0.06+Math.sin(t*0.025)*0.03
      const eg=ctx.createRadialGradient(W/2,H/2,H*0.3,W/2,H/2,H*1.1)
      eg.addColorStop(0,'rgba(0,0,0,0)')
      eg.addColorStop(1,`rgba(120,0,0,${ep})`)
      ctx.fillStyle=eg; ctx.fillRect(0,0,W,H)

      // Web
      const WD=Math.min(W,H)*0.20
      ctx.save()
      for(const n of webNodes){ n.x+=n.vx; n.y+=n.vy; n.pulse+=0.018; if(n.x<0||n.x>W)n.vx*=-1; if(n.y<0||n.y>H)n.vy*=-1 }
      for(let i=0;i<webNodes.length;i++) for(let j=i+1;j<webNodes.length;j++){
        const a=webNodes[i],b=webNodes[j],dx=a.x-b.x,dy=a.y-b.y,d=Math.sqrt(dx*dx+dy*dy)
        if(d>WD) continue
        const fade=1-d/WD
        ctx.beginPath(); ctx.moveTo(a.x,a.y); ctx.lineTo(b.x,b.y)
        ctx.strokeStyle=`rgba(180,60,0,${fade*0.09})`; ctx.lineWidth=fade*0.6; ctx.stroke()
      }
      for(const n of webNodes){ ctx.beginPath(); ctx.arc(n.x,n.y,n.r,0,Math.PI*2); ctx.fillStyle=`rgba(${THEME.webNodeColor[0]},${THEME.webNodeColor[1]},${THEME.webNodeColor[2]},${0.08+Math.sin(n.pulse)*0.04})`; ctx.fill() }
      ctx.restore()

      // Spores
      for(let i=0;i<spores.length;i++){
        const s=spores[i]
        s.x+=s.vx; s.y+=s.vy; s.wobble+=s.wobbleSpd; s.pulse+=s.pulseSpd; s.y+=Math.sin(s.wobble)*0.05
        if((s.vx>0&&s.x>W+12)||(s.vx<0&&s.x<-12)) Object.assign(s,spawnSpore(W,H))
        const pa=s.alpha*(0.65+Math.sin(s.pulse)*0.25)
        ctx.save(); ctx.globalAlpha=pa
        ctx.strokeStyle=`rgba(${THEME.sporeColor[0]},${THEME.sporeColor[1]},${THEME.sporeColor[2]},${pa*0.4})`; ctx.lineWidth=0.35
        ctx.beginPath(); ctx.moveTo(s.x-s.r*1.6,s.y); ctx.lineTo(s.x+s.r*1.6,s.y); ctx.stroke()
        ctx.beginPath(); ctx.moveTo(s.x,s.y-s.r*1.6); ctx.lineTo(s.x,s.y+s.r*1.6); ctx.stroke()
        const sg=ctx.createRadialGradient(s.x,s.y,0,s.x,s.y,s.r*2.4)
        sg.addColorStop(0,`rgba(${THEME.sporeColor[0]},${THEME.sporeColor[1]},${THEME.sporeColor[2]},${pa})`); sg.addColorStop(0.5,`rgba(180,40,0,${pa*0.5})`); sg.addColorStop(1,'rgba(0,0,0,0)')
        ctx.fillStyle=sg; ctx.beginPath(); ctx.arc(s.x,s.y,s.r*2.4,0,Math.PI*2); ctx.fill(); ctx.restore()
      }

      // Embers
      for(let i=0;i<embers.length;i++){
        const e=embers[i]
        if(e._ticks<e._delay){e._ticks++;continue}
        if(e.dist>=e.travel){Object.assign(e,spawnEmber(W,H));e._delay=0;e._ticks=0;continue}
        e.wobble+=e.wobbleSpd; e.x+=e.vx+Math.sin(e.wobble)*0.08; e.y+=e.vy; e.dist-=e.vy
        const prog=e.dist/e.travel
        const alpha=prog<0.10?prog/0.10:prog>0.60?Math.pow(1-(prog-0.60)/0.40,1.6):1
        if(alpha<0.015) continue
        const [r,g,b]=e.rgb; const bodyR=e.size*(1-prog*0.3)
        ctx.save(); ctx.globalAlpha=alpha; ctx.translate(e.x,e.y); ctx.rotate(e.wobble*0.5)
        const s=bodyR
        ctx.beginPath()
        ctx.moveTo(s*0,-s*1.1); ctx.lineTo(s*0.7,-s*0.6); ctx.lineTo(s*1.0,s*0.1)
        ctx.lineTo(s*0.5,s*0.9); ctx.lineTo(-s*0.2,s*1.0); ctx.lineTo(-s*0.9,s*0.3); ctx.lineTo(-s*0.8,-s*0.7); ctx.closePath()
        ctx.fillStyle=`rgba(${Math.floor(r*0.3)},0,0,1)`; ctx.fill()
        ctx.save(); ctx.clip()
        const inner=ctx.createRadialGradient(s*0.05,-s*0.1,0,s*0.05,-s*0.1,s*0.85)
        inner.addColorStop(0,'rgba(255,180,100,1)')
        inner.addColorStop(0.3,`rgba(${r},${Math.max(g,10)},0,1)`)
        inner.addColorStop(0.7,`rgba(${Math.floor(r*0.5)},0,0,1)`)
        inner.addColorStop(1,'rgba(0,0,0,0)')
        ctx.fillStyle=inner; ctx.fill(); ctx.restore(); ctx.restore()
      }
    }

    rafId=requestAnimationFrame(render)
    return ()=>{ cancelAnimationFrame(rafId); window.removeEventListener('resize',resize); document.removeEventListener('visibilitychange',onVis) }
  },[])

  return <canvas ref={ref} style={{position:'absolute',inset:0,width:'100%',height:'100%',zIndex:2,pointerEvents:'none'}}/>
}

/* ─────────────────────────────────────────
   ST CHRISTMAS LIGHTS
   - Idle: one random bulb flickers at a time
   - Typing: rapid one-by-one flicker
───────────────────────────────────────── */
const ST_COLORS = THEME.bulbColors
const WIRE_SAG = [0,2,4,5,6,5,4,2,0]  // sag offsets

function LightStrip({ typing }) {
  const COUNT = 9
  const [bulbs, setBulbs] = useState(() =>
    Array.from({length:COUNT},(_,i)=>({
      color: ST_COLORS[i%ST_COLORS.length],
      on: true, bri: 1.0,
    }))
  )

  // Idle flicker — one bulb at a time, slow
  useEffect(() => {
    if (typing) return
    const iv = setInterval(() => {
      const idx = Math.floor(Math.random()*COUNT)
      setBulbs(prev => prev.map((b,i) => i===idx
        ? {...b, on:false, bri:0}
        : b
      ))
      setTimeout(() => {
        setBulbs(prev => prev.map((b,i) => i===idx
          ? {...b, on:true, bri:0.7+Math.random()*0.3}
          : b
        ))
      }, 80+Math.random()*120)
    }, 600+Math.random()*800)
    return () => clearInterval(iv)
  }, [typing])

  // Typing flicker — rapid one-by-one
  useEffect(() => {
    if (!typing) return
    let running = true
    let timeouts = []
    function flicker() {
      if (!running) return
      const idx = Math.floor(Math.random()*COUNT)
      setBulbs(prev => prev.map((b,i) => i===idx ? {...b,on:false,bri:0} : b))
      const t1 = setTimeout(()=>{
        setBulbs(prev => prev.map((b,i) => i===idx ? {...b,on:true,bri:0.5+Math.random()*0.5} : b))
      }, 40+Math.random()*80)
      const t2 = setTimeout(flicker, 80+Math.random()*150)
      timeouts.push(t1,t2)
    }
    flicker()
    return () => { running=false; timeouts.forEach(clearTimeout) }
  }, [typing])

  return (
    <div style={{display:'flex',flexDirection:'column',alignItems:'center',marginBottom:'4px'}}>
      {/* Wire */}
      <svg width="100%" height="18" style={{overflow:'visible',display:'block'}}>
        <path
          d={`M 0 6 ${Array.from({length:COUNT},(_,i)=>{
            const x=(i/(COUNT-1))*100
            const sag=WIRE_SAG[i%WIRE_SAG.length]
            return `L ${x}% ${6+sag}`
          }).join(' ')} L 100% 6`}
          fill="none" stroke="rgba(180,180,160,0.25)" strokeWidth="1"
        />
        {/* Bulb wires */}
        {Array.from({length:COUNT},(_,i)=>{
          const x=(i/(COUNT-1))*100
          const sag=WIRE_SAG[i%WIRE_SAG.length]
          return <line key={i} x1={`${x}%`} y1={6+sag} x2={`${x}%`} y2={16+sag} stroke="rgba(180,180,160,0.20)" strokeWidth="0.8"/>
        })}
      </svg>
      {/* Bulbs */}
      <div style={{display:'flex',justifyContent:'space-between',width:'100%',marginTop:'-6px',padding:'0 2px'}}>
        {bulbs.map((b,i)=>(
          <div key={i} style={{
            width:16, height:22,
            borderRadius:'40% 40% 50% 50%',
            background: b.on ? b.color : 'rgba(30,10,10,0.85)',
            boxShadow: b.on
              ? `0 0 ${8*b.bri}px ${b.color}, 0 0 ${18*b.bri}px ${b.color}99, 0 0 ${32*b.bri}px ${b.color}55, 0 0 ${48*b.bri}px ${b.color}22`
              : 'none',
            opacity: b.on ? (0.75+b.bri*0.25) : 0.18,
            transition:'background 0.05s, box-shadow 0.05s',
            marginTop: `${WIRE_SAG[i%WIRE_SAG.length]}px`,
          }}/>
        ))}
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────
   VINE BORDER
───────────────────────────────────────── */
function VineBorder(){
  return (
    <svg style={{position:'absolute',inset:0,width:'100%',height:'100%',pointerEvents:'none',zIndex:1,overflow:'visible'}} preserveAspectRatio="none">
      <defs><style>{`
        @keyframes vg{0%{stroke-dashoffset:700;opacity:0}18%{opacity:0.9}80%{opacity:0.6}100%{stroke-dashoffset:0;opacity:0.45}}
        @keyframes vp{0%,100%{opacity:0.38;filter:drop-shadow(0 0 3px #6B0000)}50%{opacity:0.72;filter:drop-shadow(0 0 8px #AA0000)}}
        .v1{stroke-dasharray:700;animation:vg 3.8s ease-out forwards,vp 4.5s 3.8s ease-in-out infinite}
        .v2{stroke-dasharray:450;animation:vg 3.0s 0.35s ease-out forwards,vp 5.5s 3.35s ease-in-out infinite}
        .v3{stroke-dasharray:280;animation:vg 2.4s 0.7s ease-out forwards,vp 6s 3.1s ease-in-out infinite}
        .v4{stroke-dasharray:350;animation:vg 2.8s 0.2s ease-out forwards,vp 5s 3.0s ease-in-out infinite}
      `}</style></defs>
      <path className="v1" d="M0,45 C12,22 28,10 55,7 C76,5 92,14 105,24 C118,34 122,48 112,62 C104,74 88,80 72,84" fill="none" stroke="#5A0000" strokeWidth="2.0" strokeLinecap="round"/>
      <path className="v2" d="M0,22 C9,8 22,2 44,4 C62,7 75,18 70,38 C66,54 50,62 40,70" fill="none" stroke="#3A0000" strokeWidth="1.2" strokeLinecap="round"/>
      <path className="v3" d="M18,0 C25,14 20,30 30,46 C38,58 54,62 46,76" fill="none" stroke="#480000" strokeWidth="0.9" strokeLinecap="round"/>
      <g transform="rotate(180)" style={{transformOrigin:'50% 50%',transformBox:'fill-box'}}>
        <path className="v1" d="M0,45 C12,22 28,10 55,7 C76,5 92,14 105,24 C118,34 122,48 112,62 C104,74 88,80 72,84" fill="none" stroke="#5A0000" strokeWidth="2.0" strokeLinecap="round"/>
        <path className="v4" d="M0,22 C9,8 22,2 44,4 C62,7 75,18 70,38 C66,54 50,62 40,70" fill="none" stroke="#3A0000" strokeWidth="1.2" strokeLinecap="round"/>
      </g>
    </svg>
  )
}


/* ─────────────────────────────────────────
   SPIDER — crawls around card edges
───────────────────────────────────────── */
function Spider({ cardRef }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    let rafId, t = 0

    function getPosOnPerimeter(card, dist) {
      const { w, h } = card
      const perim = 2 * (w + h)
      let d = ((dist % perim) + perim) % perim
      let x, y, angle
      if (d < w) {
        x = d; y = 0; angle = 0
      } else if (d < w + h) {
        x = w; y = d - w; angle = Math.PI / 2
      } else if (d < 2 * w + h) {
        x = w - (d - w - h); y = h; angle = Math.PI
      } else {
        x = 0; y = h - (d - 2 * w - h); angle = -Math.PI / 2
      }
      return { x, y, angle }
    }

    function drawSpider(x, y, angle, legPhase) {
      ctx.save()
      ctx.translate(x, y)
      ctx.rotate(angle + Math.PI / 2)

      // scale up 2x
      ctx.scale(2.0, 2.0)

      const bc = '#1a1a1a'           // dark charcoal body — visible on card
      const lc = '#2a2a2a'           // slightly lighter legs
      const lcHi = '#444444'         // leg highlight

      // outer glow — amber/red halo
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 16)
      g.addColorStop(0, 'rgba(220,80,0,0.30)')
      g.addColorStop(0.5, 'rgba(160,30,0,0.12)')
      g.addColorStop(1, 'rgba(0,0,0,0)')
      ctx.fillStyle = g
      ctx.beginPath(); ctx.arc(0, 0, 16, 0, Math.PI * 2); ctx.fill()

      // 8 legs — thicker, more visible
      const legDefs = [
        [-1, -0.5, 7, 6], [-1, -1.0, 8, 7], [-1, -1.5, 7, 6], [-1, -2.0, 6, 5],
        [ 1,  0.5, 7, 6], [ 1,  1.0, 8, 7], [ 1,  1.5, 7, 6], [ 1,  2.0, 6, 5],
      ]

      // leg shadow pass first
      ctx.strokeStyle = 'rgba(255,80,0,0.12)'; ctx.lineWidth = 2.2; ctx.lineCap = 'round'
      legDefs.forEach(([side, base, l1, l2], i) => {
        const phase = legPhase + (i % 2 === 0 ? 0 : Math.PI)
        const bend = Math.sin(phase) * 0.35
        const a1 = base + bend * side
        const sx = side * 4, sy = -1 + i * 0.5
        const mx = sx + Math.cos(a1) * l1 * side
        const my = sy + Math.sin(Math.abs(a1)) * l1 - 2
        const a2 = a1 + (side * 0.9 + bend * 0.4)
        const ex = mx + Math.cos(a2) * l2 * side
        const ey = my + Math.sin(Math.abs(a2)) * l2
        ctx.beginPath(); ctx.moveTo(sx, sy); ctx.quadraticCurveTo(mx, my, ex, ey); ctx.stroke()
      })

      // leg main pass
      ctx.strokeStyle = lc; ctx.lineWidth = 1.6
      legDefs.forEach(([side, base, l1, l2], i) => {
        const phase = legPhase + (i % 2 === 0 ? 0 : Math.PI)
        const bend = Math.sin(phase) * 0.35
        const a1 = base + bend * side
        const sx = side * 4, sy = -1 + i * 0.5
        const mx = sx + Math.cos(a1) * l1 * side
        const my = sy + Math.sin(Math.abs(a1)) * l1 - 2
        const a2 = a1 + (side * 0.9 + bend * 0.4)
        const ex = mx + Math.cos(a2) * l2 * side
        const ey = my + Math.sin(Math.abs(a2)) * l2
        ctx.beginPath(); ctx.moveTo(sx, sy); ctx.quadraticCurveTo(mx, my, ex, ey); ctx.stroke()
      })

      // abdomen — dark with red hourglass
      ctx.fillStyle = bc
      ctx.beginPath(); ctx.ellipse(0, 4, 4.5, 6, 0, 0, Math.PI * 2); ctx.fill()
      // abdomen sheen
      const abdSheen = ctx.createRadialGradient(-1, 1, 0, 0, 4, 5)
      abdSheen.addColorStop(0, 'rgba(80,80,80,0.4)')
      abdSheen.addColorStop(1, 'rgba(0,0,0,0)')
      ctx.fillStyle = abdSheen
      ctx.beginPath(); ctx.ellipse(0, 4, 4.5, 6, 0, 0, Math.PI * 2); ctx.fill()
      // red hourglass marking — bright
      ctx.fillStyle = 'rgba(220,40,0,0.95)'
      ctx.beginPath(); ctx.ellipse(0, 3, 1.2, 1.8, 0, 0, Math.PI * 2); ctx.fill()
      ctx.beginPath(); ctx.ellipse(0, 5.5, 0.9, 1.2, 0, 0, Math.PI * 2); ctx.fill()

      // cephalothorax
      ctx.fillStyle = bc
      ctx.beginPath(); ctx.ellipse(0, -2.5, 3.5, 4, 0, 0, Math.PI * 2); ctx.fill()
      // sheen
      const ctSheen = ctx.createRadialGradient(-0.8, -3.5, 0, 0, -2.5, 4)
      ctSheen.addColorStop(0, 'rgba(90,90,90,0.35)')
      ctSheen.addColorStop(1, 'rgba(0,0,0,0)')
      ctx.fillStyle = ctSheen
      ctx.beginPath(); ctx.ellipse(0, -2.5, 3.5, 4, 0, 0, Math.PI * 2); ctx.fill()

      // eyes — bright glowing red
      ctx.fillStyle = 'rgba(255,60,0,1.0)'
      ;[[-1.4,-4.2],[1.4,-4.2],[-0.6,-5.0],[0.6,-5.0]].forEach(([ex,ey]) => {
        ctx.beginPath(); ctx.arc(ex, ey, 0.9, 0, Math.PI*2); ctx.fill()
      })
      // eye glow
      ctx.fillStyle = 'rgba(255,100,0,0.4)'
      ;[[-1.4,-4.2],[1.4,-4.2],[-0.6,-5.0],[0.6,-5.0]].forEach(([ex,ey]) => {
        ctx.beginPath(); ctx.arc(ex, ey, 1.8, 0, Math.PI*2); ctx.fill()
      })

      ctx.restore()
    }

    const SPEED = 0.55
    let dist = 0

    function render() {
      rafId = requestAnimationFrame(render)
      t++
      if (!cardRef.current) return
      const r = cardRef.current.getBoundingClientRect()
      canvas.width  = r.width  + 40
      canvas.height = r.height + 40
      canvas.style.left = (r.left - 20) + 'px'
      canvas.style.top  = (r.top  - 20) + 'px'
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      dist += SPEED
      const pos = getPosOnPerimeter({ w: r.width, h: r.height }, dist)
      drawSpider(pos.x + 20, pos.y + 20, pos.angle, t * 0.18)
    }

    window.addEventListener('resize', () => {
      if (!cardRef.current) return
      const r = cardRef.current.getBoundingClientRect()
      canvas.width = r.width + 40; canvas.height = r.height + 40
      canvas.style.left = (r.left - 20) + 'px'; canvas.style.top = (r.top - 20) + 'px'
    })

    rafId = requestAnimationFrame(render)
    return () => cancelAnimationFrame(rafId)
  }, [])

  return <canvas ref={canvasRef} style={{position:'fixed',pointerEvents:'none',zIndex:20}}/>
}

/* ─────────────────────────────────────────
   UPSIDE DOWN BG — inverted mirrored world
───────────────────────────────────────── */
/* ─────────────────────────────────────────
   ANIMATED BG
   - Ember warm start → fades to dark blood red over 5s
   - Lightning: LEFT → RIGHT → CENTRE, 8s apart, loops
   - Rich color variety: ember orange, amber, crimson, deep red
───────────────────────────────────────── */
function UpsideDownBG() {
  const [phase, setPhase]       = useState(0)      // 0=ember, 1=dark red
  const [boltSlot, setBoltSlot] = useState(null)   // null | 'left' | 'right' | 'centre'

  // ── Ember → dark red transition ──
  useEffect(() => {
    const delay = setTimeout(() => {
      const startT = performance.now()
      const DUR = 5000
      let raf
      function tick() {
        const t = Math.min((performance.now() - startT) / DUR, 1)
        const e = t < 0.5 ? 4*t*t*t : 1 - Math.pow(-2*t+2,3)/2
        setPhase(e)
        if (t < 1) raf = requestAnimationFrame(tick)
      }
      raf = requestAnimationFrame(tick)
      return () => cancelAnimationFrame(raf)
    }, 800)
    return () => clearTimeout(delay)
  }, [])

  // ── Sequential lightning: left → right → centre, 8s apart, loops ──
  useEffect(() => {
    const SEQUENCE = ['left','right','centre']
    const BOLT_DURATION = 700   // how long each bolt stays visible
    const GAP = 8000             // gap between bolts
    let idx = 0
    let timeouts = []

    function showNext() {
      setBoltSlot(SEQUENCE[idx % SEQUENCE.length])
      const t1 = setTimeout(() => {
        setBoltSlot(null)
        const t2 = setTimeout(() => {
          idx++
          showNext()
        }, GAP)
        timeouts.push(t2)
      }, BOLT_DURATION)
      timeouts.push(t1)
    }

    // first bolt appears after the ember→red transition settles (~6s)
    const start = setTimeout(showNext, 6500)
    timeouts.push(start)
    return () => timeouts.forEach(clearTimeout)
  }, [])

  const p = phase

  // ── bg color: interpolate THEME.bgEmberStart → THEME.bgDarkEnd ──
  const [eR,eG,eB] = [38,36,35]  // bgEmberStart
  const [dR,dG,dB] = [22,20,20]  // bgDarkEnd
  const bgR = Math.round(eR + (dR - eR) * p)
  const bgG = Math.round(eG + (dG - eG) * p)
  const bgB = Math.round(eB + (dB - eB) * p)

  // bolt config per slot — different hues for color variety
  const boltConfigs = {
    left:   { hue: 18,  xOffset: -0.75, speed: 1.0, intensity: 2.8, size: 1.1 },  // ember orange-red
    right:  { hue: 355, xOffset:  0.75, speed: 0.85,intensity: 2.6, size: 1.0 },  // pure crimson
    centre: { hue: 8,   xOffset:  0,    speed: 0.95, intensity: 3.2, size: 1.3 },  // deep red-orange
  }

  return (
    <div style={{position:'absolute',inset:0,zIndex:0,overflow:'hidden'}}>

      {/* Base bg — ember warm → near black */}
      <div style={{
        position:'absolute', inset:0,
        background:`rgb(${bgR},${bgG},${bgB})`,
      }}/>

      {/* ── EMBER phase: warm orange radial centre glow ── */}
      <div style={{
        position:'absolute', inset:0,
        background:`radial-gradient(ellipse at 50% 42%, ${THEME.emberGlow} 0%, ${THEME.emberMid} 35%, rgba(120,20,0,0.15) 65%, transparent 85%)`,
        opacity: Math.max(0, 1 - p * 1.6),
        pointerEvents:'none',
      }}/>
      {/* ember bottom warmth */}
      <div style={{
        position:'absolute', bottom:0, left:0, right:0, height:'60%',
        background:`linear-gradient(0deg, ${THEME.emberBottom} 0%, rgba(100,25,0,0.25) 50%, transparent 100%)`,
        opacity: Math.max(0, 1 - p * 1.4),
        pointerEvents:'none',
      }}/>
      {/* amber side streaks */}
      <div style={{
        position:'absolute', inset:0,
        background:`radial-gradient(ellipse at 15% 60%, ${THEME.emberSides} 0%, transparent 50%), radial-gradient(ellipse at 85% 40%, ${THEME.emberSides} 0%, transparent 45%)`,
        opacity: Math.max(0, 1 - p * 1.5),
        pointerEvents:'none',
      }}/>

      {/* ── DARK RED phase: blood atmosphere ── */}
      <div style={{
        position:'absolute', top:0, left:0, right:0, height:'60%',
        background:`linear-gradient(180deg, ${THEME.redTop} 0%, rgba(70,0,0,0.35) 55%, transparent 100%)`,
        opacity: Math.min(1, p * 1.3),
        pointerEvents:'none',
      }}/>
      <div style={{
        position:'absolute', bottom:0, left:0, right:0, height:'60%',
        background:`linear-gradient(0deg, ${THEME.redBottom} 0%, rgba(50,0,0,0.35) 55%, transparent 100%)`,
        opacity: Math.min(1, p * 1.2),
        pointerEvents:'none',
      }}/>
      {/* left edge — purple-crimson */}
      <div style={{
        position:'absolute', inset:0,
        background:`radial-gradient(ellipse at 0% 50%, ${THEME.redLeftEdge} 0%, transparent 45%)`,
        opacity: Math.min(1, p * 1.4),
        pointerEvents:'none',
      }}/>
      {/* right edge — amber-red */}
      <div style={{
        position:'absolute', inset:0,
        background:`radial-gradient(ellipse at 100% 50%, ${THEME.redRightEdge} 0%, transparent 45%)`,
        opacity: Math.min(1, p * 1.4),
        pointerEvents:'none',
      }}/>

      {/* ── SEQUENTIAL LIGHTNING ── */}
      {boltSlot && (() => {
        const cfg = boltConfigs[boltSlot]
        return (
          <div style={{
            position:'absolute', inset:0,
            opacity: 1,
            mixBlendMode:'screen',
            pointerEvents:'none',
            animation:'boltFadeIn 0.3s ease-out',
          }}>
            <style>{`@keyframes boltFadeIn{from{opacity:0}to{opacity:1}}`}</style>
            <Lightning {...cfg}/>
          </div>
        )
      })()}

      {/* Mirror line — shifts from amber → deep red */}
      <div style={{
        position:'absolute', top:'50%', left:0, right:0, height:'1px',
        background: p < 0.5
          ? 'linear-gradient(90deg,transparent,rgba(220,80,0,0.50),rgba(255,100,0,0.80),rgba(220,80,0,0.50),transparent)'
          : 'linear-gradient(90deg,transparent,rgba(160,0,0,0.45),rgba(200,0,0,0.70),rgba(160,0,0,0.45),transparent)',
        transition:'background 1s',
      }}/>

    </div>
  )
}

/* ─────────────────────────────────────────
   MAIN LOGIN
───────────────────────────────────────── */
export default function Login(){
  const [teamName,setTeamName]=useState('')
  const [password,setPassword]=useState('')
  const [error,setError]=useState('')
  const [loading,setLoading]=useState(false)
  const [shake,setShake]=useState(false)
  const [typing,setTyping]=useState(false)
  const cardRef=useRef(null)
  const typingTimer=useRef(null)

  const canSubmit=useMemo(()=>teamName.trim().length>0&&password.trim().length>0&&!loading,[teamName,password,loading])

  // Typing state — turns on bulb frenzy when user is actively typing
  const handleTyping = useCallback(() => {
    setTyping(true)
    clearTimeout(typingTimer.current)
    typingTimer.current=setTimeout(()=>setTyping(false), 1200)
  },[])

  async function handleSubmit(e){
    e.preventDefault(); if(loading) return
    const tn=teamName.trim(),pw=password.trim()
    setError('')
    if(!tn||!pw){ setShake(true); setError('Team name and password are required.'); setTimeout(()=>setShake(false),420); return }
    setLoading(true)
    try{
      await sleep(800)
      sessionStorage.setItem('teamName',tn)

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
    }catch{ setError('Authentication failed. Try again.'); setLoading(false) }
  }

  return (
    <div style={{minHeight:'100vh',position:'relative',overflow:'hidden',display:'flex',alignItems:'center',justifyContent:'center',userSelect:'none',WebkitUserSelect:'none'}}>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@700;900&family=Share+Tech+Mono&family=Barlow:wght@400;500;600&display=swap');
        *{box-sizing:border-box;user-select:none;-webkit-user-select:none} html,body,*{cursor:none!important}
        input{user-select:text!important;-webkit-user-select:text!important}

        @keyframes shakeX{0%,100%{transform:translateX(0)}20%,60%{transform:translateX(-9px)}40%,80%{transform:translateX(9px)}}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes cardFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-4px)}}
        @keyframes blink{0%,49%{opacity:1}50%,100%{opacity:0}}
        @keyframes divShimmer{0%{background-position:-200% center}100%{background-position:200% center}}
        @keyframes noiseShift{0%{background-position:0 0}25%{background-position:12px -6px}50%{background-position:-9px 14px}75%{background-position:6px -11px}100%{background-position:0 0}}

        /* ST title glow flicker */
        @keyframes stTitleFlicker{
          0%,90%,100%{opacity:1;filter:drop-shadow(0 0 6px rgba(160,0,0,0.6)) drop-shadow(0 0 18px rgba(100,0,0,0.35))}
          91%{opacity:0.7;filter:drop-shadow(0 0 6px rgba(180,0,0,0.4))}
          92%{opacity:1;filter:drop-shadow(0 0 10px rgba(180,0,0,0.8)) drop-shadow(0 0 25px rgba(120,0,0,0.5))}
          95%{opacity:0.85;filter:drop-shadow(0 0 10px rgba(160,0,0,0.6))}
          96%{opacity:1;filter:drop-shadow(0 0 18px rgba(180,0,0,0.9))}
        }

        @keyframes borderPulse{
          0%,100%{box-shadow:0 0 0 1px ${THEME.cardBorderIdle} inset, 0 0 30px rgba(180,50,0,0.15), 0 8px 40px rgba(0,0,0,0.65)}
          50%    {box-shadow:0 0 0 1px ${THEME.cardBorderGlow} inset, 0 0 55px rgba(220,70,0,0.22), 0 8px 40px rgba(0,0,0,0.65)}
        }

        @keyframes btnGlow{
          0%,100%{box-shadow:0 4px 20px ${THEME.btnGlowIdle},0 2px 6px rgba(0,0,0,0.7)}
          50%    {box-shadow:0 4px 32px ${THEME.btnGlowPulse},0 2px 6px rgba(0,0,0,0.7),0 0 50px rgba(200,60,0,0.30)}
        }
        @keyframes btnSweep{0%{left:-80%}100%{left:140%}}

        .shake{animation:shakeX 420ms ease-in-out}
        .spin{animation:spin 0.8s linear infinite}
        .card-float{animation:cardFloat 9s ease-in-out infinite}
        .card-border{animation:borderPulse 4s ease-in-out infinite}
        .st-title{animation:stTitleFlicker 7s linear infinite}

        .hell-input{
          width:100%;
          background:rgba(10,4,0,0.50);
          border:1px solid rgba(180,70,0,0.40);
          border-radius:6px;
          padding:11px 14px;
          color:#F5E8D8;
          font-family:'Share Tech Mono',monospace;
          font-size:0.88rem;
          outline:none;
          caret-color:#FF6600;
          transition:border-color .2s,box-shadow .2s,background .2s;
        }
        .hell-input::placeholder{color:rgba(255,180,150,0.50);font-style:italic}
        .hell-input:focus{
          border-color:rgba(220,90,0,0.80);
          background:rgba(14,5,0,0.60);
          box-shadow:0 0 0 3px rgba(200,70,0,0.18),0 0 20px rgba(180,60,0,0.14);
        }

        .login-btn{
          width:100%;padding:13px 0;border:none;border-radius:6px;
          font-family:'Cinzel',serif;font-size:0.82rem;font-weight:700;
          letter-spacing:0.24em;text-transform:uppercase;cursor:pointer;
          position:relative;overflow:hidden;transition:filter .2s,transform .15s;
        }
        .btn-on{
          background:${THEME.btnGradient};
          color:${THEME.btnText};text-shadow:0 1px 6px rgba(0,0,0,0.6);
          animation:btnGlow 3s ease-in-out infinite;
        }
        .btn-on::after{
          content:'';position:absolute;top:0;left:-80%;width:50%;height:100%;
          background:linear-gradient(90deg,transparent,rgba(255,160,60,0.15),transparent);
          transform:skewX(-18deg);animation:btnSweep 4s ease-in-out infinite;
        }
        .btn-on:hover{filter:brightness(1.18);transform:translateY(-2px)}
        .btn-on:active{transform:translateY(0)}
        .btn-off{background:rgba(255,255,255,0.03);color:rgba(200,160,150,0.18);cursor:not-allowed;border:1px solid rgba(80,0,0,0.20)}
      `}</style>

      <UpsideDownBG/>
      <SceneCanvas cardRef={cardRef}/>
      <SplashCursor/>
      <Spider cardRef={cardRef}/>

      {/* Glass login card */}
      <div
        ref={cardRef}
        className={`card-float card-border${shake?' shake':''}`}
        style={{
          position:'relative',zIndex:10,width:'min(92vw,420px)',
          background:THEME.cardBg,
          borderRadius:'14px',
          border:'1px solid rgba(140,0,0,0.28)',
          backdropFilter:'blur(18px) saturate(1.4)',
          WebkitBackdropFilter:'blur(18px) saturate(1.4)',
          padding:'clamp(1.4rem,4vw,2rem) clamp(1.2rem,4vw,1.9rem)',
          overflow:'hidden',
          boxShadow:'0 0 0 1px rgba(120,0,0,0.15) inset, 0 8px 40px rgba(0,0,0,0.7), 0 0 60px rgba(80,0,0,0.08)',
        }}
      >
        <VineBorder/>

        {/* Noise overlay */}
        <div style={{
          position:'absolute',inset:0,pointerEvents:'none',zIndex:0,borderRadius:'14px',
          backgroundImage:'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.92\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\'/%3E%3C/svg%3E")',
          backgroundSize:'175px',opacity:0.022,animation:'noiseShift 0.45s steps(1) infinite',mixBlendMode:'overlay',
        }}/>

        {/* Top shimmer */}
        <div style={{position:'absolute',top:0,left:'8%',right:'8%',height:'1px',background:'linear-gradient(90deg,transparent,rgba(180,0,0,0.55),rgba(220,40,40,0.7),rgba(180,0,0,0.55),transparent)',backgroundSize:'200% 100%',animation:'divShimmer 5s linear infinite'}}/>

        <div style={{position:'relative',zIndex:2}}>

          {/* Lights */}
          <LightStrip typing={typing}/>

          {/* Title */}
          <div style={{textAlign:'center',marginBottom:'1.1rem',marginTop:'4px'}}>
            <h1
              className="st-title"
              style={{
                fontFamily:'"Cinzel",serif',
                fontWeight:900,
                letterSpacing:'0.06em',
                lineHeight:1.0,
                margin:0,
                display:'flex',
                flexDirection:'column',
                alignItems:'center',
                gap:'0.05em',
              }}
            >
              <span style={{
                fontSize:'clamp(2.0rem,7.5vw,2.9rem)',
                background:'linear-gradient(180deg,#CC1100 0%,#8B0000 55%,#5A0000 100%)',
                WebkitBackgroundClip:'text',
                WebkitTextFillColor:'transparent',
                backgroundClip:'text',
              }}>RECURSION</span>
              <span style={{
                fontSize:'clamp(2.2rem,8.2vw,3.2rem)',
                background:'linear-gradient(180deg,#AA0000 0%,#6B0000 50%,#3A0000 100%)',
                WebkitBackgroundClip:'text',
                WebkitTextFillColor:'transparent',
                backgroundClip:'text',
              }}>HELL</span>
            </h1>

            <p style={{fontFamily:'"Share Tech Mono",monospace',fontSize:'0.54rem',color:THEME.subtitleColor,letterSpacing:'0.22em',marginTop:'0.55rem'}}>
              THE &nbsp; UPSIDE &nbsp; DOWN &nbsp; ∞
            </p>
          </div>

          {/* Divider */}
          <div style={{height:'1px',marginBottom:'1.2rem',background:`linear-gradient(90deg,transparent,rgba(200,80,0,0.55),${THEME.dividerColor},rgba(200,80,0,0.55),transparent)`}}/>

          {/* Error */}
          {error&&(
            <div style={{display:'flex',alignItems:'flex-start',gap:'0.5rem',background:'rgba(80,0,0,0.38)',border:'1px solid rgba(160,0,0,0.45)',borderRadius:'6px',padding:'9px 13px',marginBottom:'1rem',fontFamily:'"Share Tech Mono",monospace',fontSize:'0.80rem',color:'#F5E8D8',lineHeight:1.45}}>
              <span style={{color:'#CC0000',flexShrink:0}}>⚠</span>{error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} style={{display:'flex',flexDirection:'column',gap:'1rem'}}>
            <div>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'baseline',marginBottom:'0.36rem'}}>
                <label style={{fontFamily:'"Barlow",sans-serif',fontSize:'0.78rem',fontWeight:600,color:THEME.labelColor}}>Team Name</label>
                <span style={{fontFamily:'"Share Tech Mono",monospace',fontSize:'0.52rem',color:THEME.tagColor,letterSpacing:'0.08em'}}>IDENTIFIER</span>
              </div>
              <input
                className="hell-input"
                value={teamName}
                onChange={e=>{setTeamName(e.target.value);handleTyping()}}
                autoComplete="username" spellCheck={false}
                placeholder="e.g. StackSmashers"
              />
            </div>
            <div>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'baseline',marginBottom:'0.36rem'}}>
                <label style={{fontFamily:'"Barlow",sans-serif',fontSize:'0.78rem',fontWeight:600,color:THEME.labelColor}}>Password</label>
                <span style={{fontFamily:'"Share Tech Mono",monospace',fontSize:'0.52rem',color:THEME.tagColor,letterSpacing:'0.08em'}}>ENCRYPTED</span>
              </div>
              <input
                className="hell-input"
                type="password"
                value={password}
                onChange={e=>{setPassword(e.target.value);handleTyping()}}
                autoComplete="current-password"
                placeholder="••••••••"
              />
            </div>

            <button type="submit" disabled={!canSubmit} className={`login-btn ${canSubmit?'btn-on':'btn-off'}`} style={{marginTop:'0.2rem'}}>
              {loading?(
                <span style={{display:'inline-flex',alignItems:'center',gap:'0.5rem',justifyContent:'center'}}>
                  <span className="spin" style={{display:'inline-block',width:13,height:13,borderRadius:'50%',border:'2px solid rgba(255,255,255,0.18)',borderTop:'2px solid #E8DDD0'}}/>
                  Descending…
                </span>
              ):'Descent'}
            </button>
          </form>

          {/* Footer */}
          <div style={{marginTop:'1rem',paddingTop:'0.75rem',borderTop:'1px solid rgba(100,0,0,0.18)',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
            <span style={{fontFamily:'"Share Tech Mono",monospace',fontSize:'0.52rem',color:THEME.footerColor,letterSpacing:'0.06em'}}>// v1.0 — stack depth: ∞</span>
            <span style={{display:'flex',alignItems:'center',gap:'0.32rem'}}>
              <span style={{width:5,height:5,borderRadius:'50%',background:'#CC0000',boxShadow:'0 0 7px rgba(200,0,0,0.95)',animation:'blink 1.8s step-start infinite',display:'inline-block'}}/>
              <span style={{fontFamily:'"Share Tech Mono",monospace',fontSize:'0.52rem',color:'rgba(255,100,70,0.88)',letterSpacing:'0.06em'}}>CONTEST LIVE</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}