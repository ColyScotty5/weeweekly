import { useState, useEffect } from 'preact/hooks'
import { tournamentsApi, eventsApi, playersApi, participantsApi, matchesApi } from '../lib/supabase.js'
import { generateSinglesDraw, generateDoublesDraw, generateMatches, POINTS_SYSTEM } from '../lib/tournamentUtils.js'
import TournamentBracket from './TournamentBracket.jsx'
import Avatar from './Avatar.jsx'
import { getUserAvatarByEmail } from '../contexts/AuthContext.jsx'

export default function TournamentManager() {
  const [tournaments, setTournaments] = useState([])
  const [selectedTournament, setSelectedTournament] = useState(null)
  const [players, setPlayers] = useState([])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [tournamentToDelete, setTournamentToDelete] = useState(null)
  const [showEditModal, setShowEditModal] = useState(false)
  const [tournamentToEdit, setTournamentToEdit] = useState(null)

  useEffect(() => {
    loadTournaments()
    loadPlayers()
  }, [])

  const loadTournaments = async () => {
    try {
      const data = await tournamentsApi.getAll()
      setTournaments(data)
    } catch (error) {
      console.error('Error loading tournaments:', error)
      setMessage(`❌ Error loading tournaments: ${error.message}`)
    }
  }

  const loadPlayers = async () => {
    try {
      const data = await playersApi.getAllWithRankings('singles')
      setPlayers(data)
    } catch (error) {
      console.error('Error loading players:', error)
    }
  }

  const createTournament = async (tournamentData) => {
    setLoading(true)
    try {
      // Fix timezone issue by ensuring date is treated as local date
      const localDate = new Date(tournamentData.date + 'T12:00:00')
      const formattedDate = localDate.toISOString().split('T')[0]
      
      const tournament = await tournamentsApi.create({
        name: tournamentData.name,
        tournament_date: formattedDate,
        description: tournamentData.description,
        status: 'upcoming'
      })

      // Create event for the tournament
      await eventsApi.create({
        tournament_id: tournament.id,
        event_type: tournamentData.eventType,
        status: 'registration'
      })

      setMessage('✅ Tournament created successfully!')
      setShowCreateForm(false)
      loadTournaments()
    } catch (error) {
      console.error('Error creating tournament:', error)
      setMessage(`❌ Error creating tournament: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  const loadTournamentDetails = async (tournamentId) => {
    setLoading(true)
    try {
      const tournament = await tournamentsApi.getById(tournamentId)
      setSelectedTournament(tournament)
    } catch (error) {
      console.error('Error loading tournament details:', error)
      setMessage(`❌ Error loading tournament: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteTournament = (tournament, event) => {
    event.stopPropagation() // Prevent tournament selection when clicking delete
    setTournamentToDelete(tournament)
    setShowDeleteModal(true)
  }

  const handleEditTournament = (tournament, event) => {
    event.stopPropagation() // Prevent tournament selection when clicking edit
    setTournamentToEdit(tournament)
    setShowEditModal(true)
  }

  const confirmDeleteTournament = async () => {
    if (!tournamentToDelete) return
    
    setLoading(true)
    try {
      await tournamentsApi.delete(tournamentToDelete.id)
      setMessage('✅ Tournament deleted successfully!')
      
      // Clear selected tournament if it was the one deleted
      if (selectedTournament?.id === tournamentToDelete.id) {
        setSelectedTournament(null)
      }
      
      loadTournaments()
      setShowDeleteModal(false)
      setTournamentToDelete(null)
    } catch (error) {
      console.error('Error deleting tournament:', error)
      setMessage(`❌ Error deleting tournament: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  const cancelDeleteTournament = () => {
    setShowDeleteModal(false)
    setTournamentToDelete(null)
  }

  const updateTournament = async (tournamentData) => {
    if (!tournamentToEdit) return
    
    setLoading(true)
    try {
      // Fix timezone issue by ensuring date is treated as local date
      const localDate = new Date(tournamentData.date + 'T12:00:00')
      const formattedDate = localDate.toISOString().split('T')[0]
      
      // Update tournament basic info
      await tournamentsApi.update(tournamentToEdit.id, {
        name: tournamentData.name,
        tournament_date: formattedDate,
        description: tournamentData.description
      })

      // Handle event type change if needed
      if (tournamentData.eventType !== tournamentToEdit.events?.[0]?.event_type) {
        // Get current events
        const currentEvents = tournamentToEdit.events || []
        
        // Delete existing events
        for (const event of currentEvents) {
          await eventsApi.delete(event.id)
        }
        
        // Create new event with the selected type
        await eventsApi.create({
          tournament_id: tournamentToEdit.id,
          event_type: tournamentData.eventType,
          status: 'registration'
        })
      }

      setMessage('✅ Tournament updated successfully!')
      setShowEditModal(false)
      setTournamentToEdit(null)
      loadTournaments()
      
      // Refresh selected tournament if it was the one being edited
      if (selectedTournament?.id === tournamentToEdit.id) {
        loadTournamentDetails(tournamentToEdit.id)
      }
    } catch (error) {
      console.error('Error updating tournament:', error)
      setMessage(`❌ Error updating tournament: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ padding: '20px', margin: '0 auto' }}>
      <h2>Tournament Manager</h2>

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

      <div style={{ marginBottom: '20px' }}>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          style={{
            padding: '10px 20px',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          {showCreateForm ? 'Cancel' : 'Create New Tournament'}
        </button>
      </div>

      {showCreateForm && (
        <CreateTournamentForm
          onSubmit={createTournament}
          onCancel={() => setShowCreateForm(false)}
          loading={loading}
        />
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 460px) 1fr', gap: '20px' }}>
        <div className="tournament-card">
          <h3>Tournaments</h3>
          <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
            {tournaments.map(tournament => (
              <div
                key={tournament.id}
                onClick={() => loadTournamentDetails(tournament.id)}
                className={`tournament-item ${selectedTournament?.id === tournament.id ? 'selected' : ''}`}
              >
                <div className="tournament-item-content">
                  <div className="tournament-item-title">{tournament.name}</div>
                  <div className="tournament-item-date">
                    {new Date(tournament.tournament_date + 'T12:00:00').toLocaleDateString()}
                  </div>
                  <div className="tournament-item-status">
                    Status: {tournament.status}
                  </div>
                </div>
                <div className="tournament-actions">
                  <button
                    className="tournament-edit-btn"
                    onClick={(e) => handleEditTournament(tournament, e)}
                    title="Edit Tournament"
                    aria-label={`Edit ${tournament.name}`}
                  >
                    ✏️
                  </button>
                  <button
                    className="tournament-delete-btn"
                    onClick={(e) => handleDeleteTournament(tournament, e)}
                    title="Delete Tournament"
                    aria-label={`Delete ${tournament.name}`}
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="tournament-card">
          {selectedTournament ? (
            <TournamentDetails
              tournament={selectedTournament}
              players={players}
              onUpdate={loadTournaments}
            />
          ) : (
            <div style={{ textAlign: 'center', color: '#666', marginTop: '50px' }}>
              Select a tournament to view details
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && tournamentToDelete && (
        <DeleteConfirmationModal
          tournament={tournamentToDelete}
          onConfirm={confirmDeleteTournament}
          onCancel={cancelDeleteTournament}
          loading={loading}
        />
      )}

      {/* Edit Tournament Modal */}
      {showEditModal && tournamentToEdit && (
        <EditTournamentModal
          tournament={tournamentToEdit}
          onSave={updateTournament}
          onCancel={() => setShowEditModal(false)}
          loading={loading}
        />
      )}
    </div>
  )
}

function CreateTournamentForm({ onSubmit, onCancel, loading }) {
  // Get today's date in local timezone
  const getLocalDateString = () => {
    const today = new Date()
    const year = today.getFullYear()
    const month = String(today.getMonth() + 1).padStart(2, '0')
    const day = String(today.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  const [formData, setFormData] = useState({
    name: '',
    date: getLocalDateString(),
    description: '',
    eventType: 'singles'
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    onSubmit(formData)
  }

  return (
    <form onSubmit={handleSubmit} style={{
      padding: '20px',
      border: '1px solid #ddd',
      borderRadius: '4px',
      marginBottom: '20px',
      backgroundColor: '#f8f9fa'
    }}>
      <h3>Create New Tournament</h3>
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1em', marginBottom: '15px' }}>
        <div>
          <label style={{ display: 'block', marginBottom: '5px' }}>Tournament Name:</label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
            style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
          />
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: '5px' }}>Date:</label>
          <input
            type="date"
            value={formData.date}
            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
            required
            style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
          />
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: '5px' }}>Event Type:</label>
          <select
            value={formData.eventType}
            onChange={(e) => setFormData({ ...formData, eventType: e.target.value })}
            style={{ 
              width: '100%', 
              padding: '8px', 
              borderRadius: '4px', 
              border: '1px solid #ddd',
              fontSize: '14px'
            }}
          >
            <option value="singles">Singles</option>
            <option value="doubles">Doubles</option>
          </select>
        </div>
      </div>

      <div style={{ marginBottom: '15px' }}>
        <label style={{ display: 'block', marginBottom: '5px' }}>Description:</label>
        <textarea
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          rows="3"
          style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
        />
      </div>

      <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
        <button
          type="submit"
          disabled={loading}
          style={{
            padding: '10px 20px',
            backgroundColor: '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.6 : 1
          }}
        >
          {loading ? 'Creating...' : 'Create Tournament'}
        </button>
        
        <a
          onClick={onCancel}
          style={{
            color: '#6c757d',
            cursor: loading ? 'not-allowed' : 'pointer',
            textDecoration: 'underline',
            opacity: loading ? 0.6 : 1,
            pointerEvents: loading ? 'none' : 'auto'
          }}
        >
          Cancel
        </a>
      </div>
    </form>
  )
}

function TournamentDetails({ tournament, players, onUpdate }) {
  const [selectedEvent, setSelectedEvent] = useState(null)
  const [registrationMode, setRegistrationMode] = useState(false)
  const [bracketView, setBracketView] = useState(null)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [eventMatches, setEventMatches] = useState({})

  // Load matches for an event to check completion status
  const loadEventMatches = async (eventId) => {
    try {
      const matches = await matchesApi.getByEvent(eventId)
      setEventMatches(prev => ({ ...prev, [eventId]: matches }))
      return matches
    } catch (error) {
      console.error('Error loading event matches:', error)
      return []
    }
  }

  // Check if all matches in an event are completed (no in_progress matches)
  const canCompleteEvent = (eventId) => {
    const matches = eventMatches[eventId] || []
    return matches.length > 0 && matches.every(match => 
      match.status === 'completed' || match.status === 'walkover' || match.status === 'cancelled'
    )
  }

  const generateDraw = async (eventId, eventType) => {
    setLoading(true)
    try {
      // Get participants for this event
      const participants = await participantsApi.getByEvent(eventId)
      
      if (participants.length < 4) {
        setMessage('❌ Need at least 4 participants to generate a draw')
        return
      }

      let draw, matches
      if (eventType === 'singles') {
        draw = generateSinglesDraw(participants)
        matches = generateMatches(eventId, draw, 'singles')
      } else {
        draw = generateDoublesDraw(participants)
        matches = generateMatches(eventId, draw, 'doubles')
      }

      // Create matches in database
      for (const match of matches) {
        await matchesApi.create(match)
      }

      // Update event status
      await eventsApi.update(eventId, {
        status: 'draw_created',
        draw_structure: draw
      })

      setMessage('✅ Draw generated successfully!')
      // Load matches for the event to enable completion checking
      await loadEventMatches(eventId)
      onUpdate()
    } catch (error) {
      console.error('Error generating draw:', error)
      setMessage(`❌ Error generating draw: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  const completeEvent = async (event) => {
    setLoading(true)
    try {
      const matches = eventMatches[event.id] || []
      
      if (!canCompleteEvent(event.id)) {
        setMessage('❌ Cannot complete event: some matches are still in progress')
        return
      }

      // Calculate points for each participant
      const participants = event.event_participants || []
      const pointsSystem = POINTS_SYSTEM[event.event_type]?.main || {}
      
      for (const participant of participants) {
        // Find the participant's best result in the tournament
        const playerMatches = matches.filter(match => 
          match.player1_id === participant.player_id || 
          match.player2_id === participant.player_id ||
          match.player1_partner_id === participant.player_id ||
          match.player2_partner_id === participant.player_id
        )

        // Determine the furthest round reached
        const furthestRound = calculateFurthestRound(playerMatches, participant.player_id)
        const pointsEarned = pointsSystem[furthestRound] || 0

        // Update player's ranking points
        if (pointsEarned > 0) {
          const currentPlayer = await playersApi.getById(participant.player_id)
          const currentRankingPoints = event.event_type === 'singles' 
            ? currentPlayer.singles_ranking_points || 0
            : currentPlayer.doubles_ranking_points || 0

          // Simple ranking calculation: average of recent results (you may want to refine this)
          const newRankingPoints = (currentRankingPoints + pointsEarned) / 2

          const updateData = event.event_type === 'singles' 
            ? { 
                singles_ranking_points: newRankingPoints,
                total_singles_points: (currentPlayer.total_singles_points || 0) + pointsEarned,
                singles_events_played: (currentPlayer.singles_events_played || 0) + 1
              }
            : { 
                doubles_ranking_points: newRankingPoints,
                total_doubles_points: (currentPlayer.total_doubles_points || 0) + pointsEarned,
                doubles_events_played: (currentPlayer.doubles_events_played || 0) + 1
              }

          await playersApi.update(participant.player_id, updateData)
        }
      }

      // Update event status to completed
      await eventsApi.update(event.id, { status: 'completed' })

      setMessage('✅ Event completed successfully! Points have been awarded to all players.')
      onUpdate()
    } catch (error) {
      console.error('Error completing event:', error)
      setMessage(`❌ Error completing event: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  // Helper function to calculate the furthest round a player reached
  const calculateFurthestRound = (playerMatches, playerId) => {
    const roundOrder = {
      'Round of 32': 1, 'round_32': 1,
      'Round of 16': 2, 'round_16': 2,
      'Quarter-Final': 3, 'quarter_final': 3,
      'Semi-Final': 4, 'semi_final': 4,
      'Final': 5, 'runner_up': 5,
      'Winner': 6, 'winner': 6
    }

    let furthestRound = 'round_32' // Default to first round
    let maxRoundOrder = 0

    for (const match of playerMatches) {
      const roundName = match.round_name?.toLowerCase().replace(/[^a-z0-9]/g, '_')
      const roundOrderValue = roundOrder[roundName] || roundOrder[match.round_name] || 1

      // If player won this match, they advanced to the next round
      if (match.winner_id === playerId && roundOrderValue > maxRoundOrder) {
        maxRoundOrder = roundOrderValue
        
        // Determine the achievement based on round
        if (match.round_name === 'Final') {
          furthestRound = 'winner'
        } else if (match.round_name === 'Semi-Final') {
          furthestRound = 'runner_up' // If they won semi, they reached final (runner_up minimum)
        } else if (match.round_name === 'Quarter-Final') {
          furthestRound = 'semi_final'
        } else if (match.round_name === 'Round of 16') {
          furthestRound = 'quarter_final'
        } else if (match.round_name === 'Round of 32') {
          furthestRound = 'round_16'
        }
      }
    }

    return furthestRound
  }

  // Load matches when component mounts or tournament changes
  useEffect(() => {
    if (tournament?.events) {
      tournament.events.forEach(event => {
        if (event.status === 'draw_created' || event.status === 'in_progress') {
          loadEventMatches(event.id)
        }
      })
    }
  }, [tournament])

  return (
    <div>
      <h3>{tournament.name}</h3>
      <p><strong>Date:</strong> {new Date(tournament.tournament_date + 'T12:00:00').toLocaleDateString()}</p>
      <p><strong>Status:</strong> {tournament.status}</p>
      {tournament.description && <p><strong>Description:</strong> {tournament.description}</p>}

      {message && (
        <div style={{
          padding: '10px',
          marginBottom: '15px',
          backgroundColor: message.includes('✅') ? '#d4edda' : '#f8d7da',
          border: `1px solid ${message.includes('✅') ? '#c3e6cb' : '#f5c6cb'}`,
          borderRadius: '4px'
        }}>
          {message}
        </div>
      )}

      <h4>Events</h4>
      {tournament.events?.map(event => (
        <div key={event.id} style={{
          border: '1px solid #ddd',
          borderRadius: '4px',
          padding: '15px',
          marginBottom: '15px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <h5 style={{ margin: 0 }}>
              {event.event_type.charAt(0).toUpperCase() + event.event_type.slice(1)} Event
            </h5>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{
                padding: '4px 8px',
                borderRadius: '4px',
                fontSize: '0.8em',
                backgroundColor: getStatusColor(event.status),
                color: 'white'
              }}>
                {event.status}
              </span>
              
              {/* Complete Event Button */}
              {(event.status === 'draw_created' || event.status === 'in_progress') && (
                <button
                  onClick={() => completeEvent(event)}
                  disabled={loading || !canCompleteEvent(event.id)}
                  style={{
                    padding: '4px 8px',
                    backgroundColor: canCompleteEvent(event.id) ? '#28a745' : '#6c757d',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: canCompleteEvent(event.id) && !loading ? 'pointer' : 'not-allowed',
                    fontSize: '0.8em',
                    opacity: canCompleteEvent(event.id) && !loading ? 1 : 0.6,
                    transition: 'all 0.3s ease'
                  }}
                  title={canCompleteEvent(event.id) ? 'Complete event and award points' : 'Some matches are still in progress'}
                >
                  {loading ? 'Completing...' : 'Complete Event'}
                </button>
              )}
              
              {/* Show completed status */}
              {event.status === 'completed' && (
                <span style={{
                  padding: '4px 8px',
                  backgroundColor: '#28a745',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  fontSize: '0.8em',
                  opacity: 0.8
                }}>
                  ✅ Event Completed
                </span>
              )}
            </div>
          </div>

          <p><strong>Participants:</strong> {event.event_participants?.length || 0} / {event.max_participants}</p>

          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            {event.status === 'registration' && (
              <>
                <button
                  onClick={() => setRegistrationMode(event.id)}
                  style={{
                    padding: '6px 12px',
                    backgroundColor: '#17a2b8',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  Manage Registration
                </button>
                <button
                  onClick={() => generateDraw(event.id, event.event_type)}
                  disabled={loading || (event.event_participants?.length || 0) < 4}
                  style={{
                    padding: '6px 12px',
                    backgroundColor: '#28a745',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    opacity: loading || (event.event_participants?.length || 0) < 4 ? 0.6 : 1
                  }}
                >
                  {loading ? 'Generating...' : 'Generate Draw'}
                </button>
              </>
            )}

            {(event.status === 'draw_created' || event.status === 'in_progress' || event.status === 'completed') && (
              <button
                onClick={() => setBracketView(bracketView === event.id ? null : event.id)}
                style={{
                  padding: '6px 12px',
                  backgroundColor: '#17a2b8',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                {bracketView === event.id ? 'Hide Bracket' : 'View Bracket'}
              </button>
            )}
            
            <button
              onClick={() => setSelectedEvent(selectedEvent === event.id ? null : event.id)}
              style={{
                padding: '6px 12px',
                backgroundColor: '#6c757d',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              {selectedEvent === event.id ? 'Hide Details' : 'View Details'}
            </button>
          </div>

          {selectedEvent === event.id && (
            <EventDetails event={event} />
          )}

          {bracketView === event.id && (
            <div style={{ marginTop: '15px' }}>
              <TournamentBracket 
                event={event} 
                onMatchUpdate={() => {
                  onUpdate()
                  // Refresh tournament details to get updated match data
                  setTimeout(() => onUpdate(), 500)
                }}
              />
            </div>
          )}

          {registrationMode === event.id && (
            <RegistrationManager
              event={event}
              players={players}
              onClose={() => setRegistrationMode(false)}
              onUpdate={onUpdate}
            />
          )}
        </div>
      ))}
    </div>
  )
}

function EventDetails({ event }) {
  return (
    <div className="event-details">
      <h6>Participants:</h6>
      {event.event_participants?.length > 0 ? (
        <div className="participants-grid">
          {event.event_participants.map(participant => (
            <div key={participant.id} className="participant-card">
              <div className="participant-header">
                <Avatar 
                  src={getUserAvatarByEmail(participant.player?.email)} 
                  alt={participant.player?.name}
                  size={40}
                />
                <div className="participant-info">
                  <div className="participant-name">
                    {participant.player?.name}
                    {participant.seed_position && (
                      <span className="participant-seed">
                        (Seed {participant.seed_position})
                      </span>
                    )}
                  </div>
                </div>
              </div>
              {participant.player && (
                <div className="participant-rank">
                  Rank: {event.event_type === 'singles' 
                    ? participant.player.singles_ranking_points?.toFixed(2) || '0.00'
                    : participant.player.doubles_ranking_points?.toFixed(2) || '0.00'
                  } pts
                </div>
              )}
              {participant.partner && (
                <div className="participant-partner">
                  <div className="partner-header">
                    <Avatar 
                      src={getUserAvatarByEmail(participant.partner?.email)} 
                      alt={participant.partner?.name}
                      size={32}
                    />
                    <div className="partner-info">
                      <span className="partner-name">Partner: {participant.partner.name}</span>
                      {participant.partner && (
                        <span className="participant-partner-rank">
                          ({event.event_type === 'doubles' 
                            ? participant.partner.doubles_ranking_points?.toFixed(2) || '0.00'
                            : participant.partner.singles_ranking_points?.toFixed(2) || '0.00'
                          } pts)
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )}
              <div className="participant-status">
                Status: {participant.status}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="no-participants">No participants registered yet</p>
      )}
    </div>
  )
}

function RegistrationManager({ event, players, onClose, onUpdate }) {
  const [selectedPlayers, setSelectedPlayers] = useState([])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  const registerPlayers = async () => {
    setLoading(true)
    try {
      for (const playerId of selectedPlayers) {
        await participantsApi.register(event.id, playerId)
      }
      setMessage('✅ Players registered successfully!')
      setSelectedPlayers([])
      onUpdate()
    } catch (error) {
      console.error('Error registering players:', error)
      setMessage(`❌ Error registering players: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  const registeredPlayerIds = event.event_participants?.map(p => p.player_id) || []
  const availablePlayers = players.filter(p => !registeredPlayerIds.includes(p.id))

  return (
    <div style={{
      marginTop: '15px',
      padding: '15px',
      border: '2px solid #007bff',
      borderRadius: '4px',
      backgroundColor: '#f8f9fa'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
        <h6 style={{ margin: 0 }}>Registration Manager</h6>
        <button
          onClick={onClose}
          style={{
            padding: '4px 8px',
            backgroundColor: '#6c757d',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Close
        </button>
      </div>

      {message && (
        <div style={{
          padding: '8px',
          marginBottom: '15px',
          backgroundColor: message.includes('✅') ? '#d4edda' : '#f8d7da',
          border: `1px solid ${message.includes('✅') ? '#c3e6cb' : '#f5c6cb'}`,
          borderRadius: '4px'
        }}>
          {message}
        </div>
      )}

      <div style={{ marginBottom: '15px' }}>
        <h6>Available Players:</h6>
        <div style={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid #ddd', borderRadius: '4px', padding: '10px' }}>
          {availablePlayers.map(player => (
            <label key={player.id} style={{ display: 'block', marginBottom: '5px' }}>
              <input
                type="checkbox"
                checked={selectedPlayers.includes(player.id)}
                onChange={(e) => {
                  if (e.target.checked) {
                    setSelectedPlayers([...selectedPlayers, player.id])
                  } else {
                    setSelectedPlayers(selectedPlayers.filter(id => id !== player.id))
                  }
                }}
                style={{ marginRight: '8px' }}
              />
              {player.name} (Ranking: {player.singles_ranking_points?.toFixed(2) || '0.00'})
            </label>
          ))}
        </div>
      </div>

      <button
        onClick={registerPlayers}
        disabled={loading || selectedPlayers.length === 0}
        style={{
          padding: '8px 16px',
          backgroundColor: '#28a745',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: loading || selectedPlayers.length === 0 ? 'not-allowed' : 'pointer',
          opacity: loading || selectedPlayers.length === 0 ? 0.6 : 1
        }}
      >
        {loading ? 'Registering...' : `Register ${selectedPlayers.length} Player(s)`}
      </button>
    </div>
  )
}

function DeleteConfirmationModal({ tournament, onConfirm, onCancel, loading }) {
  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onCancel()
    }
  }

  return (
    <div className="delete-modal-overlay" onClick={handleOverlayClick}>
      <div className="delete-modal">
        <div className="delete-modal-header">
          <h3 className="delete-modal-title">Delete Tournament</h3>
          <button className="delete-modal-close" onClick={onCancel}>×</button>
        </div>

        <div className="delete-modal-content">
          <div className="delete-warning-icon">⚠️</div>
          <p className="delete-warning-text">
            Are you sure you want to delete the tournament <strong>"{tournament.name}"</strong>?
          </p>
          <p className="delete-warning-subtext">
            This action cannot be undone. All associated events, matches, and participant data will be permanently removed.
          </p>
        </div>

        <div className="delete-modal-actions">
          <button className="btn btn-secondary" onClick={onCancel} disabled={loading}>
            Cancel
          </button>
          <button 
            className="btn btn-danger" 
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? 'Deleting...' : 'Delete Tournament'}
          </button>
        </div>
      </div>
    </div>
  )
}

function EditTournamentModal({ tournament, onSave, onCancel, loading }) {
  // Get today's date in local timezone
  const getLocalDateString = () => {
    const today = new Date()
    const year = today.getFullYear()
    const month = String(today.getMonth() + 1).padStart(2, '0')
    const day = String(today.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  const [formData, setFormData] = useState({
    name: tournament?.name || '',
    date: tournament?.tournament_date || getLocalDateString(),
    description: tournament?.description || '',
    eventType: tournament?.events?.[0]?.event_type || 'singles'
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    onSave(formData)
  }

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '20px'
    }}>
      <div style={{
        backgroundColor: 'var(--card-background)',
        borderRadius: '8px',
        padding: '30px',
        width: '100%',
        maxWidth: '500px',
        border: '1px solid var(--border-color)',
        boxShadow: '0 10px 25px rgba(0, 0, 0, 0.2)'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '25px'
        }}>
          <h2 style={{ 
            margin: 0, 
            color: 'var(--text-color)',
            fontSize: '24px'
          }}>
            Edit Tournament
          </h2>
          <button
            onClick={onCancel}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '24px',
              cursor: 'pointer',
              color: 'var(--text-secondary)',
              padding: '0',
              width: '30px',
              height: '30px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{
          padding: '20px',
          border: '1px solid var(--border-color)',
          borderRadius: '8px',
          backgroundColor: 'var(--background-color)'
        }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1em', marginBottom: '15px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '5px' }}>Tournament Name:</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '5px' }}>Date:</label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                required
                style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '5px' }}>Event Type:</label>
              <select
                value={formData.eventType}
                onChange={(e) => setFormData({ ...formData, eventType: e.target.value })}
                style={{ 
                  width: '100%', 
                  padding: '8px', 
                  borderRadius: '4px', 
                  border: '1px solid #ddd',
                  fontSize: '14px'
                }}
              >
                <option value="singles">Singles</option>
                <option value="doubles">Doubles</option>
              </select>
            </div>
          </div>

          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px' }}>Description:</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows="3"
              style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
            />
          </div>

          <div style={{ display: 'flex', gap: '15px', justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={onCancel}
              disabled={loading}
              style={{
                padding: '10px 20px',
                backgroundColor: 'transparent',
                color: 'var(--text-secondary)',
                border: '1px solid var(--border-color)',
                borderRadius: '4px',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.6 : 1
              }}
            >
              Cancel
            </button>
            
            <button
              type="submit"
              disabled={loading}
              style={{
                padding: '10px 20px',
                backgroundColor: '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.6 : 1
              }}
            >
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function getStatusColor(status) {
  switch (status) {
    case 'registration': return '#17a2b8'
    case 'draw_created': return '#ffc107'
    case 'in_progress': return '#fd7e14'
    case 'completed': return '#28a745'
    default: return '#6c757d'
  }
}
