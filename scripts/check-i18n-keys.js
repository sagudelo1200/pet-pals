#!/usr/bin/env node
const fs = require('fs')
const path = require('path')

const ROOT = path.resolve(__dirname, '..')
const LOCALES_DIR = path.join(ROOT, 'services', 'i18n', 'locales', 'es')
// Namespace por defecto (usar el namespace en español 'comun')
const DEFAULT_NS = 'comun'

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'))
  } catch (e) {
    console.error('Error parsing JSON', file, e.message)
    return null
  }
}

// Load locales
const locales = {}
const files = fs.readdirSync(LOCALES_DIR).filter(f => f.endsWith('.json'))
files.forEach(f => {
  const ns = path.basename(f, '.json')
  const obj = readJson(path.join(LOCALES_DIR, f))
  if (obj) locales[ns] = obj
})

const availableNs = Object.keys(locales)
if (!availableNs.includes(DEFAULT_NS)) {
  // ensure default exists
  console.warn(
    `Default namespace '${DEFAULT_NS}' not found among locales: ${availableNs.join(', ')}`
  )
}

function hasKeyInNamespace(ns, keyPath) {
  const obj = locales[ns]
  if (!obj) return false
  const parts = keyPath.split('.')
  let cur = obj
  for (const p of parts) {
    if (cur && Object.prototype.hasOwnProperty.call(cur, p)) {
      cur = cur[p]
    } else {
      return false
    }
  }
  return true
}

// Recursively list source files
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

const sourceFiles = listSourceFiles(ROOT)

// match t('key') but avoid matching substrings like get('x') or import('x')
const keyRegex = /(?:^|[^A-Za-z0-9_])t\(\s*['"`"]([^'"`\)]+)['"`\"]\s*\)/g

const missing = {}
const seen = new Set()

for (const file of sourceFiles) {
  const content = fs.readFileSync(file, 'utf8')
  const lines = content.split(/\r?\n/)
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    let match
    // reset regex lastIndex
    keyRegex.lastIndex = 0
    while ((match = keyRegex.exec(line)) !== null) {
      const rawKey = match[1].trim()
      if (!rawKey) continue
      // ignore dynamic expressions with ${ or +
      if (rawKey.includes('${') || rawKey.includes('+') || rawKey.includes('('))
        continue
      // avoid duplicates
      const seenKeyFile = `${rawKey}:::${file}`
      if (seen.has(seenKeyFile)) continue
      seen.add(seenKeyFile)

      // Resolve namespace and keyPath
      let ns = null
      let keyPath = null
      if (rawKey.includes(':')) {
        const [left, ...rest] = rawKey.split(':')
        ns = left
        keyPath = rest.join(':')
      } else if (rawKey.includes('.')) {
        const parts = rawKey.split('.')
        const first = parts[0]
        if (availableNs.includes(first)) {
          ns = first
          keyPath = parts.slice(1).join('.')
        } else {
          ns = DEFAULT_NS
          keyPath = rawKey
        }
      } else {
        ns = DEFAULT_NS
        keyPath = rawKey
      }

      // Normalize: if keyPath is empty (e.g. 'auth:xyz' without dot), then treat keyPath as ''
      if (!keyPath) keyPath = ''

      // check
      const ok = hasKeyInNamespace(ns, keyPath)
      if (!ok) {
        if (!missing[rawKey]) missing[rawKey] = []
        missing[rawKey].push({ file, line: i + 1, ns, keyPath })
      }
    }
  }
}

// Report
const missingKeys = Object.keys(missing)
if (missingKeys.length === 0) {
  console.log('✅ i18n check passed — no missing keys found.')
  process.exit(0)
} else {
  console.error('❌ Missing i18n keys detected:')
  for (const k of missingKeys) {
    console.error(`- Key: '${k}' used at:`)
    for (const occ of missing[k]) {
      console.error(
        `  - ${occ.file}:${occ.line}  (expected ns='${occ.ns}' path='${occ.keyPath}')`
      )
    }
  }
  process.exit(2)
}
