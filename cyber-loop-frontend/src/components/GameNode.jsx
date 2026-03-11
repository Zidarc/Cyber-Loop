import { memo } from 'react'
import { Handle, Position } from '@xyflow/react'
import { motion } from 'framer-motion'

const nodeStyles = {
  start: {
    background: 'radial-gradient(circle, rgba(255,179,0,0.25) 0%, rgba(255,179,0,0.08) 100%)',
    border: '2px solid #FFB300',
    boxShadow: '0 0 15px rgba(255,179,0,0.4), 0 0 30px rgba(255,179,0,0.15)',
    color: '#FFB300',
  },
  inactive: {
    background: 'rgba(74,74,74,0.15)',
    border: '2px solid #4A4A4A',
    boxShadow: 'none',
    color: '#4A4A4A',
    opacity: 0.5,
  },
  active: {
    background: 'radial-gradient(circle, rgba(139,0,0,0.3) 0%, rgba(139,0,0,0.1) 100%)',
    border: '2px solid #8B0000',
    boxShadow: '0 0 15px rgba(139,0,0,0.5), 0 0 30px rgba(255,106,0,0.2)',
    color: '#FF6A00',
  },
  solved: {
    background: 'radial-gradient(circle, rgba(0,230,118,0.2) 0%, rgba(0,230,118,0.05) 100%)',
    border: '2px solid #00E676',
    boxShadow: '0 0 15px rgba(0,230,118,0.4), 0 0 30px rgba(0,230,118,0.15)',
    color: '#00E676',
  },
  checkpoint: {
    background: `
      repeating-conic-gradient(
        rgba(255,140,0,0.15) 0% 25%,
        rgba(20,20,25,0.8) 25% 50%
      ) center / 12px 12px`,
    border: '2px solid #FF8C00',
    color: '#FF8C00',
  },
  penalty: {
    background: 'radial-gradient(circle, rgba(183,28,28,0.3) 0%, rgba(183,28,28,0.1) 100%)',
    border: '2px solid #B71C1C',
    boxShadow: '0 0 10px rgba(183,28,28,0.4)',
    color: '#B71C1C',
  },
  final: {
    background: 'radial-gradient(circle, rgba(41,182,246,0.25) 0%, rgba(41,182,246,0.08) 100%)',
    border: '2px solid #29B6F6',
    boxShadow: '0 0 20px rgba(41,182,246,0.4), 0 0 40px rgba(41,182,246,0.15)',
    color: '#29B6F6',
  },
}

const animationVariants = {
  checkpoint: {
    scale: [1, 1.08, 1],
    boxShadow: [
      '0 0 10px #FF8C00, 0 0 20px #FF8C00',
      '0 0 30px #FF8C00, 0 0 60px #FF6A00',
      '0 0 10px #FF8C00, 0 0 20px #FF8C00',
    ],
    transition: { duration: 2, repeat: Infinity, ease: 'easeInOut' },
  },
  penalty: {
    scale: [1, 1.03, 0.97, 1],
    rotate: [0, 0.5, -0.5, 0],
    transition: { duration: 1.5, repeat: Infinity, ease: 'easeInOut' },
  },
}

const nodeIcons = {
  start: '▶',
  checkpoint: '⚑',
  penalty: '☠',
  final: '★',
  solved: '✓',
  active: '?',
  inactive: '○',
}

function GameNode({ data }) {
  const { label, nodeType = 'inactive', onClick } = data
  const style = nodeStyles[nodeType] || nodeStyles.inactive
  const animate = animationVariants[nodeType]
  const icon = nodeIcons[nodeType] || '○'

  return (
    <motion.div
      onClick={onClick}
      animate={animate}
      whileHover={nodeType !== 'inactive' ? { scale: 1.1 } : undefined}
      className="flex flex-col items-center justify-center rounded-full cursor-pointer select-none"
      style={{
        width: 70,
        height: 70,
        ...style,
        fontFamily: "'Space Grotesk', sans-serif",
        transition: 'all 0.3s ease',
        position: 'relative',
      }}
    >
      <Handle type="target" position={Position.Top} style={{ background: 'transparent', border: 'none' }} />
      <Handle type="source" position={Position.Bottom} style={{ background: 'transparent', border: 'none' }} />
      <Handle type="target" position={Position.Left} style={{ background: 'transparent', border: 'none' }} id="left-target" />
      <Handle type="source" position={Position.Right} style={{ background: 'transparent', border: 'none' }} id="right-source" />

      <span style={{ fontSize: '1.2rem', lineHeight: 1 }}>{icon}</span>
      <span style={{ fontSize: '0.55rem', marginTop: 3, letterSpacing: '0.05em', fontWeight: 600 }}>
        {label}
      </span>
    </motion.div>
  )
}

export default memo(GameNode)
