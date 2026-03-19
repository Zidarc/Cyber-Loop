import { useEffect, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
// ── FIX #8: shared EmberCanvas — visibilitychange leak fixed, no inline duplicate ──
import EmberCanvas from '../components/EmberCanvas'

export default function EndScreen() {
  const { state } = useLocation()
  const navigate  = useNavigate()
  const isWin     = state?.result === 'win'
  const score     = state?.score  ?? 0
  const teamName  = state?.teamName || sessionStorage.getItem('teamName') || 'TEAM'

  return (
    <div style={{
      minHeight:'100vh', background:'#03020a',
      display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
      position:'relative', overflow:'hidden', padding:'32px 24px',
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@700;900&family=Share+Tech+Mono&display=swap');
        /* ── FIX #15: Global cursor:none and user-select belong in index.css, NOT here.
                       Component-level <style> tags in a SPA persist in <head> after unmount.
                       Add to index.css:  html,body,*{ cursor:none!important; user-select:none; } ── */
        @keyframes blink    {0%,49%{opacity:1}50%,100%{opacity:0}}
        @keyframes fadeUp   {from{opacity:0;transform:translateY(28px)}to{opacity:1;transform:translateY(0)}}
        @keyframes floatY   {0%,100%{transform:translateY(0)}50%{transform:translateY(-10px)}}
        @keyframes glitchH  {0%,100%{clip-path:inset(0 0 98% 0)} 5%{clip-path:inset(12% 0 78% 0)} 10%{clip-path:inset(55% 0 35% 0)} 15%{clip-path:inset(0 0 98% 0)} 20%{clip-path:inset(30% 0 62% 0)} 25%{clip-path:inset(0 0 98% 0)}}
        @keyframes scanline {0%{transform:translateY(-100%)}100%{transform:translateY(100vh)}}
        @keyframes winGlow  {0%,100%{text-shadow:0 0 30px rgba(255,200,0,0.4)} 50%{text-shadow:0 0 60px rgba(255,200,0,0.8),0 0 100px rgba(255,100,0,0.3)}}
        @keyframes loseGlow {0%,100%{text-shadow:0 0 30px rgba(227,18,18,0.5)} 50%{text-shadow:0 0 60px rgba(227,18,18,0.9),0 0 100px rgba(100,0,0,0.4)}}
        @keyframes vigIn    {from{opacity:0}to{opacity:1}}
        @keyframes scoreIn  {from{opacity:0;transform:scale(0.7)}to{opacity:1;transform:scale(1)}}
        .end-btn:hover{background:rgba(255,255,255,0.06)!important;border-color:rgba(255,255,255,0.3)!important;color:#fff!important;}
        .end-btn-red:hover{background:rgba(227,18,18,0.12)!important;border-color:rgba(227,18,18,0.55)!important;color:#e31212!important;}
      `}</style>

      {/* Background radial */}
      <div style={{
        position:'fixed', inset:0, zIndex:0,
        background: isWin
          ? 'radial-gradient(ellipse 80% 60% at 50% 50%, rgba(255,180,0,0.07) 0%, rgba(227,18,18,0.04) 40%, transparent 70%)'
          : 'radial-gradient(ellipse 80% 60% at 50% 50%, rgba(60,0,0,0.4) 0%, transparent 65%)',
      }}/>

      {/* Vignette (loss only) */}
      {!isWin && (
        <div style={{
          position:'fixed', inset:0, zIndex:0, pointerEvents:'none',
          background:'radial-gradient(ellipse 100% 100% at 50% 50%, transparent 30%, rgba(0,0,0,0.75) 100%)',
          animation:'vigIn 1.5s ease-out',
        }}/>
      )}

      {/* Scanline (loss only) */}
      {!isWin && (
        <div style={{
          position:'fixed', top:0, left:0, right:0, height:2, zIndex:0,
          background:'linear-gradient(90deg,transparent,rgba(200,0,0,0.12),transparent)',
          animation:'scanline 6s linear infinite', pointerEvents:'none',
        }}/>
      )}

      {/* ── FIX #8: shared EmberCanvas with Endscreen-specific params ── */}
      <EmberCanvas count={30} vxSpread={0.2} vyMin={0.12} vyRange={0.2}
                   sizeMin={0.5} sizeRange={1.5} travelMin={0.3} travelRange={0.2}
                   alphaScale={0.5} zIndex={1} />

      {/* Glitch overlay (loss only) */}
      {!isWin && (
        <div style={{
          position:'fixed', inset:0, zIndex:2, pointerEvents:'none',
          animation:'glitchH 8s steps(1) infinite',
          background:'linear-gradient(transparent 49%, rgba(200,0,0,0.03) 50%, transparent 51%)',
        }}/>
      )}

      {/* Content */}
      <div style={{ position:'relative', zIndex:10, textAlign:'center', maxWidth:620 }}>

        <div style={{
          fontSize:'3.5rem', marginBottom:24,
          animation: isWin ? 'floatY 3s ease-in-out infinite' : 'blink 4s step-start infinite',
        }}>
          {isWin ? '⬡' : '☠'}
        </div>

        <div style={{
          fontFamily:'"Share Tech Mono",monospace', fontSize:'0.65rem',
          color: isWin ? 'rgba(255,180,0,0.6)' : 'rgba(227,18,18,0.55)',
          letterSpacing:'0.3em', textTransform:'uppercase',
          marginBottom:16, animation:'fadeUp 0.8s ease-out',
        }}>
          {isWin ? '// TRANSMISSION COMPLETE' : '// SIGNAL LOST'}
        </div>

        <h1 style={{
          fontFamily:'"Cinzel",serif', fontWeight:900,
          fontSize:'clamp(2.2rem,8vw,5rem)',
          letterSpacing:'0.15em', lineHeight:1.05,
          color: isWin ? '#FFD700' : '#e31212',
          animation: isWin ? 'winGlow 3s ease-in-out infinite, fadeUp 0.9s ease-out' : 'loseGlow 2.5s ease-in-out infinite, fadeUp 0.9s ease-out',
          marginBottom:12,
        }}>
          {isWin ? 'YOU ESCAPED' : 'CLAIMED'}
        </h1>

        <p style={{
          fontFamily:'"Cinzel",serif', fontWeight:700,
          fontSize:'clamp(0.85rem,2.5vw,1.1rem)',
          color: isWin ? 'rgba(255,220,100,0.55)' : 'rgba(200,30,30,0.6)',
          letterSpacing:'0.25em', textTransform:'uppercase',
          marginBottom:40, animation:'fadeUp 1s ease-out',
        }}>
          {isWin ? 'THE UPSIDE DOWN RELEASES ITS GRIP' : 'THE MIND FLAYER CLAIMS YOUR SOUL'}
        </p>

        {/* Score card */}
        <div style={{
          display:'inline-flex', flexDirection:'column', alignItems:'center', gap:6,
          padding:'22px 48px', borderRadius:10,
          background: isWin ? 'rgba(255,200,0,0.05)' : 'rgba(200,0,0,0.05)',
          border: `1px solid ${isWin ? 'rgba(255,200,0,0.22)' : 'rgba(200,0,0,0.25)'}`,
          marginBottom:40,
          animation:'scoreIn 0.9s cubic-bezier(.23,1,.32,1) 0.4s both',
        }}>
          <div style={{ fontFamily:'"Share Tech Mono",monospace', fontSize:'0.55rem', color:'rgba(255,255,255,0.25)', letterSpacing:'0.22em', textTransform:'uppercase' }}>
            FINAL SCORE
          </div>
          <div style={{
            fontFamily:'"Cinzel",serif', fontSize:'clamp(2rem,6vw,3.2rem)', fontWeight:900,
            color: isWin ? '#FFD700' : '#e31212',
            textShadow: isWin ? '0 0 30px rgba(255,200,0,0.4)' : '0 0 30px rgba(227,18,18,0.4)',
          }}>
            {score}
          </div>
          <div style={{ fontFamily:'"Share Tech Mono",monospace', fontSize:'0.62rem', color:'rgba(255,255,255,0.3)', letterSpacing:'0.12em' }}>
            {teamName}
          </div>
        </div>

        {/* Actions */}
        <div style={{ display:'flex', gap:12, justifyContent:'center', flexWrap:'wrap', animation:'fadeUp 1.1s ease-out 0.3s both' }}>
          {/* ── FIX #7: lowercase route ── */}
          <button
            className="end-btn"
            onClick={() => navigate('/scoreboard')}
            style={{
              padding:'11px 26px', borderRadius:5,
              background:'transparent', border:'1px solid rgba(255,255,255,0.14)',
              color:'rgba(255,255,255,0.4)', fontFamily:'"Share Tech Mono",monospace',
              fontSize:'0.68rem', letterSpacing:'0.14em', cursor:'none',
              textTransform:'uppercase', transition:'all 0.2s',
            }}
          >
            Scoreboard
          </button>
          <button
            className="end-btn-red"
            onClick={() => navigate('/')}
            style={{
              padding:'11px 26px', borderRadius:5,
              background:'transparent', border:'1px solid rgba(227,18,18,0.22)',
              color:'rgba(227,18,18,0.55)', fontFamily:'"Share Tech Mono",monospace',
              fontSize:'0.68rem', letterSpacing:'0.14em', cursor:'none',
              textTransform:'uppercase', transition:'all 0.2s',
            }}
          >
            ← Return to Landing
          </button>
        </div>
      </div>
    </div>
  )
}