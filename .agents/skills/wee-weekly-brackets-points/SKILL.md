---
name: wee-weekly-brackets-points
description: Preserves Wee Weekly's ATP/ITF-style tournament draw structure, bracket presentation, consolation progression, points awards, and rolling ranking formula. Use for every change involving draws, seeds, byes, partners, matches, rounds, scores, results, points, rankings, leaderboards, or tournament bracket UI.
---

# Wee Weekly Brackets and Points

Apply this Skill before planning, editing, or reviewing any bracket, draw, match, result, points, or ranking behavior.

The draw uses ATP/ITF-style placement. The points values are custom Wee Weekly rules, not ATP tour points.

## Sources of truth

- Keep draw and points logic centralized in `src/lib/tournamentUtils.js`.
- Treat `POINTS_SYSTEM` as the canonical points table.
- Rankings come from the Google Sheet via `src/lib/sheetRankings.js`; the sheet is the source of truth, so do not recalculate rank points in the app.
- Make documentation and UI labels reflect these sources; do not create independent point calculations.

## Draw invariants

- Draw size is the next power of two large enough for the field, with a minimum size of two.
- Use `getStandardSeedPositions(drawSize)` for fixed ATP/ITF-style positions: seed 1 at the top, seed 2 at the bottom, seed 4 in seed 1's half, and seed 3 in seed 2's half.
- Preserve top-to-bottom bracket slot order. Never randomly place seeded entries.
- Give byes to seeds in seed order first. Give extra byes to the next highest-ranked unseeded entries.
- A first-round bye is an empty opponent slot paired with one entry. Never create Bye-versus-Bye.
- Persist stable, zero-based `bracket_position` values. Match position `j` in the next round receives winners from positions `2j` and `2j + 1`.
- Keep round names in this order: `Round of 64`, `Round of 32`, `Round of 16`, `Quarter-Final`, `Semi-Final`, `Final`.
- Record a bye as `status: 'walkover'`, `score: 'Bye'`, and the sole entry as winner.

## Singles draw

- Seed only registered players represented on the rolling singles leaderboard.
- Order eligible seeds by rank, then rank points, total points, and name.
- Seed at most `ceil(totalPlayers / 4)`, limited by eligible players and half the draw size.
- Keep remaining ranked players in leaderboard order for extra-bye priority.
- Randomize only unranked placement.

## Doubles draw

- Reject an odd number of registrants.
- A player is seedable only when doubles rank points are greater than zero.
- Seed at most half of all registrants, ordered by the doubles leaderboard.
- Assign each seeded player one random partner from the non-seeded pool.
- Randomly pair the remaining players into unseeded teams.
- Place seeded teams using the same ATP/ITF slots and bye rules as singles.
- Preserve a team as `player1` and `player2`; display it as `Player / Partner`.

## Consolation bracket

- Pair losers of adjacent first-round main matches: matches `N` and `N + 1`.
- A main-draw bye does not itself feed consolation.
- A bye recipient enters consolation only after losing their first real main-draw match.
- Keep the adjacent first-round loser pending while that possible opponent remains alive.
- If the bye recipient wins the next main match, grant the waiting consolation player the consolation bye.
- Size the consolation bracket from the main first round: it holds `ceil(mainFirstRoundMatches / 2)` first-round matches.
- Name the first consolation round `Consolation Round 1` and every later round by its distance from the consolation final, so the bracket always ends on exactly one `Consolation Final`.
- Use `getConsolationRoundNames(firstRoundMatchCount)` as the single source of the round sequence. Never derive the next consolation round from the round name alone.

| Consolation first-round matches | Progression |
| ---: | --- |
| 1 | `Consolation Round 1` |
| 2 | `Consolation Round 1` → `Consolation Final` |
| 4 | `Consolation Round 1` → `Consolation Semi-Final` → `Consolation Final` |
| 8 | `Consolation Round 1` → `Consolation Quarter-Final` → `Consolation Semi-Final` → `Consolation Final` |
| 16 | `Consolation Round 1` → `Consolation Round of 16` → `Consolation Quarter-Final` → `Consolation Semi-Final` → `Consolation Final` |

## Canonical points breakdown

| Event | Bracket | Winner | Runner-up | Semi-final | Quarter-final | Round of 16 | Round of 32 |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Singles | Main | 45 | 30 | 20 | 14 | 8 | 5 |
| Singles | Consolation | 12 | 8 | 5 | 3 | 2 | 1 |
| Doubles | Main | 30 | 20 | 14 | 10 | 5 | 3 |
| Doubles | Consolation | 12 | 8 | 5 | 3 | 2 | 1 |

Do not add, remove, interpolate, or reinterpret a tier without explicit user approval. Every consolation award is below every corresponding main award, so entering the consolation can lower a player's event points relative to their main-draw exit. That is intended. Main-bracket status wins when a value collides with consolation, such as singles 8 points. Preserve the existing nearest-tier handling for non-exact stored values unless the scoring model is intentionally migrated.

## Awarding event points

- Award every participant exactly one status and one points value through `calculateParticipantResult` in `src/lib/tournamentUtils.js`.
- A player with a finished consolation match is scored from the consolation table only. The main-draw loss that sent them there is superseded, not added to and not compared against.
- A cancelled or unplayed consolation match leaves the main-draw result standing.
- Resolve a consolation tier from the round's distance from the consolation final, never from its label: `Consolation Round 1` is a different tier in a four-player consolation than in a sixteen-player one.
- Treat a doubles partner as a member of their team. `winner_id` holds only the winning side's first player, so never infer elimination from `winner_id` alone.
- Count a bye as advancing the recipient to the following round.

## Rolling rankings

- Use completed events of the matching event type from the latest 12 months.
- `Total Points` is the sum of event points.
- `Events` is the number of completed events counted.
- `CD = 1.5 + (Events × 0.5)`.
- `Rank Points = Total Points ÷ CD`.
- Rank by rank points descending, then total points descending, then player name.
- Keep singles and doubles rankings separate.

## Bracket presentation

- Render rounds left to right and matches top to bottom by `bracket_position`.
- Connect feeder positions `2j` and `2j + 1` to next-round position `j`.
- Show seed numbers, match numbers, scores, winners, and `Scheduled`, `In Progress`, `Completed`, `Bye`, `Pending`, `Walkover`, or `Cancelled` states clearly.
- Keep winners visually distinct without relying on color alone.
- Use the Material Design 3 frontend Skill for all bracket UI and custom geometry.

## Verification

For relevant changes, test:

- seed positions at draw sizes 2, 4, 8, 16, and 32;
- non-power-of-two fields, bye priority, and absence of Bye-versus-Bye;
- singles seed limits and doubles pairing invariants;
- adjacent consolation feeds, pending bye recipients, and progression;
- every points-table cell and the rolling ranking formula;
- stable round and match ordering in the UI.

Run focused tests and `npm run build`. Report any changed invariant or unverified case.
