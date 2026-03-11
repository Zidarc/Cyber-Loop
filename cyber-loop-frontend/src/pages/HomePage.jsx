import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'

function LightningCanvas() {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    let animFrame

    function resize() {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resize()
    window.addEventListener('resize', resize)

    function drawLightning(x, y, angle, depth, branchLen) {
      if (depth <= 0 || branchLen < 2) return
      const endX = x + Math.cos(angle) * branchLen
      const endY = y + Math.sin(angle) * branchLen

      ctx.beginPath()
      ctx.moveTo(x, y)

      const segments = 5
      let cx = x, cy = y
      for (let i = 1; i <= segments; i++) {
        const t = i / segments
        const jx = (Math.random() - 0.5) * branchLen * 0.3
        const jy = (Math.random() - 0.5) * branchLen * 0.3
        cx = x + (endX - x) * t + jx
        cy = y + (endY - y) * t + jy
        ctx.lineTo(cx, cy)
      }

      const alpha = 0.3 + depth * 0.15
      ctx.strokeStyle = `rgba(139, 0, 0, ${alpha})`
      ctx.lineWidth = depth * 0.8
      ctx.shadowColor = '#FF6A00'
      ctx.shadowBlur = 15 + depth * 5
      ctx.stroke()

      if (Math.random() > 0.4) {
        drawLightning(endX, endY, angle + (Math.random() - 0.5) * 1.2, depth - 1, branchLen * 0.65)
      }
      if (Math.random() > 0.5) {
        drawLightning(endX, endY, angle - (Math.random() - 0.5) * 1.2, depth - 1, branchLen * 0.55)
      }
    }

    let nextFlash = Date.now() + 2000

    function draw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      const now = Date.now()

      if (now > nextFlash) {
        const bolts = 1 + Math.floor(Math.random() * 3)
        for (let b = 0; b < bolts; b++) {
          const startX = Math.random() * canvas.width
          const angle = Math.PI / 2 + (Math.random() - 0.5) * 0.8
          drawLightning(startX, 0, angle, 5, 80 + Math.random() * 120)
        }
        nextFlash = now + 3000 + Math.random() * 5000
      }

      animFrame = requestAnimationFrame(draw)
    }

    animFrame = requestAnimationFrame(draw)
    return () => {
      cancelAnimationFrame(animFrame)
      window.removeEventListener('resize', resize)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 1,
      }}
    />
  )
}

function EnergyParticles() {
  const particles = Array.from({ length: 30 }, (_, i) => ({
    id: i,
    left: Math.random() * 100,
    delay: Math.random() * 8,
    duration: 8 + Math.random() * 12,
    size: 1 + Math.random() * 3,
  }))

  return (
    <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 1, overflow: 'hidden' }}>
      {particles.map((p) => (
        <div
          key={p.id}
          style={{
            position: 'absolute',
            left: `${p.left}%`,
            bottom: '-5%',
            width: p.size,
            height: p.size,
            borderRadius: '50%',
            background: `radial-gradient(circle, #FFB300, #8B0000 70%, transparent)`,
            boxShadow: `0 0 ${p.size * 3}px #FF6A00`,
            animation: `floatUp ${p.duration}s ${p.delay}s linear infinite`,
            opacity: 0,
          }}
        />
      ))}
    </div>
  )
}

export default function HomePage() {
  const navigate = useNavigate()

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden"
      style={{ background: '#0B0B0F' }}
    >
      {/* Background gradient blobs */}
      <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 0 }}>
        <div
          className="absolute"
          style={{
            top: '20%', left: '10%',
            width: '50vw', height: '50vw',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(139,0,0,0.15) 0%, transparent 60%)',
            filter: 'blur(40px)',
          }}
        />
        <div
          className="absolute"
          style={{
            bottom: '10%', right: '5%',
            width: '40vw', height: '40vw',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(255,106,0,0.1) 0%, transparent 60%)',
            filter: 'blur(40px)',
          }}
        />
      </div>

      <LightningCanvas />
      <EnergyParticles />

      {/* Main content */}
      <div className="relative z-10 text-center px-4">
        <motion.h1
          initial={{ opacity: 0, y: 30, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 1.2, ease: 'easeOut' }}
          className="font-bold tracking-wider select-none"
          style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: 'clamp(3rem, 10vw, 7rem)',
            fontWeight: 700,
            color: '#FFB300',
            animation: 'titleGlow 3s ease-in-out infinite',
            lineHeight: 1.1,
          }}
        >
          RECURSION
          <br />
          <span style={{ color: '#8B0000', WebkitTextStroke: '1px #FF6A00' }}>HELL</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.5 }}
          transition={{ delay: 0.8, duration: 1 }}
          className="mt-4 tracking-widest uppercase"
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: '0.75rem',
            color: '#FF6A00',
            letterSpacing: '0.3em',
          }}
        >
          Solve the graph. Escape the loop.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.2, duration: 0.8 }}
          className="mt-12"
        >
          <button
            onClick={() => navigate('/game')}
            className="relative px-10 py-4 border-2 rounded-lg font-semibold tracking-widest uppercase cursor-pointer transition-all duration-300"
            style={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontSize: '1.1rem',
              color: '#FFB300',
              borderColor: '#8B0000',
              background: 'rgba(139, 0, 0, 0.15)',
              letterSpacing: '0.15em',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(139, 0, 0, 0.4)'
              e.currentTarget.style.boxShadow = '0 0 30px rgba(139,0,0,0.5), 0 0 60px rgba(255,106,0,0.2)'
              e.currentTarget.style.borderColor = '#FF6A00'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(139, 0, 0, 0.15)'
              e.currentTarget.style.boxShadow = 'none'
              e.currentTarget.style.borderColor = '#8B0000'
            }}
          >
            Start Game
          </button>
        </motion.div>

        {/* Decorative line */}
        <motion.div
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ delay: 1.5, duration: 1 }}
          className="mt-16 mx-auto"
          style={{
            width: '200px',
            height: '1px',
            background: 'linear-gradient(90deg, transparent, #8B0000, #FF6A00, #8B0000, transparent)',
          }}
        />

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.3 }}
          transition={{ delay: 2, duration: 1 }}
          className="mt-4"
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: '0.65rem',
            color: '#4A4A4A',
            letterSpacing: '0.1em',
          }}
        >
          v6.6.6 &middot; stack_depth: &infin;
        </motion.p>
      </div>
    </div>
  )
}
