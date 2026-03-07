import { useMemo, useState, useEffect } from 'react'

// Placeholder for backend dev to simulate network requests
function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

export default function Login() {
  const [teamName, setTeamName] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [shake, setShake] = useState(false)
  
  // ANIMATION STATES
  const [introPhase, setIntroPhase] = useState(true) // Starts true: doors are CLOSED on load
  const [descentPhase, setDescentPhase] = useState(false) // Starts false: becomes true on login

  // THE INTRO SEQUENCE: Open the doors shortly after page load
  useEffect(() => {
    const timer = setTimeout(() => {
      setIntroPhase(false) // Open the doors!
    }, 800) // 800ms dramatic pause before opening
    return () => clearTimeout(timer)
  }, [])

  const canSubmit = useMemo(() => {
    return teamName.trim().length > 0 && password.trim().length > 0 && !loading && !descentPhase
  }, [teamName, password, loading, descentPhase])

  async function handleSubmit(e) {
    e.preventDefault()
    if (loading || descentPhase) return

    const tn = teamName.trim()
    const pw = password.trim()
    setError('')

    if (!tn || !pw) {
      setShake(true)
      setError('Team Name and Password are required.')
      window.setTimeout(() => setShake(false), 420)
      return
    }

    setLoading(true)
    try {
      // Fake backend delay
      await sleep(800) 
      sessionStorage.setItem('teamName', tn)
      
      // Stop loading and SLAM THE DOORS SHUT
      setLoading(false)
      setDescentPhase(true)

      // Wait 4 seconds for the scary text to be read, then redirect
      window.setTimeout(() => {
        window.location.assign('/landing') 
      }, 4000) 

    } catch (err) {
      setError('Authentication failed. Try again.')
      setLoading(false)
    }
  }

  // Helper variable to know if doors should be covering the screen
  const gatesClosed = introPhase || descentPhase;

  return (
    <div className="min-h-screen relative overflow-hidden flex items-center justify-center px-4 bg-[#0D0A07]">
      <style>{`
        @keyframes shakeX {
          0%, 100% { transform: translateX(0); }
          20%, 60% { transform: translateX(-10px); }
          40%, 80% { transform: translateX(10px); }
        }
        @keyframes spinFast {
          to { transform: rotate(360deg); }
        }
        @keyframes pulseGlow {
          0%, 100% { box-shadow: 0 0 70px rgba(232,130,12,0.15), 0 0 0 1px rgba(0,0,0,0.55) inset; }
          50% { box-shadow: 0 0 100px rgba(232,130,12,0.4), 0 0 0 1px rgba(196, 94, 0, 0.8) inset; }
        }
        @keyframes lavaFlow {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        .shake { animation: shakeX 420ms ease-in-out; }
        .spin { animation: spinFast 0.85s linear infinite; }
        .glow-pulse { animation: pulseGlow 3s ease-in-out infinite; }
        .lava-bg {
          background: linear-gradient(-45deg, #0D0A07, #8B1A1A, #C45E00, #0D0A07);
          background-size: 400% 400%;
          animation: lavaFlow 15s ease infinite;
        }
        
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@600;700&family=Inter:wght@400;500&display=swap');
      `}</style>

      {/* BACKGROUND: CSS Animated Lava */}
      <div className="absolute inset-0 lava-bg opacity-50 z-0"></div>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,#0D0A07_100%)] z-0" />

      {/* LEFT MAGMA DOOR */}
      <div 
        className={`fixed inset-y-0 left-0 w-1/2 bg-[#0D0A07] border-r-[4px] border-[#E8820C] z-50 transition-transform duration-[1500ms] ease-in-out flex items-center justify-end pr-4 ${gatesClosed ? 'translate-x-0' : '-translate-x-full'}`}
        style={{ 
          boxShadow: 'inset -20px 0 60px rgba(139, 26, 26, 0.8), inset -5px 0 15px rgba(232, 130, 12, 0.5), 10px 0 30px rgba(0,0,0,0.9)' 
        }}
      ></div>
      
      {/* RIGHT MAGMA DOOR */}
      <div 
        className={`fixed inset-y-0 right-0 w-1/2 bg-[#0D0A07] border-l-[4px] border-[#E8820C] z-50 transition-transform duration-[1500ms] ease-in-out flex items-center justify-start pl-4 ${gatesClosed ? 'translate-x-0' : 'translate-x-full'}`}
        style={{ 
          boxShadow: 'inset 20px 0 60px rgba(139, 26, 26, 0.8), inset 5px 0 15px rgba(232, 130, 12, 0.5), -10px 0 30px rgba(0,0,0,0.9)' 
        }}
      ></div>

      {/* SCARY TEXT ON CLOSED DOORS (Only shows during Descent Phase, not Intro Phase) */}
      <div className={`fixed inset-0 z-[60] flex items-center justify-center pointer-events-none transition-opacity duration-1000 delay-[1200ms] ${descentPhase ? 'opacity-100' : 'opacity-0'}`}>
        <h2 className="text-4xl md:text-6xl text-center font-bold px-6 leading-tight" style={{ color: '#E8820C', fontFamily: '"Space Grotesk", sans-serif', textShadow: '0 0 40px #000, 0 0 20px #8B1A1A' }}>
          Now you have entered the hell.<br/>
          <span className="text-[#F5ECD7] text-2xl md:text-4xl mt-6 block font-normal">
            You can get lost, but you cannot return.<br/>
            Prepare to loop forever.
          </span>
        </h2>
      </div>

      {/* LOGIN CARD */}
      <div className={`relative z-10 w-full max-w-md transition-all duration-[1500ms] ${shake ? 'shake' : ''} ${gatesClosed ? 'opacity-0 scale-90 pointer-events-none' : 'opacity-100 scale-100 delay-500'}`}>
        <div
          className="rounded-2xl border px-7 py-8 backdrop-blur-xl glow-pulse"
          style={{
            backgroundColor: 'rgba(26, 18, 8, 0.85)',
            borderColor: 'rgba(196, 94, 0, 0.6)',
          }}
        >
          <div className="mb-8 text-center">
            <div
              className="text-xs tracking-[0.4em] uppercase mb-3 font-medium"
              style={{ color: '#E8820C', fontFamily: '"Inter", sans-serif' }}
            >
              Enter the loop
            </div>
            <h1
              className="text-4xl font-bold leading-tight"
              style={{
                color: '#F5ECD7',
                fontFamily: '"Space Grotesk", sans-serif',
                textShadow: '0 0 20px rgba(232,130,12,0.5)'
              }}
            >
              RECURSION HELL
            </h1>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm mb-1.5 font-medium" style={{ color: '#F5ECD7', fontFamily: '"Inter", sans-serif' }}>
                Team Name
              </label>
              <input
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                className="w-full rounded-lg px-4 py-3 outline-none transition-all focus:ring-2 focus:ring-[#E8820C]"
                style={{
                  backgroundColor: 'rgba(13,10,7,0.7)',
                  border: '1px solid #C45E00',
                  color: '#F5ECD7',
                  fontFamily: '"Inter", sans-serif'
                }}
                placeholder="e.g. StackSmashers"
              />
            </div>

            <div>
              <label className="block text-sm mb-1.5 font-medium" style={{ color: '#F5ECD7', fontFamily: '"Inter", sans-serif' }}>
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg px-4 py-3 outline-none transition-all focus:ring-2 focus:ring-[#E8820C]"
                style={{
                  backgroundColor: 'rgba(13,10,7,0.7)',
                  border: '1px solid #C45E00',
                  color: '#F5ECD7',
                  fontFamily: '"Inter", sans-serif'
                }}
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={!canSubmit}
              className="w-full rounded-lg mt-4 py-3.5 font-bold tracking-wider uppercase transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.02]"
              style={{
                background: canSubmit
                  ? 'linear-gradient(90deg, #E8820C 0%, #C45E00 100%)'
                  : 'linear-gradient(90deg, rgba(245,236,215,0.1) 0%, rgba(245,236,215,0.05) 100%)',
                color: canSubmit ? '#0D0A07' : 'rgba(245,236,215,0.5)',
                boxShadow: canSubmit ? '0 0 30px rgba(232,130,12,0.4)' : 'none',
                fontFamily: '"Space Grotesk", sans-serif'
              }}
            >
              <span className="inline-flex items-center justify-center gap-3">
                {loading ? (
                  <>
                    <span className="h-5 w-5 rounded-full border-2 border-[#0D0A07]/30 border-t-[#0D0A07] spin" />
                    Authenticating...
                  </>
                ) : (
                  'Descent'
                )}
              </span>
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}