import { useState, useEffect } from 'preact/hooks'
import { matchesApi } from '../lib/supabase.js'

export default function TournamentBracket({ event, onMatchUpdate }) {
  const [matches, setMatches] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (event?.id) {
      loadMatches()
    }
  }, [event?.id])

  const loadMatches = async () => {
    setLoading(true)
    try {
      const data = await matchesApi.getByEvent(event.id)
      setMatches(data)
    } catch (error) {
      console.error('Error loading matches:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '20px' }}>Loading bracket...</div>
  }

  if (!matches.length) {
    return (
      <div style={{ textAlign: 'center', padding: '20px', color: '#666' }}>
        No bracket generated yet. Generate a draw to see the tournament bracket.
      </div>
    )
  }

  // Group matches by round
  const matchesByRound = groupMatchesByRound(matches)
  const rounds = Object.keys(matchesByRound).sort((a, b) => getRoundOrder(a) - getRoundOrder(b))

  return (
    <div style={{ padding: '20px' }}>
      <h3>Tournament Bracket - {event.event_type?.charAt(0).toUpperCase() + event.event_type?.slice(1)}</h3>
      
      <div style={{ 
        display: 'flex', 
        gap: '30px', 
        overflowX: 'auto', 
        paddingBottom: '20px',
        minHeight: '400px'
      }}>
        {rounds.map(round => (
          <RoundColumn
            key={round}
            round={round}
            matches={matchesByRound[round]}
            eventType={event.event_type}
            onMatchUpdate={onMatchUpdate}
          />
        ))}
      </div>

      {/* Legend */}
      <div style={{ 
        marginTop: '20px', 
        padding: '15px', 
        backgroundColor: '#f8f9fa', 
        borderRadius: '4px',
        fontSize: '0.9em'
      }}>
        <strong>Legend:</strong>
        <div style={{ display: 'flex', gap: '20px', marginTop: '8px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <div style={{ width: '12px', height: '12px', backgroundColor: '#e3f2fd', border: '1px solid #ddd' }}></div>
            Scheduled
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <div style={{ width: '12px', height: '12px', backgroundColor: '#fff3cd', border: '1px solid #ddd' }}></div>
            In Progress
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <div style={{ width: '12px', height: '12px', backgroundColor: '#d4edda', border: '1px solid #ddd' }}></div>
            Completed
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <div style={{ width: '12px', height: '12px', backgroundColor: '#f8d7da', border: '1px solid #ddd' }}></div>
            Walkover/Cancelled
          </div>
        </div>
      </div>
    </div>
  )
}

function RoundColumn({ round, matches, eventType, onMatchUpdate }) {
  return (
    <div style={{ minWidth: '250px' }}>
      <h4 style={{ 
        textAlign: 'center', 
        marginBottom: '20px',
        padding: '8px',
        backgroundColor: '#007bff',
        color: 'white',
        borderRadius: '4px',
        margin: '0 0 20px 0'
      }}>
        {round}
      </h4>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        {matches.map(match => (
          <MatchCard
            key={match.id}
            match={match}
            eventType={eventType}
            onUpdate={onMatchUpdate}
          />
        ))}
      </div>
    </div>
  )
}

function MatchCard({ match, eventType, onUpdate }) {
  const getPlayerDisplay = (player, partner = null) => {
    if (!player) return 'TBD'
    return partner ? `${player.name} / ${partner.name}` : player.name
  }

  const getMatchBackgroundColor = (status, winnerId, playerId) => {
    if (status === 'completed') {
      return winnerId === playerId ? '#d4edda' : '#f8f9fa'
    }
    switch (status) {
      case 'in_progress': return '#fff3cd'
      case 'scheduled': return '#e3f2fd'
      case 'walkover':
      case 'cancelled': return '#f8d7da'
      default: return 'white'
    }
  }

  const getStatusBadgeColor = (status) => {
    switch (status) {
      case 'scheduled': return '#17a2b8'
      case 'in_progress': return '#ffc107'
      case 'completed': return '#28a745'
      case 'walkover': return '#fd7e14'
      case 'cancelled': return '#6c757d'
      default: return '#6c757d'
    }
  }

  return (
    <div style={{
      border: '2px solid #ddd',
      borderRadius: '8px',
      backgroundColor: 'white',
      minHeight: '120px',
      position: 'relative'
    }}>
      {/* Match header */}
      <div style={{
        padding: '8px 12px',
        backgroundColor: '#f8f9fa',
        borderBottom: '1px solid #ddd',
        borderRadius: '6px 6px 0 0',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <span style={{ fontSize: '0.85em', fontWeight: 'bold' }}>
          Match {match.match_number}
        </span>
        <span style={{
          padding: '2px 6px',
          borderRadius: '4px',
          fontSize: '0.75em',
          backgroundColor: getStatusBadgeColor(match.status),
          color: 'white'
        }}>
          {match.status}
        </span>
      </div>

      {/* Player 1 */}
      <div style={{
        padding: '10px 12px',
        backgroundColor: getMatchBackgroundColor(match.status, match.winner_id, match.player1_id),
        borderBottom: '1px solid #eee',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div>
          <div style={{ fontWeight: match.winner_id === match.player1_id ? 'bold' : 'normal' }}>
            {getPlayerDisplay(match.player1, match.player1_partner)}
          </div>
          {match.player1 && (
            <div style={{ fontSize: '0.75em', color: '#666' }}>
              Rank: {eventType === 'singles' 
                ? match.player1.singles_ranking_points?.toFixed(1) || '0.0'
                : match.player1.doubles_ranking_points?.toFixed(1) || '0.0'
              }
            </div>
          )}
        </div>
        {match.winner_id === match.player1_id && (
          <div style={{ color: '#28a745', fontWeight: 'bold', fontSize: '1.2em' }}>✓</div>
        )}
      </div>

      {/* Player 2 */}
      <div style={{
        padding: '10px 12px',
        backgroundColor: getMatchBackgroundColor(match.status, match.winner_id, match.player2_id),
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div>
          <div style={{ fontWeight: match.winner_id === match.player2_id ? 'bold' : 'normal' }}>
            {getPlayerDisplay(match.player2, match.player2_partner)}
          </div>
          {match.player2 && (
            <div style={{ fontSize: '0.75em', color: '#666' }}>
              Rank: {eventType === 'singles' 
                ? match.player2.singles_ranking_points?.toFixed(1) || '0.0'
                : match.player2.doubles_ranking_points?.toFixed(1) || '0.0'
              }
            </div>
          )}
        </div>
        {match.winner_id === match.player2_id && (
          <div style={{ color: '#28a745', fontWeight: 'bold', fontSize: '1.2em' }}>✓</div>
        )}
      </div>

      {/* Score display */}
      {match.score && (
        <div style={{
          padding: '6px 12px',
          backgroundColor: '#e9ecef',
          borderTop: '1px solid #ddd',
          textAlign: 'center',
          fontSize: '0.85em',
          fontWeight: 'bold'
        }}>
          {match.score}
        </div>
      )}

      {/* Seeding indicators */}
      {(match.player1?.seed_position || match.player2?.seed_position) && (
        <div style={{
          position: 'absolute',
          top: '8px',
          right: '50px',
          fontSize: '0.7em',
          color: '#666'
        }}>
          {match.player1?.seed_position && `(${match.player1.seed_position})`}
          {match.player1?.seed_position && match.player2?.seed_position && ' vs '}
          {match.player2?.seed_position && `(${match.player2.seed_position})`}
        </div>
      )}
    </div>
  )
}

// Helper functions
function groupMatchesByRound(matches) {
  const grouped = {}
  matches.forEach(match => {
    const round = match.round_name
    if (!grouped[round]) {
      grouped[round] = []
    }
    grouped[round].push(match)
  })
  
  // Sort matches within each round by match_number
  Object.keys(grouped).forEach(round => {
    grouped[round].sort((a, b) => a.match_number - b.match_number)
  })
  
  return grouped
}

function getRoundOrder(roundName) {
  const order = {
    'Round of 64': 1,
    'Round of 32': 2,
    'Round of 16': 3,
    'Quarter-Final': 4,
    'Semi-Final': 5,
    'Final': 6
  }
  
  // Handle generic round names like "Round 1", "Round 2", etc.
  if (roundName.startsWith('Round ') && !order[roundName]) {
    const roundNum = parseInt(roundName.split(' ')[1])
    return roundNum
  }
  
  return order[roundName] || 999
}
