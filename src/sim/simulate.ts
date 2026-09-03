import {
  brcToXY,
  EVENTS,
  eventEndAbs,
  eventStartAbs,
  findPlace,
  isEventLive,
  type SimEvent,
} from '../brc2026'
import { mulberry32, seedFromString } from './rng'
import type { IntentWeights } from './presets'
import type { Waypoint } from '../data/itinerary'

const HOME = 'chillsville'
const FRIEND_CAMPS = ['titanics-end', 'home-camp', 'kiefers-shade-crew', 'elise-zach-camp']
const BREAK_SPOTS = ['center-camp', 'treble-makers']
const TICK_HOURS = 0.25
const SIM_START_HOUR = 12 // arrival Sunday noon
const SIM_END_HOUR = 8 * 24 + 9 // exodus Monday morning, matches the Planned path's span
const MAX_DIST = 800
const SUNRISE_WINDOW: [number, number] = [4.5, 7.5]

interface AgentState {
  placeId: string
  energy: number
  foodClock: number
  lastSleepEndHour: number
  sunrisesUsed: number
  visitCounts: Record<string, number>
}

function initialState(): AgentState {
  return { placeId: HOME, energy: 90, foodClock: 0, lastSleepEndHour: SIM_START_HOUR, sunrisesUsed: 0, visitCounts: {} }
}

function xyOf(clock: number, ring: number | string): { x: number; y: number } {
  return brcToXY(clock, ring as never, { x: 0, y: 0 }, 1)
}

function placeXY(placeId: string) {
  const p = findPlace(placeId)
  return xyOf(p.clock, p.ring)
}

function distanceBetween(aPlaceId: string, bClock: number, bRing: number | string) {
  const a = placeXY(aPlaceId)
  const b = xyOf(bClock, bRing)
  return Math.hypot(a.x - b.x, a.y - b.y)
}

interface Candidate {
  kind: 'event' | 'friend' | 'wander' | 'home' | 'break'
  placeId?: string
  clock?: number
  ring?: number
  label: string
  placeLabel: string
  event?: SimEvent
  distance: number
  duration: number
}

function isSunriseEvent(e: SimEvent): boolean {
  const localHour = e.startHour % 24
  return localHour >= SUNRISE_WINDOW[0] && localHour <= SUNRISE_WINDOW[1]
}

function buildCandidates(atHour: number, state: AgentState, rng: () => number, excludeEventId?: string): Candidate[] {
  const day = Math.floor(atHour / 24)
  const candidates: Candidate[] = []

  for (const e of EVENTS) {
    if (e.lockedAnchor) continue
    if (e.id === excludeEventId) continue
    if (e.day < day - 1 || e.day > day + 1) continue
    const startAbs = eventStartAbs(e)
    const endAbs = eventEndAbs(e)
    if (endAbs - atHour < 0.25) continue // basically over
    const joinable = isEventLive(e, atHour) || (startAbs > atHour && startAbs < atHour + 2)
    if (!joinable) continue
    if (isSunriseEvent(e) && state.sunrisesUsed >= 3) continue
    const place = findPlace(e.venueId)
    const distance = distanceBetween(state.placeId, place.clock, place.ring as never)
    candidates.push({
      kind: 'event',
      placeId: e.venueId,
      label: e.label,
      placeLabel: place.label,
      event: e,
      distance,
      duration: Math.min(endAbs - Math.max(atHour, startAbs), 6),
    })
  }

  // trim to the nearest ~30 to keep scoring cheap and avoid picking something absurdly far
  candidates.sort((a, b) => a.distance - b.distance)
  const trimmed = candidates.slice(0, 30)

  for (const slug of FRIEND_CAMPS) {
    const place = findPlace(slug)
    trimmed.push({
      kind: 'friend',
      placeId: slug,
      label: `Visit ${place.label}`,
      placeLabel: place.label,
      distance: distanceBetween(state.placeId, place.clock, place.ring as never),
      duration: 1 + rng() * 1.5,
    })
  }

  const wanderClock = (2 + rng() * 8) % 12
  const wanderRadius = 600 + rng() * 150
  trimmed.push({
    kind: 'wander',
    clock: wanderClock,
    ring: wanderRadius,
    label: 'Wandering deep playa',
    placeLabel: 'Deep Playa',
    distance: distanceBetween(state.placeId, wanderClock, wanderRadius),
    duration: 0.75 + rng() * 1.25,
  })

  const breakSlug = BREAK_SPOTS[Math.floor(rng() * BREAK_SPOTS.length)]
  const breakPlace = findPlace(breakSlug)
  trimmed.push({
    kind: 'break',
    placeId: breakSlug,
    label: `Break at ${breakPlace.label}`,
    placeLabel: breakPlace.label,
    distance: distanceBetween(state.placeId, breakPlace.clock, breakPlace.ring as never),
    duration: 0.5 + rng() * 0.75,
  })

  return trimmed
}

function scoreCandidate(c: Candidate, state: AgentState, weights: IntentWeights): number {
  const visits = c.placeId ? (state.visitCounts[c.placeId] ?? 0) : 0

  let novelty = 0.2
  if (c.kind === 'wander') novelty = 0.65
  else if (c.kind === 'event') {
    const base = c.event!.tags.some((t) => t === 'novelty' || t === 'Music/Party') ? 0.85 : 0.5
    novelty = base / (1 + visits * 0.5)
  }

  let connection = 0.2
  if (c.kind === 'friend') connection = c.placeId === 'titanics-end' ? 1 : 0.85
  else if (c.kind === 'event' && c.event!.tags.includes('connection')) connection = 0.7
  else if (c.kind === 'home') connection = 0.3

  let serendipity = 0.2
  if (c.kind === 'wander') serendipity = 0.9
  else if (c.kind === 'event' && c.distance > 300) serendipity = 0.5

  const recoveryUrgency = c.kind === 'home' || c.kind === 'break' ? ((100 - state.energy) / 100) * 0.8 : 0
  const travelCost = (Math.min(c.distance, MAX_DIST) / MAX_DIST) * 0.5

  return (
    weights.novelty * novelty +
    weights.connection * connection +
    weights.surrender * serendipity +
    recoveryUrgency -
    travelCost
  )
}

function pickBest(candidates: Candidate[], state: AgentState, weights: IntentWeights, rng: () => number): Candidate {
  let best = candidates[0]
  let bestScore = -Infinity
  for (const c of candidates) {
    const score = scoreCandidate(c, state, weights) + rng() * 0.05
    if (score > bestScore) {
      bestScore = score
      best = c
    }
  }
  return best
}

function lockedAnchorAt(atHour: number) {
  return EVENTS.find((e) => e.lockedAnchor && eventStartAbs(e) >= atHour && eventStartAbs(e) < atHour + TICK_HOURS)
}

export interface SimResult {
  caity: Waypoint[]
  kenny: Waypoint[]
}

export function simulateWeek(rawWeights: IntentWeights, seed: string): SimResult {
  const seedNum = seedFromString(seed)
  const rng = mulberry32(seedNum)
  const kennyRng = mulberry32(seedNum + 1)

  const state = initialState()
  const caity: Waypoint[] = [{ atHour: SIM_START_HOUR, placeId: HOME, label: 'Arrival & setup' }]
  const kenny: Waypoint[] = [{ atHour: SIM_START_HOUR, placeId: HOME, label: 'Arrival & setup' }]

  let freeAt = SIM_START_HOUR + 2
  let atHour = SIM_START_HOUR

  while (atHour < SIM_END_HOUR) {
    state.foodClock += TICK_HOURS
    state.energy = Math.max(10, state.energy - TICK_HOURS * 1.2)

    const anchor = lockedAnchorAt(atHour)
    if (anchor) {
      state.placeId = anchor.venueId
      state.foodClock = 0
      caity.push({ atHour, placeId: anchor.venueId, label: anchor.label })
      kenny.push({ atHour, placeId: anchor.venueId, label: anchor.label })
      freeAt = eventEndAbs(anchor)
      atHour = freeAt
      continue
    }

    const mustEat = state.foodClock >= 4
    const mustSleep = atHour - state.lastSleepEndHour >= 20

    if (atHour >= freeAt || mustEat || mustSleep) {
      if (mustSleep) {
        const duration = 5 + rng() * 2
        state.placeId = HOME
        state.energy = 95
        state.lastSleepEndHour = atHour + duration
        caity.push({ atHour, placeId: HOME, label: 'Sleep' })
        kenny.push({ atHour, placeId: HOME, label: 'Sleep' })
        freeAt = atHour + duration
      } else if (mustEat) {
        state.placeId = HOME
        state.foodClock = 0
        state.energy = Math.min(100, state.energy + 15)
        caity.push({ atHour, placeId: HOME, label: 'Meal at camp' })
        kenny.push({ atHour, placeId: HOME, label: 'Meal at camp' })
        freeAt = atHour + 0.75
      } else {
        const candidates = buildCandidates(atHour, state, rng)
        const choice = pickBest(candidates, state, rawWeights, rng)
        if (choice.kind === 'event' && isSunriseEvent(choice.event!)) state.sunrisesUsed++
        if (choice.placeId) state.visitCounts[choice.placeId] = (state.visitCounts[choice.placeId] ?? 0) + 1
        state.placeId = choice.placeId ?? state.placeId
        state.energy = Math.min(100, state.energy + 5)

        caity.push(
          choice.placeId
            ? { atHour, placeId: choice.placeId, label: choice.label }
            : { atHour, clock: choice.clock, ring: choice.ring, placeLabel: choice.placeLabel, label: choice.label },
        )

        const kennySplits = choice.kind === 'event' || choice.kind === 'wander'
        const splitRoll = kennySplits && kennyRng() < rawWeights.novelty * 0.4
        if (splitRoll) {
          const altCandidates = buildCandidates(atHour, state, kennyRng, choice.event?.id)
          const altChoice = pickBest(altCandidates, state, rawWeights, kennyRng)
          kenny.push(
            altChoice.placeId
              ? { atHour, placeId: altChoice.placeId, label: altChoice.label }
              : { atHour, clock: altChoice.clock, ring: altChoice.ring, placeLabel: altChoice.placeLabel, label: altChoice.label },
          )
        } else {
          kenny.push(caity[caity.length - 1])
        }

        freeAt = atHour + choice.duration
      }
    }

    atHour += TICK_HOURS
  }

  caity.push({ atHour: SIM_END_HOUR, placeId: HOME, label: 'Exodus' })
  kenny.push({ atHour: SIM_END_HOUR, placeId: HOME, label: 'Exodus' })

  return { caity, kenny }
}
