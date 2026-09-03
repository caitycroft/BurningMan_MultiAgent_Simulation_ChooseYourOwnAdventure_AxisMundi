#!/usr/bin/env node
// Fetches the real Black Rock City 2026 dataset from the Dust app's public API
// (github.com/damiant/dust) and transforms it into slim, offline-embeddable
// snapshots. Run manually with `npm run sync:dust` when the published
// placement/event data changes -- the app never fetches this live, so it
// works fully offline at the event.

const DATASET = 'ttitd-2026'
const BASE = `https://api.dust.events/static/${DATASET}`
const DAY0_UTC = Date.UTC(2026, 7, 30) // Sun Aug 30, 2026 -- matches DAY_LABELS[0] in src/brc2026.ts

const RING_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L']
const MAX_ART_FEET = 8500
const FEET_TO_UNITS = 760 / MAX_ART_FEET // trashFence radius unit / observed max feet

async function fetchJson(name) {
  const res = await fetch(`${BASE}/${name}.json`)
  if (!res.ok) throw new Error(`Failed to fetch ${name}: HTTP ${res.status}`)
  return res.json()
}

function parseCampLocation(locationString, name) {
  const s = (locationString || '').trim()
  if (!s) return null
  if (/center camp/i.test(s) && !/plaza/i.test(s)) return { clock: 6, ring: 'A' }

  const clockMatch = s.match(/\d{1,2}:\d{2}/)
  const ringMatch = s.match(/\bEsplanade\b/i) || s.match(/\b([A-L])\b/)
  if (!clockMatch || !ringMatch) return null

  const clock = parseClockStr(clockMatch[0])
  const ring = /esplanade/i.test(ringMatch[0]) ? 'esplanade' : ringMatch[1]
  if (!RING_LETTERS.includes(ring) && ring !== 'esplanade') return null
  return { clock, ring }
}

function parseArtLocation(locationString) {
  const s = (locationString || '').trim()
  if (!s) return null
  const clockMatch = s.match(/^(\d{1,2}:\d{2})/)
  const feetMatch = s.match(/(\d+)'/)
  if (!clockMatch) return null
  const clock = parseClockStr(clockMatch[1])
  const feet = feetMatch ? Number(feetMatch[1]) : 2000
  const radius = Math.min(feet, MAX_ART_FEET) * FEET_TO_UNITS + 120
  return { clock, radius }
}

function parseClockStr(str) {
  const [h, m] = str.split(':').map(Number)
  return h + (m || 0) / 60
}

function absHourOfIso(iso) {
  const [datePart, timePart] = iso.split('T')
  const [y, mo, d] = datePart.split('-').map(Number)
  const [hh, mm] = timePart.split(':').map(Number)
  const dayIndex = Math.round((Date.UTC(y, mo - 1, d) - DAY0_UTC) / 86400000)
  return dayIndex * 24 + hh + mm / 60
}

function magnitudeForType(label) {
  switch (label) {
    case 'Music/Party':
      return 0.6
    case 'Mature Audiences':
      return 0.5
    case 'Arts & Crafts':
    case 'Kids Activities':
      return 0.3
    case 'Food':
    case 'Beverages':
      return 0.35
    default:
      return 0.25
  }
}

async function main() {
  console.log(`Fetching ${DATASET} camps, events, art from ${BASE} ...`)
  const [rawCamps, rawEvents, rawArt] = await Promise.all([
    fetchJson('camps'),
    fetchJson('events'),
    fetchJson('art'),
  ])
  console.log(`Fetched ${rawCamps.length} camps, ${rawEvents.length} events, ${rawArt.length} art pieces`)

  const camps = []
  let campsUnplaced = 0
  for (const c of rawCamps) {
    const loc = parseCampLocation(c.location_string, c.name)
    if (!loc) {
      campsUnplaced++
      continue
    }
    camps.push({
      id: c.uid,
      name: c.name,
      clock: loc.clock,
      ring: loc.ring,
      hometown: c.hometown || undefined,
      url: c.url || undefined,
    })
  }

  const art = []
  let artUnplaced = 0
  for (const a of rawArt) {
    const loc = parseArtLocation(a.location_string)
    if (!loc) {
      artUnplaced++
      continue
    }
    art.push({
      id: a.uid,
      name: a.name,
      clock: loc.clock,
      radius: Math.round(loc.radius),
      artist: a.artist || undefined,
    })
  }

  const campIds = new Set(camps.map((c) => c.id))
  const events = []
  let eventsSkipped = 0
  for (const e of rawEvents) {
    const campId = e.hosted_by_camp
    const occ = e.occurrence_set && e.occurrence_set[0]
    if (!campId || !campIds.has(campId) || !occ) {
      eventsSkipped++
      continue
    }
    const startAbs = absHourOfIso(occ.start_time)
    const endAbs = absHourOfIso(occ.end_time)
    if (endAbs <= startAbs) {
      eventsSkipped++
      continue
    }
    const day = Math.floor(startAbs / 24)
    events.push({
      id: e.uid,
      title: e.title,
      campId,
      day,
      startHour: startAbs - day * 24,
      endHour: endAbs - day * 24,
      tag: e.event_type?.label || 'Other',
      magnitude: magnitudeForType(e.event_type?.label),
    })
  }

  console.log(`Placed ${camps.length} camps (${campsUnplaced} unplaced), ${art.length} art (${artUnplaced} unplaced)`)
  console.log(`Kept ${events.length} events (${eventsSkipped} skipped: no placed host camp or bad times)`)

  const fs = await import('node:fs/promises')
  const outDir = new URL('../src/data/generated/', import.meta.url)
  await fs.mkdir(outDir, { recursive: true })
  await fs.writeFile(new URL('camps.json', outDir), JSON.stringify(camps))
  await fs.writeFile(new URL('events.json', outDir), JSON.stringify(events))
  await fs.writeFile(new URL('art.json', outDir), JSON.stringify(art))
  console.log(`Wrote src/data/generated/{camps,events,art}.json`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
