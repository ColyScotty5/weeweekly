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
  
  // Sort participants by ranking (best players first for seeding)
  const sortedParticipants = [...participants].sort((a, b) => {
    const aRanking = a.player?.singles_ranking_points || 0
    const bRanking = b.player?.singles_ranking_points || 0
    return bRanking - aRanking // Higher ranking points = better player
  })
  
  // For singles, top 1/4 get seeded
  const maxSeeds = Math.floor(totalPlayers / 4)
  const actualSeeds = Math.min(maxSeeds, totalPlayers)
  
  // Assign seed positions to top players
  const seededPlayers = sortedParticipants.slice(0, actualSeeds).map((p, index) => ({
    ...p,
    seed_position: index + 1
  }))
  
  // Remaining players are unseeded
  const unseededPlayers = sortedParticipants.slice(actualSeeds)
  
  // Shuffle unseeded players
  const shuffledUnseeded = [...unseededPlayers].sort(() => Math.random() - 0.5)
  
  // Create bracket positions array
  const bracket = new Array(drawSize).fill(null)
  
  // Place seeded players in standard positions
  const seedPositions = getStandardSeedPositions(drawSize)
  for (let i = 0; i < seededPlayers.length; i++) {
    if (seedPositions[i] !== undefined) {
      bracket[seedPositions[i]] = seededPlayers[i]
    }
  }
  
  // Fill remaining positions with unseeded players
  let unseededIndex = 0
  for (let i = 0; i < drawSize && unseededIndex < shuffledUnseeded.length; i++) {
    if (bracket[i] === null) {
      bracket[i] = shuffledUnseeded[unseededIndex]
      unseededIndex++
    }
  }
  
  // Calculate number of byes (empty positions that advance automatically)
  const numberOfByes = drawSize - totalPlayers
  
  return {
    bracket,
    drawSize,
    totalPlayers,
    seededCount: actualSeeds,
    numberOfByes,
    firstRoundMatches: Math.floor((totalPlayers + 1) / 2) // Actual matches in first round
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

// Get standard seed positions for a draw (tennis tournament seeding)
function getStandardSeedPositions(drawSize) {
  const positions = []
  
  // Standard tennis seeding positions
  positions[0] = 0 // Seed 1 at position 0 (top)
  positions[1] = drawSize - 1 // Seed 2 at bottom
  
  if (drawSize >= 4) {
    positions[2] = Math.floor(drawSize / 2) - 1 // Seed 3
    positions[3] = Math.floor(drawSize / 2) // Seed 4
  }
  
  // For 8 seeds in larger draws
  if (drawSize >= 8) {
    positions[4] = Math.floor(drawSize / 4) - 1 // Seed 5
    positions[5] = Math.floor(drawSize / 4) // Seed 6
    positions[6] = Math.floor(3 * drawSize / 4) - 1 // Seed 7
    positions[7] = Math.floor(3 * drawSize / 4) // Seed 8
  }
  
  // For 16 seeds in very large draws
  if (drawSize >= 16) {
    const eighthSize = Math.floor(drawSize / 8)
    for (let i = 8; i < 16 && i < drawSize; i++) {
      const section = i - 8
      positions[i] = section * eighthSize + Math.floor(eighthSize / 2)
    }
  }
  
  return positions
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
  const { bracket, drawSize, totalPlayers } = draw
  
  // Generate first round matches only where both players exist
  let matchNumber = 1
  
  for (let i = 0; i < drawSize; i += 2) {
    const player1 = bracket[i]
    const player2 = bracket[i + 1]
    
    // Only create a match if both positions have players
    if (player1 && player2) {
      matches.push({
        event_id: eventId,
        player1_id: player1.player_id,
        player2_id: player2.player_id,
        round_name: getRoundName(drawSize, 1),
        bracket_type: 'main',
        match_number: matchNumber,
        status: 'scheduled',
        bracket_position: Math.floor(i / 2) // Track position in bracket for advancement
      })
      matchNumber++
    }
    // If only one player exists, they get a bye (automatic advancement)
    // We don't create a match for byes - they advance automatically
  }
  
  return matches
}

// Generate doubles matches
function generateDoublesMatches(eventId, draw) {
  const matches = []
  const { teams, drawSize } = draw
  let matchNumber = 1
  
  for (let i = 0; i < teams.length; i += 2) {
    const team1 = teams[i]
    const team2 = teams[i + 1]
    
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

// Generate consolation bracket matches from first round losers
export async function generateConsolationMatches(eventId) {
  const { matchesApi } = await import('./supabase.js')
  
  try {
    // Get all matches for the event
    const allMatches = await matchesApi.getByEvent(eventId)
    
    // Find first round matches that are completed
    const firstRoundMatches = allMatches.filter(match => 
      match.round_name.includes('Round of') || match.round_name === 'Round 1' || 
      (match.bracket_position !== undefined && match.bracket_position >= 0)
    ).filter(match => match.status === 'completed')
    
    if (firstRoundMatches.length === 0) {
      console.log('No completed first round matches found')
      return []
    }
    
    // Get losers from first round matches, maintaining bracket order
    const losers = []
    firstRoundMatches
      .sort((a, b) => a.bracket_position - b.bracket_position) // Sort by bracket position
      .forEach(match => {
        const loserId = match.winner_id === match.player1_id ? match.player2_id : match.player1_id
        if (loserId) {
          losers.push({
            playerId: loserId,
            originalBracketPosition: match.bracket_position
          })
        }
      })
    
    if (losers.length < 2) {
      console.log('Not enough losers to create consolation bracket')
      return []
    }
    
    // Check if consolation matches already exist
    const existingConsolationMatches = allMatches.filter(match => match.bracket_type === 'consolation')
    if (existingConsolationMatches.length > 0) {
      console.log('Consolation matches already exist')
      return existingConsolationMatches
    }
    
    // Create consolation bracket matches
    const consolationMatches = []
    const maxMatchNumber = Math.max(...allMatches.map(m => m.match_number || 0))
    let matchNumber = maxMatchNumber + 1
    
    // Pair losers: match 1 & 2 losers play each other, match 3 & 4 losers play each other, etc.
    for (let i = 0; i < losers.length; i += 2) {
      if (losers[i] && losers[i + 1]) {
        const consolationMatch = {
          event_id: eventId,
          player1_id: losers[i].playerId,
          player2_id: losers[i + 1].playerId,
          round_name: 'Consolation Round 1',
          bracket_type: 'consolation',
          match_number: matchNumber,
          status: 'scheduled',
          bracket_position: Math.floor(i / 2)
        }
        
        consolationMatches.push(consolationMatch)
        matchNumber++
      }
    }
    
    // Create the matches in the database
    console.log(`Creating ${consolationMatches.length} consolation matches`)
    const createdMatches = []
    for (const match of consolationMatches) {
      const createdMatch = await matchesApi.create(match)
      createdMatches.push(createdMatch)
    }
    
    return createdMatches
  } catch (error) {
    console.error('Error generating consolation matches:', error)
    throw error
  }
}

// Create next round matches when current round is complete
export async function createNextRoundMatches(eventId, completedRound) {
  const { matchesApi, eventsApi } = await import('./supabase.js')
  
  console.log(`Checking for next round creation after ${completedRound} completion`)
  
  try {
    // Get all matches for the event
    const allMatches = await matchesApi.getByEvent(eventId)
    const event = await eventsApi.getById(eventId)
    
    console.log(`Total matches in event: ${allMatches.length}`)
    
    // Check if this is a consolation round
    const isConsolationRound = completedRound.includes('Consolation')
    
    // Get completed matches from the current round
    const currentRoundMatches = allMatches.filter(m => 
      m.round_name === completedRound && m.status === 'completed'
    )
    
    // Check if all matches in current round are complete
    const allCurrentRoundMatches = allMatches.filter(m => m.round_name === completedRound)
    console.log(`${completedRound}: ${currentRoundMatches.length} completed out of ${allCurrentRoundMatches.length} total`)
    
    if (currentRoundMatches.length !== allCurrentRoundMatches.length) {
      console.log('Not all matches in round are complete yet')
      return false // Not all matches in round are complete
    }
    
    console.log(`All matches in ${completedRound} are complete! Creating next round...`)
    
    // Get winners from current round
    const winners = currentRoundMatches.map(match => ({
      winnerId: match.winner_id,
      bracketPosition: match.bracket_position
    }))
    
    // Add players with byes (who advanced automatically)
    const playersWithByes = await getPlayersWithByes(eventId, completedRound)
    winners.push(...playersWithByes)
    
    // Sort by bracket position to maintain proper bracket structure
    winners.sort((a, b) => a.bracketPosition - b.bracketPosition)
    
    // Create next round matches
    const nextRoundName = getNextRoundName(completedRound, isConsolationRound)
    if (!nextRoundName) return true // Tournament is complete
    
    // Check if next round matches already exist
    const existingNextRoundMatches = allMatches.filter(m => m.round_name === nextRoundName)
    if (existingNextRoundMatches.length > 0) {
      console.log('Next round matches already exist')
      return false
    }
    
    const nextRoundMatches = []
    // Get the highest match number from all matches to continue numbering
    const maxMatchNumber = Math.max(...allMatches.map(m => m.match_number || 0))
    let matchNumber = maxMatchNumber + 1
    
    for (let i = 0; i < winners.length; i += 2) {
      if (winners[i] && winners[i + 1]) {
        const match = {
          event_id: eventId,
          player1_id: winners[i].winnerId,
          player2_id: winners[i + 1].winnerId,
          round_name: nextRoundName,
          bracket_type: isConsolationRound ? 'consolation' : 'main',
          match_number: matchNumber,
          status: 'scheduled',
          bracket_position: Math.floor(i / 2)
        }
        
        // For doubles, we need to get partner information
        if (event.event_type === 'doubles') {
          const player1Match = currentRoundMatches.find(m => m.winner_id === winners[i].winnerId)
          const player2Match = currentRoundMatches.find(m => m.winner_id === winners[i + 1].winnerId)
          
          if (player1Match) {
            match.player1_partner_id = player1Match.winner_id === player1Match.player1_id 
              ? player1Match.player1_partner_id 
              : player1Match.player2_partner_id
          }
          
          if (player2Match) {
            match.player2_partner_id = player2Match.winner_id === player2Match.player1_id 
              ? player2Match.player1_partner_id 
              : player2Match.player2_partner_id
          }
        }
        
        nextRoundMatches.push(match)
        matchNumber++
      }
    }
    
    // Create the matches in the database
    console.log(`Creating ${nextRoundMatches.length} matches for ${nextRoundName}`)
    for (const match of nextRoundMatches) {
      console.log('Creating match:', match)
      await matchesApi.create(match)
    }
    
    console.log(`Successfully created ${nextRoundMatches.length} matches for ${nextRoundName}`)
    return true
  } catch (error) {
    console.error('Error creating next round matches:', error)
    return false
  }
}

// Get players who received byes in a round
async function getPlayersWithByes(eventId, roundName) {
  // This would need to be implemented based on how we track byes
  // For now, return empty array
  return []
}

// Get the next round name
function getNextRoundName(currentRound, isConsolationRound = false) {
  if (isConsolationRound) {
    // Handle consolation round progression
    if (currentRound === 'Consolation Round 1') {
      return 'Consolation Semi-Final'
    } else if (currentRound === 'Consolation Semi-Final') {
      return 'Consolation Final'
    } else if (currentRound === 'Consolation Final') {
      return null // Consolation tournament complete
    }
    return null
  }
  
  const roundOrder = [
    'Round of 64',
    'Round of 32', 
    'Round of 16',
    'Quarter-Final',
    'Semi-Final',
    'Final'
  ]
  
  const currentIndex = roundOrder.indexOf(currentRound)
  if (currentIndex === -1 || currentIndex === roundOrder.length - 1) {
    return null // No next round or tournament complete
  }
  
  return roundOrder[currentIndex + 1]
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
