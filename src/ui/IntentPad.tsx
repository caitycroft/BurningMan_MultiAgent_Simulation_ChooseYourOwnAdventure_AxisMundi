import { useRef, type PointerEvent as ReactPointerEvent } from 'react'
import { INTENT_PRESETS, type IntentWeights } from '../sim/presets'

const A = { x: 100, y: 14 } // Peak Novelty (top)
const B = { x: 16, y: 168 } // Peak Connection (bottom-left)
const C = { x: 184, y: 168 } // Peak Surrender (bottom-right)

function barycentric(p: { x: number; y: number }) {
  const v0 = { x: B.x - A.x, y: B.y - A.y }
  const v1 = { x: C.x - A.x, y: C.y - A.y }
  const v2 = { x: p.x - A.x, y: p.y - A.y }
  const d00 = v0.x * v0.x + v0.y * v0.y
  const d01 = v0.x * v1.x + v0.y * v1.y
  const d11 = v1.x * v1.x + v1.y * v1.y
  const d20 = v2.x * v0.x + v2.y * v0.y
  const d21 = v2.x * v1.x + v2.y * v1.y
  const denom = d00 * d11 - d01 * d01
  const v = (d11 * d20 - d01 * d21) / denom
  const w = (d00 * d21 - d01 * d20) / denom
  const u = 1 - v - w
  const novelty = Math.max(0, u)
  const connection = Math.max(0, v)
  const surrender = Math.max(0, w)
  const sum = novelty + connection + surrender || 1
  return { novelty: novelty / sum, connection: connection / sum, surrender: surrender / sum }
}

function pointFor(weights: IntentWeights) {
  return {
    x: weights.novelty * A.x + weights.connection * B.x + weights.surrender * C.x,
    y: weights.novelty * A.y + weights.connection * B.y + weights.surrender * C.y,
  }
}

interface IntentPadProps {
  weights: IntentWeights
  onChange: (w: IntentWeights) => void
}

export default function IntentPad({ weights, onChange }: IntentPadProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const dragging = useRef(false)

  function updateFromClient(clientX: number, clientY: number) {
    const svg = svgRef.current
    if (!svg) return
    const rect = svg.getBoundingClientRect()
    const x = ((clientX - rect.left) / rect.width) * 200
    const y = ((clientY - rect.top) / rect.height) * 180
    onChange(barycentric({ x, y }))
  }

  function handlePointerDown(e: ReactPointerEvent<SVGSVGElement>) {
    dragging.current = true
    e.currentTarget.setPointerCapture(e.pointerId)
    updateFromClient(e.clientX, e.clientY)
  }
  function handlePointerMove(e: ReactPointerEvent<SVGSVGElement>) {
    if (!dragging.current) return
    updateFromClient(e.clientX, e.clientY)
  }
  function handlePointerUp() {
    dragging.current = false
  }

  const marker = pointFor(weights)

  return (
    <svg
      ref={svgRef}
      viewBox="0 0 200 180"
      width={140}
      height={126}
      style={{ touchAction: 'none', cursor: 'crosshair' }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      <polygon
        points={`${A.x},${A.y} ${B.x},${B.y} ${C.x},${C.y}`}
        fill="rgba(0,229,255,0.06)"
        stroke="rgba(255,255,255,0.25)"
        strokeWidth={1}
      />
      <text x={A.x} y={A.y - 4} fill="rgba(255,255,255,0.7)" fontSize={9} textAnchor="middle">
        NOVELTY
      </text>
      <text x={B.x - 4} y={B.y + 14} fill="rgba(255,255,255,0.7)" fontSize={9} textAnchor="start">
        CONNECTION
      </text>
      <text x={C.x + 4} y={C.y + 14} fill="rgba(255,255,255,0.7)" fontSize={9} textAnchor="end">
        SURRENDER
      </text>
      <circle cx={marker.x} cy={marker.y} r={6} fill="#00e5ff" stroke="#0a0a0a" strokeWidth={1.5} />
    </svg>
  )
}

export function IntentPresetButtons({ onChange }: { onChange: (w: IntentWeights) => void }) {
  return (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
      {(['novelty', 'connection', 'surrender', 'balanced'] as const).map((key) => (
        <button
          key={key}
          onClick={() => onChange(INTENT_PRESETS[key])}
          style={{
            padding: '3px 8px',
            borderRadius: 999,
            border: '1px solid rgba(255,255,255,0.2)',
            background: 'rgba(255,255,255,0.06)',
            color: '#e8e8e8',
            cursor: 'pointer',
            fontSize: 10,
            textTransform: 'capitalize',
          }}
        >
          {key}
        </button>
      ))}
    </div>
  )
}
