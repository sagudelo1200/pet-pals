#!/usr/bin/env node
const fs = require('fs')
const path = require('path')

const ROOT = path.resolve(__dirname, '..')
const LOCALES_DIR = path.join(ROOT, 'services', 'i18n', 'locales', 'es')

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'))
  } catch (e) {
    console.error('Error parsing JSON', file, e.message)
    return null
  }
}

function writeJson(file, obj) {
  fs.writeFileSync(file, JSON.stringify(obj, null, 2) + '\n', 'utf8')
}

function collectLeafPaths(obj, prefix = '') {
  const res = []
  for (const k of Object.keys(obj)) {
    const val = obj[k]
    const next = prefix ? `${prefix}.${k}` : k
    if (val && typeof val === 'object' && !Array.isArray(val)) {
      const inner = collectLeafPaths(val, next)
      if (inner.length === 0) {
        // empty object - treat as leaf
        res.push(next)
      } else {
        res.push(...inner)
      }
    } else {
      res.push(next)
    }
  }
  return res
}

// Scan source for t('...') usages
function listSourceFiles(dir) {
  const res = []
  const entries = fs.readdirSync(dir, { withFileTypes: true })
  for (const e of entries) {
    const full = path.join(dir, e.name)
    if (
      full.includes('node_modules') ||
      full.includes('.git') ||
      full.includes(path.join('scripts', ''))
    )
      continue
    if (e.isDirectory()) res.push(...listSourceFiles(full))
    else if (e.isFile()) {
      if (
        full.endsWith('.ts') ||
        full.endsWith('.tsx') ||
        full.endsWith('.js') ||
        full.endsWith('.jsx')
      )
        res.push(full)
    }
  }
  return res
}

const keyRegex = /(?:^|[^A-Za-z0-9_])t\(\s*['"`"]([^'"`)]+)['"`"]\s*\)/g

const sourceFiles = listSourceFiles(ROOT)
const usedRawKeys = new Set()
for (const file of sourceFiles) {
  const content = fs.readFileSync(file, 'utf8')
  const lines = content.split(/\r?\n/)
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    let match
    keyRegex.lastIndex = 0
    while ((match = keyRegex.exec(line)) !== null) {
      const rawKey = match[1].trim()
      if (!rawKey) continue
      if (rawKey.includes('${') || rawKey.includes('+') || rawKey.includes('('))
        continue
      usedRawKeys.add(rawKey)
    }
  }
}

console.log('Found', usedRawKeys.size, 'unique i18n usages in source')

// For each locale file, compute leaf paths and remove unused leaves
// Files to exclude from automatic cleanup (keep error translations intact)
const EXCLUDE_FILES = ['errores.json']

const files = fs
  .readdirSync(LOCALES_DIR)
  .filter(f => f.endsWith('.json') && !EXCLUDE_FILES.includes(f))
let totalRemoved = 0
for (const f of files) {
  const ns = path.basename(f, '.json')
  const filePath = path.join(LOCALES_DIR, f)
  const obj = readJson(filePath)
  if (!obj) continue
  const leaves = collectLeafPaths(obj)
  // For each leaf, check if any usage matches ns:keyPath or ns.keyPath or keyPath (without ns)
  const unusedLeaves = []
  for (const leaf of leaves) {
    const candidate1 = `${ns}:${leaf}`
    const candidate2 = `${ns}.${leaf}`
    const candidate3 = leaf
    const used =
      usedRawKeys.has(candidate1) ||
      usedRawKeys.has(candidate2) ||
      usedRawKeys.has(candidate3)
    if (!used) unusedLeaves.push(leaf)
  }
  if (unusedLeaves.length === 0) continue
  console.log(
    `\nLocale '${ns}' - will remove ${unusedLeaves.length} unused keys:`
  )
  unusedLeaves.forEach(l => console.log('  -', l))
  // Remove these leaves from obj
  for (const leaf of unusedLeaves) {
    const parts = leaf.split('.')
    let cur = obj
    for (let i = 0; i < parts.length - 1; i++) {
      const p = parts[i]
      if (!cur[p] || typeof cur[p] !== 'object') {
        cur = null
        break
      }
      cur = cur[p]
    }
    if (!cur) continue
    const last = parts[parts.length - 1]
    if (Object.prototype.hasOwnProperty.call(cur, last)) {
      delete cur[last]
      totalRemoved++
    }
  }
  // Write file back
  writeJson(filePath, obj)
  console.log(`Wrote ${filePath}`)
}

console.log(`\nTotal removed keys: ${totalRemoved}`)
if (totalRemoved === 0) process.exit(0)
process.exit(0)
