import { useState, useEffect } from 'preact/hooks'
import { tournamentsApi, eventsApi, playersApi, participantsApi, matchesApi } from '../lib/supabase.js'
import { generateSinglesDraw, generateDoublesDraw, generateMatches } from '../lib/tournamentUtils.js'
import TournamentBracket from './TournamentBracket.jsx'

export default function TournamentManager() {
  const [tournaments, setTournaments] = useState([])
  const [selectedTournament, setSelectedTournament] = useState(null)
  const [players, setPlayers] = useState([])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [showCreateForm, setShowCreateForm] = useState(false)

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
      const tournament = await tournamentsApi.create({
        name: tournamentData.name,
        tournament_date: tournamentData.date,
        description: tournamentData.description,
        status: 'upcoming'
      })

      // Create events for the tournament
      if (tournamentData.includeSingles) {
        await eventsApi.create({
          tournament_id: tournament.id,
          event_type: 'singles',
          max_participants: tournamentData.maxSinglesParticipants || 32,
          status: 'registration'
        })
      }

      if (tournamentData.includeDoubles) {
        await eventsApi.create({
          tournament_id: tournament.id,
          event_type: 'doubles',
          max_participants: tournamentData.maxDoublesParticipants || 32,
          status: 'registration'
        })
      }

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

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
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
          loading={loading}
        />
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '20px' }}>
        <div>
          <h3>Tournaments</h3>
          <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
            {tournaments.map(tournament => (
              <div
                key={tournament.id}
                onClick={() => loadTournamentDetails(tournament.id)}
                style={{
                  padding: '10px',
                  margin: '5px 0',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  backgroundColor: selectedTournament?.id === tournament.id ? '#e3f2fd' : 'white'
                }}
              >
                <div style={{ fontWeight: 'bold' }}>{tournament.name}</div>
                <div style={{ fontSize: '0.9em', color: '#666' }}>
                  {new Date(tournament.tournament_date).toLocaleDateString()}
                </div>
                <div style={{ fontSize: '0.8em', color: '#999' }}>
                  Status: {tournament.status}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
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
    </div>
  )
}

function CreateTournamentForm({ onSubmit, loading }) {
  const [formData, setFormData] = useState({
    name: '',
    date: new Date().toISOString().split('T')[0],
    description: '',
    includeSingles: true,
    includeDoubles: true,
    maxSinglesParticipants: 32,
    maxDoublesParticipants: 32
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
      
      <div style={{ marginBottom: '15px' }}>
        <label style={{ display: 'block', marginBottom: '5px' }}>Tournament Name:</label>
        <input
          type="text"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          required
          style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
        />
      </div>

      <div style={{ marginBottom: '15px' }}>
        <label style={{ display: 'block', marginBottom: '5px' }}>Date:</label>
        <input
          type="date"
          value={formData.date}
          onChange={(e) => setFormData({ ...formData, date: e.target.value })}
          required
          style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
        />
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

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '15px' }}>
        <div>
          <label style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
            <input
              type="checkbox"
              checked={formData.includeSingles}
              onChange={(e) => setFormData({ ...formData, includeSingles: e.target.checked })}
              style={{ marginRight: '8px' }}
            />
            Include Singles Event
          </label>
          {formData.includeSingles && (
            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontSize: '0.9em' }}>Max Participants:</label>
              <input
                type="number"
                value={formData.maxSinglesParticipants}
                onChange={(e) => setFormData({ ...formData, maxSinglesParticipants: parseInt(e.target.value) })}
                min="4"
                max="64"
                style={{ width: '100%', padding: '6px', borderRadius: '4px', border: '1px solid #ddd' }}
              />
            </div>
          )}
        </div>

        <div>
          <label style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
            <input
              type="checkbox"
              checked={formData.includeDoubles}
              onChange={(e) => setFormData({ ...formData, includeDoubles: e.target.checked })}
              style={{ marginRight: '8px' }}
            />
            Include Doubles Event
          </label>
          {formData.includeDoubles && (
            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontSize: '0.9em' }}>Max Participants:</label>
              <input
                type="number"
                value={formData.maxDoublesParticipants}
                onChange={(e) => setFormData({ ...formData, maxDoublesParticipants: parseInt(e.target.value) })}
                min="4"
                max="64"
                style={{ width: '100%', padding: '6px', borderRadius: '4px', border: '1px solid #ddd' }}
              />
            </div>
          )}
        </div>
      </div>

      <button
        type="submit"
        disabled={loading || (!formData.includeSingles && !formData.includeDoubles)}
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
    </form>
  )
}

function TournamentDetails({ tournament, players, onUpdate }) {
  const [selectedEvent, setSelectedEvent] = useState(null)
  const [registrationMode, setRegistrationMode] = useState(false)
  const [bracketView, setBracketView] = useState(null)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

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
      onUpdate()
    } catch (error) {
      console.error('Error generating draw:', error)
      setMessage(`❌ Error generating draw: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <h3>{tournament.name}</h3>
      <p><strong>Date:</strong> {new Date(tournament.tournament_date).toLocaleDateString()}</p>
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
            <span style={{
              padding: '4px 8px',
              borderRadius: '4px',
              fontSize: '0.8em',
              backgroundColor: getStatusColor(event.status),
              color: 'white'
            }}>
              {event.status}
            </span>
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
    <div style={{ marginTop: '15px', padding: '10px', backgroundColor: '#f8f9fa', borderRadius: '4px' }}>
      <h6>Participants:</h6>
      {event.event_participants?.length > 0 ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '10px' }}>
          {event.event_participants.map(participant => (
            <div key={participant.id} style={{
              padding: '8px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              backgroundColor: 'white'
            }}>
              <div style={{ fontWeight: 'bold' }}>
                {participant.player?.name}
                {participant.seed_position && (
                  <span style={{ marginLeft: '5px', fontSize: '0.8em', color: '#666' }}>
                    (Seed {participant.seed_position})
                  </span>
                )}
              </div>
              {participant.partner && (
                <div style={{ fontSize: '0.9em', color: '#666' }}>
                  Partner: {participant.partner.name}
                </div>
              )}
              <div style={{ fontSize: '0.8em', color: '#999' }}>
                Status: {participant.status}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p style={{ color: '#666', fontStyle: 'italic' }}>No participants registered yet</p>
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

function getStatusColor(status) {
  switch (status) {
    case 'registration': return '#17a2b8'
    case 'draw_created': return '#ffc107'
    case 'in_progress': return '#fd7e14'
    case 'completed': return '#28a745'
    default: return '#6c757d'
  }
}
