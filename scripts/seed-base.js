#!/usr/bin/env node
/**
 * Seed base de Paw-Path: deja la BD lista para operar.
 *
 * - Configuración operativa: crea los valores del catálogo que falten
 *   (functions/src/compartido/configuracion.ts); no toca los ya guardados.
 * - Versionados: publica la versión 1 de la política comercial y de cada
 *   documento de consentimiento, solo si ese tipo aún no tiene versión.
 *
 * Usa el mismo código que las Cloud Functions (functions/lib), así que valida
 * y calcula el hash igual que el admin al publicar. Por eso el script npm
 * compila functions antes de ejecutarlo.
 *
 * Uso (desde la raíz del proyecto):
 *   npm run seed:base                      # crea lo que falte
 *   npm run seed:base -- --dry-run         # muestra qué crearía
 *
 * Credenciales: scripts/firebaseCredentials.json (cuenta de servicio).
 * Idempotente: se puede ejecutar varias veces sin duplicar nada.
 */

const path = require('path')

const functionsDir = path.resolve(__dirname, '../functions')
const desdeFunctions = modulo => require(path.join(functionsDir, modulo))
// Paquetes resueltos desde functions: el mismo firebase-admin que usa
// functions/lib (los Timestamp deben ser compatibles)
const paquete = nombre => require(require.resolve(nombre, { paths: [functionsDir] }))

const { initializeApp, applicationDefault } = paquete('firebase-admin/app')
const { getFirestore, Timestamp } = paquete('firebase-admin/firestore')
const { publicarVersion } = desdeFunctions('lib/comun/versionado')
const { sembrarConfiguracion } = desdeFunctions('lib/comun/configuracion')
const { AREAS_CONFIGURACION } = desdeFunctions('lib/compartido/configuracion')
const {
  COLECCION_VERSIONADOS,
  TIPO_POLITICA_COMERCIAL,
} = desdeFunctions('lib/compartido/versionables')
const { tipoVersionableConsentimiento } = desdeFunctions('lib/compartido/consentimiento')

// Con FIRESTORE_EMULATOR_HOST el seed va al emulador (sin credenciales ni
// proyecto real); sin esa variable usa la cuenta de servicio del proyecto real.
const EMULADOR = !!process.env.FIRESTORE_EMULATOR_HOST
const RUTA_CREDENCIALES = path.resolve(__dirname, 'firebaseCredentials.json')
const credentials = EMULADOR
  ? { project_id: 'demo-pawpath (emulador)' }
  : require(RUTA_CREDENCIALES)

// La cuenta de servicio se entrega como credencial por defecto (en vez de
// cert(), que hace que google-auth-library avise que `credentials` es obsoleto)
if (!EMULADOR) process.env.GOOGLE_APPLICATION_CREDENTIALS = RUTA_CREDENCIALES

initializeApp(
  EMULADOR
    ? { projectId: 'demo-pawpath' }
    : { credential: applicationDefault(), projectId: credentials.project_id }
)
const db = getFirestore()

const AUTOR = 'sistema-seed'
const MOTIVO = 'Versión inicial'
const DRY_RUN = process.argv.includes('--dry-run')

// Valores comerciales iniciales acordados
const POLITICA_COMERCIAL = {
  por_tipo: {
    paseo: {
      precio: { base_por_hora: 18000, mascota_adicional: 5000 },
      comision: { porcentaje_plataforma: 10 },
    },
  },
  impuestos: {
    // IVA sobre la comisión de Paw-Path, incluido en el precio
    iva_comision: { aplica: true, porcentaje: 19, incluido_en_precio: true },
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
  // Documento soporte al pagar a cuidadores no obligados a facturar
  contabilidad: { documento_soporte_cuidador: true },
  entrega: {
    ventana_reclamo_horas: 48,
    cobrar_si_cierra_equipo: true,
    cierre_automatico_horas: 0,
    cierre_automatico_requiere_evidencia: true,
  },
}

const CONSENTIMIENTOS = [
  {
    "tipo_documento": "DATOS_PERSONALES",
    "titulo": "Tratamiento de Datos Personales",
    "es_obligatorio": true,
    "requiere_reconfirmacion_meses": 12,
    "texto": "AUTORIZACIÓN PARA EL TRATAMIENTO DE DATOS PERSONALES\n\nA través de esta autorización, conforme a lo establecido en la Ley 1581 de 2012 y el Decreto 1377 de 2013 (Protección de Datos Personales en Colombia), autorizo a PAW-PATH para:\n\n1. RECOPILACIÓN DE DATOS\n   - Información de contacto (nombre, email, teléfono)\n   - Información de ubicación geográfica\n   - Información sobre mis mascotas\n   - Datos de navegación y uso de la aplicación\n\n2. PROCESAMIENTO Y USO\n   - Crear y mantener mi perfil de usuario\n   - Facilitar servicios de paseo y cuidado de mascotas\n   - Procesar pagos y transacciones\n   - Mejorar la experiencia de usuario\n   - Comunicaciones de servicio\n\n3. ALMACENAMIENTO\n   Los datos serán almacenados de forma segura en servidores de Firebase (Google Cloud).\n\n4. DERECHOS DEL TITULAR\n   - Acceder a mis datos personales en cualquier momento\n   - Solicitar rectificación si la información es inexacta\n   - Solicitar supresión de mis datos\n   - Revocar esta autorización\n\n5. CONTACTO\n   Para ejercer cualquiera de estos derechos, contactar a contacto@pawpath.app\n\nAutorizo el tratamiento de mis datos personales conforme a estos términos."
  },
  {
    "tipo_documento": "TERMINOS_SERVICIO",
    "titulo": "Términos de Servicio",
    "es_obligatorio": true,
    "requiere_reconfirmacion_meses": null,
    "texto": "TÉRMINOS DE SERVICIO - PAW-PATH\n\n1. ACEPTACIÓN DE TÉRMINOS\n   Al utilizar PAW-PATH, aceptas estos términos y condiciones en su totalidad.\n\n2. DESCRIPCIÓN DEL SERVICIO\n   PAW-PATH es una plataforma para conectar tutores de mascotas con cuidadores profesionales.\n\n3. RESPONSABILIDADES DEL USUARIO\n   - Proporcionar información verídica\n   - Usar la plataforma de forma legal y responsable\n   - No acosar, difamar o amenazar a otros usuarios\n   - No realizar actividades ilegales\n\n4. LIMITACIÓN DE RESPONSABILIDAD\n   PAW-PATH no es responsable por:\n   - Acciones de terceros (cuidadores, tutores)\n   - Pérdida o daño a mascotas (más allá de nuestro control)\n   - Interrupciones del servicio\n\n5. CANCELACIÓN\n   El usuario puede cancelar su cuenta en cualquier momento desde la configuración.\n\n6. CAMBIOS A ESTOS TÉRMINOS\n   PAW-PATH se reserva el derecho de modificar estos términos notificando al usuario.\n\nAl registrarse, confirmas haber leído y aceptado estos términos."
  },
  {
    "tipo_documento": "MARKETING_COMUNICACIONES",
    "titulo": "Comunicaciones de Marketing",
    "es_obligatorio": false,
    "requiere_reconfirmacion_meses": null,
    "texto": "AUTORIZACIÓN PARA COMUNICACIONES DE MARKETING\n\nAutorizo a PAW-PATH para enviarme:\n- Ofertas y promociones especiales\n- Novedades sobre nuevas funcionalidades\n- Comunicaciones sobre eventos y contenido de interés\n\nPuedo revocar este consentimiento en cualquier momento desde la configuración de mi cuenta."
  }
]

const VERSIONES_INICIALES = [
  [TIPO_POLITICA_COMERCIAL, POLITICA_COMERCIAL],
  ...CONSENTIMIENTOS.map(({ tipo_documento, ...contenido }) => [
    tipoVersionableConsentimiento(tipo_documento),
    { roles_requeridos: [], ...contenido },
  ]),
]

async function sembrarVersiones(ahora) {
  for (const [tipo, contenido] of VERSIONES_INICIALES) {
    const serie = await db.collection(COLECCION_VERSIONADOS).doc(tipo).get()
    const vigente = serie.data()?.version_vigente
    if (typeof vigente === 'number') {
      console.log(`= ${tipo}: ya tiene versión vigente (v${vigente}), se omite`)
      continue
    }
    if (DRY_RUN) {
      console.log(`+ ${tipo}: se publicaría la v1`)
      continue
    }
    const r = await publicarVersion(db, tipo, contenido, { motivo: MOTIVO, autor: AUTOR, ahora })
    console.log(`+ ${tipo}: v${r.version} publicada`)
  }
}

async function main() {
  console.log(`Proyecto: ${credentials.project_id}${DRY_RUN ? ' (dry-run)' : ''}`)
  const ahora = Timestamp.now()

  if (DRY_RUN) {
    console.log(`Configuración: se completarían las áreas ${AREAS_CONFIGURACION.join(', ')}`)
  } else {
    const creados = await sembrarConfiguracion(db, ahora)
    for (const [area, claves] of Object.entries(creados)) {
      console.log(`+ configuracion/${area}: ${claves.join(', ')}`)
    }
    console.log(`✓ Configuración completa (${AREAS_CONFIGURACION.join(', ')})`)
  }

  await sembrarVersiones(ahora)
  console.log('✓ Seed base terminado')
}

main()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Error:', err)
    process.exit(1)
  })
