import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Chip,
  CircularProgress,
  Link,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography
} from '@mui/material'
import CasinoIcon from '@mui/icons-material/Casino'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import PrintIcon from '@mui/icons-material/Print'
import RefreshIcon from '@mui/icons-material/Refresh'
import { generateDoublesDraw, generateSinglesDraw } from '../lib/tournamentUtils.js'
import { fetchSheetRankings, getSheetUrl, playerKey } from '../lib/sheetRankings.js'
import { reportError } from '../lib/errors.js'

const MIN_PARTICIPANTS = 4

function rankLabel(entry) {
  return entry?.isRanked ? `#${entry.rank}` : 'Unranked'
}

function buildDraw(eventType, selectedNames, rankingsById) {
  const participants = selectedNames.map((name) => {
    const id = playerKey(name)
    return { id, player_id: id, player: { id, name: rankingsById.get(id)?.name || name } }
  })

  return eventType === 'singles'
    ? generateSinglesDraw(participants, rankingsById)
    : generateDoublesDraw(participants, rankingsById)
}

/** One printable line per bracket slot; a null slot is a bye. */
function describeSlot(eventType, slot, rankingsById) {
  if (!slot) return { seed: null, name: 'BYE', rank: '', isBye: true }

  if (eventType === 'singles') {
    return {
      seed: slot.seed_position,
      name: slot.name,
      rank: rankLabel(rankingsById.get(slot.player_id))
    }
  }

  const players = [slot.player1, slot.player2]
  return {
    seed: slot.seed_position,
    name: players.map((player) => player.name).join(' / '),
    rank: players.map((player) => rankLabel(rankingsById.get(player.player_id))).join(' / ')
  }
}

function drawToText(eventType, draw, lines) {
  const entrants = eventType === 'singles' ? `${draw.totalPlayers} players` : `${draw.totalTeams} teams`
  const heading = `Wee Weekly ${eventType === 'singles' ? 'Singles' : 'Doubles'} Draw: ${entrants}, ` +
    `${draw.drawSize}-line draw, ${draw.seededCount} seeds, ${draw.numberOfByes} byes`

  const body = lines.map((line, index) => {
    const seed = line.seed ? `[${line.seed}] ` : ''
    const rank = line.rank ? ` (${line.rank})` : ''
    const gap = index % 2 === 1 && index < lines.length - 1 ? '\n' : ''
    return `${index + 1}. ${seed}${line.name}${rank}${gap}`
  })

  return [heading, '', ...body].join('\n')
}

export default function DrawMaker() {
  const [eventType, setEventType] = useState('singles')
  const [rankings, setRankings] = useState({ singles: null, doubles: null })
  const [loadError, setLoadError] = useState(null)
  const [loading, setLoading] = useState(false)
  const [selectedNames, setSelectedNames] = useState([])
  const [draw, setDraw] = useState(null)
  const [drawError, setDrawError] = useState(null)
  const [copied, setCopied] = useState(false)

  const loadRankings = useCallback(async (type) => {
    setLoading(true)
    setLoadError(null)
    try {
      const entries = await fetchSheetRankings(type)
      setRankings((current) => ({ ...current, [type]: entries }))
    } catch (error) {
      reportError('Error loading sheet rankings', error)
      setLoadError('The rankings could not be loaded from the Google Sheet. Check your connection and try again.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!rankings[eventType]) loadRankings(eventType)
  }, [eventType, rankings, loadRankings])

  const entries = rankings[eventType] || []
  const rankingsById = useMemo(
    () => new Map(entries.map((entry) => [entry.id, entry])),
    [entries]
  )

  // A draw is only valid for the rankings and field it was generated from.
  useEffect(() => {
    setDraw(null)
    setDrawError(null)
  }, [eventType, selectedNames, rankings])

  const handleSelectionChange = (_event, values) => {
    const names = []
    const seen = new Set()
    for (const value of values) {
      const rawName = typeof value === 'string' ? value : value.name
      const id = playerKey(rawName)
      if (!id || seen.has(id)) continue
      seen.add(id)
      names.push(rankingsById.get(id)?.name || rawName.trim().replace(/\s+/g, ' '))
    }
    setSelectedNames(names)
  }

  const handleGenerate = () => {
    setCopied(false)
    if (selectedNames.length < MIN_PARTICIPANTS) {
      setDrawError(`Add at least ${MIN_PARTICIPANTS} players to make a draw.`)
      return
    }
    try {
      setDraw(buildDraw(eventType, selectedNames, rankingsById))
      setDrawError(null)
    } catch (error) {
      setDraw(null)
      setDrawError(error.message)
    }
  }

  const lines = draw
    ? draw.bracket.map((slot) => describeSlot(eventType, slot, rankingsById))
    : []

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(drawToText(eventType, draw, lines))
      setCopied(true)
    } catch (error) {
      reportError('Error copying draw', error)
      setDrawError('The draw could not be copied. Use Print instead.')
    }
  }

  const walkInCount = selectedNames.filter((name) => !rankingsById.has(playerKey(name))).length

  return (
    <Stack spacing={3}>
      <Paper variant="outlined" sx={{ p: { xs: 2, md: 3 }, displayPrint: 'none' }}>
        <Stack spacing={2.5}>
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={2}
            sx={{ alignItems: { xs: 'flex-start', sm: 'center' }, justifyContent: 'space-between' }}
          >
            <Typography variant="h5" component="h2">
              Make a draw
            </Typography>
            <ToggleButtonGroup
              exclusive
              color="primary"
              size="small"
              value={eventType}
              onChange={(_event, value) => value && setEventType(value)}
              aria-label="Event type"
            >
              <ToggleButton value="singles">Singles</ToggleButton>
              <ToggleButton value="doubles">Doubles</ToggleButton>
            </ToggleButtonGroup>
          </Stack>

          <Stack direction="row" spacing={1} useFlexGap sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
            {loading ? (
              <CircularProgress size={18} />
            ) : (
              <Typography variant="body2" color="text.secondary">
                {entries.length} {eventType} players loaded from the rankings sheet.
              </Typography>
            )}
            <Button
              size="small"
              startIcon={<RefreshIcon />}
              onClick={() => loadRankings(eventType)}
              disabled={loading}
            >
              Refresh
            </Button>
            <Link
              href={getSheetUrl(eventType)}
              target="_blank"
              rel="noopener noreferrer"
              variant="body2"
              sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}
            >
              Open sheet <OpenInNewIcon fontSize="inherit" />
            </Link>
          </Stack>

          {loadError && <Alert severity="error">{loadError}</Alert>}

          <Autocomplete
            multiple
            freeSolo
            autoHighlight
            filterSelectedOptions
            options={entries}
            value={selectedNames}
            onChange={handleSelectionChange}
            getOptionLabel={(option) => (typeof option === 'string' ? option : option.name)}
            isOptionEqualToValue={(option, value) => option.id === playerKey(value)}
            renderOption={(props, option) => {
              const { key, ...optionProps } = props
              return (
                <Box component="li" key={key} {...optionProps}>
                  <Box component="span" sx={{ flexGrow: 1 }}>{option.name}</Box>
                  <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 2 }}>
                    {rankLabel(option)}
                  </Typography>
                </Box>
              )
            }}
            renderValue={(values, getItemProps) =>
              values.map((name, index) => {
                const { key, ...itemProps } = getItemProps({ index })
                const entry = rankingsById.get(playerKey(name))
                return (
                  <Chip
                    key={key}
                    {...itemProps}
                    size="small"
                    color={entry?.isRanked ? 'primary' : 'default'}
                    variant={entry ? 'filled' : 'outlined'}
                    label={`${name} · ${entry ? rankLabel(entry) : 'Walk-in'}`}
                  />
                )
              })
            }
            renderInput={(params) => (
              <TextField
                {...params}
                label="Players in this event"
                placeholder="Type a name, then Enter"
                helperText="Names not on the sheet are added as unranked walk-ins."
              />
            )}
          />

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ alignItems: { sm: 'center' } }}>
            <Button
              variant="contained"
              size="large"
              startIcon={draw ? <CasinoIcon /> : undefined}
              onClick={handleGenerate}
              disabled={loading || !rankings[eventType]}
            >
              {draw ? 'Re-draw' : 'Generate draw'}
            </Button>
            <Typography variant="body2" color="text.secondary">
              {selectedNames.length} {selectedNames.length === 1 ? 'player' : 'players'}
              {walkInCount > 0 && `, ${walkInCount} walk-in${walkInCount === 1 ? '' : 's'}`}
            </Typography>
            {selectedNames.length > 0 && (
              <Button color="inherit" size="small" onClick={() => setSelectedNames([])}>
                Clear players
              </Button>
            )}
          </Stack>

          {drawError && <Alert severity="error">{drawError}</Alert>}
        </Stack>
      </Paper>

      {draw && (
        <Paper variant="outlined" sx={{ p: { xs: 2, md: 3 }, displayPrint: 'block' }}>
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={2}
            sx={{ mb: 2, alignItems: { xs: 'flex-start', sm: 'center' }, justifyContent: 'space-between' }}
          >
            <Box>
              <Typography variant="h6" component="h3">
                {eventType === 'singles' ? 'Singles' : 'Doubles'} main draw
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {eventType === 'singles' ? `${draw.totalPlayers} players` : `${draw.totalTeams} teams`}
                {' · '}{draw.drawSize}-line draw · {draw.seededCount} seeds · {draw.numberOfByes} byes
              </Typography>
            </Box>
            <Stack direction="row" spacing={1} sx={{ displayPrint: 'none' }}>
              <Button variant="outlined" size="small" startIcon={<ContentCopyIcon />} onClick={handleCopy}>
                {copied ? 'Copied' : 'Copy'}
              </Button>
              <Button variant="outlined" size="small" startIcon={<PrintIcon />} onClick={() => window.print()}>
                Print
              </Button>
            </Stack>
          </Stack>

          {draw.seededCount === 0 && (
            <Alert severity="warning" sx={{ mb: 2, displayPrint: 'none' }}>
              No seeds were assigned because nobody in this field has ranking points on the sheet.
            </Alert>
          )}

          <TableContainer>
            <Table size="small" aria-label="Main draw lines">
              <TableHead>
                <TableRow>
                  <TableCell align="right" width={56}>Line</TableCell>
                  <TableCell align="center" width={64}>Seed</TableCell>
                  <TableCell>{eventType === 'singles' ? 'Player' : 'Team'}</TableCell>
                  <TableCell align="right">Rank</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {lines.map((line, index) => (
                  <TableRow
                    key={index}
                    sx={{
                      '& td': {
                        borderBottomWidth: index % 2 === 1 ? 2 : 1,
                        borderBottomColor: index % 2 === 1 ? 'text.secondary' : 'divider'
                      }
                    }}
                  >
                    <TableCell align="right" sx={{ color: 'text.secondary' }}>{index + 1}</TableCell>
                    <TableCell align="center">
                      {line.seed && <Chip size="small" color="primary" label={line.seed} />}
                    </TableCell>
                    <TableCell
                      sx={{
                        fontWeight: line.seed ? 600 : 400,
                        color: line.isBye ? 'text.disabled' : 'text.primary',
                        fontStyle: line.isBye ? 'italic' : 'normal'
                      }}
                    >
                      {line.name}
                    </TableCell>
                    <TableCell align="right" sx={{ color: 'text.secondary' }}>{line.rank}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}
    </Stack>
  )
}
