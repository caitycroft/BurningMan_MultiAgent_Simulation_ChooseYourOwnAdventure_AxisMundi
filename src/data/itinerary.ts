export interface Waypoint {
  atHour: number
  placeId: string
  label: string
}

const d = (day: number, hour: number) => day * 24 + hour

export const SCRIPTED_PATH: Waypoint[] = [
  { atHour: d(0, 12), placeId: 'chillsville', label: 'Arrival & setup' },
  { atHour: d(0, 15.25), placeId: 'kiefers-shade-crew', label: 'Pole drop' },
  { atHour: d(0, 16), placeId: 'discosmos', label: 'Bike pickup' },
  { atHour: d(0, 20), placeId: 'chillsville', label: 'Home for the night' },

  { atHour: d(1, 8), placeId: 'chillsville', label: 'Morning at camp' },
  { atHour: d(1, 14), placeId: 'titanics-end', label: 'Friends loop' },
  { atHour: d(1, 18), placeId: 'chillsville', label: 'Dinner' },
  { atHour: d(1, 21), placeId: 'opulent-temple', label: 'Opulent Temple opening' },
  { atHour: d(1, 23.5), placeId: 'longfeng', label: 'Longfeng' },
  { atHour: d(1, 30.5), placeId: 'nova-heaven', label: 'Nova Heaven sunrise' },
  { atHour: d(2, 9), placeId: 'chillsville', label: 'Sleep it off' },

  { atHour: d(2, 13), placeId: 'chillsville', label: 'Bar shift' },
  { atHour: d(2, 18), placeId: 'treble-makers', label: 'Treble Makers sunset' },
  { atHour: d(2, 19), placeId: 'temple', label: 'Robot Heart Temple Procession' },
  { atHour: d(2, 21), placeId: 'playground', label: 'Playground: The Arrival' },
  { atHour: d(3, 3), placeId: 'chillsville', label: 'Home for the night' },

  { atHour: d(3, 9), placeId: 'chillsville', label: 'Morning at camp' },
  { atHour: d(3, 14), placeId: 'chillsville', label: 'DJ workshop' },
  { atHour: d(3, 19.5), placeId: 'apotheneum', label: 'Apotheneum x Robot Heart' },
  { atHour: d(3, 22), placeId: 'eiffela-broken-dreams', label: 'Robot Heart x MAXA' },
  { atHour: d(4, 4), placeId: 'chillsville', label: 'Home for the night' },

  { atHour: d(4, 10), placeId: 'chillsville', label: 'Art day, low key' },
  { atHour: d(4, 12), placeId: 'center-camp', label: 'Center Camp break' },
  { atHour: d(4, 18), placeId: 'dills-keyhole', label: 'Major Lazer sunset' },
  { atHour: d(4, 22), placeId: 'playground', label: 'Playground: Afrika' },
  { atHour: d(5, 3), placeId: 'chillsville', label: 'Home for the night' },

  { atHour: d(5, 6), placeId: 'nova-heaven', label: '6:29 Ceremony' },
  { atHour: d(5, 9), placeId: 'chillsville', label: 'Rest before the big night' },
  { atHour: d(5, 16), placeId: 'titanics-end', label: 'Arrive early for Titanic Burn' },
  { atHour: d(5, 18.5), placeId: 'titanics-end', label: 'TITANIC BURN' },
  { atHour: d(5, 22), placeId: 'playground', label: 'Playground: We Are Live' },
  { atHour: d(6, 3), placeId: 'chillsville', label: 'Home for the night' },

  { atHour: d(6, 9), placeId: 'chillsville', label: 'Rest day' },
  { atHour: d(6, 14), placeId: 'center-camp', label: 'Quiet afternoon' },
  { atHour: d(6, 19), placeId: 'the-man', label: 'Gathering for the Man' },
  { atHour: d(6, 20.5), placeId: 'the-man', label: 'MAN BURN' },
  { atHour: d(6, 22.5), placeId: 'playground', label: 'Playground: Man Burns (Lee Burridge)' },
  { atHour: d(7, 6), placeId: 'chillsville', label: 'Home for the night' },

  { atHour: d(7, 10), placeId: 'chillsville', label: 'Strike begins' },
  { atHour: d(7, 14), placeId: 'chillsville', label: 'Strike continues' },
  { atHour: d(7, 19), placeId: 'temple', label: 'Gathering for the Temple' },
  { atHour: d(7, 20), placeId: 'temple', label: 'TEMPLE BURN' },
  { atHour: d(7, 22), placeId: 'chillsville', label: 'Early sleep' },

  { atHour: d(8, 5), placeId: 'chillsville', label: 'Pack the RV' },
  { atHour: d(8, 9), placeId: 'chillsville', label: 'Exodus' },
]

export const TOTAL_SIM_HOURS = SCRIPTED_PATH[SCRIPTED_PATH.length - 1].atHour

export function sampleWaypointsAt(waypoints: Waypoint[], atHour: number) {
  const clamped = Math.max(waypoints[0].atHour, Math.min(atHour, waypoints[waypoints.length - 1].atHour))
  let i = 0
  while (i < waypoints.length - 1 && waypoints[i + 1].atHour < clamped) i++
  const a = waypoints[i]
  const b = waypoints[Math.min(i + 1, waypoints.length - 1)]
  const span = b.atHour - a.atHour
  const t = span > 0 ? (clamped - a.atHour) / span : 0
  return { a, b, t }
}
