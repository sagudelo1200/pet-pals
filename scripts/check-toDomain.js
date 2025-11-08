/* eslint-disable no-console */
const fs = require('fs')
const path = require('path')

const ROOT = path.resolve(__dirname, '..')
const IGNORES = ['node_modules', '.git', 'dist', 'build', 'docs', 'scripts']

function walk(dir, cb) {
  const list = fs.readdirSync(dir)
  for (const file of list) {
    if (IGNORES.includes(file)) continue
    const full = path.join(dir, file)
    const stat = fs.statSync(full)
    if (stat && stat.isDirectory()) {
      walk(full, cb)
    } else {
      cb(full)
    }
  }
}

const files = []
walk(ROOT, f => {
  if (/\.(ts|tsx|js|jsx)$/.test(f)) files.push(f)
})

const violations = []
const dataRegex = /\.data\s*\(\s*\)/g
const allowedPattern = /toDomain\s*\(\s*[^)]*\.data\s*\(\s*\)\s*\)/g

for (const file of files) {
  const content = fs.readFileSync(file, 'utf8')
  const matches = [...content.matchAll(dataRegex)]
  if (matches.length === 0) continue

  // If file contains allowed pattern anywhere, consider occurrences of .data() possibly covered.
  // We'll still report occurrences that are not directly wrapped by toDomain on the same line.
  const lines = content.split(/\r?\n/)
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (line.includes('.data(')) {
      const context = line.trim()
      // Quick check: is this line itself calling toDomain(...) with .data() inside?
      if (allowedPattern.test(line)) continue

      // Also allow patterns where toDomain is on previous token like: const x = toDomain( snap.data() )
      // We'll check a window of 3 lines (prev,current,next) to find allowedPattern
      const window = [lines[i - 1] || '', line, lines[i + 1] || ''].join('\n')
      if (allowedPattern.test(window)) continue

      // Allow raw reads inside services/firebase where it's intentional? No — we want to enforce toDomain.
      violations.push({ file, line: i + 1, snippet: context })
    }
  }
}

if (violations.length > 0) {
  console.error(
    '\nFound .data() usages that are not wrapped by toDomain(...) (potentially unsafe):\n'
  )
  for (const v of violations) {
    console.error(`${v.file}:${v.line} -> ${v.snippet}`)
  }
  console.error(`\nTotal: ${violations.length} violations`)
  process.exit(2)
}

console.log('✅ check-toDomain: no violations found')
process.exit(0)
