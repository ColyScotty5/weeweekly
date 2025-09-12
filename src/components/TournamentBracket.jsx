import { useState, useEffect } from 'preact/hooks'
import { matchesApi } from '../lib/supabase.js'
import { createNextRoundMatches } from '../lib/tournamentUtils.js'

export default function TournamentBracket({ event, onMatchUpdate }) {
  const [matches, setMatches] = useState([])
  const [loading, setLoading] = useState(false)
  const [selectedMatch, setSelectedMatch] = useState(null)
  const [showDialog, setShowDialog] = useState(false)

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
            onMatchClick={(match) => {
              setSelectedMatch(match)
              setShowDialog(true)
            }}
          />
        ))}
      </div>

      {/* Match Dialog */}
      {showDialog && selectedMatch && (
        <MatchDialog
          match={selectedMatch}
          eventType={event.event_type}
          onClose={() => {
            setShowDialog(false)
            setSelectedMatch(null)
          }}
          onSave={async (updatedMatch) => {
            try {
              console.log('Updating match with data:', updatedMatch)
              
              // Prepare the update data - only include fields that should be updated
              const updateData = {
                status: updatedMatch.status
              }
              
              // Only add winner_id if it's set
              if (updatedMatch.winner_id) {
                updateData.winner_id = updatedMatch.winner_id
              }
              
              // Only add score if it's set
              if (updatedMatch.score) {
                updateData.score = updatedMatch.score
              }
              
              // Add completion timestamp if match is completed
              if (updatedMatch.status === 'completed') {
                updateData.completed_at = new Date().toISOString()
              }
              
              console.log('Sending update data:', updateData)
              console.log('Match ID:', updatedMatch.id)
              const result = await matchesApi.update(updatedMatch.id, updateData)
              console.log('Update successful:', result)
              
              // If match was completed, check if we need to create next round matches
              if (updatedMatch.status === 'completed') {
                console.log('Match completed, checking for next round creation...')
                try {
                  const nextRoundCreated = await createNextRoundMatches(event.id, result.round_name)
                  if (nextRoundCreated) {
                    console.log('Next round matches created successfully')
                  } else {
                    console.log('Next round not ready yet or tournament complete')
                  }
                } catch (error) {
                  console.error('Error creating next round matches:', error)
                  // Don't fail the whole operation if next round creation fails
                }
              }
              
              await loadMatches() // Reload matches to get updated data
              if (onMatchUpdate) {
                onMatchUpdate(result)
              }
              setShowDialog(false)
              setSelectedMatch(null)
            } catch (error) {
              console.error('Error updating match:', error)
              console.error('Error details:', error.message, error.details)
              alert(`Failed to update match: ${error.message || 'Unknown error'}. Please try again.`)
            }
          }}
        />
      )}

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

function RoundColumn({ round, roundIndex, matches, eventType, onMatchUpdate, onMatchClick }) {
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
            onClick={() => onMatchClick(match)}
          />
        ))}
      </div>
    </div>
  )
}

function MatchCard({ match, matchIndex, roundIndex, eventType, onUpdate, onClick }) {
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
    <div 
      className="match-card clickable" 
      data-round={roundIndex} 
      data-match={matchIndex}
      onClick={onClick}
    >
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
      <div className={`player-row ${match.status === 'completed' && match.winner_id !== match.player1_id ? 'loser' : ''}`} style={{
        backgroundColor: getMatchBackgroundColor(match.status, match.winner_id, match.player1_id)
      }}>
        <div className="player-info">
          <div className={`player-name ${match.winner_id === match.player1_id ? 'winner' : ''} ${match.status === 'completed' && match.winner_id !== match.player1_id ? 'loser' : ''}`}>
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
      <div className={`player-row ${match.status === 'completed' && match.winner_id !== match.player2_id ? 'loser' : ''}`} style={{
        backgroundColor: getMatchBackgroundColor(match.status, match.winner_id, match.player2_id)
      }}>
        <div className="player-info">
          <div className={`player-name ${match.winner_id === match.player2_id ? 'winner' : ''} ${match.status === 'completed' && match.winner_id !== match.player2_id ? 'loser' : ''}`}>
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

// Match Dialog Component for editing match details
function MatchDialog({ match, eventType, onClose, onSave }) {
  const [status, setStatus] = useState(match.status || 'scheduled')
  const [winnerId, setWinnerId] = useState(match.winner_id || '')
  const [player1Score, setPlayer1Score] = useState('')
  const [player2Score, setPlayer2Score] = useState('')
  const [player1TiebreakScore, setPlayer1TiebreakScore] = useState('')
  const [player2TiebreakScore, setPlayer2TiebreakScore] = useState('')
  const [loading, setLoading] = useState(false)

  // Parse existing score if available
  useEffect(() => {
    if (match.score) {
      // Check if there's a tie-breaker score in format "7-6 (7-5)"
      const tiebreakMatch = match.score.match(/^(\d+)-(\d+)\s*\((\d+)-(\d+)\)$/)
      if (tiebreakMatch) {
        setPlayer1Score(tiebreakMatch[1])
        setPlayer2Score(tiebreakMatch[2])
        setPlayer1TiebreakScore(tiebreakMatch[3])
        setPlayer2TiebreakScore(tiebreakMatch[4])
      } else {
        // Regular score format "6-4"
        const scoreParts = match.score.split('-')
        if (scoreParts.length === 2) {
          setPlayer1Score(scoreParts[0].trim())
          setPlayer2Score(scoreParts[1].trim())
          setPlayer1TiebreakScore('')
          setPlayer2TiebreakScore('')
        }
      }
    }
  }, [match.score])

  const getPlayerDisplay = (player, partner = null) => {
    if (!player) return 'TBD'
    return partner ? `${player.name} / ${partner.name}` : player.name
  }

  const handleSave = async () => {
    setLoading(true)
    
    try {
      console.log('MatchDialog handleSave called with:', {
        status,
        winnerId,
        player1Score,
        player2Score,
        matchId: match.id
      })

      // Format score with tie-breaker if applicable
      let formattedScore = null
      if (status === 'completed' && player1Score && player2Score) {
        const hasTiebreaker = ((player1Score === '7' && player2Score === '6') || (player1Score === '6' && player2Score === '7')) 
                             && player1TiebreakScore && player2TiebreakScore
        
        if (hasTiebreaker) {
          formattedScore = `${player1Score}-${player2Score} (${player1TiebreakScore}-${player2TiebreakScore})`
        } else {
          formattedScore = `${player1Score}-${player2Score}`
        }
      }

      const updatedMatch = {
        ...match,
        status,
        winner_id: status === 'completed' || status === 'walkover' ? winnerId : null,
        score: formattedScore
      }

      console.log('Calling onSave with updatedMatch:', updatedMatch)
      await onSave(updatedMatch)
    } catch (error) {
      console.error('Error in MatchDialog handleSave:', error)
      alert(`Error saving match: ${error.message || 'Unknown error'}`)
    } finally {
      setLoading(false)
    }
  }

  const isFormValid = () => {
    if (status === 'completed') {
      if (!winnerId || !player1Score || !player2Score) {
        return false
      }
      
      // Check tie-breaker validation for 7-6 scores
      const isTiebreakSet = (player1Score === '7' && player2Score === '6') || (player1Score === '6' && player2Score === '7')
      if (isTiebreakSet) {
        if (!player1TiebreakScore || !player2TiebreakScore) {
          return false
        }
        
        const tb1 = parseInt(player1TiebreakScore)
        const tb2 = parseInt(player2TiebreakScore)
        
        // Validate tie-breaker rules: winner must have at least 7 and lead by at least 2
        const maxScore = Math.max(tb1, tb2)
        const minScore = Math.min(tb1, tb2)
        
        if (maxScore < 7 || (maxScore - minScore) < 2) {
          return false
        }
      }
      
      return true
    }
    if (status === 'walkover') {
      return winnerId
    }
    return true
  }

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  return (
    <div className="match-dialog-overlay" onClick={handleOverlayClick}>
      <div className="match-dialog">
        <div className="dialog-header">
          <h3 className="dialog-title">Edit Match {match.match_number}</h3>
          <button className="dialog-close" onClick={onClose}>×</button>
        </div>

        <div className="form-group">
          <label className="form-label">Match Status</label>
          <select 
            className="form-select"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="scheduled">Scheduled</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="walkover">Walkover</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        {status === 'completed' && (
          <>
            <div className="form-group">
              <label className="form-label">Winner</label>
              <div className="winner-selection">
                <div 
                  className={`winner-option ${winnerId === match.player1_id ? 'selected' : ''}`}
                  onClick={() => setWinnerId(match.player1_id)}
                >
                  <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>
                    {getPlayerDisplay(match.player1, match.player1_partner)}
                  </div>
                  {match.player1?.seed_position && (
                    <div style={{ fontSize: '0.8em', color: '#666' }}>
                      Seed #{match.player1.seed_position}
                    </div>
                  )}
                </div>
                <div 
                  className={`winner-option ${winnerId === match.player2_id ? 'selected' : ''}`}
                  onClick={() => setWinnerId(match.player2_id)}
                >
                  <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>
                    {getPlayerDisplay(match.player2, match.player2_partner)}
                  </div>
                  {match.player2?.seed_position && (
                    <div style={{ fontSize: '0.8em', color: '#666' }}>
                      Seed #{match.player2.seed_position}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Score (1 Set)</label>
              <div className="score-input-group">
                <input
                  type="number"
                  className="form-input score-input"
                  placeholder="0"
                  min="0"
                  max="7"
                  value={player1Score}
                  onChange={(e) => setPlayer1Score(e.target.value)}
                />
                <span style={{ fontWeight: 'bold', fontSize: '1.2em' }}>-</span>
                <input
                  type="number"
                  className="form-input score-input"
                  placeholder="0"
                  min="0"
                  max="7"
                  value={player2Score}
                  onChange={(e) => setPlayer2Score(e.target.value)}
                />
              </div>
              <div style={{ fontSize: '0.8em', color: '#666', marginTop: '4px' }}>
                Enter games won by each player/team
              </div>
              
              {/* Tie-breaker inputs - show when score is 7-6 or 6-7 */}
              {((player1Score === '7' && player2Score === '6') || (player1Score === '6' && player2Score === '7')) && (
                <div style={{ marginTop: '15px' }}>
                  <label className="form-label">Tie-breaker Score</label>
                  <div className="score-input-group">
                    <input
                      type="number"
                      className="form-input score-input"
                      placeholder="0"
                      min="0"
                      max="20"
                      value={player1TiebreakScore}
                      onChange={(e) => setPlayer1TiebreakScore(e.target.value)}
                    />
                    <span style={{ fontWeight: 'bold', fontSize: '1.2em' }}>-</span>
                    <input
                      type="number"
                      className="form-input score-input"
                      placeholder="0"
                      min="0"
                      max="20"
                      value={player2TiebreakScore}
                      onChange={(e) => setPlayer2TiebreakScore(e.target.value)}
                    />
                  </div>
                  <div style={{ fontSize: '0.8em', color: '#666', marginTop: '4px' }}>
                    Enter tie-breaker points (winner must have at least 7 and lead by 2)
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {(status === 'walkover' || status === 'cancelled') && (
          <div className="form-group">
            <label className="form-label">
              {status === 'walkover' ? 'Winner (Walkover)' : 'Result'}
            </label>
            {status === 'walkover' ? (
              <div className="winner-selection">
                <div 
                  className={`winner-option ${winnerId === match.player1_id ? 'selected' : ''}`}
                  onClick={() => setWinnerId(match.player1_id)}
                >
                  {getPlayerDisplay(match.player1, match.player1_partner)}
                </div>
                <div 
                  className={`winner-option ${winnerId === match.player2_id ? 'selected' : ''}`}
                  onClick={() => setWinnerId(match.player2_id)}
                >
                  {getPlayerDisplay(match.player2, match.player2_partner)}
                </div>
              </div>
            ) : (
              <div style={{ 
                padding: '12px', 
                backgroundColor: '#f8d7da', 
                borderRadius: '6px',
                color: '#721c24',
                textAlign: 'center'
              }}>
                Match has been cancelled
              </div>
            )}
          </div>
        )}

        <div className="dialog-actions">
          <button className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button 
            className="btn btn-primary" 
            onClick={handleSave}
            disabled={loading || !isFormValid()}
          >
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
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
