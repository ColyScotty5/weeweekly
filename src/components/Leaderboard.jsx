import { useEffect, useState } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  CircularProgress,
  Alert,
  Box,
  Stack
} from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import { rankingsApi } from '../lib/supabase.js'
import Avatar from './Avatar.jsx'
import { getUserAvatarByEmail } from '../contexts/AuthContext.jsx'

export default function Leaderboard({ type, onClose }) {
  const [players, setPlayers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    loadPlayers()
  }, [type])

  const loadPlayers = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await rankingsApi.getRollingLeaderboard(type)
      setPlayers(data)
    } catch (err) {
      console.error('Error loading leaderboard:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const rankDisplay = (rank) => {
    if (rank === 1) return '🥇'
    if (rank === 2) return '🥈'
    if (rank === 3) return '🥉'
    return rank
  }

  return (
    <Dialog open onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ pr: 6 }}>
        🏆 {type === 'singles' ? 'Singles' : 'Doubles'} Leaderboard
        <IconButton
          aria-label="Close"
          onClick={onClose}
          sx={{ position: 'absolute', right: 8, top: 8 }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers>
        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
            <CircularProgress />
          </Box>
        )}

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            Error: {error}
          </Alert>
        )}

        {!loading && !error && players.length === 0 && (
          <Typography color="text.secondary" align="center" sx={{ py: 4 }}>
            No players have competed in {type} events in the last 12 months.
          </Typography>
        )}

        {!loading && !error && players.length > 0 && (
          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell align="center" width={72}>Rank</TableCell>
                  <TableCell>Player</TableCell>
                  <TableCell align="center">Rank Points</TableCell>
                  <TableCell align="center">Total Points</TableCell>
                  <TableCell align="center">Events</TableCell>
                  <TableCell align="center">CD</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {players.map((player) => (
                  <TableRow key={player.id} hover>
                    <TableCell align="center" sx={{ fontWeight: 700, fontSize: '1.1rem' }}>
                      {rankDisplay(player.rank)}
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={1.5} alignItems="center">
                        <Avatar
                          src={getUserAvatarByEmail(player.email)}
                          alt={player.name}
                          size={40}
                        />
                        <Typography fontWeight={500}>{player.name}</Typography>
                      </Stack>
                    </TableCell>
                    <TableCell align="center" sx={{ color: 'primary.main', fontWeight: 600 }}>
                      {player.rankPoints.toFixed(2)}
                    </TableCell>
                    <TableCell align="center">{player.totalPoints.toFixed(0)}</TableCell>
                    <TableCell align="center">{player.eventsPlayed}</TableCell>
                    <TableCell align="center" sx={{ color: 'text.secondary' }}>
                      {player.cd.toFixed(2)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2, justifyContent: 'flex-start' }}>
        <Typography variant="caption" color="text.secondary">
          <strong>How rankings work:</strong> Last 12 months of{' '}
          <strong>completed</strong> events only. CD = 1.5 + (Events × 0.5).
          Rank Points = Total Points ÷ CD.
        </Typography>
      </DialogActions>
    </Dialog>
  )
}
