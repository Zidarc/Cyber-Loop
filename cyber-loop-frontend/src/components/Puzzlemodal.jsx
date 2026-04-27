import { useState, useEffect, useCallback } from 'react'
import { authFetch } from '../lib/api'

const TYPE_COLOR = {
  start:      '#FFB300',
  normal:     '#e31212',
  checkpoint: '#FF8C00',
  penalty:    '#B71C1C',
  final:      '#29B6F6',
}

const FILE_ICON  = { image: '🖼', pdf: '📄', audio: '🎵', text: '📎' }
const FILE_COLOR = { image: '#FF8C00', pdf: '#e31212', audio: '#FFB300', text: 'rgba(255,255,255,0.5)' }

function getDisplayFileName(filePath) {
  const cleanPath = String(filePath || '').trim().split('?')[0].split('#')[0]
  if (!cleanPath) return ''

  const rawName = cleanPath.split(/[\\/]/).filter(Boolean).pop() || ''
  if (!rawName) return ''

  let decoded = rawName
  try {
    decoded = decodeURIComponent(rawName)
  } catch {
    // Keep raw filename if decoding fails.
  }

  const stripped = decoded.replace(/^puzzle\d+[_-]+/i, '')
  return stripped || decoded
}

function getAttachmentDisplayLabel(file) {
  const fromPath = getDisplayFileName(file?.path)
  if (fromPath) return fromPath

  const fallback = String(file?.label || '').trim()
  return fallback || 'File'
}

export default function PuzzleModal({ nodeId, nodeLabel, nodeType, onClose, onSubmitResult }) {
  const [question, setQuestion]   = useState(null)
  const [files, setFiles]         = useState([])
  const [answer, setAnswer]       = useState('')
  const [loading, setLoading]     = useState(true)
  const [submitting, setSubmit]   = useState(false)
  const [error, setError]         = useState('')
  const [feedback, setFeedback]   = useState(null) // 'correct' | 'wrong' | null
  const [shake, setShake]         = useState(false)

  const accentColor = TYPE_COLOR[nodeType] || '#e31212'

  useEffect(() => {
    let dead = false
    const load = async () => {
      setLoading(true); setError(''); setQuestion(null); setFiles([])
      try {
        const res = await authFetch(`/api/game/node/${nodeId}/question`)
        if (!res.ok) {
          const d = await res.json().catch(() => ({}))
          if (!dead) setError(d.error || `Error ${res.status}`)
          return
        }
        const q = await res.json()
        if (dead) return
        setQuestion(q)
        const hasFiles = q.question_type === 'image' || q.question_type === 'pdf' || q.question_type === 'audio'
        if (hasFiles) {
          const fr = await authFetch(`/api/game/question/${q.id}/files`)
          if (!dead && fr.ok) {
            const fd = await fr.json()
            setFiles(fd.files || [])
          }
        }
      } catch {
        if (!dead) setError('Connection error')
      } finally {
        if (!dead) setLoading(false)
      }
    }
    load()
    return () => { dead = true }
  }, [nodeId])

  const handleSubmit = useCallback(async (e) => {
    e?.preventDefault()
    if (!answer.trim() || !question || submitting || feedback) return
    setSubmit(true); setError('')
    try {
      const res = await authFetch('/api/game/answer', {
        method: 'POST',
        body: JSON.stringify({ questionId: question.id, answer: answer.trim() }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Submit failed')
        setSubmit(false)
        return
      }
      const correct = data.submitResult?.correct === true
      setFeedback(correct ? 'correct' : 'wrong')
      if (!correct) { setShake(true); setTimeout(() => setShake(false), 700) }
      setTimeout(() => onSubmitResult(data), correct ? 900 : 1400)
    } catch {
      setError('Connection error')
      setSubmit(false)
    }
  }, [answer, question, submitting, feedback, onSubmitResult])

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 60,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(0,0,0,0.78)', backdropFilter: 'blur(6px)',
      }}
      onClick={onClose}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@700;900&family=Share+Tech+Mono&display=swap');
        @keyframes modalIn   { from{opacity:0;transform:scale(0.87) translateY(18px)} to{opacity:1;transform:scale(1) translateY(0)} }
        @keyframes shake     { 0%,100%{transform:translateX(0)} 20%{transform:translateX(-9px)} 40%{transform:translateX(9px)} 60%{transform:translateX(-6px)} 80%{transform:translateX(6px)} }
        @keyframes correctGl { 0%,100%{box-shadow:0 0 0 rgba(0,200,80,0)} 50%{box-shadow:0 0 50px rgba(0,200,80,0.22)} }
        @keyframes wrongGl   { 0%,100%{box-shadow:0 0 0 rgba(227,18,18,0)} 50%{box-shadow:0 0 50px rgba(227,18,18,0.3)} }
        @keyframes spin      { to{transform:rotate(360deg)} }
        .hell-input { width:100%;box-sizing:border-box;padding:11px 14px;border-radius:7px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.1);color:rgba(255,255,255,0.88);font-family:"Share Tech Mono",monospace;font-size:0.85rem;transition:all 0.2s;caret-color:#e31212;outline:none; }
        .hell-input::placeholder { color:rgba(255,255,255,0.18); }
        .hell-input:focus { border-color:rgba(227,18,18,0.45);box-shadow:0 0 0 2px rgba(227,18,18,0.1); }
        .file-link:hover { background:rgba(255,255,255,0.05)!important; }
        .question-text {
          white-space: pre-line;
          user-select: text !important;
          -webkit-user-select: text !important;
          cursor: text !important;
        }
      `}</style>

      <div
        style={{
          width: 'min(94vw,490px)',
          maxHeight: '92vh',
          background: 'rgba(6,4,14,0.98)',
          borderRadius: 14,
          border: `1px solid ${
            feedback === 'correct' ? 'rgba(0,200,80,0.45)'
            : feedback === 'wrong' ? 'rgba(227,18,18,0.55)'
            : `${accentColor}30`
          }`,
          overflowX: 'hidden',
          overflowY: 'auto',
          WebkitOverflowScrolling: 'touch',
          position: 'relative',
          animation: shake ? 'shake 0.7s ease-out'
            : feedback === 'correct' ? 'correctGl 0.9s ease-out'
            : feedback === 'wrong'   ? 'wrongGl 0.9s ease-out'
            : 'modalIn 0.32s cubic-bezier(.23,1,.32,1)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Top glow line */}
        <div style={{ position:'absolute',top:0,left:'8%',right:'8%',height:1, background:`linear-gradient(90deg,transparent,${accentColor},transparent)` }}/>

        <div style={{ padding: 'clamp(1.3rem,4vw,1.9rem)' }}>

          {/* Header */}
          <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:18 }}>
            <div>
              <div style={{ fontFamily:'"Share Tech Mono",monospace', fontSize:'0.56rem', color:accentColor, letterSpacing:'0.24em', marginBottom:5, textTransform:'uppercase' }}>
                {nodeType?.toUpperCase()} · NODE {nodeId}
              </div>
              <div style={{ fontFamily:'"Cinzel",serif', fontSize:'1.05rem', fontWeight:700, color:'rgba(255,255,255,0.9)', letterSpacing:'0.06em' }}>
                {nodeLabel}
              </div>
            </div>
            <button onClick={onClose} style={{ background:'none',border:'none',color:'rgba(255,255,255,0.25)',fontSize:'1.4rem',cursor:'none',lineHeight:1,padding:'0 0 0 12px',flexShrink:0 }}
              onMouseEnter={e => e.currentTarget.style.color = accentColor}
              onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.25)'}
            >×</button>
          </div>

          {/* Divider */}
          <div style={{ height:1, background:`linear-gradient(90deg,transparent,${accentColor}28,transparent)`, marginBottom:18 }}/>

          {/* Body */}
          {loading ? (
            <div style={{ display:'flex',alignItems:'center',justifyContent:'center',gap:10,padding:'32px 0' }}>
              <div style={{ width:13,height:13,borderRadius:'50%',border:'2px solid rgba(255,255,255,0.08)',borderTopColor:accentColor,animation:'spin 0.8s linear infinite' }}/>
              <span style={{ fontFamily:'"Share Tech Mono",monospace',fontSize:'0.68rem',color:'rgba(255,255,255,0.3)',letterSpacing:'0.15em' }}>LOADING TRANSMISSION...</span>
            </div>
          ) : error && !question ? (
            <div style={{ padding:'22px 0',textAlign:'center',fontFamily:'"Share Tech Mono",monospace',fontSize:'0.75rem',color:'#ff4444',letterSpacing:'0.1em' }}>
              ⚠ {error}
            </div>
          ) : question ? (
            <>
              {question.question_text && (
                <div className="question-text" style={{ background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.06)',borderRadius:8,padding:'13px 15px',marginBottom:14,fontFamily:'"Share Tech Mono",monospace',fontSize:'0.82rem',color:'rgba(255,255,255,0.82)',lineHeight:1.85,letterSpacing:'0.03em' }}>
                  {question.question_text}
                </div>
              )}

              {files.length > 0 && (
                <div style={{ marginBottom:16 }}>
                  <div style={{ fontFamily:'"Share Tech Mono",monospace',fontSize:'0.52rem',color:'rgba(255,255,255,0.3)',letterSpacing:'0.18em',textTransform:'uppercase',marginBottom:8 }}>
                    ATTACHMENTS
                  </div>
                  <div style={{ display:'flex',flexDirection:'column',gap:7 }}>
                    {files.map((f, i) => {
                      const color = FILE_COLOR[f.mimeHint] || FILE_COLOR.text
                      const icon  = FILE_ICON[f.mimeHint]  || FILE_ICON.text
                      const displayLabel = getAttachmentDisplayLabel(f)
                      return (
                        <a key={i} href={f.url} target="_blank" rel="noopener noreferrer"
                          className="file-link"
                          style={{ display:'flex',alignItems:'center',gap:11,padding:'9px 13px',borderRadius:7,background:'rgba(255,255,255,0.02)',border:`1px solid ${color}20`,color,textDecoration:'none',transition:'all 0.18s',cursor:'none' }}
                        >
                          <span style={{ fontSize:'0.95rem',flexShrink:0 }}>{icon}</span>
                          <div style={{ flex:1,minWidth:0 }}>
                            <div style={{ fontFamily:'"Share Tech Mono",monospace',fontSize:'0.7rem',letterSpacing:'0.1em',color }}>{displayLabel}</div>
                            <div style={{ fontFamily:'"Share Tech Mono",monospace',fontSize:'0.52rem',color:'rgba(255,255,255,0.2)',marginTop:2 }}>Open in new tab ↗</div>
                          </div>
                          <span style={{ fontSize:'0.85rem',opacity:0.45,flexShrink:0 }}>↗</span>
                        </a>
                      )
                    })}
                  </div>
                </div>
              )}

              {feedback && (
                <div style={{ padding:'12px 0',marginBottom:8,textAlign:'center',fontFamily:'"Cinzel",serif',fontSize:'0.78rem',fontWeight:700,letterSpacing:'0.2em',color:feedback==='correct'?'#00e676':'#ff4444',textShadow:feedback==='correct'?'0 0 20px rgba(0,230,118,0.4)':'0 0 20px rgba(255,40,0,0.5)' }}>
                  {feedback === 'correct' ? '✓ CORRECT — DESCENDING DEEPER' : '✗ WRONG — THE WEB TIGHTENS'}
                </div>
              )}

              {/* ── FIX #3: Removed the onKeyDown Enter handler from the input.
                           The wrapping <form onSubmit={handleSubmit}> already intercepts
                           Enter natively, so the onKeyDown was firing handleSubmit TWICE. ── */}
              {!feedback && (
                <form onSubmit={handleSubmit}>
                  {error && (
                    <div style={{ fontFamily:'"Share Tech Mono",monospace',fontSize:'0.7rem',color:'#ff4444',marginBottom:10,letterSpacing:'0.08em' }}>
                      ⚠ {error}
                    </div>
                  )}
                  <div style={{ marginBottom:12 }}>
                    <label style={{ display:'block',fontFamily:'"Share Tech Mono",monospace',fontSize:'0.56rem',color:accentColor,letterSpacing:'0.2em',textTransform:'uppercase',marginBottom:8 }}>
                      YOUR ANSWER
                    </label>
                    <input
                      className="hell-input"
                      type="text"
                      value={answer}
                      onChange={e => setAnswer(e.target.value)}
                      placeholder="Type your answer..."
                      disabled={submitting}
                      autoFocus
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={!answer.trim() || submitting}
                    style={{
                      width:'100%',padding:'12px 0',borderRadius:8,border:'none',
                      cursor: !answer.trim() || submitting ? 'not-allowed' : 'none',
                      background: !answer.trim() || submitting
                        ? 'rgba(255,255,255,0.04)'
                        : 'linear-gradient(135deg,#6B0000 0%,#c01010 50%,#6B0000 100%)',
                      color: !answer.trim() || submitting ? 'rgba(255,255,255,0.18)' : '#fff',
                      fontFamily:'"Cinzel",serif',fontSize:'0.76rem',fontWeight:700,
                      letterSpacing:'0.24em',textTransform:'uppercase',
                      boxShadow: answer.trim() && !submitting ? '0 0 22px rgba(227,18,18,0.22)' : 'none',
                      transition:'all 0.2s',
                    }}
                  >
                    {submitting
                      ? <span style={{ display:'inline-flex',alignItems:'center',gap:8,justifyContent:'center' }}>
                          <span style={{ width:10,height:10,borderRadius:'50%',border:'2px solid rgba(255,255,255,0.12)',borderTopColor:'#fff',animation:'spin 0.7s linear infinite',display:'inline-block' }}/>
                          Submitting...
                        </span>
                      : 'SUBMIT ANSWER'
                    }
                  </button>
                </form>
              )}
            </>
          ) : null}
        </div>
      </div>
    </div>
  )
}