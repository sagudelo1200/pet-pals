#!/usr/bin/env node
'use strict'

/**
 * firebase-cleanup.js
 *
 * Conecta a Firestore usando las credenciales de servicio en firebaseCredentials.json,
 * lista las colecciones base y permite eliminar una o todas de forma interactiva.
 *
 * Uso:
 *   node scripts/firebase-cleanup.js
 *   npm run firebase:cleanup
 *
 * Requiere firebase-admin instalado en functions/ (npm install dentro de /functions).
 */

const path = require('path')
const readline = require('readline')

// ── Cargar firebase-admin ────────────────────────────────────────────────────
let admin
try {
  admin = require('firebase-admin')
} catch {
  try {
    admin = require(path.resolve(__dirname, '../functions/node_modules/firebase-admin'))
  } catch {
    console.error(
      '\n❌  firebase-admin no encontrado.\n' +
        '    Instala las dependencias ejecutando: cd functions && npm install\n',
    )
    process.exit(1)
  }
}

// ── Credenciales ─────────────────────────────────────────────────────────────
const credentials = require('./firebaseCredentials.json')

admin.initializeApp({
  credential: admin.credential.cert(credentials),
})

const db = admin.firestore()

// ── Utilidades de consola ────────────────────────────────────────────────────
const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
const ask = (question) => new Promise((resolve) => rl.question(question, resolve))

/**
 * Elimina masivamente una colección completa (documentos + subcolecciones)
 * usando db.recursiveDelete() con BulkWriter de alta concurrencia.
 * @param {FirebaseFirestore.CollectionReference} collectionRef
 * @returns {Promise<void>}
 */
async function deleteCollection(collectionRef) {
  const bulkWriter = db.bulkWriter()
  bulkWriter.onWriteError((err) => {
    // Reintentar hasta 3 veces ante errores transitorios
    if (err.failedAttempts < 3) return true
    console.error(`\n  ⚠️  Error al eliminar ${err.documentRef.path}: ${err.message}`)
    return false
  })
  await db.recursiveDelete(collectionRef, bulkWriter)
}

// ── Flujo principal ──────────────────────────────────────────────────────────
async function main() {
  console.log('\n🔥  Firebase – Herramienta de limpieza de colecciones')
  console.log(`    Proyecto : ${credentials.project_id}`)
  console.log(`    Cuenta   : ${credentials.client_email}\n`)

  // Listar colecciones de primer nivel
  const collections = await db.listCollections()

  if (collections.length === 0) {
    console.log('✅  No hay colecciones en Firestore. Nada que hacer.')
    rl.close()
    return
  }

  console.log('Colecciones encontradas:\n')
  collections.forEach((col, i) => {
    console.log(`  [${i + 1}] ${col.id}`)
  })

  console.log('\n  [A] Eliminar TODAS las colecciones')
  console.log('  [0] Cancelar\n')

  const answer = (await ask('¿Qué deseas eliminar? (número, A o 0): ')).trim().toUpperCase()

  if (answer === '0' || answer === '') {
    console.log('\nOperación cancelada.')
    rl.close()
    return
  }

  let targets = []

  if (answer === 'A') {
    targets = collections
  } else {
    const idx = parseInt(answer, 10) - 1
    if (isNaN(idx) || idx < 0 || idx >= collections.length) {
      console.error('\n❌  Opción inválida.')
      rl.close()
      process.exit(1)
    }
    targets = [collections[idx]]
  }

  // ── Confirmación explícita ─────────────────────────────────────────────
  const names = targets.map((c) => c.id).join(', ')
  console.log(`\n⚠️   Se eliminarán de forma PERMANENTE: ${names}`)
  console.log('    Esta acción no se puede deshacer.\n')

  const confirm = (await ask('Escribe "si" para confirmar: ')).trim().toLowerCase()

  if (confirm !== 'si') {
    console.log('\nOperación cancelada.')
    rl.close()
    return
  }

  // ── Eliminación ────────────────────────────────────────────────────────
  console.log('')

  for (const col of targets) {
    process.stdout.write(`  Eliminando "${col.id}"... `)
    await deleteCollection(col)
    console.log('✅  hecho.')
  }

  console.log(`\n🎉  Limpieza completada. ${targets.length} colección(es) eliminada(s).\n`)
  rl.close()
}

main().catch((err) => {
  console.error('\n❌  Error inesperado:', err.message)
  rl.close()
  process.exit(1)
})
