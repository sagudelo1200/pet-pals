/**
 * Script para copiar archivos de template HTML a la carpeta compilada (lib)
 * Ejecutado después del build de TypeScript
 */
const fs = require('fs')
const path = require('path')

const srcTemplatesDir = path.join(__dirname, '../src/auth/templates')
const destTemplatesDir = path.join(__dirname, '../lib/auth/templates')

// Crear directorio destino si no existe
if (!fs.existsSync(destTemplatesDir)) {
  fs.mkdirSync(destTemplatesDir, { recursive: true })
  console.log(`✓ Carpeta creada: ${destTemplatesDir}`)
}

// Copiar archivos .html
try {
  const files = fs.readdirSync(srcTemplatesDir)
  const htmlFiles = files.filter(file => file.endsWith('.html'))

  if (htmlFiles.length === 0) {
    console.warn(`⚠ No se encontraron archivos .html en ${srcTemplatesDir}`)
    process.exit(0)
  }

  htmlFiles.forEach(file => {
    const srcPath = path.join(srcTemplatesDir, file)
    const destPath = path.join(destTemplatesDir, file)
    fs.copyFileSync(srcPath, destPath)
    console.log(`✓ Copiado: ${file}`)
  })

  console.log(`\n✓ ${htmlFiles.length} template(s) copiado(s) exitosamente.`)
} catch (error) {
  console.error('✗ Error al copiar templates:', error.message)
  process.exit(1)
}
