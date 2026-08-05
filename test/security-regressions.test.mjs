import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import test from 'node:test'
import { compareLeaderboardEntries } from '../src/lib/tournamentUtils.js'
import { WEE_WEEKLY_SCHEDULE_2026 } from '../src/data/weeWeeklySchedule.js'
import { validateNewPassword } from '../src/lib/passwordPolicy.js'
import { parseRichText, richTextToPlainText } from '../src/lib/richText.js'

function readFilesRecursively(directoryUrl, extension) {
  return readdirSync(directoryUrl, { withFileTypes: true }).flatMap((entry) => {
    const entryUrl = new URL(entry.name, directoryUrl)
    if (entry.isDirectory()) {
      return readFilesRecursively(new URL(`${entry.name}/`, directoryUrl), extension)
    }
    return entry.name.endsWith(extension)
      ? [{ path: entryUrl.pathname, source: readFileSync(entryUrl, 'utf8') }]
      : []
  })
}

test('repository static security checks pass', () => {
  const output = execFileSync(process.execPath, ['scripts/security-check.mjs'], {
    cwd: new URL('..', import.meta.url),
    encoding: 'utf8'
  })

  assert.match(output, /Security checks passed/)
})

test('browser authentication does not contain a local password database', () => {
  const authContext = readFileSync(
    new URL('../src/contexts/AuthContext.jsx', import.meta.url),
    'utf8'
  )

  assert.doesNotMatch(authContext, /INITIAL_USERS|weeweekly_users|localStorage/)
  assert.match(authContext, /signInWithPassword/)
  assert.match(authContext, /admin_profiles/)
})

test('leaderboard ordering does not require private player fields', () => {
  const entries = [
    { id: 2, name: 'Second', rank: 2, rankPoints: 10, totalPoints: 20 },
    { id: 1, name: 'First', rank: 1, rankPoints: 11, totalPoints: 22 }
  ]

  assert.deepEqual(entries.sort(compareLeaderboardEntries).map((entry) => entry.id), [1, 2])
  assert.ok(entries.every((entry) => !('email' in entry)))
})

test('2026 schedule data is ordered, unique, and complete', () => {
  const allowedStatuses = new Set(['completed', 'upcoming', 'rained_out', 'no_event'])
  const dates = WEE_WEEKLY_SCHEDULE_2026.map((event) => event.date)

  assert.ok(dates.length > 0)
  assert.equal(new Set(dates).size, dates.length)
  assert.deepEqual(dates, [...dates].sort())

  for (const event of WEE_WEEKLY_SCHEDULE_2026) {
    assert.match(event.date, /^2026-\d{2}-\d{2}$/)
    assert.ok(!Number.isNaN(Date.parse(`${event.date}T00:00:00`)))
    assert.ok(event.type)
    assert.ok(allowedStatuses.has(event.status))

    if (event.status === 'completed') {
      assert.ok(event.participants > 0)
      assert.ok(event.winner)
    }
    if (event.status === 'no_event') assert.ok(event.note)
    if (event.drawUrl) assert.match(event.drawUrl, /^https:\/\//)
  }
})

test('schedule notes keep allowlisted inline markup', () => {
  const nodes = parseRichText(
    "St. George&apos;s ITF Masters - <a href='https://www.itftennis.com/en/' title='View'>View Event</a>"
  )

  assert.deepEqual(nodes, [
    { type: 'text', value: "St. George's ITF Masters - " },
    {
      type: 'element',
      tag: 'a',
      props: { href: 'https://www.itftennis.com/en/', title: 'View' },
      children: [{ type: 'text', value: 'View Event' }]
    }
  ])

  assert.deepEqual(parseRichText('Rain <br> delay'), [
    { type: 'text', value: 'Rain ' },
    { type: 'element', tag: 'br', props: {}, children: [] },
    { type: 'text', value: ' delay' }
  ])
})

test('schedule notes strip unsafe markup, attributes, and URL schemes', () => {
  assert.deepEqual(parseRichText('<script>alert(1)</script>Final'), [
    { type: 'text', value: 'Final' }
  ])

  assert.deepEqual(
    parseRichText('<img src=x onerror="alert(1)">Draw <div onclick="steal()">posted</div>'),
    [{ type: 'text', value: 'Draw posted' }]
  )

  for (const unsafe of [
    '<a href="javascript:alert(1)">Tap</a>',
    '<a href="JaVaScRiPt:alert(1)">Tap</a>',
    '<a href="java\tscript:alert(1)">Tap</a>',
    '<a href="data:text/html,<script>alert(1)</script>">Tap</a>',
    '<a href="&#106;avascript:alert(1)">Tap</a>'
  ]) {
    const [node] = parseRichText(unsafe)
    assert.equal(node.tag, 'a')
    assert.equal('href' in node.props, false, `${unsafe} must not keep an unsafe href`)
    assert.equal('onclick' in node.props, false)
  }

  const [external] = parseRichText('<a href="https://example.com" target="_top">Tap</a>')
  assert.equal('target' in external.props, false)

  assert.equal(richTextToPlainText('<b>Rain</b> delay <script>alert(1)</script>'), 'Rain delay')
})

test('rich text renders through Material components without raw HTML injection', () => {
  const richText = readFileSync(new URL('../src/components/RichText.jsx', import.meta.url), 'utf8')
  const schedule = readFileSync(
    new URL('../src/components/SeasonSchedule.jsx', import.meta.url),
    'utf8'
  )
  const sourceFiles = readFilesRecursively(new URL('../src/', import.meta.url), '.jsx')

  assert.match(richText, /parseRichText/)
  assert.match(richText, /rel=\{target === '_blank' \? 'noopener noreferrer' : undefined\}/)
  assert.match(schedule, /<RichText value=\{event\.note\} \/>/)

  for (const { path, source } of sourceFiles) {
    assert.doesNotMatch(source, /dangerouslySetInnerHTML/, `${path} must not inject raw HTML`)
  }
})

test('anonymous users can access the public leaderboard RPC', () => {
  const migration = readFileSync(
    new URL('../supabase/migrations/20260721130000_secure_auth_and_rls.sql', import.meta.url),
    'utf8'
  )
  const supabaseClient = readFileSync(
    new URL('../src/lib/supabase.js', import.meta.url),
    'utf8'
  )

  assert.match(
    migration,
    /grant execute on function public\.get_public_leaderboard\(text, integer\) to anon, authenticated;/
  )
  assert.match(supabaseClient, /supabase\.rpc\('get_public_leaderboard'/)
})

test('administrator login opens in a dialog and closes after success', () => {
  const app = readFileSync(new URL('../src/app.jsx', import.meta.url), 'utf8')
  const loginForm = readFileSync(
    new URL('../src/components/Login.jsx', import.meta.url),
    'utf8'
  )

  assert.match(app, /const \[showLogin, setShowLogin\] = useState\(false\)/)
  assert.match(app, /open=\{showLogin\}/)
  assert.match(app, /onSuccess=\{\(\) => setShowLogin\(false\)\}/)
  assert.match(loginForm, /await login\(formData\.email, formData\.password\)/)
  assert.match(loginForm, /onSuccess\?\.\(\)/)
})

test('password recovery requires a new strong matching password', () => {
  assert.equal(validateNewPassword('', ''), 'Enter a new password')
  assert.match(validateNewPassword('too-short', 'too-short'), /at least 12 characters/)
  assert.equal(
    validateNewPassword('a-secure-new-password', 'different-password'),
    'Passwords do not match'
  )
  assert.equal(
    validateNewPassword('a-secure-new-password', 'a-secure-new-password'),
    ''
  )
})

test('Supabase recovery sessions must replace the password before admin access', () => {
  const authContext = readFileSync(
    new URL('../src/contexts/AuthContext.jsx', import.meta.url),
    'utf8'
  )
  const recoveryDialog = readFileSync(
    new URL('../src/components/PasswordRecovery.jsx', import.meta.url),
    'utf8'
  )
  const loginForm = readFileSync(
    new URL('../src/components/Login.jsx', import.meta.url),
    'utf8'
  )

  assert.match(authContext, /event === 'PASSWORD_RECOVERY'/)
  assert.match(authContext, /passwordRecoveryRequired/)
  assert.match(authContext, /supabase\.auth\.resetPasswordForEmail\(email\.trim\(\)/)
  assert.match(authContext, /window\.location\.origin/)
  assert.match(authContext, /supabase\.auth\.updateUser\(\{\s*password: newPassword/s)
  assert.match(authContext, /supabase\.auth\.signOut\(\{ scope: 'global' \}\)/)
  assert.match(authContext, /!passwordRecoveryRequired && user/)
  assert.match(recoveryDialog, /await completePasswordRecovery\(password\)/)
  assert.match(recoveryDialog, /autoComplete="new-password"/)
  assert.match(loginForm, /await requestPasswordRecovery\(formData\.email\)/)
  assert.match(loginForm, /If that email belongs to an account/)
})

test('frontend styling remains Material UI only', () => {
  const sourceRoot = new URL('../src/', import.meta.url)
  const jsxFiles = readFilesRecursively(sourceRoot, '.jsx')
  const javascriptFiles = readFilesRecursively(sourceRoot, '.js')
  const sourceFiles = [...jsxFiles, ...javascriptFiles]

  assert.equal(existsSync(new URL('../src/app.css', import.meta.url)), false)
  assert.equal(existsSync(new URL('../src/index.css', import.meta.url)), false)

  for (const { path, source } of sourceFiles) {
    assert.doesNotMatch(source, /\bclassName\s*=/, `${path} must not use visual CSS classes`)
    assert.doesNotMatch(source, /\bstyle\s*=/, `${path} must use MUI props or sx`)
    assert.doesNotMatch(source, /\.Mui[A-Za-z-]*/, `${path} must not target generated MUI classes`)
    assert.doesNotMatch(
      source,
      /import\s+['"]\.{1,2}\/[^'"]+\.css['"]/,
      `${path} must not import a local stylesheet`
    )
  }
})
