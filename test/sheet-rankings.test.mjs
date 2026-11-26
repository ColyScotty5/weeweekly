import assert from 'node:assert/strict'
import test from 'node:test'
import { parseCsv, parseLeaderboardCsv, playerKey } from '../src/lib/sheetRankings.js'
import { generateDoublesDraw, generateSinglesDraw } from '../src/lib/tournamentUtils.js'

// Mirrors the layout of the published leaderboard tabs: title rows, a header
// row, player rows (shared ranks allowed), then a totals row.
const SINGLES_CSV = [
  "ST. GEORGE'S WEE-WEEKLY RANKINGS - SINGLES,,,,,,,,",
  'Rankings calculated on 12 month period,,,,,,2026,,',
  'Rank,Player Name,Rnk Pts,TTL Pts,Tm,CD,Jun 6,Jun 20,Jul 4',
  '1,Scott Turnbull,48.50,242.5,7,5.0,45,30,20',
  '2,Dave Masson,36.50,146,5,4.0,30,,20',
  '3,Graham Flick,35.00,157.5,6,4.5,,14,30',
  '3,Lee Buott,35.00,122.5,4,3.5,,20,45',
  '5,Pat Li,23.00,115,7,5.0,20,14,3',
  `9,"Steve O'Neill",15.33,46,3,3.0,12,20,`,
  '48,Parth Patel,0.00,0,0,1.5,,,',
  'Total Number of Players: ,,,,,,20,16,14'
].join('\r\n')

function participantsFor(names) {
  return names.map((name) => {
    const id = playerKey(name)
    return { id, player_id: id, player: { id, name } }
  })
}

test('CSV parsing handles quoted fields, escaped quotes, and CRLF', () => {
  assert.deepEqual(parseCsv('a,"b, c","say ""hi"""\r\n1,,3'), [
    ['a', 'b, c', 'say "hi"'],
    ['1', '', '3']
  ])
})

test('leaderboard rows are read from the header row down, skipping totals', () => {
  const entries = parseLeaderboardCsv(SINGLES_CSV)

  assert.deepEqual(entries.map((entry) => entry.name), [
    'Scott Turnbull',
    'Dave Masson',
    'Graham Flick',
    'Lee Buott',
    'Pat Li',
    "Steve O'Neill",
    'Parth Patel'
  ])
  assert.deepEqual(entries[0], {
    id: 'scott turnbull',
    name: 'Scott Turnbull',
    rank: 1,
    rankPoints: 48.5,
    totalPoints: 242.5,
    eventsPlayed: 7,
    cd: 5,
    isRanked: true
  })
  assert.equal(entries.at(-1).isRanked, false, 'players with no events are not ranked')
})

test('a sheet without a Player Name header is rejected', () => {
  assert.throws(() => parseLeaderboardCsv('Name,Points\nA,1'), /Player Name/)
})

test('player names match the sheet regardless of case and spacing', () => {
  assert.equal(playerKey('  Scott   TURNBULL '), playerKey('Scott Turnbull'))
})

test('singles seeds come from the sheet ranks of the registered players', () => {
  const rankings = new Map(parseLeaderboardCsv(SINGLES_CSV).map((entry) => [entry.id, entry]))
  const names = [
    'Pat Li', 'Parth Patel', 'Dave Masson', 'Walk In One',
    'Lee Buott', 'Graham Flick', "Steve O'Neill", 'Walk In Two', 'Walk In Three'
  ]

  const draw = generateSinglesDraw(participantsFor(names), rankings)

  // 9 players → ceil(9 / 4) = 3 seeds; Scott is absent, so Dave is the top seed.
  // Graham and Lee share rank 3 on the sheet; rank points then total points decide.
  assert.deepEqual(draw.seededPlayers.map((player) => player.name), [
    'Dave Masson',
    'Graham Flick',
    'Lee Buott'
  ])
  assert.equal(draw.drawSize, 16)
  assert.equal(draw.numberOfByes, 7)
  assert.equal(draw.bracket[0].name, 'Dave Masson')
  assert.equal(draw.bracket[15].name, 'Graham Flick')
})

test('walk-ins and zero-event players are never seeded', () => {
  const rankings = new Map(parseLeaderboardCsv(SINGLES_CSV).map((entry) => [entry.id, entry]))
  const draw = generateSinglesDraw(
    participantsFor(['Parth Patel', 'Walk In One', 'Walk In Two', 'Walk In Three']),
    rankings
  )

  assert.equal(draw.seededCount, 0)
})

test('doubles seeds are the top half of the field by sheet ranking', () => {
  const rankings = new Map(parseLeaderboardCsv(SINGLES_CSV).map((entry) => [entry.id, entry]))
  const names = ['Pat Li', 'Dave Masson', 'Parth Patel', 'Walk In One', 'Scott Turnbull', 'Lee Buott']

  const draw = generateDoublesDraw(participantsFor(names), rankings)

  assert.deepEqual(draw.seededPlayers.map((player) => player.name), [
    'Scott Turnbull',
    'Dave Masson',
    'Lee Buott'
  ])
  assert.equal(draw.totalTeams, 3)
})
