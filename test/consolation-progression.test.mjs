/**
 * Drives syncConsolationMatches against an in-memory stand-in for the matches
 * table, so the full main-draw to consolation-final progression is exercised
 * without a database.
 */
import assert from 'node:assert/strict'
import test from 'node:test'
import {
  POINTS_SYSTEM,
  calculateParticipantResult,
  generateMatches,
  generateSinglesDraw,
  syncConsolationMatches,
  syncNextRoundMatches
} from '../src/lib/tournamentUtils.js'

function createFakeDatabase(eventType = 'singles') {
  const rows = []
  let nextId = 1

  return {
    rows,
    matchesApi: {
      async getByEvent() {
        return rows
          .map((row) => ({ ...row }))
          .sort((a, b) => (a.match_number ?? 0) - (b.match_number ?? 0))
      },
      async create(match) {
        const row = { id: nextId++, score: null, winner_id: null, ...match }
        rows.push(row)
        return { ...row }
      },
      async update(id, updates) {
        const row = rows.find((candidate) => candidate.id === id)
        Object.assign(row, updates)
        return { ...row }
      }
    },
    eventsApi: {
      async getById() {
        return { id: 'event', event_type: eventType, status: 'in_progress' }
      }
    }
  }
}

/** Every unfinished match in `roundName` is won by whichever side sits first. */
function completeRound(database, roundName) {
  for (const row of database.rows) {
    if (row.round_name !== roundName) continue
    if (row.status === 'completed' || row.status === 'walkover') continue
    if (!row.player1_id || !row.player2_id) continue
    row.status = 'completed'
    row.score = '6-4'
    row.winner_id = row.player1_id
    row.completed_at = new Date().toISOString()
  }
}

function roundSizes(database, bracketType) {
  const sizes = new Map()
  for (const row of database.rows) {
    if (row.bracket_type !== bracketType) continue
    sizes.set(row.round_name, (sizes.get(row.round_name) || 0) + 1)
  }
  return sizes
}

async function playOutEvent(playerCount) {
  const database = createFakeDatabase()
  const dataAccess = { matchesApi: database.matchesApi, eventsApi: database.eventsApi }

  const participants = Array.from({ length: playerCount }, (_, index) => ({
    id: index + 1,
    player_id: index + 1,
    player: { id: index + 1, name: `Player ${index + 1}` }
  }))

  const draw = generateSinglesDraw(participants)
  for (const match of generateMatches('event', draw, 'singles')) {
    await database.matchesApi.create(match)
  }

  for (const round of ['Round of 32', 'Round of 16', 'Quarter-Final', 'Semi-Final', 'Final']) {
    completeRound(database, round)
    await syncNextRoundMatches('event', round, dataAccess)
    await syncConsolationMatches('event', dataAccess)
  }

  // The consolation bracket only fills in as main results land, so keep playing
  // it out until nothing further can be scheduled.
  for (let pass = 0; pass < 8; pass++) {
    let played = false
    for (const row of database.rows) {
      if (row.bracket_type !== 'consolation') continue
      if (row.status === 'completed' || row.status === 'walkover') continue
      if (!row.player1_id || !row.player2_id) continue
      row.status = 'completed'
      row.score = '6-4'
      row.winner_id = row.player1_id
      played = true
    }
    await syncConsolationMatches('event', dataAccess)
    if (!played) break
  }

  return database
}

test('an 8-player draw ends its consolation on a single final', async () => {
  const database = await playOutEvent(8)
  const sizes = roundSizes(database, 'consolation')

  assert.deepEqual([...sizes.keys()], ['Consolation Round 1', 'Consolation Final'])
  assert.equal(sizes.get('Consolation Round 1'), 2)
  assert.equal(sizes.get('Consolation Final'), 1)
})

test('a 24-player draw ends its consolation on a single final', async () => {
  const database = await playOutEvent(24)
  const sizes = roundSizes(database, 'consolation')

  assert.deepEqual(
    [...sizes.keys()],
    [
      'Consolation Round 1',
      'Consolation Quarter-Final',
      'Consolation Semi-Final',
      'Consolation Final'
    ]
  )
  assert.equal(sizes.get('Consolation Quarter-Final'), 4)
  assert.equal(sizes.get('Consolation Semi-Final'), 2)
  assert.equal(sizes.get('Consolation Final'), 1)
})

test('every draw size finishes on exactly one consolation final', async () => {
  for (const playerCount of [8, 11, 12, 16, 20, 24, 32]) {
    const database = await playOutEvent(playerCount)
    const sizes = roundSizes(database, 'consolation')

    assert.equal(
      sizes.get('Consolation Final'),
      1,
      `${playerCount}-player draw did not end on a single consolation final`
    )
  }
})

test('no consolation match is left with a phantom pending opponent', async () => {
  for (const playerCount of [8, 11, 12, 16, 20, 24, 32]) {
    const database = await playOutEvent(playerCount)

    for (const row of database.rows) {
      if (row.bracket_type !== 'consolation') continue
      assert.ok(
        row.score === 'Bye' || (row.player1_id && row.player2_id),
        `${playerCount}-player draw left ${row.round_name} position ${row.bracket_position} with one player`
      )
    }
  }
})

test('the consolation bracket never produces a Bye against a Bye', async () => {
  for (const playerCount of [8, 11, 12, 16, 20, 24, 32]) {
    const database = await playOutEvent(playerCount)

    for (const row of database.rows) {
      assert.ok(
        row.player1_id || row.player2_id,
        `${playerCount}-player draw created an empty match in ${row.round_name}`
      )
    }
  }
})

test('the consolation winner is awarded consolation winner points', async () => {
  const database = await playOutEvent(16)
  const final = database.rows.find((row) => row.round_name === 'Consolation Final')

  assert.ok(final, 'expected a consolation final')
  assert.equal(final.status, 'completed')
  assert.deepEqual(calculateParticipantResult('singles', final.winner_id, database.rows), {
    status: 'consolation_winner',
    points: POINTS_SYSTEM.singles.consolation.winner
  })
  assert.deepEqual(
    calculateParticipantResult(
      'singles',
      final.winner_id === final.player1_id ? final.player2_id : final.player1_id,
      database.rows
    ),
    { status: 'consolation_runner_up', points: POINTS_SYSTEM.singles.consolation.runner_up }
  )
})

test('a completed event is never rewritten by a later sync', async () => {
  const database = await playOutEvent(16)
  const before = JSON.stringify(database.rows)

  const completedEvent = {
    matchesApi: database.matchesApi,
    eventsApi: {
      async getById() {
        return { id: 'event', event_type: 'singles', status: 'completed' }
      }
    }
  }

  await syncConsolationMatches('event', completedEvent)
  await syncNextRoundMatches('event', 'Consolation Round 1', completedEvent)
  await syncNextRoundMatches('event', 'Round of 16', completedEvent)

  assert.equal(JSON.stringify(database.rows), before)
})
