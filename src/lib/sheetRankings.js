// Rankings are read straight from the Wee Weekly Google Sheet, which is the
// source of truth. The sheet must stay shared as "Anyone with the link can view".
const SHEET_ID = '1gsTb1NsWfnTGI3e4qx6mKw4VtTfIkOeKls88dqsKsm8'

const SHEET_TABS = {
  singles: '0',
  doubles: '1144204962'
}

export function getSheetUrl(eventType = 'singles') {
  return `https://docs.google.com/spreadsheets/d/${SHEET_ID}/edit?gid=${SHEET_TABS[eventType]}#gid=${SHEET_TABS[eventType]}`
}

function getCsvUrl(eventType) {
  return `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${SHEET_TABS[eventType]}`
}

/** Names are the only identifier the sheet has, so match on a normalised form. */
export function playerKey(name) {
  return String(name || '').trim().replace(/\s+/g, ' ').toLowerCase()
}

export function parseCsv(text) {
  const rows = []
  let row = []
  let field = ''
  let inQuotes = false

  for (let i = 0; i < text.length; i++) {
    const char = text[i]

    if (inQuotes) {
      if (char === '"' && text[i + 1] === '"') {
        field += '"'
        i++
      } else if (char === '"') {
        inQuotes = false
      } else {
        field += char
      }
    } else if (char === '"') {
      inQuotes = true
    } else if (char === ',') {
      row.push(field)
      field = ''
    } else if (char === '\n' || char === '\r') {
      if (char === '\r' && text[i + 1] === '\n') i++
      row.push(field)
      rows.push(row)
      row = []
      field = ''
    } else {
      field += char
    }
  }

  if (field !== '' || row.length > 0) {
    row.push(field)
    rows.push(row)
  }

  return rows
}

function toNumber(value) {
  const number = Number(String(value ?? '').trim())
  return Number.isFinite(number) ? number : 0
}

/**
 * Turns a leaderboard tab into the ranking entries the draw generators expect.
 * The header row is located by its "Player Name" cell so title rows above it
 * and the totals row below the players are ignored.
 */
export function parseLeaderboardCsv(text) {
  const rows = parseCsv(text)
  const headerIndex = rows.findIndex((row) => row.some((cell) => cell.trim() === 'Player Name'))
  if (headerIndex === -1) {
    throw new Error('The rankings sheet is missing its "Player Name" header row.')
  }

  const header = rows[headerIndex].map((cell) => cell.trim())
  const column = (label) => header.indexOf(label)
  const columns = {
    rank: column('Rank'),
    name: column('Player Name'),
    rankPoints: column('Rnk Pts'),
    totalPoints: column('TTL Pts'),
    eventsPlayed: column('Tm'),
    cd: column('CD')
  }

  const entries = []
  const seen = new Set()

  for (const row of rows.slice(headerIndex + 1)) {
    const name = String(row[columns.name] || '').trim()
    const rank = Number.parseInt(row[columns.rank], 10)
    if (!name || !Number.isFinite(rank)) continue

    const id = playerKey(name)
    if (seen.has(id)) continue
    seen.add(id)

    const eventsPlayed = toNumber(row[columns.eventsPlayed])
    entries.push({
      id,
      name,
      rank,
      rankPoints: toNumber(row[columns.rankPoints]),
      totalPoints: toNumber(row[columns.totalPoints]),
      eventsPlayed,
      cd: toNumber(row[columns.cd]),
      isRanked: eventsPlayed > 0
    })
  }

  return entries
}

export async function fetchSheetRankings(eventType = 'singles') {
  if (!SHEET_TABS[eventType]) throw new Error(`Unknown event type: ${eventType}`)

  const response = await fetch(getCsvUrl(eventType), { cache: 'no-store' })
  if (!response.ok) {
    throw new Error(`The rankings sheet returned HTTP ${response.status}.`)
  }

  return parseLeaderboardCsv(await response.text())
}
