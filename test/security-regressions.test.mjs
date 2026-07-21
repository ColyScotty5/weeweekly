import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { compareLeaderboardEntries } from '../src/lib/tournamentUtils.js'
import { WEE_WEEKLY_SCHEDULE_2026 } from '../src/data/weeWeeklySchedule.js'

test('repository static security checks pass', () => {
  const output = execFileSync(process.execPath, ['scripts/security-check.mjs'], {
    cwd: new URL('..', import.meta.url),
    encoding: 'utf8'
  })

  assert.match(output, /Security checks passed/)
})

test('browser authentication does not contain a local password database', () => {
  const authContext = readFileSync(
    new URL('../src/contexts/AuthContext.jsx', import.meta.url),
    'utf8'
  )

  assert.doesNotMatch(authContext, /INITIAL_USERS|weeweekly_users|localStorage/)
  assert.match(authContext, /signInWithPassword/)
  assert.match(authContext, /admin_profiles/)
})

test('leaderboard ordering does not require private player fields', () => {
  const entries = [
    { id: 2, name: 'Second', rank: 2, rankPoints: 10, totalPoints: 20 },
    { id: 1, name: 'First', rank: 1, rankPoints: 11, totalPoints: 22 }
  ]

  assert.deepEqual(entries.sort(compareLeaderboardEntries).map((entry) => entry.id), [1, 2])
  assert.ok(entries.every((entry) => !('email' in entry)))
})

test('2026 schedule data is ordered, unique, and complete', () => {
  const allowedStatuses = new Set(['completed', 'upcoming', 'rained_out', 'no_event'])
  const dates = WEE_WEEKLY_SCHEDULE_2026.map((event) => event.date)

  assert.ok(dates.length > 0)
  assert.equal(new Set(dates).size, dates.length)
  assert.deepEqual(dates, [...dates].sort())

  for (const event of WEE_WEEKLY_SCHEDULE_2026) {
    assert.match(event.date, /^2026-\d{2}-\d{2}$/)
    assert.ok(!Number.isNaN(Date.parse(`${event.date}T00:00:00`)))
    assert.ok(event.type)
    assert.ok(allowedStatuses.has(event.status))

    if (event.status === 'completed') {
      assert.ok(event.participants > 0)
      assert.ok(event.winner)
    }
    if (event.status === 'no_event') assert.ok(event.note)
    if (event.drawUrl) assert.match(event.drawUrl, /^https:\/\//)
  }
})

test('anonymous users can access the public leaderboard RPC', () => {
  const migration = readFileSync(
    new URL('../supabase/migrations/20260721130000_secure_auth_and_rls.sql', import.meta.url),
    'utf8'
  )
  const supabaseClient = readFileSync(
    new URL('../src/lib/supabase.js', import.meta.url),
    'utf8'
  )

  assert.match(
    migration,
    /grant execute on function public\.get_public_leaderboard\(text, integer\) to anon, authenticated;/
  )
  assert.match(supabaseClient, /supabase\.rpc\('get_public_leaderboard'/)
})

test('administrator login opens in a dialog and closes after success', () => {
  const app = readFileSync(new URL('../src/app.jsx', import.meta.url), 'utf8')
  const loginForm = readFileSync(
    new URL('../src/components/Login.jsx', import.meta.url),
    'utf8'
  )

  assert.match(app, /const \[showLogin, setShowLogin\] = useState\(false\)/)
  assert.match(app, /open=\{showLogin\}/)
  assert.match(app, /onSuccess=\{\(\) => setShowLogin\(false\)\}/)
  assert.match(loginForm, /await login\(formData\.email, formData\.password\)/)
  assert.match(loginForm, /onSuccess\?\.\(\)/)
})
