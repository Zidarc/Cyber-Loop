import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import EmberCanvas from '../components/EmberCanvas'
import SplashCursor from '../components/SplashCursor'

// ── Matches Landing.jsx exactly ───────────────────────────────────────────
const COLORS = {
  bg:          '#050405',
  primaryRed:  '#e31212',
  glowRed:     'rgba(227, 18, 18, 0.4)',
  textAsh:     'rgba(255, 255, 255, 0.6)',
  glassBg:     'rgba(15, 10, 12, 0.7)',
  glassBorder: 'rgba(255, 255, 255, 0.11)',
}

// CornerBtn — exact copy from Landing.jsx
function CornerBtn({ label, onClick }) {
  const s = 7, t = 1
  return (
    <button
      onClick={onClick}
      style={{
        position:'relative', background:'none', border:'none', cursor:'none',
        padding:'8px 16px',
        fontFamily:'"Share Tech Mono",monospace', fontSize:'.75rem',
        letterSpacing:'.14em', color:COLORS.textAsh, transition:'all .2s',
      }}
      onMouseEnter={e=>{
        e.currentTarget.style.color='#fff'
        e.currentTarget.querySelectorAll('.cb').forEach(el=>el.style.opacity='1')
      }}
      onMouseLeave={e=>{
        e.currentTarget.style.color=COLORS.textAsh
        e.currentTarget.querySelectorAll('.cb').forEach(el=>el.style.opacity='0')
      }}
    >
      {[
        {top:0,left:0,   borderTop:`${t}px solid ${COLORS.primaryRed}`,borderLeft:`${t}px solid ${COLORS.primaryRed}`},
        {top:0,right:0,  borderTop:`${t}px solid ${COLORS.primaryRed}`,borderRight:`${t}px solid ${COLORS.primaryRed}`},
        {bottom:0,left:0,borderBottom:`${t}px solid ${COLORS.primaryRed}`,borderLeft:`${t}px solid ${COLORS.primaryRed}`},
        {bottom:0,right:0,borderBottom:`${t}px solid ${COLORS.primaryRed}`,borderRight:`${t}px solid ${COLORS.primaryRed}`},
      ].map((st,i)=>(
        <span key={i} className="cb" style={{position:'absolute',width:s,height:s,opacity:0,transition:'opacity .2s',...st}}/>
      ))}
      {label}
    </button>
  )
}

export default function EndScreen() {
  const { state } = useLocation()
  const navigate  = useNavigate()
  const isWin     = state?.result === 'win'
  const score     = state?.score    ?? 0
  const teamName  = state?.teamName || sessionStorage.getItem('teamName') || 'TEAM'

  const contentRef = useRef(null)

  useEffect(() => {
    // Stagger reveal matching Landing's GSAP data-animate pattern
    import('gsap').then(({ gsap }) => {
      if (!contentRef.current) return
      const els = contentRef.current.querySelectorAll('[data-animate]')
      gsap.set(els, { opacity:0, y:40, filter:'blur(8px)' })
      gsap.to(els, {
        opacity:1, y:0, filter:'blur(0px)',
        duration:0.9, ease:'power3.out',
        stagger:0.12, delay:0.3,
      })
    }).catch(() => {
      if (contentRef.current) contentRef.current.style.opacity = '1'
    })
  }, [])

  return (
    <div style={{
      minHeight:  '100vh',
      background: COLORS.bg,
      display:    'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
      position:   'relative', overflow:'hidden', padding:'32px 24px',
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@700;900&family=Share+Tech+Mono&display=swap');

        @keyframes blink   { 0%,49%{opacity:1} 50%,100%{opacity:0} }
        @keyframes floatY  { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-10px)} }
        @keyframes pulse   { 0%,100%{opacity:.7} 50%{opacity:1} }
        @keyframes scoreIn { from{opacity:0;transform:scale(0.85)} to{opacity:1;transform:scale(1)} }

        /* Win: outlined title like Landing's .st-title */
        .end-title-win {
          color: transparent;
          -webkit-text-stroke: 1.5px ${COLORS.primaryRed};
          filter: drop-shadow(0 0 10px ${COLORS.glowRed});
        }

        /* Loss: solid red */
        .end-title-loss {
          color: ${COLORS.primaryRed};
          text-shadow: 0 0 24px ${COLORS.glowRed}, 0 0 60px rgba(227,18,18,0.3);
        }

        .end-nav-btn:hover { color:#fff !important; }
      `}</style>

      {/* Radial underglow — same as Landing */}
      <div style={{
        position:'fixed', inset:0, zIndex:0,
        background:`radial-gradient(ellipse 80% 70% at 50% 100%, rgba(227,18,18,0.08) 0%, transparent 65%)`,
      }}/>

      <EmberCanvas
        count={30} vxSpread={0.28} vyMin={0.16} vyRange={0.28}
        sizeMin={0.6} sizeRange={1.8} travelMin={0.32} travelRange={0.18}
        alphaScale={0.5} zIndex={1}
      />
      <SplashCursor/>

      {/* TOP NAV — same layout as Landing */}
      <nav style={{
        position:'fixed', top:0, width:'100%',
        display:'flex', justifyContent:'space-between', alignItems:'center',
        padding:'30px 50px', zIndex:100, boxSizing:'border-box',
      }}>
        <div style={{display:'flex',alignItems:'center',gap:12}}>
          <div style={{width:8,height:8,background:COLORS.primaryRed,borderRadius:'50%',boxShadow:`0 0 10px ${COLORS.primaryRed}`,animation:'blink 2s step-start infinite'}}/>
          <span style={{fontFamily:'"Cinzel"',fontSize:'.8rem',color:COLORS.primaryRed,letterSpacing:'.2em'}}>RECURSION HELL</span>
        </div>
        <div style={{display:'flex',gap:8}}>
          <CornerBtn label="SCOREBOARD" onClick={() => navigate('/scoreboard')}/>
          <CornerBtn label="← LANDING"  onClick={() => navigate('/')}/>
        </div>
      </nav>

      {/* CONTENT */}
      <div ref={contentRef} style={{ position:'relative', zIndex:10, textAlign:'center', maxWidth:640 }}>

        {/* Transmission tag */}
        <p data-animate style={{
          fontFamily:'"Share Tech Mono",monospace', color:COLORS.primaryRed,
          marginBottom:20, fontSize:'.7rem', letterSpacing:'.4em',
          opacity:0.7,
        }}>
          {isWin ? '// TRANSMISSION COMPLETE' : '// SIGNAL LOST'}
        </p>

        {/* Icon */}
        <div data-animate style={{
          fontSize:'3.8rem', marginBottom:20,
          animation: isWin ? 'floatY 3s ease-in-out infinite' : 'blink 3.5s step-start infinite',
          filter: isWin
            ? `drop-shadow(0 0 18px ${COLORS.glowRed})`
            : `drop-shadow(0 0 18px rgba(227,18,18,0.85))`,
        }}>
          {isWin ? '⬡' : '☠'}
        </div>

        {/* Main title — matches Landing h1 pattern */}
        <h1
          data-animate
          className={isWin ? 'end-title-win' : 'end-title-loss'}
          style={{
            fontFamily:'"Cinzel",serif', fontWeight:900,
            fontSize:'clamp(3rem,10vw,7rem)',
            marginBottom:12, lineHeight:1,
            letterSpacing:'.1em',
          }}
        >
          {isWin ? 'ESCAPED' : 'CLAIMED'}
        </h1>

        {/* Subtitle — matches Landing "TO THE UPSIDE DOWN" style */}
        <p data-animate style={{
          fontFamily:'"Cinzel",serif', color:COLORS.textAsh,
          fontSize:'.8rem', letterSpacing:'.4em', marginBottom:50,
          textTransform:'uppercase',
        }}>
          {isWin ? 'THE UPSIDE DOWN RELEASES ITS GRIP' : 'THE MIND FLAYER CLAIMS YOUR SOUL'}
        </p>

        <p data-animate style={{
          fontFamily:'"Share Tech Mono",monospace', color:'rgba(255, 255, 255, 0.78)',
          fontSize:'.82rem', letterSpacing:'.08em', lineHeight:1.7,
          marginBottom:38,
        }}>
          {isWin
            ? "You obtained Vecna's Mind Dial. Congratulations."
            : "You lost Vecna's Mind Dial. The Upside Down keeps it for now."}
        </p>

        {/* Score card — matches glassBg card pattern from Landing/Login */}
        <div data-animate style={{
          display:'inline-flex', flexDirection:'column', alignItems:'center', gap:8,
          padding:'28px 60px', borderRadius:8,
          background:  COLORS.glassBg,
          border:      `1px solid ${COLORS.glassBorder}`,
          backdropFilter: 'blur(20px)',
          boxShadow:   `0 8px 40px ${COLORS.glowRed}`,
          marginBottom: 48,
          animation:   'scoreIn .9s cubic-bezier(.23,1,.32,1) .3s both',
        }}>
          <span style={{
            fontFamily:'"Share Tech Mono",monospace', fontSize:'.58rem',
            color:COLORS.textAsh, letterSpacing:'.28em', textTransform:'uppercase',
          }}>
            FINAL SCORE
          </span>
          <span style={{
            fontFamily:'"Cinzel",serif', fontWeight:900,
            fontSize:'clamp(2.4rem,7vw,4rem)', lineHeight:1,
            color: COLORS.primaryRed,
            textShadow: `0 0 30px ${COLORS.glowRed}`,
            animation:'pulse 2.5s ease-in-out infinite',
          }}>
            {score}
          </span>
          <span style={{
            fontFamily:'"Share Tech Mono",monospace', fontSize:'.62rem',
            color:COLORS.textAsh, letterSpacing:'.14em',
          }}>
            {teamName}
          </span>
        </div>

        {/* Actions — CornerBtn style matching Landing nav */}
        <div data-animate style={{display:'flex',gap:8,justifyContent:'center',flexWrap:'wrap'}}>
          <CornerBtn label="SCOREBOARD"    onClick={() => navigate('/scoreboard')}/>
          <CornerBtn label="← RETURN"      onClick={() => navigate('/')}/>
        </div>
      </div>
    </div>
  )
}