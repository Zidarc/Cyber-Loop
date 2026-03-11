import { useState, useEffect, useRef } from 'react'
import Lightning from '../components/Lightning'

/* ══════════════════════════════════════════
   THEME — matches Login
══════════════════════════════════════════ */
const T = {
  bg:         '#18171a',
  accent:     '#CC3300',
  accentHi:   '#FF6600',
  gold:       '#FFAA00',
  label:      '#DDD0C8',
  muted:      'rgba(200,170,150,0.45)',
  // ── BACKEND: swap this path for the real PDF ──
  rulebookPdf: '/rulebook.pdf',
  // ── BACKEND: swap for real video src ──
  videoBg:    '/st-bg.mp4',
}

/* ══════════════════════════════════════════
   EMBER CANVAS — same system as Login
══════════════════════════════════════════ */
const EMBER_PALETTE = [[255,90,0],[235,55,0],[210,35,0],[255,130,20],[185,30,0],[140,10,0]]

function EmberCanvas() {
  const ref = useRef(null)
  useEffect(() => {
    const canvas = ref.current; if (!canvas) return
    const ctx = canvas.getContext('2d')
    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight }
    resize(); window.addEventListener('resize', resize)

    function spawnEmber() {
      const rgb = EMBER_PALETTE[Math.floor(Math.random()*EMBER_PALETTE.length)]
      return {
        x: Math.random()*canvas.width, y: canvas.height + 10,
        vx: (Math.random()-.5)*.30, vy: -(.18+Math.random()*.30),
        size: .7+Math.random()*2.0,
        travel: canvas.height*(.35+Math.random()*.20),
        dist:0, rgb, wobble:Math.random()*Math.PI*2, wSpd:.007+Math.random()*.010,
      }
    }
    function spawnSpore() {
      const side = Math.random()<.5?-1:1
      return {
        x: side<0?-8:canvas.width+8,
        y: canvas.height*.05+Math.random()*canvas.height*.9,
        r:.3+Math.random()*1.2, vx:side*(.05+Math.random()*.14),
        vy:(Math.random()-.5)*.05, alpha:.06+Math.random()*.25,
        wobble:Math.random()*Math.PI*2, wSpd:.004+Math.random()*.006,
        pulse:Math.random()*Math.PI*2, pSpd:.010+Math.random()*.018,
      }
    }

    const embers = Array.from({length:55},()=>{ const e=spawnEmber(); e.y=Math.random()*canvas.height; return e })
    const spores = Array.from({length:30},()=>{ const s=spawnSpore(); s.x=Math.random()*canvas.width; return s })

    let raf, paused=false
    document.addEventListener('visibilitychange',()=>{ paused=document.hidden })

    function draw() {
      raf=requestAnimationFrame(draw); if(paused) return
      const W=canvas.width,H=canvas.height
      ctx.clearRect(0,0,W,H)

      for(const s of spores){
        s.x+=s.vx; s.y+=s.vy; s.wobble+=s.wSpd; s.pulse+=s.pSpd; s.y+=Math.sin(s.wobble)*.04
        if((s.vx>0&&s.x>W+12)||(s.vx<0&&s.x<-12)) Object.assign(s,spawnSpore())
        const a=s.alpha*(.6+Math.sin(s.pulse)*.28)
        ctx.save(); ctx.globalAlpha=a
        const sg=ctx.createRadialGradient(s.x,s.y,0,s.x,s.y,s.r*2.2)
        sg.addColorStop(0,'rgba(255,100,0,1)'); sg.addColorStop(.5,'rgba(153,60,0,.5)'); sg.addColorStop(1,'rgba(0,0,0,0)')
        ctx.fillStyle=sg; ctx.beginPath(); ctx.arc(s.x,s.y,s.r*2.2,0,Math.PI*2); ctx.fill(); ctx.restore()
      }
      for(const e of embers){
        if(e.dist>=e.travel){Object.assign(e,spawnEmber());continue}
        e.wobble+=e.wSpd; e.x+=e.vx+Math.sin(e.wobble)*.07; e.y+=e.vy; e.dist-=e.vy
        const prog=e.dist/e.travel
        const alpha=prog<.12?prog/.12:prog>.55?Math.pow(1-(prog-.55)/.45,1.8):1
        if(alpha<.02) continue
        const [r,g]=e.rgb; const s=e.size*(1-prog*.25)
        ctx.save(); ctx.globalAlpha=alpha; ctx.translate(e.x,e.y); ctx.rotate(e.wobble*.4)
        ctx.beginPath()
        ctx.moveTo(0,-s*1.1); ctx.lineTo(s*.7,-s*.5); ctx.lineTo(s*.9,s*.2)
        ctx.lineTo(s*.4,s*.9); ctx.lineTo(-s*.3,s*.9); ctx.lineTo(-s*.9,s*.2); ctx.lineTo(-s*.7,-s*.5); ctx.closePath()
        ctx.fillStyle=`rgba(${r*.25|0},0,0,1)`; ctx.fill()
        ctx.save(); ctx.clip()
        const ig=ctx.createRadialGradient(0,-s*.1,0,0,-s*.1,s*.8)
        ig.addColorStop(0,'rgba(255,200,120,1)'); ig.addColorStop(.3,`rgba(${r},${Math.max(g,8)},0,1)`)
        ig.addColorStop(.75,`rgba(${r*.45|0},0,0,1)`); ig.addColorStop(1,'rgba(0,0,0,0)')
        ctx.fillStyle=ig; ctx.fill(); ctx.restore(); ctx.restore()
      }
    }
    raf=requestAnimationFrame(draw)
    return()=>{ cancelAnimationFrame(raf); window.removeEventListener('resize',resize) }
  },[])
  return <canvas ref={ref} style={{position:'fixed',inset:0,width:'100%',height:'100%',zIndex:2,pointerEvents:'none'}}/>
}

/* ══════════════════════════════════════════
   LIGHTNING BG — same as Login
══════════════════════════════════════════ */
function LightningBG() {
  const [bolt,setBolt]=useState(null)
  useEffect(()=>{
    const SEQ=['left','centre','right']; let idx=0; const ts=[]
    const fire=()=>{
      setBolt(SEQ[idx++%3])
      ts.push(setTimeout(()=>{ setBolt(null); ts.push(setTimeout(fire,8000)) },700))
    }
    ts.push(setTimeout(fire,3000))
    return()=>ts.forEach(clearTimeout)
  },[])
  const cfgs={
    left:  {hue:18, xOffset:-.75,speed:1.0,intensity:2.6,size:1.1},
    centre:{hue:8,  xOffset:0,   speed:.95,intensity:3.0,size:1.3},
    right: {hue:355,xOffset:.75, speed:.85,intensity:2.4,size:1.0},
  }
  return bolt?(
    <div style={{position:'fixed',inset:0,zIndex:1,mixBlendMode:'screen',pointerEvents:'none',animation:'bIn .12s ease-out'}}>
      <style>{`@keyframes bIn{from{opacity:0}to{opacity:1}}`}</style>
      <Lightning {...cfgs[bolt]}/>
    </div>
  ):null
}

/* ══════════════════════════════════════════
   RULEBOOK MODAL
══════════════════════════════════════════ */
function RulebookModal({ onClose }) {
  useEffect(()=>{
    const onKey=e=>{ if(e.key==='Escape') onClose() }
    window.addEventListener('keydown',onKey)
    return()=>window.removeEventListener('keydown',onKey)
  },[])

  return (
    <div
      onClick={e=>{ if(e.target===e.currentTarget) onClose() }}
      style={{
        position:'fixed',inset:0,zIndex:100,
        background:'rgba(0,0,0,0.75)',
        backdropFilter:'blur(8px)',
        display:'flex',alignItems:'center',justifyContent:'center',
        padding:'20px',
        animation:'fadeIn .2s ease-out',
      }}
    >
      <style>{`@keyframes fadeIn{from{opacity:0;transform:scale(.97)}to{opacity:1;transform:scale(1)}}`}</style>
      <div style={{
        width:'min(96vw,860px)', height:'min(90vh,680px)',
        background:'rgba(18,15,16,0.95)',
        border:'1px solid rgba(255,255,255,0.09)',
        borderRadius:14,
        display:'flex',flexDirection:'column',
        overflow:'hidden',
        boxShadow:'0 32px 80px rgba(0,0,0,0.75), 0 0 60px rgba(160,40,0,0.10)',
      }}>
        {/* modal header */}
        <div style={{
          display:'flex',alignItems:'center',justifyContent:'space-between',
          padding:'14px 20px',
          borderBottom:'1px solid rgba(255,255,255,0.07)',
          background:'rgba(255,255,255,0.03)',
        }}>
          <span style={{fontFamily:'"Cinzel",serif',fontSize:'.85rem',fontWeight:700,letterSpacing:'.12em',color:'#DDD0C8'}}>
            RULEBOOK
          </span>
          <div style={{display:'flex',gap:10,alignItems:'center'}}>
            {/* download button */}
            <a
              href={T.rulebookPdf} download
              style={{
                fontFamily:'"Share Tech Mono",monospace',fontSize:'.68rem',
                color:'rgba(220,100,40,0.80)',letterSpacing:'.06em',
                textDecoration:'none',padding:'5px 12px',
                border:'1px solid rgba(200,70,0,0.30)',borderRadius:6,
                transition:'all .15s',
              }}
              onMouseEnter={e=>{ e.target.style.background='rgba(200,70,0,0.12)'; e.target.style.color='rgba(255,130,60,1)' }}
              onMouseLeave={e=>{ e.target.style.background='transparent'; e.target.style.color='rgba(220,100,40,0.80)' }}
            >
              ↓ DOWNLOAD
            </a>
            <button
              onClick={onClose}
              style={{
                background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.10)',
                borderRadius:6,color:'rgba(200,180,170,0.70)',width:28,height:28,
                fontSize:'1rem',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',
                transition:'background .15s',
              }}
              onMouseEnter={e=>e.target.style.background='rgba(255,255,255,0.12)'}
              onMouseLeave={e=>e.target.style.background='rgba(255,255,255,0.06)'}
            >×</button>
          </div>
        </div>
        {/* PDF embed — backend dev sets T.rulebookPdf */}
        <iframe
          src={T.rulebookPdf}
          style={{flex:1,border:'none',background:'#111'}}
          title="Rulebook"
        />
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════
   LANDING PAGE
══════════════════════════════════════════ */
export default function Landing() {
  const [showRules, setShowRules] = useState(false)
  const teamName = sessionStorage.getItem('teamName') || 'Team'
  const videoRef = useRef(null)

  useEffect(()=>{
    // ensure video plays muted autoplay
    if(videoRef.current){ videoRef.current.muted=true; videoRef.current.play().catch(()=>{}) }
  },[])

  return (
    <div style={{minHeight:'100vh',position:'relative',overflow:'hidden',display:'flex',flexDirection:'column'}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@700;900&family=Share+Tech+Mono&family=Barlow:wght@400;500;600&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        html,body{background:${T.bg}}

        @keyframes spin   {to{transform:rotate(360deg)}}
        @keyframes blink  {0%,49%{opacity:1}50%,100%{opacity:0}}
        @keyframes fadeUp {from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:translateY(0)}}
        @keyframes btnPulse{
          0%,100%{box-shadow:inset 0 1px 0 rgba(255,180,100,0.18),0 6px 24px rgba(180,40,0,0.40)}
          50%    {box-shadow:inset 0 1px 0 rgba(255,180,100,0.24),0 6px 36px rgba(220,65,0,0.58)}
        }
        @keyframes sweep{0%{left:-70%}100%{left:130%}}
        @keyframes titleFlicker{0%,88%,100%{opacity:1}89%{opacity:.5}90%{opacity:1}94%{opacity:.65}95%{opacity:1}}
        @keyframes glowPulse{0%,100%{text-shadow:0 0 12px rgba(220,80,0,0.55),0 0 30px rgba(180,40,0,0.30)}50%{text-shadow:0 0 20px rgba(255,100,0,0.75),0 0 50px rgba(200,55,0,0.45)}}

        .enter-btn{
          padding:18px 56px;border:none;border-radius:12px;cursor:pointer;
          font-family:'Cinzel',serif;font-size:1.0rem;font-weight:700;
          letter-spacing:.28em;text-transform:uppercase;
          background:linear-gradient(160deg,#D94400 0%,#A01800 45%,#6A0000 100%);
          color:#FFE8D0;position:relative;overflow:hidden;
          box-shadow:inset 0 1px 0 rgba(255,180,100,0.18),inset 0 -1px 0 rgba(0,0,0,0.30);
          animation:btnPulse 3.5s ease-in-out infinite;
          transition:filter .18s,transform .14s;
        }
        .enter-btn::before{
          content:'';position:absolute;inset:0;border-radius:12px;
          background:linear-gradient(180deg,rgba(255,150,80,0.08) 0%,transparent 50%);
          pointer-events:none;
        }
        .enter-btn::after{
          content:'';position:absolute;top:0;left:-70%;width:45%;height:100%;
          background:linear-gradient(90deg,transparent,rgba(255,200,150,0.12),transparent);
          transform:skewX(-16deg);animation:sweep 4s ease-in-out infinite;
        }
        .enter-btn:hover{filter:brightness(1.14);transform:translateY(-3px) scale(1.02)}
        .enter-btn:active{transform:translateY(0) scale(1);filter:brightness(.96)}

        .info-btn{
          width:36px;height:36px;border-radius:50%;border:1px solid rgba(255,255,255,0.14);
          background:rgba(255,255,255,0.06);color:rgba(220,190,170,0.75);
          font-size:.85rem;font-family:'Barlow',sans-serif;font-weight:600;
          cursor:pointer;display:flex;align-items:center;justify-content:center;
          transition:all .18s;backdrop-filter:blur(8px);
        }
        .info-btn:hover{background:rgba(200,70,0,0.20);border-color:rgba(220,80,0,0.40);color:#FFE0C0}

        .nav-logout{
          font-family:'Share Tech Mono',monospace;font-size:.68rem;letter-spacing:.08em;
          color:rgba(200,160,140,0.50);background:none;border:1px solid rgba(160,50,0,0.22);
          border-radius:6px;padding:6px 14px;cursor:pointer;transition:all .15s;
        }
        .nav-logout:hover{color:rgba(230,180,140,0.85);border-color:rgba(200,70,0,0.45);background:rgba(180,50,0,0.10)}
      `}</style>

      {/* ── BG VIDEO ── */}
      <video
        ref={videoRef}
        src={T.videoBg}
        loop muted playsInline autoPlay
        style={{
          position:'fixed',inset:0,width:'100%',height:'100%',
          objectFit:'cover',zIndex:0,
          filter:'brightness(0.30) saturate(0.7)',
        }}
      />
      {/* dark overlay over video */}
      <div style={{position:'fixed',inset:0,zIndex:1,background:'rgba(15,12,14,0.55)',pointerEvents:'none'}}/>
      {/* edge bleed — subtle red corners */}
      <div style={{
        position:'fixed',inset:0,zIndex:1,pointerEvents:'none',
        background:'radial-gradient(ellipse at 0% 0%,rgba(100,5,0,0.18) 0%,transparent 40%), radial-gradient(ellipse at 100% 100%,rgba(90,5,0,0.15) 0%,transparent 38%)',
      }}/>

      <EmberCanvas/>
      <LightningBG/>

      {/* ── NAVBAR ── */}
      <nav style={{
        position:'fixed',top:0,left:0,right:0,zIndex:50,
        display:'flex',alignItems:'center',justifyContent:'space-between',
        padding:'14px 28px',
        background:'rgba(12,10,12,0.55)',
        borderBottom:'1px solid rgba(255,255,255,0.06)',
        backdropFilter:'blur(16px)',
        WebkitBackdropFilter:'blur(16px)',
      }}>
        <div style={{display:'flex',alignItems:'center',gap:10}}>
          <span style={{
            width:7,height:7,borderRadius:'50%',
            background:'#FF4400',boxShadow:'0 0 6px rgba(255,55,0,0.9)',
            animation:'blink 2s step-start infinite',display:'inline-block',
          }}/>
          <span style={{
            fontFamily:'"Cinzel",serif',fontSize:'.75rem',fontWeight:700,
            letterSpacing:'.14em',color:'rgba(200,80,40,0.80)',
          }}>RECURSION HELL</span>
        </div>

        <div style={{display:'flex',alignItems:'center',gap:16}}>
          <span style={{
            fontFamily:'"Share Tech Mono",monospace',fontSize:'.72rem',
            letterSpacing:'.08em',color:T.label,
          }}>
            {teamName}
          </span>
          <a href="/scoreboard" style={{
            fontFamily:'"Share Tech Mono",monospace',fontSize:'.68rem',letterSpacing:'.08em',
            color:'rgba(200,160,140,0.55)',textDecoration:'none',
            border:'1px solid rgba(160,50,0,0.22)',borderRadius:6,padding:'6px 14px',
            transition:'all .15s',
          }}
          onMouseEnter={e=>{ e.target.style.color='rgba(230,180,140,0.85)'; e.target.style.borderColor='rgba(200,70,0,0.45)'; e.target.style.background='rgba(180,50,0,0.10)' }}
          onMouseLeave={e=>{ e.target.style.color='rgba(200,160,140,0.55)'; e.target.style.borderColor='rgba(160,50,0,0.22)'; e.target.style.background='transparent' }}
          >SCOREBOARD</a>
          <button className="nav-logout" onClick={()=>{ sessionStorage.clear(); window.location.assign('/') }}>
            LOGOUT
          </button>
        </div>
      </nav>

      {/* ── MAIN HERO ── */}
      <div style={{
        flex:1,display:'flex',flexDirection:'column',
        alignItems:'center',justifyContent:'center',
        minHeight:'100vh',
        padding:'100px 24px 120px',
        position:'relative',zIndex:10,
        animation:'fadeUp .8s ease-out',
      }}>
        {/* greeting */}
        <p style={{
          fontFamily:'"Share Tech Mono",monospace',fontSize:'.62rem',
          letterSpacing:'.32em',color:'rgba(220,100,40,0.60)',
          textTransform:'uppercase',marginBottom:18,
        }}>
          Welcome back
        </p>

        {/* team name hero */}
        <h1 style={{
          fontFamily:'"Cinzel",serif',fontWeight:900,
          fontSize:'clamp(2.8rem,8vw,5.5rem)',
          letterSpacing:'.06em',lineHeight:1,
          background:'linear-gradient(175deg,#DDD0C8 0%,#B0A090 50%,#7A6A60 100%)',
          WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent',backgroundClip:'text',
          textAlign:'center',marginBottom:14,
          animation:'glowPulse 4s ease-in-out infinite',
        }}>
          {teamName}
        </h1>

        {/* RECURSION HELL title — smaller, below team name */}
        <div className="title-flicker" style={{textAlign:'center',marginBottom:48}}>
          <p style={{
            fontFamily:'"Cinzel",serif',fontWeight:700,
            fontSize:'clamp(.85rem,2.2vw,1.1rem)',
            letterSpacing:'.30em',
            background:`linear-gradient(90deg,${T.accentHi},${T.accent},${T.accentHi})`,
            WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent',backgroundClip:'text',
          }}>RECURSION &nbsp; HELL</p>
          <p style={{
            fontFamily:'"Share Tech Mono",monospace',fontSize:'.50rem',
            letterSpacing:'.22em',color:'rgba(200,120,60,0.42)',marginTop:6,
          }}>THE UPSIDE DOWN &nbsp;∞</p>
        </div>

        {/* enter button */}
        <button
          className="enter-btn"
          onClick={()=>window.location.assign('/game')}
        >
          Enter the Upside Down
        </button>
      </div>

      {/* ── BOTTOM BAR ── */}
      <div style={{
        position:'fixed',bottom:0,left:0,right:0,zIndex:50,
        display:'flex',alignItems:'center',justifyContent:'space-between',
        padding:'12px 24px',
        background:'rgba(12,10,12,0.50)',
        borderTop:'1px solid rgba(255,255,255,0.05)',
        backdropFilter:'blur(16px)',
      }}>
        <span style={{fontFamily:'"Share Tech Mono",monospace',fontSize:'.48rem',color:T.muted,letterSpacing:'.05em'}}>
          v1.0 &nbsp;·&nbsp; depth: ∞
        </span>

        {/* ⓘ rulebook button */}
        <button className="info-btn" onClick={()=>setShowRules(true)} title="Rulebook">
          i
        </button>

        <span style={{fontFamily:'"Share Tech Mono",monospace',fontSize:'.48rem',color:T.muted,letterSpacing:'.05em'}}>
          {teamName}
        </span>
      </div>

      {/* rulebook modal */}
      {showRules && <RulebookModal onClose={()=>setShowRules(false)}/>}
    </div>
  )
}