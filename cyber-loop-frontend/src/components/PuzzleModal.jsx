import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

export default function PuzzleModal({ node, onClose, onSubmit }) {
  const [answer, setAnswer] = useState('')
  const [flash, setFlash] = useState(false)

  if (!node) return null

  const handleSubmit = (e) => {
    e.preventDefault()
    const trimmed = answer.trim()
    if (!trimmed) return

    // Placeholder: always treat as wrong answer for demo
    // Backend team will replace this logic
    const isCorrect = false

    if (!isCorrect) {
      onSubmit(node.id, trimmed, true)
      setAnswer('')
    } else {
      setFlash(true)
      setTimeout(() => setFlash(false), 500)
      onSubmit(node.id, trimmed, false)
      setAnswer('')
    }
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 flex items-center justify-center z-50"
        style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.85, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.85, opacity: 0, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-md mx-4 rounded-xl overflow-hidden"
          style={{
            background: 'linear-gradient(160deg, rgba(20,20,25,0.97) 0%, rgba(11,11,15,0.99) 100%)',
            border: '1px solid rgba(255,106,0,0.25)',
            boxShadow: '0 0 40px rgba(139,0,0,0.2), 0 0 80px rgba(0,0,0,0.5)',
            animation: flash ? 'redFlash 0.5s ease-out' : 'none',
          }}
        >
          {/* Top accent */}
          <div style={{
            position: 'absolute', top: 0, left: '15%', right: '15%',
            height: '1px',
            background: 'linear-gradient(90deg, transparent, #FF6A00, transparent)',
          }} />

          <div className="p-8">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <div
                  style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: '0.65rem',
                    color: '#FF6A00',
                    letterSpacing: '0.2em',
                    textTransform: 'uppercase',
                    marginBottom: 4,
                  }}
                >
                  Node {node.id}
                </div>
                <h2
                  style={{
                    fontFamily: "'Space Grotesk', sans-serif",
                    fontSize: '1.3rem',
                    fontWeight: 700,
                    color: '#e0e0e0',
                  }}
                >
                  {node.label || 'Puzzle Challenge'}
                </h2>
              </div>
              <button
                onClick={onClose}
                className="cursor-pointer transition-colors duration-200"
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#666',
                  fontSize: '1.5rem',
                  lineHeight: 1,
                  padding: '4px 8px',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.color = '#FF6A00' }}
                onMouseLeave={(e) => { e.currentTarget.style.color = '#666' }}
              >
                &times;
              </button>
            </div>

            {/* Divider */}
            <div style={{
              height: '1px',
              background: 'linear-gradient(90deg, transparent, rgba(255,106,0,0.2), transparent)',
              marginBottom: '1.5rem',
            }} />

            {/* Puzzle text placeholder */}
            <div
              className="rounded-lg p-4 mb-6"
              style={{
                background: 'rgba(255,106,0,0.05)',
                border: '1px solid rgba(255,106,0,0.1)',
              }}
            >
              <p
                style={{
                  fontFamily: "'Inter', sans-serif",
                  fontSize: '0.9rem',
                  color: '#bbb',
                  lineHeight: 1.7,
                }}
              >
                {/* Placeholder puzzle text — backend team will replace */}
                What is the output of calling <code style={{ color: '#FF6A00', background: 'rgba(255,106,0,0.1)', padding: '2px 6px', borderRadius: 3 }}>recurse(n-1)</code> when <code style={{ color: '#FF6A00', background: 'rgba(255,106,0,0.1)', padding: '2px 6px', borderRadius: 3 }}>n = 0</code> and the base case returns <code style={{ color: '#00E676', background: 'rgba(0,230,118,0.1)', padding: '2px 6px', borderRadius: 3 }}>1</code>?
              </p>
            </div>

            {/* Answer form */}
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label
                  style={{
                    display: 'block',
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: '0.7rem',
                    color: 'rgba(255,106,0,0.7)',
                    letterSpacing: '0.12em',
                    textTransform: 'uppercase',
                    marginBottom: 8,
                  }}
                >
                  Your Answer
                </label>
                <input
                  type="text"
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  placeholder="Enter your answer..."
                  className="w-full rounded-lg px-4 py-3 outline-none transition-all duration-200"
                  style={{
                    background: 'rgba(11,11,15,0.8)',
                    border: '1px solid rgba(255,106,0,0.2)',
                    color: '#e0e0e0',
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: '0.9rem',
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = 'rgba(255,106,0,0.5)'
                    e.target.style.boxShadow = '0 0 15px rgba(255,106,0,0.1)'
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = 'rgba(255,106,0,0.2)'
                    e.target.style.boxShadow = 'none'
                  }}
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-lg font-semibold tracking-wider uppercase cursor-pointer transition-all duration-200"
                style={{
                  fontFamily: "'Space Grotesk', sans-serif",
                  fontSize: '0.85rem',
                  background: 'linear-gradient(92deg, #8B0000, #FF6A00)',
                  color: '#fff',
                  border: 'none',
                  letterSpacing: '0.12em',
                  boxShadow: '0 0 20px rgba(139,0,0,0.3)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = '0 0 30px rgba(255,106,0,0.4)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = '0 0 20px rgba(139,0,0,0.3)'
                }}
              >
                Submit Answer
              </button>
            </form>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
