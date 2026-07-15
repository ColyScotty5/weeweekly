import { createClient } from '@supabase/supabase-js'

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

/** CD / rank points for the rolling leaderboard */
export function computeRankMetrics(totalPoints, eventsPlayed) {
  const cd = eventsPlayed > 0 ? 1.5 + eventsPlayed * 0.5 : 0
  const rankPoints = cd > 0 ? totalPoints / cd : 0
  return { cd, rankPoints }
}

function cutoffDateISO(withinMonths = 12) {
  const cutoff = new Date()
  cutoff.setMonth(cutoff.getMonth() - withinMonths)
  return cutoff.toISOString().slice(0, 10)
}

// Rolling rankings from event_participants.points_earned (last 12 months by default)
export const rankingsApi = {
  async getRollingLeaderboard(eventType = 'singles', withinMonths = 12) {
    const cutoffStr = cutoffDateISO(withinMonths)

    const { data, error } = await supabase
      .from('event_participants')
      .select(`
        player_id,
        points_earned,
        player:players!event_participants_player_id_fkey(id, name, email),
        event:events!event_participants_event_id_fkey(
          id,
          event_type,
          tournament:tournaments!events_tournament_id_fkey(tournament_date)
        )
      `)

    if (error) throw error

    const aggregated = new Map()
    for (const row of data || []) {
      if (!row.event || row.event.event_type !== eventType) continue
      const tournamentDate = row.event.tournament?.tournament_date
      if (!tournamentDate || tournamentDate < cutoffStr) continue
      const player = row.player
      if (!player) continue

      const current = aggregated.get(player.id) || {
        id: player.id,
        name: player.name,
        email: player.email,
        totalPoints: 0,
        eventsPlayed: 0
      }
      current.totalPoints += row.points_earned || 0
      current.eventsPlayed += 1
      aggregated.set(player.id, current)
    }

    const list = [...aggregated.values()].map((player) => {
      const { cd, rankPoints } = computeRankMetrics(player.totalPoints, player.eventsPlayed)
      return {
        ...player,
        cd,
        rankPoints,
        isRanked: player.eventsPlayed > 0
      }
    })

    list.sort(
      (a, b) =>
        b.rankPoints - a.rankPoints ||
        b.totalPoints - a.totalPoints ||
        a.name.localeCompare(b.name)
    )

    let currentRank = 1
    for (let i = 0; i < list.length; i++) {
      if (i > 0 && list[i].rankPoints < list[i - 1].rankPoints) {
        currentRank = i + 1
      }
      list[i].rank = currentRank
    }

    return list
  },

  async getMap(eventType = 'singles', withinMonths = 12) {
    const list = await this.getRollingLeaderboard(eventType, withinMonths)
    return new Map(list.map((player) => [player.id, player]))
  }
}

// Players table operations
export const playersApi = {
  // Get all players
  async getAll() {
    const { data, error } = await supabase
      .from('players')
      .select('*')
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
    const byId = new Map(leaderboard.map((entry) => [entry.id, entry]))

    return players
      .map((player) => {
        const ranked = byId.get(player.id)
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
      .sort(
        (a, b) =>
          b.rankPoints - a.rankPoints ||
          b.totalPoints - a.totalPoints ||
          a.name.localeCompare(b.name)
      )
  },

  // Get player by ID
  async getById(id) {
    const { data, error } = await supabase
      .from('players')
      .select('*')
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
      .select()
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
      .select()
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
        *,
        events (
          *,
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

  // Get tournament by ID with events
  async getById(id) {
    const { data, error } = await supabase
      .from('tournaments')
      .select(`
        *,
        events (
          *,
          event_participants (
            *,
            player:players!event_participants_player_id_fkey(*),
            partner:players!event_participants_partner_id_fkey(*)
          )
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
      .select()
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
      .select()
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
        *,
        tournament:tournaments(*),
        event_participants (
          *,
          player:players!event_participants_player_id_fkey(*),
          partner:players!event_participants_partner_id_fkey(*)
        )
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
        *,
        tournament:tournaments(*),
        event_participants (
          *,
          player:players!event_participants_player_id_fkey(*),
          partner:players!event_participants_partner_id_fkey(*)
        ),
        matches (
          *,
          player1:players!matches_player1_id_fkey(*),
          player2:players!matches_player2_id_fkey(*),
          player1_partner:players!matches_player1_partner_id_fkey(*),
          player2_partner:players!matches_player2_partner_id_fkey(*),
          winner:players!matches_winner_id_fkey(*)
        )
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
      .select()
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
      .select()
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
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  // Get participants for an event
  async getByEvent(eventId) {
    const { data, error } = await supabase
      .from('event_participants')
      .select(`
        *,
        player:players!event_participants_player_id_fkey(*),
        partner:players!event_participants_partner_id_fkey(*)
      `)
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
      .select()
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
      .select()
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
      .select(`
        *,
        player1:players!matches_player1_id_fkey(*),
        player2:players!matches_player2_id_fkey(*),
        player1_partner:players!matches_player1_partner_id_fkey(*),
        player2_partner:players!matches_player2_partner_id_fkey(*),
        winner:players!matches_winner_id_fkey(*)
      `)
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
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  // Update match (general update method)
  async update(id, updates) {
    console.log('matchesApi.update called with:', { id, updates })
    
    const { data, error } = await supabase
      .from('matches')
      .update(updates)
      .eq('id', id)
      .select(`
        *,
        player1:players!matches_player1_id_fkey(*),
        player2:players!matches_player2_id_fkey(*),
        player1_partner:players!matches_player1_partner_id_fkey(*),
        player2_partner:players!matches_player2_partner_id_fkey(*),
        winner:players!matches_winner_id_fkey(*)
      `)
      .single()
    
    if (error) {
      console.error('Supabase update error:', error)
      throw error
    }
    
    console.log('matchesApi.update successful:', data)
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
      .select()
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
      .select()
    
    if (error) throw error
    return data
  },

  // Get results for a player
  async getByPlayer(playerId) {
    const { data, error } = await supabase
      .from('match_results')
      .select(`
        *,
        match:matches(
          *,
          event:events(
            *,
            tournament:tournaments(*)
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
        *,
        player:players(*),
        match:matches(*)
      `)
      .eq('match.event_id', eventId)
    
    if (error) throw error
    return data
  }
} 