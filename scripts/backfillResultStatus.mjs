/**
 * Backfill event_participants.status from points_earned using POINTS_SYSTEM.
 * Usage: node scripts/backfillResultStatus.mjs --apply
 *
 * Requires the versioned Supabase migrations, SUPABASE_URL,
 * SUPABASE_SERVICE_ROLE_KEY, and OPERATOR_CONFIRM_PROJECT_REF.
 */
import { createClient } from '@supabase/supabase-js'
import { resultStatusFromPoints } from '../src/lib/tournamentUtils.js'

const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const confirmedProjectRef = process.env.OPERATOR_CONFIRM_PROJECT_REF

if (!process.argv.includes('--apply')) {
  console.error('Refusing to write without the explicit --apply flag.')
  process.exit(1)
}

if (!supabaseUrl || !supabaseKey || !confirmedProjectRef) {
  console.error('Missing required operator environment configuration.')
  process.exit(1)
}

const actualProjectRef = new URL(supabaseUrl).hostname.split('.')[0]
if (actualProjectRef !== confirmedProjectRef) {
  console.error('The confirmed project reference does not match SUPABASE_URL.')
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
