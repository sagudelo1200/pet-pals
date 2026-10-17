#!/usr/bin/env node
/**
 * Seed de los documentos de consentimiento iniciales (versión 1).
 *
 * La Cloud Function `registrarConsentimiento` exige un documento ACTIVO por
 * tipo en `documentos_consentimientos`, y `publicarNuevaVersion` solo crea
 * versiones nuevas a partir de una existente; por eso la versión 1 se carga
 * una única vez con este script (Admin SDK, ignora las reglas).
 *
 * Uso (desde la raíz del proyecto):
 *   node scripts/seed-consentimientos.js --dry-run   # muestra qué crearía
 *   node scripts/seed-consentimientos.js             # crea lo que falte
 *
 * Credenciales: scripts/firebaseCredentials.json (cuenta de servicio, ignorada
 * por git), igual que scripts/firebase-cleanup.js.
 *
 * Idempotente: si ya existe un documento activo de un tipo, lo omite.
 */

const crypto = require('crypto')
const path = require('path')

let admin
try {
  admin = require('firebase-admin')
} catch (_e) {
  admin = require(path.resolve(__dirname, '../functions/node_modules/firebase-admin'))
}

const credentials = require('./firebaseCredentials.json')

admin.initializeApp({ credential: admin.credential.cert(credentials) })
const db = admin.firestore()

const COLECCION = 'documentos_consentimientos'
const ACTOR = 'sistema-seed'
const DRY_RUN = process.argv.includes('--dry-run')

// Textos tomados de services/firebase/consentimientos/inicializarDocumentos.ts
const DOCUMENTOS = [
  {
    "tipo_documento": "DATOS_PERSONALES",
    "titulo": "Tratamiento de Datos Personales",
    "es_obligatorio": true,
    "requiere_reconfirmacion_meses": 12,
    "contenido": "AUTORIZACIÓN PARA EL TRATAMIENTO DE DATOS PERSONALES\n\nA través de esta autorización, conforme a lo establecido en la Ley 1581 de 2012 y el Decreto 1377 de 2013 (Protección de Datos Personales en Colombia), autorizo a PAW-PATH para:\n\n1. RECOPILACIÓN DE DATOS\n   - Información de contacto (nombre, email, teléfono)\n   - Información de ubicación geográfica\n   - Información sobre mis mascotas\n   - Datos de navegación y uso de la aplicación\n\n2. PROCESAMIENTO Y USO\n   - Crear y mantener mi perfil de usuario\n   - Facilitar servicios de paseo y cuidado de mascotas\n   - Procesar pagos y transacciones\n   - Mejorar la experiencia de usuario\n   - Comunicaciones de servicio\n\n3. ALMACENAMIENTO\n   Los datos serán almacenados de forma segura en servidores de Firebase (Google Cloud).\n\n4. DERECHOS DEL TITULAR\n   - Acceder a mis datos personales en cualquier momento\n   - Solicitar rectificación si la información es inexacta\n   - Solicitar supresión de mis datos\n   - Revocar esta autorización\n\n5. CONTACTO\n   Para ejercer cualquiera de estos derechos, contactar a contacto@pawpath.app\n\nAutorizo el tratamiento de mis datos personales conforme a estos términos."
  },
  {
    "tipo_documento": "TERMINOS_SERVICIO",
    "titulo": "Términos de Servicio",
    "es_obligatorio": true,
    "requiere_reconfirmacion_meses": null,
    "contenido": "TÉRMINOS DE SERVICIO - PAW-PATH\n\n1. ACEPTACIÓN DE TÉRMINOS\n   Al utilizar PAW-PATH, aceptas estos términos y condiciones en su totalidad.\n\n2. DESCRIPCIÓN DEL SERVICIO\n   PAW-PATH es una plataforma para conectar tutores de mascotas con cuidadores profesionales.\n\n3. RESPONSABILIDADES DEL USUARIO\n   - Proporcionar información verídica\n   - Usar la plataforma de forma legal y responsable\n   - No acosar, difamar o amenazar a otros usuarios\n   - No realizar actividades ilegales\n\n4. LIMITACIÓN DE RESPONSABILIDAD\n   PAW-PATH no es responsable por:\n   - Acciones de terceros (cuidadores, tutores)\n   - Pérdida o daño a mascotas (más allá de nuestro control)\n   - Interrupciones del servicio\n\n5. CANCELACIÓN\n   El usuario puede cancelar su cuenta en cualquier momento desde la configuración.\n\n6. CAMBIOS A ESTOS TÉRMINOS\n   PAW-PATH se reserva el derecho de modificar estos términos notificando al usuario.\n\nAl registrarse, confirmas haber leído y aceptado estos términos."
  },
  {
    "tipo_documento": "MARKETING_COMUNICACIONES",
    "titulo": "Comunicaciones de Marketing",
    "es_obligatorio": false,
    "requiere_reconfirmacion_meses": null,
    "contenido": "AUTORIZACIÓN PARA COMUNICACIONES DE MARKETING\n\nAutorizo a PAW-PATH para enviarme:\n- Ofertas y promociones especiales\n- Novedades sobre nuevas funcionalidades\n- Comunicaciones sobre eventos y contenido de interés\n\nPuedo revocar este consentimiento en cualquier momento desde la configuración de mi cuenta."
  }
]

// Mismo formato de hash que la Cloud Function publicarNuevaVersion
function hashContenido(contenido) {
  return 'sha256:' + crypto.createHash('sha256').update(contenido).digest('hex')
}

async function existeActivo(tipo) {
  const snap = await db
    .collection(COLECCION)
    .where('tipo_documento', '==', tipo)
    .where('activo', '==', true)
    .limit(1)
    .get()
  return snap.empty ? null : snap.docs[0].id
}

async function main() {
  console.log(`Proyecto: ${credentials.project_id}${DRY_RUN ? ' (dry-run)' : ''}`)
  let creados = 0

  for (const doc of DOCUMENTOS) {
    const activo = await existeActivo(doc.tipo_documento)
    if (activo) {
      console.log(`= ${doc.tipo_documento}: ya existe activo (${activo}), se omite`)
      continue
    }

    const id = `${doc.tipo_documento}_v1`
    const ahora = admin.firestore.FieldValue.serverTimestamp()
    const datos = {
      id,
      tipo_documento: doc.tipo_documento,
      version: 1,
      titulo: doc.titulo,
      contenido: doc.contenido,
      hash_contenido: hashContenido(doc.contenido),
      es_obligatorio: doc.es_obligatorio,
      roles_requeridos: [],
      requiere_reconfirmacion_meses: doc.requiere_reconfirmacion_meses,
      activo: true,
      creado_en: ahora,
      actualizado_en: ahora,
      creado_por: ACTOR,
      actualizado_por: ACTOR,
    }

    if (DRY_RUN) {
      console.log(`+ ${id}: se crearía (${doc.titulo})`)
      continue
    }

    // create() falla si el id ya existe: nunca sobrescribe una versión
    await db.collection(COLECCION).doc(id).create(datos)
    creados++
    console.log(`+ ${id}: creado (${doc.titulo})`)
  }

  console.log(DRY_RUN ? 'Dry-run terminado.' : `Listo: ${creados} documento(s) creado(s).`)
}

main()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Error en el seed de consentimientos:', err)
    process.exit(1)
  })
