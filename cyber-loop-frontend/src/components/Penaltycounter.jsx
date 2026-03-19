import { useState, useEffect, useRef } from 'react'

const MAX_PENALTIES = 3  // only 3 penalty nodes exist

export default function PenaltyCounter({ count }) {
  const prevCount = useRef(count)
  const [flash, setFlash]  = useState(null) // 'up' | 'down' | null
  const [bump, setBump]    = useState(null)

  useEffect(() => {
    if (count === prevCount.current) return
    const dir = count > prevCount.current ? 'up' : 'down'
    setFlash(dir)
    setBump(dir)
    const t1 = setTimeout(() => setFlash(null), 700)
    const t2 = setTimeout(() => setBump(null),  500)
    prevCount.current = count
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [count])

  const ticks = Math.min(count, MAX_PENALTIES)

  return (
    <div style={{
      position:'fixed', right:18, top:'50%',
      transform:'translateY(-50%)', zIndex:40, pointerEvents:'none',
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Share+Tech+Mono&display=swap');
        @keyframes penUp   { 0%{transform:scale(1)} 35%{transform:scale(1.6)}  100%{transform:scale(1)} }
        @keyframes penDown { 0%{transform:scale(1)} 35%{transform:scale(0.62)} 100%{transform:scale(1)} }
        @keyframes glowUp  { 0%,100%{box-shadow:0 0 0 rgba(227,18,18,0)}   40%{box-shadow:0 0 38px rgba(227,18,18,0.5),0 0 70px rgba(227,18,18,0.15)} }
        @keyframes glowDwn { 0%,100%{box-shadow:0 0 0 rgba(0,200,80,0)}    40%{box-shadow:0 0 24px rgba(0,200,80,0.3)} }
        @keyframes tickIn  { from{transform:scaleY(0);opacity:0} to{transform:scaleY(1);opacity:1} }
      `}</style>

      <div style={{
        background:'rgba(5,3,12,0.93)',
        border:`1px solid ${count > 0 ? 'rgba(227,18,18,0.35)' : 'rgba(255,255,255,0.07)'}`,
        borderRadius:10,
        padding:'14px 11px',
        display:'flex', flexDirection:'column', alignItems:'center', gap:9,
        backdropFilter:'blur(12px)',
        minWidth:52,
        transition:'border-color 0.4s',
        animation: flash === 'up' ? 'glowUp 0.7s ease-out' : flash === 'down' ? 'glowDwn 0.7s ease-out' : 'none',
      }}>

        <span style={{
          fontFamily:'"Share Tech Mono",monospace',
          fontSize:'0.5rem', letterSpacing:'0.16em', textTransform:'uppercase',
          color: count > 0 ? 'rgba(227,18,18,0.65)' : 'rgba(255,255,255,0.2)',
          transition:'color 0.4s',
        }}>PENALTY</span>

        <span style={{ fontSize:'1rem', lineHeight:1, opacity: count > 0 ? 1 : 0.3 }}>☠</span>

        <div style={{
          fontFamily:'"Share Tech Mono",monospace',
          fontSize:'1.5rem', fontWeight:700, lineHeight:1,
          color: count > 0 ? '#e31212' : 'rgba(255,255,255,0.18)',
          transition:'color 0.4s',
          animation: bump === 'up' ? 'penUp 0.5s ease-out' : bump === 'down' ? 'penDown 0.5s ease-out' : 'none',
        }}>
          {count}
        </div>

        {/* 3 tick marks only */}
        <div style={{ display:'flex', gap:4 }}>
          {Array.from({ length: MAX_PENALTIES }, (_, i) => (
            <div key={i} style={{
              width:4, height:14, borderRadius:2,
              background: i < ticks ? '#e31212' : 'rgba(255,255,255,0.05)',
              boxShadow: i < ticks ? '0 0 7px rgba(227,18,18,0.55)' : 'none',
              transition:'all 0.35s ease',
              transformOrigin:'bottom',
              animation: i === ticks-1 && bump === 'up' ? 'tickIn 0.35s ease-out' : 'none',
            }}/>
          ))}
        </div>
      </div>
    </div>
  )
}