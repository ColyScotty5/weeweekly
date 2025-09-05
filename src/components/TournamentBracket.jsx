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
    <div className="tournament-bracket">
      <h3>Tournament Bracket - {event.event_type?.charAt(0).toUpperCase() + event.event_type?.slice(1)}</h3>
      
      <div className="bracket-container">
        <BracketLines matches={matches} rounds={rounds} />
        {rounds.map((round, roundIndex) => (
          <RoundColumn
            key={round}
            round={round}
            roundIndex={roundIndex}
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
        borderRadius: '8px',
        fontSize: '0.9em',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}>
        <strong>Legend:</strong>
        <div style={{ display: 'flex', gap: '20px', marginTop: '12px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '14px', height: '14px', backgroundColor: '#e3f2fd', border: '1px solid #ddd', borderRadius: '3px' }}></div>
            Scheduled
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '14px', height: '14px', backgroundColor: '#fff3cd', border: '1px solid #ddd', borderRadius: '3px' }}></div>
            In Progress
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '14px', height: '14px', backgroundColor: '#d4edda', border: '1px solid #ddd', borderRadius: '3px' }}></div>
            Completed
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '14px', height: '14px', backgroundColor: '#f8d7da', border: '1px solid #ddd', borderRadius: '3px' }}></div>
            Walkover/Cancelled
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ 
              width: '20px', 
              height: '14px', 
              background: 'linear-gradient(135deg, #ffd700, #ffb347)', 
              border: '1px solid #ddd', 
              borderRadius: '8px',
              fontSize: '0.6em',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#333',
              fontWeight: 'bold'
            }}>#1</div>
            Top Seeds
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '14px', height: '2px', backgroundColor: '#007bff', opacity: '0.6' }}></div>
            Bracket Connections
          </div>
        </div>
      </div>
    </div>
  )
}

function RoundColumn({ round, roundIndex, matches, eventType, onMatchUpdate }) {
  return (
    <div className="round-column">
      <h4 className="round-header">
        {round}
      </h4>
      
      <div className="matches-column">
        {matches.map((match, matchIndex) => (
          <MatchCard
            key={match.id}
            match={match}
            matchIndex={matchIndex}
            roundIndex={roundIndex}
            eventType={eventType}
            onUpdate={onMatchUpdate}
          />
        ))}
      </div>
    </div>
  )
}

function MatchCard({ match, matchIndex, roundIndex, eventType, onUpdate }) {
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

  const getSeedBadgeClass = (seedPosition) => {
    if (!seedPosition) return 'seed-badge'
    if (seedPosition === 1) return 'seed-badge seed-1'
    if (seedPosition === 2) return 'seed-badge seed-2'
    if (seedPosition <= 4) return 'seed-badge seed-3'
    return 'seed-badge'
  }

  return (
    <div className="match-card" data-round={roundIndex} data-match={matchIndex}>
      {/* Seed badges */}
      {match.player1?.seed_position && (
        <div className={getSeedBadgeClass(match.player1.seed_position)}>
          #{match.player1.seed_position}
        </div>
      )}
      {match.player2?.seed_position && !match.player1?.seed_position && (
        <div className={getSeedBadgeClass(match.player2.seed_position)}>
          #{match.player2.seed_position}
        </div>
      )}
      {match.player1?.seed_position && match.player2?.seed_position && (
        <div className={getSeedBadgeClass(Math.min(match.player1.seed_position, match.player2.seed_position))} style={{ right: '10px', left: 'auto' }}>
          #{match.player2.seed_position}
        </div>
      )}

      {/* Match header */}
      <div className="match-header">
        <span className="match-number">
          Match {match.match_number}
          {match.bracket_position !== undefined && (
            <span style={{ fontSize: '0.7em', color: '#666', marginLeft: '8px' }}>
              (Pos {match.bracket_position + 1})
            </span>
          )}
        </span>
        <span className="status-badge" style={{
          backgroundColor: getStatusBadgeColor(match.status)
        }}>
          {match.status}
        </span>
      </div>

      {/* Player 1 */}
      <div className="player-row" style={{
        backgroundColor: getMatchBackgroundColor(match.status, match.winner_id, match.player1_id)
      }}>
        <div className="player-info">
          <div className={`player-name ${match.winner_id === match.player1_id ? 'winner' : ''}`}>
            {getPlayerDisplay(match.player1, match.player1_partner)}
            {match.player1?.seed_position && (
              <span style={{ marginLeft: '8px', fontSize: '0.8em', color: '#ff6b35', fontWeight: 'bold' }}>
                (#{match.player1.seed_position})
              </span>
            )}
          </div>
          {match.player1 && (
            <div className="player-ranking">
              Rank: {eventType === 'singles' 
                ? match.player1.singles_ranking_points?.toFixed(1) || '0.0'
                : match.player1.doubles_ranking_points?.toFixed(1) || '0.0'
              }
            </div>
          )}
        </div>
        {match.winner_id === match.player1_id && (
          <div className="winner-check">✓</div>
        )}
      </div>

      {/* Player 2 */}
      <div className="player-row" style={{
        backgroundColor: getMatchBackgroundColor(match.status, match.winner_id, match.player2_id)
      }}>
        <div className="player-info">
          <div className={`player-name ${match.winner_id === match.player2_id ? 'winner' : ''}`}>
            {getPlayerDisplay(match.player2, match.player2_partner)}
            {match.player2?.seed_position && (
              <span style={{ marginLeft: '8px', fontSize: '0.8em', color: '#ff6b35', fontWeight: 'bold' }}>
                (#{match.player2.seed_position})
              </span>
            )}
          </div>
          {match.player2 && (
            <div className="player-ranking">
              Rank: {eventType === 'singles' 
                ? match.player2.singles_ranking_points?.toFixed(1) || '0.0'
                : match.player2.doubles_ranking_points?.toFixed(1) || '0.0'
              }
            </div>
          )}
        </div>
        {match.winner_id === match.player2_id && (
          <div className="winner-check">✓</div>
        )}
      </div>

      {/* Score display */}
      {match.score && (
        <div className="score-display">
          {match.score}
        </div>
      )}

      {/* Next round indicator */}
      {match.status === 'scheduled' && roundIndex < 3 && (
        <div style={{
          position: 'absolute',
          bottom: '-12px',
          right: '10px',
          fontSize: '0.7em',
          color: '#007bff',
          backgroundColor: 'white',
          padding: '2px 6px',
          borderRadius: '4px',
          border: '1px solid #007bff',
          opacity: 0.8
        }}>
          Winner → Round {roundIndex + 2}
        </div>
      )}

    </div>
  )
}

// Component to draw connecting lines between matches
function BracketLines({ matches, rounds }) {
  const [lines, setLines] = useState([])

  useEffect(() => {
    // Calculate connection lines after component mounts
    const timer = setTimeout(() => {
      calculateConnectionLines()
    }, 100)

    return () => clearTimeout(timer)
  }, [matches, rounds])

  const calculateConnectionLines = () => {
    const newLines = []
    const matchesByRound = groupMatchesByRound(matches)
    
    // For each round (except the last), draw lines to the next round
    for (let i = 0; i < rounds.length - 1; i++) {
      const currentRound = rounds[i]
      const nextRound = rounds[i + 1]
      
      const currentMatches = matchesByRound[currentRound] || []
      const nextMatches = matchesByRound[nextRound] || []
      
      // Draw lines from pairs of current round matches to next round matches
      for (let j = 0; j < nextMatches.length; j++) {
        const match1Index = j * 2
        const match2Index = j * 2 + 1
        
        if (match1Index < currentMatches.length && match2Index < currentMatches.length) {
          // Get the DOM elements for positioning
          const match1Element = document.querySelector(`[data-round="${i}"][data-match="${match1Index}"]`)
          const match2Element = document.querySelector(`[data-round="${i}"][data-match="${match2Index}"]`)
          const nextMatchElement = document.querySelector(`[data-round="${i + 1}"][data-match="${j}"]`)
          
          if (match1Element && match2Element && nextMatchElement) {
            const containerRect = document.querySelector('.bracket-container').getBoundingClientRect()
            
            const match1Rect = match1Element.getBoundingClientRect()
            const match2Rect = match2Element.getBoundingClientRect()
            const nextMatchRect = nextMatchElement.getBoundingClientRect()
            
            // Calculate relative positions
            const match1Right = match1Rect.right - containerRect.left
            const match1CenterY = match1Rect.top + match1Rect.height / 2 - containerRect.top
            
            const match2Right = match2Rect.right - containerRect.left
            const match2CenterY = match2Rect.top + match2Rect.height / 2 - containerRect.top
            
            const nextMatchLeft = nextMatchRect.left - containerRect.left
            const nextMatchCenterY = nextMatchRect.top + nextMatchRect.height / 2 - containerRect.top
            
            // Horizontal lines from matches to connection point
            const connectionX = match1Right + 30
            
            newLines.push({
              id: `h1-${i}-${j}`,
              type: 'horizontal',
              left: match1Right,
              top: match1CenterY - 1,
              width: 30
            })
            
            newLines.push({
              id: `h2-${i}-${j}`,
              type: 'horizontal',
              left: match2Right,
              top: match2CenterY - 1,
              width: 30
            })
            
            // Vertical line connecting the two horizontal lines
            const verticalTop = Math.min(match1CenterY, match2CenterY)
            const verticalHeight = Math.abs(match2CenterY - match1CenterY)
            
            if (verticalHeight > 0) {
              newLines.push({
                id: `v-${i}-${j}`,
                type: 'vertical',
                left: connectionX - 1,
                top: verticalTop,
                height: verticalHeight
              })
            }
            
            // Horizontal line to next match
            newLines.push({
              id: `h3-${i}-${j}`,
              type: 'horizontal',
              left: connectionX,
              top: nextMatchCenterY - 1,
              width: nextMatchLeft - connectionX
            })
          }
        }
      }
    }
    
    setLines(newLines)
  }

  return (
    <div className="bracket-lines">
      {lines.map(line => (
        <div
          key={line.id}
          className={`connection-line ${line.type}`}
          style={{
            left: `${line.left}px`,
            top: `${line.top}px`,
            width: line.type === 'horizontal' ? `${line.width}px` : '2px',
            height: line.type === 'vertical' ? `${line.height}px` : '2px'
          }}
        />
      ))}
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
