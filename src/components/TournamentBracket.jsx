import { useState, useEffect, useRef } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import ButtonBase from '@mui/material/ButtonBase'
import IconButton from '@mui/material/IconButton'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import Select from '@mui/material/Select'
import MenuItem from '@mui/material/MenuItem'
import TextField from '@mui/material/TextField'
import Alert from '@mui/material/Alert'
import Stack from '@mui/material/Stack'
import Paper from '@mui/material/Paper'
import Chip from '@mui/material/Chip'
import Snackbar from '@mui/material/Snackbar'
import CircularProgress from '@mui/material/CircularProgress'
import useMediaQuery from '@mui/material/useMediaQuery'
import CloseIcon from '@mui/icons-material/Close'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import { useTheme, alpha } from '@mui/material/styles'
import { matchesApi } from '../lib/supabase.js'
import { createNextRoundMatches, syncConsolationMatches, syncNextRoundMatches } from '../lib/tournamentUtils.js'
import { reportError } from '../lib/errors.js'
import Avatar from './Avatar.jsx'

export default function TournamentBracket({ event, bracketType = 'main', onMatchUpdate }) {
  const [matches, setMatches] = useState([])
  const [loading, setLoading] = useState(false)
  const [selectedMatch, setSelectedMatch] = useState(null)
  const [showDialog, setShowDialog] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const bracketContainerRef = useRef(null)
  const theme = useTheme()
  const compactLayout = useMediaQuery(theme.breakpoints.down('md'))
  const matchHeight = compactLayout
    ? theme.bracket.matchHeight.compact
    : theme.bracket.matchHeight.regular

  useEffect(() => {
    if (event?.id) {
      loadMatches()
    }
  }, [event?.id, bracketType])

  const loadMatches = async () => {
    setLoading(true)
    try {
      const data = await matchesApi.getByEvent(event.id)
      const participants = event.event_participants || []
      const seedByPlayerId = new Map(
        participants
          .filter((p) => Number(p.seed_position) > 0)
          .map((p) => [p.player_id, Number(p.seed_position)])
      )
      const withSeeds = (matchList) =>
        matchList.map((match) => ({
          ...match,
          player1: match.player1
            ? { ...match.player1, seed_position: seedByPlayerId.get(match.player1_id) ?? null }
            : match.player1,
          player2: match.player2
            ? { ...match.player2, seed_position: seedByPlayerId.get(match.player2_id) ?? null }
            : match.player2
        }))

      if (bracketType === 'consolation') {
        try {
          await syncConsolationMatches(event.id)
        } catch (error) {
          reportError('Error syncing consolation matches', error)
        }

        const refreshed = await matchesApi.getByEvent(event.id)
        const consolationMatches = refreshed.filter(
          (match) => match.bracket_type === 'consolation'
        )
        setMatches(withSeeds(consolationMatches))
      } else {
        const mainMatches = data.filter(match => match.bracket_type === 'main' || !match.bracket_type)
        const firstRound = mainMatches
          .map((match) => match.round_name)
          .sort((a, b) => getRoundOrder(a) - getRoundOrder(b))[0]
        if (firstRound) {
          try {
            await syncNextRoundMatches(event.id, firstRound)
            const refreshed = await matchesApi.getByEvent(event.id)
            const rounds = [...new Set(
              refreshed
                .filter((match) => match.bracket_type === 'main' || !match.bracket_type)
                .map((match) => match.round_name)
            )].sort((a, b) => getRoundOrder(a) - getRoundOrder(b))
            for (const round of rounds) {
              await syncNextRoundMatches(event.id, round)
            }
            const again = await matchesApi.getByEvent(event.id)
            setMatches(withSeeds(again.filter((match) => match.bracket_type === 'main' || !match.bracket_type)))
            return
          } catch (error) {
            reportError('Error syncing next round matches', error)
          }
        }
        setMatches(withSeeds(mainMatches))
      }
    } catch (error) {
      reportError('Error loading matches', error)
      setMatches([])
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <Box sx={{ textAlign: 'center', p: 2.5 }}>
        <CircularProgress size={24} sx={{ mr: 1 }} />
        <Typography component="span" color="text.secondary">Loading bracket...</Typography>
      </Box>
    )
  }

  if (!matches.length) {
    if (bracketType === 'consolation') {
      return (
        <Typography color="text.secondary" sx={{ textAlign: 'center', p: 2.5 }}>
          No consolation bracket available yet. Complete adjacent first-round pairs (match 1 & 2, etc.) to generate consolation.
        </Typography>
      )
    }
    return (
      <Typography color="text.secondary" sx={{ textAlign: 'center', p: 2.5 }}>
        No bracket generated yet. Generate a draw to see the tournament bracket.
      </Typography>
    )
  }

  const matchesByRound = groupMatchesByRound(matches)
  const rounds = Object.keys(matchesByRound).sort((a, b) => getRoundOrder(a) - getRoundOrder(b))

  const calculateBracketHeight = () => {
    const firstRoundMatches = rounds.length > 0 ? matchesByRound[rounds[0]]?.length || 0 : 0
    const calculateGap = (matchCount) => {
      if (matchCount <= 4) return 80
      if (matchCount <= 8) return 60
      if (matchCount <= 16) return 40
      return 30
    }

    const matchGap = calculateGap(firstRoundMatches)
    const baseOffset = 20
    const headerHeight = 80

    return headerHeight + baseOffset * 2 + (firstRoundMatches * matchHeight) + ((firstRoundMatches - 1) * matchGap) + 100
  }

  return (
    <Box sx={{ position: 'relative', pt: 1, pb: 2.5 }}>
      <Typography variant="h6" component="h3" gutterBottom>
        {bracketType === 'consolation' ? 'Consolation' : 'Main'} Bracket - {event.event_type?.charAt(0).toUpperCase() + event.event_type?.slice(1)}
      </Typography>

      <Box
        ref={bracketContainerRef}
        sx={{
          display: 'flex',
          gap: { xs: 5, md: 7.5 },
          overflowX: 'auto',
          pb: 2.5,
          minHeight: calculateBracketHeight(),
          position: 'relative'
        }}
      >
        <BracketLines
          matches={matches}
          rounds={rounds}
          containerRef={bracketContainerRef}
        />
        {rounds.map((round, roundIndex) => (
          <RoundColumn
            key={round}
            round={round}
            roundIndex={roundIndex}
            matches={matchesByRound[round]}
            eventType={event.event_type}
            eventStatus={event.status}
            onMatchUpdate={onMatchUpdate}
            onMatchClick={(match) => {
              if (event.status === 'completed') {
                return
              }
              setSelectedMatch(match)
              setShowDialog(true)
            }}
            allRounds={rounds}
            allMatches={matchesByRound}
            matchHeight={matchHeight}
          />
        ))}
      </Box>

      <MatchDialog
        open={showDialog && Boolean(selectedMatch)}
        match={selectedMatch}
        eventType={event.event_type}
        onClose={() => {
          setShowDialog(false)
          setSelectedMatch(null)
        }}
        onSave={async (updatedMatch) => {
          try {
            const updateData = {
              status: updatedMatch.status
            }

            if (updatedMatch.winner_id) {
              updateData.winner_id = updatedMatch.winner_id
            }

            if (updatedMatch.score) {
              updateData.score = updatedMatch.score
            }

            if (updatedMatch.status === 'completed') {
              updateData.completed_at = new Date().toISOString()
            }

            const result = await matchesApi.update(updatedMatch.id, updateData)

            if (updatedMatch.status === 'completed') {
              try {
                await createNextRoundMatches(event.id, result.round_name)
              } catch (error) {
                reportError('Error creating next round matches', error)
              }

              const isMainBracket =
                result.bracket_type === 'main' || !result.bracket_type
              if (isMainBracket) {
                try {
                  await syncConsolationMatches(event.id)
                } catch (error) {
                  reportError('Error syncing consolation matches', error)
                }
              }
            }

            await loadMatches()
            if (onMatchUpdate) {
              onMatchUpdate(result)
            }
            setShowDialog(false)
            setSelectedMatch(null)
          } catch (error) {
            reportError('Error updating match', error)
            setErrorMessage('The match could not be updated. Please try again.')
            throw error
          }
        }}
      />

      <Paper variant="outlined" sx={{ mt: 2, p: 2 }}>
        <Typography variant="subtitle2" gutterBottom>
          Legend
        </Typography>
        <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
          <Chip size="small" label="Scheduled" sx={{ bgcolor: (t) => alpha(t.palette.info.main, 0.2) }} />
          <Chip size="small" label="In Progress" sx={{ bgcolor: (t) => alpha(t.palette.warning.main, 0.25) }} />
          <Chip size="small" label="Completed" color="success" variant="outlined" />
          <Chip size="small" label="Walkover/Cancelled" color="error" variant="outlined" />
          <Chip
            size="small"
            label="#1 Top Seeds"
            sx={(currentTheme) => ({
              bgcolor: currentTheme.palette.seed.first.main,
              color: currentTheme.palette.seed.first.contrastText,
              fontWeight: 700
            })}
          />
          <Chip size="small" label="Bracket Connections" variant="outlined" color="primary" />
        </Stack>
      </Paper>

      <Snackbar
        open={Boolean(errorMessage)}
        autoHideDuration={6000}
        onClose={() => setErrorMessage('')}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="error" onClose={() => setErrorMessage('')} variant="filled">
          {errorMessage}
        </Alert>
      </Snackbar>
    </Box>
  )
}


function RoundColumn({
  round,
  roundIndex,
  matches,
  eventType,
  eventStatus,
  onMatchUpdate,
  onMatchClick,
  allRounds,
  allMatches,
  matchHeight
}) {
  const theme = useTheme()
  const calculateMatchPositions = () => {
    const positions = []

    const firstRoundMatchCount = allRounds.length > 0 ? allMatches[allRounds[0]]?.length || 0 : matches.length
    const calculateGap = (matchCount) => {
      if (matchCount <= 4) return 80
      if (matchCount <= 8) return 60
      if (matchCount <= 16) return 40
      return 30
    }

    const matchGap = roundIndex === 0 ? calculateGap(firstRoundMatchCount) : calculateGap(firstRoundMatchCount)
    const baseOffset = 20

    matches.forEach((match, matchIndex) => {
      const posIndex =
        match.bracket_position != null ? match.bracket_position : matchIndex
      let topPosition

      if (roundIndex === 0) {
        topPosition = baseOffset + posIndex * (matchHeight + matchGap)
      } else {
        const matchesPerCurrentMatch = Math.pow(2, roundIndex)
        const firstPrevMatchIndex = posIndex * matchesPerCurrentMatch
        const lastPrevMatchIndex = firstPrevMatchIndex + matchesPerCurrentMatch - 1

        const firstMatchTop = baseOffset + firstPrevMatchIndex * (matchHeight + matchGap)
        const lastMatchTop = baseOffset + lastPrevMatchIndex * (matchHeight + matchGap)

        topPosition = firstMatchTop + ((lastMatchTop - firstMatchTop) / 2)
      }

      positions.push(topPosition)
    })

    return positions
  }

  const matchPositions = calculateMatchPositions()

  const calculateRoundHeight = () => {
    if (matchPositions.length === 0) return 600
    const maxPosition = Math.max(...matchPositions)
    return Math.max(600, maxPosition + 200)
  }

  return (
    <Box
      sx={{
        minWidth: {
          xs: theme.bracket.columnWidth.compact,
          md: theme.bracket.columnWidth.regular
        },
        position: 'relative'
      }}
    >
      <Paper
        elevation={1}
        sx={{
          mb: 2.5,
          p: 1.5,
          textAlign: 'center',
          bgcolor: 'primary.main',
          color: 'primary.contrastText'
        }}
      >
        <Typography variant="subtitle1" component="h4">
          {round}
        </Typography>
      </Paper>

      <Box sx={{ position: 'relative', minHeight: calculateRoundHeight(), py: 2.5 }}>
        {matches.map((match, matchIndex) => (
          <Box
            key={match.id}
            sx={{
              position: 'absolute',
              top: matchPositions[matchIndex],
              width: '100%'
            }}
          >
            <MatchCard
              match={match}
              matchIndex={match.bracket_position != null ? match.bracket_position : matchIndex}
              roundIndex={roundIndex}
              eventType={eventType}
              eventStatus={eventStatus}
              onUpdate={onMatchUpdate}
              onClick={() => onMatchClick(match)}
              matchHeight={matchHeight}
            />
          </Box>
        ))}
      </Box>
    </Box>
  )
}

function MatchCard({
  match,
  matchIndex,
  roundIndex,
  eventType,
  eventStatus,
  onUpdate,
  onClick,
  matchHeight
}) {
  const isByeMatch = match.score === 'Bye'
  const hasBothPlayers = Boolean(match.player1_id && match.player2_id)
  const canEdit = eventStatus !== 'completed' && !isByeMatch && hasBothPlayers

  const getPlayerDisplay = (player, partner = null, sidePlayerId) => {
    if (!player) {
      if (isByeMatch && (sidePlayerId == null || sidePlayerId === undefined)) return 'Bye'
      if (!isByeMatch && match.status === 'scheduled') return 'Pending'
      return isByeMatch ? 'Bye' : 'Pending'
    }
    return partner ? `${player.name} / ${partner.name}` : player.name
  }

  const theme = useTheme()

  const getMatchBackgroundColor = (status, winnerId, playerId) => {
    if (isByeMatch) return alpha(theme.palette.success.main, 0.16)
    if (status === 'completed' || status === 'walkover') {
      return winnerId === playerId
        ? alpha(theme.palette.success.main, 0.22)
        : alpha(theme.palette.action.disabledBackground, 0.5)
    }
    switch (status) {
      case 'in_progress': return alpha(theme.palette.warning.main, 0.22)
      case 'scheduled': return alpha(theme.palette.info.main, 0.16)
      case 'cancelled': return alpha(theme.palette.error.main, 0.16)
      default: return theme.palette.background.paper
    }
  }

  const getStatusBadgeColor = (status) => {
    if (isByeMatch) return theme.palette.success.main
    switch (status) {
      case 'scheduled': return theme.palette.info.main
      case 'in_progress': return theme.palette.warning.main
      case 'completed': return theme.palette.success.main
      case 'walkover': return theme.palette.warning.dark
      case 'cancelled': return theme.palette.text.secondary
      default: return theme.palette.text.secondary
    }
  }

  const getSeedColors = (seedPosition) => {
    if (seedPosition === 1) return theme.palette.seed.first
    if (seedPosition === 2) return theme.palette.seed.second
    if (seedPosition <= 4) return theme.palette.seed.semifinal
    return theme.palette.seed.default
  }

  const player1Seed = Number(match.player1?.seed_position) > 0 ? Number(match.player1.seed_position) : null
  const player2Seed = Number(match.player2?.seed_position) > 0 ? Number(match.player2.seed_position) : null
  const statusLabel = isByeMatch
    ? 'Bye'
    : !hasBothPlayers && match.status === 'scheduled'
      ? 'Pending'
      : match.status.replace(/_/g, ' ')
  const statusColor = getStatusBadgeColor(match.status)

  const renderPlayerRow = (player, partner, playerId, isLast) => {
    const isWinner = Boolean(match.winner_id && match.winner_id === playerId)
    const isLoser = Boolean(
      match.status === 'completed' && match.winner_id && match.winner_id !== playerId
    )

    return (
      <Box
        sx={{
          px: { xs: 1.5, md: 1.875 },
          py: { xs: 1.25, md: 1.5 },
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: isLast ? 0 : 1,
          borderColor: 'divider',
          bgcolor: getMatchBackgroundColor(match.status, match.winner_id, playerId),
          opacity: isLoser ? 0.7 : 1,
          position: 'relative'
        }}
      >
        <Stack direction="row" alignItems="center" spacing={1} sx={{ flex: 1, minWidth: 0 }}>
          {player && <Avatar alt={player.name} size={28} />}
          <Typography
            variant="body2"
            sx={{
              minWidth: 0,
              fontWeight: isWinner ? 700 : 500,
              color: isWinner
                ? 'success.main'
                : isLoser
                  ? 'text.secondary'
                  : 'text.primary',
              textDecoration: isLoser ? 'line-through' : 'none'
            }}
          >
            {getPlayerDisplay(player, partner, playerId)}
            {match.score && isWinner && (
              <Typography
                component="span"
                variant="body2"
                sx={{
                  ml: 0.5,
                  fontWeight: 600,
                  color: isByeMatch ? 'success.main' : 'text.secondary',
                  fontStyle: isByeMatch ? 'italic' : 'normal',
                  whiteSpace: 'nowrap'
                }}
              >
                ({match.score})
              </Typography>
            )}
          </Typography>
        </Stack>
        {isWinner && (
          <CheckCircleIcon
            color="success"
            fontSize="small"
            titleAccess="Winner"
            sx={{ ml: 1.25, flexShrink: 0 }}
          />
        )}
      </Box>
    )
  }

  const matchContent = (
    <Box sx={{ width: '100%', textAlign: 'left' }}>
      <Box
        sx={{
          px: 1.875,
          py: 1.25,
          bgcolor: 'action.hover',
          borderBottom: 1,
          borderColor: 'divider',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 1
        }}
      >
        <Typography variant="body2" fontWeight={700}>
          Match {match.match_number}
          {match.bracket_position !== undefined && (
            <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 1 }}>
              (Pos {match.bracket_position + 1})
            </Typography>
          )}
        </Typography>
        <Chip
          size="small"
          label={statusLabel}
          sx={{
            bgcolor: statusColor,
            color: theme.palette.getContrastText(statusColor),
            fontWeight: 600,
            textTransform: 'uppercase'
          }}
        />
      </Box>
      {renderPlayerRow(match.player1, match.player1_partner, match.player1_id, false)}
      {renderPlayerRow(match.player2, match.player2_partner, match.player2_id, true)}
    </Box>
  )

  return (
    <Paper
      variant="outlined"
      data-round={roundIndex}
      data-match={matchIndex}
      sx={(currentTheme) => ({
        position: 'relative',
        minHeight: matchHeight,
        overflow: 'visible',
        borderWidth: 2,
        opacity: eventStatus === 'completed' ? 0.8 : 1,
        zIndex: 1,
        transition: currentTheme.transitions.create(
          ['box-shadow', 'transform', 'border-color'],
          { duration: currentTheme.transitions.duration.shorter }
        ),
        ...(canEdit && {
          '&:hover': {
            boxShadow: currentTheme.shadows[4],
            transform: 'translateY(-3px)',
            borderColor: 'primary.main',
            zIndex: 2
          }
        }),
        '@media (prefers-reduced-motion: reduce)': {
          transition: 'none',
          '&:hover': {
            transform: 'none'
          }
        }
      })}
    >
      {player1Seed && (
        <Chip
          size="small"
          label={`#${player1Seed}`}
          aria-label={`Seed ${player1Seed}`}
          sx={{
            position: 'absolute',
            top: -1,
            left: 1.25,
            zIndex: 3,
            bgcolor: getSeedColors(player1Seed).main,
            color: getSeedColors(player1Seed).contrastText,
            fontWeight: 700
          }}
        />
      )}
      {player2Seed && (
        <Chip
          size="small"
          label={`#${player2Seed}`}
          aria-label={`Seed ${player2Seed}`}
          sx={{
            position: 'absolute',
            top: -1,
            left: player1Seed ? 'auto' : 1.25,
            right: player1Seed ? 1.25 : 'auto',
            zIndex: 3,
            bgcolor: getSeedColors(player2Seed).main,
            color: getSeedColors(player2Seed).contrastText,
            fontWeight: 700
          }}
        />
      )}
      {canEdit ? (
        <ButtonBase
          onClick={onClick}
          aria-label={`Edit match ${match.match_number}: ${getPlayerDisplay(match.player1, match.player1_partner, match.player1_id)} versus ${getPlayerDisplay(match.player2, match.player2_partner, match.player2_id)}`}
          sx={{
            display: 'block',
            width: '100%',
            minHeight: 'inherit',
            borderRadius: 'inherit',
            overflow: 'hidden'
          }}
        >
          {matchContent}
        </ButtonBase>
      ) : (
        matchContent
      )}

      {match.status === 'scheduled' && !isByeMatch && hasBothPlayers && roundIndex < 3 && (
        <Chip
          size="small"
          variant="outlined"
          color="primary"
          label={`Winner → Round ${roundIndex + 2}`}
          sx={{
            position: 'absolute',
            bottom: -1.5,
            right: 1.25,
            bgcolor: 'background.paper',
            opacity: 0.9,
            zIndex: 3
          }}
        />
      )}
    </Paper>
  )
}

function MatchDialog({ open, match, eventType, onClose, onSave }) {
  const [status, setStatus] = useState('scheduled')
  const [winnerId, setWinnerId] = useState('')
  const [player1Score, setPlayer1Score] = useState('')
  const [player2Score, setPlayer2Score] = useState('')
  const [player1TiebreakScore, setPlayer1TiebreakScore] = useState('')
  const [player2TiebreakScore, setPlayer2TiebreakScore] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open || !match) return
    setStatus(match.status || 'scheduled')
    setWinnerId(match.winner_id || '')
    setPlayer1Score('')
    setPlayer2Score('')
    setPlayer1TiebreakScore('')
    setPlayer2TiebreakScore('')

    if (match.score) {
      const tiebreakMatch = match.score.match(/^(\d+)-(\d+)\s*\((\d+)-(\d+)\)$/)
      if (tiebreakMatch) {
        setPlayer1Score(tiebreakMatch[1])
        setPlayer2Score(tiebreakMatch[2])
        setPlayer1TiebreakScore(tiebreakMatch[3])
        setPlayer2TiebreakScore(tiebreakMatch[4])
      } else {
        const scoreParts = match.score.split('-')
        if (scoreParts.length === 2) {
          setPlayer1Score(scoreParts[0].trim())
          setPlayer2Score(scoreParts[1].trim())
        }
      }
    }
  }, [open, match])

  if (!match) return null

  const getPlayerDisplay = (player, partner = null) => {
    if (!player) return 'TBD'
    return partner ? `${player.name} / ${partner.name}` : player.name
  }

  const handleSave = async () => {
    setLoading(true)

    try {
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

      await onSave(updatedMatch)
    } catch (error) {
      reportError('Error saving match dialog', error)
      // Parent shows Snackbar via rethrown/handled error
    } finally {
      setLoading(false)
    }
  }

  const isFormValid = () => {
    if (status === 'completed') {
      if (!winnerId || !player1Score || !player2Score) {
        return false
      }

      const isTiebreakSet = (player1Score === '7' && player2Score === '6') || (player1Score === '6' && player2Score === '7')
      if (isTiebreakSet) {
        if (!player1TiebreakScore || !player2TiebreakScore) {
          return false
        }

        const tb1 = parseInt(player1TiebreakScore)
        const tb2 = parseInt(player2TiebreakScore)

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

  const showTiebreak = (player1Score === '7' && player2Score === '6') || (player1Score === '6' && player2Score === '7')

  const winnerOptionSx = (selected) => ({
    p: 1.5,
    textAlign: 'center',
    justifyContent: 'center',
    display: 'block',
    color: selected ? 'success.contrastText' : 'text.primary'
  })

  return (
    <Dialog open={open} onClose={loading ? undefined : onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pr: 1 }}>
        Edit Match {match.match_number}
        <IconButton aria-label="close" onClick={onClose} disabled={loading} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2.5}>
          <FormControl size="small" fullWidth>
            <InputLabel id="match-status-label">Match Status</InputLabel>
            <Select
              labelId="match-status-label"
              label="Match Status"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <MenuItem value="scheduled">Scheduled</MenuItem>
              <MenuItem value="in_progress">In Progress</MenuItem>
              <MenuItem value="completed">Completed</MenuItem>
              <MenuItem value="walkover">Walkover</MenuItem>
              <MenuItem value="cancelled">Cancelled</MenuItem>
            </Select>
          </FormControl>

          {status === 'completed' && (
            <>
              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  Winner
                </Typography>
                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                    gap: 1.5
                  }}
                >
                  <Button
                    variant={winnerId === match.player1_id ? 'contained' : 'outlined'}
                    color={winnerId === match.player1_id ? 'success' : 'primary'}
                    onClick={() => setWinnerId(match.player1_id)}
                    aria-pressed={winnerId === match.player1_id}
                    sx={winnerOptionSx(winnerId === match.player1_id)}
                  >
                    <Typography fontWeight={600} sx={{ mb: 0.5 }}>
                      {getPlayerDisplay(match.player1, match.player1_partner)}
                    </Typography>
                    {Number(match.player1?.seed_position) > 0 && (
                      <Typography variant="caption" color="text.secondary">
                        Seed #{match.player1.seed_position}
                      </Typography>
                    )}
                  </Button>
                  <Button
                    variant={winnerId === match.player2_id ? 'contained' : 'outlined'}
                    color={winnerId === match.player2_id ? 'success' : 'primary'}
                    onClick={() => setWinnerId(match.player2_id)}
                    aria-pressed={winnerId === match.player2_id}
                    sx={winnerOptionSx(winnerId === match.player2_id)}
                  >
                    <Typography fontWeight={600} sx={{ mb: 0.5 }}>
                      {getPlayerDisplay(match.player2, match.player2_partner)}
                    </Typography>
                    {Number(match.player2?.seed_position) > 0 && (
                      <Typography variant="caption" color="text.secondary">
                        Seed #{match.player2.seed_position}
                      </Typography>
                    )}
                  </Button>
                </Box>
              </Box>

              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  Score (1 Set)
                </Typography>
                <Stack direction="row" alignItems="center" spacing={1}>
                  <TextField
                    type="number"
                    size="small"
                    placeholder="0"
                    value={player1Score}
                    onChange={(e) => setPlayer1Score(e.target.value)}
                    slotProps={{ htmlInput: { min: 0, max: 7 } }}
                    sx={{ width: 72, '& input': { textAlign: 'center', fontWeight: 700 } }}
                  />
                  <Typography fontWeight={700} fontSize="1.2rem">-</Typography>
                  <TextField
                    type="number"
                    size="small"
                    placeholder="0"
                    value={player2Score}
                    onChange={(e) => setPlayer2Score(e.target.value)}
                    slotProps={{ htmlInput: { min: 0, max: 7 } }}
                    sx={{ width: 72, '& input': { textAlign: 'center', fontWeight: 700 } }}
                  />
                </Stack>
                <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                  Enter games won by each player/team
                </Typography>

                {showTiebreak && (
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="subtitle2" gutterBottom>
                      Tie-breaker Score
                    </Typography>
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <TextField
                        type="number"
                        size="small"
                        placeholder="0"
                        value={player1TiebreakScore}
                        onChange={(e) => setPlayer1TiebreakScore(e.target.value)}
                        slotProps={{ htmlInput: { min: 0, max: 20 } }}
                        sx={{ width: 72, '& input': { textAlign: 'center', fontWeight: 700 } }}
                      />
                      <Typography fontWeight={700} fontSize="1.2rem">-</Typography>
                      <TextField
                        type="number"
                        size="small"
                        placeholder="0"
                        value={player2TiebreakScore}
                        onChange={(e) => setPlayer2TiebreakScore(e.target.value)}
                        slotProps={{ htmlInput: { min: 0, max: 20 } }}
                        sx={{ width: 72, '& input': { textAlign: 'center', fontWeight: 700 } }}
                      />
                    </Stack>
                    <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                      Enter tie-breaker points (winner must have at least 7 and lead by 2)
                    </Typography>
                  </Box>
                )}
              </Box>
            </>
          )}

          {(status === 'walkover' || status === 'cancelled') && (
            <Box>
              <Typography variant="subtitle2" gutterBottom>
                {status === 'walkover' ? 'Winner (Walkover)' : 'Result'}
              </Typography>
              {status === 'walkover' ? (
                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                    gap: 1.5
                  }}
                >
                  <Button
                    variant={winnerId === match.player1_id ? 'contained' : 'outlined'}
                    color={winnerId === match.player1_id ? 'success' : 'primary'}
                    onClick={() => setWinnerId(match.player1_id)}
                    aria-pressed={winnerId === match.player1_id}
                    sx={winnerOptionSx(winnerId === match.player1_id)}
                  >
                    {getPlayerDisplay(match.player1, match.player1_partner)}
                  </Button>
                  <Button
                    variant={winnerId === match.player2_id ? 'contained' : 'outlined'}
                    color={winnerId === match.player2_id ? 'success' : 'primary'}
                    onClick={() => setWinnerId(match.player2_id)}
                    aria-pressed={winnerId === match.player2_id}
                    sx={winnerOptionSx(winnerId === match.player2_id)}
                  >
                    {getPlayerDisplay(match.player2, match.player2_partner)}
                  </Button>
                </Box>
              ) : (
                <Alert severity="error">
                  Match has been cancelled
                </Alert>
              )}
            </Box>
          )}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} disabled={loading} color="inherit">
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={loading || !isFormValid()}
          startIcon={loading ? <CircularProgress size={16} color="inherit" /> : null}
        >
          {loading ? 'Saving...' : 'Save Changes'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

function BracketLines({ matches, rounds, containerRef }) {
  const [lines, setLines] = useState([])
  const theme = useTheme()

  useEffect(() => {
    const calculate = () => calculateConnectionLines()
    const timer = window.setTimeout(calculate, 100)
    window.addEventListener('resize', calculate)

    return () => {
      window.clearTimeout(timer)
      window.removeEventListener('resize', calculate)
    }
  }, [matches, rounds])

  const calculateConnectionLines = () => {
    const container = containerRef.current
    if (!container) return

    const newLines = []
    const matchesByRound = groupMatchesByRound(matches)

    for (let i = 0; i < rounds.length - 1; i++) {
      const currentRound = rounds[i]
      const nextRound = rounds[i + 1]

      const currentMatches = matchesByRound[currentRound] || []
      const nextMatches = matchesByRound[nextRound] || []

      for (let n = 0; n < nextMatches.length; n++) {
        const j =
          nextMatches[n].bracket_position != null
            ? nextMatches[n].bracket_position
            : n
        const match1Index = j * 2
        const match2Index = j * 2 + 1

        const hasFeeder1 = currentMatches.some(
          (m) => (m.bracket_position ?? 0) === match1Index
        )
        const hasFeeder2 = currentMatches.some(
          (m) => (m.bracket_position ?? 0) === match2Index
        )

        if (hasFeeder1 && hasFeeder2) {
          const match1Element = container.querySelector(`[data-round="${i}"][data-match="${match1Index}"]`)
          const match2Element = container.querySelector(`[data-round="${i}"][data-match="${match2Index}"]`)
          const nextMatchElement = container.querySelector(`[data-round="${i + 1}"][data-match="${j}"]`)

          if (match1Element && match2Element && nextMatchElement) {
            const containerRect = container.getBoundingClientRect()

            const match1Rect = match1Element.getBoundingClientRect()
            const match2Rect = match2Element.getBoundingClientRect()
            const nextMatchRect = nextMatchElement.getBoundingClientRect()

            const match1Right = match1Rect.right - containerRect.left
            const match1CenterY = match1Rect.top + match1Rect.height / 2 - containerRect.top

            const match2Right = match2Rect.right - containerRect.left
            const match2CenterY = match2Rect.top + match2Rect.height / 2 - containerRect.top

            const nextMatchLeft = nextMatchRect.left - containerRect.left
            const nextMatchCenterY = nextMatchRect.top + nextMatchRect.height / 2 - containerRect.top

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
    <Box
      aria-hidden="true"
      sx={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 1
      }}
    >
      {lines.map(line => (
        <Box
          key={line.id}
          sx={{
            position: 'absolute',
            bgcolor: 'primary.main',
            opacity: 0.55,
            left: line.left,
            top: line.top,
            width: line.type === 'horizontal'
              ? line.width
              : theme.bracket.connectorThickness,
            height: line.type === 'vertical'
              ? line.height
              : theme.bracket.connectorThickness
          }}
        />
      ))}
    </Box>
  )
}

function groupMatchesByRound(matches) {
  const grouped = {}
  matches.forEach(match => {
    const round = match.round_name
    if (!grouped[round]) {
      grouped[round] = []
    }
    grouped[round].push(match)
  })

  Object.keys(grouped).forEach((round) => {
    grouped[round].sort((a, b) => {
      const posA = a.bracket_position ?? a.match_number ?? 0
      const posB = b.bracket_position ?? b.match_number ?? 0
      if (posA !== posB) return posA - posB
      return (a.match_number ?? 0) - (b.match_number ?? 0)
    })
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

  if (roundName.startsWith('Round ') && !order[roundName]) {
    const roundNum = parseInt(roundName.split(' ')[1])
    return roundNum
  }

  return order[roundName] || 999
}
