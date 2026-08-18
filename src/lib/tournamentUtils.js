import { reportError } from './errors.js'

// Tournament utility functions for draw generation and points calculation
/** Same ordering as the leaderboard UI (best first). */
export function compareLeaderboardEntries(a, b) {
  const rankA = a.rank == null ? Number.POSITIVE_INFINITY : a.rank
  const rankB = b.rank == null ? Number.POSITIVE_INFINITY : b.rank
  if (rankA !== rankB) return rankA - rankB

  const pointsA = Number(a.rankPoints) || 0
  const pointsB = Number(b.rankPoints) || 0
  if (pointsA !== pointsB) return pointsB - pointsA

  const totalA = Number(a.totalPoints) || 0
  const totalB = Number(b.totalPoints) || 0
  if (totalA !== totalB) return totalB - totalA

  return String(a.name || '').localeCompare(String(b.name || ''))
}

// Points system configuration
export const POINTS_SYSTEM = {
  singles: {
    main: {
      winner: 45,
      runner_up: 30,
      semi_final: 20,
      quarter_final: 14,
      round_16: 8,
      round_32: 5
    },
    consolation: {
      winner: 12,
      runner_up: 8,
      semi_final: 5,
      quarter_final: 3,
      round_16: 2,
      round_32: 1
    }
  },
  doubles: {
    main: {
      winner: 30,
      runner_up: 20,
      semi_final: 14,
      quarter_final: 10,
      round_16: 5,
      round_32: 3
    },
    consolation: {
      winner: 12,
      runner_up: 8,
      semi_final: 5,
      quarter_final: 3,
      round_16: 2,
      round_32: 1
    }
  }
}

/** Human-readable labels for participant result statuses */
export const RESULT_STATUS_LABELS = {
  registered: 'Registered',
  active: 'Active',
  withdrawn: 'Withdrawn',
  eliminated: 'Eliminated',
  winner: 'Winner',
  runner_up: 'Runner-up',
  semi_final: 'Semi-Final',
  quarter_final: 'Quarter-Final',
  round_16: 'Round of 16',
  round_32: 'Round of 32',
  consolation_winner: 'Consolation Winner',
  consolation_runner_up: 'Consolation Runner-up',
  consolation_semi_final: 'Consolation Semi-Final',
  consolation_quarter_final: 'Consolation Quarter-Final',
  consolation_round_16: 'Consolation Round of 16',
  consolation_round_32: 'Consolation Round of 32'
}

/**
 * Infer result status from points earned, for stored rows that predate
 * calculateParticipantResult recording status and points together.
 * Main-bracket values win on collisions with consolation (singles 8 → round_16).
 * Non-exact values (e.g. shared 37.5 → 38) snap to the nearest known points tier.
 */
export function resultStatusFromPoints(eventType, pointsEarned) {
  const system = POINTS_SYSTEM[eventType]
  if (!system || pointsEarned == null) return 'eliminated'

  const byPoints = new Map()
  for (const [round, pts] of Object.entries(system.consolation || {})) {
    byPoints.set(pts, `consolation_${round}`)
  }
  for (const [round, pts] of Object.entries(system.main || {})) {
    byPoints.set(pts, round)
  }

  const pts = Number(pointsEarned)
  if (byPoints.has(pts)) return byPoints.get(pts)

  let bestPts = null
  let bestDist = Infinity
  for (const known of byPoints.keys()) {
    const dist = Math.abs(known - pts)
    if (dist < bestDist || (dist === bestDist && (bestPts == null || known > bestPts))) {
      bestDist = dist
      bestPts = known
    }
  }

  return bestPts == null ? 'eliminated' : byPoints.get(bestPts)
}

export function formatResultStatus(status) {
  if (!status) return ''
  return RESULT_STATUS_LABELS[status] || status.replace(/_/g, ' ')
}

// Generate singles draw
// Top ~25% of the field may be seeded (ceil), chosen only from ranked players.
// Seed order matches the leaderboard among registered players.
export function generateSinglesDraw(participants, rankingsByPlayerId = new Map()) {
  const totalPlayers = participants.length

  // Find the next power of 2 that accommodates all players
  const drawSize = Math.pow(2, Math.ceil(Math.log2(Math.max(totalPlayers, 2))))
  const numberOfByes = drawSize - totalPlayers

  const enriched = participants.map((participant) => {
    const playerId = String(participant.player_id || participant.player?.id || '')
    const ranking =
      rankingsByPlayerId.get(playerId) ||
      rankingsByPlayerId.get(participant.player_id) ||
      rankingsByPlayerId.get(participant.player?.id)

    return {
      ...participant,
      player_id: participant.player_id || participant.player?.id,
      name: participant.player?.name || ranking?.name || '',
      rank: ranking?.rank ?? null,
      rankPoints: Number(ranking?.rankPoints) || 0,
      totalPoints: Number(ranking?.totalPoints) || 0,
      _rankPoints: Number(ranking?.rankPoints) || 0,
      _totalPoints: Number(ranking?.totalPoints) || 0,
      _rank: ranking?.rank ?? null,
      // On the rolling leaderboard (completed events in window)
      _isRanked: Boolean(ranking?.isRanked) || (Number(ranking?.eventsPlayed) || 0) > 0
    }
  })

  // Eligible seeds: registered players who appear on the leaderboard, best first
  const ranked = enriched
    .filter((participant) => participant._isRanked)
    .sort(compareLeaderboardEntries)
  const unranked = enriched.filter((participant) => !participant._isRanked)

  // Strict quarter-field seeding (11 players → 3 seeds). Never use bye count for this.
  const maxSeeds = Math.min(
    Math.ceil(totalPlayers / 4),
    ranked.length,
    Math.floor(drawSize / 2)
  )
  const seededPlayers = ranked.slice(0, maxSeeds).map((participant, index) => ({
    ...participant,
    seed_position: index + 1
  }))
  const seededIds = new Set(seededPlayers.map((participant) => String(participant.player_id)))

  // Remaining ranked players stay in leaderboard order (for fair extra byes)
  const remainingRanked = ranked
    .filter((participant) => !seededIds.has(String(participant.player_id)))
    .map((participant) => ({
      ...participant,
      seed_position: null
    }))
  const remainingUnranked = unranked.map((participant) => ({
    ...participant,
    seed_position: null
  }))
  const shuffledUnranked = [...remainingUnranked].sort(() => Math.random() - 0.5)
  const unseededPlayers = [...remainingRanked, ...shuffledUnranked]

  const seedPositions = getStandardSeedPositions(drawSize)
  const bracket = placeEntriesWithSeedsAndByes({
    drawSize,
    numberOfByes,
    seededEntries: seededPlayers,
    unseededEntries: unseededPlayers,
    seedPositions
  })

  return {
    bracket,
    drawSize,
    totalPlayers,
    seededCount: seededPlayers.length,
    numberOfByes,
    firstRoundMatches: Math.floor((totalPlayers + 1) / 2),
    seededPlayers,
    unseededPlayers
  }
}

// Generate doubles draw with partner assignments
// Up to half the field may be seeded (players with rank points > 0 only).
// Each seed gets a random partner; leftover players are randomly paired into unseeded teams.
// Seeded teams use ATP/ITF bracket placement (same geometry as singles).
export const ODD_DOUBLES_REGISTRANTS_MESSAGE =
  'Fail! There seems to be an odd number of registrants, does someone think they can win this on their own! 😂 Please double check the list of registrants and try again.'

export function generateDoublesDraw(participants, rankingsByPlayerId = new Map()) {
  const totalPlayers = participants.length

  if (totalPlayers % 2 !== 0) {
    throw new Error(ODD_DOUBLES_REGISTRANTS_MESSAGE)
  }

  const enriched = participants.map((participant) => {
    const playerId = String(participant.player_id || participant.player?.id || '')
    const ranking =
      rankingsByPlayerId.get(playerId) ||
      rankingsByPlayerId.get(participant.player_id) ||
      rankingsByPlayerId.get(participant.player?.id)
    const rankPoints = Number(ranking?.rankPoints) || 0
    return {
      ...participant,
      player_id: participant.player_id || participant.player?.id,
      name: participant.player?.name || ranking?.name || '',
      rank: ranking?.rank ?? null,
      rankPoints,
      totalPoints: Number(ranking?.totalPoints) || 0,
      _rankPoints: rankPoints,
      _totalPoints: Number(ranking?.totalPoints) || 0,
      _rank: ranking?.rank ?? null,
      // Doubles: only players with rank points > 0 can be seeded
      _isSeedable: rankPoints > 0
    }
  })

  const seedable = enriched
    .filter((participant) => participant._isSeedable)
    .sort(compareLeaderboardEntries)
  const notSeedable = enriched.filter((participant) => !participant._isSeedable)

  // Cap at half the field; if fewer seedable players exist, seed only those
  const maxSeeds = Math.floor(totalPlayers / 2)
  const seededPlayers = seedable.slice(0, maxSeeds).map((participant, index) => ({
    ...participant,
    seed_position: index + 1
  }))
  const seededIds = new Set(seededPlayers.map((participant) => participant.player_id))

  const poolForPartners = [
    ...seedable.filter((participant) => !seededIds.has(participant.player_id)),
    ...notSeedable
  ].map((participant) => ({
    ...participant,
    seed_position: null
  }))

  const shuffledUnseeded = [...poolForPartners].sort(() => Math.random() - 0.5)

  // Every seeded player gets a randomly assigned partner
  const seededTeams = []
  for (let i = 0; i < seededPlayers.length; i++) {
    const partner = shuffledUnseeded[i]
    if (!partner) {
      throw new Error('Unable to pair all seeded players with partners')
    }
    seededTeams.push({
      player1: seededPlayers[i],
      player2: partner,
      seed_position: seededPlayers[i].seed_position
    })
  }

  // Remaining registrants randomly paired into unseeded teams
  const remainingUnseeded = shuffledUnseeded.slice(seededPlayers.length)
  if (remainingUnseeded.length % 2 !== 0) {
    throw new Error('Unable to pair all registrants into doubles teams')
  }

  const unseededTeams = []
  for (let i = 0; i < remainingUnseeded.length; i += 2) {
    unseededTeams.push({
      player1: remainingUnseeded[i],
      player2: remainingUnseeded[i + 1],
      seed_position: null
    })
  }

  const teams = [...seededTeams, ...unseededTeams]
  const totalTeams = teams.length
  const drawSize = Math.pow(2, Math.ceil(Math.log2(Math.max(totalTeams, 2))))
  const numberOfByes = drawSize - totalTeams
  const seedPositions = getStandardSeedPositions(drawSize)

  const seededTeamsOrdered = seededTeams
    .slice()
    .sort((a, b) => a.seed_position - b.seed_position)
  const shuffledUnseededTeams = [...unseededTeams].sort(() => Math.random() - 0.5)

  const bracket = placeEntriesWithSeedsAndByes({
    drawSize,
    numberOfByes,
    seededEntries: seededTeamsOrdered,
    unseededEntries: shuffledUnseededTeams,
    seedPositions
  })

  return {
    teams,
    bracket,
    drawSize,
    totalTeams,
    seededCount: seededTeamsOrdered.length,
    numberOfByes,
    seededPlayers,
    unseededPlayers: shuffledUnseeded
  }
}

/**
 * ATP/ITF fixed seed positions (0-based).
 * Seed 1 top, seed 2 bottom, seed 4 in seed 1's half, seed 3 in seed 2's half.
 * Returns array where index = seedNumber - 1.
 */
export function getStandardSeedPositions(drawSize) {
  if (drawSize < 2) return [0]

  // Size 2 base: seed1 @0, seed2 @1
  let posBySeed = [0, 1]

  for (let size = 4; size <= drawSize; size *= 2) {
    const half = size / 2
    const next = new Array(size)

    for (let seedIndex = 0; seedIndex < half; seedIndex++) {
      const oldPos = posBySeed[seedIndex]
      next[seedIndex] = oldPos % 2 === 0 ? oldPos * 2 : oldPos * 2 + 1
    }

    // New seeds pair as siblings of existing seeds: seed N opposite seed 1, etc.
    for (let seedIndex = 0; seedIndex < half; seedIndex++) {
      const expanded = next[seedIndex]
      const sibling = expanded % 2 === 0 ? expanded + 1 : expanded - 1
      next[size - seedIndex - 1] = sibling
    }

    posBySeed = next
  }

  return posBySeed
}

/**
 * Place seeded entries at ITF slots, reserve R1 opponent slots as byes for seeds
 * #1, #2, ... then fill remaining holes with unseeded entries.
 *
 * Extra byes (when byes > seeds) go to the next-highest-ranked unseeded players
 * (still without seed numbers). Never create a BYE-vs-BYE hole.
 */
function placeEntriesWithSeedsAndByes({
  drawSize,
  numberOfByes,
  seededEntries,
  unseededEntries,
  seedPositions
}) {
  const bracket = new Array(drawSize).fill(null)

  for (let i = 0; i < seededEntries.length; i++) {
    const position = seedPositions[i]
    if (position === undefined || position < 0 || position >= drawSize) continue
    bracket[position] = seededEntries[i]
  }

  const reservedByeSlots = new Set()
  const byesToAssign = Math.max(0, numberOfByes)
  const unseededQueue = [...unseededEntries]

  // 1) Official seeds get byes first (empty R1 opponent slot)
  for (let seedNum = 1; seedNum <= seededEntries.length && reservedByeSlots.size < byesToAssign; seedNum++) {
    const seedPos = seedPositions[seedNum - 1]
    if (seedPos === undefined) continue
    const opponentPos = seedPos ^ 1
    if (opponentPos >= 0 && opponentPos < drawSize && bracket[opponentPos] === null) {
      reservedByeSlots.add(opponentPos)
    }
  }

  // 2) Extra byes: next unseeded players become bye recipients (no seed_position)
  if (reservedByeSlots.size < byesToAssign) {
    for (let pairStart = 0; pairStart < drawSize && reservedByeSlots.size < byesToAssign; pairStart += 2) {
      const a = pairStart
      const b = pairStart + 1
      const aFree = bracket[a] === null && !reservedByeSlots.has(a)
      const bFree = bracket[b] === null && !reservedByeSlots.has(b)
      if (!aFree || !bFree || unseededQueue.length === 0) continue

      const byePos = pairStart < drawSize / 2 ? a : b
      const playerPos = byePos === a ? b : a
      bracket[playerPos] = unseededQueue.shift()
      reservedByeSlots.add(byePos)
    }
  }

  // 3) Safety: remaining empty pairs → one bye + one player
  if (reservedByeSlots.size < byesToAssign) {
    for (let pairStart = 0; pairStart < drawSize && reservedByeSlots.size < byesToAssign; pairStart += 2) {
      const a = pairStart
      const b = pairStart + 1
      const aFree = bracket[a] === null && !reservedByeSlots.has(a)
      const bFree = bracket[b] === null && !reservedByeSlots.has(b)
      if (aFree && bFree && unseededQueue.length > 0) {
        bracket[b] = unseededQueue.shift()
        reservedByeSlots.add(a)
      }
    }
  }

  // 4) Fill every remaining non-bye hole with leftover unseeded players
  const fillSlots = []
  for (let pos = 0; pos < drawSize; pos++) {
    if (bracket[pos] === null && !reservedByeSlots.has(pos)) {
      fillSlots.push(pos)
    }
  }

  for (let i = 0; i < fillSlots.length && unseededQueue.length > 0; i++) {
    bracket[fillSlots[i]] = unseededQueue.shift()
  }

  return bracket
}

// Generate matches for a draw
export function generateMatches(eventId, draw, eventType = 'singles') {
  const matches = []
  
  if (eventType === 'singles') {
    return generateSinglesMatches(eventId, draw)
  } else {
    return generateDoublesMatches(eventId, draw)
  }
}

// Generate singles matches with proper bracket structure
function generateSinglesMatches(eventId, draw) {
  const matches = []
  const { bracket, drawSize } = draw
  
  // Generate first round matches for every bracket pair (including Bye slots)
  let matchNumber = 1
  
  for (let i = 0; i < drawSize; i += 2) {
    const player1 = bracket[i]
    const player2 = bracket[i + 1]
    
    if (player1 && player2) {
      matches.push({
        event_id: eventId,
        player1_id: player1.player_id,
        player2_id: player2.player_id,
        round_name: getRoundName(drawSize, 1),
        bracket_type: 'main',
        match_number: matchNumber,
        status: 'scheduled',
        bracket_position: Math.floor(i / 2)
      })
      matchNumber++
    } else if (player1 || player2) {
      // Seeded (or other) player receives a Bye — keep them visible in this round
      const advancer = player1 || player2
      matches.push({
        event_id: eventId,
        player1_id: player1?.player_id || null,
        player2_id: player2?.player_id || null,
        round_name: getRoundName(drawSize, 1),
        bracket_type: 'main',
        match_number: matchNumber,
        status: 'walkover',
        score: 'Bye',
        winner_id: advancer.player_id,
        completed_at: new Date().toISOString(),
        bracket_position: Math.floor(i / 2)
      })
      matchNumber++
    }
  }
  
  return matches
}

// Generate doubles matches using ITF-placed team bracket (null = bye)
function generateDoublesMatches(eventId, draw) {
  const matches = []
  const { bracket, drawSize } = draw
  const slots = bracket || []
  let matchNumber = 1

  for (let i = 0; i < drawSize; i += 2) {
    const team1 = slots[i]
    const team2 = slots[i + 1]

    if (team1 && team2) {
      matches.push({
        event_id: eventId,
        player1_id: team1.player1.player_id,
        player1_partner_id: team1.player2.player_id,
        player2_id: team2.player1.player_id,
        player2_partner_id: team2.player2.player_id,
        round_name: getRoundName(drawSize, 1),
        bracket_type: 'main',
        match_number: matchNumber,
        status: 'scheduled',
        bracket_position: Math.floor(i / 2)
      })
      matchNumber++
    } else if (team1 || team2) {
      const advancer = team1 || team2
      matches.push({
        event_id: eventId,
        player1_id: team1?.player1?.player_id || null,
        player1_partner_id: team1?.player2?.player_id || null,
        player2_id: team2?.player1?.player_id || null,
        player2_partner_id: team2?.player2?.player_id || null,
        round_name: getRoundName(drawSize, 1),
        bracket_type: 'main',
        match_number: matchNumber,
        status: 'walkover',
        score: 'Bye',
        winner_id: advancer.player1.player_id,
        completed_at: new Date().toISOString(),
        bracket_position: Math.floor(i / 2)
      })
      matchNumber++
    }
  }

  return matches
}

// Get round name based on draw size and round number
function getRoundName(drawSize, roundNumber) {
  const totalRounds = Math.log2(drawSize)
  const roundsFromFinal = totalRounds - roundNumber
  
  switch (roundsFromFinal) {
    case 0: return 'Final'
    case 1: return 'Semi-Final'
    case 2: return 'Quarter-Final'
    case 3: return 'Round of 16'
    case 4: return 'Round of 32'
    case 5: return 'Round of 64'
    default: return `Round ${roundNumber}`
  }
}

// Calculate points for a match result
export function calculatePoints(eventType, roundName, bracketType, isWinner) {
  const pointsTable = POINTS_SYSTEM[eventType][bracketType]
  
  if (!pointsTable) return 0
  
  const roundKey = roundName.toLowerCase().replace(/[^a-z0-9]/g, '_')
  
  // Map round names to point keys
  const roundMapping = {
    'final': isWinner ? 'winner' : 'runner_up',
    'semi_final': 'semi_final',
    'quarter_final': 'quarter_final',
    'round_of_16': 'round_16',
    'round_of_32': 'round_32',
    'round_1': 'round_32', // First round of 32-player draw
    'round_2': 'round_16', // Second round
    'round_3': 'quarter_final',
    'round_4': 'semi_final',
    'round_5': isWinner ? 'winner' : 'runner_up'
  }
  
  const pointKey = roundMapping[roundKey] || 'round_32'
  return pointsTable[pointKey] || 0
}

const RESULT_TIER_RANK = {
  round_32: 1,
  round_16: 2,
  quarter_final: 3,
  semi_final: 4,
  runner_up: 5,
  winner: 6
}

const MAIN_ELIMINATION_TIER = {
  'Round of 32': 'round_32',
  'Round of 16': 'round_16',
  'Quarter-Final': 'quarter_final',
  'Semi-Final': 'semi_final',
  Final: 'runner_up'
}

const MAIN_ADVANCE_TIER = {
  'Round of 32': 'round_16',
  'Round of 16': 'quarter_final',
  'Quarter-Final': 'semi_final',
  'Semi-Final': 'runner_up',
  Final: 'winner'
}

/** 1 or 2 for the side a player (or their doubles partner) sits on, else null. */
function getMatchPlayerSide(match, playerId) {
  if (!match || playerId == null) return null
  if (match.player1_id === playerId || match.player1_partner_id === playerId) return 1
  if (match.player2_id === playerId || match.player2_partner_id === playerId) return 2
  return null
}

// winner_id holds the winning side's first player, so a doubles partner is on the
// winning side without ever being the winner_id.
function didSideWin(match, side) {
  if (!match?.winner_id) return false
  return side === 1
    ? match.winner_id === match.player1_id
    : match.winner_id === match.player2_id
}

function resolveFurthestTier(matches, playerId, eliminationTierFor, advanceTierFor) {
  let furthestTier = null
  let furthestRank = 0

  for (const match of matches) {
    if (match.status !== 'completed' && match.status !== 'walkover') continue

    const side = getMatchPlayerSide(match, playerId)
    if (!side) continue

    const tier = didSideWin(match, side)
      ? advanceTierFor(match.round_name)
      : eliminationTierFor(match.round_name)
    const rank = RESULT_TIER_RANK[tier] || 0

    if (tier && rank > furthestRank) {
      furthestRank = rank
      furthestTier = tier
    }
  }

  return furthestTier
}

/**
 * Event result status and points for one participant.
 *
 * A player with a finished consolation match is scored from the consolation table
 * only — the main-draw loss that sent them there is superseded. An unplayed or
 * cancelled consolation match leaves the main-draw result standing.
 *
 * `matches` must be every match in the event: the consolation round names depend
 * on the size of the main first round.
 */
export function calculateParticipantResult(eventType, playerId, matches = []) {
  const system = POINTS_SYSTEM[eventType] || POINTS_SYSTEM.singles
  const consolationRounds = getConsolationRoundNamesForMatches(matches)

  const depthFromConsolationFinal = (roundName) => {
    const index = consolationRounds.indexOf(roundName)
    return index === -1 ? null : consolationRounds.length - 1 - index
  }

  const tierAtDepth = (depth) =>
    TIER_BY_DEPTH_FROM_FINAL[
      Math.min(Math.max(depth, 0), TIER_BY_DEPTH_FROM_FINAL.length - 1)
    ]

  const consolationTier = resolveFurthestTier(
    matches.filter((match) => match.bracket_type === 'consolation'),
    playerId,
    (roundName) => {
      const depth = depthFromConsolationFinal(roundName)
      return depth == null ? null : tierAtDepth(depth)
    },
    (roundName) => {
      const depth = depthFromConsolationFinal(roundName)
      if (depth == null) return null
      return depth === 0 ? 'winner' : tierAtDepth(depth - 1)
    }
  )

  if (consolationTier) {
    return {
      status: `consolation_${consolationTier}`,
      points: system.consolation[consolationTier] ?? 0
    }
  }

  const mainTier =
    resolveFurthestTier(
      matches.filter((match) => match.bracket_type === 'main' || !match.bracket_type),
      playerId,
      (roundName) => MAIN_ELIMINATION_TIER[roundName] || null,
      (roundName) => MAIN_ADVANCE_TIER[roundName] || null
    ) || 'round_32'

  return { status: mainTier, points: system.main[mainTier] ?? 0 }
}

// Calculate ranking points for a player
export function calculateRankingPoints(playerResults, eventType) {
  if (!playerResults || playerResults.length === 0) return 0
  
  // Sort results by points earned (descending)
  const sortedResults = playerResults
    .filter(result => result.match?.event?.event_type === eventType)
    .sort((a, b) => b.points_earned - a.points_earned)
  
  // Take best results (you might want to adjust this logic)
  // For now, let's take the average of all results
  const totalPoints = sortedResults.reduce((sum, result) => sum + result.points_earned, 0)
  const totalEvents = new Set(sortedResults.map(r => r.match?.event?.id)).size
  
  return totalEvents > 0 ? totalPoints / totalEvents : 0
}

// Round order from earliest → latest (first main round is the earliest present)
const MAIN_ROUND_ORDER = [
  'Round of 64',
  'Round of 32',
  'Round of 16',
  'Quarter-Final',
  'Semi-Final',
  'Final'
]

export const CONSOLATION_FIRST_ROUND_NAME = 'Consolation Round 1'

// Consolation rounds after the first are named by their distance from the
// consolation final, so the bracket ends on a real final at every draw size.
const CONSOLATION_ROUND_NAME_BY_DEPTH = [
  'Consolation Final',
  'Consolation Semi-Final',
  'Consolation Quarter-Final',
  'Consolation Round of 16',
  'Consolation Round of 32'
]

// Points tier reached by losing a round at the given distance from the final.
const TIER_BY_DEPTH_FROM_FINAL = [
  'runner_up',
  'semi_final',
  'quarter_final',
  'round_16',
  'round_32'
]

const ROUND_SORT_ORDER = new Map([
  ['Round of 64', 1],
  ['Round of 32', 2],
  ['Round of 16', 3],
  ['Quarter-Final', 4],
  ['Semi-Final', 5],
  ['Final', 6],
  [CONSOLATION_FIRST_ROUND_NAME, 11],
  ['Consolation Round of 32', 12],
  ['Consolation Round of 16', 13],
  ['Consolation Quarter-Final', 14],
  ['Consolation Semi-Final', 15],
  ['Consolation Final', 16]
])

/** Left-to-right bracket column order for a round name. */
export function getRoundSortOrder(roundName) {
  if (!roundName) return 999
  const known = ROUND_SORT_ORDER.get(roundName)
  if (known) return known

  const numbered = /^Round (\d+)$/.exec(roundName)
  if (numbered) return Number(numbered[1])

  return 999
}

/**
 * Consolation round names, earliest first, for a bracket whose first round holds
 * `firstRoundMatchCount` matches. The first round keeps its historical label and
 * every later round is named by its distance from the consolation final.
 */
export function getConsolationRoundNames(firstRoundMatchCount) {
  let remaining = Math.max(1, Math.floor(Number(firstRoundMatchCount) || 0))
  const names = [CONSOLATION_FIRST_ROUND_NAME]

  while (remaining > 1) {
    remaining = Math.ceil(remaining / 2)
    const depth = Math.ceil(Math.log2(remaining))
    names.push(
      CONSOLATION_ROUND_NAME_BY_DEPTH[depth] || `Consolation Round ${names.length + 1}`
    )
  }

  return names
}

/** Consolation round names implied by an event's main draw. */
export function getConsolationRoundNamesForMatches(allMatches = []) {
  const mainMatches = allMatches.filter(
    (match) => match.bracket_type === 'main' || !match.bracket_type
  )
  const firstRoundName = getMainFirstRoundName(mainMatches)
  if (!firstRoundName) return []

  const firstRoundCount = mainMatches.filter(
    (match) => match.round_name === firstRoundName
  ).length
  if (firstRoundCount === 0) return []

  return getConsolationRoundNames(Math.ceil(firstRoundCount / 2))
}

function getMainFirstRoundName(mainMatches) {
  const roundNames = [...new Set(mainMatches.map((match) => match.round_name).filter(Boolean))]
  for (const roundName of MAIN_ROUND_ORDER) {
    if (roundNames.includes(roundName)) return roundName
  }
  if (roundNames.includes('Round 1')) return 'Round 1'
  return roundNames.sort((a, b) => {
    const aIndex = MAIN_ROUND_ORDER.indexOf(a)
    const bIndex = MAIN_ROUND_ORDER.indexOf(b)
    return (aIndex === -1 ? 99 : aIndex) - (bIndex === -1 ? 99 : bIndex)
  })[0] || null
}

function getMatchLoserSide(match) {
  // Bye matches have only one player — they do not feed consolation
  if (!match?.winner_id) return null
  if (!match.player1_id || !match.player2_id) return null
  if (match.status !== 'completed' && match.status !== 'walkover') return null
  if (match.score === 'Bye') return null

  if (match.winner_id === match.player1_id) {
    return {
      playerId: match.player2_id,
      partnerId: match.player2_partner_id || null,
      sourceMatchId: match.id,
      bracketPosition: match.bracket_position
    }
  }

  if (match.winner_id === match.player2_id) {
    return {
      playerId: match.player1_id,
      partnerId: match.player1_partner_id || null,
      sourceMatchId: match.id,
      bracketPosition: match.bracket_position
    }
  }

  return null
}

function getMatchWinnerSide(match) {
  if (!match?.winner_id) return null
  if (match.status !== 'completed' && match.status !== 'walkover') return null

  if (match.winner_id === match.player1_id) {
    return {
      playerId: match.player1_id,
      partnerId: match.player1_partner_id || null,
      bracketPosition: match.bracket_position
    }
  }

  if (match.winner_id === match.player2_id) {
    return {
      playerId: match.player2_id,
      partnerId: match.player2_partner_id || null,
      bracketPosition: match.bracket_position
    }
  }

  return null
}

function isMatchFinished(match) {
  return (
    match &&
    (match.status === 'completed' ||
      match.status === 'walkover' ||
      match.status === 'cancelled')
  )
}

/**
 * Consolation Round 1 mirrors the main first round:
 * - Loser of match N plays loser of match N+1
 * - If N was a Bye: that player's first *real* loss (next main round) puts them into consol
 * - Until then the adjacent R1 loser waits as Pending (not auto-advanced via consol Bye)
 */
export async function syncConsolationMatches(eventId, dataAccess) {
  const { matchesApi, eventsApi } = dataAccess || (await import('./supabase.js'))

  const allMatches = await matchesApi.getByEvent(eventId)
  const event = await eventsApi.getById(eventId)

  // Completed events are historical records; never rewrite their brackets.
  if (event?.status === 'completed') {
    return allMatches.filter((match) => match.bracket_type === 'consolation')
  }

  const mainMatches = allMatches.filter(
    (match) => match.bracket_type === 'main' || !match.bracket_type
  )

  const firstRoundName = getMainFirstRoundName(mainMatches)
  if (!firstRoundName) {
    return allMatches.filter((match) => match.bracket_type === 'consolation')
  }

  const nextRoundName = getNextRoundName(firstRoundName)

  const firstRoundMatches = mainMatches
    .filter((match) => match.round_name === firstRoundName)
    .sort((a, b) => (a.bracket_position ?? a.match_number ?? 0) - (b.bracket_position ?? b.match_number ?? 0))

  const consolationRounds = getConsolationRoundNames(
    Math.ceil(firstRoundMatches.length / 2)
  )

  const existingConsolationR1 = allMatches.filter(
    (match) =>
      match.bracket_type === 'consolation' &&
      match.round_name === CONSOLATION_FIRST_ROUND_NAME
  )
  const existingByPosition = new Map(
    existingConsolationR1.map((match) => [match.bracket_position, match])
  )

  let matchNumber =
    Math.max(0, ...allMatches.map((match) => match.match_number || 0)) + 1

  const maxBracketPos = Math.max(
    0,
    ...firstRoundMatches.map((match) => match.bracket_position ?? 0)
  )

  const isMainByeMatch = (match) =>
    Boolean(match && (match.score === 'Bye' || !match.player1_id || !match.player2_id))

  for (let pairStart = 0; pairStart <= maxBracketPos; pairStart += 2) {
    const topMatch = firstRoundMatches.find((m) => m.bracket_position === pairStart)
    const bottomMatch = firstRoundMatches.find((m) => m.bracket_position === pairStart + 1)
    const consolationPosition = Math.floor(pairStart / 2)

    if (!topMatch || !bottomMatch) continue
    if (!isMatchFinished(topMatch) || !isMatchFinished(bottomMatch)) continue

    const topIsBye = isMainByeMatch(topMatch)
    const bottomIsBye = isMainByeMatch(bottomMatch)

    let topSide = getMatchLoserSide(topMatch)
    let bottomSide = getMatchLoserSide(bottomMatch)

    const nextMatch =
      nextRoundName &&
      mainMatches.find(
        (match) =>
          match.round_name === nextRoundName &&
          match.bracket_position === consolationPosition
      )

    // Bye recipients enter consol when they lose their first real match
    if (nextMatch && isMatchFinished(nextMatch)) {
      const nextLoser = getMatchLoserSide(nextMatch)
      const topWinner = getMatchWinnerSide(topMatch)
      const bottomWinner = getMatchWinnerSide(bottomMatch)

      if (
        nextLoser &&
        topIsBye &&
        topWinner &&
        nextLoser.playerId === topWinner.playerId
      ) {
        topSide = nextLoser
      }
      if (
        nextLoser &&
        bottomIsBye &&
        bottomWinner &&
        nextLoser.playerId === bottomWinner.playerId
      ) {
        bottomSide = nextLoser
      }
    }

    const existing = existingByPosition.get(consolationPosition)

    // Both consolation participants known → real consol match
    if (topSide?.playerId && bottomSide?.playerId) {
      const payload = {
        player1_id: topSide.playerId,
        player1_partner_id: topSide.partnerId,
        player2_id: bottomSide.playerId,
        player2_partner_id: bottomSide.partnerId,
        status: 'scheduled',
        score: null,
        winner_id: null,
        completed_at: null
      }

      if (!existing) {
        const created = await matchesApi.create({
          event_id: eventId,
          ...payload,
          round_name: CONSOLATION_FIRST_ROUND_NAME,
          bracket_type: 'consolation',
          match_number: matchNumber++,
          bracket_position: consolationPosition
        })
        existingByPosition.set(consolationPosition, created)
      } else if (
        existing.score === 'Bye' ||
        existing.status === 'walkover' ||
        !existing.player1_id ||
        !existing.player2_id ||
        existing.player1_id !== payload.player1_id ||
        existing.player2_id !== payload.player2_id
      ) {
        const priorByeWinner =
          existing.score === 'Bye' || existing.status === 'walkover'
            ? existing.winner_id
            : null

        // Upgrade premature consol Bye / Pending into the real pairing
        await matchesApi.update(existing.id, payload)

        // Undo advancement that came from a wrongly granted consol Bye
        if (priorByeWinner) {
          const nextConsolName = consolationRounds[1] || null
          if (nextConsolName) {
            const advanced = allMatches.filter(
              (match) =>
                match.bracket_type === 'consolation' &&
                match.round_name === nextConsolName &&
                match.status === 'scheduled' &&
                (match.player1_id === priorByeWinner ||
                  match.player2_id === priorByeWinner)
            )
            for (const match of advanced) {
              await matchesApi.update(match.id, {
                player1_id:
                  match.player1_id === priorByeWinner ? null : match.player1_id,
                player2_id:
                  match.player2_id === priorByeWinner ? null : match.player2_id
              })
            }
          }
        }
      }
      continue
    }

    // Only one side known so far (typical: R1 loser waiting on a bye player's next match)
    const knownTop = topSide?.playerId ? topSide : null
    const knownBottom = bottomSide?.playerId ? bottomSide : null
    if (!knownTop && !knownBottom) continue

    const byePlayerStillAliveInMain =
      nextMatch &&
      !isMatchFinished(nextMatch) &&
      ((topIsBye && getMatchWinnerSide(topMatch)) ||
        (bottomIsBye && getMatchWinnerSide(bottomMatch)))

    const byePlayerWonNext =
      nextMatch &&
      isMatchFinished(nextMatch) &&
      ((topIsBye &&
        getMatchWinnerSide(topMatch) &&
        getMatchWinnerSide(nextMatch)?.playerId ===
          getMatchWinnerSide(topMatch).playerId) ||
        (bottomIsBye &&
          getMatchWinnerSide(bottomMatch) &&
          getMatchWinnerSide(nextMatch)?.playerId ===
            getMatchWinnerSide(bottomMatch).playerId))

    if (byePlayerWonNext) {
      // Bye seed advanced — R1 loser takes a consol Bye instead
      const lone = knownTop || knownBottom
      const byePayload = {
        player1_id: lone.playerId,
        player1_partner_id: lone.partnerId,
        player2_id: null,
        player2_partner_id: null,
        status: 'walkover',
        score: 'Bye',
        winner_id: lone.playerId,
        completed_at: new Date().toISOString()
      }
      if (!existing) {
        const created = await matchesApi.create({
          event_id: eventId,
          ...byePayload,
          round_name: CONSOLATION_FIRST_ROUND_NAME,
          bracket_type: 'consolation',
          match_number: matchNumber++,
          bracket_position: consolationPosition
        })
        existingByPosition.set(consolationPosition, created)
      } else {
        await matchesApi.update(existing.id, byePayload)
      }
      continue
    }

    // Waiting for bye player's first real match — show Pending on the open side
    if (byePlayerStillAliveInMain || topIsBye || bottomIsBye) {
      const pendingPayload = {
        player1_id: knownTop?.playerId || null,
        player1_partner_id: knownTop?.partnerId || null,
        player2_id: knownBottom?.playerId || null,
        player2_partner_id: knownBottom?.partnerId || null,
        status: 'scheduled',
        score: null,
        winner_id: null,
        completed_at: null
      }

      if (!existing) {
        const created = await matchesApi.create({
          event_id: eventId,
          ...pendingPayload,
          round_name: CONSOLATION_FIRST_ROUND_NAME,
          bracket_type: 'consolation',
          match_number: matchNumber++,
          bracket_position: consolationPosition
        })
        existingByPosition.set(consolationPosition, created)
      } else if (existing.score === 'Bye' || existing.status === 'walkover') {
        // Undo premature consol Bye so seed can still drop in
        await matchesApi.update(existing.id, pendingPayload)
      } else {
        await matchesApi.update(existing.id, {
          player1_id: pendingPayload.player1_id ?? existing.player1_id,
          player1_partner_id:
            pendingPayload.player1_partner_id ?? existing.player1_partner_id,
          player2_id: pendingPayload.player2_id ?? existing.player2_id,
          player2_partner_id:
            pendingPayload.player2_partner_id ?? existing.player2_partner_id
        })
      }
    }
  }

  for (const roundName of consolationRounds.slice(0, -1)) {
    await syncNextRoundMatches(eventId, roundName, { matchesApi, eventsApi })
  }

  const refreshed = await matchesApi.getByEvent(eventId)
  return refreshed.filter((match) => match.bracket_type === 'consolation')
}

// Back-compat alias
export async function generateConsolationMatches(eventId) {
  return syncConsolationMatches(eventId)
}

/**
 * Progressively create/update the next round as soon as any feeding match has a winner.
 * Missing opponents stay null and display as "Pending".
 */
export async function syncNextRoundMatches(eventId, fromRoundName, dataAccess) {
  const { matchesApi, eventsApi } = dataAccess || (await import('./supabase.js'))

  const allMatches = await matchesApi.getByEvent(eventId)
  const event = await eventsApi.getById(eventId)

  // Completed events are historical records; never rewrite their brackets.
  if (event?.status === 'completed') return false

  const nextIsConsolation = fromRoundName.includes('Consolation')
  const nextRoundName = nextIsConsolation
    ? getNextConsolationRoundName(fromRoundName, allMatches)
    : getNextRoundName(fromRoundName)
  if (!nextRoundName) return false

  const bracketType = nextIsConsolation ? 'consolation' : 'main'

  const feeding = allMatches
    .filter((match) => {
      if (match.round_name !== fromRoundName) return false
      if (nextIsConsolation) return match.bracket_type === 'consolation'
      return match.bracket_type === 'main' || !match.bracket_type
    })
    .sort(
      (a, b) =>
        (a.bracket_position ?? a.match_number ?? 0) -
        (b.bracket_position ?? b.match_number ?? 0)
    )

  if (feeding.length === 0) return false

  const existingNext = allMatches.filter(
    (match) =>
      match.round_name === nextRoundName &&
      (nextIsConsolation
        ? match.bracket_type === 'consolation'
        : match.bracket_type === 'main' || !match.bracket_type)
  )
  const existingByPos = new Map(
    existingNext.map((match) => [match.bracket_position, match])
  )

  let matchNumber =
    Math.max(0, ...allMatches.map((match) => match.match_number || 0)) + 1
  let changed = false

  const maxPos = Math.max(
    ...feeding.map((match) => match.bracket_position ?? 0),
    0
  )

  for (let slot = 0; slot <= Math.floor(maxPos / 2); slot++) {
    const topMatch = feeding.find((match) => match.bracket_position === slot * 2)
    const bottomMatch = feeding.find(
      (match) => match.bracket_position === slot * 2 + 1
    )

    const topWinner = getMatchWinnerSide(topMatch)
    const bottomWinner = getMatchWinnerSide(bottomMatch)

    // Create/update once at least one feeder has a winner
    if (!topWinner && !bottomWinner) continue

    const existing = existingByPos.get(slot)
    if (!existing) {
      await matchesApi.create({
        event_id: eventId,
        player1_id: topWinner?.playerId || null,
        player1_partner_id: topWinner?.partnerId || null,
        player2_id: bottomWinner?.playerId || null,
        player2_partner_id: bottomWinner?.partnerId || null,
        round_name: nextRoundName,
        bracket_type: bracketType,
        // Stable relative to bracket slot so UI order never depends on bye timing
        match_number: matchNumber + slot,
        status: 'scheduled',
        bracket_position: slot
      })
      changed = true
    } else if (existing.status === 'scheduled') {
      const updates = {}
      if (topWinner && existing.player1_id !== topWinner.playerId) {
        updates.player1_id = topWinner.playerId
        if (event.event_type === 'doubles') {
          updates.player1_partner_id = topWinner.partnerId
        }
      }
      if (bottomWinner && existing.player2_id !== bottomWinner.playerId) {
        updates.player2_id = bottomWinner.playerId
        if (event.event_type === 'doubles') {
          updates.player2_partner_id = bottomWinner.partnerId
        }
      }
      if (Object.keys(updates).length > 0) {
        await matchesApi.update(existing.id, updates)
        changed = true
      }
    }
  }

  return changed
}

// Create / refresh next round matches after a result (progressive)
export async function createNextRoundMatches(eventId, completedRound, dataAccess) {
  try {
    return await syncNextRoundMatches(eventId, completedRound, dataAccess)
  } catch (error) {
    reportError('Error syncing next round matches', error)
    return false
  }
}

// Get the next main-draw round name
function getNextRoundName(currentRound) {
  const currentIndex = MAIN_ROUND_ORDER.indexOf(currentRound)
  if (currentIndex === -1 || currentIndex === MAIN_ROUND_ORDER.length - 1) {
    return null
  }

  return MAIN_ROUND_ORDER[currentIndex + 1]
}

// The consolation bracket is half the size of the main first round, so the round
// that follows depends on the draw and cannot be resolved from the name alone.
function getNextConsolationRoundName(currentRound, allMatches) {
  const sequence = getConsolationRoundNamesForMatches(allMatches)
  const currentIndex = sequence.indexOf(currentRound)
  if (currentIndex === -1 || currentIndex === sequence.length - 1) {
    return null
  }

  return sequence[currentIndex + 1]
}

// Rankings are derived from event_participants over the last 12 months.
// Kept as a no-op for callers that still invoke it after match results.
export async function updatePlayerStats() {
  return true
}
