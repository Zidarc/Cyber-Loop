export default function UnderConstruction() {
  return (
    <div style={{
      minHeight: '100vh',
      background: '#050405',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: '"Share Tech Mono", monospace',
      color: 'rgba(255,255,255,0.6)',
      textAlign: 'center',
      gap: 20,
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@700;900&family=Share+Tech+Mono&display=swap');
        @keyframes blink { 0%,49%{opacity:1} 50%,100%{opacity:0} }
        @keyframes floatY { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
      `}</style>

      <div style={{ animation: 'floatY 3s ease-in-out infinite', fontSize: '3rem' }}>⚙</div>

      <h1 style={{
        fontFamily: '"Cinzel", serif',
        fontWeight: 900,
        fontSize: 'clamp(1.5rem, 5vw, 2.5rem)',
        color: '#e31212',
        letterSpacing: '.2em',
        textShadow: '0 0 20px rgba(227,18,18,0.4)',
      }}>
        UNDER CONSTRUCTION
      </h1>

      <p style={{ fontSize: '.8rem', letterSpacing: '.2em', opacity: 0.5 }}>
        THE UPSIDE DOWN IS NOT READY YET
      </p>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10 }}>
        <span style={{
          width: 6, height: 6, borderRadius: '50%',
          background: '#e31212',
          boxShadow: '0 0 8px rgba(227,18,18,0.8)',
          animation: 'blink 1.2s step-start infinite',
          display: 'inline-block',
        }}/>
        <span style={{ fontSize: '.6rem', letterSpacing: '.3em', color: 'rgba(227,18,18,0.6)' }}>
          BUILDING IN PROGRESS
        </span>
      </div>

      <button
        onClick={() => window.location.assign('/')}
        style={{
          marginTop: 30,
          padding: '10px 28px',
          borderRadius: 50,
          background: 'transparent',
          border: '1px solid rgba(227,18,18,0.4)',
          color: 'rgba(255,255,255,0.5)',
          fontFamily: '"Share Tech Mono", monospace',
          fontSize: '.7rem',
          letterSpacing: '.2em',
          cursor: 'pointer',
          transition: 'all .2s',
        }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = '#e31212'; e.currentTarget.style.color = '#fff' }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(227,18,18,0.4)'; e.currentTarget.style.color = 'rgba(255,255,255,0.5)' }}
      >
        ← BACK TO LANDING
      </button>
    </div>
  )
}