/* eslint-disable camelcase */
/**
 * Cloud Function para registrar consentimientos de usuario.
 *
 * Nota: Este archivo usa snake_case (tipo_documento, usuario_id, etc.) porque:
 * 1. Recibe payloads JSON de REST APIs (convención snake_case)
 * 2. Almacena directamente en Firestore con mismos nombres
 * 3. Mejora legibilidad entre cliente y base de datos
 *
 * Eslint camelcase está deshabilitado solo para este archivo.
 */

import {onCall, HttpsError} from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import {
  transicionValida,
  type EstadoBase,
  type EstadoConsentimiento,
} from '../models/consentimientos.validators';

if (!admin.apps.length) admin.initializeApp();

const db = admin.firestore();

// Wrapper para compatibilidad de tipos
const validarTransicion = (
  estadoActual: string,
  nuevoEstado: string
): boolean => {
  return transicionValida(
    estadoActual as EstadoBase,
    nuevoEstado as EstadoConsentimiento
  );
};

/**
 * Cloud Function Callable: punto único de validación.
 *
 * PAYLOAD ESPERADO:
 * {
 *   tipo_documento: string (requerido)        // Ej: 'DATOS_PERSONALES'
 *   estado: string (requerido)                // 'ACEPTADO' | 'RECHAZADO' | 'REVOCADO'
 *   dispositivo?: string                      // iOS | Android | Web
 *   idioma?: string                           // es-CO | en-US
 *   timezone?: string                         // America/Bogota
 * }
 *
 * RETORNO:
 * {
 *   exito: boolean
 *   evento_id?: string                        // ID del evento creado
 *   estado?: string                           // Estado registrado
 *   error?: string                            // Mensaje de error si exito=false
 * }
 *
 * Responsabilidades:
 * 1. Autenticación
 * 2. Validación de usuario y roles
 * 3. Validación de documento
 * 4. Validación de transición de estado
 * 5. Cálculo de fechas
 * 6. Auditoría
 * 7. Creación atómica de evento + proyección
 *
 * Garantía:
 * Firestore Transaction evita condiciones de carrera.
 */
export const registrarConsentimiento = onCall(
  {
    region: 'us-central1',
    timeoutSeconds: 30,
    memory: '256MiB',
  },
  async (request) => {
    try {
      // ======================================
      // 1. AUTENTICACIÓN
      // ======================================

      if (!request.auth) {
        throw new HttpsError('unauthenticated', 'Usuario no autenticado');
      }

      const uid = request.auth.uid;

      // ======================================
      // 2. VALIDACIÓN DE ENTRADA
      // ======================================

      const {tipo_documento, estado, dispositivo, idioma, timezone} =
        request.data;

      if (typeof tipo_documento !== 'string' || !tipo_documento.trim()) {
        throw new HttpsError('invalid-argument', 'tipo_documento es requerido');
      }

      const estadosPermitidos = ['ACEPTADO', 'RECHAZADO', 'REVOCADO'];

      if (typeof estado !== 'string' || !estadosPermitidos.includes(estado)) {
        throw new HttpsError(
          'invalid-argument',
          'Estado de consentimiento inválido'
        );
      }

      // Validar campos opcionales de auditoría cliente
      if (dispositivo !== undefined && typeof dispositivo !== 'string') {
        throw new HttpsError('invalid-argument', 'dispositivo debe ser string');
      }

      if (idioma !== undefined && typeof idioma !== 'string') {
        throw new HttpsError('invalid-argument', 'idioma debe ser string');
      }

      if (timezone !== undefined && typeof timezone !== 'string') {
        throw new HttpsError('invalid-argument', 'timezone debe ser string');
      }

      // ======================================
      // 3. OBTENER USUARIO
      // ======================================

      const usuarioRef = db.collection('usuarios').doc(uid);
      const usuarioSnap = await usuarioRef.get();

      if (!usuarioSnap.exists) {
        throw new HttpsError('not-found', 'Usuario no encontrado');
      }

      const usuario = usuarioSnap.data();
      const userRoles = usuario?.roles || [];

      // ======================================
      // 4. OBTENER DOCUMENTO VIGENTE
      // ======================================

      const docQuery = await db
        .collection('documentos_consentimientos')
        .where('tipo_documento', '==', tipo_documento)
        .where('activo', '==', true)
        .limit(1)
        .get();

      if (docQuery.empty) {
        throw new HttpsError(
          'not-found',
          `Documento ${tipo_documento} no encontrado o inactivo`
        );
      }

      const docSnap = docQuery.docs[0];
      const documento = docSnap.data();

      // Validar integridad del documento
      if (typeof documento.version !== 'number' || documento.version < 1) {
        throw new HttpsError(
          'invalid-argument',
          'Documento tiene version inválida'
        );
      }

      if (
        typeof documento.hash_contenido !== 'string' ||
        !documento.hash_contenido.trim()
      ) {
        throw new HttpsError(
          'invalid-argument',
          'Documento no tiene hash de contenido válido'
        );
      }

      // ======================================
      // 5. VALIDAR ROLES
      // ======================================

      if (documento.roles_requeridos && documento.roles_requeridos.length > 0) {
        const rolesRequeridos = documento.roles_requeridos as string[];
        const tieneRolRequerido = userRoles.some((rol: string) =>
          rolesRequeridos.includes(rol)
        );

        if (!tieneRolRequerido) {
          const rolesStr = rolesRequeridos.join(', ');
          throw new HttpsError(
            'permission-denied',
            `Usuario no tiene rol requerido. Roles necesarios: ${rolesStr}`
          );
        }
      }

      // Obtener estado actual (antes de transacción)
      const ultimoEventoQuery = await db
        .collection('consentimientos')
        .where('usuario_id', '==', uid)
        .where('tipo_documento', '==', tipo_documento)
        .orderBy('creado_en', 'desc')
        .limit(1)
        .get();

      const estadoActual: string = ultimoEventoQuery.empty ?
        'SIN_EVENTOS' :
        ultimoEventoQuery.docs[0].data().estado;

      // Validar transición
      if (!validarTransicion(estadoActual, estado)) {
        throw new HttpsError(
          'failed-precondition',
          `Transición inválida: ${estadoActual} → ${estado}`
        );
      }

      // Verificar que docSnap sigue siendo el vigente actual
      // (por si cambió entre línea 135 y ahora)
      const vigenteCheckQuery = await db
        .collection('documentos_consentimientos')
        .where('tipo_documento', '==', tipo_documento)
        .where('activo', '==', true)
        .limit(1)
        .get();

      if (
        vigenteCheckQuery.empty ||
        vigenteCheckQuery.docs[0].id !== docSnap.id
      ) {
        throw new HttpsError(
          'failed-precondition',
          'El documento vigente cambió. Reintentar.'
        );
      }

      // Firestore Transaction

      const resultado = await db.runTransaction(async (transaction) => {
        const timestamp = admin.firestore.Timestamp.now();
        const ahora = timestamp.toDate();

        let fechaProximaReconfirmacion: admin.firestore.Timestamp | null = null;
        if (
          estado === 'ACEPTADO' &&
          documento.requiere_reconfirmacion_meses &&
          documento.requiere_reconfirmacion_meses > 0
        ) {
          const fecha = sumarMesesCalendario(
            ahora,
            documento.requiere_reconfirmacion_meses
          );
          fechaProximaReconfirmacion = admin.firestore.Timestamp.fromDate(fecha);
        }

        // Crear evento (inmutable para auditoría)
        const eventoRef = db.collection('consentimientos').doc();
        const eventoData = {
          usuario_id: uid,
          tipo_documento,
          estado,
          documento_id: docSnap.id,
          version_documento: documento.version,
          hash_documento: documento.hash_contenido,
          fecha_evento: timestamp,
          fecha_proxima_reconfirmacion: fechaProximaReconfirmacion,
          servidor: {
            timestamp,
            user_agent: request.rawRequest?.headers['user-agent'] || null,
            ip: request.rawRequest?.ip || null,
          },
          cliente: {
            dispositivo: dispositivo || null,
            idioma: idioma || null,
            timezone: timezone || null,
          },
          creado_en: timestamp,
          creado_por: uid,
        };

        transaction.set(eventoRef, eventoData);

        // Actualizar proyección de usuario
        // es_documento_vigente_hoy=true porque docSnap es vigente
        const proyeccionData = {
          estado,
          documento_id: docSnap.id,
          version_documento: documento.version,
          fecha_evento: timestamp,
          fecha_proxima_reconfirmacion: fechaProximaReconfirmacion,
          hash_documento: documento.hash_contenido,
          es_documento_vigente_hoy: true,
        };

        const fieldsToUpdate: Record<string, unknown> = {
          [`consentimientos_estado_actual.${tipo_documento}`]: proyeccionData,
          actualizado_en: timestamp,
        };

        transaction.update(usuarioRef, fieldsToUpdate);

        return {
          exito: true,
          evento_id: eventoRef.id,
          estado,
        };
      });

      return resultado;
    } catch (error) {
      if (error instanceof HttpsError) throw error;
      console.error('[registrarConsentimiento]', error);
      throw new HttpsError('internal', 'Error interno');
    }
  }
);

/**
 * Suma meses calendario correctamente.
 *
 * Ej:
 * 31 enero + 1 mes = 28/29 febrero
 * y no 3 marzo.
 */
function sumarMesesCalendario(fecha: Date, meses: number): Date {
  const resultado = new Date(fecha);
  const diaOriginal = resultado.getDate();

  resultado.setDate(1);
  resultado.setMonth(resultado.getMonth() + meses);

  const ultimoDiaMes = new Date(
    resultado.getFullYear(),
    resultado.getMonth() + 1,
    0
  ).getDate();

  resultado.setDate(Math.min(diaOriginal, ultimoDiaMes));

  return resultado;
}
