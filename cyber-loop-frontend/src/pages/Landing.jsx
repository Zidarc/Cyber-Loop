import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import SplashCursor from '../components/SplashCursor'
// ── FIX #8: shared component replaces the inline duplicate EmberCanvas ──
import EmberCanvas from '../components/EmberCanvas'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

const COLORS = {
  bg: '#050405',
  primaryRed: '#e31212',
  glowRed: 'rgba(227, 18, 18, 0.4)',
  textAsh: 'rgba(255, 255, 255, 0.6)',
  glassBg: 'rgba(15, 10, 12, 0.7)',
}

/* ══════════════════════════════════════════════════════
    MAGNETIC ENTER BTN
══════════════════════════════════════════════════════ */
function MagneticEnterBtn({ onClick }) {
  const wrapRef = useRef(null); const btnRef = useRef(null)
  const pos = useRef({x:0,y:0}); const raf = useRef(null)
  function onMove(e) {
    const r = wrapRef.current?.getBoundingClientRect(); if(!r) return
    const dx=e.clientX-(r.left+r.width/2), dy=e.clientY-(r.top+r.height/2)
    const dist=Math.sqrt(dx*dx+dy*dy), radius=140
    pos.current = dist<radius ? {x:dx/dist*(1-dist/radius)*28, y:dy/dist*(1-dist/radius)*28} : {x:0,y:0}
    if(!raf.current) raf.current=requestAnimationFrame(()=>{ raf.current=null; if(wrapRef.current) wrapRef.current.style.transform=`translate(${pos.current.x}px,${pos.current.y}px)` })
  }
  function onEnter() { if(btnRef.current) btnRef.current.style.transform='rotateX(180deg)' }
  function onLeave() { if(btnRef.current) btnRef.current.style.transform='rotateX(0deg)'; pos.current={x:0,y:0}; if(wrapRef.current) wrapRef.current.style.transform='translate(0,0)' }
  useEffect(()=>{ window.addEventListener('mousemove',onMove); return()=>window.removeEventListener('mousemove',onMove) },[])
  return (
    <div style={{display:'flex',justifyContent:'center',width:'100%',perspective:'1000px',zIndex:20}}>
      <div ref={wrapRef} style={{transition:'transform .35s cubic-bezier(.23,1,.32,1)'}}>
        <div ref={btnRef} style={{transition:'transform .55s cubic-bezier(.23,1,.32,1)',transformStyle:'preserve-3d',position:'relative'}}>
          <button onClick={onClick} onMouseEnter={onEnter} onMouseLeave={onLeave}
            style={{position:'relative',width:'340px',height:'65px',borderRadius:50,background:COLORS.glassBg,border:`1px solid ${COLORS.primaryRed}`,backdropFilter:'blur(20px)',boxShadow:`0 8px 40px ${COLORS.glowRed}`,overflow:'hidden',cursor:'none',transition:'all .25s',display:'block'}}>
            <span style={{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'"Cinzel",serif',fontWeight:700,fontSize:'0.95rem',letterSpacing:'.28em',textTransform:'uppercase',color:'#F5E8DC',textShadow:`0 0 12px ${COLORS.primaryRed}`,whiteSpace:'nowrap',backfaceVisibility:'hidden'}}>Enter the Upside Down</span>
            <span style={{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center',transform:'rotateX(180deg)',fontFamily:'"Cinzel",serif',fontWeight:700,fontSize:'0.95rem',letterSpacing:'.28em',textTransform:'uppercase',color:COLORS.primaryRed,whiteSpace:'nowrap',backfaceVisibility:'hidden'}}>NO WAY OUT</span>
          </button>
        </div>
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════
    CORNER BTN
══════════════════════════════════════════════════════ */
function CornerBtn({ label, onClick }) {
  const s=7,t=1
  return (
    <button onClick={onClick}
      style={{position:'relative',background:'none',border:'none',cursor:'none',padding:'8px 16px',fontFamily:'"Share Tech Mono",monospace',fontSize:'.75rem',letterSpacing:'.14em',color:COLORS.textAsh,transition:'all .2s'}}
      onMouseEnter={e=>{e.currentTarget.style.color='#fff';e.currentTarget.querySelectorAll('.cb').forEach(el=>el.style.opacity='1')}}
      onMouseLeave={e=>{e.currentTarget.style.color=COLORS.textAsh;e.currentTarget.querySelectorAll('.cb').forEach(el=>el.style.opacity='0')}}
    >
      {[{top:0,left:0,borderTop:`${t}px solid ${COLORS.primaryRed}`,borderLeft:`${t}px solid ${COLORS.primaryRed}`},{top:0,right:0,borderTop:`${t}px solid ${COLORS.primaryRed}`,borderRight:`${t}px solid ${COLORS.primaryRed}`},{bottom:0,left:0,borderBottom:`${t}px solid ${COLORS.primaryRed}`,borderLeft:`${t}px solid ${COLORS.primaryRed}`},{bottom:0,right:0,borderBottom:`${t}px solid ${COLORS.primaryRed}`,borderRight:`${t}px solid ${COLORS.primaryRed}`}].map((st,i)=><span key={i} className="cb" style={{position:'absolute',width:s,height:s,opacity:0,transition:'opacity .2s',...st}}/>)}
      {label}
    </button>
  )
}

/* ══════════════════════════════════════════════════════
    FLOATING RULEBOOK BTN
══════════════════════════════════════════════════════ */
function FloatingRulebookBtn() {
  const [hovered, setHovered] = useState(false)
  return (
    <div style={{position:'fixed',bottom:32,right:32,zIndex:100,animation:'floatY 3s ease-in-out infinite'}}>
      <a href="https://pdflink.to/recursionhell/" target="_blank" rel="noopener noreferrer"
        onMouseEnter={()=>setHovered(true)} onMouseLeave={()=>setHovered(false)}
        style={{display:'flex',alignItems:'center',gap:hovered?12:0,padding:'12px 16px',borderRadius:50,background:COLORS.glassBg,border:`1px solid rgba(255,255,255,0.1)`,backdropFilter:'blur(10px)',color:'#fff',cursor:'none',transition:'all .4s cubic-bezier(.23,1,.32,1)',textDecoration:'none'}}>
        <span style={{fontSize:'1.2rem',fontWeight:'bold'}}>ⓘ</span>
        <span style={{fontFamily:'"Share Tech Mono",monospace',fontSize:'.7rem',maxWidth:hovered?150:0,opacity:hovered?1:0,overflow:'hidden',whiteSpace:'nowrap',transition:'all .3s'}}>RULEBOOK</span>
      </a>
    </div>
  )
}

/* ══════════════════════════════════════════════════════
    SECTIONS DATA
══════════════════════════════════════════════════════ */
const LORE = [
  { isHero: true },
  { tag: '// TRANSMISSION 001', title: 'THE GATE HAS OPENED',     body: 'The boundary between worlds has collapsed. What was once theory is now reality. You have been chosen, not by chance, but by something far older.' },
  { tag: '// WARNING: CLASSIFIED', title: 'RECURSION PROTOCOL',    body: 'Each node you solve pulls you deeper. Each mistake echoes. The loop does not forgive, and the path back is never the same path forward.' },
  { tag: '// TRANSMISSION 002', title: 'THE MIND FLAYER WATCHES', body: 'You are not alone in the dark. Every wrong answer feeds it. Every hesitation strengthens its hold. Solve fast. Think faster.' },
  { tag: '// SYSTEM ALERT',     title: 'PENALTY NODES ACTIVE',    body: 'Wrong answers awaken dormant nodes. Ignore them at your peril — they drain your score with every passing second left unsolved.' },
  { tag: '// TRANSMISSION 003', title: 'THE FINAL NODE AWAITS',   body: 'Only when all paths are closed and all challenges met will the exit reveal itself. Until then, you are trapped in the upside down.' },
]

/* ══════════════════════════════════════════════════════
    MAIN LANDING
══════════════════════════════════════════════════════ */
export default function Landing() {
  // ── FIX #6: useNavigate instead of window.location.assign (keeps SPA navigation) ──
  const navigate = useNavigate()

  const videoA = useRef(null)
  const videoB = useRef(null)
  const [activeVideo, setActiveVideo] = useState('A')
  const containerRef = useRef(null)

  useEffect(() => { window.scrollTo({ top: 0, behavior: 'instant' }) }, [])

  useEffect(() => {
    let raf
    const check = () => {
      const vA=videoA.current, vB=videoB.current; if(!vA||!vB) return
      if(activeVideo==='A' && vA.duration-vA.currentTime<0.5){ vB.currentTime=0; vB.play(); setActiveVideo('B') }
      else if(activeVideo==='B' && vB.duration-vB.currentTime<0.5){ vA.currentTime=0; vA.play(); setActiveVideo('A') }
      raf=requestAnimationFrame(check)
    }
    raf=requestAnimationFrame(check)
    return()=>cancelAnimationFrame(raf)
  },[activeVideo])

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.set('[data-animate]', { opacity: 0, y: 40, filter: 'blur(8px)' })
      gsap.utils.toArray('[data-animate]').forEach((el) => {
        gsap.to(el, {
          opacity: 1, y: 0, filter: 'blur(0px)', duration: 0.9, ease: 'power3.out',
          scrollTrigger: { trigger: el, start: 'top 88%', toggleActions: 'play none none reset' },
        })
      })
    }, containerRef)
    return () => ctx.revert()
  }, [])

  useEffect(() => {
    let locked = false
    const onScroll = () => {
      if (locked) return
      const scrolled = window.scrollY
      const total = document.documentElement.scrollHeight - window.innerHeight
      if (scrolled >= total - 80) {
        locked = true
        gsap.set('[data-animate]', { opacity: 0, y: 40, filter: 'blur(8px)' })
        window.scrollTo({ top: 0, behavior: 'instant' })
        requestAnimationFrame(() => requestAnimationFrame(() => {
          ScrollTrigger.getAll().forEach(t => t.kill())
          gsap.set('[data-animate]', { opacity: 0, y: 40, filter: 'blur(8px)' })
          gsap.utils.toArray('[data-animate]').forEach((el) => {
            gsap.to(el, {
              opacity: 1, y: 0, filter: 'blur(0px)', duration: 0.9, ease: 'power3.out',
              scrollTrigger: { trigger: el, start: 'top 88%', toggleActions: 'play none none reset' },
            })
          })
          ScrollTrigger.refresh()
          locked = false
        }))
      }
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const allLore = [...LORE, ...LORE, ...LORE]

  return (
    <div ref={containerRef} style={{background:COLORS.bg,position:'relative'}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@700;900&family=Share+Tech+Mono&display=swap');
        /* ── FIX #15: Global cursor:none and user-select live in index.css, NOT here.
                       Injecting them inside a component <style> tag in a SPA means the
                       rules persist in <head> after this component unmounts.
                       Add these two lines to your index.css instead:
                         html, body, * { cursor: none !important; user-select: none; }
                         body { overflow-x: hidden; }                                  ── */
        * { scrollbar-width: none; -ms-overflow-style: none; }
        *::-webkit-scrollbar { display: none; }
        @keyframes floatY { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-10px)} }
        @keyframes blink  { 0%,49%{opacity:1} 50%,100%{opacity:0} }
        .st-title {
          color: transparent;
          -webkit-text-stroke: 1.5px ${COLORS.primaryRed};
          filter: drop-shadow(0 0 10px ${COLORS.glowRed});
        }
      `}</style>

      <div style={{position:'fixed',inset:0,zIndex:0,background:'#000'}}>
        <video ref={videoA} autoPlay muted playsInline style={{position:'absolute',inset:0,width:'100%',height:'100%',objectFit:'cover',opacity:0.75,zIndex:activeVideo==='A'?2:1}}>
          <source src="/Mindflayer.mp4" type="video/mp4"/>
        </video>
        <video ref={videoB} muted playsInline style={{position:'absolute',inset:0,width:'100%',height:'100%',objectFit:'cover',opacity:0.75,zIndex:activeVideo==='B'?2:1}}>
          <source src="/Mindflayer.mp4" type="video/mp4"/>
        </video>
      </div>

      {/* ── FIX #8: shared EmberCanvas — no more inline duplicate, leak fixed via cleanup ── */}
      <EmberCanvas count={30} vxSpread={0.28} vyMin={0.16} vyRange={0.28}
                   sizeMin={0.6} sizeRange={1.8} travelMin={0.32} travelRange={0.18}
                   alphaScale={0.5} zIndex={4} />
      <SplashCursor/>

      <nav style={{position:'fixed',top:0,width:'100%',display:'flex',justifyContent:'space-between',alignItems:'center',padding:'30px 50px',zIndex:100,boxSizing:'border-box'}}>
        <div style={{display:'flex',alignItems:'center',gap:12}}>
          <div style={{width:8,height:8,background:COLORS.primaryRed,borderRadius:'50%',boxShadow:`0 0 10px ${COLORS.primaryRed}`,animation:'blink 2s step-start infinite'}}/>
          <span style={{fontFamily:'"Cinzel"',fontSize:'.8rem',color:COLORS.primaryRed,letterSpacing:'.2em'}}>RECURSION HELL</span>
        </div>
        <div style={{display:'flex',gap:8}}>
          {/* ── FIX #6 + #7: useNavigate + lowercase routes ── */}
          <CornerBtn label="SCOREBOARD" onClick={() => navigate('/scoreboard')}/>
          <CornerBtn label="TEAM"       onClick={() => navigate('/team')}/>
        </div>
      </nav>

      {allLore.map((s, i) => (
        <div key={i} style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',position:'relative',zIndex:10}}>
          {s.isHero ? (
            <div style={{textAlign:'center',padding:'0 32px'}}>
              <p data-animate style={{fontFamily:'"Share Tech Mono"',color:COLORS.textAsh,marginBottom:20,fontSize:'0.9rem',letterSpacing:'0.5em'}}>
                YOU HAVE BEEN SUMMONED
              </p>
              <h1 data-animate className="st-title" style={{fontFamily:'"Cinzel"',fontWeight:900,fontSize:'clamp(3rem,10vw,7.5rem)',marginBottom:20,lineHeight:1}}>
                WANDERER
              </h1>
              <p data-animate style={{fontFamily:'"Cinzel"',color:COLORS.textAsh,fontSize:'0.8rem',letterSpacing:'.4em',marginBottom:8}}>
                TO THE UPSIDE DOWN
              </p>
              <p data-animate style={{fontFamily:'"Cinzel"',color:COLORS.primaryRed,fontSize:'1.8rem',fontWeight:900,letterSpacing:'.3em',textShadow:`0 0 20px ${COLORS.glowRed}`,marginBottom:50}}>
                RECURSION HELL
              </p>
              <div data-animate>
                {/* ── FIX #6: navigate() keeps us inside the SPA router ── */}
                <MagneticEnterBtn onClick={() => navigate('/login')}/>
              </div>
            </div>
          ) : (
            <div style={{textAlign:'center',maxWidth:700,margin:'0 auto',padding:'0 32px'}}>
              <p data-animate style={{fontFamily:'"Share Tech Mono",monospace',fontSize:'.7rem',color:COLORS.primaryRed,letterSpacing:'.3em',marginBottom:20,opacity:0.7}}>
                {s.tag}
              </p>
              <h2 data-animate style={{fontFamily:'"Cinzel",serif',fontWeight:900,fontSize:'clamp(1.4rem,4vw,2.2rem)',color:'#fff',letterSpacing:'.15em',marginBottom:28,textShadow:`0 0 30px ${COLORS.glowRed}`}}>
                {s.title}
              </h2>
              <p data-animate style={{fontFamily:'"Share Tech Mono",monospace',fontSize:'.85rem',color:COLORS.textAsh,lineHeight:2.2,letterSpacing:'.05em'}}>
                {s.body}
              </p>
            </div>
          )}
        </div>
      ))}

      <FloatingRulebookBtn/>
    </div>
  )
}