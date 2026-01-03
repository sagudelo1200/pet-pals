#!/usr/bin/env node
const fs = require('fs')
const path = require('path')

/**
 * CONFIG
 */
const ROOT = path.resolve(__dirname, '..')
const LOCALES_DIR = path.join(ROOT, 'services', 'i18n', 'locales', 'es')
const DEFAULT_NS = 'comun'

/**
 * LOAD LOCALES (ONLY ES)
 */
const locales = {}
fs.readdirSync(LOCALES_DIR)
  .filter(f => f.endsWith('.json'))
  .forEach(f => {
    const ns = path.basename(f, '.json')
    locales[ns] = JSON.parse(fs.readFileSync(path.join(LOCALES_DIR, f), 'utf8'))
  })

const availableNs = Object.keys(locales)

/**
 * FLATTEN KEYS
 */
function flatten(obj, prefix = '', acc = []) {
  for (const k of Object.keys(obj)) {
    const next = prefix ? `${prefix}.${k}` : k
    if (typeof obj[k] === 'object' && obj[k] !== null) {
      flatten(obj[k], next, acc)
    } else {
      acc.push(next)
    }
  }
  return acc
}

const definedKeys = new Set()
availableNs.forEach(ns => {
  flatten(locales[ns]).forEach(k => definedKeys.add(`${ns}:${k}`))
})

/**
 * FILE SCAN
 */
function listFiles(dir) {
  const out = []
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name)
    if (
      full.includes('node_modules') ||
      full.includes('.git') ||
      full.includes(`${path.sep}scripts${path.sep}`)
    )
      continue
    if (e.isDirectory()) out.push(...listFiles(full))
    else if (/\.(ts|tsx|js|jsx)$/.test(e.name)) out.push(full)
  }
  return out
}

/**
 * REGEX
 */
const T_REGEX = /(?:^|[^A-Za-z0-9_])t\(\s*['"`]([^'"`\)]+)['"`]\s*\)/g
const USE_TRANSLATION_REGEX =
  /useTranslation\(\s*(?:\[\s*)?['"`]([^'"`\]]+)['"`]/g

/**
 * COLLECTIONS
 */
const usedStatic = new Set()
const dynamicPrefixes = new Set()
const missing = {}
const dynamic = {}

for (const file of listFiles(ROOT)) {
  const content = fs.readFileSync(file, 'utf8')
  const lines = content.split(/\r?\n/)

  // 🔍 Detect default namespace(s) for this file
  let fileNamespaces = []
  let m
  while ((m = USE_TRANSLATION_REGEX.exec(content)) !== null) {
    if (availableNs.includes(m[1])) fileNamespaces.push(m[1])
  }
  if (!fileNamespaces.length) fileNamespaces = [DEFAULT_NS]

  lines.forEach((line, index) => {
    T_REGEX.lastIndex = 0
    let match

    while ((match = T_REGEX.exec(line)) !== null) {
      const rawKey = match[1].trim()
      const loc = `${file}:${index + 1}`

      // ⚠️ DYNAMIC
      if (
        rawKey.includes('${') ||
        rawKey.includes('+') ||
        rawKey.includes('?.') ||
        rawKey.includes('(')
      ) {
        const base = rawKey.split('${')[0].replace(/[:.]$/, '')
        dynamicPrefixes.add(base)
        if (!dynamic[rawKey]) dynamic[rawKey] = []
        dynamic[rawKey].push(loc)
        continue
      }

      // RESOLVE NS
      let resolvedKeys = []

      if (rawKey.includes(':')) {
        const [ns, ...rest] = rawKey.split(':')
        resolvedKeys.push(`${ns}:${rest.join(':')}`)
      } else if (rawKey.includes('.')) {
        const [maybeNs, ...rest] = rawKey.split('.')
        if (availableNs.includes(maybeNs)) {
          resolvedKeys.push(`${maybeNs}:${rest.join('.')}`)
        } else {
          fileNamespaces.forEach(ns => resolvedKeys.push(`${ns}:${rawKey}`))
        }
      } else {
        fileNamespaces.forEach(ns => resolvedKeys.push(`${ns}:${rawKey}`))
      }

      let matched = false
      for (const k of resolvedKeys) {
        usedStatic.add(k)
        if (definedKeys.has(k)) matched = true
      }

      if (!matched) {
        resolvedKeys.forEach(k => {
          if (!missing[k]) missing[k] = []
          missing[k].push(loc)
        })
      }
    }
  })
}

/**
 * UNUSED (EXCLUDING DYNAMIC PREFIXES)
 */
const unused = [...definedKeys].filter(k => {
  if (usedStatic.has(k)) return false
  return ![...dynamicPrefixes].some(p => k.startsWith(p))
})

/**
 * REPORT
 */
if (Object.keys(missing).length) {
  console.error('\n❌ Claves faltantes:')
  for (const k in missing) {
    console.error(`- ${k}`)
    missing[k].forEach(l => console.error(`  ${l}`))
  }
}

if (Object.keys(dynamic).length) {
  console.warn('\n⚠️ Claves dinámicas:')
  for (const k in dynamic) {
    console.warn(`- ${k}`)
    dynamic[k].forEach(l => console.warn(`  ${l}`))
  }
}

if (unused.length) {
  console.warn('\n⚠️ Claves definidas pero NO usadas:')
  unused.forEach(k => console.warn(`- ${k}`))
}

process.exit(Object.keys(missing).length ? 2 : 0)
