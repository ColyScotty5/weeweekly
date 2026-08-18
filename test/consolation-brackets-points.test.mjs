import assert from 'node:assert/strict'
import test from 'node:test'
import {
  POINTS_SYSTEM,
  calculateParticipantResult,
  getConsolationRoundNames,
  getConsolationRoundNamesForMatches,
  getRoundSortOrder
} from '../src/lib/tournamentUtils.js'

/** Main first round name for a draw of the given size. */
function mainFirstRoundName(drawSize) {
  return {
    4: 'Semi-Final',
    8: 'Quarter-Final',
    16: 'Round of 16',
    32: 'Round of 32'
  }[drawSize]
}

/** Completed main first round with `drawSize / 2` matches, players 1..drawSize. */
function mainFirstRound(drawSize) {
  const matches = []
  for (let position = 0; position < drawSize / 2; position++) {
    matches.push({
      round_name: mainFirstRoundName(drawSize),
      bracket_type: 'main',
      bracket_position: position,
      status: 'completed',
      player1_id: position * 2 + 1,
      player2_id: position * 2 + 2,
      winner_id: position * 2 + 1
    })
  }
  return matches
}

function consolationMatch({ round, position, player1, player2, winner }) {
  return {
    round_name: round,
    bracket_type: 'consolation',
    bracket_position: position,
    status: 'completed',
    player1_id: player1,
    player2_id: player2,
    winner_id: winner
  }
}

test('consolation rounds are sized from the main first round and end on a final', () => {
  assert.deepEqual(getConsolationRoundNames(1), ['Consolation Round 1'])
  assert.deepEqual(getConsolationRoundNames(2), ['Consolation Round 1', 'Consolation Final'])
  assert.deepEqual(getConsolationRoundNames(4), [
    'Consolation Round 1',
    'Consolation Semi-Final',
    'Consolation Final'
  ])
  assert.deepEqual(getConsolationRoundNames(8), [
    'Consolation Round 1',
    'Consolation Quarter-Final',
    'Consolation Semi-Final',
    'Consolation Final'
  ])
  assert.deepEqual(getConsolationRoundNames(16), [
    'Consolation Round 1',
    'Consolation Round of 16',
    'Consolation Quarter-Final',
    'Consolation Semi-Final',
    'Consolation Final'
  ])
})

test('a 24-player draw produces a four-round consolation bracket', () => {
  const rounds = getConsolationRoundNamesForMatches(mainFirstRound(32))

  assert.equal(rounds.length, 4)
  assert.equal(rounds.at(-1), 'Consolation Final')
})

test('the 16-draw consolation progression stays Round 1, Semi-Final, Final', () => {
  assert.deepEqual(getConsolationRoundNamesForMatches(mainFirstRound(16)), [
    'Consolation Round 1',
    'Consolation Semi-Final',
    'Consolation Final'
  ])
})

test('consolation round order sorts after every main round', () => {
  const mainRounds = ['Round of 64', 'Round of 32', 'Round of 16', 'Quarter-Final', 'Semi-Final', 'Final']
  const consolationRounds = getConsolationRoundNames(16)

  const highestMain = Math.max(...mainRounds.map(getRoundSortOrder))
  const lowestConsolation = Math.min(...consolationRounds.map(getRoundSortOrder))
  assert.ok(lowestConsolation > highestMain)

  const orders = consolationRounds.map(getRoundSortOrder)
  assert.deepEqual(orders, [...orders].sort((a, b) => a - b))
})

test('consolation results are scored from the consolation table, not the main one', () => {
  // 16 draw: player 2 loses main round 1, then wins the whole consolation.
  const matches = [
    ...mainFirstRound(16),
    consolationMatch({ round: 'Consolation Round 1', position: 0, player1: 2, player2: 4, winner: 2 }),
    consolationMatch({ round: 'Consolation Semi-Final', position: 0, player1: 2, player2: 6, winner: 2 }),
    consolationMatch({ round: 'Consolation Final', position: 0, player1: 2, player2: 10, winner: 2 })
  ]

  assert.deepEqual(calculateParticipantResult('singles', 2, matches), {
    status: 'consolation_winner',
    points: POINTS_SYSTEM.singles.consolation.winner
  })
  assert.deepEqual(calculateParticipantResult('singles', 10, matches), {
    status: 'consolation_runner_up',
    points: POINTS_SYSTEM.singles.consolation.runner_up
  })
  assert.deepEqual(calculateParticipantResult('singles', 6, matches), {
    status: 'consolation_semi_final',
    points: POINTS_SYSTEM.singles.consolation.semi_final
  })
  assert.deepEqual(calculateParticipantResult('singles', 4, matches), {
    status: 'consolation_quarter_final',
    points: POINTS_SYSTEM.singles.consolation.quarter_final
  })
})

test('consolation tiers follow bracket depth, not the round label', () => {
  // 32 draw: the first consolation round holds 16 players, so losing it is round_16.
  const matches = [
    ...mainFirstRound(32),
    consolationMatch({ round: 'Consolation Round 1', position: 0, player1: 2, player2: 4, winner: 2 })
  ]

  assert.deepEqual(calculateParticipantResult('singles', 4, matches), {
    status: 'consolation_round_16',
    points: POINTS_SYSTEM.singles.consolation.round_16
  })

  // 8 draw: the first consolation round holds 4 players, so losing it is semi_final.
  const smallDraw = [
    ...mainFirstRound(8),
    consolationMatch({ round: 'Consolation Round 1', position: 0, player1: 2, player2: 4, winner: 2 })
  ]

  assert.deepEqual(calculateParticipantResult('singles', 4, smallDraw), {
    status: 'consolation_semi_final',
    points: POINTS_SYSTEM.singles.consolation.semi_final
  })
})

test('a consolation bye advances the player without awarding an early tier', () => {
  const matches = [
    ...mainFirstRound(16),
    {
      round_name: 'Consolation Round 1',
      bracket_type: 'consolation',
      bracket_position: 0,
      status: 'walkover',
      score: 'Bye',
      player1_id: 2,
      player2_id: null,
      winner_id: 2
    },
    consolationMatch({ round: 'Consolation Semi-Final', position: 0, player1: 2, player2: 6, winner: 6 })
  ]

  assert.deepEqual(calculateParticipantResult('singles', 2, matches), {
    status: 'consolation_semi_final',
    points: POINTS_SYSTEM.singles.consolation.semi_final
  })
})

test('main-draw results are unchanged for players who never reach consolation', () => {
  const matches = [
    ...mainFirstRound(16),
    { round_name: 'Quarter-Final', bracket_type: 'main', bracket_position: 0, status: 'completed', player1_id: 1, player2_id: 3, winner_id: 1 },
    { round_name: 'Semi-Final', bracket_type: 'main', bracket_position: 0, status: 'completed', player1_id: 1, player2_id: 5, winner_id: 1 },
    { round_name: 'Final', bracket_type: 'main', bracket_position: 0, status: 'completed', player1_id: 1, player2_id: 9, winner_id: 1 }
  ]

  assert.deepEqual(calculateParticipantResult('singles', 1, matches), {
    status: 'winner',
    points: POINTS_SYSTEM.singles.main.winner
  })
  assert.deepEqual(calculateParticipantResult('singles', 9, matches), {
    status: 'runner_up',
    points: POINTS_SYSTEM.singles.main.runner_up
  })
  assert.deepEqual(calculateParticipantResult('singles', 5, matches), {
    status: 'semi_final',
    points: POINTS_SYSTEM.singles.main.semi_final
  })
  assert.deepEqual(calculateParticipantResult('singles', 3, matches), {
    status: 'quarter_final',
    points: POINTS_SYSTEM.singles.main.quarter_final
  })
})

test('a doubles partner is scored on their team result, not as a loser', () => {
  const matches = [
    {
      round_name: 'Semi-Final',
      bracket_type: 'main',
      bracket_position: 0,
      status: 'completed',
      player1_id: 1,
      player1_partner_id: 2,
      player2_id: 3,
      player2_partner_id: 4,
      winner_id: 1
    },
    {
      round_name: 'Final',
      bracket_type: 'main',
      bracket_position: 0,
      status: 'completed',
      player1_id: 1,
      player1_partner_id: 2,
      player2_id: 5,
      player2_partner_id: 6,
      winner_id: 1
    }
  ]

  for (const playerId of [1, 2]) {
    assert.deepEqual(calculateParticipantResult('doubles', playerId, matches), {
      status: 'winner',
      points: POINTS_SYSTEM.doubles.main.winner
    })
  }

  for (const playerId of [5, 6]) {
    assert.deepEqual(calculateParticipantResult('doubles', playerId, matches), {
      status: 'runner_up',
      points: POINTS_SYSTEM.doubles.main.runner_up
    })
  }
})

test('an unplayed consolation match leaves the main-draw result standing', () => {
  const matches = [
    ...mainFirstRound(16),
    {
      round_name: 'Consolation Round 1',
      bracket_type: 'consolation',
      bracket_position: 0,
      status: 'cancelled',
      player1_id: 2,
      player2_id: 4,
      winner_id: null
    }
  ]

  assert.deepEqual(calculateParticipantResult('singles', 2, matches), {
    status: 'round_16',
    points: POINTS_SYSTEM.singles.main.round_16
  })
})

test('every points table cell is reachable through a result status', () => {
  for (const eventType of ['singles', 'doubles']) {
    for (const [tier, points] of Object.entries(POINTS_SYSTEM[eventType].main)) {
      assert.equal(typeof points, 'number', `${eventType} main ${tier}`)
    }
    for (const [tier, points] of Object.entries(POINTS_SYSTEM[eventType].consolation)) {
      assert.equal(typeof points, 'number', `${eventType} consolation ${tier}`)
    }
  }

  assert.deepEqual(POINTS_SYSTEM.singles.main, {
    winner: 45, runner_up: 30, semi_final: 20, quarter_final: 14, round_16: 8, round_32: 5
  })
  assert.deepEqual(POINTS_SYSTEM.singles.consolation, {
    winner: 12, runner_up: 8, semi_final: 5, quarter_final: 3, round_16: 2, round_32: 1
  })
  assert.deepEqual(POINTS_SYSTEM.doubles.main, {
    winner: 30, runner_up: 20, semi_final: 14, quarter_final: 10, round_16: 5, round_32: 3
  })
  assert.deepEqual(POINTS_SYSTEM.doubles.consolation, {
    winner: 12, runner_up: 8, semi_final: 5, quarter_final: 3, round_16: 2, round_32: 1
  })
})

test('every consolation award sits below its main-draw counterpart', () => {
  for (const eventType of ['singles', 'doubles']) {
    const { main, consolation } = POINTS_SYSTEM[eventType]
    for (const tier of Object.keys(main)) {
      assert.ok(
        consolation[tier] < main[tier],
        `${eventType} consolation ${tier} (${consolation[tier]}) should be below main (${main[tier]})`
      )
    }
  }
})

test('consolation awards decrease with every round lost earlier', () => {
  const descending = ['winner', 'runner_up', 'semi_final', 'quarter_final', 'round_16', 'round_32']

  for (const eventType of ['singles', 'doubles']) {
    const values = descending.map((tier) => POINTS_SYSTEM[eventType].consolation[tier])
    for (let index = 1; index < values.length; index++) {
      assert.ok(
        values[index] < values[index - 1],
        `${eventType} consolation ${descending[index]} should be below ${descending[index - 1]}`
      )
    }
  }
})
