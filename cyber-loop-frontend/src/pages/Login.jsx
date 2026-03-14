import { useMemo, useState, useEffect, useRef, useCallback } from 'react'
import SplashCursor from '../components/SplashCursor'
import Lightning from '../components/Lightning'

function sleep(ms) { return new Promise(r => setTimeout(r, ms)) }

/* ═══════════════════════════════════════════
   THEME — single source of truth
═══════════════════════════════════════════ */
const T = {
  bg:          '#18171a',
  cardBg:      'rgba(14,10,12,0.55)',
  cardBorder:  'rgba(255,255,255,0.11)',

  emberPalette: [[255,90,0],[235,55,0],[210,35,0],[255,130,20],[185,30,0],[140,10,0]],
  sporeRgb:    [255,100,0],
  bulbColors:  ['#FF4400','#FF7700','#FFBB00','#FF2200','#FF5500','#FFDD44','#FF3300','#FF9900','#EE4400'],

  titleTop:    '#C0130A',
  titleBot:    '#5A0000',

  btnFrom:     '#CC3300',
  btnTo:       '#7A0000',
  btnText:     '#FFE8D0',

  label:       '#DDD0C8',
  muted:       'rgba(200,170,150,0.45)',
  accent:      'rgba(220,100,40,0.70)',
}

/* ─────────────────────────────────────────
   EMBER CANVAS
───────────────────────────────────────── */
function EmberCanvas({ cardRef }) {
  const ref = useRef(null)
  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight }
    resize(); window.addEventListener('resize', resize)

    function getCard() {
      if (cardRef?.current) {
        const r = cardRef.current.getBoundingClientRect()
        return { left:r.left, right:r.right, top:r.top, h:r.height }
      }
      const W=canvas.width,H=canvas.height
      return { left:W*.35, right:W*.65, top:H*.1, h:H*.8 }
    }

    function spawnEmber() {
      const rgb = T.emberPalette[Math.floor(Math.random()*T.emberPalette.length)]
      const card = getCard(), side = Math.random()<.5?-1:1
      return {
        x: side<0 ? card.left : card.right,
        y: card.top + Math.random()*card.h,
        vx: side*(.10+Math.random()*.20), vy: -(.14+Math.random()*.22),
        size: .8+Math.random()*1.8,
        travel: canvas.height*(.18+Math.random()*.12),
        dist:0, rgb, wobble:Math.random()*Math.PI*2, wSpd:.008+Math.random()*.010,
      }
    }

    function spawnSpore() {
      const side = Math.random()<.5?-1:1
      return {
        x: side<0 ? -8 : canvas.width+8,
        y: canvas.height*.05+Math.random()*canvas.height*.9,
        r: .3+Math.random()*1.2, vx: side*(.05+Math.random()*.15),
        vy: (Math.random()-.5)*.06, alpha:.06+Math.random()*.28,
        wobble:Math.random()*Math.PI*2, wSpd:.004+Math.random()*.006,
        pulse:Math.random()*Math.PI*2, pSpd:.010+Math.random()*.018,
      }
    }

    const embers = Array.from({length:50},()=>{ const e=spawnEmber(); e.dist=e.travel*Math.random(); return e })
    const spores = Array.from({length:35},()=>{ const s=spawnSpore(); s.x=Math.random()*canvas.width; return s })

    let rafId, paused=false
    document.addEventListener('visibilitychange',()=>{ paused=document.hidden })

    function draw() {
      rafId=requestAnimationFrame(draw)
      if(paused) return
      const W=canvas.width,H=canvas.height
      ctx.clearRect(0,0,W,H)

      for(const s of spores) {
        s.x+=s.vx; s.y+=s.vy; s.wobble+=s.wSpd; s.pulse+=s.pSpd
        s.y+=Math.sin(s.wobble)*.04
        if((s.vx>0&&s.x>W+12)||(s.vx<0&&s.x<-12)) Object.assign(s,spawnSpore())
        const a=s.alpha*(.6+Math.sin(s.pulse)*.28)
        const [r,g,b]=T.sporeRgb
        ctx.save(); ctx.globalAlpha=a
        const sg=ctx.createRadialGradient(s.x,s.y,0,s.x,s.y,s.r*2.2)
        sg.addColorStop(0,`rgba(${r},${g},${b},1)`)
        sg.addColorStop(.5,`rgba(${r*.6|0},${g*.3|0},0,.5)`)
        sg.addColorStop(1,'rgba(0,0,0,0)')
        ctx.fillStyle=sg; ctx.beginPath(); ctx.arc(s.x,s.y,s.r*2.2,0,Math.PI*2); ctx.fill(); ctx.restore()
      }

      for(const e of embers) {
        if(e.dist>=e.travel){ Object.assign(e,spawnEmber()); continue }
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
        ig.addColorStop(0,'rgba(255,200,120,1)')
        ig.addColorStop(.3,`rgba(${r},${Math.max(g,8)},0,1)`)
        ig.addColorStop(.75,`rgba(${r*.45|0},0,0,1)`)
        ig.addColorStop(1,'rgba(0,0,0,0)')
        ctx.fillStyle=ig; ctx.fill(); ctx.restore(); ctx.restore()
      }
    }
    rafId=requestAnimationFrame(draw)
    return()=>{ cancelAnimationFrame(rafId); window.removeEventListener('resize',resize) }
  },[])
  return <canvas ref={ref} style={{position:'fixed',inset:0,width:'100%',height:'100%',zIndex:1,pointerEvents:'none'}}/>
}

/* ─────────────────────────────────────────
   BULB STRIP
───────────────────────────────────────── */
const WIRE_SAG = [0,2,4,5,6,5,4,2,0]

function BulbStrip({ typing }) {
  const COUNT = 9
  const [bulbs, setBulbs] = useState(()=>Array.from({length:COUNT},(_,i)=>({color:T.bulbColors[i],on:true,bri:1})))

  useEffect(()=>{
    if(typing) return
    const iv=setInterval(()=>{
      const idx=Math.floor(Math.random()*COUNT)
      setBulbs(p=>p.map((b,i)=>i===idx?{...b,on:false,bri:0}:b))
      setTimeout(()=>setBulbs(p=>p.map((b,i)=>i===idx?{...b,on:true,bri:.7+Math.random()*.3}:b)),60+Math.random()*100)
    },700+Math.random()*900)
    return()=>clearInterval(iv)
  },[typing])

  useEffect(()=>{
    if(!typing) return
    let alive=true; const ts=[]
    const flicker=()=>{
      if(!alive) return
      const idx=Math.floor(Math.random()*COUNT)
      setBulbs(p=>p.map((b,i)=>i===idx?{...b,on:false,bri:0}:b))
      ts.push(setTimeout(()=>setBulbs(p=>p.map((b,i)=>i===idx?{...b,on:true,bri:.5+Math.random()*.5}:b)),35+Math.random()*65))
      ts.push(setTimeout(flicker,70+Math.random()*120))
    }
    flicker()
    return()=>{ alive=false; ts.forEach(clearTimeout) }
  },[typing])

  return (
    <div style={{marginBottom:8}}>
      <svg width="100%" height="22" style={{overflow:'visible',display:'block'}}>
        <path
          d={`M0,8 ${Array.from({length:COUNT},(_,i)=>`L${(i/(COUNT-1))*100}%,${8+WIRE_SAG[i]}`).join(' ')} L100%,8`}
          fill="none" stroke="rgba(200,190,170,0.18)" strokeWidth="1"
        />
        {Array.from({length:COUNT},(_,i)=>(
          <line key={i} x1={`${(i/(COUNT-1))*100}%`} y1={8+WIRE_SAG[i]} x2={`${(i/(COUNT-1))*100}%`} y2={20+WIRE_SAG[i]} stroke="rgba(200,190,170,0.15)" strokeWidth="0.7"/>
        ))}
      </svg>
      <div style={{display:'flex',justifyContent:'space-between',marginTop:-6,padding:'0 1px'}}>
        {bulbs.map((b,i)=>(
          <div key={i} style={{
            width:13,height:18,borderRadius:'38% 38% 52% 52%',
            background: b.on?b.color:'rgba(18,14,12,0.9)',
            boxShadow: b.on?`0 0 ${7*b.bri}px ${b.color},0 0 ${16*b.bri}px ${b.color}88,0 0 ${28*b.bri}px ${b.color}44`:'none',
            opacity: b.on?.8+b.bri*.2:.15,
            transition:'background .04s,box-shadow .04s',
            marginTop:WIRE_SAG[i],
          }}/>
        ))}
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────
   SPIDER
───────────────────────────────────────── */
function Spider({ cardRef }) {
  const canvasRef = useRef(null)
  useEffect(()=>{
    const canvas=canvasRef.current; if(!canvas) return
    const ctx=canvas.getContext('2d')
    let rafId,t=0

    function getPos(w,h,dist){
      const p=2*(w+h); let d=((dist%p)+p)%p
      if(d<w)       return{x:d,y:0,angle:0}
      if(d<w+h)     return{x:w,y:d-w,angle:Math.PI/2}
      if(d<2*w+h)   return{x:w-(d-w-h),y:h,angle:Math.PI}
      return{x:0,y:h-(d-2*w-h),angle:-Math.PI/2}
    }

    function drawSpider(x,y,angle,lp){
      ctx.save(); ctx.translate(x,y); ctx.rotate(angle+Math.PI/2); ctx.scale(1.5,1.5)
      const g=ctx.createRadialGradient(0,0,0,0,0,14)
      g.addColorStop(0,'rgba(200,60,0,0.22)'); g.addColorStop(1,'rgba(0,0,0,0)')
      ctx.fillStyle=g; ctx.beginPath(); ctx.arc(0,0,14,0,Math.PI*2); ctx.fill()
      const legs=[[-1,-.4,9,8],[-1,-.9,10,9],[-1,-1.4,9,8],[-1,-1.9,8,7],[1,.4,9,8],[1,.9,10,9],[1,1.4,9,8],[1,1.9,8,7]]
      const drawLegs=(color,lw)=>{
        ctx.strokeStyle=color; ctx.lineWidth=lw; ctx.lineCap='round'
        legs.forEach(([side,base,l1,l2],i)=>{
          const bend=Math.sin(lp+(i%2===0?0:Math.PI))*.50
          const a1=base+bend*side, sx=side*4, sy=-1+i*.5
          const mx=sx+Math.cos(a1)*l1*side, my=sy+Math.sin(Math.abs(a1))*l1-2
          const a2=a1+(side*.9+bend*.4)
          const ex=mx+Math.cos(a2)*l2*side, ey=my+Math.sin(Math.abs(a2))*l2
          ctx.beginPath(); ctx.moveTo(sx,sy); ctx.quadraticCurveTo(mx,my,ex,ey); ctx.stroke()
        })
      }
      drawLegs('rgba(220,60,0,0.12)',1.6)
      drawLegs('#383838',0.9)
      ctx.fillStyle='#181818'; ctx.beginPath(); ctx.ellipse(0,4,4.5,6,0,0,Math.PI*2); ctx.fill()
      const aS=ctx.createRadialGradient(-1,2,0,0,4,5.5)
      aS.addColorStop(0,'rgba(75,75,75,0.45)'); aS.addColorStop(1,'rgba(0,0,0,0)')
      ctx.fillStyle=aS; ctx.beginPath(); ctx.ellipse(0,4,4.5,6,0,0,Math.PI*2); ctx.fill()
      ctx.fillStyle='rgba(215,35,0,0.95)'
      ctx.beginPath(); ctx.ellipse(0,2.8,1.1,1.7,0,0,Math.PI*2); ctx.fill()
      ctx.beginPath(); ctx.ellipse(0,5.3,.85,1.2,0,0,Math.PI*2); ctx.fill()
      ctx.fillStyle='#1e1e1e'; ctx.beginPath(); ctx.ellipse(0,-2.5,3.5,4,0,0,Math.PI*2); ctx.fill()
      const hS=ctx.createRadialGradient(-.8,-3.8,0,0,-2.5,4.2)
      hS.addColorStop(0,'rgba(85,85,85,0.35)'); hS.addColorStop(1,'rgba(0,0,0,0)')
      ctx.fillStyle=hS; ctx.beginPath(); ctx.ellipse(0,-2.5,3.5,4,0,0,Math.PI*2); ctx.fill()
      ;[[-1.4,-4.3],[1.4,-4.3],[-.6,-5.1],[.6,-5.1]].forEach(([ex,ey])=>{
        ctx.fillStyle='rgba(240,55,0,0.35)'; ctx.beginPath(); ctx.arc(ex,ey,2,0,Math.PI*2); ctx.fill()
        ctx.fillStyle='rgba(255,70,0,1)';    ctx.beginPath(); ctx.arc(ex,ey,.9,0,Math.PI*2); ctx.fill()
      })
      ctx.restore()
    }

    let dist=0
    function render(){
      rafId=requestAnimationFrame(render); t++
      if(!cardRef.current) return
      const r=cardRef.current.getBoundingClientRect()
      canvas.width=r.width+120; canvas.height=r.height+120
      canvas.style.left=(r.left-60)+'px'; canvas.style.top=(r.top-60)+'px'
      ctx.clearRect(0,0,canvas.width,canvas.height)
      dist+=.55
      const pos=getPos(r.width,r.height,dist)
      drawSpider(pos.x+60,pos.y+60,pos.angle,t*.18)
    }
    rafId=requestAnimationFrame(render)
    return()=>cancelAnimationFrame(rafId)
  },[])
  return <canvas ref={canvasRef} style={{position:'fixed',pointerEvents:'none',zIndex:20}}/>
}

/* ─────────────────────────────────────────
   BACKGROUND
───────────────────────────────────────── */
function Background() {
  const [phase,setPhase]=useState(0)
  const [bolt,setBolt]=useState(null)

  useEffect(()=>{
    const id=setTimeout(()=>{
      const s=performance.now(),DUR=4500; let raf
      const tick=()=>{
        const t=Math.min((performance.now()-s)/DUR,1)
        setPhase(t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2)
        if(t<1) raf=requestAnimationFrame(tick)
      }
      raf=requestAnimationFrame(tick); return()=>cancelAnimationFrame(raf)
    },600)
    return()=>clearTimeout(id)
  },[])

  useEffect(()=>{
    const SEQ=['left','centre','right']; let idx=0; const ts=[]
    const fire=()=>{
      setBolt(SEQ[idx++%3])
      ts.push(setTimeout(()=>{ setBolt(null); ts.push(setTimeout(fire,8000)) },700))
    }
    ts.push(setTimeout(fire,5500))
    return()=>ts.forEach(clearTimeout)
  },[])

  const cfgs={
    left:  {hue:18, xOffset:-.75,speed:1.0,intensity:2.6,size:1.1},
    centre:{hue:8,  xOffset:0,   speed:.95,intensity:3.0,size:1.3},
    right: {hue:355,xOffset:.75, speed:.85,intensity:2.4,size:1.0},
  }

  return (
    <div style={{position:'fixed',inset:0,zIndex:0,background:T.bg}}>
      {/* ember phase — warm amber bloom from centre */}
      <div style={{
        position:'absolute',inset:0,
        background:'radial-gradient(ellipse at 50% 48%, rgba(220,80,0,0.28) 0%, rgba(160,35,0,0.14) 35%, transparent 70%)',
        opacity:Math.max(0,1-phase*1.8), pointerEvents:'none',
      }}/>
      <div style={{
        position:'absolute',bottom:0,left:0,right:0,height:'55%',
        background:'linear-gradient(0deg,rgba(180,50,0,0.22) 0%,rgba(120,20,0,0.10) 50%,transparent 100%)',
        opacity:Math.max(0,1-phase*1.6), pointerEvents:'none',
      }}/>

      {/* settled — ember glow pockets, left + right asymmetric */}
      <div style={{
        position:'absolute',inset:0,
        background:'radial-gradient(ellipse at 18% 72%, rgba(200,55,0,0.13) 0%, transparent 40%)',
        opacity:Math.min(1,phase*1.4), pointerEvents:'none',
      }}/>
      <div style={{
        position:'absolute',inset:0,
        background:'radial-gradient(ellipse at 82% 32%, rgba(160,30,0,0.10) 0%, transparent 38%)',
        opacity:Math.min(1,phase*1.3), pointerEvents:'none',
      }}/>
      {/* deep red vignette corners */}
      <div style={{
        position:'absolute',inset:0,
        background:'radial-gradient(ellipse at 0% 0%, rgba(100,5,0,0.18) 0%, transparent 45%), radial-gradient(ellipse at 100% 100%, rgba(90,5,0,0.16) 0%, transparent 40%)',
        opacity:Math.min(1,phase*1.6), pointerEvents:'none',
      }}/>
      {/* very subtle top red wash */}
      <div style={{
        position:'absolute',top:0,left:0,right:0,height:'40%',
        background:'linear-gradient(180deg,rgba(80,6,0,0.14) 0%,transparent 100%)',
        opacity:Math.min(1,phase*1.5), pointerEvents:'none',
      }}/>
      {bolt&&(
        <div style={{position:'absolute',inset:0,mixBlendMode:'screen',pointerEvents:'none',animation:'bIn .12s ease-out'}}>
          <style>{`@keyframes bIn{from{opacity:0}to{opacity:1}}`}</style>
          <Lightning {...cfgs[bolt]}/>
        </div>
      )}
    </div>
  )
}

/* ─────────────────────────────────────────
   LOGIN
───────────────────────────────────────── */
export default function Login() {
  const [team,   setTeam]   = useState('')
  const [pass,   setPass]   = useState('')
  const [error,  setError]  = useState('')
  const [loading,setLoading]= useState(false)
  const [shake,  setShake]  = useState(false)
  const [typing, setTyping] = useState(false)
  const cardRef   = useRef(null)
  const typingRef = useRef(null)

  const canSubmit = useMemo(()=>team.trim()&&pass.trim()&&!loading,[team,pass,loading])

  const onType = useCallback(()=>{
    setTyping(true); clearTimeout(typingRef.current)
    typingRef.current=setTimeout(()=>setTyping(false),1200)
  },[])

  async function handleSubmit(e){
    e.preventDefault(); if(loading) return
    const tn=team.trim(),pw=pass.trim()
    setError('')
    if(!tn||!pw){ setShake(true); setError('Team name and password are required.'); setTimeout(()=>setShake(false),420); return }
    setLoading(true)
    try{
      await sleep(800)
      sessionStorage.setItem('teamName',tn)
      // ── BACKEND HOOK ──
      // const res=await fetch('/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({teamName:tn,password:pw})})
      // if(!res.ok){const d=await res.json().catch(()=>({}));setError(d.error||'Invalid credentials.');setLoading(false);return}
      // sessionStorage.setItem('token',(await res.json()).token)
      window.location.assign('/landing')
    }catch{ setError('Authentication failed. Try again.'); setLoading(false) }
  }

  return (
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',position:'relative'}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@700;900&family=Share+Tech+Mono&family=Barlow:wght@400;500;600&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        html,body,*{cursor:none!important;user-select:none;-webkit-user-select:none}
        input{user-select:text!important;-webkit-user-select:text!important}

        @keyframes shake  {0%,100%{transform:translateX(0)}22%,66%{transform:translateX(-8px)}44%,88%{transform:translateX(8px)}}
        @keyframes floatY {0%,100%{transform:translateY(0)}50%{transform:translateY(-5px)}}
        @keyframes spin   {to{transform:rotate(360deg)}}
        @keyframes blink  {0%,49%{opacity:1}50%,100%{opacity:0}}
        @keyframes sweep  {0%{left:-70%}100%{left:130%}}
        @keyframes cardGlow{
          0%,100%{box-shadow:inset 0 1px 0 rgba(255,255,255,0.12),inset 0 -1px 0 rgba(0,0,0,0.25),0 2px 0 rgba(255,255,255,0.05),0 28px 70px rgba(0,0,0,0.70),0 0 50px rgba(150,35,0,0.10)}
          50%    {box-shadow:inset 0 1px 0 rgba(255,255,255,0.16),inset 0 -1px 0 rgba(0,0,0,0.25),0 2px 0 rgba(255,255,255,0.06),0 28px 70px rgba(0,0,0,0.70),0 0 65px rgba(190,50,0,0.16)}
        }
        @keyframes titleFlicker{0%,88%,100%{opacity:1}89%{opacity:.55}90%{opacity:1}94%{opacity:.7}95%{opacity:1}}
        @keyframes btnPulse{
          0%,100%{box-shadow:inset 0 1px 0 rgba(255,180,100,0.18),0 6px 20px rgba(180,40,0,0.38),0 2px 6px rgba(0,0,0,0.55)}
          50%    {box-shadow:inset 0 1px 0 rgba(255,180,100,0.22),0 6px 30px rgba(210,60,0,0.55),0 2px 6px rgba(0,0,0,0.55)}
        }

        .card-anim {animation:floatY 10s ease-in-out infinite,cardGlow 5s ease-in-out infinite}
        .card-shake{animation:shake 420ms ease-in-out!important}
        .title-flicker{animation:titleFlicker 9s linear infinite}

        .hell-input{
          width:100%;padding:12px 15px;
          background:rgba(255,255,255,0.06);
          border:1px solid rgba(255,255,255,0.09);
          border-radius:10px;color:#EDE0D4;
          font-family:'Share Tech Mono',monospace;font-size:.875rem;
          outline:none;caret-color:#FF6600;
          box-shadow:inset 0 1px 0 rgba(255,255,255,0.06), inset 0 -1px 0 rgba(0,0,0,0.15);
          transition:border-color .2s,background .2s,box-shadow .2s;
        }
        .hell-input::placeholder{color:rgba(210,175,150,0.32);font-style:italic}
        .hell-input:focus{
          background:rgba(255,255,255,0.09);
          border-color:rgba(200,70,0,0.50);
          box-shadow:inset 0 1px 0 rgba(255,255,255,0.08), inset 0 -1px 0 rgba(0,0,0,0.15), 0 0 0 3px rgba(180,50,0,0.12), 0 0 18px rgba(160,40,0,0.08);
        }
        .btn-on{
          width:100%;padding:14px 0;border:none;border-radius:10px;
          font-family:'Cinzel',serif;font-size:.80rem;font-weight:700;
          letter-spacing:.26em;text-transform:uppercase;cursor:none;
          background:linear-gradient(160deg,#D94400 0%,#A01800 45%,#6A0000 100%);
          color:#FFE8D0;position:relative;overflow:hidden;
          box-shadow:inset 0 1px 0 rgba(255,180,100,0.18),inset 0 -1px 0 rgba(0,0,0,0.30);
          animation:btnPulse 3.5s ease-in-out infinite;
          transition:filter .18s,transform .12s;
        }
        .btn-on::before{
          content:'';position:absolute;inset:0;border-radius:10px;
          background:linear-gradient(180deg,rgba(255,150,80,0.08) 0%,transparent 50%);
          pointer-events:none;
        }
        .btn-on::after{
          content:'';position:absolute;top:0;left:-70%;width:45%;height:100%;
          background:linear-gradient(90deg,transparent,rgba(255,200,150,0.12),transparent);
          transform:skewX(-16deg);animation:sweep 4.5s ease-in-out infinite;
        }
        .btn-on:hover{filter:brightness(1.12);transform:translateY(-2px)}
        .btn-on:active{transform:translateY(0);filter:brightness(0.96)}
        .btn-off{
          width:100%;padding:14px 0;border-radius:10px;border:none;
          font-family:'Cinzel',serif;font-size:.80rem;font-weight:700;
          letter-spacing:.26em;text-transform:uppercase;cursor:not-allowed;
          background:rgba(255,255,255,0.025);color:rgba(200,160,140,0.18);
          border:1px solid rgba(255,255,255,0.06);
        }
      `}</style>

      <Background/>
      <EmberCanvas cardRef={cardRef}/>
      <SplashCursor/>
      <Spider cardRef={cardRef}/>

      {/* ── CARD ── */}
      <div
        ref={cardRef}
        className={`card-anim${shake?' card-shake':''}`}
        style={{
          position:'relative',zIndex:10,
          width:'min(92vw,400px)',
          background:T.cardBg,
          borderRadius:16,
          border:`1px solid ${T.cardBorder}`,
          backdropFilter:'blur(40px) saturate(2.2)',
          WebkitBackdropFilter:'blur(40px) saturate(2.2)',
          padding:'clamp(1.6rem,4vw,2.2rem) clamp(1.4rem,4vw,2rem)',
          overflow:'hidden',
        }}
      >
        {/* top edge shimmer */}
        <div style={{
          position:'absolute',top:0,left:'8%',right:'8%',height:1,
          background:'linear-gradient(90deg,transparent,rgba(255,255,255,0.10),rgba(255,255,255,0.20),rgba(255,255,255,0.10),transparent)',
        }}/>

        <div style={{position:'relative',zIndex:2}}>
          <BulbStrip typing={typing}/>

          {/* title */}
          <div style={{textAlign:'center',margin:'14px 0 22px'}}>
            <h1 className="title-flicker" style={{
              fontFamily:'"Cinzel",serif',fontWeight:900,
              lineHeight:.95,letterSpacing:'.05em',
              display:'flex',flexDirection:'column',alignItems:'center',gap:'.02em',
            }}>
              <span style={{
                fontSize:'clamp(2.1rem,7.8vw,3.0rem)',
                background:`linear-gradient(175deg,${T.titleTop} 0%,#8B0000 60%,${T.titleBot} 100%)`,
                WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent',backgroundClip:'text',
                filter:'drop-shadow(0 1px 4px rgba(130,0,0,0.40))',
              }}>RECURSION</span>
              <span style={{
                fontSize:'clamp(2.4rem,8.8vw,3.4rem)',
                background:'linear-gradient(175deg,#A80000 0%,#5A0000 55%,#2A0000 100%)',
                WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent',backgroundClip:'text',
                filter:'drop-shadow(0 1px 4px rgba(100,0,0,0.35))',
              }}>HELL</span>
            </h1>
            <p style={{
              fontFamily:'"Share Tech Mono",monospace',fontSize:'.50rem',
              letterSpacing:'.26em',color:T.accent,marginTop:10,textTransform:'uppercase',
            }}>The Upside Down &nbsp;∞</p>
          </div>

          {/* divider */}
          <div style={{
            height:1,marginBottom:20,
            background:'linear-gradient(90deg,transparent,rgba(170,50,0,0.32),rgba(210,75,0,0.46),rgba(170,50,0,0.32),transparent)',
          }}/>

          {/* error */}
          {error&&(
            <div style={{
              display:'flex',gap:8,alignItems:'flex-start',
              background:'rgba(90,0,0,0.22)',border:'1px solid rgba(160,0,0,0.28)',
              borderRadius:8,padding:'9px 13px',marginBottom:14,
              fontFamily:'"Share Tech Mono",monospace',fontSize:'.80rem',color:'#EDE0D4',lineHeight:1.5,
            }}>
              <span style={{color:'#DD2200',flexShrink:0,marginTop:1}}>⚠</span>{error}
            </div>
          )}

          {/* form */}
          <div style={{display:'flex',flexDirection:'column',gap:16}}>
            <div>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'baseline',marginBottom:6}}>
                <label style={{fontFamily:'"Barlow",sans-serif',fontSize:'.80rem',fontWeight:600,color:T.label}}>Team Name</label>
                <span style={{fontFamily:'"Share Tech Mono",monospace',fontSize:'.48rem',letterSpacing:'.08em',color:T.muted}}>IDENTIFIER</span>
              </div>
              <input className="hell-input" value={team} onChange={e=>{setTeam(e.target.value);onType()}} autoComplete="username" spellCheck={false} placeholder="e.g. StackSmashers"/>
            </div>

            <div>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'baseline',marginBottom:6}}>
                <label style={{fontFamily:'"Barlow",sans-serif',fontSize:'.80rem',fontWeight:600,color:T.label}}>Password</label>
                <span style={{fontFamily:'"Share Tech Mono",monospace',fontSize:'.48rem',letterSpacing:'.08em',color:T.muted}}>ENCRYPTED</span>
              </div>
              <input className="hell-input" type="password" value={pass} onChange={e=>{setPass(e.target.value);onType()}} autoComplete="current-password" placeholder="••••••••"/>
            </div>

            <button onClick={handleSubmit} disabled={!canSubmit} className={canSubmit?'btn-on':'btn-off'} style={{marginTop:10}}>
              {loading?(
                <span style={{display:'inline-flex',alignItems:'center',gap:8,justifyContent:'center'}}>
                  <span className="spin" style={{display:'inline-block',width:12,height:12,borderRadius:'50%',border:'2px solid rgba(255,255,255,0.15)',borderTopColor:'#EDE0D4'}}/>
                  Descending…
                </span>
              ):'Descent'}
            </button>
          </div>

          {/* footer */}
          <div style={{
            marginTop:18,paddingTop:14,
            borderTop:'1px solid rgba(130,35,0,0.12)',
            display:'flex',alignItems:'center',justifyContent:'space-between',
          }}>
            <span style={{fontFamily:'"Share Tech Mono",monospace',fontSize:'.48rem',color:T.muted,letterSpacing:'.05em'}}>
              v1.0 &nbsp;·&nbsp; depth: ∞
            </span>
            <span style={{display:'flex',alignItems:'center',gap:5}}>
              <span style={{width:5,height:5,borderRadius:'50%',background:'#FF4400',boxShadow:'0 0 6px rgba(255,55,0,0.85)',animation:'blink 2s step-start infinite',display:'inline-block'}}/>
              <span style={{fontFamily:'"Share Tech Mono",monospace',fontSize:'.48rem',color:'rgba(210,85,35,0.52)',letterSpacing:'.05em'}}>CONTEST LIVE</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}