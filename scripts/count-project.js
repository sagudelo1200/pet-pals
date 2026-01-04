const fs = require('fs').promises
const path = require('path')

const IGNORED = new Set([
  '__mocks__',
  '.expo',
  '.git',
  '.github',
  '.vscode',
  'android',
  'assets',
  'node_modules',
])

let totalFiles = 0
let dirCount = 0
let lineCount = 0

async function countFilesAndDirs(dir) {
  let entries
  try {
    entries = await fs.readdir(dir, { withFileTypes: true })
  } catch (err) {
    return
  }

  for (const e of entries) {
    const name = e.name
    const full = path.join(dir, name)
    if (IGNORED.has(name)) continue

    if (e.isDirectory()) {
      dirCount++
      await countFilesAndDirs(full)
    } else if (e.isFile()) {
      totalFiles++
    }
  }
}

async function scanAndCount(dir, progress) {
  let entries
  try {
    entries = await fs.readdir(dir, { withFileTypes: true })
  } catch (err) {
    return
  }

  for (const e of entries) {
    const name = e.name
    const full = path.join(dir, name)
    if (IGNORED.has(name)) continue

    if (e.isDirectory()) {
      await scanAndCount(full, progress)
    } else if (e.isFile()) {
      progress.scanned++
      try {
        const data = await fs.readFile(full, 'utf8')
        const lines = data.split(/\r\n|\r|\n/).length
        lineCount += lines
      } catch (err) {
        // skip unreadable/binary files for line counting
      }
      // update single-line progress
      const text = `${progress.scanned}/${totalFiles} archivos escaneados.`
      process.stdout.write('\r' + text)
    }
  }
}

;(async function main() {
  const root = process.cwd()
  await countFilesAndDirs(root)

  // si no hay archivos, imprimimos resultado vacío
  if (totalFiles === 0) {
    console.log('No se encontraron archivos para escanear.')
    console.log('Resultados del conteo:')
    console.log('- Archivos: 0')
    console.log('- Carpetas: ' + dirCount)
    console.log('- Líneas totales: 0')
    return
  }

  const progress = { scanned: 0 }
  await scanAndCount(root, progress)

  // terminar la línea de progreso y mostrar resultados finales
  process.stdout.write('\n\n\n')
  console.log('Resultados del conteo:')
  console.log('- Archivos: ' + totalFiles)
  console.log('- Carpetas: ' + dirCount)
  console.log('- Líneas totales: ' + lineCount)
})()
