import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import SplashCursor from '../components/SplashCursor'
import Lightning from '../components/Lightning'
// ── FIX #8: shared EmberCanvas replaces the inline duplicate ──
import EmberCanvas from '../components/EmberCanvas'

/* ══════════════════════════════════════════════════════
   THEME — matches Landing/Scoreboard exactly
══════════════════════════════════════════════════════ */
const COLORS = {
  bg:         '#050405',
  primaryRed: '#e31212',
  glowRed:    'rgba(227, 18, 18, 0.4)',
  textAsh:    'rgba(255, 255, 255, 0.6)',
  glassBg:    'rgba(15, 10, 12, 0.7)',
  gold:       '#FFD700',
  goldGlow:   'rgba(255,215,0,0.30)',
  silver:     '#C8C8D4',
  silverGlow: 'rgba(192,192,192,0.22)',
}

/* ══════════════════════════════════════════════════════
   TEAM DATA
══════════════════════════════════════════════════════ */
const TEAM = [
  {
    id: 'sana',
    name: 'Sana Munir',
    tier: 'command',
    role: 'Supreme Director',
    tags: ['COMMAND', 'CLEARANCE LVL 5'],
    bio: 'Orchestrates operations from the shadows. Nothing moves without her say.',
    linkedin: '#',
    file: 'OPERATIVE-001',
  },
  {
    id: 'adeena',
    name: 'Adeena Asif',
    tier: 'command',
    role: 'Executive Director',
    tags: ['COMMAND', 'CLEARANCE LVL 5'],
    bio: 'Keeps the mission aligned. Chaos is her domain and she thrives in it.',
    linkedin: '#',
    file: 'OPERATIVE-002',
  },
  {
    id: 'shaheer',
    name: 'Syed Shaheer Hasan',
    tier: 'module',
    role: 'Module Head',
    tags: ['MODULE LEAD', 'CLEARANCE LVL 4'],
    bio: 'Designs the skeleton of the system. Every module answers to him.',
    linkedin: '#',
    file: 'OPERATIVE-003',
  },
  {
    id: 'ahsan',
    name: 'Muhammad Ahsan',
    tier: 'module',
    role: 'Module Head',
    tags: ['MODULE LEAD', 'CLEARANCE LVL 4'],
    bio: 'Turns requirements into reality. Precision is not a habit — it is a reflex.',
    linkedin: '#',
    file: 'OPERATIVE-004',
  },
  {
    id: 'ali',
    name: 'Ali Hussain',
    tier: 'module',
    role: 'Lead Developer · Module Head',
    tags: ['BACKEND LEAD', 'MODULE HEAD', 'CLEARANCE LVL 4'],
    bio: 'Runs the backend, leads the stack, owns the pipeline. The engine behind everything.',
    linkedin: '#',
    file: 'OPERATIVE-005',
  },
  {
    id: 'hunza',
    name: 'Hunza Shahzadi',
    tier: 'field',
    role: 'Frontend Developer',
    tags: ['FRONTEND', 'UI SYSTEMS', 'CLEARANCE LVL 3'],
    bio: 'Crafts the interface between the user and the Upside Down. Makes dark look beautiful.',
    linkedin: '#',
    file: 'OPERATIVE-006',
  },
  {
    id: 'abd',
    name: 'Abdul Rahman',
    tier: 'field',
    role: 'Frontend Developer',
    tags: ['FRONTEND', 'UI SYSTEMS', 'CLEARANCE LVL 3'],
    bio: 'Brings pixels to life with surgical precision. If it renders, he built it.',
    linkedin: '#',
    file: 'OPERATIVE-007',
  },
]

const TIER_CFG = {
  command: { color: '#FFD700',  glow: 'rgba(255,215,0,0.30)',    border: 'rgba(255,215,0,0.35)',    stamp: 'TOP SECRET'  },
  module:  { color: '#e31212',  glow: 'rgba(227,18,18,0.35)',    border: 'rgba(227,18,18,0.35)',    stamp: 'CLASSIFIED'  },
  field:   { color: '#C8C8D4',  glow: 'rgba(192,192,192,0.22)',  border: 'rgba(192,192,192,0.22)',  stamp: 'RESTRICTED'  },
}

/* ══════════════════════════════════════════════════════
   LIGHTNING — same as Landing
══════════════════════════════════════════════════════ */
function LightningLayer() {
  const [bolts, setBolts] = useState([])
  useEffect(()=>{
    const CONFIGS = [
      {id:'L',hue:18,xOffset:-.80,speed:1.1,intensity:3.2,size:1.3,opacity:.45},
      {id:'C',hue:8, xOffset:0,  speed:.90,intensity:4.0,size:1.6,opacity:.55},
      {id:'R',hue:355,xOffset:.80,speed:.85,intensity:3.0,size:1.2,opacity:.40},
    ]
    let ts=[]
    const fire=()=>{
      setBolts([...CONFIGS].sort(()=>Math.random()-.5).slice(0,Math.random()<.3?2:1))
      ts.push(setTimeout(()=>{ setBolts([]); ts.push(setTimeout(fire,12000+Math.random()*8000)) },500))
    }
    ts.push(setTimeout(fire,4000))
    return()=>ts.forEach(clearTimeout)
  },[])
  if(!bolts.length) return null
  return (
    <div style={{position:'fixed',inset:0,zIndex:3,pointerEvents:'none',mixBlendMode:'screen'}}>
      {bolts.map(b=><div key={b.id} style={{position:'absolute',inset:0,opacity:b.opacity}}><Lightning hue={b.hue} xOffset={b.xOffset} speed={b.speed} intensity={b.intensity} size={b.size}/></div>)}
    </div>
  )
}

/* ══════════════════════════════════════════════════════
   CORNER BTN — same as Landing
══════════════════════════════════════════════════════ */
function CornerBtn({ label, onClick }) {
  const s = 7, t = 1
  return (
    <button onClick={onClick}
      style={{ position:'relative', background:'none', border:'none', cursor:'none', padding:'8px 16px', fontFamily:'"Share Tech Mono",monospace', fontSize:'.75rem', letterSpacing:'.14em', color:COLORS.textAsh, transition:'all .2s' }}
      onMouseEnter={e=>{ e.currentTarget.style.color='#fff'; e.currentTarget.querySelectorAll('.cb').forEach(el=>el.style.opacity='1') }}
      onMouseLeave={e=>{ e.currentTarget.style.color=COLORS.textAsh; e.currentTarget.querySelectorAll('.cb').forEach(el=>el.style.opacity='0') }}
    >
      {[
        {top:0,   left:0,  borderTop:`${t}px solid ${COLORS.primaryRed}`, borderLeft:`${t}px solid ${COLORS.primaryRed}`},
        {top:0,   right:0, borderTop:`${t}px solid ${COLORS.primaryRed}`, borderRight:`${t}px solid ${COLORS.primaryRed}`},
        {bottom:0,left:0,  borderBottom:`${t}px solid ${COLORS.primaryRed}`, borderLeft:`${t}px solid ${COLORS.primaryRed}`},
        {bottom:0,right:0, borderBottom:`${t}px solid ${COLORS.primaryRed}`, borderRight:`${t}px solid ${COLORS.primaryRed}`},
      ].map((st,i)=><span key={i} className="cb" style={{position:'absolute',width:s,height:s,opacity:0,transition:'opacity .2s',...st}}/>)}
      {label}
    </button>
  )
}

/* ══════════════════════════════════════════════════════
   LINKEDIN ICON
══════════════════════════════════════════════════════ */
function LinkedInIcon({ size=14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
    </svg>
  )
}

/* ══════════════════════════════════════════════════════
   DOSSIER CARD
══════════════════════════════════════════════════════ */
function DossierCard({ member, index }) {
  const [hov, setHov] = useState(false)
  const t = TIER_CFG[member.tier]

  return (
    <div
      onMouseEnter={()=>setHov(true)}
      onMouseLeave={()=>setHov(false)}
      style={{
        position:'relative',
        background: hov ? 'rgba(20,12,14,0.92)' : COLORS.glassBg,
        border:`1px solid ${hov ? t.border : 'rgba(255,255,255,0.07)'}`,
        borderLeft:`2px solid ${t.color}`,
        borderRadius:4,
        padding:'28px 22px 22px',
        backdropFilter:'blur(20px)',
        boxShadow: hov
          ? `0 20px 60px rgba(0,0,0,0.70), 0 0 30px ${t.glow}`
          : `0 8px 40px rgba(227,18,18,0.08)`,
        transform: hov ? 'translateY(-5px)' : 'translateY(0)',
        transition:'all .30s cubic-bezier(.23,1,.32,1)',
        animation:`cardIn .5s cubic-bezier(.23,1,.32,1) ${index*0.08}s both`,
        overflow:'hidden',
      }}
    >
      <div style={{position:'absolute',inset:0,pointerEvents:'none',backgroundImage:'repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,0,0,0.06) 2px,rgba(0,0,0,0.06) 4px)',opacity:.5,zIndex:0}}/>
      <div style={{position:'absolute',top:16,right:-24,transform:'rotate(22deg)',fontFamily:'"Share Tech Mono",monospace',fontSize:'.48rem',letterSpacing:'.20em',color:t.color,border:`1px solid ${t.color}`,padding:'2px 26px',opacity:hov?.50:.18,transition:'opacity .30s',pointerEvents:'none',zIndex:1}}>
        {t.stamp}
      </div>
      <div style={{position:'relative',zIndex:2,fontFamily:'"Share Tech Mono",monospace',fontSize:'.52rem',letterSpacing:'.16em',color:'rgba(255,255,255,0.20)',marginBottom:14}}>
        {member.file}
      </div>
      <div style={{position:'relative',zIndex:2,width:58,height:58,borderRadius:3,background:'rgba(25,12,14,1)',border:`1px solid ${t.border}`,marginBottom:16,display:'flex',alignItems:'center',justifyContent:'center',boxShadow:`0 0 18px ${t.glow}`,overflow:'hidden'}}>
        <span style={{fontFamily:'"Cinzel",serif',fontWeight:900,fontSize:'1.3rem',color:t.color,textShadow:`0 0 10px ${t.glow}`,letterSpacing:'.04em'}}>
          {member.name.split(' ').map(w=>w[0]).slice(0,2).join('')}
        </span>
      </div>
      <div style={{position:'relative',zIndex:2,fontFamily:'"Cinzel",serif',fontWeight:700,fontSize:'1.0rem',letterSpacing:'.06em',color:hov?'#fff':'rgba(255,255,255,0.88)',textShadow:hov?`0 0 14px ${t.glow}`:'none',marginBottom:5,transition:'all .25s',lineHeight:1.2}}>
        {member.name}
      </div>
      <div style={{position:'relative',zIndex:2,fontFamily:'"Share Tech Mono",monospace',fontSize:'.65rem',letterSpacing:'.14em',color:t.color,textShadow:`0 0 8px ${t.glow}`,marginBottom:12,textTransform:'uppercase'}}>
        {member.role}
      </div>
      <div style={{position:'relative',zIndex:2,display:'flex',flexWrap:'wrap',gap:5,marginBottom:14}}>
        {member.tags.map(tag=>(
          <span key={tag} style={{fontFamily:'"Share Tech Mono",monospace',fontSize:'.46rem',letterSpacing:'.10em',color:'rgba(255,255,255,0.35)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:2,padding:'2px 6px',background:'rgba(255,255,255,0.02)'}}>
            {tag}
          </span>
        ))}
      </div>
      <div style={{position:'relative',zIndex:2,fontFamily:'"Share Tech Mono",monospace',fontSize:'.72rem',color:COLORS.textAsh,lineHeight:1.8,marginBottom:20,fontStyle:'italic'}}>
        "{member.bio}"
      </div>
      <a href={member.linkedin} target="_blank" rel="noopener noreferrer"
        style={{position:'relative',zIndex:2,display:'inline-flex',alignItems:'center',gap:7,fontFamily:'"Share Tech Mono",monospace',fontSize:'.58rem',letterSpacing:'.10em',color:hov?t.color:'rgba(255,255,255,0.30)',textDecoration:'none',border:`1px solid ${hov?t.border:'rgba(255,255,255,0.10)'}`,borderRadius:3,padding:'5px 12px',background:hov?`rgba(227,18,18,0.08)`:'transparent',transition:'all .20s'}}
      >
        <LinkedInIcon size={12}/>
        LINKEDIN
      </a>
      <div style={{position:'absolute',bottom:0,left:0,right:0,height:1,background:`linear-gradient(90deg,transparent,${t.color},transparent)`,opacity:hov?.55:.12,transition:'opacity .30s'}}/>
    </div>
  )
}

/* ══════════════════════════════════════════════════════
   SECTION LABEL
══════════════════════════════════════════════════════ */
function SectionLabel({ label, sublabel, color }) {
  return (
    <div style={{display:'flex',alignItems:'center',gap:14,marginBottom:22}}>
      <div style={{height:1,width:20,background:`linear-gradient(90deg,transparent,${color})`}}/>
      <div>
        <div style={{fontFamily:'"Cinzel",serif',fontSize:'.70rem',fontWeight:700,letterSpacing:'.26em',color,textShadow:`0 0 10px ${color}55`}}>{label}</div>
        <div style={{fontFamily:'"Share Tech Mono",monospace',fontSize:'.52rem',letterSpacing:'.12em',color:'rgba(255,255,255,0.22)',marginTop:2}}>{sublabel}</div>
      </div>
      <div style={{flex:1,height:1,background:`linear-gradient(90deg,${color}44,transparent)`}}/>
    </div>
  )
}

/* ══════════════════════════════════════════════════════
   MAIN TEAM PAGE
══════════════════════════════════════════════════════ */
export default function Team() {
  // ── FIX #6: useNavigate instead of window.location.assign ──
  const navigate = useNavigate()

  const command = TEAM.filter(m=>m.tier==='command')
  const module  = TEAM.filter(m=>m.tier==='module')
  const field   = TEAM.filter(m=>m.tier==='field')

  return (
    <div style={{minHeight:'100vh',background:COLORS.bg,position:'relative',overflow:'hidden',userSelect:'none',WebkitUserSelect:'none'}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@700;900&family=Share+Tech+Mono&display=swap');
        *, *::before, *::after { box-sizing:border-box; margin:0; padding:0; user-select:none; -webkit-user-select:none; }
        /* ── FIX #15: cursor:none belongs in index.css not here ── */
        a { cursor: none !important; }
        @keyframes cardIn   { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
        @keyframes fadeDown { from{opacity:0;transform:translateY(-14px)} to{opacity:1;transform:translateY(0)} }
        @keyframes blink    { 0%,49%{opacity:1} 50%,100%{opacity:0} }
        @keyframes cinematicText {
          from { opacity:0; transform:translateY(20px); filter:blur(8px); }
          to   { opacity:1; transform:translateY(0);    filter:blur(0);   }
        }
        @keyframes pulse { 0%,100%{opacity:.5} 50%{opacity:1} }
        .st-title {
          color: transparent;
          -webkit-text-stroke: 1px ${COLORS.primaryRed};
          filter: drop-shadow(0 0 10px ${COLORS.glowRed});
        }
      `}</style>

      <div style={{position:'fixed',inset:0,zIndex:0,background:'radial-gradient(ellipse 90% 60% at 50% 100%, rgba(227,18,18,0.07) 0%, transparent 65%)'}}/>

      {/* ── FIX #8: shared EmberCanvas with team-page-specific params ── */}
      <EmberCanvas count={30} vxSpread={0.28} vyMin={0.16} vyRange={0.28}
                   sizeMin={0.6} sizeRange={1.8} travelMin={0.32} travelRange={0.18}
                   alphaScale={0.5} zIndex={4} />
      <LightningLayer/>
      <SplashCursor/>

      {/* ── NAVBAR ── */}
      <nav style={{position:'fixed',top:0,width:'100%',display:'flex',justifyContent:'space-between',alignItems:'center',padding:'30px 50px',zIndex:100,boxSizing:'border-box'}}>
        <div style={{display:'flex',alignItems:'center',gap:12}}>
          <div style={{width:8,height:8,background:COLORS.primaryRed,borderRadius:'50%',boxShadow:`0 0 10px ${COLORS.primaryRed}`,animation:'blink 2s step-start infinite'}}/>
          <span style={{fontFamily:'"Cinzel"',fontSize:'.8rem',color:COLORS.primaryRed,letterSpacing:'.2em'}}>RECURSION HELL</span>
        </div>
        <div style={{display:'flex',gap:8}}>
          {/* ── FIX #6 + #7: navigate() to lowercase route ── */}
          <CornerBtn label="SCOREBOARD" onClick={() => navigate('/scoreboard')}/>
          <CornerBtn label="← BACK"     onClick={() => window.history.back()}/>
        </div>
      </nav>

      {/* ── CONTENT ── */}
      <div style={{position:'relative',zIndex:10,maxWidth:1200,margin:'0 auto',padding:'110px 40px 80px'}}>

        {/* page header */}
        <div style={{textAlign:'center',marginBottom:64,animation:'fadeDown .8s ease-out both'}}>
          <p style={{fontFamily:'"Share Tech Mono",monospace',fontSize:'.65rem',letterSpacing:'.35em',color:COLORS.primaryRed,opacity:.7,marginBottom:14,animation:'pulse 2.5s ease-in-out infinite'}}>
            // HAWKINS LAB · PERSONNEL FILE · CLASSIFIED
          </p>
          <h1 className="st-title" style={{fontFamily:'"Cinzel",serif',fontWeight:900,fontSize:'clamp(2rem,5vw,3.2rem)',letterSpacing:'.30em',marginBottom:10,animation:'cinematicText 1s ease-out .2s both'}}>
            THE OPERATIVES
          </h1>
          <p style={{fontFamily:'"Share Tech Mono",monospace',fontSize:'.60rem',letterSpacing:'.22em',color:'rgba(255,255,255,0.22)'}}>
            RECURSION HELL &nbsp;·&nbsp; CYBER LOOP &nbsp;·&nbsp; {new Date().getFullYear()}
          </p>
        </div>

        {/* COMMAND */}
        <SectionLabel label="COMMAND" sublabel="Clearance Level 5 — Supreme Authority" color={COLORS.gold}/>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(270px,1fr))',gap:18,marginBottom:52}}>
          {command.map((m,i)=><DossierCard key={m.id} member={m} index={i}/>)}
        </div>

        {/* MODULE LEADS */}
        <SectionLabel label="MODULE LEADS" sublabel="Clearance Level 4 — Core Engineering" color={COLORS.primaryRed}/>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(270px,1fr))',gap:18,marginBottom:52}}>
          {module.map((m,i)=><DossierCard key={m.id} member={m} index={command.length+i}/>)}
        </div>

        {/* FIELD */}
        <SectionLabel label="FIELD OPERATIVES" sublabel="Clearance Level 3 — Interface Division" color={COLORS.silver}/>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(270px,1fr))',gap:18}}>
          {field.map((m,i)=><DossierCard key={m.id} member={m} index={command.length+module.length+i}/>)}
        </div>

        {/* footer */}
        <div style={{textAlign:'center',marginTop:72,fontFamily:'"Share Tech Mono",monospace',fontSize:'.50rem',letterSpacing:'.20em',color:'rgba(255,255,255,0.10)'}}>
          RECURSION HELL · CYBER LOOP · {new Date().getFullYear()} · ALL RECORDS SEALED
        </div>
      </div>
    </div>
  )
}