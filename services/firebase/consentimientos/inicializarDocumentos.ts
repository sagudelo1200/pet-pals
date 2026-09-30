/**
 * Inicialización de documentos de consentimientos en Firestore.
 *
 * Se ejecuta automáticamente al iniciar la app si los documentos no existen.
 * Garantiza que los tipos de consentimiento requeridos están disponibles.
 */

import { db } from '@/firebase.config'
import { doc, setDoc, serverTimestamp, getDoc } from 'firebase/firestore'
import { TipoConsentimiento } from '@/constants/consentimientos'

interface DocumentoConsentimiento {
  tipo: string
  version: number
  titulo: string
  contenido: string
  hash_contenido: string
  es_obligatorio: boolean
  roles_requeridos: string[]
  requiere_reconfirmacion_meses: number | null
  activo: boolean
  creado_en?: any
  creado_por: string
}

/**
 * Definiciones de los documentos de consentimiento que deben existir.
 * Se crean automáticamente si no existen.
 */
const DOCUMENTOS_REQUERIDOS: Record<string, DocumentoConsentimiento> = {
  [TipoConsentimiento.DATOS_PERSONALES]: {
    tipo: TipoConsentimiento.DATOS_PERSONALES,
    version: 1,
    titulo: 'Tratamiento de Datos Personales',
    contenido: `AUTORIZACIÓN PARA EL TRATAMIENTO DE DATOS PERSONALES

A través de esta autorización, conforme a lo establecido en la Ley 1581 de 2012 y el Decreto 1377 de 2013 (Protección de Datos Personales en Colombia), autorizo a PAW-PATH para:

1. RECOPILACIÓN DE DATOS
   - Información de contacto (nombre, email, teléfono)
   - Información de ubicación geográfica
   - Información sobre mis mascotas
   - Datos de navegación y uso de la aplicación

2. PROCESAMIENTO Y USO
   - Crear y mantener mi perfil de usuario
   - Facilitar servicios de paseo y cuidado de mascotas
   - Procesar pagos y transacciones
   - Mejorar la experiencia de usuario
   - Comunicaciones de servicio

3. ALMACENAMIENTO
   Los datos serán almacenados de forma segura en servidores de Firebase (Google Cloud).

4. DERECHOS DEL TITULAR
   - Acceder a mis datos personales en cualquier momento
   - Solicitar rectificación si la información es inexacta
   - Solicitar supresión de mis datos
   - Revocar esta autorización

5. CONTACTO
   Para ejercer cualquiera de estos derechos, contactar a contacto@pawpath.app

Autorizo el tratamiento de mis datos personales conforme a estos términos.`,
    hash_contenido: 'sha256:v1_datos_personales_2024',
    es_obligatorio: true,
    roles_requeridos: [],
    requiere_reconfirmacion_meses: 12,
    activo: true,
    creado_por: 'system_init',
  },

  [TipoConsentimiento.TERMINOS_SERVICIO]: {
    tipo: TipoConsentimiento.TERMINOS_SERVICIO,
    version: 1,
    titulo: 'Términos de Servicio',
    contenido: `TÉRMINOS DE SERVICIO - PAW-PATH

1. ACEPTACIÓN DE TÉRMINOS
   Al utilizar PAW-PATH, aceptas estos términos y condiciones en su totalidad.

2. DESCRIPCIÓN DEL SERVICIO
   PAW-PATH es una plataforma para conectar tutores de mascotas con cuidadores profesionales.

3. RESPONSABILIDADES DEL USUARIO
   - Proporcionar información verídica
   - Usar la plataforma de forma legal y responsable
   - No acosar, difamar o amenazar a otros usuarios
   - No realizar actividades ilegales

4. LIMITACIÓN DE RESPONSABILIDAD
   PAW-PATH no es responsable por:
   - Acciones de terceros (cuidadores, tutores)
   - Pérdida o daño a mascotas (más allá de nuestro control)
   - Interrupciones del servicio

5. CANCELACIÓN
   El usuario puede cancelar su cuenta en cualquier momento desde la configuración.

6. CAMBIOS A ESTOS TÉRMINOS
   PAW-PATH se reserva el derecho de modificar estos términos notificando al usuario.

Al registrarse, confirmas haber leído y aceptado estos términos.`,
    hash_contenido: 'sha256:v1_terminos_servicio_2024',
    es_obligatorio: true,
    roles_requeridos: [],
    requiere_reconfirmacion_meses: null,
    activo: true,
    creado_por: 'system_init',
  },

  [TipoConsentimiento.MARKETING_COMUNICACIONES]: {
    tipo: TipoConsentimiento.MARKETING_COMUNICACIONES,
    version: 1,
    titulo: 'Comunicaciones de Marketing',
    contenido: `AUTORIZACIÓN PARA COMUNICACIONES DE MARKETING

Autorizo a PAW-PATH para enviarme:
- Ofertas y promociones especiales
- Novedades sobre nuevas funcionalidades
- Comunicaciones sobre eventos y contenido de interés

Puedo revocar este consentimiento en cualquier momento desde la configuración de mi cuenta.`,
    hash_contenido: 'sha256:v1_marketing_2024',
    es_obligatorio: false,
    roles_requeridos: [],
    requiere_reconfirmacion_meses: null,
    activo: true,
    creado_por: 'system_init',
  },
}

/**
 * Inicializar documentos de consentimientos en Firestore.
 * Crea solo los documentos que no existen.
 *
 * @returns {Promise<void>}
 */
export async function inicializarDocumentosConsentimientos(): Promise<void> {
  try {
    console.log('[inicializarDocumentosConsentimientos] Iniciando...')

    for (const [tipo, documento] of Object.entries(DOCUMENTOS_REQUERIDOS)) {
      const docRef = doc(db, 'documentos_consentimientos', tipo)

      // Verificar si el documento ya existe
      const docSnap = await getDoc(docRef)

      if (docSnap.exists()) {
        console.log(
          `[inicializarDocumentosConsentimientos] ✅ ${tipo} ya existe`
        )
        continue
      }

      // Crear el documento
      await setDoc(docRef, {
        ...documento,
        creado_en: serverTimestamp(),
      })

      console.log(
        `[inicializarDocumentosConsentimientos] ✅ ${tipo} creado exitosamente`
      )
    }

    console.log(
      '[inicializarDocumentosConsentimientos] ✅ Inicialización completada'
    )
  } catch (error) {
    console.error(
      '[inicializarDocumentosConsentimientos] ❌ Error:',
      error instanceof Error ? error.message : error
    )
    // No lanzamos error: la inicialización es un best-effort
  }
}
