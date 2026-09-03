import realCampsRaw from './data/generated/camps.json'
import realArtRaw from './data/generated/art.json'
import realEventsRaw from './data/generated/events.json'

export type RingId =
  | 'man'
  | 'esplanade'
  | 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'H' | 'I' | 'J' | 'K' | 'L'
  | 'templeAxis'
  | 'deepPlaya'
  | 'trashFence'

export const RING_RADIUS: Record<RingId, number> = {
  man: 0,
  esplanade: 120,
  A: 160,
  B: 195,
  C: 230,
  D: 265,
  E: 300,
  F: 335,
  G: 370,
  H: 405,
  I: 440,
  J: 475,
  K: 510,
  L: 545,
  templeAxis: 260,
  deepPlaya: 640,
  trashFence: 760,
}

export const CITY_ARC_START_CLOCK = 2
export const CITY_ARC_END_CLOCK = 10

export function parseClock(input: string): number {
  const [h, m] = input.split(':').map(Number)
  return h + (m ?? 0) / 60
}

export function brcToXY(
  clock: number,
  ring: RingId | number,
  center: { x: number; y: number },
  scale = 1,
): { x: number; y: number } {
  const radius = (typeof ring === 'number' ? ring : RING_RADIUS[ring]) * scale
  const angle = (clock / 12) * Math.PI * 2
  return {
    x: center.x + Math.sin(angle) * radius,
    y: center.y - Math.cos(angle) * radius,
  }
}

export type PlaceKind = 'home' | 'camp' | 'venue' | 'civic' | 'art' | 'roaming'

export interface DayAnchor {
  day: number
  clock: number
  ring: RingId | number
}

export interface Place {
  id: string
  label: string
  clock: number
  ring: RingId | number
  kind: PlaceKind
  hasBar?: boolean
  roamingAnchors?: DayAnchor[]
  /** Friendly slugs this real place is also known by in our curated itinerary/events. */
  aliases?: string[]
  /** Always labeled on the map, regardless of whether it's currently hosting a live event. */
  notable?: boolean
  hometown?: string
  url?: string
}

// ---- Real Black Rock City 2026 dataset, synced from dust.events (see scripts/sync-dust-data.mjs) ----

interface RealCampRow { id: string; name: string; clock: number; ring: string; hometown?: string; url?: string }
interface RealArtRow { id: string; name: string; clock: number; radius: number; artist?: string }
interface RealEventRow {
  id: string
  title: string
  campId: string
  day: number
  startHour: number
  endHour: number
  tag: string
  magnitude: number
}

const REAL_CAMPS: Place[] = (realCampsRaw as RealCampRow[]).map((c) => ({
  id: c.id,
  label: c.name,
  clock: c.clock,
  ring: c.ring as RingId,
  kind: 'camp',
  hometown: c.hometown,
  url: c.url,
}))

const REAL_ART: Place[] = (realArtRaw as RealArtRow[]).map((a) => ({
  id: a.id,
  label: a.name,
  clock: a.clock,
  ring: a.radius,
  kind: 'art',
}))

// Friendly slugs used throughout our curated itinerary/events, aliased onto their real
// 2026 placement so the map shows Caity's real people/venues at their actual real spots
// instead of a guess. Falls back to a curated placeholder below when no real match exists
// (personal/informal camps that aren't in the public registry, or a name that didn't match).
const NOTABLE_ALIASES: Array<{ slug: string; matchName: string; kindOverride?: PlaceKind; art?: boolean }> = [
  { slug: 'titanics-end', matchName: 'Titanic' },
  { slug: 'discosmos', matchName: 'Discosmos' },
  { slug: 'playground', matchName: 'Playground', kindOverride: 'venue' },
  { slug: 'opulent-temple', matchName: 'Opulent Temple', kindOverride: 'venue' },
  { slug: 'nova-heaven', matchName: 'Nova Heaven', kindOverride: 'venue' },
  { slug: 'apotheneum', matchName: 'Apotheneum', kindOverride: 'venue' },
  { slug: 'horizon', matchName: 'Horizon', kindOverride: 'venue' },
  { slug: 'treble-makers', matchName: 'Treble Makers', kindOverride: 'venue' },
  { slug: 'longfeng', matchName: 'Long Feng Camp', kindOverride: 'venue' },
  { slug: 'center-camp', matchName: 'Center Camp', kindOverride: 'civic' },
  { slug: 'eiffela-broken-dreams', matchName: 'Eiffela Broken Dream', kindOverride: 'art', art: true },
]

for (const alias of NOTABLE_ALIASES) {
  const pool = alias.art ? REAL_ART : REAL_CAMPS
  const match = pool.find((p) => p.label === alias.matchName)
  if (match) {
    match.aliases = [...(match.aliases ?? []), alias.slug]
    match.notable = true
    if (alias.kindOverride) match.kind = alias.kindOverride
  } else {
    console.warn(`No real 2026 placement found for "${alias.matchName}" (slug: ${alias.slug}) -- check the sync`)
  }
}

// Personal/informal places with no public registry entry: home camp, friends' informal
// camps, roaming Robot Heart, and the two civic structures that aren't "theme camps."
const CURATED_PLACES: Place[] = [
  { id: 'chillsville', label: 'Chillsville (home)', clock: parseClock('4:30'), ring: 'esplanade', kind: 'home', hasBar: true, notable: true },
  { id: 'home-camp', label: 'Home Camp (David Kong)', clock: parseClock('9:45'), ring: 'J', kind: 'camp', notable: true },
  { id: 'kiefers-shade-crew', label: "Kiefer's Shade Crew", clock: parseClock('3:15'), ring: 'H', kind: 'camp', notable: true },
  { id: 'elise-zach-camp', label: "Elise & Zach's Camp (placeholder)", clock: parseClock('2:30'), ring: 'D', kind: 'camp', notable: true },
  { id: 'dills-keyhole', label: "Dill's The Keyhole", clock: 11.5, ring: 'deepPlaya', kind: 'venue', notable: true },
  { id: 'temple', label: 'Temple', clock: 0, ring: 'templeAxis', kind: 'civic', notable: true },
  { id: 'the-man', label: 'The Man', clock: 0, ring: 'man', kind: 'civic', notable: true },
  {
    id: 'robot-heart',
    label: 'Robot Heart',
    clock: parseClock('2:00'),
    ring: 'K',
    kind: 'roaming',
    notable: true,
    roamingAnchors: [
      { day: 2, clock: parseClock('2:00'), ring: 'K' },
      { day: 5, clock: 1, ring: 'deepPlaya' },
    ],
  },
]

export const PLACES: Place[] = [...REAL_CAMPS, ...REAL_ART, ...CURATED_PLACES]

const PLACES_BY_ID = new Map(PLACES.map((p) => [p.id, p]))
const PLACES_BY_ALIAS = new Map(PLACES.flatMap((p) => (p.aliases ?? []).map((a) => [a, p] as const)))

export function findPlace(idOrSlug: string): Place {
  const place = PLACES_BY_ID.get(idOrSlug) ?? PLACES_BY_ALIAS.get(idOrSlug)
  if (!place) throw new Error(`Unknown place id: ${idOrSlug}`)
  return place
}

export interface SimEvent {
  id: string
  venueId: string
  day: number
  startHour: number
  endHour: number
  tags: string[]
  magnitude: number
  label: string
  lockedAnchor?: boolean
}

export const DAY_LABELS = [
  'Sun 8/30', 'Mon 8/31', 'Tue 9/1', 'Wed 9/2', 'Thu 9/3', 'Fri 9/4', 'Sat 9/5', 'Sun 9/6', 'Mon 9/7',
]

// Personal narrative + logistics: food/sleep/setup/strike and the three locked civic
// anchors. None of this is in the public dataset -- it's Caity and Kenny's actual plan.
const CURATED_EVENTS_RAW: SimEvent[] = [
  { id: 'arrival-setup', venueId: 'chillsville', day: 0, startHour: 12, endHour: 18, tags: ['arrival'], magnitude: 0.3, label: 'Arrival & setup' },
  { id: 'pole-drop', venueId: 'kiefers-shade-crew', day: 0, startHour: 15.25, endHour: 16.5, tags: ['setup'], magnitude: 0.4, label: 'Pole drop' },
  { id: 'bike-pickup', venueId: 'discosmos', day: 0, startHour: 16, endHour: 17, tags: ['setup'], magnitude: 0.3, label: 'Bike pickup' },

  { id: 'friends-loop-mon', venueId: 'titanics-end', day: 1, startHour: 14, endHour: 18, tags: ['connection'], magnitude: 0.5, label: 'Friends loop window' },

  { id: 'robot-heart-sunrise', venueId: 'robot-heart', day: 2, startHour: 5, endHour: 10, tags: ['novelty', 'wonder'], magnitude: 1, label: 'Robot Heart x Solar Punks sunrise' },
  { id: 'robot-heart-temple-procession', venueId: 'temple', day: 2, startHour: 19, endHour: 20.5, tags: ['connection', 'meaning'], magnitude: 0.7, label: 'Robot Heart Temple Procession' },

  { id: 'danny-t-marathon', venueId: 'robot-heart', day: 5, startHour: 6, endHour: 12, tags: ['surrender'], magnitude: 0.7, label: 'Danny T Marathon' },
  { id: 'nova-heaven-ceremony', venueId: 'nova-heaven', day: 5, startHour: 6, endHour: 7.5, tags: ['meaning'], magnitude: 0.6, label: 'Nova Heaven 6:29 Ceremony' },
  { id: 'titanic-burn', venueId: 'titanics-end', day: 5, startHour: 18.5, endHour: 22, tags: ['connection'], magnitude: 1, label: 'TITANIC BURN', lockedAnchor: true },

  { id: 'man-burn', venueId: 'the-man', day: 6, startHour: 20.5, endHour: 22, tags: ['connection', 'meaning'], magnitude: 1, label: 'MAN BURN', lockedAnchor: true },

  { id: 'temple-burn', venueId: 'temple', day: 7, startHour: 20, endHour: 21.5, tags: ['meaning', 'surrender'], magnitude: 1, label: 'TEMPLE BURN', lockedAnchor: true },

  { id: 'exodus', venueId: 'chillsville', day: 8, startHour: 5, endHour: 20, tags: ['exodus'], magnitude: 0.2, label: 'Exodus / strike' },

  { id: 'bar-shift-tue', venueId: 'chillsville', day: 2, startHour: 13, endHour: 17, tags: ['obligation'], magnitude: 0.2, label: 'Chillsville bar shift' },
  { id: 'bar-shift-thu', venueId: 'chillsville', day: 4, startHour: 13, endHour: 17, tags: ['obligation'], magnitude: 0.2, label: 'Chillsville bar shift' },
  { id: 'dj-workshop-wed', venueId: 'chillsville', day: 3, startHour: 14, endHour: 17, tags: ['obligation'], magnitude: 0.2, label: 'DJ workshop block' },
]

// Resolve curated venueIds (which may be aliases like 'titanics-end') to the canonical
// Place.id so lookups by place.id always find every event, curated or real, in one pass.
const CURATED_EVENTS: SimEvent[] = CURATED_EVENTS_RAW.map((e) => ({ ...e, venueId: findPlace(e.venueId).id }))

const REAL_EVENTS: SimEvent[] = (realEventsRaw as RealEventRow[]).map((e) => ({
  id: e.id,
  venueId: e.campId,
  day: e.day,
  startHour: e.startHour,
  endHour: e.endHour,
  tags: [e.tag],
  magnitude: e.magnitude,
  label: e.title,
}))

export const EVENTS: SimEvent[] = [...CURATED_EVENTS, ...REAL_EVENTS]

const EVENTS_BY_VENUE = new Map<string, SimEvent[]>()
for (const e of EVENTS) {
  const list = EVENTS_BY_VENUE.get(e.venueId)
  if (list) list.push(e)
  else EVENTS_BY_VENUE.set(e.venueId, [e])
}

export const ENV = {
  sunriseHour: 6.5,
  sunsetHour: 19.5,
}

export const SIM_DAYS = 9

export function eventStartAbs(e: SimEvent): number {
  return e.day * 24 + e.startHour
}

export function eventEndAbs(e: SimEvent): number {
  return e.day * 24 + e.endHour
}

export function isEventLive(e: SimEvent, atHour: number): boolean {
  return atHour >= eventStartAbs(e) && atHour < eventEndAbs(e)
}

export function liveEventsAtVenue(venueId: string, atHour: number): SimEvent[] {
  const list = EVENTS_BY_VENUE.get(venueId)
  if (!list) return []
  return list.filter((e) => isEventLive(e, atHour))
}

export function nextEventAtVenue(venueId: string, atHour: number): SimEvent | null {
  const list = EVENTS_BY_VENUE.get(venueId)
  if (!list) return null
  let best: SimEvent | null = null
  for (const e of list) {
    if (eventStartAbs(e) < atHour) continue
    if (!best || eventStartAbs(e) < eventStartAbs(best)) best = e
  }
  return best
}
