import { motion, AnimatePresence } from 'framer-motion'

export default function PenaltyCounter({ count }) {
  return (
    <div
      className="fixed z-40 flex flex-col items-center gap-2"
      style={{
        right: '1.5rem',
        top: '50%',
        transform: 'translateY(-50%)',
      }}
    >
      <div
        className="rounded-xl flex flex-col items-center py-4 px-3"
        style={{
          background: 'rgba(15,15,20,0.9)',
          border: '1px solid rgba(183,28,28,0.3)',
          boxShadow: count > 0
            ? '0 0 20px rgba(183,28,28,0.2)'
            : 'none',
          minWidth: 60,
          backdropFilter: 'blur(8px)',
        }}
      >
        <div
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: '0.6rem',
            color: 'rgba(183,28,28,0.7)',
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
            marginBottom: 8,
          }}
        >
          PENALTY
        </div>

        <div style={{ fontSize: '1.4rem', marginBottom: 6 }}>
          ☠
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={count}
            initial={{ scale: 1.5, color: '#ff4444' }}
            animate={{ scale: 1, color: count > 0 ? '#B71C1C' : '#4A4A4A' }}
            transition={{ type: 'spring', damping: 15, stiffness: 300 }}
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: '1.5rem',
              fontWeight: 700,
              lineHeight: 1,
            }}
          >
            {count}
          </motion.div>
        </AnimatePresence>

        {/* Penalty tick marks */}
        <div className="flex gap-1 mt-3">
          {Array.from({ length: 5 }, (_, i) => (
            <div
              key={i}
              style={{
                width: 4,
                height: 14,
                borderRadius: 2,
                background: i < count ? '#B71C1C' : 'rgba(74,74,74,0.3)',
                boxShadow: i < count ? '0 0 6px rgba(183,28,28,0.5)' : 'none',
                transition: 'all 0.3s ease',
              }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
