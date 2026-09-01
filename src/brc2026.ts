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
}

export const PLACES: Place[] = [
  { id: 'chillsville', label: 'Chillsville (home)', clock: parseClock('4:30'), ring: 'esplanade', kind: 'home', hasBar: true },

  { id: 'titanics-end', label: "Titanic's End", clock: parseClock('9:45'), ring: 'E', kind: 'camp' },
  { id: 'home-camp', label: 'Home Camp (David Kong)', clock: parseClock('9:45'), ring: 'J', kind: 'camp' },
  { id: 'kiefers-shade-crew', label: "Kiefer's Shade Crew", clock: parseClock('3:15'), ring: 'H', kind: 'camp' },
  { id: 'discosmos', label: 'Discosmos', clock: parseClock('2:00'), ring: 'J', kind: 'camp' },
  { id: 'elise-zach-camp', label: "Elise & Zach's Camp (placeholder)", clock: parseClock('2:30'), ring: 'D', kind: 'camp' },

  { id: 'playground', label: 'Playground', clock: parseClock('2:00'), ring: 'C', kind: 'venue' },
  { id: 'treble-makers', label: 'Treble Makers', clock: parseClock('2:30'), ring: 'esplanade', kind: 'venue' },
  { id: 'opulent-temple', label: 'Opulent Temple', clock: parseClock('10:00'), ring: 'esplanade', kind: 'venue' },
  { id: 'longfeng', label: 'Longfeng', clock: parseClock('10:00'), ring: 'K', kind: 'venue' },
  { id: 'horizon', label: 'Horizon', clock: parseClock('8:45'), ring: 'esplanade', kind: 'venue' },
  { id: 'nova-heaven', label: 'Nova Heaven', clock: 11, ring: 'deepPlaya', kind: 'venue' },
  { id: 'solar-fields', label: 'Solar Fields', clock: parseClock('2:00'), ring: 'K', kind: 'venue' },
  { id: 'apotheneum', label: 'Apotheneum', clock: 0.5, ring: 'deepPlaya', kind: 'art' },
  { id: 'dills-keyhole', label: "Dill's The Keyhole", clock: 11.5, ring: 'deepPlaya', kind: 'venue' },
  { id: 'eiffela-broken-dreams', label: 'Eiffela Broken Dreams', clock: 0.75, ring: 'deepPlaya', kind: 'art' },

  { id: 'center-camp', label: 'Center Camp', clock: parseClock('6:00'), ring: 'A', kind: 'civic' },
  { id: 'temple', label: 'Temple', clock: 0, ring: 'templeAxis', kind: 'civic' },
  { id: 'the-man', label: 'The Man', clock: 0, ring: 'man', kind: 'civic' },

  {
    id: 'robot-heart',
    label: 'Robot Heart',
    clock: parseClock('2:00'),
    ring: 'K',
    kind: 'roaming',
    roamingAnchors: [
      { day: 2, clock: parseClock('2:00'), ring: 'K' },
      { day: 5, clock: 1, ring: 'deepPlaya' },
    ],
  },
]

export function findPlace(id: string): Place {
  const place = PLACES.find((p) => p.id === id)
  if (!place) throw new Error(`Unknown place id: ${id}`)
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

export const EVENTS: SimEvent[] = [
  { id: 'arrival-setup', venueId: 'chillsville', day: 0, startHour: 12, endHour: 18, tags: ['arrival'], magnitude: 0.3, label: 'Arrival & setup' },
  { id: 'pole-drop', venueId: 'kiefers-shade-crew', day: 0, startHour: 15.25, endHour: 16.5, tags: ['setup'], magnitude: 0.4, label: 'Pole drop' },
  { id: 'bike-pickup', venueId: 'discosmos', day: 0, startHour: 16, endHour: 17, tags: ['setup'], magnitude: 0.3, label: 'Bike pickup' },

  { id: 'friends-loop-mon', venueId: 'titanics-end', day: 1, startHour: 14, endHour: 18, tags: ['connection'], magnitude: 0.5, label: 'Friends loop window' },
  { id: 'opulent-opening', venueId: 'opulent-temple', day: 1, startHour: 21, endHour: 26, tags: ['novelty'], magnitude: 0.6, label: 'Opulent Temple opening' },
  { id: 'longfeng-mon', venueId: 'longfeng', day: 1, startHour: 23, endHour: 28, tags: ['novelty'], magnitude: 0.5, label: 'Longfeng' },
  { id: 'nova-heaven-opening', venueId: 'nova-heaven', day: 1, startHour: 30.5, endHour: 34, tags: ['novelty', 'wonder'], magnitude: 0.6, label: 'Nova Heaven opening sunrise' },

  { id: 'robot-heart-sunrise', venueId: 'robot-heart', day: 2, startHour: 5, endHour: 10, tags: ['novelty', 'wonder'], magnitude: 1, label: 'Robot Heart x Solar Punks sunrise' },
  { id: 'treble-sunset-tue', venueId: 'treble-makers', day: 2, startHour: 18, endHour: 20, tags: ['connection'], magnitude: 0.4, label: 'Treble Makers sunset' },
  { id: 'robot-heart-temple-procession', venueId: 'temple', day: 2, startHour: 19, endHour: 20.5, tags: ['connection', 'meaning'], magnitude: 0.7, label: 'Robot Heart Temple Procession' },
  { id: 'playground-arrival', venueId: 'playground', day: 2, startHour: 21, endHour: 28, tags: ['novelty'], magnitude: 0.6, label: 'Playground: The Arrival' },

  { id: 'apotheneum-collab', venueId: 'apotheneum', day: 3, startHour: 19.5, endHour: 23, tags: ['novelty'], magnitude: 0.6, label: 'Apotheneum x Robot Heart' },
  { id: 'playground-halo-dust', venueId: 'playground', day: 3, startHour: 22, endHour: 28, tags: ['novelty', 'afro-house'], magnitude: 0.7, label: 'Playground: Halo Dust' },
  { id: 'eiffela-maxa', venueId: 'eiffela-broken-dreams', day: 3, startHour: 23, endHour: 30.5, tags: ['novelty', 'surrender'], magnitude: 1, label: 'Robot Heart x MAXA' },

  { id: 'major-lazer-sunset', venueId: 'dills-keyhole', day: 4, startHour: 18, endHour: 20, tags: ['novelty'], magnitude: 0.6, label: 'Major Lazer sunset' },
  { id: 'playground-afrika', venueId: 'playground', day: 4, startHour: 22, endHour: 29, tags: ['connection', 'genre-home'], magnitude: 1, label: 'Playground: Afrika' },
  { id: 'longfeng-dragon', venueId: 'longfeng', day: 4, startHour: 23, endHour: 27, tags: ['novelty'], magnitude: 0.5, label: 'Longfeng: Dragon Awakening' },

  { id: 'danny-t-marathon', venueId: 'robot-heart', day: 5, startHour: 6, endHour: 12, tags: ['surrender'], magnitude: 0.7, label: 'Danny T Marathon' },
  { id: 'nova-heaven-ceremony', venueId: 'nova-heaven', day: 5, startHour: 6, endHour: 7.5, tags: ['meaning'], magnitude: 0.6, label: 'Nova Heaven 6:29 Ceremony' },
  { id: 'titanic-burn', venueId: 'titanics-end', day: 5, startHour: 18.5, endHour: 22, tags: ['connection'], magnitude: 1, label: 'TITANIC BURN', lockedAnchor: true },
  { id: 'playground-we-are-live', venueId: 'playground', day: 5, startHour: 22, endHour: 27, tags: ['novelty'], magnitude: 0.6, label: 'Playground: We Are Live' },
  { id: 'longfeng-fri', venueId: 'longfeng', day: 5, startHour: 23, endHour: 28, tags: ['novelty'], magnitude: 0.5, label: 'Longfeng late' },

  { id: 'man-burn', venueId: 'the-man', day: 6, startHour: 20.5, endHour: 22, tags: ['connection', 'meaning'], magnitude: 1, label: 'MAN BURN', lockedAnchor: true },
  { id: 'playground-man-burns', venueId: 'playground', day: 6, startHour: 22.5, endHour: 30, tags: ['novelty'], magnitude: 0.8, label: 'Playground: Man Burns (Lee Burridge)' },
  { id: 'opulent-still-burning', venueId: 'opulent-temple', day: 6, startHour: 22, endHour: 28, tags: ['novelty'], magnitude: 0.5, label: 'Opulent Temple: Still Burning' },
  { id: 'longfeng-sat', venueId: 'longfeng', day: 6, startHour: 23, endHour: 28, tags: ['novelty'], magnitude: 0.4, label: 'Longfeng late' },

  { id: 'temple-burn', venueId: 'temple', day: 7, startHour: 20, endHour: 21.5, tags: ['meaning', 'surrender'], magnitude: 1, label: 'TEMPLE BURN', lockedAnchor: true },

  { id: 'exodus', venueId: 'chillsville', day: 8, startHour: 5, endHour: 20, tags: ['exodus'], magnitude: 0.2, label: 'Exodus / strike' },

  { id: 'bar-shift-tue', venueId: 'chillsville', day: 2, startHour: 13, endHour: 17, tags: ['obligation'], magnitude: 0.2, label: 'Chillsville bar shift' },
  { id: 'bar-shift-thu', venueId: 'chillsville', day: 4, startHour: 13, endHour: 17, tags: ['obligation'], magnitude: 0.2, label: 'Chillsville bar shift' },
  { id: 'dj-workshop-wed', venueId: 'chillsville', day: 3, startHour: 14, endHour: 17, tags: ['obligation'], magnitude: 0.2, label: 'DJ workshop block' },
]

export const ENV = {
  sunriseHour: 6.5,
  sunsetHour: 19.5,
}

export const SIM_DAYS = 9
