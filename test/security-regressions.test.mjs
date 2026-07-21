import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { compareLeaderboardEntries } from '../src/lib/tournamentUtils.js'

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
