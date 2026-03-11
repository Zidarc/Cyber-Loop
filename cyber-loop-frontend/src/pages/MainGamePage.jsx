import { useState, useCallback } from 'react'
import Navbar from '../components/Navbar'
import GraphBoard from '../components/GraphBoard'
import PuzzleModal from '../components/PuzzleModal'
import PenaltyCounter from '../components/PenaltyCounter'

export default function MainGamePage() {
  // ─── Placeholder state variables ───
  // Backend team will later control these states
  const [penaltyCount, setPenaltyCount] = useState(0)
  const [visiblePenalties, setVisiblePenalties] = useState([])
  const [activeNode, setActiveNode] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [flashScreen, setFlashScreen] = useState(false)

  const penaltyOrder = ['penalty1', 'penalty2', 'penalty3', 'penalty4', 'penalty5']

  const handleNodeClick = useCallback((node) => {
    // Don't open modal for penalty nodes
    if (node.data.nodeType === 'penalty') return
    setActiveNode({
      id: node.id,
      label: node.data.label,
      nodeType: node.data.nodeType,
    })
    setShowModal(true)
  }, [])

  const handleCloseModal = useCallback(() => {
    setShowModal(false)
    setActiveNode(null)
  }, [])

  const handleSubmitAnswer = useCallback((_nodeId, _answer, isCorrect) => {
    if (!isCorrect) {
      // Wrong answer visual feedback
      setFlashScreen(true)
      setTimeout(() => setFlashScreen(false), 500)

      // Reveal next penalty node
      setPenaltyCount((prev) => {
        const next = Math.min(prev + 1, 5)
        const newPenalty = penaltyOrder[prev]
        if (newPenalty) {
          setVisiblePenalties((vp) => [...vp, newPenalty])
        }
        return next
      })
    }

    setShowModal(false)
    setActiveNode(null)
  }, [])

  return (
    <div
      className="min-h-screen flex flex-col relative"
      style={{ background: '#0B0B0F' }}
    >
      {/* Red flash overlay on wrong answer */}
      {flashScreen && (
        <div
          className="fixed inset-0 pointer-events-none z-50"
          style={{
            animation: 'redFlash 0.5s ease-out forwards',
          }}
        />
      )}

      <Navbar />

      <div className="flex-1 flex relative">
        <GraphBoard
          onNodeClick={handleNodeClick}
          visiblePenalties={visiblePenalties}
        />

        <PenaltyCounter count={penaltyCount} />
      </div>

      {showModal && (
        <PuzzleModal
          node={activeNode}
          onClose={handleCloseModal}
          onSubmit={handleSubmitAnswer}
        />
      )}
    </div>
  )
}
