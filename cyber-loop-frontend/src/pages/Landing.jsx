import { useState, useEffect, useRef } from 'react'
import SplashCursor from '../components/SplashCursor'
import Lightning from '../components/Lightning'

const T = {
  bg:          '#0a0809',
  rulebookPdf: '/rulebook.pdf',
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
    const rsz = () => { c.width = innerWidth; c.height = innerHeight }
    rsz(); addEventListener('resize', rsz)
    const se = () => {
      const rgb = EP[Math.floor(Math.random()*EP.length)]
      return { x:Math.random()*c.width, y:c.height+10, vx:(Math.random()-.5)*.28, vy:-(.16+Math.random()*.28),
        size:.6+Math.random()*1.8, travel:c.height*(.32+Math.random()*.18), dist:0, rgb,
        wobble:Math.random()*Math.PI*2, wSpd:.006+Math.random()*.010 }
    }
    const em = Array.from({length:30},()=>{ const e=se(); e.y=Math.random()*c.height; return e })
    let raf, paused=false
    document.addEventListener('visibilitychange',()=>{ paused=document.hidden })
    function draw() {
      raf=requestAnimationFrame(draw); if(paused) return
      const W=c.width,H=c.height; x.clearRect(0,0,W,H)
      for(const e of em) {
        if(e.dist>=e.travel){Object.assign(e,se());continue}
        e.wobble+=e.wSpd; e.x+=e.vx+Math.sin(e.wobble)*.07; e.y+=e.vy; e.dist-=e.vy
        const p=e.dist/e.travel, al=p<.12?p/.12:p>.55?Math.pow(1-(p-.55)/.45,1.8):1
        if(al<.02) continue
        const [r,g]=e.rgb,sz=e.size*(1-p*.25)
        x.save(); x.globalAlpha=al*.5; x.translate(e.x,e.y); x.rotate(e.wobble*.4)
        x.beginPath()
        x.moveTo(0,-sz*1.1); x.lineTo(sz*.7,-sz*.5); x.lineTo(sz*.9,sz*.2)
        x.lineTo(sz*.4,sz*.9); x.lineTo(-sz*.3,sz*.9); x.lineTo(-sz*.9,sz*.2); x.lineTo(-sz*.7,-sz*.5); x.closePath()
        x.fillStyle=`rgba(${r*.25|0},0,0,1)`; x.fill(); x.save(); x.clip()
        const ig=x.createRadialGradient(0,-sz*.1,0,0,-sz*.1,sz*.8)
        ig.addColorStop(0,'rgba(255,200,120,1)'); ig.addColorStop(.3,`rgba(${r},${Math.max(g,8)},0,1)`)
        ig.addColorStop(.75,`rgba(${r*.45|0},0,0,1)`); ig.addColorStop(1,'rgba(0,0,0,0)')
        x.fillStyle=ig; x.fill(); x.restore(); x.restore()
      }
    }
    raf=requestAnimationFrame(draw)
    return()=>{ cancelAnimationFrame(raf); removeEventListener('resize',rsz) }
  },[])
  return <canvas ref={ref} style={{position:'fixed',inset:0,zIndex:4,pointerEvents:'none'}}/>
}

/* ══════════════════════════════════════════════════════
   LIGHTNING
══════════════════════════════════════════════════════ */
function LightningLayer() {
  const [bolts, setBolts] = useState([])
  useEffect(()=>{
    const CONFIGS = [
      {id:'L', hue:18,  xOffset:-.80, speed:1.1, intensity:3.2, size:1.3, opacity:.60},
      {id:'C', hue:8,   xOffset:0,    speed:.90, intensity:4.0, size:1.6, opacity:.70},
      {id:'R', hue:355, xOffset:.80,  speed:.85, intensity:3.0, size:1.2, opacity:.55},
    ]
    let ts=[]
    const fire = () => {
      const count = Math.random()<.4?2:1
      const picked = [...CONFIGS].sort(()=>Math.random()-.5).slice(0,count)
      setBolts(picked)
      ts.push(setTimeout(()=>{
        setBolts([])
        ts.push(setTimeout(fire, 8000+Math.random()*6000))
      }, 500+Math.random()*300))
    }
    ts.push(setTimeout(fire, 3000))
    return()=>ts.forEach(clearTimeout)
  },[])
  if(!bolts.length) return null
  return (
    <div style={{position:'fixed',inset:0,zIndex:3,pointerEvents:'none',mixBlendMode:'screen'}}>
      {bolts.map(b=>(
        <div key={b.id} style={{position:'absolute',inset:0,opacity:b.opacity}}>
          <Lightning hue={b.hue} xOffset={b.xOffset} speed={b.speed} intensity={b.intensity} size={b.size}/>
        </div>
      ))}
    </div>
  )
}

/* ══════════════════════════════════════════════════════
   MAGNETIC BUTTON — whole button flips 180deg on hover
══════════════════════════════════════════════════════ */
function MagneticEnterBtn({ onClick }) {
  const wrapRef = useRef(null)   // magnetic wrapper — translates
  const btnRef  = useRef(null)   // inner btn — rotates
  const pos = useRef({x:0,y:0})
  const raf = useRef(null)

  function onMove(e) {
    const r = wrapRef.current?.getBoundingClientRect(); if(!r) return
    const dx = e.clientX-(r.left+r.width/2), dy = e.clientY-(r.top+r.height/2)
    const dist = Math.sqrt(dx*dx+dy*dy), radius = 140
    pos.current = dist < radius
      ? { x: dx/dist*(1-dist/radius)*28, y: dy/dist*(1-dist/radius)*28 }
      : { x:0, y:0 }
    if(!raf.current) raf.current = requestAnimationFrame(()=>{
      raf.current=null
      if(wrapRef.current) wrapRef.current.style.transform=`translate(${pos.current.x}px,${pos.current.y}px)`
    })
  }

  function onEnter() {
    if(btnRef.current) btnRef.current.style.transform = 'rotateX(180deg)'
  }
  function onLeave() {
    if(btnRef.current) btnRef.current.style.transform = 'rotateX(0deg)'
    pos.current={x:0,y:0}
    if(wrapRef.current) wrapRef.current.style.transform='translate(0,0)'
  }

  useEffect(()=>{ window.addEventListener('mousemove',onMove); return()=>window.removeEventListener('mousemove',onMove) },[])

  return (
    /* magnetic outer wrapper */
    <div ref={wrapRef} style={{transition:'transform .35s cubic-bezier(.23,1,.32,1)',perspective:'600px'}}>
      {/* rotating inner */}
      <div
        ref={btnRef}
        style={{
          transition:'transform .55s cubic-bezier(.23,1,.32,1)',
          transformStyle:'preserve-3d',
        }}
      >
        <button
          onClick={onClick}
          onMouseEnter={onEnter}
          onMouseLeave={onLeave}
          style={{
            position:'relative', padding:'20px 72px', borderRadius:50,
            background:'rgba(8,5,10,0.55)',
            border:'1px solid rgba(255,255,255,0.15)',
            backdropFilter:'blur(20px)',
            boxShadow:'inset 0 1px 0 rgba(255,255,255,0.10),0 8px 40px rgba(180,40,0,0.40)',
            overflow:'hidden', cursor:'none',
            transition:'box-shadow .25s,border-color .25s',
            display:'block',
          }}
          onMouseEnter={e=>{ onEnter(); e.currentTarget.style.boxShadow='inset 0 1px 0 rgba(255,255,255,0.22),0 16px 70px rgba(220,60,0,0.70)'; e.currentTarget.style.borderColor='rgba(255,120,60,0.55)' }}
          onMouseLeave={e=>{ onLeave(); e.currentTarget.style.boxShadow='inset 0 1px 0 rgba(255,255,255,0.10),0 8px 40px rgba(180,40,0,0.40)'; e.currentTarget.style.borderColor='rgba(255,255,255,0.15)' }}
        >
          {/* shimmer */}
          <div style={{position:'absolute',top:0,left:'-80%',width:'60%',height:'100%',
            background:'linear-gradient(90deg,transparent,rgba(255,200,150,0.12),transparent)',
            transform:'skewX(-18deg)',animation:'sweep 3.5s ease-in-out infinite',pointerEvents:'none'}}/>
          <span style={{
            fontFamily:'"Cinzel",serif', fontWeight:700, fontSize:'1rem',
            letterSpacing:'.28em', textTransform:'uppercase',
            color:'#F5E8DC', display:'block',
            textShadow:'0 0 24px rgba(255,100,30,0.80)',
            whiteSpace:'nowrap',
          }}>Enter the Upside Down</span>
        </button>
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════
   RULEBOOK MODAL
══════════════════════════════════════════════════════ */
function RulebookModal({ onClose }) {
  useEffect(()=>{
    const fn=e=>{ if(e.key==='Escape') onClose() }
    addEventListener('keydown',fn); return()=>removeEventListener('keydown',fn)
  },[])
  return (
    <div onClick={e=>e.target===e.currentTarget&&onClose()} style={{
      position:'fixed',inset:0,zIndex:200,
      background:'rgba(0,0,0,0.82)',backdropFilter:'blur(12px)',
      display:'flex',alignItems:'center',justifyContent:'center',padding:20,
      animation:'fadeIn .2s ease-out',
    }}>
      <div style={{
        width:'min(96vw,860px)',height:'min(90vh,680px)',
        background:'rgba(12,10,14,0.97)',
        border:'1px solid rgba(255,255,255,0.09)',borderRadius:16,
        display:'flex',flexDirection:'column',overflow:'hidden',
        boxShadow:'0 40px 100px rgba(0,0,0,0.85)',
      }}>
        <div style={{
          display:'flex',alignItems:'center',justifyContent:'space-between',
          padding:'14px 20px',borderBottom:'1px solid rgba(255,255,255,0.07)',
          background:'rgba(255,255,255,0.025)',
        }}>
          <span style={{fontFamily:'"Cinzel",serif',fontSize:'.80rem',fontWeight:700,letterSpacing:'.16em',color:'#DDD0C8'}}>RULEBOOK</span>
          <div style={{display:'flex',gap:10,alignItems:'center'}}>
            <a href={T.rulebookPdf} download style={{
              fontFamily:'"Share Tech Mono",monospace',fontSize:'.65rem',
              color:'rgba(220,100,40,0.85)',letterSpacing:'.06em',textDecoration:'none',
              padding:'5px 14px',border:'1px solid rgba(200,70,0,0.30)',borderRadius:6,transition:'all .15s',
            }}
            onMouseEnter={e=>{ e.target.style.background='rgba(200,70,0,0.14)'; e.target.style.color='rgba(255,140,60,1)' }}
            onMouseLeave={e=>{ e.target.style.background='transparent'; e.target.style.color='rgba(220,100,40,0.85)' }}
            >↓ DOWNLOAD</a>
            <button onClick={onClose} style={{
              background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.10)',
              borderRadius:6,color:'rgba(200,180,170,0.70)',width:30,height:30,
              cursor:'pointer',fontSize:'1.1rem',display:'flex',alignItems:'center',justifyContent:'center',
              transition:'background .15s',
            }}
            onMouseEnter={e=>e.target.style.background='rgba(255,255,255,0.14)'}
            onMouseLeave={e=>e.target.style.background='rgba(255,255,255,0.06)'}
            >×</button>
          </div>
        </div>
        <iframe src={T.rulebookPdf} style={{flex:1,border:'none',background:'#111'}} title="Rulebook"/>
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════
   CORNER BRACKET BUTTON — for nav items
══════════════════════════════════════════════════════ */
function CornerBtn({ label, onClick }) {
  const C = 'rgba(200,80,30,0.70)'   // corner colour
  const s = 7                         // corner arm length px
  const t = 1                         // border thickness px
  return (
    <button onClick={onClick} style={{
      position:'relative', background:'none', border:'none', cursor:'none',
      padding:'7px 12px', fontFamily:'"Share Tech Mono",monospace',
      fontSize:'.70rem', letterSpacing:'.14em',
      color:'rgba(210,170,135,0.65)', transition:'color .18s',
    }}
    onMouseEnter={e=>{
      e.currentTarget.style.color='rgba(255,210,160,1)'
      e.currentTarget.querySelectorAll('.cb-corner').forEach(el=>{ el.style.opacity='1' })
    }}
    onMouseLeave={e=>{
      e.currentTarget.style.color='rgba(210,170,135,0.65)'
      e.currentTarget.querySelectorAll('.cb-corner').forEach(el=>{ el.style.opacity='0' })
    }}
    >
      {/* four corners */}
      {[
        {top:0,  left:0,  borderTop:`${t}px solid ${C}`, borderLeft:`${t}px solid ${C}`,  width:s, height:s},
        {top:0,  right:0, borderTop:`${t}px solid ${C}`, borderRight:`${t}px solid ${C}`, width:s, height:s},
        {bottom:0, left:0,  borderBottom:`${t}px solid ${C}`, borderLeft:`${t}px solid ${C}`,  width:s, height:s},
        {bottom:0, right:0, borderBottom:`${t}px solid ${C}`, borderRight:`${t}px solid ${C}`, width:s, height:s},
      ].map((style,i)=>(
        <span key={i} className="cb-corner" style={{
          position:'absolute', opacity:0, transition:'opacity .18s', pointerEvents:'none', ...style,
        }}/>
      ))}
      {label}
    </button>
  )
}

/* ══════════════════════════════════════════════════════
   FLOATING RULEBOOK BUTTON
══════════════════════════════════════════════════════ */
function FloatingRulebookBtn({ onClick }) {
  const [hovered, setHovered] = useState(false)
  return (
    /* outer wrapper handles float — inner handles scale/expand so they don't fight */
    <div style={{
      position:'fixed', bottom:32, right:32, zIndex:50,
      animation:'floatY 3s ease-in-out infinite',
    }}>
      <button
        onClick={onClick}
        onMouseEnter={()=>setHovered(true)}
        onMouseLeave={()=>setHovered(false)}
        style={{
          display:'flex', alignItems:'center', gap: hovered ? 10 : 0,
          padding: hovered ? '12px 22px' : '12px 14px',
          borderRadius:50,
          background: hovered ? 'rgba(160,45,0,0.60)' : 'rgba(0,0,0,0.52)',
          border:`1px solid ${hovered ? 'rgba(240,90,0,0.70)' : 'rgba(255,255,255,0.20)'}`,
          backdropFilter:'blur(18px)',
          color: hovered ? '#FFD8A8' : 'rgba(220,185,162,0.85)',
          boxShadow: hovered
            ? '0 8px 40px rgba(180,50,0,0.65)'
            : '0 4px 24px rgba(0,0,0,0.55)',
          cursor:'none',
          /* scale on hover — separate from float so no conflict */
          transform: hovered ? 'scale(1.13)' : 'scale(1)',
          transition:'all .28s cubic-bezier(.23,1,.32,1)',
          overflow:'hidden', whiteSpace:'nowrap',
        }}
      >
        <span style={{fontSize:'1.05rem', lineHeight:1, flexShrink:0}}>ⓘ</span>
        <span style={{
          fontFamily:'"Share Tech Mono",monospace', fontSize:'.64rem',
          letterSpacing:'.10em', textTransform:'uppercase',
          maxWidth: hovered ? 150 : 0,
          opacity: hovered ? 1 : 0,
          transition:'max-width .28s cubic-bezier(.23,1,.32,1), opacity .18s',
          overflow:'hidden',
        }}>Download Rulebook</span>
      </button>
    </div>
  )
}


export default function Landing() {
  const [showRules, setShowRules] = useState(false)
  const videoRef   = useRef(null)
  const teamName   = sessionStorage.getItem('teamName') || 'Wanderer'

  useEffect(()=>{
    const v = videoRef.current; if(!v) return
    v.muted = true
    v.load()
    const tryPlay = () => v.play().catch(()=>{})
    tryPlay()
    const unblock = () => { tryPlay() }
    document.addEventListener('click',     unblock, { once:true, passive:true })
    document.addEventListener('keydown',   unblock, { once:true, passive:true })
    document.addEventListener('touchstart',unblock, { once:true, passive:true })
    return ()=>{
      document.removeEventListener('click',     unblock)
      document.removeEventListener('keydown',   unblock)
      document.removeEventListener('touchstart',unblock)
    }
  },[])

  return (
    <div style={{minHeight:'100vh',background:T.bg,position:'relative',overflow:'hidden',
      display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',
      userSelect:'none',WebkitUserSelect:'none'}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;700;900&family=Share+Tech+Mono&family=Barlow:wght@300;400;500;600&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;user-select:none;-webkit-user-select:none;}
        html,body,*{cursor:none!important}
        @keyframes fadeUp    {from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:translateY(0)}}
        @keyframes fadeIn    {from{opacity:0;transform:scale(.97)}to{opacity:1;transform:scale(1)}}
        @keyframes sweep     {0%{left:-80%}100%{left:140%}}
        @keyframes flicker   {0%,88%,100%{opacity:1}89%{opacity:.5}90%{opacity:1}94%{opacity:.65}95%{opacity:1}}
        @keyframes breathe   {0%,100%{text-shadow:0 2px 20px rgba(220,70,0,0.60),0 0 60px rgba(160,30,0,0.35)}50%{text-shadow:0 2px 40px rgba(255,110,0,0.90),0 0 100px rgba(200,50,0,0.55),0 0 160px rgba(180,30,0,0.28)}}
        @keyframes blink     {0%,49%{opacity:1}50%,100%{opacity:0}}
        @keyframes teamSlide {from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
        @keyframes subIn     {from{opacity:0;letter-spacing:.55em}to{opacity:1;letter-spacing:.28em}}
        @keyframes infoPulse {0%,100%{box-shadow:0 0 0 0 rgba(200,80,0,0.45)}50%{box-shadow:0 0 0 7px rgba(200,80,0,0)}}
        @keyframes floatY    {0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}
        @keyframes gradShift {0%{background-position:0%}100%{background-position:200%}}
        .flicker{animation:flicker 10s linear infinite}
        .breathe{animation:breathe 4s ease-in-out infinite}
      `}</style>

      {/* ══ VIDEO ══ */}
      <video
        ref={videoRef}
        autoPlay muted loop playsInline preload="auto"
        style={{
          position:'fixed',inset:0,zIndex:0,
          width:'100%',height:'100%',
          objectFit:'cover',
          opacity:0.85,
          pointerEvents:'none',
        }}
      >
        <source src="/Mindflayer.mp4" type="video/mp4"/>
      </video>

      {/* ══ OVERLAY — only enough to make text readable, centre stays clear ══ */}
      <div style={{position:'fixed',inset:0,zIndex:1,pointerEvents:'none',
        background:`
          radial-gradient(ellipse 75% 65% at 50% 50%, transparent 25%, rgba(3,1,5,0.50) 100%),
          linear-gradient(180deg, rgba(3,1,5,0.60) 0%, transparent 15%, transparent 82%, rgba(3,1,5,0.60) 100%)
        `
      }}/>

      <EmberCanvas/>
      <LightningLayer/>
      <SplashCursor/>

      {/* ══ NAVBAR ══ */}
      <nav style={{
        position:'fixed',top:0,left:0,right:0,zIndex:50,
        display:'flex',alignItems:'center',justifyContent:'space-between',
        padding:'18px 40px',
      }}>
        <div style={{display:'flex',alignItems:'center',gap:10}}>
          <span style={{
            width:7,height:7,borderRadius:'50%',display:'inline-block',
            background:'#FF4400',boxShadow:'0 0 10px rgba(255,60,0,1)',
            animation:'blink 2s step-start infinite',
          }}/>
          <span style={{
            fontFamily:'"Cinzel",serif',fontSize:'.78rem',fontWeight:700,
            letterSpacing:'.20em',color:'rgba(230,100,45,0.90)',
            textShadow:'0 0 12px rgba(220,70,0,0.50)',
          }}>RECURSION HELL</span>
        </div>

        <div style={{display:'flex',alignItems:'center',gap:12}}>
          {[
            {label:'SCOREBOARD', action:()=>window.location.assign('/scoreboard')},
            {label:'LOGOUT',     action:()=>{ sessionStorage.clear(); window.location.assign('/') }},
          ].map(({label,action})=>(
            <CornerBtn key={label} label={label} onClick={action}/>
          ))}
        </div>
      </nav>

      {/* ══ HERO ══ */}
      <div style={{
        position:'relative',zIndex:10,
        display:'flex',flexDirection:'column',
        alignItems:'center',justifyContent:'center',
        textAlign:'center',
        padding:'0 32px',
        gap:0,
      }}>

        {/* EYEBROW — cool desaturated ash, contrasts against warm everything else */}
        <p style={{
          fontFamily:'"Share Tech Mono",monospace',
          fontSize:'1.05rem',
          letterSpacing:'.28em',
          color:'rgba(195,185,178,0.75)',   /* cool ash — not competing with reds */
          textTransform:'uppercase',
          marginBottom:32,
          animation:'subIn .9s cubic-bezier(.23,1,.32,1) .3s both',
          textShadow:'0 0 30px rgba(255,255,255,0.10)',
        }}>
          You have been summoned
        </p>

        {/* TEAM NAME — pure blazing white-to-cream, maximum contrast hero moment */}
        <h1 className="breathe flicker" style={{
          fontFamily:'"Cinzel",serif',fontWeight:900,
          fontSize:'clamp(2.8rem,7vw,5.5rem)',
          letterSpacing:'.05em',lineHeight:.90,
          /* white hot centre → warm cream → ember edge — reads like fire light on a sign */
          background:'linear-gradient(160deg, #FFFFFF 0%, #FFE8CC 25%, #FFAA55 55%, #CC3300 85%, #7A0000 100%)',
          WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent',backgroundClip:'text',
          marginBottom:28,
          animation:'teamSlide .8s cubic-bezier(.23,1,.32,1) .1s both, breathe 4s ease-in-out 1s infinite',
        }}>
          {teamName}
        </h1>

        {/* SUBTITLE — muted dusty rose/maroon, quieter than team name */}
        <div className="flicker" style={{marginBottom:60,animation:'fadeUp .7s ease-out .5s both'}}>
          <p style={{
            fontFamily:'"Cinzel",serif',fontWeight:400,
            fontSize:'clamp(1.0rem,2.2vw,1.4rem)',
            letterSpacing:'.32em',
            color:'rgba(180,110,80,0.70)',   /* dusty terracotta — subdued */
            marginBottom:8,
            textShadow:'0 0 20px rgba(160,60,0,0.40)',
          }}>TO THE UPSIDE DOWN</p>
          <p style={{
            fontFamily:'"Cinzel",serif',fontWeight:900,
            fontSize:'clamp(1.5rem,3.8vw,2.4rem)',
            letterSpacing:'.36em',
            /* deep crimson → vivid red — distinct from team name's white-hot */
            background:'linear-gradient(90deg, #8B0000 0%, #CC1100 30%, #FF2200 55%, #CC1100 80%, #8B0000 100%)',
            backgroundSize:'200%',
            WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent',backgroundClip:'text',
            animation:'gradShift 5s linear infinite',
            textShadow:'none',
          }}>RECURSION HELL</p>
        </div>

        {/* CTA */}
        <div style={{animation:'fadeUp .8s ease-out .7s both'}}>
          <MagneticEnterBtn onClick={()=>window.location.assign('/game')}/>
        </div>
      </div>

      {/* ══ FLOATING RULEBOOK BTN ══ */}
      <FloatingRulebookBtn onClick={()=>setShowRules(true)}/>

      {showRules && <RulebookModal onClose={()=>setShowRules(false)}/>}
    </div>
  )
}