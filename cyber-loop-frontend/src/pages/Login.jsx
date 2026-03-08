import { useMemo, useState, useEffect, useRef } from 'react'

function sleep(ms) { return new Promise(r => setTimeout(r, ms)) }

/* ─────────────────────────────────────────
   CANVAS: vignette + lava glow + embers + spores + web
───────────────────────────────────────── */
function SceneCanvas({ active }) {
  const ref       = useRef(null)
  const activeRef = useRef(active)
  useEffect(() => { activeRef.current = active }, [active])

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

    const PALETTE = [
      [255,80,0],[230,50,0],[200,30,0],
      [255,120,0],[180,20,0],[220,60,0],[255,160,40],
    ]

    function spawnEmber(W, H) {
      const rgb  = PALETTE[Math.floor(Math.random()*PALETTE.length)]
      const size = 1.2 + Math.random()*2.8
      const travel = H*(0.48+Math.random()*0.08)
      return {
        x:Math.random()*W, y:H, size,
        vx:(Math.random()-0.5)*0.35,
        vy:-(0.28+Math.random()*0.48),
        travel, dist:0, rgb,
        wobble:Math.random()*Math.PI*2,
        wobbleSpd:0.012+Math.random()*0.018,
      }
    }

    function spawnSpore(W, H) {
      const side = Math.random()<0.5 ? -1 : 1
      return {
        x: side<0 ? -8 : W+8,
        y: H*0.04+Math.random()*H*0.88,
        r: 0.6+Math.random()*2.0,
        vx: side*(0.10+Math.random()*0.25),
        vy: (Math.random()-0.5)*0.10,
        alpha: 0.12+Math.random()*0.50,
        wobble:Math.random()*Math.PI*2,
        wobbleSpd:0.005+Math.random()*0.009,
        pulse:Math.random()*Math.PI*2,
        pulseSpd:0.018+Math.random()*0.028,
      }
    }

    const W0=canvas.width, H0=canvas.height
    const EMBER_COUNT=110, SPORE_COUNT=55

    const embers = Array.from({length:EMBER_COUNT},(_,i)=>{
      const e=spawnEmber(W0,H0)
      e._delay=Math.floor(i*(240/EMBER_COUNT))
      e._ticks=0; e.dist=e.travel
      return e
    })

    const spores = Array.from({length:SPORE_COUNT},()=>{
      const s=spawnSpore(W0,H0); s.x=Math.random()*W0; return s
    })

    let webNodes=[]
    function buildWeb(W,H){
      webNodes=Array.from({length:18},()=>({
        x:Math.random()*W, y:Math.random()*H,
        vx:(Math.random()-0.5)*0.14, vy:(Math.random()-0.5)*0.14,
        r:1.0+Math.random()*1.2, pulse:Math.random()*Math.PI*2,
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

      const bv=0.52+Math.sin(t*0.016)*0.06
      const vig=ctx.createRadialGradient(W/2,H/2,H*0.15,W/2,H/2,H*0.9)
      vig.addColorStop(0,'rgba(0,0,0,0)')
      vig.addColorStop(0.5,`rgba(0,0,0,${bv*0.28})`)
      vig.addColorStop(1,`rgba(0,0,0,${bv})`)
      ctx.fillStyle=vig; ctx.fillRect(0,0,W,H)

      const g1=0.32+Math.sin(t*0.035)*0.10
      const g2=0.18+Math.sin(t*0.080+1.1)*0.08
      const g3=0.15+Math.sin(t*0.170+2.5)*0.06
      const lg=ctx.createLinearGradient(0,H*0.62,0,H)
      lg.addColorStop(0,'rgba(0,0,0,0)')
      lg.addColorStop(0.45,`rgba(140,35,0,${g1*0.45})`)
      lg.addColorStop(0.8,`rgba(210,60,0,${g1*0.72})`)
      lg.addColorStop(1,`rgba(240,70,0,${g1})`)
      ctx.fillStyle=lg; ctx.fillRect(0,H*0.62,W,H*0.38)
      const hc=ctx.createRadialGradient(W*0.5,H,0,W*0.5,H,W*0.5)
      hc.addColorStop(0,`rgba(255,100,0,${g2})`)
      hc.addColorStop(0.35,`rgba(190,55,0,${g2*0.55})`)
      hc.addColorStop(1,'rgba(0,0,0,0)')
      ctx.fillStyle=hc; ctx.fillRect(0,H*0.6,W,H*0.4)
      ;[0,W].forEach(cx=>{
        const cg=ctx.createRadialGradient(cx,H,0,cx,H,W*0.28)
        cg.addColorStop(0,`rgba(210,60,0,${g3*1.1})`)
        cg.addColorStop(0.5,`rgba(150,35,0,${g3*0.45})`)
        cg.addColorStop(1,'rgba(0,0,0,0)')
        ctx.fillStyle=cg; ctx.fillRect(0,0,W,H)
      })

      // Mind-Flayer web
      const WD=Math.min(W,H)*0.22
      ctx.save()
      for(const n of webNodes){ n.x+=n.vx; n.y+=n.vy; n.pulse+=0.02; if(n.x<0||n.x>W)n.vx*=-1; if(n.y<0||n.y>H)n.vy*=-1 }
      for(let i=0;i<webNodes.length;i++) for(let j=i+1;j<webNodes.length;j++){
        const a=webNodes[i],b=webNodes[j],dx=a.x-b.x,dy=a.y-b.y,d=Math.sqrt(dx*dx+dy*dy)
        if(d>WD) continue
        const fade=1-d/WD
        ctx.beginPath(); ctx.moveTo(a.x,a.y); ctx.lineTo(b.x,b.y)
        ctx.strokeStyle=`rgba(160,45,0,${fade*0.08})`; ctx.lineWidth=fade*0.6; ctx.stroke()
      }
      for(const n of webNodes){ ctx.beginPath(); ctx.arc(n.x,n.y,n.r,0,Math.PI*2); ctx.fillStyle=`rgba(200,70,0,${0.08+Math.sin(n.pulse)*0.04})`; ctx.fill() }
      ctx.restore()

      // Spores
      for(let i=0;i<spores.length;i++){
        const s=spores[i]
        s.x+=s.vx; s.y+=s.vy; s.wobble+=s.wobbleSpd; s.pulse+=s.pulseSpd; s.y+=Math.sin(s.wobble)*0.07
        if((s.vx>0&&s.x>W+12)||(s.vx<0&&s.x<-12)) Object.assign(s,spawnSpore(W,H))
        const pa=s.alpha*(0.72+Math.sin(s.pulse)*0.28)
        ctx.save(); ctx.globalAlpha=pa
        ctx.strokeStyle=`rgba(255,130,35,${pa*0.5})`; ctx.lineWidth=0.4
        ctx.beginPath(); ctx.moveTo(s.x-s.r*1.8,s.y); ctx.lineTo(s.x+s.r*1.8,s.y); ctx.stroke()
        ctx.beginPath(); ctx.moveTo(s.x,s.y-s.r*1.8); ctx.lineTo(s.x,s.y+s.r*1.8); ctx.stroke()
        const sg=ctx.createRadialGradient(s.x,s.y,0,s.x,s.y,s.r*2.6)
        sg.addColorStop(0,`rgba(255,170,50,${pa})`); sg.addColorStop(0.4,`rgba(210,75,0,${pa*0.6})`); sg.addColorStop(1,'rgba(0,0,0,0)')
        ctx.fillStyle=sg; ctx.beginPath(); ctx.arc(s.x,s.y,s.r*2.6,0,Math.PI*2); ctx.fill(); ctx.restore()
      }

      // Embers
      if(!activeRef.current) return
      for(let i=0;i<embers.length;i++){
        const e=embers[i]
        if(e._ticks<e._delay){e._ticks++;continue}
        if(e.dist>=e.travel){Object.assign(e,spawnEmber(W,H));e._delay=0;e._ticks=0;continue}
        e.wobble+=e.wobbleSpd; e.x+=e.vx+Math.sin(e.wobble)*0.10; e.y+=e.vy; e.dist-=e.vy
        const prog=e.dist/e.travel
        const alpha=prog<0.08?prog/0.08:prog>0.65?Math.pow(1-(prog-0.65)/0.35,1.6):1
        if(alpha<0.015) continue
        const [r,g,b]=e.rgb; const bodyR=e.size*(1-prog*0.3)
        ctx.save(); ctx.globalAlpha=alpha; ctx.translate(e.x,e.y); ctx.rotate(e.wobble*0.5)
        const s=bodyR
        ctx.beginPath()
        ctx.moveTo(s*0.0,-s*1.1); ctx.lineTo(s*0.7,-s*0.6); ctx.lineTo(s*1.0,s*0.1)
        ctx.lineTo(s*0.5,s*0.9); ctx.lineTo(-s*0.2,s*1.0); ctx.lineTo(-s*0.9,s*0.3); ctx.lineTo(-s*0.8,-s*0.7); ctx.closePath()
        ctx.fillStyle=`rgba(${Math.floor(r*0.28)},${Math.floor(g*0.08)},0,1)`; ctx.fill()
        ctx.save(); ctx.clip()
        const inner=ctx.createRadialGradient(s*0.05,-s*0.1,0,s*0.05,-s*0.1,s*0.85)
        inner.addColorStop(0,'rgba(255,230,160,1)'); inner.addColorStop(0.3,`rgba(${r},${Math.max(g,30)},0,1)`)
        inner.addColorStop(0.7,`rgba(${Math.floor(r*0.55)},0,0,1)`); inner.addColorStop(1,'rgba(0,0,0,0)')
        ctx.fillStyle=inner; ctx.fill(); ctx.restore(); ctx.restore()
        if(prog<0.75){
          ctx.save(); ctx.globalAlpha=alpha*0.18
          const tl=bodyR*(3+prog*4)
          const trail=ctx.createLinearGradient(e.x,e.y,e.x+e.vx*2,e.y+tl)
          trail.addColorStop(0,`rgba(${r},${Math.max(g-20,0)},0,1)`); trail.addColorStop(1,'rgba(0,0,0,0)')
          ctx.strokeStyle=trail; ctx.lineWidth=bodyR*0.4
          ctx.beginPath(); ctx.moveTo(e.x,e.y); ctx.lineTo(e.x+e.vx*2,e.y+tl); ctx.stroke(); ctx.restore()
        }
      }
    }

    rafId=requestAnimationFrame(render)
    return ()=>{ cancelAnimationFrame(rafId); window.removeEventListener('resize',resize); document.removeEventListener('visibilitychange',onVis) }
  },[])

  return <canvas ref={ref} style={{position:'absolute',inset:0,width:'100%',height:'100%',zIndex:2,pointerEvents:'none'}}/>
}

/* ── Christmas lights ── */
const LIGHT_COLORS=['#FF4500','#FF8C00','#FFD060','#FF2200','#FF6A00','#FFAA00','#FF5500','#FFC040']
function LightStrip(){
  const [states,setStates]=useState(()=>Array.from({length:20},(_,i)=>({color:LIGHT_COLORS[i%LIGHT_COLORS.length],on:true,bri:1})))
  useEffect(()=>{
    const iv=setInterval(()=>setStates(prev=>prev.map(l=>({...l,on:Math.random()>0.10,bri:0.6+Math.random()*0.4}))),110)
    return ()=>clearInterval(iv)
  },[])
  return (
    <div style={{display:'flex',justifyContent:'center',alignItems:'flex-end',gap:'8px',marginBottom:'8px',padding:'0 4px',flexWrap:'wrap'}}>
      {states.map((l,i)=>(
        <div key={i} style={{display:'flex',flexDirection:'column',alignItems:'center'}}>
          <div style={{width:1.5,height:7,background:'rgba(255,255,255,0.12)'}}/>
          <div style={{width:7,height:10,borderRadius:'50% 50% 38% 38%',background:l.on?l.color:'rgba(25,8,0,0.85)',boxShadow:l.on?`0 0 ${5*l.bri}px ${l.color},0 0 ${13*l.bri}px ${l.color}90`:'none',opacity:l.on?(0.7+l.bri*0.3):0.22,transition:'background 0.07s,box-shadow 0.07s'}}/>
        </div>
      ))}
    </div>
  )
}

/* ── Vine border ── */
function VineBorder(){
  return (
    <svg style={{position:'absolute',inset:0,width:'100%',height:'100%',pointerEvents:'none',zIndex:1,overflow:'visible'}} preserveAspectRatio="none">
      <defs><style>{`
        @keyframes vg{0%{stroke-dashoffset:700;opacity:0}18%{opacity:0.75}80%{opacity:0.5}100%{stroke-dashoffset:0;opacity:0.38}}
        @keyframes vp{0%,100%{opacity:0.32;filter:drop-shadow(0 0 2px #7A1800)}50%{opacity:0.62;filter:drop-shadow(0 0 7px #BB3000)}}
        .v1{stroke-dasharray:700;animation:vg 3.8s ease-out forwards,vp 4.5s 3.8s ease-in-out infinite}
        .v2{stroke-dasharray:450;animation:vg 3.0s 0.35s ease-out forwards,vp 5.5s 3.35s ease-in-out infinite}
        .v3{stroke-dasharray:280;animation:vg 2.4s 0.7s ease-out forwards,vp 6s 3.1s ease-in-out infinite}
        .v4{stroke-dasharray:350;animation:vg 2.8s 0.2s ease-out forwards,vp 5s 3.0s ease-in-out infinite}
      `}</style></defs>
      <path className="v1" d="M0,45 C12,22 28,10 55,7 C76,5 92,14 105,24 C118,34 122,48 112,62 C104,74 88,80 72,84" fill="none" stroke="#6B1500" strokeWidth="1.6" strokeLinecap="round"/>
      <path className="v2" d="M0,22 C9,8 22,2 44,4 C62,7 75,18 70,38 C66,54 50,62 40,70" fill="none" stroke="#4A0E00" strokeWidth="1.0" strokeLinecap="round"/>
      <path className="v3" d="M18,0 C25,14 20,30 30,46 C38,58 54,62 46,76" fill="none" stroke="#5A1200" strokeWidth="0.75" strokeLinecap="round"/>
      <g transform="rotate(180)" style={{transformOrigin:'50% 50%',transformBox:'fill-box'}}>
        <path className="v1" d="M0,45 C12,22 28,10 55,7 C76,5 92,14 105,24 C118,34 122,48 112,62 C104,74 88,80 72,84" fill="none" stroke="#6B1500" strokeWidth="1.6" strokeLinecap="round"/>
        <path className="v4" d="M0,22 C9,8 22,2 44,4 C62,7 75,18 70,38 C66,54 50,62 40,70" fill="none" stroke="#4A0E00" strokeWidth="1.0" strokeLinecap="round"/>
      </g>
    </svg>
  )
}

/* ── Main Login ── */
export default function Login(){
  const [teamName,setTeamName]=useState('')
  const [password,setPassword]=useState('')
  const [error,setError]=useState('')
  const [loading,setLoading]=useState(false)
  const [shake,setShake]=useState(false)
  const [videoReady,setVideoReady]=useState(false)

  const canSubmit=useMemo(()=>teamName.trim().length>0&&password.trim().length>0&&!loading,[teamName,password,loading])

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
    <div style={{minHeight:'100vh',position:'relative',overflow:'hidden',display:'flex',alignItems:'center',justifyContent:'center',background:'#060100',userSelect:'none',WebkitUserSelect:'none'}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@700;900&family=Libre+Baskerville:wght@700&family=Share+Tech+Mono&family=Barlow:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap');
        *{user-select:none;-webkit-user-select:none;box-sizing:border-box}
        input{user-select:text!important;-webkit-user-select:text!important}
        @keyframes shakeX{0%,100%{transform:translateX(0)}20%,60%{transform:translateX(-9px)}40%,80%{transform:translateX(9px)}}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes cardFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-5px)}}
        @keyframes stG{
          0%,83%,100%{clip-path:none;transform:translate(0);opacity:1}
          84%{clip-path:polygon(0 12%,100% 12%,100% 30%,0 30%);transform:translate(-5px,0)}
          85%{clip-path:polygon(0 54%,100% 54%,100% 70%,0 70%);transform:translate(5px,0)}
          86%{clip-path:none;transform:translate(0)}
          92%{clip-path:polygon(0 28%,100% 28%,100% 44%,0 44%);transform:translate(4px,-1px)}
          93%{clip-path:polygon(0 62%,100% 62%,100% 78%,0 78%);transform:translate(-4px,1px)}
          94%{clip-path:none;transform:translate(0)}
          97.2%{opacity:1}97.6%{opacity:0.08;transform:translate(3px,0)}98%{opacity:1;transform:translate(0)}
        }
        @keyframes stGA{
          0%,83%,100%{opacity:0;clip-path:none}
          84%{clip-path:polygon(0 10%,100% 10%,100% 32%,0 32%);transform:translate(-7px,0);opacity:0.82}
          85%{clip-path:polygon(0 56%,100% 56%,100% 72%,0 72%);transform:translate(6px,0);opacity:0.82}
          86%{opacity:0}
          92%{clip-path:polygon(0 26%,100% 26%,100% 46%,0 46%);transform:translate(7px,0);opacity:0.72}
          93%{clip-path:polygon(0 64%,100% 64%,100% 80%,0 80%);transform:translate(-6px,0);opacity:0.72}
          94%{opacity:0}
        }
        @keyframes stGB{
          0%,83%,100%{opacity:0;clip-path:none}
          84%{clip-path:polygon(0 24%,100% 24%,100% 44%,0 44%);transform:translate(7px,0);opacity:0.52}
          85%{clip-path:polygon(0 46%,100% 46%,100% 60%,0 60%);transform:translate(-7px,0);opacity:0.52}
          86%{opacity:0}
          92%{clip-path:polygon(0 42%,100% 42%,100% 58%,0 58%);transform:translate(-7px,0);opacity:0.48}
          93%{clip-path:polygon(0 68%,100% 68%,100% 82%,0 82%);transform:translate(6px,0);opacity:0.48}
          94%{opacity:0}
        }
        @keyframes stFlicker{0%,100%{opacity:1}93.5%{opacity:1}94%{opacity:0.55}94.3%{opacity:1}97.8%{opacity:0.82}98%{opacity:1}}
        .st-title{position:relative;display:inline-block;animation:stG 14s steps(1) infinite,stFlicker 8s linear infinite}
        .st-title::before,.st-title::after{content:attr(data-text);position:absolute;inset:0;background:linear-gradient(180deg,#FF9500 0%,#FF4800 42%,#CC1200 100%);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;pointer-events:none}
        .st-title::before{animation:stGA 14s steps(1) infinite}
        .st-title::after{animation:stGB 14s steps(1) infinite}
        @keyframes borderPulse{
          0%,100%{box-shadow:0 0 24px rgba(160,38,0,0.16),0 0 0 1px rgba(160,55,0,0.28) inset}
          50%    {box-shadow:0 0 44px rgba(210,65,0,0.26),0 0 0 1px rgba(220,85,0,0.42) inset,0 0 70px rgba(160,28,0,0.09)}
        }
        @keyframes divShimmer{0%{background-position:-200% center}100%{background-position:200% center}}
        @keyframes blink{0%,49%{opacity:1}50%,100%{opacity:0}}
        @keyframes btnGlow{
          0%,100%{box-shadow:0 4px 18px rgba(210,75,0,0.42),0 2px 6px rgba(0,0,0,0.6)}
          50%    {box-shadow:0 4px 28px rgba(250,115,0,0.60),0 2px 6px rgba(0,0,0,0.6),0 0 44px rgba(190,55,0,0.20)}
        }
        @keyframes btnSweep{0%{left:-80%}100%{left:140%}}
        @keyframes noiseShift{0%{background-position:0 0}25%{background-position:12px -6px}50%{background-position:-9px 14px}75%{background-position:6px -11px}100%{background-position:0 0}}
        .shake{animation:shakeX 420ms ease-in-out}
        .spin{animation:spin 0.8s linear infinite}
        .card-float{animation:cardFloat 8s ease-in-out infinite}
        .card-border{animation:borderPulse 3.8s ease-in-out infinite}
        .hell-input{width:100%;background:rgba(4,1,0,0.68);border:1px solid rgba(95,32,0,0.52);border-radius:7px;padding:11px 14px;color:#F5ECD7;font-family:'Share Tech Mono',monospace;font-size:0.88rem;outline:none;caret-color:#FF7700;transition:border-color .2s,box-shadow .2s,background .2s;user-select:text!important;-webkit-user-select:text!important}
        .hell-input::placeholder{color:rgba(240,195,130,0.18);font-style:italic}
        .hell-input:focus{border-color:rgba(215,95,0,0.82);background:rgba(6,2,0,0.80);box-shadow:0 0 0 3px rgba(195,75,0,0.12),0 0 16px rgba(190,65,0,0.09)}
        .login-btn{width:100%;padding:13px 0;border:none;border-radius:7px;font-family:'Cinzel',serif;font-size:0.82rem;font-weight:700;letter-spacing:0.22em;text-transform:uppercase;cursor:pointer;position:relative;overflow:hidden;transition:filter .2s,transform .15s}
        .btn-on{background:linear-gradient(180deg,#FF9500 0%,#E06200 45%,#961800 100%);color:#fff;text-shadow:0 1px 5px rgba(0,0,0,0.6);animation:btnGlow 2.8s ease-in-out infinite}
        .btn-on::after{content:'';position:absolute;top:0;left:-80%;width:50%;height:100%;background:linear-gradient(90deg,transparent,rgba(255,255,255,0.12),transparent);transform:skewX(-18deg);animation:btnSweep 3.6s ease-in-out infinite}
        .btn-on:hover{filter:brightness(1.12);transform:translateY(-2px)}
        .btn-on:active{transform:translateY(0)}
        .btn-off{background:rgba(255,255,255,0.04);color:rgba(240,195,130,0.16);cursor:not-allowed;border:1px solid rgba(75,28,0,0.22)}
      `}</style>

      <video autoPlay loop muted playsInline onCanPlay={()=>setVideoReady(true)}
        style={{position:'absolute',inset:0,width:'100%',height:'100%',objectFit:'cover',zIndex:0,opacity:videoReady?0.78:0,transition:'opacity 1.2s ease'}}>
        <source src="/lava-bg.mp4" type="video/mp4"/>
      </video>

      <SceneCanvas active={videoReady}/>

      <div className={`card-float card-border${shake?' shake':''}`}
        style={{position:'relative',zIndex:10,width:'min(92vw,415px)',background:'rgba(6,2,0,0.50)',borderRadius:'11px',border:'1px solid rgba(150,50,0,0.36)',backdropFilter:'blur(7px)',padding:'clamp(1.5rem,4vw,2.1rem) clamp(1.3rem,4vw,2rem)',overflow:'hidden'}}>

        <VineBorder/>

        {/* Noise overlay */}
        <div style={{position:'absolute',inset:0,pointerEvents:'none',zIndex:0,borderRadius:'11px',backgroundImage:'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.92\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\'/%3E%3C/svg%3E")',backgroundSize:'175px',opacity:0.025,animation:'noiseShift 0.45s steps(1) infinite',mixBlendMode:'overlay'}}/>

        {/* Top shimmer */}
        <div style={{position:'absolute',top:0,left:'7%',right:'7%',height:'1px',background:'linear-gradient(90deg,transparent,rgba(220,105,0,0.72),rgba(255,175,55,0.82),rgba(220,105,0,0.72),transparent)',backgroundSize:'200% 100%',animation:'divShimmer 4.2s linear infinite'}}/>

        <div style={{position:'relative',zIndex:2}}>
          <LightStrip/>

          <div style={{textAlign:'center',marginBottom:'1.2rem',marginTop:'2px'}}>
            <p style={{fontFamily:'"Share Tech Mono",monospace',fontSize:'0.58rem',letterSpacing:'0.30em',textTransform:'uppercase',color:'rgba(235,150,70,0.38)',marginBottom:'0.55rem'}}>// do you copy?</p>
            <h1 className="st-title" data-text="RECURSION HELL"
              style={{fontFamily:'"Libre Baskerville",Georgia,"Times New Roman",serif',fontSize:'clamp(1.55rem,5.5vw,2.05rem)',fontWeight:700,letterSpacing:'0.060em',lineHeight:1.06,margin:0,background:'linear-gradient(180deg,#FFB040 0%,#FF6500 36%,#FF2200 74%,#961000 100%)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent',backgroundClip:'text'}}>
              RECURSION HELL
            </h1>
            <p style={{fontFamily:'"Share Tech Mono",monospace',fontSize:'0.56rem',color:'rgba(215,120,45,0.32)',letterSpacing:'0.20em',marginTop:'0.48rem'}}>THE &nbsp; UPSIDE &nbsp; DOWN &nbsp; ∞</p>
          </div>

          <div style={{height:'1px',marginBottom:'1.25rem',background:'linear-gradient(90deg,transparent,rgba(170,60,0,0.48),rgba(235,115,0,0.52),rgba(170,60,0,0.48),transparent)'}}/>

          {error&&(
            <div style={{display:'flex',alignItems:'flex-start',gap:'0.5rem',background:'rgba(105,14,0,0.36)',border:'1px solid rgba(185,38,0,0.42)',borderRadius:'7px',padding:'9px 13px',marginBottom:'1rem',fontFamily:'"Share Tech Mono",monospace',fontSize:'0.80rem',color:'#F5ECD7',lineHeight:1.45}}>
              <span style={{color:'#FF5200',flexShrink:0}}>⚠</span>{error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{display:'flex',flexDirection:'column',gap:'1rem'}}>
            <div>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'baseline',marginBottom:'0.38rem'}}>
                <label style={{fontFamily:'"Barlow",sans-serif',fontSize:'0.78rem',fontWeight:600,color:'rgba(238,198,155,0.76)'}}>Team Name</label>
                <span style={{fontFamily:'"Share Tech Mono",monospace',fontSize:'0.54rem',color:'rgba(235,105,0,0.36)',letterSpacing:'0.08em'}}>IDENTIFIER</span>
              </div>
              <input className="hell-input" value={teamName} onChange={e=>setTeamName(e.target.value)} autoComplete="username" spellCheck={false} placeholder="e.g. StackSmashers"/>
            </div>
            <div>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'baseline',marginBottom:'0.38rem'}}>
                <label style={{fontFamily:'"Barlow",sans-serif',fontSize:'0.78rem',fontWeight:600,color:'rgba(238,198,155,0.76)'}}>Password</label>
                <span style={{fontFamily:'"Share Tech Mono",monospace',fontSize:'0.54rem',color:'rgba(235,105,0,0.36)',letterSpacing:'0.08em'}}>ENCRYPTED</span>
              </div>
              <input className="hell-input" type="password" value={password} onChange={e=>setPassword(e.target.value)} autoComplete="current-password" placeholder="••••••••"/>
            </div>
            <button type="submit" disabled={!canSubmit} className={`login-btn ${canSubmit?'btn-on':'btn-off'}`} style={{marginTop:'0.25rem'}}>
              {loading?(
                <span style={{display:'inline-flex',alignItems:'center',gap:'0.5rem',justifyContent:'center'}}>
                  <span className="spin" style={{display:'inline-block',width:13,height:13,borderRadius:'50%',border:'2px solid rgba(255,255,255,0.22)',borderTop:'2px solid #fff'}}/>
                  Descending…
                </span>
              ):'Descent'}
            </button>
          </form>

          <div style={{marginTop:'1.1rem',paddingTop:'0.8rem',borderTop:'1px solid rgba(120,40,0,0.18)',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
            <span style={{fontFamily:'"Share Tech Mono",monospace',fontSize:'0.53rem',color:'rgba(238,178,95,0.17)',letterSpacing:'0.06em'}}>// v1.0 — stack depth: ∞</span>
            <span style={{display:'flex',alignItems:'center',gap:'0.32rem'}}>
              <span style={{width:5,height:5,borderRadius:'50%',background:'#FF3800',boxShadow:'0 0 7px rgba(255,56,0,0.92)',animation:'blink 1.5s step-start infinite',display:'inline-block'}}/>
              <span style={{fontFamily:'"Share Tech Mono",monospace',fontSize:'0.53rem',color:'rgba(255,85,0,0.40)',letterSpacing:'0.06em'}}>CONTEST LIVE</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}