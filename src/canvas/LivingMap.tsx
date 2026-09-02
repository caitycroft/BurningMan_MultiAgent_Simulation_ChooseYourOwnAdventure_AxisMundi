import { useEffect, useRef } from 'react'
import {
  brcToXY,
  CITY_ARC_START_CLOCK,
  CITY_ARC_END_CLOCK,
  ENV,
  PLACES,
  RING_RADIUS,
  findPlace,
  liveEventsAtVenue,
  type Place,
  type RingId,
} from '../brc2026'
import { SCRIPTED_PATH, sampleWaypointsAt, type Waypoint } from '../data/itinerary'

const LETTER_RINGS: RingId[] = ['esplanade', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L']

const CYAN = '#00e5ff'
const VOID_BLACK = '#0a0a0a'

const KIND_COLOR: Record<Place['kind'], string> = {
  home: '#ffd76a',
  camp: 'rgba(190,180,255,0.65)',
  venue: 'rgba(170,170,190,0.5)',
  civic: 'rgba(230,230,230,0.6)',
  art: 'rgba(200,140,255,0.6)',
  roaming: '#ff5aa0',
}

function placeXY(place: Place, center: { x: number; y: number }, scale: number) {
  return brcToXY(place.clock, place.ring, center, scale)
}

function waypointXY(wp: Waypoint, center: { x: number; y: number }, scale: number) {
  return placeXY(findPlace(wp.placeId), center, scale)
}

function pathXYAt(waypoints: Waypoint[], atHour: number, center: { x: number; y: number }, scale: number) {
  const { a, b, t } = sampleWaypointsAt(waypoints, atHour)
  const pa = waypointXY(a, center, scale)
  const pb = waypointXY(b, center, scale)
  return { x: pa.x + (pb.x - pa.x) * t, y: pa.y + (pb.y - pa.y) * t }
}

function skyOverlay(hourOfDay: number): { color: string; alpha: number } {
  const { sunriseHour, sunsetHour } = ENV
  const distFromSunrise = Math.abs(hourOfDay - sunriseHour)
  const distFromSunset = Math.abs(hourOfDay - sunsetHour)
  if (distFromSunrise < 1.2) {
    const t = 1 - distFromSunrise / 1.2
    return { color: '#ff8a3d', alpha: 0.18 * t }
  }
  if (distFromSunset < 1.2) {
    const t = 1 - distFromSunset / 1.2
    return { color: '#ff5f7e', alpha: 0.18 * t }
  }
  const isDay = hourOfDay > sunriseHour && hourOfDay < sunsetHour
  return isDay ? { color: '#3a3a55', alpha: 0.12 } : { color: '#000000', alpha: 0 }
}

interface LivingMapProps {
  simHour: number
}

export default function LivingMap({ simHour }: LivingMapProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const width = container.clientWidth
    const height = container.clientHeight
    canvas.width = width * dpr
    canvas.height = height * dpr
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

    const center = { x: width / 2, y: height / 2 + height * 0.16 }
    const maxRadius = Math.max(RING_RADIUS.deepPlaya, RING_RADIUS.trashFence)
    const scale = (Math.min(width, height) / 2) * 0.9 / maxRadius

    const day = Math.floor(simHour / 24)
    const hourOfDay = simHour - day * 24

    ctx.fillStyle = VOID_BLACK
    ctx.fillRect(0, 0, width, height)

    const sky = skyOverlay(hourOfDay)
    if (sky.alpha > 0) {
      const grad = ctx.createRadialGradient(center.x, center.y, 0, center.x, center.y, maxRadius * scale)
      grad.addColorStop(0, sky.color)
      grad.addColorStop(1, VOID_BLACK)
      ctx.globalAlpha = sky.alpha
      ctx.fillStyle = grad
      ctx.fillRect(0, 0, width, height)
      ctx.globalAlpha = 1
    }

    const arcStart = (CITY_ARC_START_CLOCK / 12) * Math.PI * 2 - Math.PI / 2
    const arcEnd = (CITY_ARC_END_CLOCK / 12) * Math.PI * 2 - Math.PI / 2

    // find where our heroes currently are, so we can highlight that ring + spoke
    const heroXY = pathXYAt(SCRIPTED_PATH, simHour, center, scale)
    const { a: fromWp, b: toWp, t: travelT } = sampleWaypointsAt(SCRIPTED_PATH, simHour)
    const currentPlace = travelT < 0.5 ? findPlace(fromWp.placeId) : findPlace(toWp.placeId)

    ctx.strokeStyle = 'rgba(255,255,255,0.14)'
    ctx.lineWidth = 1
    for (const ring of LETTER_RINGS) {
      const isCurrent = ring === currentPlace.ring
      const r = RING_RADIUS[ring] * scale
      ctx.strokeStyle = isCurrent ? 'rgba(0,229,255,0.28)' : 'rgba(255,255,255,0.14)'
      ctx.lineWidth = isCurrent ? 2 : 1
      ctx.beginPath()
      ctx.arc(center.x, center.y, r, arcStart, arcEnd)
      ctx.stroke()
    }

    for (let clockTick = CITY_ARC_START_CLOCK; clockTick <= CITY_ARC_END_CLOCK; clockTick += 0.5) {
      const isCurrent = Math.abs(clockTick - currentPlace.clock) < 0.26
      const inner = brcToXY(clockTick, 'esplanade', center, scale)
      const outer = brcToXY(clockTick, 'L', center, scale)
      ctx.strokeStyle = isCurrent ? 'rgba(0,229,255,0.28)' : 'rgba(255,255,255,0.1)'
      ctx.lineWidth = isCurrent ? 2 : 1
      ctx.beginPath()
      ctx.moveTo(inner.x, inner.y)
      ctx.lineTo(outer.x, outer.y)
      ctx.stroke()
    }

    ctx.strokeStyle = 'rgba(255,255,255,0.08)'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.arc(center.x, center.y, RING_RADIUS.deepPlaya * scale, 0, Math.PI * 2)
    ctx.stroke()
    ctx.beginPath()
    ctx.arc(center.x, center.y, RING_RADIUS.trashFence * scale, 0, Math.PI * 2)
    ctx.stroke()

    // clock-position labels around the outer arc
    ctx.font = '10px -apple-system, sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    const labelRadius = RING_RADIUS.trashFence + 45
    for (let h = CITY_ARC_START_CLOCK; h <= CITY_ARC_END_CLOCK; h++) {
      const pos = brcToXY(h, labelRadius, center, scale)
      ctx.fillStyle = 'rgba(255,255,255,0.4)'
      ctx.fillText(`${h}:00`, pos.x, pos.y)
    }
    const templeAxisPos = brcToXY(0, labelRadius, center, scale)
    ctx.fillStyle = 'rgba(255,255,255,0.4)'
    ctx.fillText('12:00 · Temple axis', templeAxisPos.x, templeAxisPos.y)

    // street/ring labels, staged just outside the 2:00 edge
    ctx.textAlign = 'left'
    ctx.font = '9px -apple-system, sans-serif'
    const ringLabelClock = CITY_ARC_START_CLOCK - 0.4
    for (const ring of LETTER_RINGS) {
      const pos = brcToXY(ringLabelClock, ring, center, scale)
      ctx.fillStyle = 'rgba(255,255,255,0.32)'
      ctx.fillText(ring === 'esplanade' ? 'Esplanade' : `${ring} St`, pos.x, pos.y)
    }
    const deepPlayaLabelPos = brcToXY(ringLabelClock, 'deepPlaya', center, scale)
    ctx.fillStyle = 'rgba(255,255,255,0.28)'
    ctx.fillText('Deep Playa', deepPlayaLabelPos.x, deepPlayaLabelPos.y)
    const trashFenceLabelPos = brcToXY(ringLabelClock, 'trashFence', center, scale)
    ctx.fillStyle = 'rgba(255,255,255,0.2)'
    ctx.fillText('Trash Fence', trashFenceLabelPos.x, trashFenceLabelPos.y)

    // venues, camps, civic points -- always labeled
    for (const place of PLACES) {
      if (place.kind === 'roaming') continue

      const liveEvents = liveEventsAtVenue(place.id, simHour)
      const liveMagnitude = liveEvents.reduce((max, e) => Math.max(max, e.magnitude), 0)

      const { x, y } = placeXY(place, center, scale)
      const isHome = place.kind === 'home'
      const baseRadius = isHome ? 6 : place.kind === 'camp' ? 3 : 4
      const pulse = liveMagnitude > 0 ? baseRadius + liveMagnitude * 8 : baseRadius

      if (liveMagnitude > 0) {
        const glow = ctx.createRadialGradient(x, y, 0, x, y, pulse * 3)
        glow.addColorStop(0, `rgba(255,160,60,${0.5 * liveMagnitude})`)
        glow.addColorStop(1, 'rgba(255,160,60,0)')
        ctx.fillStyle = glow
        ctx.beginPath()
        ctx.arc(x, y, pulse * 3, 0, Math.PI * 2)
        ctx.fill()
      }

      if (isHome) {
        ctx.strokeStyle = KIND_COLOR.home
        ctx.lineWidth = 1.5
        ctx.beginPath()
        ctx.arc(x, y, pulse + 3, 0, Math.PI * 2)
        ctx.stroke()
      }

      ctx.fillStyle = liveMagnitude > 0 ? '#ffcf8a' : KIND_COLOR[place.kind]
      ctx.beginPath()
      ctx.arc(x, y, pulse, 0, Math.PI * 2)
      ctx.fill()

      ctx.textAlign = 'left'
      ctx.textBaseline = 'alphabetic'
      ctx.font = isHome ? 'bold 11px -apple-system, sans-serif' : '10px -apple-system, sans-serif'
      ctx.fillStyle = liveMagnitude > 0 ? '#ffe3b8' : isHome ? '#ffe9b3' : 'rgba(255,255,255,0.55)'
      ctx.fillText(place.label, x + pulse + 5, y + 3)

      if (liveEvents.length > 0) {
        ctx.font = '9px -apple-system, sans-serif'
        ctx.fillStyle = 'rgba(255,207,138,0.85)'
        ctx.fillText(liveEvents[0].label, x + pulse + 5, y + 15)
      }
    }

    const robotHeart = findPlace('robot-heart')
    const anchor = robotHeart.roamingAnchors?.find((a) => a.day === day)
    if (anchor) {
      const { x, y } = brcToXY(anchor.clock, anchor.ring, center, scale)
      const glow = ctx.createRadialGradient(x, y, 0, x, y, 24)
      glow.addColorStop(0, 'rgba(255,90,160,0.55)')
      glow.addColorStop(1, 'rgba(255,90,160,0)')
      ctx.fillStyle = glow
      ctx.beginPath()
      ctx.arc(x, y, 24, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = KIND_COLOR.roaming
      ctx.beginPath()
      ctx.arc(x, y, 5, 0, Math.PI * 2)
      ctx.fill()
      ctx.font = 'bold 10px -apple-system, sans-serif'
      ctx.fillStyle = '#ffb8dd'
      ctx.textAlign = 'left'
      ctx.fillText('Robot Heart (roaming today)', x + 10, y + 3)
    }

    const trailSpan = 1.5
    const samples = 30
    const drawTrail = (offset: { x: number; y: number }) => {
      ctx.lineCap = 'round'
      for (let i = 0; i < samples; i++) {
        const t0 = simHour - trailSpan + (trailSpan * i) / samples
        const t1 = simHour - trailSpan + (trailSpan * (i + 1)) / samples
        const p0 = pathXYAt(SCRIPTED_PATH, t0, center, scale)
        const p1 = pathXYAt(SCRIPTED_PATH, t1, center, scale)
        const alpha = (i / samples) * 0.6
        ctx.strokeStyle = `rgba(0,229,255,${alpha})`
        ctx.lineWidth = 1 + (i / samples) * 2
        ctx.beginPath()
        ctx.moveTo(p0.x + offset.x, p0.y + offset.y)
        ctx.lineTo(p1.x + offset.x, p1.y + offset.y)
        ctx.stroke()
      }
    }

    drawTrail({ x: 0, y: 0 })
    drawTrail({ x: 7, y: 7 })

    const caity = heroXY
    const kenny = { x: caity.x + 7, y: caity.y + 7 }

    for (const [pos, label] of [
      [caity, 'Caity'],
      [kenny, 'Kenny'],
    ] as const) {
      const glow = ctx.createRadialGradient(pos.x, pos.y, 0, pos.x, pos.y, 16)
      glow.addColorStop(0, 'rgba(0,229,255,0.9)')
      glow.addColorStop(1, 'rgba(0,229,255,0)')
      ctx.fillStyle = glow
      ctx.beginPath()
      ctx.arc(pos.x, pos.y, 16, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = CYAN
      ctx.beginPath()
      ctx.arc(pos.x, pos.y, 4, 0, Math.PI * 2)
      ctx.fill()
      ctx.textAlign = 'left'
      ctx.font = 'bold 11px -apple-system, sans-serif'
      ctx.fillStyle = 'rgba(255,255,255,0.9)'
      ctx.fillText(label, pos.x + 8, pos.y - 8)
    }

    const manXY = brcToXY(0, 'man', center, scale)
    ctx.fillStyle = 'rgba(255,255,255,0.6)'
    ctx.beginPath()
    ctx.arc(manXY.x, manXY.y, 5, 0, Math.PI * 2)
    ctx.fill()
    ctx.font = '10px -apple-system, sans-serif'
    ctx.fillStyle = 'rgba(255,255,255,0.4)'
    ctx.fillText('The Man', manXY.x + 8, manXY.y + 3)
  }, [simHour])

  return (
    <div ref={containerRef} style={{ position: 'absolute', inset: 0 }}>
      <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block' }} />
    </div>
  )
}
