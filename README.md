# Wee Weekly Draw Maker

A small static web app that builds Wee Weekly singles and doubles draws in seconds.
Pick who is playing, press **Generate draw**, and copy the seeded, bye-placed
draw onto the paper draw sheet.

There is no database or login. Player rankings are read live from the
[Wee Weekly rankings Google Sheet](https://docs.google.com/spreadsheets/d/1gsTb1NsWfnTGI3e4qx6mKw4VtTfIkOeKls88dqsKsm8/edit),
which stays the single source of truth. Results are entered into the sheet by
hand after each event.

## How it works

1. Open the site and choose **Make a draw**.
2. Pick **Singles** or **Doubles**. The matching sheet tab is downloaded as CSV.
3. Type each player's name and press Enter. Names not on the sheet are added
   as unranked walk-ins.
4. Press **Generate draw** (or **Re-draw** to reshuffle the random placements).
5. Copy each numbered line onto the paper sheet, or use **Copy** / **Print**.

The public pages (About, Schedule, and the Singles/Doubles leaderboards) also
read from the sheet.

### Seeding rules
- **Singles**: the top quarter of the field (rounded up) is seeded, using only
  players with at least one event on the sheet, in sheet rank order (ties broken
  by rank points, then total points). Everyone else is placed randomly.
- **Doubles**: up to half the field is seeded from players with rank points
  above zero. Each seed gets a random partner; everyone else is randomly paired.
- Seeds use the standard ATP/ITF bracket positions, and byes go to the top
  seeds first, then the next-highest-ranked unseeded players.

### Sheet requirements
- The spreadsheet must be shared as **Anyone with the link can view**.
- Each tab needs a header row with `Rank`, `Player Name`, `Rnk Pts`, `TTL Pts`,
  `Tm` and `CD`. Rows above the header and rows without a numeric rank
  (such as the totals row) are ignored.
- Players are matched by name (case and extra spaces are ignored), so type
  names the way the sheet spells them.
- The sheet ID and tab IDs live in `src/lib/sheetRankings.js`.

## Points System (reference for scoring the sheet)

A player earns one result per event. Losing in the main draw and then playing the
consolation means the consolation result is the one that counts — the consolation
tiers below replace the main-draw round the player was knocked out in. A
consolation tier is decided by how close the round is to the consolation final, so
the first consolation round is a quarter-final in an eight-player consolation and a
semi-final in a four-player one.

### Singles Events
**Main Draw:**
- Winner: 45 points
- Runner-up: 30 points
- Semi-final: 20 points
- Quarter-final: 14 points
- Round of 16: 8 points
- Round of 32: 5 points

**Consolation Draw:**
- Winner: 12 points
- Runner-up: 8 points
- Semi-final: 5 points
- Quarter-final: 3 points
- Round of 16: 2 points
- Round of 32: 1 point

### Doubles Events
**Main Draw:**
- Winner: 30 points
- Runner-up: 20 points
- Semi-final: 14 points
- Quarter-final: 10 points
- Round of 16: 5 points
- Round of 32: 3 points

**Consolation Draw:**
- Winner: 12 points
- Runner-up: 8 points
- Semi-final: 5 points
- Quarter-final: 3 points
- Round of 16: 2 points
- Round of 32: 1 point

## Development

```bash
npm install
npm run dev      # http://localhost:5173
npm run check    # security checks, tests, production build
```

No environment variables are needed.

- `src/lib/sheetRankings.js`: downloads and parses the sheet tabs
- `src/components/DrawMaker.jsx`: the draw page
- `src/lib/tournamentUtils.js`: seeding, bye placement, and points rules

See [DEPLOYMENT.md](./DEPLOYMENT.md) for hosting.

## Troubleshooting

- **"The rankings could not be loaded"**: check that the sheet is still shared
  publicly, and that the tab IDs in `src/lib/sheetRankings.js` still match.
- **A player shows as Walk-in**: their name doesn't match the sheet spelling.
- **Doubles draw fails**: doubles needs an even number of players.
