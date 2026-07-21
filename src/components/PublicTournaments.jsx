import { useEffect, useState } from 'react'
import {
  Alert,
  Box,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Grid,
  Stack,
  Typography
} from '@mui/material'
import { tournamentsApi } from '../lib/supabase'

const formatDate = (value) =>
  new Intl.DateTimeFormat(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }).format(new Date(`${value}T00:00:00`))

const formatLabel = (value) =>
  value
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')

export default function PublicTournaments() {
  const [tournaments, setTournaments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true

    tournamentsApi
      .getPublic()
      .then((data) => {
        if (active) setTournaments(data || [])
      })
      .catch(() => {
        if (active) setError('Tournament information could not be loaded. Please try again.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [])

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h4" component="h2" fontWeight={700}>
          Tournament results
        </Typography>
        <Typography color="text.secondary">
          Completed Wee Weekly draws and results.
        </Typography>
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress aria-label="Loading tournament results" />
        </Box>
      ) : error ? (
        <Alert severity="error">{error}</Alert>
      ) : tournaments.length === 0 ? (
        <Alert severity="info">No tournaments are currently available.</Alert>
      ) : (
        <Grid container spacing={2}>
          {tournaments.map((tournament) => (
            <Grid key={tournament.id} size={{ xs: 12, md: 6 }}>
              <Card variant="outlined" sx={{ height: '100%' }}>
                <CardContent>
                  <Stack spacing={2}>
                    <Stack direction="row" justifyContent="space-between" gap={2}>
                      <Box>
                        <Typography variant="h6" component="h3" fontWeight={700}>
                          {tournament.name}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {formatDate(tournament.tournament_date)}
                        </Typography>
                      </Box>
                      <Chip size="small" label={formatLabel(tournament.status)} />
                    </Stack>

                    {tournament.description && (
                      <Typography variant="body2">{tournament.description}</Typography>
                    )}

                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                      {(tournament.events || []).map((event) => (
                        <Chip
                          key={event.id}
                          variant="outlined"
                          label={`${formatLabel(event.event_type)} · ${
                            event.participant_count || 0
                          } players · ${formatLabel(event.status)}`}
                        />
                      ))}
                    </Stack>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
    </Stack>
  )
}
