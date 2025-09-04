import { useState, useEffect } from 'preact/hooks'
import { matchesApi, resultsApi, eventsApi } from '../lib/supabase.js'
import { calculatePoints, updatePlayerStats } from '../lib/tournamentUtils.js'

export default function MatchResults({ eventId }) {
  const [matches, setMatches] = useState([])
  const [event, setEvent] = useState(null)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [selectedMatch, setSelectedMatch] = useState(null)

  useEffect(() => {
    if (eventId) {
      loadMatches()
      loadEvent()
    }
  }, [eventId])

  const loadMatches = async () => {
    try {
      const data = await matchesApi.getByEvent(eventId)
      setMatches(data)
    } catch (error) {
      console.error('Error loading matches:', error)
      setMessage(`❌ Error loading matches: ${error.message}`)
    }
  }

  const loadEvent = async () => {
    try {
      const data = await eventsApi.getById(eventId)
      setEvent(data)
    } catch (error) {
      console.error('Error loading event:', error)
    }
  }

  const recordMatchResult = async (matchId, result) => {
    setLoading(true)
    try {
      // Update match with result
      await matchesApi.updateResult(matchId, result)

      // Calculate and record points for each player
      const match = matches.find(m => m.id === matchId)
      if (match) {
        const results = []
        
        if (event.event_type === 'singles') {
          // Singles match
          const winnerPoints = calculatePoints(event.event_type, match.round_name, match.bracket_type, true)
          const loserPoints = calculatePoints(event.event_type, match.round_name, match.bracket_type, false)
          
          results.push({
            player_id: result.winner_id,
            points_earned: winnerPoints,
            result_type: match.round_name === 'Final' ? 'winner' : 'advance'
          })
          
          const loserId = result.winner_id === match.player1_id ? match.player2_id : match.player1_id
          results.push({
            player_id: loserId,
            points_earned: loserPoints,
            result_type: match.round_name === 'Final' ? 'runner_up' : 'eliminated'
          })
        } else {
          // Doubles match
          const winnerPoints = calculatePoints(event.event_type, match.round_name, match.bracket_type, true)
          const loserPoints = calculatePoints(event.event_type, match.round_name, match.bracket_type, false)
          
          // Winner team
          results.push({
            player_id: match.player1_id,
            points_earned: winnerPoints,
            result_type: match.round_name === 'Final' ? 'winner' : 'advance'
          })
          results.push({
            player_id: match.player1_partner_id,
            points_earned: winnerPoints,
            result_type: match.round_name === 'Final' ? 'winner' : 'advance'
          })
          
          // Loser team
          results.push({
            player_id: match.player2_id,
            points_earned: loserPoints,
            result_type: match.round_name === 'Final' ? 'runner_up' : 'eliminated'
          })
          results.push({
            player_id: match.player2_partner_id,
            points_earned: loserPoints,
            result_type: match.round_name === 'Final' ? 'runner_up' : 'eliminated'
          })
        }

        // Record results in database
        await resultsApi.recordResults(matchId, results)

        // Update player statistics
        for (const playerResult of results) {
          await updatePlayerStats(playerResult.player_id, [playerResult], event.event_type)
        }
      }

      setMessage('✅ Match result recorded successfully!')
      setSelectedMatch(null)
      loadMatches()
    } catch (error) {
      console.error('Error recording match result:', error)
      setMessage(`❌ Error recording result: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  if (!eventId) {
    return (
      <div style={{ textAlign: 'center', color: '#666', padding: '20px' }}>
        Select an event to view matches
      </div>
    )
  }

  return (
    <div style={{ padding: '20px' }}>
      <h3>Match Results - {event?.event_type?.charAt(0).toUpperCase() + event?.event_type?.slice(1)} Event</h3>

      {message && (
        <div style={{
          padding: '10px',
          marginBottom: '20px',
          backgroundColor: message.includes('✅') ? '#d4edda' : '#f8d7da',
          border: `1px solid ${message.includes('✅') ? '#c3e6cb' : '#f5c6cb'}`,
          borderRadius: '4px'
        }}>
          {message}
        </div>
      )}

      <div style={{ display: 'grid', gap: '15px' }}>
        {matches.map(match => (
          <MatchCard
            key={match.id}
            match={match}
            eventType={event?.event_type}
            onRecordResult={recordMatchResult}
            loading={loading}
            isSelected={selectedMatch === match.id}
            onSelect={() => setSelectedMatch(selectedMatch === match.id ? null : match.id)}
          />
        ))}
      </div>

      {matches.length === 0 && (
        <div style={{ textAlign: 'center', color: '#666', padding: '40px' }}>
          No matches found for this event
        </div>
      )}
    </div>
  )
}

function MatchCard({ match, eventType, onRecordResult, loading, isSelected, onSelect }) {
  const [score, setScore] = useState('')
  const [winnerId, setWinnerId] = useState('')

  const getPlayerDisplay = (player, partner = null) => {
    if (!player) return 'TBD'
    return partner ? `${player.name} / ${partner.name}` : player.name
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'scheduled': return '#17a2b8'
      case 'in_progress': return '#ffc107'
      case 'completed': return '#28a745'
      case 'walkover': return '#fd7e14'
      case 'cancelled': return '#6c757d'
      default: return '#6c757d'
    }
  }

  const handleSubmitResult = (e) => {
    e.preventDefault()
    if (!winnerId || !score.trim()) {
      alert('Please select a winner and enter a score')
      return
    }

    onRecordResult(match.id, {
      winner_id: winnerId,
      score: score.trim()
    })
  }

  return (
    <div style={{
      border: '1px solid #ddd',
      borderRadius: '8px',
      padding: '15px',
      backgroundColor: match.status === 'completed' ? '#f8f9fa' : 'white'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
        <div>
          <span style={{ fontWeight: 'bold', marginRight: '10px' }}>
            {match.round_name} - Match {match.match_number}
          </span>
          <span style={{
            padding: '2px 6px',
            borderRadius: '4px',
            fontSize: '0.8em',
            backgroundColor: getStatusColor(match.status),
            color: 'white'
          }}>
            {match.status}
          </span>
          <span style={{
            marginLeft: '10px',
            padding: '2px 6px',
            borderRadius: '4px',
            fontSize: '0.8em',
            backgroundColor: match.bracket_type === 'main' ? '#007bff' : '#6c757d',
            color: 'white'
          }}>
            {match.bracket_type}
          </span>
        </div>
        
        {match.status !== 'completed' && (
          <button
            onClick={onSelect}
            style={{
              padding: '6px 12px',
              backgroundColor: isSelected ? '#dc3545' : '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            {isSelected ? 'Cancel' : 'Record Result'}
          </button>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: '15px', alignItems: 'center' }}>
        <div style={{
          padding: '10px',
          border: '1px solid #ddd',
          borderRadius: '4px',
          backgroundColor: match.winner_id === match.player1_id ? '#d4edda' : 'white'
        }}>
          <div style={{ fontWeight: 'bold' }}>
            {getPlayerDisplay(match.player1, match.player1_partner)}
          </div>
          {match.player1 && (
            <div style={{ fontSize: '0.8em', color: '#666' }}>
              Ranking: {eventType === 'singles' 
                ? match.player1.singles_ranking_points?.toFixed(2) || '0.00'
                : match.player1.doubles_ranking_points?.toFixed(2) || '0.00'
              }
            </div>
          )}
        </div>

        <div style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '1.2em' }}>
          {match.status === 'completed' ? (
            <div>
              <div>VS</div>
              <div style={{ fontSize: '0.8em', marginTop: '5px' }}>
                {match.score}
              </div>
            </div>
          ) : (
            'VS'
          )}
        </div>

        <div style={{
          padding: '10px',
          border: '1px solid #ddd',
          borderRadius: '4px',
          backgroundColor: match.winner_id === match.player2_id ? '#d4edda' : 'white'
        }}>
          <div style={{ fontWeight: 'bold' }}>
            {getPlayerDisplay(match.player2, match.player2_partner)}
          </div>
          {match.player2 && (
            <div style={{ fontSize: '0.8em', color: '#666' }}>
              Ranking: {eventType === 'singles' 
                ? match.player2.singles_ranking_points?.toFixed(2) || '0.00'
                : match.player2.doubles_ranking_points?.toFixed(2) || '0.00'
              }
            </div>
          )}
        </div>
      </div>

      {isSelected && match.status !== 'completed' && (
        <form onSubmit={handleSubmitResult} style={{
          marginTop: '15px',
          padding: '15px',
          border: '2px solid #007bff',
          borderRadius: '4px',
          backgroundColor: '#f8f9fa'
        }}>
          <h5>Record Match Result</h5>
          
          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px' }}>Winner:</label>
            <select
              value={winnerId}
              onChange={(e) => setWinnerId(e.target.value)}
              required
              style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
            >
              <option value="">Select winner...</option>
              {match.player1 && (
                <option value={match.player1_id}>
                  {getPlayerDisplay(match.player1, match.player1_partner)}
                </option>
              )}
              {match.player2 && (
                <option value={match.player2_id}>
                  {getPlayerDisplay(match.player2, match.player2_partner)}
                </option>
              )}
            </select>
          </div>

          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px' }}>Score:</label>
            <input
              type="text"
              value={score}
              onChange={(e) => setScore(e.target.value)}
              placeholder="e.g., 6-4, 6-2"
              required
              style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
            />
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              type="submit"
              disabled={loading}
              style={{
                padding: '8px 16px',
                backgroundColor: '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.6 : 1
              }}
            >
              {loading ? 'Recording...' : 'Record Result'}
            </button>
            
            <button
              type="button"
              onClick={onSelect}
              style={{
                padding: '8px 16px',
                backgroundColor: '#6c757d',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {match.completed_at && (
        <div style={{ marginTop: '10px', fontSize: '0.8em', color: '#666' }}>
          Completed: {new Date(match.completed_at).toLocaleString()}
        </div>
      )}
    </div>
  )
}
