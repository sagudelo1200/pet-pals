#!/usr/bin/env node
'use strict'

/**
 * cleanup-cloud-functions.js
 *
 * Script para limpiar Cloud Functions desplegadas en Firebase.
 * Permite listar, revisar logs y eliminar funciones específicas o todas.
 *
 * Uso:
 *   node scripts/cleanup-cloud-functions.js
 *   npm run cleanup:functions
 *
 * Requisitos:
 *   - Firebase CLI instalado (npm install -g firebase-tools)
 *   - Autenticado en Firebase (firebase login)
 *   - Proyecto configurado en .firebaserc
 *
 * Funciones disponibles:
 *   - Listar todas las funciones desplegadas
 *   - Ver logs de una función
 *   - Eliminar una función específica
 *   - Eliminar todas las funciones (con confirmación)
 */

const { execSync, spawn } = require('child_process')
const readline = require('readline')
const path = require('path')

// ── Configuración ────────────────────────────────────────────────────────────
const FUNCTIONS_DIR = path.resolve(__dirname, '../functions')
const REGION = 'us-central1' // Cambiar si usas otra región
const TIMEOUT = 30000 // 30 segundos para comandos

// ── Utilidades ──────────────────────────────────────────────────────────────
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
})

const ask = question =>
  new Promise(resolve => {
    rl.question(question, resolve)
  })

const log = (msg, type = 'info') => {
  const colors = {
    info: '\x1b[36m', // cyan
    success: '\x1b[32m', // green
    error: '\x1b[31m', // red
    warning: '\x1b[33m', // yellow
    reset: '\x1b[0m',
  }
  console.log(`${colors[type] || colors.info}${msg}${colors.reset}`)
}

const runCommand = (cmd, description) => {
  try {
    log(`\n▶ ${description}`, 'info')
    const output = execSync(cmd, {
      cwd: process.cwd(), // Ejecutar desde el directorio actual, no desde functions/
      timeout: TIMEOUT,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'], // Capturar stderr
    })
    return output.trim()
  } catch (error) {
    log(`✗ Error: ${error.message}`, 'error')
    return null
  }
}

// ── Firebase CLI Commands ────────────────────────────────────────────────────

/**
 * Lista todas las funciones desplegadas
 */
const listFunctions = async () => {
  try {
    log('\n📋 Listando Cloud Functions desplegadas...', 'info')
    const output = runCommand(
      'firebase functions:list --json --project pet-pals-369',
      'Obteniendo lista de funciones'
    )

    if (!output) {
      log('No se pudo obtener la lista de funciones', 'error')
      return []
    }

    try {
      const data = JSON.parse(output)
      const functions = data.result || []

      if (functions.length === 0) {
        log('No hay funciones desplegadas', 'warning')
        return []
      }

      // Mostrar tabla con las funciones
      console.log('\n📊 Funciones encontradas:\n')
      functions.forEach((fn, i) => {
        const name = fn.id || 'UNKNOWN'
        const region = fn.region || 'UNKNOWN'
        const status = fn.status || 'ACTIVE'
        const trigger = fn.httpsTrigger
          ? 'HTTPS'
          : fn.eventTrigger
            ? 'Trigger'
            : 'UNKNOWN'
        console.log(
          `  ${i + 1}. ${name} (${status}) - ${trigger} - Región: ${region}`
        )
      })
      console.log()

      return functions
    } catch (parseError) {
      log(`Error al parsear JSON: ${parseError.message}`, 'error')
      console.log('Output recibido:', output)
      return []
    }
  } catch (error) {
    log(`Error al listar funciones: ${error.message}`, 'error')
    return []
  }
}

/**
 * Obtiene logs de una función específica
 */
const getFunctionLogs = async functionName => {
  try {
    log(`\n📊 Obteniendo logs de ${functionName}...`, 'info')
    const cmd = `firebase functions:log --follow=false --project pet-pals-369 -- ${functionName}`
    const output = runCommand(cmd, `Leyendo logs de ${functionName}`)

    if (output) {
      console.log(output)
      return true
    }
  } catch (error) {
    log(`Error al obtener logs: ${error.message}`, 'error')
  }
  return false
}

/**
 * Elimina una función específica usando gcloud
 */
const deleteFunction = async (functionName, region = REGION) => {
  try {
    const project = runCommand(
      'firebase projects:list --json',
      'Obteniendo proyecto actual'
    )

    if (!project) {
      log('No se pudo determinar el proyecto actual', 'error')
      return false
    }

    const confirmation = await ask(
      `\n⚠️  ¿Eliminar función ${functionName}? (s/n): `
    )

    if (confirmation.toLowerCase() !== 's') {
      log('Eliminación cancelada', 'warning')
      return false
    }

    log(
      `\n🗑️  Eliminando función ${functionName} en región ${region}...`,
      'info'
    )

    const cmd = `gcloud functions delete ${functionName} --region=${region} --project pet-pals-369 --quiet`
    const result = runCommand(cmd, `Eliminando ${functionName}`)

    if (result !== null) {
      log(`✅ Función ${functionName} eliminada exitosamente`, 'success')
      return true
    }
    return false
  } catch (error) {
    log(`Error al eliminar función: ${error.message}`, 'error')
  }
  return false
}

/**
 * Elimina todas las funciones (con confirmación múltiple)
 */
const deleteAllFunctions = async () => {
  try {
    const functions = await listFunctions()

    if (functions.length === 0) {
      log('No hay funciones para eliminar', 'warning')
      return false
    }

    log('\n⚠️  ADVERTENCIA: Esto eliminará TODAS las funciones', 'warning')
    log(`   Total de funciones a eliminar: ${functions.length}`, 'warning')

    // Confirmación 1
    const confirm1 = await ask('\n¿Estás seguro? (s/n): ')
    if (confirm1.toLowerCase() !== 's') {
      log('Operación cancelada', 'warning')
      return false
    }

    // Confirmación 2 (doble check)
    const confirm2 = await ask('¿Confirmar eliminación DEFINITIVA? (s/n): ')
    if (confirm2.toLowerCase() !== 's') {
      log('Operación cancelada', 'warning')
      return false
    }

    log('\n🗑️  Eliminando todas las funciones...', 'info')

    // Extraer nombres y regiones de funciones del objeto
    const functionsToDelete = functions
      .map(fn => {
        if (typeof fn === 'object' && fn.id && fn.region) {
          return { id: fn.id, region: fn.region }
        }
        return null
      })
      .filter(Boolean)

    if (functionsToDelete.length === 0) {
      log('No se pudieron extraer nombres de funciones', 'error')
      return false
    }

    let deletedCount = 0
    for (const fn of functionsToDelete) {
      try {
        const cmd = `gcloud functions delete ${fn.id} --region=${fn.region} --project pet-pals-369 --quiet`
        const result = runCommand(cmd, `Eliminando ${fn.id} (${fn.region})`)
        if (result !== null) {
          deletedCount++
          log(`✅ ${fn.id}`, 'success')
        } else {
          log(`⚠️  No se pudo eliminar ${fn.id}`, 'warning')
        }
      } catch (error) {
        log(`⚠️  Error eliminando ${fn.id}: ${error.message}`, 'warning')
      }
    }

    log(
      `\n✅ Operación completada: ${deletedCount}/${functionsToDelete.length} funciones eliminadas`,
      'success'
    )
    return true
  } catch (error) {
    log(`Error en operación batch: ${error.message}`, 'error')
  }
  return false
}

/**
 * Verifica que firebase CLI esté instalado y autenticado
 */
const verifySetup = async () => {
  try {
    log('\n🔍 Verificando configuración...', 'info')

    // Verificar Firebase CLI
    try {
      execSync('firebase --version', { stdio: 'pipe' })
    } catch {
      log(
        '\n❌ Firebase CLI no instalado.\n' +
          '   Instala con: npm install -g firebase-tools\n',
        'error'
      )
      process.exit(1)
    }

    // Verificar que estamos autenticados
    try {
      const project = runCommand(
        'firebase projects:list --json --project pet-pals-369',
        'Verificando autenticación'
      )
      if (!project) throw new Error()
    } catch {
      log(
        '\n❌ No autenticado en Firebase.\n' + '   Ejecuta: firebase login\n',
        'error'
      )
      process.exit(1)
    }

    log('✅ Configuración verificada', 'success')
  } catch (error) {
    log(`Error en verificación: ${error.message}`, 'error')
    process.exit(1)
  }
}

// ── Menú interactivo ────────────────────────────────────────────────────────

const showMenu = async () => {
  console.log(
    '\n╔════════════════════════════════════════════════════════════════╗'
  )
  console.log(
    '║          Cloud Functions Cleanup Tool                          ║'
  )
  console.log(
    '╚════════════════════════════════════════════════════════════════╝'
  )
  console.log('\n📌 Opciones disponibles:\n')
  console.log('  1) Listar todas las funciones')
  console.log('  2) Ver logs de una función')
  console.log('  3) Eliminar una función específica')
  console.log('  4) Eliminar TODAS las funciones')
  console.log('  5) Salir\n')

  const choice = await ask('Selecciona una opción (1-5): ')
  return choice.trim()
}

const mainLoop = async () => {
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const choice = await showMenu()

    switch (choice) {
      case '1':
        await listFunctions()
        break

      case '2': {
        const functionName = await ask('\nNombre de la función: ')
        if (functionName.trim()) {
          await getFunctionLogs(functionName.trim())
        } else {
          log('Nombre inválido', 'error')
        }
        break
      }

      case '3': {
        const functionName = await ask('\nNombre de la función a eliminar: ')
        if (functionName.trim()) {
          const region = await ask('Región (ej: us-central1): ')
          if (region.trim()) {
            await deleteFunction(functionName.trim(), region.trim())
          } else {
            log('Región inválida', 'error')
          }
        } else {
          log('Nombre inválido', 'error')
        }
        break
      }

      case '4':
        await deleteAllFunctions()
        break

      case '5':
        log('\n👋 Hasta luego', 'info')
        rl.close()
        process.exit(0)
        break

      default:
        log('Opción inválida. Intenta de nuevo.', 'error')
    }

    // Pausa para leer la salida
    await new Promise(resolve => setTimeout(resolve, 1000))
  }
}

// ── Main ─────────────────────────────────────────────────────────────────────

const main = async () => {
  try {
    log(
      '\n╔════════════════════════════════════════════════════════════════╗',
      'info'
    )
    log(
      '║              🧹 Cloud Functions Cleanup Script                ║',
      'info'
    )
    log(
      '╚════════════════════════════════════════════════════════════════╝',
      'info'
    )

    await verifySetup()
    await mainLoop()
  } catch (error) {
    log(`\n❌ Error fatal: ${error.message}`, 'error')
    rl.close()
    process.exit(1)
  }
}

main()
