import { createClient } from '@supabase/supabase-js'
import { compareLeaderboardEntries } from './tournamentUtils.js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co'
// Prefer newer publishable key name; fall back to legacy anon key env var
const supabaseKey =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  'placeholder-key'

if (
  !import.meta.env.VITE_SUPABASE_URL ||
  (!import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY && !import.meta.env.VITE_SUPABASE_ANON_KEY)
) {
  console.warn('⚠️  Supabase environment variables not set. Please create a .env file with your Supabase credentials.')
}

export const supabase = createClient(supabaseUrl, supabaseKey)

const PLAYER_FIELDS = 'id, name'
const TOURNAMENT_FIELDS = 'id, name, tournament_date, status, description, created_at, updated_at'
const EVENT_FIELDS = 'id, tournament_id, event_type, max_participants, status, draw_structure, created_at, updated_at'
const PARTICIPANT_FIELDS = `
  id,
  event_id,
  player_id,
  partner_id,
  seed_position,
  status,
  registered_at,
  points_earned,
  player:players!event_participants_player_id_fkey(${PLAYER_FIELDS}),
  partner:players!event_participants_partner_id_fkey(${PLAYER_FIELDS})
`
const MATCH_FIELDS = `
  id,
  event_id,
  player1_id,
  player2_id,
  player1_partner_id,
  player2_partner_id,
  round_name,
  bracket_type,
  match_number,
  bracket_position,
  status,
  score,
  winner_id,
  scheduled_time,
  completed_at,
  created_at,
  player1:players!matches_player1_id_fkey(${PLAYER_FIELDS}),
  player2:players!matches_player2_id_fkey(${PLAYER_FIELDS}),
  player1_partner:players!matches_player1_partner_id_fkey(${PLAYER_FIELDS}),
  player2_partner:players!matches_player2_partner_id_fkey(${PLAYER_FIELDS}),
  winner:players!matches_winner_id_fkey(${PLAYER_FIELDS})
`
const RESULT_FIELDS = 'id, match_id, player_id, points_earned, result_type, created_at'

/** CD / rank points for the rolling leaderboard */
export function computeRankMetrics(totalPoints, eventsPlayed) {
  const cd = eventsPlayed > 0 ? 1.5 + eventsPlayed * 0.5 : 0
  const rankPoints = cd > 0 ? totalPoints / cd : 0
  return { cd, rankPoints }
}

export { compareLeaderboardEntries }

// Rolling rankings are calculated server-side and return public, non-PII fields only.
export const rankingsApi = {
  async getRollingLeaderboard(eventType = 'singles', withinMonths = 12) {
    const { data, error } = await supabase.rpc('get_public_leaderboard', {
      requested_event_type: eventType,
      within_months: withinMonths
    })
    if (error) throw error
    return (data || []).map((player) => ({
      id: player.id,
      name: player.name,
      totalPoints: Number(player.total_points) || 0,
      eventsPlayed: Number(player.events_played) || 0,
      cd: Number(player.cd) || 0,
      rankPoints: Number(player.rank_points) || 0,
      rank: Number(player.rank) || null,
      isRanked: Number(player.events_played) > 0
    }))
  },

  async getMap(eventType = 'singles', withinMonths = 12) {
    const list = await this.getRollingLeaderboard(eventType, withinMonths)
    return new Map(list.map((player) => [String(player.id), player]))
  }
}

// Players table operations
export const playersApi = {
  // Get all players
  async getAll() {
    const { data, error } = await supabase
      .from('players')
      .select(PLAYER_FIELDS)
      .order('name')
    
    if (error) throw error
    return data
  },

  // Players merged with rolling ranking stats (sorted by rank points)
  async getAllWithRankings(eventType = 'singles') {
    const [players, leaderboard] = await Promise.all([
      this.getAll(),
      rankingsApi.getRollingLeaderboard(eventType)
    ])
    const byId = new Map(leaderboard.map((entry) => [String(entry.id), entry]))

    return players
      .map((player) => {
        const ranked = byId.get(String(player.id))
        return {
          ...player,
          totalPoints: ranked?.totalPoints || 0,
          eventsPlayed: ranked?.eventsPlayed || 0,
          cd: ranked?.cd || 0,
          rankPoints: ranked?.rankPoints || 0,
          rank: ranked?.rank || null,
          isRanked: ranked?.isRanked || false
        }
      })
      .sort(compareLeaderboardEntries)
  },

  // Get player by ID
  async getById(id) {
    const { data, error } = await supabase
      .from('players')
      .select(PLAYER_FIELDS)
      .eq('id', id)
      .single()
    
    if (error) throw error
    return data
  },

  // Create new player
  async create(player) {
    const { data, error } = await supabase
      .from('players')
      .insert([player])
      .select(PLAYER_FIELDS)
      .single()
    
    if (error) throw error
    return data
  },

  // Update player
  async update(id, updates) {
    const { data, error } = await supabase
      .from('players')
      .update(updates)
      .eq('id', id)
      .select(PLAYER_FIELDS)
      .single()
    
    if (error) throw error
    return data
  },

  // Delete player
  async delete(id) {
    const { error } = await supabase
      .from('players')
      .delete()
      .eq('id', id)
    
    if (error) throw error
  }
}

// Tournaments table operations
export const tournamentsApi = {
  // Get all tournaments
  async getAll() {
    const { data, error } = await supabase
      .from('tournaments')
      .select(`
        id,
        name,
        tournament_date,
        status,
        description,
        created_at,
        updated_at,
        events (
          id,
          tournament_id,
          event_type,
          max_participants,
          status,
          draw_structure,
          created_at,
          updated_at,
          event_participants (
            id,
            player_id
          )
        )
      `)
      .order('tournament_date', { ascending: false })
    
    if (error) throw error
    return data
  },

  async getPublic() {
    const { data, error } = await supabase.rpc('get_public_tournaments')
    if (error) throw error
    return data || []
  },

  // Get tournament by ID with events
  async getById(id) {
    const { data, error } = await supabase
      .from('tournaments')
      .select(`
        id,
        name,
        tournament_date,
        status,
        description,
        created_at,
        updated_at,
        events (
          id,
          tournament_id,
          event_type,
          max_participants,
          status,
          draw_structure,
          created_at,
          updated_at,
          event_participants (${PARTICIPANT_FIELDS})
        )
      `)
      .eq('id', id)
      .single()
    
    if (error) throw error
    return data
  },

  // Create new tournament
  async create(tournament) {
    const { data, error } = await supabase
      .from('tournaments')
      .insert([tournament])
      .select(TOURNAMENT_FIELDS)
      .single()
    
    if (error) throw error
    return data
  },

  // Update tournament
  async update(id, updates) {
    const { data, error } = await supabase
      .from('tournaments')
      .update(updates)
      .eq('id', id)
      .select(TOURNAMENT_FIELDS)
      .single()
    
    if (error) throw error
    return data
  },

  // Delete tournament
  async delete(id) {
    const { error } = await supabase
      .from('tournaments')
      .delete()
      .eq('id', id)
    
    if (error) throw error
  }
}

// Events table operations
export const eventsApi = {
  // Get all events for a tournament
  async getByTournament(tournamentId) {
    const { data, error } = await supabase
      .from('events')
      .select(`
        id,
        tournament_id,
        event_type,
        max_participants,
        status,
        draw_structure,
        created_at,
        updated_at,
        tournament:tournaments(id, name, tournament_date, status, description),
        event_participants (${PARTICIPANT_FIELDS})
      `)
      .eq('tournament_id', tournamentId)
    
    if (error) throw error
    return data
  },

  // Get event by ID
  async getById(id) {
    const { data, error } = await supabase
      .from('events')
      .select(`
        id,
        tournament_id,
        event_type,
        max_participants,
        status,
        draw_structure,
        created_at,
        updated_at,
        tournament:tournaments(id, name, tournament_date, status, description),
        event_participants (${PARTICIPANT_FIELDS}),
        matches (${MATCH_FIELDS})
      `)
      .eq('id', id)
      .single()
    
    if (error) throw error
    return data
  },

  // Create new event
  async create(event) {
    const { data, error } = await supabase
      .from('events')
      .insert([event])
      .select(EVENT_FIELDS)
      .single()
    
    if (error) throw error
    return data
  },

  // Update event
  async update(id, updates) {
    const { data, error } = await supabase
      .from('events')
      .update(updates)
      .eq('id', id)
      .select(EVENT_FIELDS)
      .single()
    
    if (error) throw error
    return data
  },

  // Delete event
  async delete(id) {
    const { error } = await supabase
      .from('events')
      .delete()
      .eq('id', id)
    
    if (error) throw error
  }
}

// Event participants operations
export const participantsApi = {
  // Register player for event
  async register(eventId, playerId, partnerId = null, seedPosition = null) {
    const { data, error } = await supabase
      .from('event_participants')
      .insert([{
        event_id: eventId,
        player_id: playerId,
        partner_id: partnerId,
        seed_position: seedPosition
      }])
      .select(PARTICIPANT_FIELDS)
      .single()
    
    if (error) throw error
    return data
  },

  // Get participants for an event
  async getByEvent(eventId) {
    const { data, error } = await supabase
      .from('event_participants')
      .select(PARTICIPANT_FIELDS)
      .eq('event_id', eventId)
      .order('seed_position', { ascending: true, nullsLast: true })
    
    if (error) throw error
    return data
  },

  // Update participant status
  async updateStatus(id, status) {
    const { data, error } = await supabase
      .from('event_participants')
      .update({ status })
      .eq('id', id)
      .select(PARTICIPANT_FIELDS)
      .single()
    
    if (error) throw error
    return data
  },

  // Update participant fields (seed, points, status, etc.)
  async update(id, updates) {
    const { data, error } = await supabase
      .from('event_participants')
      .update(updates)
      .eq('id', id)
      .select(PARTICIPANT_FIELDS)
      .single()

    if (error) throw error
    return data
  },

  // Remove participant
  async remove(id) {
    const { error } = await supabase
      .from('event_participants')
      .delete()
      .eq('id', id)
    
    if (error) throw error
  }
}

// Matches operations
export const matchesApi = {
  // Get matches for an event
  async getByEvent(eventId) {
    const { data, error } = await supabase
      .from('matches')
      .select(MATCH_FIELDS)
      .eq('event_id', eventId)
      .order('match_number')
    
    if (error) throw error
    return data
  },

  // Create new match
  async create(match) {
    const { data, error } = await supabase
      .from('matches')
      .insert([match])
      .select(MATCH_FIELDS)
      .single()
    
    if (error) throw error
    return data
  },

  // Update match (general update method)
  async update(id, updates) {
    const { data, error } = await supabase
      .from('matches')
      .update(updates)
      .eq('id', id)
      .select(MATCH_FIELDS)
      .single()
    
    if (error) throw error
    return data
  },

  // Update match result (legacy method for backwards compatibility)
  async updateResult(id, result) {
    const { data, error } = await supabase
      .from('matches')
      .update({
        status: 'completed',
        score: result.score,
        winner_id: result.winner_id,
        completed_at: new Date().toISOString()
      })
      .eq('id', id)
      .select(MATCH_FIELDS)
      .single()
    
    if (error) throw error
    return data
  },

  // Delete match
  async delete(id) {
    const { error } = await supabase
      .from('matches')
      .delete()
      .eq('id', id)
    
    if (error) throw error
  },

  // Delete all matches (and their results) for an event — used by Reset Draw
  async deleteByEvent(eventId) {
    const matches = await this.getByEvent(eventId)
    const matchIds = (matches || []).map((match) => match.id).filter(Boolean)

    if (matchIds.length > 0) {
      const { error: resultsError } = await supabase
        .from('match_results')
        .delete()
        .in('match_id', matchIds)

      if (resultsError) throw resultsError
    }

    const { error } = await supabase
      .from('matches')
      .delete()
      .eq('event_id', eventId)

    if (error) throw error
    return matchIds.length
  }
}

// Match results operations
export const resultsApi = {
  // Record match results (points for players)
  async recordResults(matchId, results) {
    const { data, error } = await supabase
      .from('match_results')
      .insert(results.map(result => ({
        match_id: matchId,
        player_id: result.player_id,
        points_earned: result.points_earned,
        result_type: result.result_type
      })))
      .select(RESULT_FIELDS)
    
    if (error) throw error
    return data
  },

  // Get results for a player
  async getByPlayer(playerId) {
    const { data, error } = await supabase
      .from('match_results')
      .select(`
        ${RESULT_FIELDS},
        match:matches(
          id,
          event_id,
          round_name,
          bracket_type,
          status,
          score,
          winner_id,
          completed_at,
          event:events(
            id,
            event_type,
            status,
            tournament:tournaments(id, name, tournament_date, status)
          )
        )
      `)
      .eq('player_id', playerId)
      .order('created_at', { ascending: false })
    
    if (error) throw error
    return data
  },

  // Get results for an event
  async getByEvent(eventId) {
    const { data, error } = await supabase
      .from('match_results')
      .select(`
        ${RESULT_FIELDS},
        player:players(${PLAYER_FIELDS}),
        match:matches(id, event_id, round_name, bracket_type, status, score, winner_id, completed_at)
      `)
      .eq('match.event_id', eventId)
    
    if (error) throw error
    return data
  }
} 