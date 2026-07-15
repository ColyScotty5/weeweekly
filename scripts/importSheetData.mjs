/**
 * One-off import: Google Sheet unpivoted JSON → Supabase
 * Usage: node scripts/importSheetData.mjs [/path/to/weeweekly_import.json]
 *
 * Expects .env with VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY
 * (or VITE_SUPABASE_ANON_KEY). Does not commit sheet data.
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'

function loadEnv(path = '.env') {
  const text = readFileSync(resolve(path), 'utf8')
  for (const line of text.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const i = trimmed.indexOf('=')
    if (i === -1) continue
    const key = trimmed.slice(0, i).trim()
    const value = trimmed.slice(i + 1).trim()
    if (!process.env[key]) process.env[key] = value
  }
}

loadEnv()

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey =
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase URL or key in .env')
  process.exit(1)
}

const jsonPath = resolve(process.argv[2] || '/tmp/weeweekly_import.json')
const payload = JSON.parse(readFileSync(jsonPath, 'utf8'))

const supabase = createClient(supabaseUrl, supabaseKey)

function normName(name) {
  return String(name).trim().toLowerCase()
}

async function ensurePlayers(names) {
  const { data: existing, error } = await supabase.from('players').select('id, name')
  if (error) throw error

  const byName = new Map((existing || []).map((p) => [normName(p.name), p]))
  const created = []

  for (const name of names) {
    const key = normName(name)
    if (byName.has(key)) continue
    const { data, error: insertError } = await supabase
      .from('players')
      .insert({ name })
      .select('id, name')
      .single()
    if (insertError) throw insertError
    byName.set(key, data)
    created.push(data.name)
  }

  return { byName, created }
}

async function ensureTournament(eventDate) {
  const { data: existing, error } = await supabase
    .from('tournaments')
    .select('id, tournament_date, name, status')
    .eq('tournament_date', eventDate)
    .maybeSingle()
  if (error) throw error
  if (existing) return existing

  const { data, error: insertError } = await supabase
    .from('tournaments')
    .insert({
      name: `Wee Weekly – ${eventDate}`,
      tournament_date: eventDate,
      status: 'completed',
      description: 'Imported from Wee Weekly Stats sheet',
    })
    .select('id, tournament_date, name, status')
    .single()
  if (insertError) throw insertError
  return data
}

async function ensureEvent(tournamentId, eventType) {
  const { data: existing, error } = await supabase
    .from('events')
    .select('id, tournament_id, event_type, status')
    .eq('tournament_id', tournamentId)
    .eq('event_type', eventType)
    .maybeSingle()
  if (error) throw error
  if (existing) {
    if (existing.status !== 'completed') {
      await supabase.from('events').update({ status: 'completed' }).eq('id', existing.id)
    }
    return existing
  }

  const { data, error: insertError } = await supabase
    .from('events')
    .insert({
      tournament_id: tournamentId,
      event_type: eventType,
      status: 'completed',
    })
    .select('id, tournament_id, event_type, status')
    .single()
  if (insertError) throw insertError
  return data
}

async function upsertParticipant(eventId, playerId, pointsEarned) {
  const { data: existing, error } = await supabase
    .from('event_participants')
    .select('id, points_earned')
    .eq('event_id', eventId)
    .eq('player_id', playerId)
    .maybeSingle()
  if (error) throw error

  if (existing) {
    if (existing.points_earned !== pointsEarned) {
      const { error: updateError } = await supabase
        .from('event_participants')
        .update({ points_earned: pointsEarned, status: 'eliminated' })
        .eq('id', existing.id)
      if (updateError) throw updateError
      return 'updated'
    }
    return 'unchanged'
  }

  const { error: insertError } = await supabase.from('event_participants').insert({
    event_id: eventId,
    player_id: playerId,
    points_earned: pointsEarned,
    status: 'eliminated',
  })
  if (insertError) throw insertError
  return 'created'
}

async function main() {
  console.log('Importing from', jsonPath)
  console.log('Stats:', payload.stats)

  // Probe schema
  const probe = await supabase.from('event_participants').select('points_earned').limit(1)
  if (probe.error) {
    console.error('Schema probe failed (is points_earned present?):', probe.error.message)
    process.exit(1)
  }

  const { byName, created } = await ensurePlayers(payload.players)
  console.log(`Players: ${byName.size} total, ${created.length} newly created`)

  const tournamentCache = new Map()
  const eventCache = new Map()
  const counts = { created: 0, updated: 0, unchanged: 0 }

  for (const row of payload.results) {
    const player = byName.get(normName(row.player_name))
    if (!player) throw new Error(`Missing player ${row.player_name}`)

    if (!tournamentCache.has(row.event_date)) {
      tournamentCache.set(row.event_date, await ensureTournament(row.event_date))
    }
    const tournament = tournamentCache.get(row.event_date)

    const eventKey = `${tournament.id}:${row.event_type}`
    if (!eventCache.has(eventKey)) {
      eventCache.set(eventKey, await ensureEvent(tournament.id, row.event_type))
    }
    const event = eventCache.get(eventKey)

    const result = await upsertParticipant(event.id, player.id, row.points_earned)
    counts[result]++
  }

  console.log('Tournaments:', tournamentCache.size)
  console.log('Events:', eventCache.size)
  console.log('Participant rows:', counts)

  const { count: playerCount } = await supabase
    .from('players')
    .select('*', { count: 'exact', head: true })
  const { count: participantCount } = await supabase
    .from('event_participants')
    .select('*', { count: 'exact', head: true })
  const { count: tournamentCount } = await supabase
    .from('tournaments')
    .select('*', { count: 'exact', head: true })

  console.log('DB totals:', { playerCount, tournamentCount, participantCount })
  console.log('Done.')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
