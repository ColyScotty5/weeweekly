import {
  Box,
  Button,
  Chip,
  Container,
  Link,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography
} from '@mui/material'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import RichText from './RichText'
import { WEE_WEEKLY_SCHEDULE_2026 } from '../data/weeWeeklySchedule'

const statusDetails = {
  completed: { label: 'Completed', color: 'success' },
  upcoming: { label: 'Upcoming', color: 'primary' },
  rained_out: { label: 'Rained out', color: 'warning' },
  no_event: { label: 'No event', color: 'default' }
}

const formatDate = (value) =>
  new Intl.DateTimeFormat(undefined, {
    month: 'long',
    day: 'numeric'
  }).format(new Date(`${value}T00:00:00`))

function EventDetails({ event }) {
  if (event.status === 'completed') {
    return (
      <Stack spacing={0.5}>
        <Typography variant="body2">
          {event.participants} participants
        </Typography>
        <Typography variant="body2">
          <strong>Winner{event.type === 'Doubles' ? 's' : ''}:</strong> {event.winner}
        </Typography>
        {event.runnerUp && (
          <Typography variant="body2">
            <strong>Runner{event.type === 'Doubles' ? 's' : ''} up:</strong>{' '}
            {event.runnerUp}
          </Typography>
        )}
        {event.note && (
          <Typography variant="caption" color="text.secondary">
            <RichText value={event.note} />
          </Typography>
        )}
      </Stack>
    )
  }

  if (event.status === 'no_event') {
    return (
      <Typography variant="body2" color="text.secondary">
        Club tournament: <RichText value={event.note} />
      </Typography>
    )
  }

  if (event.status === 'rained_out') {
    return (
      <Typography variant="body2" color="text.secondary">
        Event cancelled due to rain.
      </Typography>
    )
  }

  return (
    <Typography variant="body2" color="text.secondary">
      Scheduled Wee Weekly event.
    </Typography>
  )
}

export default function SeasonSchedule() {
  return (
    <Box
      id="schedule"
      component="section"
      aria-labelledby="schedule-heading"
      sx={{ py: { xs: 6, md: 9 }, scrollMarginTop: 96 }}
    >
      <Container maxWidth="lg">
        <Stack spacing={1.5} sx={{ mb: 4, textAlign: 'center' }}>
          <Typography id="schedule-heading" variant="h4" component="h2">
            2026 season schedule
          </Typography>
          <Typography color="text.secondary">
            Upcoming dates, cancellations, draw sheets, and completed tournament results.
          </Typography>
        </Stack>

        <TableContainer
          component={Paper}
          variant="outlined"
          tabIndex={0}
          aria-label="Scrollable 2026 season schedule"
          sx={(theme) => ({
            '&:focus-visible': {
              outline: `${theme.focusRing.width}px solid`,
              outlineColor: 'primary.main',
              outlineOffset: theme.focusRing.offset
            }
          })}
        >
          <Table aria-label="2026 Wee Weekly season schedule" sx={{ minWidth: 760 }}>
            <TableHead>
              <TableRow>
                <TableCell>Date</TableCell>
                <TableCell>Event</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Details</TableCell>
                <TableCell align="right">Draw</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {WEE_WEEKLY_SCHEDULE_2026.map((event) => {
                const status = statusDetails[event.status]

                return (
                  <TableRow key={event.date} hover>
                    <TableCell sx={{ whiteSpace: 'nowrap', fontWeight: 600 }}>
                      {formatDate(event.date)}
                    </TableCell>
                    <TableCell>{event.type}</TableCell>
                    <TableCell>
                      <Chip size="small" color={status.color} label={status.label} />
                    </TableCell>
                    <TableCell sx={{ minWidth: 280 }}>
                      <EventDetails event={event} />
                    </TableCell>
                    <TableCell align="right">
                      {event.drawUrl ? (
                        <Button
                          component="a"
                          href={event.drawUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          size="small"
                          endIcon={<OpenInNewIcon fontSize="small" />}
                          aria-label={`View ${formatDate(event.date)} ${event.type} draw sheet`}
                        >
                          View
                        </Button>
                      ) : (
                        <Typography component="span" color="text.disabled" aria-label="Not available">
                          —
                        </Typography>
                      )}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </TableContainer>

        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
          Schedule sourced from the{' '}
          <Link
            href="https://www.stgeorgestennisclub.com/wee-weekly/"
            target="_blank"
            rel="noopener noreferrer"
          >
            St. George&apos;s Tennis Club Wee Weekly page
          </Link>
          .
        </Typography>
      </Container>
    </Box>
  )
}
