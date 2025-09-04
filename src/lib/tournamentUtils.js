// Tournament utility functions for draw generation and points calculation

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
      winner: 14,
      runner_up: 12,
      semi_final: 8,
      quarter_final: 5,
      round_16: 3,
      round_32: 2
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
      winner: 14,
      runner_up: 12,
      semi_final: 8,
      quarter_final: 5,
      round_16: 3,
      round_32: 2
    }
  }
}

// Generate singles draw
export function generateSinglesDraw(participants) {
  const totalPlayers = participants.length
  
  // Find the next power of 2 that accommodates all players
  const drawSize = Math.pow(2, Math.ceil(Math.log2(totalPlayers)))
  
  // Separate seeded and unseeded players
  const seededPlayers = participants.filter(p => p.seed_position).sort((a, b) => a.seed_position - b.seed_position)
  const unseededPlayers = participants.filter(p => !p.seed_position)
  
  // For singles, top 1/4 get seeded
  const maxSeeds = Math.floor(totalPlayers / 4)
  const actualSeeds = Math.min(seededPlayers.length, maxSeeds)
  
  // Shuffle unseeded players
  const shuffledUnseeded = [...unseededPlayers].sort(() => Math.random() - 0.5)
  
  // Create draw positions
  const draw = new Array(drawSize).fill(null)
  
  // Place seeded players in standard seeded positions
  const seedPositions = getSeedPositions(drawSize, actualSeeds)
  for (let i = 0; i < actualSeeds; i++) {
    if (seededPlayers[i]) {
      draw[seedPositions[i]] = seededPlayers[i]
    }
  }
  
  // Fill remaining positions with unseeded players
  let unseededIndex = 0
  for (let i = 0; i < drawSize && unseededIndex < shuffledUnseeded.length; i++) {
    if (draw[i] === null) {
      draw[i] = shuffledUnseeded[unseededIndex]
      unseededIndex++
    }
  }
  
  return {
    draw: draw.filter(p => p !== null), // Remove empty slots
    drawSize,
    totalPlayers,
    seededCount: actualSeeds
  }
}

// Generate doubles draw with partner assignments
export function generateDoublesDraw(participants) {
  const totalPlayers = participants.length
  
  // For doubles, half get seeded, half get randomly assigned as partners
  const seededPlayers = participants.filter(p => p.seed_position).sort((a, b) => a.seed_position - b.seed_position)
  const unseededPlayers = participants.filter(p => !p.seed_position)
  
  const maxSeeds = Math.floor(totalPlayers / 2)
  const actualSeeds = Math.min(seededPlayers.length, maxSeeds)
  
  // Shuffle unseeded players for partner assignment
  const shuffledUnseeded = [...unseededPlayers].sort(() => Math.random() - 0.5)
  
  // Create teams by pairing seeded players with unseeded players
  const teams = []
  
  for (let i = 0; i < actualSeeds; i++) {
    if (seededPlayers[i] && shuffledUnseeded[i]) {
      teams.push({
        player1: seededPlayers[i],
        player2: shuffledUnseeded[i],
        seed_position: seededPlayers[i].seed_position
      })
    }
  }
  
  // If there are remaining unseeded players, pair them up
  const remainingUnseeded = shuffledUnseeded.slice(actualSeeds)
  for (let i = 0; i < remainingUnseeded.length - 1; i += 2) {
    teams.push({
      player1: remainingUnseeded[i],
      player2: remainingUnseeded[i + 1],
      seed_position: null
    })
  }
  
  const drawSize = Math.pow(2, Math.ceil(Math.log2(teams.length)))
  
  return {
    teams,
    drawSize,
    totalTeams: teams.length,
    seededCount: actualSeeds
  }
}

// Get standard seed positions for a draw
function getSeedPositions(drawSize, seedCount) {
  const positions = []
  
  // Standard seeding positions
  if (seedCount >= 1) positions.push(0) // Seed 1 at top
  if (seedCount >= 2) positions.push(drawSize - 1) // Seed 2 at bottom
  if (seedCount >= 3) positions.push(Math.floor(drawSize / 2) - 1) // Seed 3
  if (seedCount >= 4) positions.push(Math.floor(drawSize / 2)) // Seed 4
  
  // For more seeds, distribute them evenly
  if (seedCount > 4) {
    const sectionSize = drawSize / seedCount
    for (let i = 4; i < seedCount; i++) {
      positions.push(Math.floor(i * sectionSize))
    }
  }
  
  return positions.slice(0, seedCount)
}

// Generate matches for a draw
export function generateMatches(eventId, draw, eventType = 'singles') {
  const matches = []
  const drawSize = draw.drawSize || draw.teams?.length || draw.draw?.length
  
  if (eventType === 'singles') {
    const players = draw.draw
    
    // Generate first round matches
    for (let i = 0; i < players.length - 1; i += 2) {
      if (players[i] && players[i + 1]) {
        matches.push({
          event_id: eventId,
          player1_id: players[i].player_id,
          player2_id: players[i + 1].player_id,
          round_name: getRoundName(drawSize, 1),
          bracket_type: 'main',
          match_number: Math.floor(i / 2) + 1,
          status: 'scheduled'
        })
      }
    }
  } else {
    const teams = draw.teams
    
    // Generate first round matches for doubles
    for (let i = 0; i < teams.length - 1; i += 2) {
      if (teams[i] && teams[i + 1]) {
        matches.push({
          event_id: eventId,
          player1_id: teams[i].player1.player_id,
          player1_partner_id: teams[i].player2.player_id,
          player2_id: teams[i + 1].player1.player_id,
          player2_partner_id: teams[i + 1].player2.player_id,
          round_name: getRoundName(drawSize, 1),
          bracket_type: 'main',
          match_number: Math.floor(i / 2) + 1,
          status: 'scheduled'
        })
      }
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

// Update player statistics after a tournament
export async function updatePlayerStats(playerId, newResults, eventType) {
  const { playersApi, resultsApi } = await import('./supabase.js')
  
  try {
    // Get current player data
    const player = await playersApi.getById(playerId)
    
    // Get all results for this player
    const allResults = await resultsApi.getByPlayer(playerId)
    
    // Calculate new totals
    const singlesResults = allResults.filter(r => r.match?.event?.event_type === 'singles')
    const doublesResults = allResults.filter(r => r.match?.event?.event_type === 'doubles')
    
    const totalSinglesPoints = singlesResults.reduce((sum, r) => sum + r.points_earned, 0)
    const totalDoublesPoints = doublesResults.reduce((sum, r) => sum + r.points_earned, 0)
    
    const singlesEvents = new Set(singlesResults.map(r => r.match?.event?.id)).size
    const doublesEvents = new Set(doublesResults.map(r => r.match?.event?.id)).size
    
    const singlesRankingPoints = calculateRankingPoints(singlesResults, 'singles')
    const doublesRankingPoints = calculateRankingPoints(doublesResults, 'doubles')
    
    // Update player stats
    await playersApi.updateStats(playerId, {
      total_singles_points: totalSinglesPoints,
      total_doubles_points: totalDoublesPoints,
      singles_events_played: singlesEvents,
      doubles_events_played: doublesEvents,
      singles_ranking_points: singlesRankingPoints,
      doubles_ranking_points: doublesRankingPoints
    })
    
    return true
  } catch (error) {
    console.error('Error updating player stats:', error)
    return false
  }
}
