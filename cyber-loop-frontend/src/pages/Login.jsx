import { useMemo, useState } from 'react'

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

export default function Login() {
  const [teamName, setTeamName] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [shake, setShake] = useState(false)

  const canSubmit = useMemo(() => {
    return teamName.trim().length > 0 && password.trim().length > 0 && !loading
  }, [teamName, password, loading])

  async function handleSubmit(e) {
    e.preventDefault()
    if (loading) return

    const tn = teamName.trim()
    const pw = password.trim()

    setError('')

    // Placeholder logic (backend pending): any non-empty input grants entry.
    if (!tn || !pw) {
      setShake(true)
      setError('Team Name and Password are required.')
      window.setTimeout(() => setShake(false), 420)
      return
    }

    setLoading(true)
    try {
      // Small delay so the spinner reads as "processing".
      await sleep(650)
      sessionStorage.setItem('teamName', tn)

      // Redirect to Landing Page (route/page will be wired up elsewhere).
      window.location.assign('/landing')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="min-h-screen relative overflow-hidden flex items-center justify-center px-4"
      style={{ backgroundColor: '#0D0A07' }}
    >
      <style>{`
        @keyframes recursionTunnel {
          0% { transform: translate3d(0,0,0) rotate(0deg) scale(1); filter: hue-rotate(0deg); }
          50% { transform: translate3d(0,0,0) rotate(10deg) scale(1.08); filter: hue-rotate(14deg); }
          100% { transform: translate3d(0,0,0) rotate(0deg) scale(1); filter: hue-rotate(0deg); }
        }
        @keyframes drift {
          0% { transform: translate3d(-2%, -2%, 0); }
          50% { transform: translate3d(2%, 2%, 0); }
          100% { transform: translate3d(-2%, -2%, 0); }
        }
        @keyframes codeFall {
          0% { background-position: 0% 0%; }
          100% { background-position: 0% 200%; }
        }
        @keyframes shakeX {
          0% { transform: translateX(0); }
          20% { transform: translateX(-10px); }
          40% { transform: translateX(10px); }
          60% { transform: translateX(-7px); }
          80% { transform: translateX(7px); }
          100% { transform: translateX(0); }
        }
        @keyframes spinFast {
          to { transform: rotate(360deg); }
        }
        .recursion-tunnel { animation: recursionTunnel 3.6s ease-in-out infinite; }
        .recursion-drift { animation: drift 7s ease-in-out infinite; }
        .recursion-code { animation: codeFall 7.5s linear infinite; }
        .shake { animation: shakeX 420ms ease-in-out; }
        .spin { animation: spinFast 0.85s linear infinite; }
      `}</style>

      {/* Animated recursion background (tunnel + drifting glow + code waterfall) */}
      <div className="fixed inset-0 pointer-events-none">
        <div
          className="absolute inset-0 recursion-tunnel"
          style={{
            backgroundImage: [
              // Subtle vignette / depth
              'radial-gradient(closest-side at 50% 45%, rgba(232,130,12,0.10), rgba(13,10,7,0.92) 70%, rgba(13,10,7,1) 100%)',
              // Concentric rings to sell the tunnel
              'repeating-radial-gradient(circle at 50% 45%, rgba(245,236,215,0.05) 0px, rgba(245,236,215,0.05) 1px, rgba(0,0,0,0) 18px, rgba(0,0,0,0) 34px)',
            ].join(','),
          }}
        />

        <div className="absolute inset-0 recursion-drift opacity-90">
          <div
            className="absolute -top-20 -left-24 h-[28rem] w-[28rem] rounded-full blur-3xl"
            style={{ background: 'radial-gradient(circle, rgba(232,130,12,0.22), rgba(232,130,12,0) 60%)' }}
          />
          <div
            className="absolute -bottom-24 -right-24 h-[30rem] w-[30rem] rounded-full blur-3xl"
            style={{ background: 'radial-gradient(circle, rgba(139,26,26,0.20), rgba(139,26,26,0) 60%)' }}
          />
        </div>

        <div
          className="absolute inset-0 opacity-[0.22] mix-blend-screen recursion-code"
          style={{
            backgroundImage:
              'repeating-linear-gradient(180deg, rgba(245,236,215,0.00) 0px, rgba(245,236,215,0.00) 18px, rgba(245,236,215,0.16) 19px, rgba(245,236,215,0.00) 28px)',
          }}
        />

        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(180deg, rgba(13,10,7,0.85) 0%, rgba(13,10,7,0.55) 40%, rgba(13,10,7,0.85) 100%)',
          }}
        />
      </div>

      {/* Centered login card */}
      <div className={`relative z-10 w-full max-w-md ${shake ? 'shake' : ''}`}>
        <div
          className="rounded-2xl border px-7 py-8 backdrop-blur-md"
          style={{
            backgroundColor: 'rgba(26, 18, 8, 0.72)', // bg-surface
            borderColor: 'rgba(196, 94, 0, 0.45)', // primary-dark
            boxShadow: '0 0 70px rgba(232,130,12,0.14), 0 0 0 1px rgba(0,0,0,0.55) inset',
          }}
        >
          <div className="mb-6">
            <div
              className="text-xs tracking-[0.35em] uppercase mb-2"
              style={{ color: 'rgba(245,236,215,0.72)', fontFamily: 'Inter, system-ui, -apple-system, Segoe UI, Roboto, sans-serif' }}
            >
              Enter the loop
            </div>
            <h1
              className="text-3xl font-semibold leading-tight"
              style={{
                color: '#F5ECD7',
                fontFamily:
                  '"Space Grotesk", "Rajdhani", ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif',
              }}
            >
              RECURSION HELL
            </h1>
            <p className="mt-2 text-sm" style={{ color: 'rgba(245,236,215,0.72)' }}>
              Authenticate to descend.
            </p>
          </div>

          {error ? (
            <div
              className="mb-4 rounded-lg border px-3 py-2 text-sm"
              style={{
                backgroundColor: 'rgba(139,26,26,0.18)',
                borderColor: 'rgba(139,26,26,0.55)',
                color: 'rgba(245,236,215,0.90)',
              }}
              role="alert"
              aria-live="polite"
            >
              {error}
            </div>
          ) : null}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm mb-1" style={{ color: 'rgba(245,236,215,0.82)' }}>
                Team Name
              </label>
              <input
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                autoComplete="username"
                className="w-full rounded-lg px-3 py-2 outline-none transition"
                style={{
                  backgroundColor: 'rgba(13,10,7,0.55)',
                  border: '1px solid rgba(196, 94, 0, 0.35)',
                  color: '#F5ECD7',
                  boxShadow: '0 0 0 0 rgba(232,130,12,0)',
                }}
                placeholder="e.g. StackSmashers"
              />
            </div>

            <div>
              <label className="block text-sm mb-1" style={{ color: 'rgba(245,236,215,0.82)' }}>
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                className="w-full rounded-lg px-3 py-2 outline-none transition"
                style={{
                  backgroundColor: 'rgba(13,10,7,0.55)',
                  border: '1px solid rgba(196, 94, 0, 0.35)',
                  color: '#F5ECD7',
                }}
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={!canSubmit}
              className="w-full rounded-lg py-2.5 font-semibold tracking-wide transition disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background: canSubmit
                  ? 'linear-gradient(90deg, rgba(232,130,12,1) 0%, rgba(196,94,0,1) 100%)'
                  : 'linear-gradient(90deg, rgba(245,236,215,0.22) 0%, rgba(245,236,215,0.14) 100%)',
                color: canSubmit ? '#0D0A07' : 'rgba(245,236,215,0.65)',
                boxShadow: canSubmit ? '0 0 22px rgba(232,130,12,0.26)' : 'none',
              }}
            >
              <span className="inline-flex items-center justify-center gap-2">
                {loading ? (
                  <>
                    <span
                      className="h-4 w-4 rounded-full border-2 border-black/30 border-t-black spin"
                      aria-hidden="true"
                    />
                    Processing…
                  </>
                ) : (
                  'Login'
                )}
              </span>
            </button>

            <div
              className="pt-2 text-center text-xs"
              style={{ color: 'rgba(245,236,215,0.55)', fontFamily: '"JetBrains Mono", "Fira Code", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace' }}
            >
              Hint: Any non-empty input passes (placeholder auth).
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
