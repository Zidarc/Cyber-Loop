import { useState, useEffect, useRef } from 'react'

/* ══════════════════════════════════════════
   CONFIG — backend dev fills these in
══════════════════════════════════════════ */
const PROBLEMS = ['P1','P2','P3','P4','P5','P6','P7']   // 7 problems
const POLL_INTERVAL = 30000  // 30s auto-refresh

// ── MOCK DATA — replace with real API call ──
const MOCK_TEAMS = [
  { id:1, name:'StackSmashers',  score:720, time:'1:24:10', penalty:2, problems:[1,1,1,0,1,0,1] },
  { id:2, name:'NullPointers',   score:680, time:'1:31:44', penalty:3, problems:[1,1,1,1,0,0,1] },
  { id:3, name:'RecursiveBeasts',score:640, time:'1:44:02', penalty:1, problems:[1,1,0,1,1,0,1] },
  { id:4, name:'HeapOverflow',   score:560, time:'1:52:18', penalty:4, problems:[1,1,1,0,0,0,1] },
  { id:5, name:'SegFaultElite',  score:480, time:'2:03:55', penalty:2, problems:[1,0,1,0,1,0,0] },
  { id:6, name:'ByteBandits',    score:400, time:'2:11:30', penalty:5, problems:[1,1,0,0,0,0,1] },
  { id:7, name:'CoreDumpers',    score:320, time:'2:22:09', penalty:3, problems:[1,0,0,0,1,0,0] },
  { id:8, name:'VoidWalkers',    score:240, time:'2:34:47', penalty:6, problems:[0,1,0,0,0,1,0] },
  { id:9, name:'MemLeakers',     score:160, time:'2:48:00', penalty:2, problems:[1,0,0,0,0,0,0] },
  { id:10,name:'WildPointers',   score:80,  time:'2:55:20', penalty:1, problems:[0,0,1,0,0,0,0] },
]

/* ══════════════════════════════════════════
   THEME
══════════════════════════════════════════ */
const T = {
  bg:       '#16151a',
  surface:  'rgba(28,26,32,0.92)',
  border:   'rgba(255,255,255,0.07)',
  gold:     '#FFB020',
  silver:   '#C0C8D8',
  bronze:   '#D07840',
  accent:   '#FF6600',
  accentDim:'rgba(220,100,40,0.55)',
  text:     '#DDD0C8',
  muted:    'rgba(200,180,160,0.40)',
  solved:   '#4CAF50',
  unsolved: 'rgba(255,255,255,0.12)',
  wrong:    '#CC3300',
  rowHover: 'rgba(255,255,255,0.03)',
  myRow:    'rgba(200,80,0,0.09)',
}

/* ══════════════════════════════════════════
   RANK MEDAL
══════════════════════════════════════════ */
function Medal({ rank }) {
  if (rank === 1) return <span style={{fontSize:'1.1rem'}}>🥇</span>
  if (rank === 2) return <span style={{fontSize:'1.1rem'}}>🥈</span>
  if (rank === 3) return <span style={{fontSize:'1.1rem'}}>🥉</span>
  return <span style={{fontFamily:'"Share Tech Mono",monospace',fontSize:'.80rem',color:T.muted}}>#{rank}</span>
}

/* ══════════════════════════════════════════
   PROBLEM CELL
══════════════════════════════════════════ */
function ProblemCell({ status }) {
  if (status === 1) return (
    <div style={{
      width:26,height:26,borderRadius:6,
      background:'rgba(76,175,80,0.15)',
      border:`1px solid rgba(76,175,80,0.40)`,
      display:'flex',alignItems:'center',justifyContent:'center',
      fontSize:'.70rem',color:T.solved,
    }}>✓</div>
  )
  if (status === -1) return (
    <div style={{
      width:26,height:26,borderRadius:6,
      background:'rgba(204,51,0,0.12)',
      border:`1px solid rgba(204,51,0,0.35)`,
      display:'flex',alignItems:'center',justifyContent:'center',
      fontSize:'.70rem',color:T.wrong,
    }}>✗</div>
  )
  return (
    <div style={{
      width:26,height:26,borderRadius:6,
      background:'rgba(255,255,255,0.04)',
      border:`1px solid rgba(255,255,255,0.08)`,
      display:'flex',alignItems:'center',justifyContent:'center',
      fontSize:'.60rem',color:'rgba(200,180,160,0.22)',
    }}>—</div>
  )
}

/* ══════════════════════════════════════════
   TOP 3 PODIUM
══════════════════════════════════════════ */
function Podium({ teams }) {
  const top3 = teams.slice(0,3)
  const order = [1,0,2]  // display: 2nd, 1st, 3rd
  const heights = ['120px','150px','100px']
  const colors  = [T.silver, T.gold, T.bronze]
  const labels  = ['2ND','1ST','3RD']

  return (
    <div style={{
      display:'flex',alignItems:'flex-end',justifyContent:'center',
      gap:12,marginBottom:40,padding:'0 16px',
    }}>
      {order.map((teamIdx,i) => {
        const team = top3[teamIdx]
        if (!team) return null
        const color = colors[i]
        const isFirst = teamIdx === 0
        return (
          <div key={team.id} style={{
            display:'flex',flexDirection:'column',alignItems:'center',
            flex:1,maxWidth:220,
            animation:`fadeUp .6s ease-out ${i*.12}s both`,
          }}>
            {/* team card */}
            <div style={{
              width:'100%',
              background: isFirst
                ? `linear-gradient(160deg,rgba(255,176,32,0.14) 0%,rgba(255,140,0,0.06) 100%)`
                : `rgba(28,26,32,0.80)`,
              border:`1px solid ${color}44`,
              borderRadius:12,
              padding:'16px 14px 12px',
              textAlign:'center',
              backdropFilter:'blur(16px)',
              boxShadow: isFirst ? `0 0 40px rgba(255,176,32,0.12),0 8px 32px rgba(0,0,0,0.50)` : `0 8px 28px rgba(0,0,0,0.45)`,
              marginBottom:8,
            }}>
              <div style={{fontSize:'1.5rem',marginBottom:6}}>
                {teamIdx===0?'🥇':teamIdx===1?'🥈':'🥉'}
              </div>
              <div style={{
                fontFamily:'"Cinzel",serif',fontWeight:700,
                fontSize:'.80rem',letterSpacing:'.06em',
                color,marginBottom:4,
                whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis',
              }}>{team.name}</div>
              <div style={{
                fontFamily:'"Share Tech Mono",monospace',
                fontSize:'1.15rem',fontWeight:700,color,
                marginBottom:2,
              }}>{team.score}</div>
              <div style={{fontFamily:'"Share Tech Mono",monospace',fontSize:'.58rem',color:T.muted}}>
                {team.time} &nbsp;·&nbsp; {team.penalty} pen
              </div>
            </div>
            {/* podium block */}
            <div style={{
              width:'100%',height:heights[i],
              background:`linear-gradient(180deg,${color}22 0%,${color}0A 100%)`,
              border:`1px solid ${color}33`,
              borderBottom:'none',borderRadius:'8px 8px 0 0',
              display:'flex',alignItems:'center',justifyContent:'center',
            }}>
              <span style={{fontFamily:'"Cinzel",serif',fontWeight:900,fontSize:'1.4rem',color:`${color}66`}}>
                {labels[i]}
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

/* ══════════════════════════════════════════
   SCOREBOARD
══════════════════════════════════════════ */
export default function Scoreboard() {
  const [teams,    setTeams]    = useState(MOCK_TEAMS)
  const [loading,  setLoading]  = useState(false)
  const [lastSync, setLastSync] = useState(new Date())
  const [hover,    setHover]    = useState(null)
  const myTeam = sessionStorage.getItem('teamName') || ''

  // sorted by score desc
  const ranked = [...teams].sort((a,b)=>b.score-a.score)

  async function fetchScores() {
    setLoading(true)
    try {
      // ── BACKEND HOOK ──────────────────────────────────────
      // const res = await fetch('/api/scoreboard')
      // if (res.ok) {
      //   const data = await res.json()
      //   setTeams(data.teams)
      // }
      // ──────────────────────────────────────────────────────
      setLastSync(new Date())
    } catch(e) { console.error('Score fetch failed',e) }
    setLoading(false)
  }

  // auto-poll
  useEffect(()=>{
    fetchScores()
    const iv = setInterval(fetchScores, POLL_INTERVAL)
    return()=>clearInterval(iv)
  },[])

  return (
    <div style={{minHeight:'100vh',background:T.bg,fontFamily:'"Barlow",sans-serif'}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@700;900&family=Share+Tech+Mono&family=Barlow:wght@400;500;600&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        @keyframes fadeUp  {from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
        @keyframes spin    {to{transform:rotate(360deg)}}
        @keyframes blink   {0%,49%{opacity:1}50%,100%{opacity:0}}
        @keyframes shimmer {0%{background-position:-200% center}100%{background-position:200% center}}
        @keyframes rowIn   {from{opacity:0;transform:translateX(-8px)}to{opacity:1;transform:translateX(0)}}
        ::-webkit-scrollbar{width:5px;height:5px}
        ::-webkit-scrollbar-track{background:rgba(255,255,255,0.03)}
        ::-webkit-scrollbar-thumb{background:rgba(200,100,0,0.25);border-radius:4px}
        ::-webkit-scrollbar-thumb:hover{background:rgba(200,100,0,0.40)}
      `}</style>

      {/* ── NAV ── */}
      <nav style={{
        position:'sticky',top:0,zIndex:50,
        display:'flex',alignItems:'center',justifyContent:'space-between',
        padding:'13px 28px',
        background:'rgba(16,14,18,0.88)',
        borderBottom:`1px solid ${T.border}`,
        backdropFilter:'blur(20px)',
      }}>
        <div style={{display:'flex',alignItems:'center',gap:10}}>
          <span style={{width:7,height:7,borderRadius:'50%',background:'#FF4400',boxShadow:'0 0 6px rgba(255,55,0,0.9)',animation:'blink 2s step-start infinite',display:'inline-block'}}/>
          <span style={{fontFamily:'"Cinzel",serif',fontSize:'.75rem',fontWeight:700,letterSpacing:'.14em',color:'rgba(200,80,40,0.80)'}}>
            RECURSION HELL
          </span>
        </div>

        <span style={{fontFamily:'"Cinzel",serif',fontWeight:700,fontSize:'.90rem',letterSpacing:'.20em',
          background:`linear-gradient(90deg,${T.gold},${T.accent},${T.gold})`,
          backgroundSize:'200%',animation:'shimmer 4s linear infinite',
          WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent',backgroundClip:'text',
        }}>SCOREBOARD</span>

        <div style={{display:'flex',alignItems:'center',gap:12}}>
          {/* last sync */}
          <span style={{fontFamily:'"Share Tech Mono",monospace',fontSize:'.55rem',color:T.muted,letterSpacing:'.05em'}}>
            sync {lastSync.toLocaleTimeString()}
          </span>
          {/* refresh */}
          <button
            onClick={fetchScores} disabled={loading}
            style={{
              background:'rgba(255,255,255,0.05)',border:`1px solid ${T.border}`,
              borderRadius:6,color:T.muted,padding:'5px 12px',cursor:'pointer',
              fontFamily:'"Share Tech Mono",monospace',fontSize:'.60rem',letterSpacing:'.06em',
              transition:'all .15s',display:'flex',alignItems:'center',gap:6,
            }}
            onMouseEnter={e=>e.currentTarget.style.background='rgba(255,255,255,0.09)'}
            onMouseLeave={e=>e.currentTarget.style.background='rgba(255,255,255,0.05)'}
          >
            {loading
              ? <span style={{display:'inline-block',width:10,height:10,borderRadius:'50%',border:'1.5px solid rgba(255,255,255,0.2)',borderTopColor:T.accent,animation:'spin .7s linear infinite'}}/>
              : '↻'
            }
            REFRESH
          </button>
          <a href="/landing" style={{
            fontFamily:'"Share Tech Mono",monospace',fontSize:'.68rem',letterSpacing:'.08em',
            color:'rgba(200,160,140,0.50)',textDecoration:'none',
            border:`1px solid rgba(160,50,0,0.22)`,borderRadius:6,padding:'6px 14px',transition:'all .15s',
          }}
          onMouseEnter={e=>{ e.target.style.color='rgba(230,180,140,0.85)'; e.target.style.background='rgba(180,50,0,0.10)' }}
          onMouseLeave={e=>{ e.target.style.color='rgba(200,160,140,0.50)'; e.target.style.background='transparent' }}
          >← BACK</a>
        </div>
      </nav>

      <div style={{maxWidth:1100,margin:'0 auto',padding:'36px 20px 60px'}}>

        {/* ── PODIUM ── */}
        <Podium teams={ranked}/>

        {/* ── TABLE ── */}
        <div style={{
          background:T.surface,
          border:`1px solid ${T.border}`,
          borderRadius:14,
          overflow:'hidden',
          boxShadow:'0 20px 60px rgba(0,0,0,0.50)',
          animation:'fadeUp .5s ease-out .2s both',
        }}>
          {/* table header */}
          <div style={{overflowX:'auto'}}>
            <table style={{width:'100%',borderCollapse:'collapse',minWidth:700}}>
              <thead>
                <tr style={{background:'rgba(255,255,255,0.04)',borderBottom:`1px solid ${T.border}`}}>
                  {/* rank */}
                  <th style={{...thStyle, width:52, textAlign:'center'}}>RANK</th>
                  {/* team */}
                  <th style={{...thStyle, textAlign:'left', paddingLeft:16}}>TEAM</th>
                  {/* score */}
                  <th style={{...thStyle, width:80, textAlign:'center', color:T.gold}}>SCORE</th>
                  {/* time */}
                  <th style={{...thStyle, width:90, textAlign:'center'}}>TIME</th>
                  {/* penalty */}
                  <th style={{...thStyle, width:72, textAlign:'center'}}>PEN</th>
                  {/* problems */}
                  {PROBLEMS.map(p=>(
                    <th key={p} style={{...thStyle, width:44, textAlign:'center', color:T.accentDim}}>{p}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ranked.map((team,i)=>{
                  const rank=i+1
                  const isMe = team.name===myTeam
                  const isHovered = hover===team.id
                  const rankColor = rank===1?T.gold:rank===2?T.silver:rank===3?T.bronze:T.text
                  return (
                    <tr
                      key={team.id}
                      onMouseEnter={()=>setHover(team.id)}
                      onMouseLeave={()=>setHover(null)}
                      style={{
                        borderBottom:`1px solid ${T.border}`,
                        background: isMe ? T.myRow : isHovered ? T.rowHover : 'transparent',
                        transition:'background .15s',
                        animation:`rowIn .4s ease-out ${i*.04}s both`,
                      }}
                    >
                      <td style={{...tdStyle, textAlign:'center'}}>
                        <Medal rank={rank}/>
                      </td>
                      <td style={{...tdStyle, paddingLeft:16}}>
                        <div style={{display:'flex',alignItems:'center',gap:8}}>
                          {isMe && (
                            <span style={{
                              fontSize:'.50rem',fontFamily:'"Share Tech Mono",monospace',
                              color:T.accent,border:`1px solid rgba(200,80,0,0.35)`,
                              borderRadius:4,padding:'1px 5px',letterSpacing:'.06em',
                            }}>YOU</span>
                          )}
                          <span style={{
                            fontFamily:'"Barlow",sans-serif',fontWeight:600,
                            fontSize:'.88rem',color: isMe ? T.accent : T.text,
                            letterSpacing:'.02em',
                          }}>{team.name}</span>
                        </div>
                      </td>
                      <td style={{...tdStyle, textAlign:'center'}}>
                        <span style={{
                          fontFamily:'"Share Tech Mono",monospace',
                          fontSize:'.88rem',fontWeight:700,color:rankColor,
                        }}>{team.score}</span>
                      </td>
                      <td style={{...tdStyle, textAlign:'center'}}>
                        <span style={{fontFamily:'"Share Tech Mono",monospace',fontSize:'.78rem',color:T.muted}}>
                          {team.time}
                        </span>
                      </td>
                      <td style={{...tdStyle, textAlign:'center'}}>
                        <span style={{
                          fontFamily:'"Share Tech Mono",monospace',fontSize:'.78rem',
                          color: team.penalty>3 ? T.wrong : T.muted,
                        }}>
                          {team.penalty>0 ? `+${team.penalty}` : '—'}
                        </span>
                      </td>
                      {PROBLEMS.map((_,pi)=>(
                        <td key={pi} style={{...tdStyle, textAlign:'center'}}>
                          <div style={{display:'flex',justifyContent:'center'}}>
                            <ProblemCell status={team.problems[pi] ?? 0}/>
                          </div>
                        </td>
                      ))}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* table footer */}
          <div style={{
            padding:'10px 16px',
            borderTop:`1px solid ${T.border}`,
            background:'rgba(255,255,255,0.02)',
            display:'flex',alignItems:'center',justifyContent:'space-between',
          }}>
            <span style={{fontFamily:'"Share Tech Mono",monospace',fontSize:'.55rem',color:T.muted,letterSpacing:'.05em'}}>
              {ranked.length} teams &nbsp;·&nbsp; {PROBLEMS.length} problems
            </span>
            <div style={{display:'flex',alignItems:'center',gap:14}}>
              <LegendDot color={T.solved}  label="Solved"/>
              <LegendDot color={T.wrong}   label="Wrong"/>
              <LegendDot color='rgba(255,255,255,0.22)' label="Unattempted"/>
            </div>
            <span style={{fontFamily:'"Share Tech Mono",monospace',fontSize:'.55rem',color:T.muted,letterSpacing:'.05em'}}>
              auto-refresh 30s
            </span>
          </div>
        </div>

      </div>
    </div>
  )
}

function LegendDot({ color, label }) {
  return (
    <span style={{display:'flex',alignItems:'center',gap:5,fontFamily:'"Share Tech Mono",monospace',fontSize:'.55rem',color:T.muted}}>
      <span style={{width:8,height:8,borderRadius:2,background:color,display:'inline-block'}}/>
      {label}
    </span>
  )
}

const thStyle = {
  fontFamily:'"Share Tech Mono",monospace',
  fontSize:'.62rem',letterSpacing:'.10em',
  color:'rgba(200,180,160,0.45)',
  padding:'12px 8px',fontWeight:400,
  whiteSpace:'nowrap',
}

const tdStyle = {
  padding:'11px 8px',
  verticalAlign:'middle',
}