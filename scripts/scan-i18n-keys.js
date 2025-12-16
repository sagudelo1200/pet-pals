const fs = require('fs')
const path = require('path')

/* -------------------- Configuración -------------------- */

const SRC_DIR = path.resolve(__dirname, '../.')
const IGNORE_DIRS = [
  'node_modules',
  'dist',
  'build',
  'android',
  'ios',
  '.git',
  '__tests__',
]
const LOCALES_DIR = path.resolve(__dirname, '../services/i18n/locales/es')

const I18N_REGEX =
  /\bt\s*\(\s*['"`]([a-zA-Z][\w-]*(?::[a-zA-Z][\w-]+)?(?:\.[a-zA-Z][\w-]+)+)['"`]\s*\)/g

console.log('📂 Directorio de código fuente:', SRC_DIR)
console.log('🌐 Directorio de traducciones:', LOCALES_DIR)

/* -------------------- Logger en una sola línea -------------------- */

function liveLog(mensaje) {
  process.stdout.clearLine(0)
  process.stdout.cursorTo(0)
  process.stdout.write(mensaje)
}

/* -------------------- Utilidades -------------------- */

function readAllFiles(dir, extensiones) {
  let resultados = []

  for (const archivo of fs.readdirSync(dir)) {
    if (IGNORE_DIRS.includes(archivo)) continue

    const rutaCompleta = path.join(dir, archivo)
    const stat = fs.statSync(rutaCompleta)

    if (stat.isDirectory()) {
      resultados = resultados.concat(readAllFiles(rutaCompleta, extensiones))
    } else if (extensiones.some(ext => archivo.endsWith(ext))) {
      resultados.push(rutaCompleta)
    }
  }

  return resultados
}

function loadJson(ruta) {
  return JSON.parse(fs.readFileSync(ruta, 'utf8'))
}

function getValueByPath(obj, pathStr) {
  return pathStr.split('.').reduce((acc, key) => acc && acc[key], obj)
}

function countKeys(obj, prefix = '') {
  let keys = []

  for (const key in obj) {
    const value = obj[key]
    const fullKey = prefix ? `${prefix}.${key}` : key

    if (typeof value === 'object' && value !== null) {
      keys = keys.concat(countKeys(value, fullKey))
    } else {
      keys.push(fullKey)
    }
  }

  return keys
}

/* -------------------- Proceso principal -------------------- */

function checkI18nKeys() {
  console.log('\n🔎 Verificando claves i18n...\n')

  /* ---------- Cargar traducciones ---------- */

  const archivosLocales = readAllFiles(LOCALES_DIR, ['.json'])
  const locales = {}
  const allAvailableKeys = new Set()

  for (const archivo of archivosLocales) {
    const namespace = path.basename(archivo, '.json')
    liveLog(`📚 Cargando namespace: ${namespace}`)
    const json = loadJson(archivo)
    locales[namespace] = json

    countKeys(json).forEach(k => {
      allAvailableKeys.add(`${namespace}:${k}`)
    })
  }

  liveLog(`📚 ${archivosLocales.length} namespaces cargados`)
  console.log('\n')

  /* ---------- Escanear código ---------- */

  const archivosFuente = readAllFiles(SRC_DIR, ['.ts', '.tsx'])
  console.log(`📄 Archivos de código encontrados: ${archivosFuente.length}\n`)

  const errores = []
  const clavesUsadas = new Set()
  const archivosConI18n = new Set()

  for (const archivo of archivosFuente) {
    liveLog(`🔍 Analizando: ${path.relative(SRC_DIR, archivo)}`)

    const contenido = fs.readFileSync(archivo, 'utf8')
    let match
    let archivoTieneI18n = false

    while ((match = I18N_REGEX.exec(contenido)) !== null) {
      archivoTieneI18n = true
      const rawKey = match[1]
      clavesUsadas.add(rawKey)

      let namespace = 'default'
      let keyPath = rawKey

      if (rawKey.includes(':')) {
        ;[namespace, keyPath] = rawKey.split(':')
      }

      const locale = locales[namespace]

      if (!locale) {
        errores.push({
          tipo: 'NAMESPACE_NO_EXISTE',
          archivo,
          clave: rawKey,
          namespace,
        })
        continue
      }

      if (getValueByPath(locale, keyPath) === undefined) {
        errores.push({
          tipo: 'CLAVE_NO_EXISTE',
          archivo,
          clave: rawKey,
        })
      }
    }

    if (archivoTieneI18n) {
      archivosConI18n.add(archivo)
    }
  }

  process.stdout.clearLine(0)
  process.stdout.cursorTo(0)

  /* ---------- Estadísticas ---------- */

  const totalUsadas = clavesUsadas.size
  const totalDisponibles = allAvailableKeys.size
  const cobertura =
    totalDisponibles === 0
      ? 0
      : ((totalUsadas / totalDisponibles) * 100).toFixed(2)

  console.log('📊 Estadísticas i18n')
  console.log(`   Namespaces cargados:        ${archivosLocales.length}`)
  console.log(`   Archivos analizados:        ${archivosFuente.length}`)
  console.log(`   Archivos con i18n:          ${archivosConI18n.size}`)
  console.log(`   Claves usadas (únicas):     ${totalUsadas}`)
  console.log(`   Claves disponibles:         ${totalDisponibles}`)
  console.log(`   Cobertura aproximada:       ${cobertura}%`)
  console.log(`   Errores encontrados:        ${errores.length}\n`)

  /* ---------- Reporte ---------- */

  if (errores.length === 0) {
    console.log('✅ i18n OK — no se encontraron problemas')
    process.exit(0)
  }

  console.log('❌ Problemas de i18n detectados:\n')

  for (const err of errores) {
    if (err.tipo === 'NAMESPACE_NO_EXISTE') {
      console.log('🟥 Namespace inexistente')
      console.log(`   Archivo: ${err.archivo}`)
      console.log(`   Clave:   ${err.clave}`)
      console.log(`   Namespace: ${err.namespace}\n`)
    }

    if (err.tipo === 'CLAVE_NO_EXISTE') {
      console.log('🟨 Clave inexistente')
      console.log(`   Archivo: ${err.archivo}`)
      console.log(`   Clave:   ${err.clave}\n`)
    }
  }

  process.exit(1)
}

/* -------------------- Ejecutar -------------------- */

checkI18nKeys()
