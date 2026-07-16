/**
 * Backfill event_participants.status from points_earned using POINTS_SYSTEM.
 * Usage: node scripts/backfillResultStatus.mjs
 *
 * Requires schema_migration_result_status.sql to have been run first.
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'
import { resultStatusFromPoints } from '../src/lib/tournamentUtils.js'

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

const supabase = createClient(supabaseUrl, supabaseKey)

async function main() {
  const { data: rows, error } = await supabase
    .from('event_participants')
    .select('id, points_earned, status, events!inner(event_type, status)')

  if (error) throw error

  const counts = { updated: 0, unchanged: 0, skipped: 0 }
  const byStatus = {}

  for (const row of rows || []) {
    const eventType = row.events?.event_type
    if (!eventType) {
      counts.skipped++
      continue
    }

    const nextStatus = resultStatusFromPoints(eventType, row.points_earned)
    byStatus[nextStatus] = (byStatus[nextStatus] || 0) + 1

    if (row.status === nextStatus) {
      counts.unchanged++
      continue
    }

    const { error: updateError } = await supabase
      .from('event_participants')
      .update({ status: nextStatus })
      .eq('id', row.id)

    if (updateError) throw updateError
    counts.updated++
  }

  console.log('Backfill complete:', counts)
  console.log('Status distribution:', byStatus)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
