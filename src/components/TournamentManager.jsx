import { useState, useEffect } from 'preact/hooks'
import { tournamentsApi, eventsApi, playersApi, participantsApi, matchesApi, rankingsApi } from '../lib/supabase.js'
import { generateSinglesDraw, generateDoublesDraw, generateMatches, POINTS_SYSTEM, syncNextRoundMatches, syncConsolationMatches, formatResultStatus } from '../lib/tournamentUtils.js'
import TournamentBracket from './TournamentBracket.jsx'
import Avatar from './Avatar.jsx'
import { getUserAvatarByEmail } from '../contexts/AuthContext.jsx'

// Loading Spinner Component
function LoadingSpinner({ size = 20, color = '#007bff' }) {
  return (
    <div
      style={{
        width: `${size}px`,
        height: `${size}px`,
        border: `2px solid ${color}20`,
        borderTop: `2px solid ${color}`,
        borderRadius: '50%',
        animation: 'spin 1s linear infinite',
        display: 'inline-block'
      }}
    />
  )
}

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
  const [showEditEventModal, setShowEditEventModal] = useState(false)
  const [eventToEdit, setEventToEdit] = useState(null)

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
        name: 'Temporary Name', // Will be updated with proper name after creation
        tournament_date: formattedDate,
        description: tournamentData.description,
        status: 'upcoming'
      })

      // Update tournament with proper name using the actual ID
      await tournamentsApi.update(tournament.id, {
        name: `Wee Weekly (${tournament.id})`
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

  const handleEditEvent = (event) => {
    setEventToEdit(event)
    setShowEditEventModal(true)
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
      
      // Update tournament basic info (name is auto-generated, so we don't update it)
      await tournamentsApi.update(tournamentToEdit.id, {
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

  const updateEvent = async (eventData) => {
    if (!eventToEdit) return
    
    setLoading(true)
    try {
      // Update event
      await eventsApi.update(eventToEdit.id, {
        event_type: eventData.eventType,
        status: eventData.status
      })

      setMessage('✅ Event updated successfully!')
      setShowEditEventModal(false)
      setEventToEdit(null)
      loadTournaments()
      
      // Refresh selected tournament if it contains the edited event
      if (selectedTournament?.events?.some(e => e.id === eventToEdit.id)) {
        loadTournamentDetails(selectedTournament.id)
      }
    } catch (error) {
      console.error('Error updating event:', error)
      setMessage(`❌ Error updating event: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  // Helper function to determine if a tournament is completed
  const isTournamentCompleted = (tournament) => {
    if (!tournament.events || tournament.events.length === 0) {
      return false
    }
    return tournament.events.every(event => event.status === 'completed')
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
          borderRadius: '4px',
          color: message.includes('✅') ? '#155724' : '#721c24'
        }}>
          {message}
        </div>
      )}

      <div style={{ marginBottom: '20px' }}>
        <button
          onClick={() => setShowCreateForm(true)}
          style={{
            padding: '10px 20px',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Create New Tournament
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 460px) 1fr', gap: '20px' }}>
        <div className="tournament-card">
          <h3>Tournaments</h3>
          <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
            {tournaments.map(tournament => {
              const isCompleted = isTournamentCompleted(tournament)
              return (
                <div
                  key={tournament.id}
                  onClick={() => loadTournamentDetails(tournament.id)}
                  className={`tournament-item ${selectedTournament?.id === tournament.id ? 'selected' : ''} ${isCompleted ? 'completed' : ''}`}
                >
                  <div className="tournament-item-content">
                    <div className="tournament-item-title">
                      {tournament.name}
                      <span className="participant-count">
                        {(() => {
                          const totalParticipants = tournament.events?.reduce((total, event) => {
                            return total + (event.event_participants?.length || 0)
                          }, 0) || 0
                          return ` (${totalParticipants} participant${totalParticipants !== 1 ? 's' : ''})`
                        })()}
                      </span>
                    </div>
                    <div className="tournament-item-date">
                      {new Date(tournament.tournament_date + 'T12:00:00').toLocaleDateString()}
                      {isCompleted && (
                        <span className="tournament-completed-indicator">
                          <span className="completed-text">Completed</span>
                          <span className="completed-check">✓</span>
                        </span>
                      )}
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
              )
            })}
          </div>
        </div>

        <div className="tournament-card">
          {selectedTournament ? (
            <TournamentDetails
              tournament={selectedTournament}
              players={players}
              onUpdate={() => {
                loadTournaments()
                if (selectedTournament) {
                  loadTournamentDetails(selectedTournament.id)
                }
              }}
              onEditEvent={handleEditEvent}
            />
          ) : (
            <div style={{ textAlign: 'center', color: '#666', marginTop: '50px' }}>
              Select a tournament to view details
            </div>
          )}
        </div>
      </div>

      {/* Create Tournament Modal */}
      {showCreateForm && (
        <CreateTournamentModal
          onSubmit={createTournament}
          onCancel={() => setShowCreateForm(false)}
          loading={loading}
        />
      )}

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

      {/* Edit Event Modal */}
      {showEditEventModal && eventToEdit && (
        <EditEventModal
          event={eventToEdit}
          onSave={updateEvent}
          onCancel={() => setShowEditEventModal(false)}
          loading={loading}
        />
      )}
    </div>
  )
}

function CreateTournamentModal({ onSubmit, onCancel, loading }) {
  // Get today's date in local timezone
  const getLocalDateString = () => {
    const today = new Date()
    const year = today.getFullYear()
    const month = String(today.getMonth() + 1).padStart(2, '0')
    const day = String(today.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  const [formData, setFormData] = useState({
    date: getLocalDateString(),
    description: '',
    eventType: 'singles'
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    onSubmit(formData)
  }

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onCancel()
    }
  }

  return (
    <div 
      style={{
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
      }}
      onClick={handleOverlayClick}
    >
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
            Create New Tournament
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
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1em', marginBottom: '15px' }}>
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
                opacity: loading ? 0.6 : 1,
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              {loading && <LoadingSpinner size={16} color="white" />}
              {loading ? 'Creating...' : 'Create Tournament'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function TournamentDetails({ tournament, players, onUpdate, onEditEvent }) {
  const [selectedEvent, setSelectedEvent] = useState(null)
  const [registrationMode, setRegistrationMode] = useState(false)
  const [bracketView, setBracketView] = useState(null)
  const [bracketType, setBracketType] = useState('main') // 'main' or 'consolation'
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [eventMatches, setEventMatches] = useState({})
  const [rankingMaps, setRankingMaps] = useState({ singles: new Map(), doubles: new Map() })

  useEffect(() => {
    let cancelled = false
    Promise.all([
      rankingsApi.getMap('singles'),
      rankingsApi.getMap('doubles')
    ])
      .then(([singles, doubles]) => {
        if (!cancelled) setRankingMaps({ singles, doubles })
      })
      .catch((error) => console.error('Error loading rankings:', error))
    return () => { cancelled = true }
  }, [tournament?.id])

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

      const rankingsByPlayerId = await rankingsApi.getMap(eventType)

      let draw, matches
      if (eventType === 'singles') {
        draw = generateSinglesDraw(participants, rankingsByPlayerId)
        matches = generateMatches(eventId, draw, 'singles')
      } else {
        draw = generateDoublesDraw(participants, rankingsByPlayerId)
        matches = generateMatches(eventId, draw, 'doubles')
      }

      // Persist seed positions on participants
      const seedUpdates = new Map()
      if (eventType === 'singles') {
        for (const slot of draw.bracket || []) {
          if (slot?.id) {
            seedUpdates.set(slot.id, slot.seed_position || null)
          }
        }
      } else {
        for (const slot of draw.bracket || []) {
          if (!slot) continue
          if (slot.player1?.id) {
            seedUpdates.set(slot.player1.id, slot.seed_position || null)
          }
          if (slot.player2?.id) {
            seedUpdates.set(slot.player2.id, null)
          }
        }
      }
      for (const [participantId, seedPosition] of seedUpdates.entries()) {
        await participantsApi.update(participantId, { seed_position: seedPosition })
      }

      // Create matches in database
      for (const match of matches) {
        await matchesApi.create(match)
      }

      // Seed progressive next-round slots from Bye winners (vs Pending)
      const firstRoundName = matches[0]?.round_name
      if (firstRoundName) {
        await syncNextRoundMatches(eventId, firstRoundName)
        await syncConsolationMatches(eventId)
      }

      // Update event status
      await eventsApi.update(eventId, {
        status: 'draw_created',
        draw_structure: draw
      })

      setMessage(`✅ Draw generated successfully! (${draw.seededCount || 0} seeded, ${draw.numberOfByes || 0} byes)`)
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

      // Award points onto event_participants (source of truth for rankings)
      const participants = event.event_participants || []
      const pointsSystem = POINTS_SYSTEM[event.event_type]?.main || {}
      
      for (const participant of participants) {
        const playerMatches = matches.filter(match => 
          match.player1_id === participant.player_id || 
          match.player2_id === participant.player_id ||
          match.player1_partner_id === participant.player_id ||
          match.player2_partner_id === participant.player_id
        )

        const furthestRound = calculateFurthestRound(playerMatches, participant.player_id)
        const pointsEarned = pointsSystem[furthestRound] || 0

        await participantsApi.update(participant.id, {
          points_earned: pointsEarned,
          status: furthestRound
        })
      }

      // Update event status to completed
      await eventsApi.update(event.id, { status: 'completed' })

      setMessage('✅ Event completed successfully! Points saved for all participants.')
      onUpdate()
    } catch (error) {
      console.error('Error completing event:', error)
      setMessage(`❌ Error completing event: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  // Helper: furthest main-bracket round reached (used for points + status)
  const calculateFurthestRound = (playerMatches, playerId) => {
    const mainMatches = playerMatches.filter(
      (match) => match.bracket_type === 'main' || !match.bracket_type
    )

    const eliminationRound = {
      'Round of 32': 'round_32',
      'Round of 16': 'round_16',
      'Quarter-Final': 'quarter_final',
      'Semi-Final': 'semi_final',
      Final: 'runner_up'
    }

    const advanceFrom = {
      'Round of 32': 'round_16',
      'Round of 16': 'quarter_final',
      'Quarter-Final': 'semi_final',
      'Semi-Final': 'runner_up',
      Final: 'winner'
    }

    const rank = {
      round_32: 1,
      round_16: 2,
      quarter_final: 3,
      semi_final: 4,
      runner_up: 5,
      winner: 6
    }

    let furthestRound = null
    let maxRank = 0

    for (const match of mainMatches) {
      if (match.status !== 'completed' && match.status !== 'walkover') continue
      if (match.score === 'Bye' && match.winner_id === playerId) {
        // Bye advances you; don't set elimination round from the bye itself
        const advanced = advanceFrom[match.round_name]
        if (advanced && (rank[advanced] || 0) > maxRank) {
          maxRank = rank[advanced]
          furthestRound = advanced
        }
        continue
      }

      if (match.winner_id === playerId) {
        const advanced = advanceFrom[match.round_name]
        if (advanced && (rank[advanced] || 0) > maxRank) {
          maxRank = rank[advanced]
          furthestRound = advanced
        }
      } else if (
        match.player1_id === playerId ||
        match.player2_id === playerId ||
        match.player1_partner_id === playerId ||
        match.player2_partner_id === playerId
      ) {
        const eliminated = eliminationRound[match.round_name]
        if (eliminated && (rank[eliminated] || 0) > maxRank) {
          maxRank = rank[eliminated]
          furthestRound = eliminated
        }
      }
    }

    return furthestRound || 'round_32'
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
      {tournament.description && <p><strong>Description:</strong> {tournament.description}</p>}

      {message && (
        <div style={{
          padding: '10px',
          marginBottom: '15px',
          backgroundColor: message.includes('✅') ? '#d4edda' : '#f8d7da',
          border: `1px solid ${message.includes('✅') ? '#c3e6cb' : '#f5c6cb'}`,
          borderRadius: '4px',
          color: message.includes('✅') ? '#155724' : '#721c24'
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
                {event.status === 'draw_created' ? 'Draw Created' : event.status}
              </span>
              
              {/* Edit Event Button */}
              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  onEditEvent(event);
                }}
                style={{
                  color: '#6c757d',
                  textDecoration: 'underline',
                  fontSize: '0.8em',
                  cursor: 'pointer',
                  marginLeft: '8px'
                }}
              >
                Edit Event
              </a>
              
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
                    transition: 'all 0.3s ease',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                  title={canCompleteEvent(event.id) ? 'Complete event and award points' : 'Some matches are still in progress'}
                >
                  {loading && <LoadingSpinner size={12} color="white" />}
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

          <p><strong>Participants:</strong> {event.event_participants?.length || 0}</p>

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
                    opacity: loading || (event.event_participants?.length || 0) < 4 ? 0.6 : 1,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  {loading && <LoadingSpinner size={14} color="white" />}
                  {loading ? 'Generating...' : 'Generate Draw'}
                </button>
              </>
            )}

            {(event.status === 'draw_created' || event.status === 'in_progress' || event.status === 'completed') && (
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => {
                    if (bracketView === event.id && bracketType === 'main') {
                      setBracketView(null)
                    } else {
                      setBracketView(event.id)
                      setBracketType('main')
                    }
                  }}
                  style={{
                    padding: '6px 12px',
                    backgroundColor: bracketView === event.id && bracketType === 'main' ? '#0056b3' : '#17a2b8',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  {bracketView === event.id && bracketType === 'main' ? 'Hide Main Bracket' : 'Main Bracket'}
                </button>
                <button
                  onClick={() => {
                    if (bracketView === event.id && bracketType === 'consolation') {
                      setBracketView(null)
                    } else {
                      setBracketView(event.id)
                      setBracketType('consolation')
                    }
                  }}
                  style={{
                    padding: '6px 12px',
                    backgroundColor: bracketView === event.id && bracketType === 'consolation' ? '#0056b3' : '#17a2b8',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  {bracketView === event.id && bracketType === 'consolation' ? 'Hide Consolation' : 'Consolation'}
                </button>
              </div>
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
            <EventDetails
              event={event}
              playersById={rankingMaps[event.event_type] || new Map()}
            />
          )}

          {bracketView === event.id && (
            <div style={{ marginTop: '15px' }}>
              <TournamentBracket 
                event={event} 
                bracketType={bracketType}
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

function EventDetails({ event, playersById = new Map() }) {
  return (
    <div className="event-details">
      <h6>Participants:</h6>
      {event.event_participants?.length > 0 ? (
        <div className="participants-grid">
          {event.event_participants.map(participant => {
            const ranking = playersById.get(participant.player_id)
            const partnerRanking = participant.partner_id
              ? playersById.get(participant.partner_id)
              : null
            return (
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
                  Rank pts: {(ranking?.rankPoints ?? 0).toFixed(2)}
                  {typeof participant.points_earned === 'number' && (
                    <> · Event pts: {participant.points_earned}</>
                  )}
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
                      <span className="participant-partner-rank">
                        ({(partnerRanking?.rankPoints ?? 0).toFixed(2)} pts)
                      </span>
                    </div>
                  </div>
                </div>
              )}
              <div className="participant-status">
                Status: {formatResultStatus(participant.status)}
              </div>
            </div>
            )
          })}
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
  const [rankedPlayers, setRankedPlayers] = useState(players)

  useEffect(() => {
    let cancelled = false
    playersApi.getAllWithRankings(event.event_type)
      .then((data) => {
        if (!cancelled) setRankedPlayers(data)
      })
      .catch((error) => console.error('Error loading ranked players:', error))
    return () => { cancelled = true }
  }, [event.event_type])

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
  const availablePlayers = rankedPlayers.filter(p => !registeredPlayerIds.includes(p.id))

  return (
    <div style={{
      marginTop: '15px',
      padding: '15px',
      border: '2px solid var(--accent-primary)',
      borderRadius: '4px',
      backgroundColor: 'var(--bg-secondary)'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
        <h6 style={{ margin: 0, color: 'var(--text-primary)' }}>Registration Manager</h6>
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
          backgroundColor: message.includes('✅') ? 'var(--success)' : 'var(--danger)',
          color: 'white',
          borderRadius: '4px'
        }}>
          {message}
        </div>
      )}

      <div style={{ marginBottom: '15px' }}>
        <h6 style={{ color: 'var(--text-primary)' }}>Available Players:</h6>
        <div style={{ 
          maxHeight: '200px', 
          overflowY: 'auto', 
          border: '1px solid var(--border-color)', 
          borderRadius: '4px', 
          padding: '10px',
          backgroundColor: 'var(--bg-primary)'
        }}>
          {availablePlayers.map(player => (
            <label key={player.id} style={{ 
              display: 'block', 
              marginBottom: '5px',
              color: 'var(--text-primary)',
              cursor: 'pointer'
            }}>
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
              {player.name} (Rank pts: {(player.rankPoints ?? 0).toFixed(2)})
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
          opacity: loading || selectedPlayers.length === 0 ? 0.6 : 1,
          display: 'flex',
          alignItems: 'center',
          gap: '6px'
        }}
      >
        {loading && <LoadingSpinner size={14} color="white" />}
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
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            {loading && <LoadingSpinner size={16} color="white" />}
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
          <div style={{ marginBottom: '15px', padding: '10px', backgroundColor: 'var(--card-background)', borderRadius: '4px', border: '1px solid var(--border-color)' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', color: 'var(--text-secondary)' }}>Tournament Name (Auto-generated):</label>
            <div style={{ fontSize: '16px', fontWeight: '500', color: 'var(--text-color)' }}>{tournament?.name}</div>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1em', marginBottom: '15px' }}>
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
                opacity: loading ? 0.6 : 1,
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              {loading && <LoadingSpinner size={16} color="white" />}
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function EditEventModal({ event, onSave, onCancel, loading }) {
  const [formData, setFormData] = useState({
    eventType: event?.event_type || 'singles',
    status: event?.status || 'registration'
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    onSave(formData)
  }

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onCancel()
    }
  }

  return (
    <div 
      style={{
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
      }}
      onClick={handleOverlayClick}
    >
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
            Edit Event
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
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1em', marginBottom: '15px' }}>
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

            <div>
              <label style={{ display: 'block', marginBottom: '5px' }}>Status:</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                style={{ 
                  width: '100%', 
                  padding: '8px', 
                  borderRadius: '4px', 
                  border: '1px solid #ddd',
                  fontSize: '14px'
                }}
              >
                <option value="registration">Registration</option>
                <option value="draw_created">Draw Created</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
              </select>
            </div>
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
                opacity: loading ? 0.6 : 1,
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              {loading && <LoadingSpinner size={16} color="white" />}
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
