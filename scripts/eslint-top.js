const fs = require('fs')
const data = JSON.parse(fs.readFileSync('eslint-report.json', 'utf8'))
const arr = data
  .map(d => ({ file: d.filePath, errors: d.errorCount }))
  .sort((a, b) => b.errors - a.errors)
  .slice(0, 10)
arr.forEach((x, i) => console.log(`${i + 1}. ${x.file} — ${x.errors} errores`))
