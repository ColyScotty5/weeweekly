import assert from 'node:assert/strict'
import { createClient } from '@supabase/supabase-js'

const url = process.env.SUPABASE_URL
const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY
const confirmedProjectRef = process.env.OPERATOR_CONFIRM_PROJECT_REF
const adminEmail = process.env.SECURITY_TEST_ADMIN_EMAIL
const adminPassword = process.env.SECURITY_TEST_ADMIN_PASSWORD

if (!process.argv.includes('--allow-write-test')) {
  throw new Error('Refusing to run mutation checks without --allow-write-test')
}
if (!url || !publishableKey || !confirmedProjectRef || !adminEmail || !adminPassword) {
  throw new Error('Missing deployed-security test configuration')
}
if (new URL(url).hostname.split('.')[0] !== confirmedProjectRef) {
  throw new Error('The confirmed project reference does not match SUPABASE_URL')
}

const options = { auth: { persistSession: false, autoRefreshToken: false } }
const anonymousClient = createClient(url, publishableKey, options)

const { error: leaderboardError } = await anonymousClient.rpc('get_public_leaderboard', {
  requested_event_type: 'singles',
  within_months: 12
})
assert.equal(leaderboardError, null, 'Anonymous public leaderboard access should succeed')

const { error: privateColumnError } = await anonymousClient.from('players').select('email').limit(1)
assert.ok(privateColumnError, 'Anonymous player email access must fail')

const probeName = `Security policy probe ${new Date().toISOString()}`
const probePayload = {
  name: probeName,
  tournament_date: new Date().toISOString().slice(0, 10),
  status: 'cancelled',
  description: 'Temporary automated RLS verification row'
}
const { data: anonymousInsert, error: anonymousInsertError } = await anonymousClient
  .from('tournaments')
  .insert(probePayload)
  .select('id')

assert.ok(anonymousInsertError, 'Anonymous tournament creation must fail')
assert.equal(anonymousInsert, null, 'Anonymous mutation must not return a row')

const adminClient = createClient(url, publishableKey, options)
const { error: loginError } = await adminClient.auth.signInWithPassword({
  email: adminEmail,
  password: adminPassword
})
assert.equal(loginError, null, 'Security-test administrator login should succeed')

const { data: profile, error: profileError } = await adminClient
  .from('admin_profiles')
  .select('user_id, role')
  .single()
assert.equal(profileError, null, 'Administrator profile should be readable')
assert.ok(['admin', 'super_admin'].includes(profile.role), 'Test identity must be an administrator')

const { data: created, error: createError } = await adminClient
  .from('tournaments')
  .insert(probePayload)
  .select('id')
  .single()
assert.equal(createError, null, 'Administrator tournament creation should succeed')

const { error: updateError } = await adminClient
  .from('tournaments')
  .update({ description: 'Updated temporary RLS verification row' })
  .eq('id', created.id)
assert.equal(updateError, null, 'Administrator tournament update should succeed')

if (profile.role === 'super_admin') {
  const { error: deleteError } = await adminClient.from('tournaments').delete().eq('id', created.id)
  assert.equal(deleteError, null, 'Super Administrator cleanup should succeed')
} else {
  throw new Error('Use a super_admin test identity so the temporary probe can be removed')
}

await adminClient.auth.signOut()
console.log('Deployed anonymous and administrator security checks passed.')
