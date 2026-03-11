import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'

export default function ScoreboardPage() {
  const navigate = useNavigate()

  const mockTeams = [
    { rank: 1, name: 'StackSmashers', score: 2450, penalties: 0, time: '01:12:34' },
    { rank: 2, name: 'NullPointers', score: 2100, penalties: 1, time: '01:25:10' },
    { rank: 3, name: 'RecursiveMinds', score: 1850, penalties: 2, time: '01:33:22' },
    { rank: 4, name: 'SegFaulters', score: 1600, penalties: 1, time: '01:40:05' },
    { rank: 5, name: 'InfiniteLoop', score: 1200, penalties: 3, time: '01:52:48' },
  ]

  return (
    <div
      className="min-h-screen flex flex-col items-center relative"
      style={{ background: '#0B0B0F', fontFamily: "'Inter', sans-serif" }}
    >
      {/* Background glow */}
      <div className="fixed inset-0 pointer-events-none">
        <div
          className="absolute"
          style={{
            top: '10%', left: '30%',
            width: '40vw', height: '40vw',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(41,182,246,0.08) 0%, transparent 60%)',
            filter: 'blur(40px)',
          }}
        />
      </div>

      {/* Header */}
      <div className="w-full px-6 py-4 flex items-center justify-between relative z-10"
        style={{ borderBottom: '1px solid rgba(255,179,0,0.15)' }}
      >
        <button
          onClick={() => navigate('/game')}
          className="px-4 py-2 rounded border cursor-pointer transition-all duration-200"
          style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: '0.85rem',
            color: '#FFB300',
            borderColor: 'rgba(255,179,0,0.3)',
            background: 'rgba(255,179,0,0.05)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(255,179,0,0.15)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(255,179,0,0.05)'
          }}
        >
          &larr; Back to Game
        </button>

        <h1
          style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: '1.5rem',
            fontWeight: 700,
            color: '#FFB300',
            letterSpacing: '0.15em',
            textShadow: '0 0 20px rgba(255,179,0,0.3)',
          }}
        >
          SCOREBOARD
        </h1>

        <div style={{ width: '120px' }} />
      </div>

      {/* Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative z-10 w-full max-w-3xl mt-12 px-4"
      >
        <div
          className="rounded-xl overflow-hidden"
          style={{
            border: '1px solid rgba(255,179,0,0.15)',
            background: 'rgba(15,15,20,0.8)',
          }}
        >
          <table className="w-full" style={{ borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,179,0,0.15)' }}>
                {['Rank', 'Team', 'Score', 'Penalties', 'Time'].map((h) => (
                  <th
                    key={h}
                    className="px-6 py-4 text-left"
                    style={{
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: '0.7rem',
                      color: '#FF6A00',
                      letterSpacing: '0.15em',
                      textTransform: 'uppercase',
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {mockTeams.map((team, i) => (
                <motion.tr
                  key={team.rank}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 * i, duration: 0.4 }}
                  style={{
                    borderBottom: i < mockTeams.length - 1 ? '1px solid rgba(255,179,0,0.07)' : 'none',
                    background: i === 0 ? 'rgba(255,179,0,0.05)' : 'transparent',
                  }}
                >
                  <td className="px-6 py-4" style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: '1rem',
                    fontWeight: 700,
                    color: i === 0 ? '#FFB300' : i === 1 ? '#C0C0C0' : i === 2 ? '#CD7F32' : '#666',
                  }}>
                    #{team.rank}
                  </td>
                  <td className="px-6 py-4" style={{
                    fontFamily: "'Space Grotesk', sans-serif",
                    fontSize: '0.95rem',
                    fontWeight: 600,
                    color: '#e0e0e0',
                  }}>
                    {team.name}
                  </td>
                  <td className="px-6 py-4" style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: '0.9rem',
                    color: '#00E676',
                  }}>
                    {team.score}
                  </td>
                  <td className="px-6 py-4" style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: '0.9rem',
                    color: team.penalties > 0 ? '#B71C1C' : '#4A4A4A',
                  }}>
                    {team.penalties}
                  </td>
                  <td className="px-6 py-4" style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: '0.85rem',
                    color: '#999',
                  }}>
                    {team.time}
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  )
}
