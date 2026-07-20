import { useState, useEffect } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import Paper from '@mui/material/Paper'
import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import ListItemButton from '@mui/material/ListItemButton'
import ListItemText from '@mui/material/ListItemText'
import Chip from '@mui/material/Chip'
import Alert from '@mui/material/Alert'
import Snackbar from '@mui/material/Snackbar'
import CircularProgress from '@mui/material/CircularProgress'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import DialogContentText from '@mui/material/DialogContentText'
import TextField from '@mui/material/TextField'
import FormControl from '@mui/material/FormControl'
import FormControlLabel from '@mui/material/FormControlLabel'
import InputLabel from '@mui/material/InputLabel'
import Select from '@mui/material/Select'
import MenuItem from '@mui/material/MenuItem'
import Checkbox from '@mui/material/Checkbox'
import Stack from '@mui/material/Stack'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import CloseIcon from '@mui/icons-material/Close'
import { tournamentsApi, eventsApi, playersApi, participantsApi, matchesApi, rankingsApi } from '../lib/supabase.js'
import { generateSinglesDraw, generateDoublesDraw, generateMatches, POINTS_SYSTEM, syncNextRoundMatches, syncConsolationMatches, formatResultStatus, ODD_DOUBLES_REGISTRANTS_MESSAGE } from '../lib/tournamentUtils.js'
import TournamentBracket from './TournamentBracket.jsx'
import Avatar from './Avatar.jsx'
import { getUserAvatarByEmail } from '../contexts/AuthContext.jsx'

function getLocalDateString() {
  const today = new Date()
  const year = today.getFullYear()
  const month = String(today.getMonth() + 1).padStart(2, '0')
  const day = String(today.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function getStatusChipColor(status) {
  switch (status) {
    case 'registration': return 'info'
    case 'draw_created': return 'warning'
    case 'in_progress': return 'primary'
    case 'completed': return 'success'
    default: return 'default'
  }
}

function formatStatusLabel(status) {
  if (status === 'draw_created') return 'Draw Created'
  if (!status) return ''
  return status.replace(/_/g, ' ')
}

function stripMessagePrefix(message) {
  return message.replace(/^[✅❌]\s*/, '')
}

function isSuccessMessage(message) {
  return message.includes('✅')
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
      const localDate = new Date(tournamentData.date + 'T12:00:00')
      const formattedDate = localDate.toISOString().split('T')[0]

      const tournament = await tournamentsApi.create({
        name: 'Temporary Name',
        tournament_date: formattedDate,
        description: tournamentData.description,
        status: 'upcoming'
      })

      await tournamentsApi.update(tournament.id, {
        name: `Wee Weekly (${tournament.id})`
      })

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
    event.stopPropagation()
    setTournamentToDelete(tournament)
    setShowDeleteModal(true)
  }

  const handleEditTournament = (tournament, event) => {
    event.stopPropagation()
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
      const localDate = new Date(tournamentData.date + 'T12:00:00')
      const formattedDate = localDate.toISOString().split('T')[0]

      await tournamentsApi.update(tournamentToEdit.id, {
        tournament_date: formattedDate,
        description: tournamentData.description
      })

      if (tournamentData.eventType !== tournamentToEdit.events?.[0]?.event_type) {
        const currentEvents = tournamentToEdit.events || []

        for (const event of currentEvents) {
          await eventsApi.delete(event.id)
        }

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
      await eventsApi.update(eventToEdit.id, {
        event_type: eventData.eventType,
        status: eventData.status
      })

      setMessage('✅ Event updated successfully!')
      setShowEditEventModal(false)
      setEventToEdit(null)
      loadTournaments()

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

  const isTournamentCompleted = (tournament) => {
    if (!tournament.events || tournament.events.length === 0) {
      return false
    }
    return tournament.events.every(event => event.status === 'completed')
  }

  return (
    <Box sx={{ p: 2.5, mx: 'auto' }}>
      <Typography variant="h5" component="h2" gutterBottom>
        Tournament Manager
      </Typography>

      <Snackbar
        open={Boolean(message)}
        autoHideDuration={5000}
        onClose={() => setMessage('')}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setMessage('')}
          severity={isSuccessMessage(message) ? 'success' : 'error'}
          variant="filled"
          sx={{ width: '100%' }}
        >
          {stripMessagePrefix(message)}
        </Alert>
      </Snackbar>

      <Box sx={{ mb: 2.5 }}>
        <Button variant="contained" color="primary" size="small" onClick={() => setShowCreateForm(true)}>
          Create New Tournament
        </Button>
      </Box>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: 'minmax(300px, 460px) 1fr' },
          gap: 2.5
        }}
      >
        <Paper variant="outlined" sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            Tournaments
          </Typography>
          <List dense sx={{ maxHeight: 400, overflowY: 'auto', py: 0 }}>
            {tournaments.map(tournament => {
              const isCompleted = isTournamentCompleted(tournament)
              const selected = selectedTournament?.id === tournament.id
              const totalParticipants = tournament.events?.reduce((total, event) => {
                return total + (event.event_participants?.length || 0)
              }, 0) || 0

              return (
                <ListItem
                  key={tournament.id}
                  disablePadding
                  secondaryAction={
                    <Stack direction="row" spacing={0.5}>
                      <IconButton
                        edge="end"
                        size="small"
                        aria-label={`Edit ${tournament.name}`}
                        onClick={(e) => handleEditTournament(tournament, e)}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        edge="end"
                        size="small"
                        color="error"
                        aria-label={`Delete ${tournament.name}`}
                        onClick={(e) => handleDeleteTournament(tournament, e)}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Stack>
                  }
                  sx={{
                    mb: 0.5,
                    border: 1,
                    borderColor: selected
                      ? 'primary.main'
                      : isCompleted
                        ? 'success.dark'
                        : 'divider',
                    borderRadius: 1,
                    bgcolor: selected && !isCompleted
                      ? 'action.selected'
                      : isCompleted
                        ? 'success.dark'
                        : 'background.paper',
                    color: isCompleted ? 'common.white' : 'inherit',
                    '& .MuiIconButton-root': {
                      color: isCompleted ? 'common.white' : 'inherit'
                    },
                    '& .MuiIconButton-root.MuiIconButton-colorError': {
                      color: isCompleted ? 'common.white' : undefined
                    }
                  }}
                >
                  <ListItemButton
                    selected={selected}
                    onClick={() => loadTournamentDetails(tournament.id)}
                    sx={{
                      pr: 10,
                      '&.Mui-selected': {
                        bgcolor: isCompleted ? 'success.dark' : undefined
                      },
                      '&.Mui-selected:hover': {
                        bgcolor: isCompleted ? 'success.main' : undefined
                      },
                      '&:hover': {
                        bgcolor: isCompleted ? 'success.main' : undefined
                      }
                    }}
                  >
                    <ListItemText
                      primaryTypographyProps={{ component: 'div' }}
                      secondaryTypographyProps={{ component: 'div' }}
                      primary={
                        <Box component="span" sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                          <Typography
                            component="span"
                            variant="body2"
                            fontWeight={600}
                            sx={{ color: isCompleted ? '#fff' : 'text.primary' }}
                          >
                            {tournament.name}
                          </Typography>
                          <Typography
                            component="span"
                            variant="caption"
                            sx={{ color: isCompleted ? 'rgba(255,255,255,0.85)' : 'text.secondary' }}
                          >
                            ({totalParticipants} participant{totalParticipants !== 1 ? 's' : ''})
                          </Typography>
                        </Box>
                      }
                      secondary={
                        <Box component="span" sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                          <Typography
                            component="span"
                            variant="caption"
                            sx={{ color: isCompleted ? 'rgba(255,255,255,0.85)' : 'text.secondary' }}
                          >
                            {new Date(tournament.tournament_date + 'T12:00:00').toLocaleDateString()}
                          </Typography>
                          {isCompleted && (
                            <Chip
                              size="small"
                              icon={<CheckCircleIcon />}
                              label="Completed"
                              sx={{
                                height: 20,
                                bgcolor: 'rgba(255,255,255,0.2)',
                                color: '#fff',
                                '& .MuiChip-icon': { color: '#fff' },
                                '& .MuiChip-label': { px: 0.75, fontSize: '0.7rem' }
                              }}
                            />
                          )}
                        </Box>
                      }
                    />
                  </ListItemButton>
                </ListItem>
              )
            })}
          </List>
        </Paper>

        <Paper variant="outlined" sx={{ p: 2, minHeight: 200 }}>
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
              onPlayersChange={loadPlayers}
              onEditEvent={handleEditEvent}
            />
          ) : (
            <Typography color="text.secondary" sx={{ textAlign: 'center', mt: 6 }}>
              Select a tournament to view details
            </Typography>
          )}
        </Paper>
      </Box>

      <CreateTournamentModal
        open={showCreateForm}
        onSubmit={createTournament}
        onCancel={() => setShowCreateForm(false)}
        loading={loading}
      />

      <DeleteConfirmationModal
        open={showDeleteModal && Boolean(tournamentToDelete)}
        tournament={tournamentToDelete}
        onConfirm={confirmDeleteTournament}
        onCancel={cancelDeleteTournament}
        loading={loading}
      />

      <EditTournamentModal
        open={showEditModal && Boolean(tournamentToEdit)}
        tournament={tournamentToEdit}
        onSave={updateTournament}
        onCancel={() => setShowEditModal(false)}
        loading={loading}
      />

      <EditEventModal
        open={showEditEventModal && Boolean(eventToEdit)}
        event={eventToEdit}
        onSave={updateEvent}
        onCancel={() => setShowEditEventModal(false)}
        loading={loading}
      />
    </Box>
  )
}

function CreateTournamentModal({ open, onSubmit, onCancel, loading }) {
  const [formData, setFormData] = useState({
    date: getLocalDateString(),
    description: '',
    eventType: 'singles'
  })

  useEffect(() => {
    if (open) {
      setFormData({
        date: getLocalDateString(),
        description: '',
        eventType: 'singles'
      })
    }
  }, [open])

  const handleSubmit = (e) => {
    e.preventDefault()
    onSubmit(formData)
  }

  return (
    <Dialog open={open} onClose={loading ? undefined : onCancel} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pr: 1 }}>
        Create New Tournament
        <IconButton aria-label="close" onClick={onCancel} disabled={loading} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <form onSubmit={handleSubmit}>
        <DialogContent dividers>
          <Stack spacing={2}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                label="Date"
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                required
                size="small"
                fullWidth
                slotProps={{ inputLabel: { shrink: true } }}
              />
              <FormControl size="small" fullWidth>
                <InputLabel id="create-event-type-label">Event Type</InputLabel>
                <Select
                  labelId="create-event-type-label"
                  label="Event Type"
                  value={formData.eventType}
                  onChange={(e) => setFormData({ ...formData, eventType: e.target.value })}
                >
                  <MenuItem value="singles">Singles</MenuItem>
                  <MenuItem value="doubles">Doubles</MenuItem>
                </Select>
              </FormControl>
            </Stack>
            <TextField
              label="Description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              multiline
              rows={3}
              size="small"
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={onCancel} disabled={loading} color="inherit">
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            color="success"
            disabled={loading}
            startIcon={loading ? <CircularProgress size={16} color="inherit" /> : null}
          >
            {loading ? 'Creating...' : 'Create Tournament'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  )
}

function TournamentDetails({ tournament, players, onUpdate, onPlayersChange, onEditEvent }) {
  const [selectedEvent, setSelectedEvent] = useState(null)
  const [registrationMode, setRegistrationMode] = useState(false)
  const [bracketView, setBracketView] = useState(null)
  const [bracketType, setBracketType] = useState('main')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [drawErrorModal, setDrawErrorModal] = useState(null)
  const [eventToReset, setEventToReset] = useState(null)
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

  const canCompleteEvent = (eventId) => {
    const matches = eventMatches[eventId] || []
    return matches.length > 0 && matches.every(match =>
      match.status === 'completed' || match.status === 'walkover' || match.status === 'cancelled'
    )
  }

  const generateDraw = async (eventId, eventType) => {
    setLoading(true)
    try {
      const participants = await participantsApi.getByEvent(eventId)

      if (participants.length < 4) {
        setMessage('❌ Need at least 4 participants to generate a draw')
        return
      }

      if (eventType === 'doubles' && participants.length % 2 !== 0) {
        setDrawErrorModal(ODD_DOUBLES_REGISTRANTS_MESSAGE)
        return
      }

      // Use the same ranking dataset/order as registration + leaderboard UI
      const rankedPlayersList = await playersApi.getAllWithRankings(eventType)
      const rankingsByPlayerId = new Map(
        rankedPlayersList.map((player) => [String(player.id), player])
      )

      let draw, matches
      if (eventType === 'singles') {
        draw = generateSinglesDraw(participants, rankingsByPlayerId)
        matches = generateMatches(eventId, draw, 'singles')
      } else {
        draw = generateDoublesDraw(participants, rankingsByPlayerId)
        matches = generateMatches(eventId, draw, 'doubles')
      }

      if ((draw.seededCount || 0) === 0) {
        setMessage(
          '⚠️ Draw created, but no seeds were assigned. Nobody in this event has completed-event ranking points on the leaderboard yet.'
        )
      }

      const seedUpdates = new Map()
      // Always clear every participant's seed first so regenerating a draw
      // cannot leave stale seed numbers behind.
      for (const participant of participants) {
        seedUpdates.set(participant.id, null)
      }

      if (eventType === 'singles') {
        for (const seeded of draw.seededPlayers || []) {
          if (seeded?.id) {
            seedUpdates.set(seeded.id, seeded.seed_position)
          }
        }
      } else {
        for (const seeded of draw.seededPlayers || []) {
          // Doubles: seed lives on the seeded player participant row
          if (seeded?.id) {
            seedUpdates.set(seeded.id, seeded.seed_position)
          }
        }
        // Partners / unseeded already cleared above
      }

      for (const [participantId, seedPosition] of seedUpdates.entries()) {
        await participantsApi.update(participantId, { seed_position: seedPosition })
      }

      for (const match of matches) {
        await matchesApi.create(match)
      }

      const firstRoundName = matches[0]?.round_name
      if (firstRoundName) {
        await syncNextRoundMatches(eventId, firstRoundName)
        await syncConsolationMatches(eventId)
      }

      await eventsApi.update(eventId, {
        status: 'draw_created',
        draw_structure: draw
      })

      const byeNote = draw.numberOfByes > (draw.seededCount || 0)
        ? ` (${draw.numberOfByes - (draw.seededCount || 0)} bye(s) to unseeded players)`
        : ''
      setMessage(
        `✅ Draw generated successfully! ${draw.seededCount || 0} seed(s), ${draw.numberOfByes || 0} bye(s)${byeNote}`
      )
      setRegistrationMode(false)
      setSelectedEvent((current) => (current === eventId ? null : current))
      await loadEventMatches(eventId)
      onUpdate()
    } catch (error) {
      console.error('Error generating draw:', error)
      if (error.message === ODD_DOUBLES_REGISTRANTS_MESSAGE) {
        setDrawErrorModal(ODD_DOUBLES_REGISTRANTS_MESSAGE)
      } else {
        setMessage(`❌ Error generating draw: ${error.message}`)
      }
    } finally {
      setLoading(false)
    }
  }

  const resetDraw = async () => {
    if (!eventToReset) return

    setLoading(true)
    try {
      const eventId = eventToReset.id
      const participants = await participantsApi.getByEvent(eventId)

      await matchesApi.deleteByEvent(eventId)

      for (const participant of participants) {
        await participantsApi.update(participant.id, {
          seed_position: null,
          points_earned: 0,
          status: 'registered'
        })
      }

      await eventsApi.update(eventId, {
        status: 'registration',
        draw_structure: null
      })

      setEventMatches((prev) => {
        const next = { ...prev }
        delete next[eventId]
        return next
      })
      if (bracketView === eventId) setBracketView(null)
      setSelectedEvent(eventId)
      setRegistrationMode(eventId)
      setEventToReset(null)
      setMessage('✅ Draw reset. You can update registration and generate a new draw.')
      onUpdate()
    } catch (error) {
      console.error('Error resetting draw:', error)
      setMessage(`❌ Error resetting draw: ${error.message}`)
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
    <Box>
      <Typography variant="h6" gutterBottom>
        {tournament.name}
      </Typography>
      <Typography variant="body2" sx={{ mb: 0.5 }}>
        <strong>Date:</strong> {new Date(tournament.tournament_date + 'T12:00:00').toLocaleDateString()}
      </Typography>
      {tournament.description && (
        <Typography variant="body2" sx={{ mb: 1.5 }}>
          <strong>Description:</strong> {tournament.description}
        </Typography>
      )}

      {message && (
        <Alert
          severity={isSuccessMessage(message) ? 'success' : 'error'}
          onClose={() => setMessage('')}
          sx={{ mb: 2 }}
        >
          {stripMessagePrefix(message)}
        </Alert>
      )}

      <Typography variant="subtitle1" fontWeight={600} gutterBottom>
        Events
      </Typography>

      {tournament.events?.map(event => (
        <Paper key={event.id} variant="outlined" sx={{ p: 2, mb: 2 }}>
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            justifyContent="space-between"
            alignItems={{ xs: 'flex-start', sm: 'center' }}
            spacing={1}
            sx={{ mb: 1.5 }}
          >
            <Typography variant="subtitle1" fontWeight={600}>
              {event.event_type.charAt(0).toUpperCase() + event.event_type.slice(1)} Event
            </Typography>
            <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap" useFlexGap>
              <Chip
                size="small"
                label={formatStatusLabel(event.status)}
                color={getStatusChipColor(event.status)}
              />
              <Button size="small" color="inherit" onClick={() => onEditEvent(event)}>
                Edit Event
              </Button>
              {(event.status === 'draw_created' || event.status === 'in_progress') && (
                <Button
                  size="small"
                  variant="contained"
                  color="success"
                  onClick={() => completeEvent(event)}
                  disabled={loading || !canCompleteEvent(event.id)}
                  startIcon={loading ? <CircularProgress size={12} color="inherit" /> : null}
                  title={canCompleteEvent(event.id) ? 'Complete event and award points' : 'Some matches are still in progress'}
                >
                  {loading ? 'Completing...' : 'Complete Event'}
                </Button>
              )}
              {event.status === 'completed' && (
                <Chip size="small" color="success" label="Event Completed" icon={<CheckCircleIcon />} />
              )}
            </Stack>
          </Stack>

          <Typography variant="body2" sx={{ mb: 1.5 }}>
            <strong>Participants:</strong> {event.event_participants?.length || 0}
          </Typography>

          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            {event.status === 'registration' && (
              <>
                <Button
                  size="small"
                  variant="contained"
                  color="info"
                  onClick={() => setRegistrationMode(event.id)}
                >
                  Manage Registration
                </Button>
                <Button
                  size="small"
                  variant="contained"
                  color="success"
                  onClick={() => generateDraw(event.id, event.event_type)}
                  disabled={loading || (event.event_participants?.length || 0) < 4}
                  startIcon={loading ? <CircularProgress size={14} color="inherit" /> : null}
                >
                  {loading ? 'Generating...' : 'Generate Draw'}
                </Button>
              </>
            )}

            {(event.status === 'draw_created' || event.status === 'in_progress') && (
              <Button
                size="small"
                variant="outlined"
                color="warning"
                onClick={() => setEventToReset(event)}
                disabled={loading}
              >
                Reset Draw
              </Button>
            )}

            {(event.status === 'draw_created' || event.status === 'in_progress' || event.status === 'completed') && (
              <>
                <Button
                  size="small"
                  variant="contained"
                  color={bracketView === event.id && bracketType === 'main' ? 'primary' : 'info'}
                  onClick={() => {
                    if (bracketView === event.id && bracketType === 'main') {
                      setBracketView(null)
                    } else {
                      setBracketView(event.id)
                      setBracketType('main')
                    }
                  }}
                >
                  {bracketView === event.id && bracketType === 'main' ? 'Hide Main Bracket' : 'Main Bracket'}
                </Button>
                <Button
                  size="small"
                  variant="contained"
                  color={bracketView === event.id && bracketType === 'consolation' ? 'primary' : 'info'}
                  onClick={() => {
                    if (bracketView === event.id && bracketType === 'consolation') {
                      setBracketView(null)
                    } else {
                      setBracketView(event.id)
                      setBracketType('consolation')
                    }
                  }}
                >
                  {bracketView === event.id && bracketType === 'consolation' ? 'Hide Consolation' : 'Consolation'}
                </Button>
              </>
            )}

            {event.status === 'registration' && (
              <Button
                size="small"
                variant="outlined"
                color="inherit"
                onClick={() => setSelectedEvent(selectedEvent === event.id ? null : event.id)}
              >
                {selectedEvent === event.id ? 'Hide Details' : 'View Details'}
              </Button>
            )}
          </Stack>

          {event.status === 'registration' && selectedEvent === event.id && (
            <EventDetails
              event={event}
              playersById={rankingMaps[event.event_type] || new Map()}
            />
          )}

          {bracketView === event.id && (
            <Box sx={{ mt: 2 }}>
              <TournamentBracket
                event={event}
                bracketType={bracketType}
                onMatchUpdate={() => {
                  onUpdate()
                  setTimeout(() => onUpdate(), 500)
                }}
              />
            </Box>
          )}

          {event.status === 'registration' && registrationMode === event.id && (
            <RegistrationManager
              event={event}
              players={players}
              onClose={() => setRegistrationMode(false)}
              onUpdate={onUpdate}
              onPlayersChange={onPlayersChange}
            />
          )}
        </Paper>
      ))}

      <AlertModal
        open={Boolean(drawErrorModal)}
        title="Cannot Generate Draw"
        message={drawErrorModal}
        onClose={() => setDrawErrorModal(null)}
      />

      <Dialog
        open={Boolean(eventToReset)}
        onClose={loading ? undefined : () => setEventToReset(null)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Reset draw?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            This will delete all matches for the{' '}
            <strong>
              {eventToReset?.event_type
                ? eventToReset.event_type.charAt(0).toUpperCase() + eventToReset.event_type.slice(1)
                : ''}
            </strong>{' '}
            event, clear seeds, and return it to registration so you can fix the player list and generate a new draw.
          </DialogContentText>
          <DialogContentText sx={{ mt: 1.5 }}>
            Participants stay registered. Any match results for this event will be removed.
          </DialogContentText>
          {eventToReset?.status === 'in_progress' && (
            <DialogContentText sx={{ mt: 1.5, color: 'warning.main' }}>
              This event is already in progress — recorded scores and results will be lost.
            </DialogContentText>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEventToReset(null)} disabled={loading}>
            Cancel
          </Button>
          <Button
            color="warning"
            variant="contained"
            onClick={resetDraw}
            disabled={loading}
            startIcon={loading ? <CircularProgress size={16} color="inherit" /> : null}
          >
            {loading ? 'Resetting...' : 'Reset Draw'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

function EventDetails({ event, playersById = new Map() }) {
  return (
    <Box className="event-details" sx={{ mt: 2 }}>
      <Typography variant="subtitle2" gutterBottom>
        Participants:
      </Typography>
      {event.event_participants?.length > 0 ? (
        <Box className="participants-grid">
          {event.event_participants.map(participant => {
            const ranking = playersById.get(participant.player_id)
            const partnerRanking = participant.partner_id
              ? playersById.get(participant.partner_id)
              : null
            return (
              <Paper key={participant.id} variant="outlined" className="participant-card" sx={{ p: 1 }}>
                <Box className="participant-header">
                  <Avatar
                    src={getUserAvatarByEmail(participant.player?.email)}
                    alt={participant.player?.name}
                    size={40}
                  />
                  <Box className="participant-info">
                    <Typography variant="body2" fontWeight={600} className="participant-name">
                      {participant.player?.name}
                      {participant.seed_position && (
                        <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 0.5 }}>
                          (Seed {participant.seed_position})
                        </Typography>
                      )}
                    </Typography>
                  </Box>
                </Box>
                {participant.player && (
                  <Typography variant="caption" color="primary" display="block" sx={{ mt: 0.5 }}>
                    Rank pts: {(ranking?.rankPoints ?? 0).toFixed(2)}
                    {typeof participant.points_earned === 'number' && (
                      <> · Event pts: {participant.points_earned}</>
                    )}
                  </Typography>
                )}
                {participant.partner && (
                  <Box className="participant-partner" sx={{ mt: 1, pt: 1, borderTop: 1, borderColor: 'divider' }}>
                    <Box className="partner-header" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Avatar
                        src={getUserAvatarByEmail(participant.partner?.email)}
                        alt={participant.partner?.name}
                        size={32}
                      />
                      <Box>
                        <Typography variant="caption" color="text.secondary" display="block">
                          Partner: {participant.partner.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          ({(partnerRanking?.rankPoints ?? 0).toFixed(2)} pts)
                        </Typography>
                      </Box>
                    </Box>
                  </Box>
                )}
                <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                  Status: {formatResultStatus(participant.status)}
                </Typography>
              </Paper>
            )
          })}
        </Box>
      ) : (
        <Typography variant="body2" color="text.secondary" fontStyle="italic">
          No participants registered yet
        </Typography>
      )}
    </Box>
  )
}

function RegistrationManager({ event, players, onClose, onUpdate, onPlayersChange }) {
  const [selectedPlayers, setSelectedPlayers] = useState([])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [rankedPlayers, setRankedPlayers] = useState(players)
  const [showAddPlayerModal, setShowAddPlayerModal] = useState(false)

  const refreshPlayers = async () => {
    const data = await playersApi.getAllWithRankings(event.event_type)
    setRankedPlayers(data)
    return data
  }

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

  const handlePlayerCreated = async (createdPlayer) => {
    await refreshPlayers()
    if (onPlayersChange) await onPlayersChange()
    setSelectedPlayers((prev) =>
      prev.includes(createdPlayer.id) ? prev : [...prev, createdPlayer.id]
    )
    setMessage(`✅ Added ${createdPlayer.name} and selected for registration`)
  }

  const registeredPlayerIds = event.event_participants?.map(p => p.player_id) || []
  const availablePlayers = rankedPlayers.filter(p => !registeredPlayerIds.includes(p.id))

  return (
    <Paper
      variant="outlined"
      sx={{
        mt: 2,
        p: 2,
        borderColor: 'primary.main',
        borderWidth: 2,
        bgcolor: 'action.hover'
      }}
    >
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Typography variant="subtitle2">Registration Manager</Typography>
        <Button size="small" variant="outlined" color="inherit" onClick={onClose}>
          Close
        </Button>
      </Stack>

      {message && (
        <Alert
          severity={isSuccessMessage(message) ? 'success' : 'error'}
          onClose={() => setMessage('')}
          sx={{ mb: 2 }}
        >
          {stripMessagePrefix(message)}
        </Alert>
      )}

      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }} flexWrap="wrap" useFlexGap>
        <Typography variant="subtitle2">Available Players:</Typography>
        <Button size="small" variant="contained" onClick={() => setShowAddPlayerModal(true)}>
          + Add new player
        </Button>
      </Stack>

      <Paper
        variant="outlined"
        sx={{ maxHeight: 200, overflowY: 'auto', p: 1, mb: 2, bgcolor: 'background.paper' }}
      >
        {availablePlayers.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            No available players. Add a new player to get started.
          </Typography>
        ) : (
          availablePlayers.map(player => (
            <FormControlLabel
              key={player.id}
              control={
                <Checkbox
                  size="small"
                  checked={selectedPlayers.includes(player.id)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedPlayers([...selectedPlayers, player.id])
                    } else {
                      setSelectedPlayers(selectedPlayers.filter(id => id !== player.id))
                    }
                  }}
                />
              }
              label={`${player.name} (Rank pts: ${(player.rankPoints ?? 0).toFixed(2)})`}
              sx={{ display: 'flex', m: 0, mb: 0.25 }}
            />
          ))
        )}
      </Paper>

      <Button
        variant="contained"
        color="success"
        size="small"
        onClick={registerPlayers}
        disabled={loading || selectedPlayers.length === 0}
        startIcon={loading ? <CircularProgress size={14} color="inherit" /> : null}
      >
        {loading ? 'Registering...' : `Register ${selectedPlayers.length} Player(s)`}
      </Button>

      <AddPlayerModal
        open={showAddPlayerModal}
        onClose={() => setShowAddPlayerModal(false)}
        onCreated={handlePlayerCreated}
      />
    </Paper>
  )
}

function AddPlayerModal({ open, onClose, onCreated }) {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (open) {
      setFullName('')
      setEmail('')
      setError('')
    }
  }, [open])

  const handleSubmit = async (e) => {
    e.preventDefault()
    const name = fullName.trim()
    const trimmedEmail = email.trim()

    if (!name) {
      setError('Full name is required')
      return
    }

    if (trimmedEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setError('Enter a valid email address')
      return
    }

    setLoading(true)
    setError('')
    try {
      const created = await playersApi.create({
        name,
        email: trimmedEmail || null
      })
      await onCreated(created)
      setFullName('')
      setEmail('')
    } catch (err) {
      console.error('Error creating player:', err)
      const msg = String(err?.message || '')
      if (msg.toLowerCase().includes('duplicate') || msg.includes('unique') || err?.code === '23505') {
        setError('A player with that email already exists')
      } else {
        setError(err.message || 'Failed to create player')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onClose={loading ? undefined : onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pr: 1 }}>
        Add new player
        <IconButton aria-label="close" onClick={onClose} disabled={loading} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <form onSubmit={handleSubmit}>
        <DialogContent dividers>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Creates a player in the database. They will be selected for this event automatically.
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Stack spacing={2}>
            <TextField
              label="Full Name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Jane Doe"
              disabled={loading}
              required
              autoFocus
              size="small"
              fullWidth
            />
            <TextField
              label="Email (optional)"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="REMOVED_EMAIL"
              disabled={loading}
              size="small"
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={onClose} disabled={loading} color="inherit">
            Done
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={loading || !fullName.trim()}
            startIcon={loading ? <CircularProgress size={16} color="inherit" /> : null}
          >
            {loading ? 'Adding...' : 'Add player'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  )
}

function AlertModal({ open, title, message, onClose }) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pr: 1 }}>
        {title}
        <IconButton aria-label="close" onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent>
        <Box sx={{ textAlign: 'center', py: 1 }}>
          <Typography sx={{ fontSize: '3rem', lineHeight: 1, mb: 1 }}>😱</Typography>
          <Typography
            sx={{
              fontSize: '1.75rem',
              fontWeight: 700,
              textAlign: 'center',
              mb: 2
            }}
          >
            Oh My!
          </Typography>
          <DialogContentText sx={{ textAlign: 'center' }}>
            {message}
          </DialogContentText>
        </Box>
      </DialogContent>
      <DialogActions sx={{ justifyContent: 'center', pb: 2 }}>
        <Button variant="contained" onClick={onClose}>
          OK
        </Button>
      </DialogActions>
    </Dialog>
  )
}

function DeleteConfirmationModal({ open, tournament, onConfirm, onCancel, loading }) {
  if (!tournament) return null

  return (
    <Dialog open={open} onClose={loading ? undefined : onCancel} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pr: 1 }}>
        Delete Tournament
        <IconButton aria-label="close" onClick={onCancel} disabled={loading} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent>
        <Box sx={{ textAlign: 'center', py: 1 }}>
          <Typography sx={{ fontSize: '3rem', lineHeight: 1, mb: 2 }}>⚠️</Typography>
          <DialogContentText sx={{ mb: 1.5, color: 'text.primary' }}>
            Are you sure you want to delete the tournament <strong>&quot;{tournament.name}&quot;</strong>?
          </DialogContentText>
          <DialogContentText>
            This action cannot be undone. All associated events, matches, and participant data will be permanently removed.
          </DialogContentText>
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onCancel} disabled={loading} color="inherit">
          Cancel
        </Button>
        <Button
          variant="contained"
          color="error"
          onClick={onConfirm}
          disabled={loading}
          startIcon={loading ? <CircularProgress size={16} color="inherit" /> : null}
        >
          {loading ? 'Deleting...' : 'Delete Tournament'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

function EditTournamentModal({ open, tournament, onSave, onCancel, loading }) {
  const [formData, setFormData] = useState({
    date: getLocalDateString(),
    description: '',
    eventType: 'singles'
  })

  useEffect(() => {
    if (open && tournament) {
      setFormData({
        date: tournament.tournament_date || getLocalDateString(),
        description: tournament.description || '',
        eventType: tournament.events?.[0]?.event_type || 'singles'
      })
    }
  }, [open, tournament])

  const handleSubmit = (e) => {
    e.preventDefault()
    onSave(formData)
  }

  if (!tournament) return null

  return (
    <Dialog open={open} onClose={loading ? undefined : onCancel} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pr: 1 }}>
        Edit Tournament
        <IconButton aria-label="close" onClick={onCancel} disabled={loading} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <form onSubmit={handleSubmit}>
        <DialogContent dividers>
          <Stack spacing={2}>
            <Paper variant="outlined" sx={{ p: 1.5, bgcolor: 'action.hover' }}>
              <Typography variant="caption" color="text.secondary" display="block">
                Tournament Name (Auto-generated):
              </Typography>
              <Typography variant="body1" fontWeight={500}>
                {tournament.name}
              </Typography>
            </Paper>

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                label="Date"
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                required
                size="small"
                fullWidth
                slotProps={{ inputLabel: { shrink: true } }}
              />
              <FormControl size="small" fullWidth>
                <InputLabel id="edit-event-type-label">Event Type</InputLabel>
                <Select
                  labelId="edit-event-type-label"
                  label="Event Type"
                  value={formData.eventType}
                  onChange={(e) => setFormData({ ...formData, eventType: e.target.value })}
                >
                  <MenuItem value="singles">Singles</MenuItem>
                  <MenuItem value="doubles">Doubles</MenuItem>
                </Select>
              </FormControl>
            </Stack>

            <TextField
              label="Description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              multiline
              rows={3}
              size="small"
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={onCancel} disabled={loading} color="inherit">
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            color="success"
            disabled={loading}
            startIcon={loading ? <CircularProgress size={16} color="inherit" /> : null}
          >
            {loading ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  )
}

function EditEventModal({ open, event, onSave, onCancel, loading }) {
  const [formData, setFormData] = useState({
    eventType: 'singles',
    status: 'registration'
  })

  useEffect(() => {
    if (open && event) {
      setFormData({
        eventType: event.event_type || 'singles',
        status: event.status || 'registration'
      })
    }
  }, [open, event])

  const handleSubmit = (e) => {
    e.preventDefault()
    onSave(formData)
  }

  if (!event) return null

  return (
    <Dialog open={open} onClose={loading ? undefined : onCancel} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pr: 1 }}>
        Edit Event
        <IconButton aria-label="close" onClick={onCancel} disabled={loading} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <form onSubmit={handleSubmit}>
        <DialogContent dividers>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <FormControl size="small" fullWidth>
              <InputLabel id="edit-event-modal-type-label">Event Type</InputLabel>
              <Select
                labelId="edit-event-modal-type-label"
                label="Event Type"
                value={formData.eventType}
                onChange={(e) => setFormData({ ...formData, eventType: e.target.value })}
              >
                <MenuItem value="singles">Singles</MenuItem>
                <MenuItem value="doubles">Doubles</MenuItem>
              </Select>
            </FormControl>
            <FormControl size="small" fullWidth>
              <InputLabel id="edit-event-status-label">Status</InputLabel>
              <Select
                labelId="edit-event-status-label"
                label="Status"
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              >
                <MenuItem value="registration">Registration</MenuItem>
                <MenuItem value="draw_created">Draw Created</MenuItem>
                <MenuItem value="in_progress">In Progress</MenuItem>
                <MenuItem value="completed">Completed</MenuItem>
              </Select>
            </FormControl>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={onCancel} disabled={loading} color="inherit">
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            color="success"
            disabled={loading}
            startIcon={loading ? <CircularProgress size={16} color="inherit" /> : null}
          >
            {loading ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  )
}
