#!/usr/bin/env node
/**
 * Seed de la política comercial inicial (versión 1).
 *
 * El motor económico (Cloud Functions) y el app leen precios, comisión,
 * plazos de cobro y liquidación desde la BD; no hay valores por defecto en
 * código. Las versiones siguientes se publican desde el panel de admin
 * (callable publicarPoliticaComercial).
 *
 * Uso (desde la raíz del proyecto):
 *   node scripts/seed-politica-comercial.js --dry-run   # muestra qué crearía
 *   node scripts/seed-politica-comercial.js             # crea la v1 si falta
 *   node scripts/seed-politica-comercial.js --completar # añade IVA y
 *     contabilidad a versiones creadas antes de existir esos campos
 *
 * Credenciales: scripts/firebaseCredentials.json (cuenta de servicio).
 * Idempotente: si ya hay una política vigente, no hace nada.
 */

const path = require('path')

let admin
let getFirestore
let Timestamp
try {
  admin = require('firebase-admin')
  ;({ getFirestore, Timestamp } = require('firebase-admin/firestore'))
} catch (_e) {
  admin = require(path.resolve(__dirname, '../functions/node_modules/firebase-admin'))
  ;({ getFirestore, Timestamp } = require(path.resolve(
    __dirname,
    '../functions/node_modules/firebase-admin/firestore',
  )))
}

const credentials = require('./firebaseCredentials.json')

const cert = admin.cert || admin.credential?.cert
if (typeof cert !== 'function') {
  throw new Error('No se encontró admin.cert/admin.credential.cert en firebase-admin')
}

admin.initializeApp({ credential: cert(credentials) })
const db = getFirestore()

const DRY_RUN = process.argv.includes('--dry-run')
const COMPLETAR = process.argv.includes('--completar')

// IVA sobre la comisión (incluido en el precio) y documento soporte al
// pagar a cuidadores: valores por defecto acordados
const IMPUESTOS = {
  iva_comision: { aplica: true, porcentaje: 19, incluido_en_precio: true },
}
const CONTABILIDAD = { documento_soporte_cuidador: true }

// Valores iniciales acordados (antes en constants/pricing.ts)
const POLITICA_V1 = {
  version: 1,
  estado: 'ACTIVA',
  por_tipo: {
    paseo: {
      precio: { base_por_hora: 18000, mascota_adicional: 5000 },
      comision: { porcentaje_plataforma: 10 },
    },
  },
  cobro: {
    plazo_pago_horas: 24,
    bloqueo_tras_horas: 72,
    max_recordatorios: 3,
    intervalo_recordatorios_horas: 24,
    horario_recordatorios: { desde: 8, hasta: 19 },
  },
  liquidacion: {
    frecuencia: 'SEMANAL',
    dia_corte: 0, // domingo
    dia_pago: 2, // martes
    monto_minimo: 20000,
    solo_recaudadas: true,
  },
  impuestos: IMPUESTOS,
  contabilidad: CONTABILIDAD,
  publicado_por: 'sistema-seed',
}

// Completa versiones antiguas que no tienen impuestos o contabilidad
async function completarVersiones() {
  const snap = await db.collection('politicas_comerciales').get()
  let n = 0
  for (const d of snap.docs) {
    const p = d.data()
    const faltan = {
      ...(!p.impuestos && { impuestos: IMPUESTOS }),
      ...(!p.contabilidad && { contabilidad: CONTABILIDAD }),
    }
    if (Object.keys(faltan).length === 0) continue
    console.log(`${d.id}: se añade ${Object.keys(faltan).join(' y ')}`)
    if (!DRY_RUN) await d.ref.update(faltan)
    n++
  }
  console.log(n ? `✓ ${n} versión(es) completadas` : 'Todas las versiones están completas.')
}

async function main() {
  console.log(`Proyecto: ${credentials.project_id}${DRY_RUN ? ' (dry-run)' : ''}`)
  if (COMPLETAR) return completarVersiones()
  const configRef = db.collection('configuracion').doc('comercial')
  const config = await configRef.get()
  const vigente = config.data()?.version_vigente
  if (typeof vigente === 'number') {
    console.log(`Ya existe política vigente v${vigente}; no se crea nada.`)
    return
  }
  console.log('Se creará politicas_comerciales/v1:')
  console.log(JSON.stringify(POLITICA_V1, null, 2))
  if (DRY_RUN) return

  const ahora = Timestamp.now()
  const batch = db.batch()
  batch.set(db.collection('politicas_comerciales').doc('v1'), {
    ...POLITICA_V1,
    vigente_desde: ahora,
  })
  batch.set(configRef, { version_vigente: 1, actualizado_en: ahora })
  await batch.commit()
  console.log('✓ Política comercial v1 creada y vigente.')
}

main()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Error:', err)
    process.exit(1)
  })
