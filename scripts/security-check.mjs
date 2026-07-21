import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'

const files = execFileSync(
  'git',
  ['ls-files', '--cached', '--others', '--exclude-standard'],
  { encoding: 'utf8' }
)
  .trim()
  .split('\n')
  .filter(Boolean)

const violations = []
const forbiddenPaths = [
  /^dist\//,
  /^\.env(?:\.|$)/,
  /^src\/singles_rankings\.json$/,
  /^src\/players_singles\.json$/
]

for (const file of files) {
  if (!existsSync(file)) continue

  if (forbiddenPaths.some((pattern) => pattern.test(file))) {
    violations.push(`${file}: forbidden tracked/generated or sensitive path`)
    continue
  }

  if (!/\.(?:js|jsx|mjs|json|sql)$/.test(file)) continue

  const contents = readFileSync(file, 'utf8')
  if (/\bpassword\s*:\s*['"][^'"]+['"]/i.test(contents)) {
    violations.push(`${file}: hardcoded password-like string`)
  }
  if (/["']password["']\s*:\s*["'][^"']+["']/i.test(contents)) {
    violations.push(`${file}: password-bearing fixture data`)
  }
  if (/\.select\(\s*['"`]\*['"`]\s*\)/.test(contents)) {
    violations.push(`${file}: unrestricted select('*') query`)
  }
  if (/for\s+all\s+(?:to\s+\w+\s+)?using\s*\(\s*true\s*\)/i.test(contents)) {
    violations.push(`${file}: unrestricted RLS policy`)
  }
}

if (violations.length) {
  console.error('Security checks failed:')
  for (const violation of violations) console.error(`- ${violation}`)
  process.exit(1)
}

console.log(`Security checks passed for ${files.length} repository files.`)
