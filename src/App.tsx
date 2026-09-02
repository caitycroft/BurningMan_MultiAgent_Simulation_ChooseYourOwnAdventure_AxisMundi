import { useEffect, useMemo, useRef, useState } from 'react'
import LivingMap from './canvas/LivingMap'
import { DAY_LABELS, EVENTS, findPlace, liveEventsAtVenue } from './brc2026'
import { SCRIPTED_PATH, TOTAL_SIM_HOURS, getMomentAt } from './data/itinerary'

const BASE_SIM_MINUTES_PER_SEC = 5
const SPEEDS = [1, 10, 60] as const

const lockedAnchors = EVENTS.filter((e) => e.lockedAnchor).map((e) => ({
  label: e.label,
  atHour: e.day * 24 + e.startHour,
}))

export default function App() {
  const [simHour, setSimHour] = useState(0)
  const [playing, setPlaying] = useState(true)
  const [speed, setSpeed] = useState<(typeof SPEEDS)[number]>(1)
  const lastFrameRef = useRef<number | null>(null)

  useEffect(() => {
    let raf: number
    const tick = (now: number) => {
      if (lastFrameRef.current == null) lastFrameRef.current = now
      const deltaSec = (now - lastFrameRef.current) / 1000
      lastFrameRef.current = now

      if (playing) {
        setSimHour((prev) => {
          const next = prev + (deltaSec * BASE_SIM_MINUTES_PER_SEC * speed) / 60
          if (next >= TOTAL_SIM_HOURS) {
            setPlaying(false)
            return TOTAL_SIM_HOURS
          }
          return next
        })
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [playing, speed])

  const day = Math.floor(simHour / 24)
  const hourOfDay = simHour - day * 24
  const hh = Math.floor(hourOfDay).toString().padStart(2, '0')
  const mm = Math.round((hourOfDay % 1) * 60).toString().padStart(2, '0')

  const moment = useMemo(() => getMomentAt(SCRIPTED_PATH, simHour), [simHour])
  const fromPlace = findPlace(moment.from.placeId)
  const toPlace = findPlace(moment.to.placeId)
  const herePlace = moment.status === 'at' ? fromPlace : toPlace
  const hereActivity = moment.status === 'at' ? moment.from.label : moment.to.label
  const liveHere = liveEventsAtVenue(herePlace.id, simHour)
  const nextPlace = moment.next ? findPlace(moment.next.placeId) : null

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh' }}>
      <LivingMap simHour={simHour} />

      <div
        style={{
          position: 'absolute',
          top: 16,
          left: 16,
          fontSize: 13,
          letterSpacing: '0.05em',
          opacity: 0.85,
          textTransform: 'uppercase',
        }}
      >
        Axis Mundi — {DAY_LABELS[Math.min(day, DAY_LABELS.length - 1)]} · {hh}:{mm}
      </div>

      <div
        style={{
          position: 'absolute',
          top: 16,
          right: 16,
          maxWidth: 260,
          padding: '12px 14px',
          borderRadius: 10,
          background: 'rgba(10,10,10,0.65)',
          border: '1px solid rgba(255,255,255,0.1)',
          fontSize: 12,
          lineHeight: 1.5,
        }}
      >
        <div style={{ fontSize: 10, letterSpacing: '0.08em', opacity: 0.5, textTransform: 'uppercase' }}>
          {moment.status === 'at' ? 'At' : 'En route'}
        </div>
        <div style={{ fontWeight: 700, fontSize: 14 }}>
          {moment.status === 'at' ? herePlace.label : `${fromPlace.label} → ${toPlace.label}`}
        </div>
        <div style={{ opacity: 0.75, marginTop: 2 }}>{hereActivity}</div>

        {liveHere.length > 0 && (
          <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
            <div style={{ fontSize: 10, letterSpacing: '0.08em', opacity: 0.5, textTransform: 'uppercase' }}>
              Live now
            </div>
            {liveHere.map((e) => (
              <div key={e.id} style={{ color: '#ffcf8a' }}>
                {e.label}{' '}
                <span style={{ opacity: 0.6, fontSize: 11 }}>({e.tags.join(', ')})</span>
              </div>
            ))}
          </div>
        )}

        {nextPlace && (
          <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
            <div style={{ fontSize: 10, letterSpacing: '0.08em', opacity: 0.5, textTransform: 'uppercase' }}>
              Next
            </div>
            <div style={{ opacity: 0.85 }}>
              {moment.next!.label} <span style={{ opacity: 0.6 }}>· {nextPlace.label}</span>
            </div>
          </div>
        )}
      </div>

      <div
        style={{
          position: 'absolute',
          bottom: 90,
          right: 16,
          padding: '10px 12px',
          borderRadius: 10,
          background: 'rgba(10,10,10,0.55)',
          border: '1px solid rgba(255,255,255,0.08)',
          fontSize: 11,
          display: 'flex',
          flexDirection: 'column',
          gap: 4,
        }}
      >
        <LegendRow color="#00e5ff" label="Caity & Kenny" />
        <LegendRow color="#ffd76a" label="Home camp" />
        <LegendRow color="rgba(190,180,255,0.9)" label="Friend camp" />
        <LegendRow color="rgba(170,170,190,0.9)" label="Venue" />
        <LegendRow color="rgba(200,140,255,0.9)" label="Art" />
        <LegendRow color="#ff5aa0" label="Robot Heart (roaming)" />
        <LegendRow color="#ffcf8a" label="Live event (pulsing)" />
      </div>

      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          padding: '14px 20px 20px',
          background: 'linear-gradient(to top, rgba(0,0,0,0.85), transparent)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
          <button
            onClick={() => setPlaying((p) => !p)}
            style={buttonStyle(false)}
          >
            {playing ? 'Pause' : 'Play'}
          </button>
          {SPEEDS.map((s) => (
            <button key={s} onClick={() => setSpeed(s)} style={buttonStyle(speed === s)}>
              {s}x
            </button>
          ))}
        </div>

        <div style={{ position: 'relative' }}>
          <input
            type="range"
            min={0}
            max={TOTAL_SIM_HOURS}
            step={0.05}
            value={simHour}
            onChange={(e) => {
              setPlaying(false)
              setSimHour(Number(e.target.value))
            }}
            style={{ width: '100%' }}
          />
          <div style={{ position: 'relative', height: 18 }}>
            {DAY_LABELS.map((label, i) => (
              <span
                key={label}
                style={{
                  position: 'absolute',
                  left: `${(i * 24 * 100) / TOTAL_SIM_HOURS}%`,
                  fontSize: 10,
                  opacity: 0.5,
                  transform: 'translateX(-4px)',
                }}
              >
                {label}
              </span>
            ))}
            {lockedAnchors.map((a) => (
              <span
                key={a.label}
                title={a.label}
                style={{
                  position: 'absolute',
                  left: `${(a.atHour * 100) / TOTAL_SIM_HOURS}%`,
                  top: -18,
                  transform: 'translateX(-6px)',
                  fontSize: 12,
                }}
              >
                🔥
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function LegendRow({ color, label }: { color: string; label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{ width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0 }} />
      <span style={{ opacity: 0.75 }}>{label}</span>
    </div>
  )
}

function buttonStyle(active: boolean): React.CSSProperties {
  return {
    padding: '6px 14px',
    borderRadius: 999,
    border: '1px solid rgba(255,255,255,0.2)',
    background: active ? '#00e5ff' : 'rgba(255,255,255,0.06)',
    color: active ? '#0a0a0a' : '#e8e8e8',
    cursor: 'pointer',
    fontSize: 12,
    fontWeight: 600,
  }
}
