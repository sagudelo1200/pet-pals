const fs = require('fs')
const path = require('path')

function collectFiles(dir, exts = ['.ts', '.tsx']) {
  const out = []
  const items = fs.readdirSync(dir)
  for (const it of items) {
    const p = path.join(dir, it)
    const stat = fs.statSync(p)
    if (stat.isDirectory()) {
      // skip node_modules to avoid heavy traversal and false positives
      if (path.basename(p) === 'node_modules') continue
      out.push(...collectFiles(p, exts))
    } else {
      if (exts.includes(path.extname(p))) out.push(p)
    }
  }
  return out
}

function readAllSources(root) {
  const files = collectFiles(root)
  const map = {}
  for (const f of files) {
    map[f] = fs.readFileSync(f, 'utf8')
  }
  return { files, map }
}

function short(p) {
  return p.replace(process.cwd() + path.sep, '').replace(/\\/g, '/')
}

const root = process.cwd()
const hooksDir = path.join(root, 'hooks')
const compsDir = path.join(root, 'components')

const { files: allFiles, map: allSources } = readAllSources(root)
const hookFiles = collectFiles(hooksDir)
const compFiles = collectFiles(compsDir)

function findRefs(targetPath) {
  const rel = short(targetPath)
  const base = path.basename(targetPath, path.extname(targetPath))
  let count = 0
  for (const [file, content] of Object.entries(allSources)) {
    if (file === targetPath) continue
    if (content.includes(base)) count++
    if (content.includes(rel)) count++
    // also check for index barrel imports
    const barrel = short(path.join(path.dirname(targetPath), 'index.ts'))
    if (content.includes(path.join(path.dirname(targetPath), base))) count++
  }
  return count
}

const candidates = []
for (const f of [...hookFiles, ...compFiles]) {
  const refs = findRefs(f)
  if (refs === 0) candidates.push(short(f))
}

console.log('Candidates (no references found):')
console.log(candidates.join('\n') || '(none)')
