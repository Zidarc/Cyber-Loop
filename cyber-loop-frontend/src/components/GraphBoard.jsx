import { useMemo } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  useNodesState,
  useEdgesState,
} from '@xyflow/react'
import GameNode from './GameNode'

const nodeTypes = { gameNode: GameNode }

// Spider web / network layout positions
const initialNodePositions = {
  start:      { x: 400, y: 50 },
  node1:      { x: 200, y: 180 },
  node2:      { x: 600, y: 180 },
  checkpoint: { x: 400, y: 320 },
  node3:      { x: 150, y: 460 },
  node4:      { x: 650, y: 460 },
  node5:      { x: 400, y: 460 },
  final:      { x: 400, y: 620 },
  // Penalty node positions (branch around final node)
  penalty1: { x: 100, y: 580 },
  penalty2: { x: 700, y: 580 },
  penalty3: { x: 200, y: 700 },
  penalty4: { x: 600, y: 700 },
  penalty5: { x: 400, y: 760 },
}

export function createInitialNodes(hiddenPenalties = []) {
  const nodeConfigs = [
    { id: 'start', label: 'START', nodeType: 'start' },
    { id: 'node1', label: 'N-01', nodeType: 'inactive' },
    { id: 'node2', label: 'N-02', nodeType: 'inactive' },
    { id: 'checkpoint', label: 'CHECK', nodeType: 'checkpoint' },
    { id: 'node3', label: 'N-03', nodeType: 'inactive' },
    { id: 'node4', label: 'N-04', nodeType: 'inactive' },
    { id: 'node5', label: 'N-05', nodeType: 'inactive' },
    { id: 'final', label: 'FINAL', nodeType: 'final' },
    // Penalty nodes
    { id: 'penalty1', label: 'P-01', nodeType: 'penalty' },
    { id: 'penalty2', label: 'P-02', nodeType: 'penalty' },
    { id: 'penalty3', label: 'P-03', nodeType: 'penalty' },
    { id: 'penalty4', label: 'P-04', nodeType: 'penalty' },
    { id: 'penalty5', label: 'P-05', nodeType: 'penalty' },
  ]

  return nodeConfigs.map((cfg) => ({
    id: cfg.id,
    type: 'gameNode',
    position: initialNodePositions[cfg.id],
    data: {
      label: cfg.label,
      nodeType: cfg.nodeType,
    },
    hidden: cfg.id.startsWith('penalty') && !hiddenPenalties.includes(cfg.id),
  }))
}

export function createInitialEdges() {
  return [
    // Main path: Start → N1, N2 → Checkpoint → N3, N4, N5 → Final
    { id: 'e-start-n1', source: 'start', target: 'node1', animated: true, style: { stroke: '#333', strokeWidth: 2 } },
    { id: 'e-start-n2', source: 'start', target: 'node2', animated: true, style: { stroke: '#333', strokeWidth: 2 } },
    { id: 'e-n1-cp', source: 'node1', target: 'checkpoint', style: { stroke: '#444', strokeWidth: 2 } },
    { id: 'e-n2-cp', source: 'node2', target: 'checkpoint', style: { stroke: '#444', strokeWidth: 2 } },
    { id: 'e-cp-n3', source: 'checkpoint', target: 'node3', style: { stroke: '#444', strokeWidth: 2 } },
    { id: 'e-cp-n4', source: 'checkpoint', target: 'node4', style: { stroke: '#444', strokeWidth: 2 } },
    { id: 'e-cp-n5', source: 'checkpoint', target: 'node5', style: { stroke: '#444', strokeWidth: 2 } },
    { id: 'e-n3-final', source: 'node3', target: 'final', style: { stroke: '#444', strokeWidth: 2 } },
    { id: 'e-n4-final', source: 'node4', target: 'final', style: { stroke: '#444', strokeWidth: 2 } },
    { id: 'e-n5-final', source: 'node5', target: 'final', style: { stroke: '#444', strokeWidth: 2 } },
    // Cross-connections for spider web effect
    { id: 'e-n1-n2', source: 'node1', target: 'node2', sourceHandle: 'right-source', targetHandle: 'left-target', style: { stroke: '#2a2a2a', strokeWidth: 1, strokeDasharray: '5,5' } },
    { id: 'e-n3-n5', source: 'node3', target: 'node5', sourceHandle: 'right-source', targetHandle: 'left-target', style: { stroke: '#2a2a2a', strokeWidth: 1, strokeDasharray: '5,5' } },
    { id: 'e-n5-n4', source: 'node5', target: 'node4', sourceHandle: 'right-source', targetHandle: 'left-target', style: { stroke: '#2a2a2a', strokeWidth: 1, strokeDasharray: '5,5' } },
    // Penalty edges (hidden initially — shown when penalty nodes appear)
    { id: 'e-n3-p1', source: 'node3', target: 'penalty1', hidden: true, style: { stroke: '#B71C1C', strokeWidth: 1.5, strokeDasharray: '3,3' } },
    { id: 'e-n4-p2', source: 'node4', target: 'penalty2', hidden: true, style: { stroke: '#B71C1C', strokeWidth: 1.5, strokeDasharray: '3,3' } },
    { id: 'e-p1-p3', source: 'penalty1', target: 'penalty3', hidden: true, style: { stroke: '#B71C1C', strokeWidth: 1.5, strokeDasharray: '3,3' } },
    { id: 'e-p2-p4', source: 'penalty2', target: 'penalty4', hidden: true, style: { stroke: '#B71C1C', strokeWidth: 1.5, strokeDasharray: '3,3' } },
    { id: 'e-final-p5', source: 'final', target: 'penalty5', hidden: true, style: { stroke: '#B71C1C', strokeWidth: 1.5, strokeDasharray: '3,3' } },
  ]
}

const penaltyEdgeMap = {
  penalty1: 'e-n3-p1',
  penalty2: 'e-n4-p2',
  penalty3: 'e-p1-p3',
  penalty4: 'e-p2-p4',
  penalty5: 'e-final-p5',
}

export default function GraphBoard({ onNodeClick, visiblePenalties }) {
  const initialNodes = useMemo(() => {
    const nodes = createInitialNodes(visiblePenalties)
    return nodes.map((n) => ({
      ...n,
      data: {
        ...n.data,
        onClick: () => onNodeClick(n),
      },
    }))
  }, [onNodeClick, visiblePenalties])

  const initialEdges = useMemo(() => {
    const edges = createInitialEdges()
    return edges.map((e) => ({
      ...e,
      hidden: e.hidden && !visiblePenalties.some((pId) => penaltyEdgeMap[pId] === e.id),
    }))
  }, [visiblePenalties])

  const [nodes, , onNodesChange] = useNodesState(initialNodes)
  const [edges, , onEdgesChange] = useEdgesState(initialEdges)

  return (
    <div className="w-full flex-1" style={{ background: '#0B0B0F' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.3 }}
        minZoom={0.4}
        maxZoom={1.5}
        proOptions={{ hideAttribution: true }}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
      >
        <Background color="#1a1a1f" gap={20} size={1} />
        <Controls position="bottom-left" />
      </ReactFlow>
    </div>
  )
}
