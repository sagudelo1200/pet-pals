// ---------- Casos de uso del dominio de paseos ----------
// Responsabilidad: orquestar operaciones de negocio (crear, aceptar, iniciar,
// finalizar, validar códigos, etc.) apoyándose en los servicios de datos y en
// el gestor de paseo activo. No contiene estado propio.
import {
  ServicioAuth,
  ServicioPaseo,
  ServicioCrudBase,
  ServicioPaseoMascota,
} from '@/services/firebase'
import { ESTADOS_PASEO, type Paseo } from '@/models/Paseo'
import type { Mascota } from '@/models/Mascota'
import type { Ubicacion } from '@/models/Ubicacion'
import { MAX_MASCOTAS_POR_PASEO, ERR } from '@/constants'
import { crearMaquinaPaseo } from './maquinaEstados'
import { generarCodigosRecogidaPorTutor } from './generador'
import { paseoActivo } from './gestor'
import {
  collection,
  query,
  where,
  orderBy,
  getDocs,
} from 'firebase/firestore'
import { db } from '@/firebase.config'
import { coordsAH3 } from '@/services/geo'
import { H3TerritorialOrchestrator } from '@/services/h3'

// ---------- Helpers de denormalización ----------
const MAX_DENORMALIZED_PHOTO_SIZE = 120 * 1024 // 120KB (suficiente para URLs y mini-thumbnails)

function sanitizarFotoDenormalizada(
  foto: string | null | undefined
): string | null {
  if (!foto) return null
  // Si la foto es un base64 muy grande (> 120KB), la omitimos en la denormalización
  // para evitar exceder el límite de 1MB de Firestore en el documento principal.
  if (foto.startsWith('data:') && foto.length > MAX_DENORMALIZED_PHOTO_SIZE) {
    console.warn(
      `[Paseos] Foto base64 demasiado grande (${Math.round(foto.length / 1024)}KB). Omitiendo denormalización.`
    )
    return null
  }
  return foto
}

function prepararDataPaseoMascota(
  paseoId: string,
  mascota: any,
  direccion?: Ubicacion
) {
  return {
    id: mascota.id,
    id_paseo: paseoId,
    id_mascota: mascota.id,
    id_usuario: mascota.creado_por,
    estado_mascota: 'pendiente',
    // Nota: Los códigos de validación ahora están a nivel de PASEO (por tutor)
    // Ver Paseo.codigos_recogida_por_tutor, etc.
    direccion: direccion
      ? {
          id_origen: direccion.id,
          alias: direccion.alias,
          direccion_formateada: direccion.direccion_formateada,
          coordenadas: {
            latitude: Number(direccion.coordenadas.latitude),
            longitude: Number(direccion.coordenadas.longitude),
          },
          instrucciones: direccion.instrucciones || null,
        }
      : null,
  }
}

// ---------- Validaciones de Tier 1 ----------

/**
 * Valida que el cuidador NO tenga otro paseo en la misma franja horaria.
 * Previene "double booking" donde un cuidador acepta 2+ paseos simultáneos.
 * @param uid ID del cuidador
 * @param fechaInicio Fecha/hora de inicio del paseo a aceptar
 * @param duracion Duración en minutos
 * @returns {error: string} si hay overlap, {success: true} si está libre
 */
async function validarNoDoubleBooking(
  uid: string,
  fechaInicio: Date,
  duracion: number
) {
  try {
    // Query: paseos del cuidador en estados activos
    const agendaQuery = query(
      collection(db, 'paseos'),
      where('id_cuidador', '==', uid),
      where('estado', 'in', [
        ESTADOS_PASEO.CONFIRMADO,
        ESTADOS_PASEO.EN_CAMINO,
        ESTADOS_PASEO.EN_PROGRESO,
      ]),
      orderBy('fecha_hora_inicio', 'asc')
    )

    const docs = await getDocs(agendaQuery)
    const fechaFin = new Date(fechaInicio.getTime() + duracion * 60000)

    for (const doc of docs.docs) {
      const paseoExistente = doc.data() as Paseo
      const finExistente = new Date(
        paseoExistente.fecha_hora_inicio.getTime() +
          (paseoExistente.duracion_estimada || 0) * 60000
      )

      // Verificar overlap de horarios (con buffer de 5 min)
      const bufferMs = 5 * 60 * 1000
      const overlapDetectado =
        fechaInicio < new Date(finExistente.getTime() + bufferMs) &&
        fechaFin >
          new Date(paseoExistente.fecha_hora_inicio.getTime() - bufferMs)

      if (overlapDetectado) {
        return {
          success: false,
          error: 'DOBLE_BOOKING_DETECTADO',
          detalles: `Tienes otro paseo de ${paseoExistente.duracion_estimada}min a las ${paseoExistente.fecha_hora_inicio.toLocaleTimeString('es-AR')}`,
        }
      }
    }

    return { success: true }
  } catch (error) {
    console.error('[Tier1.2] Error validando double booking:', error)
    return {
      success: false,
      error: 'ERROR_VALIDACION',
      detalles: 'No se pudo verificar disponibilidad',
    }
  }
}

/**
 * Valida que una mascota no tenga otro paseo solapado en la misma franja horaria.
 * Similar a validarNoDoubleBooking pero por `mascotaId`.
 * Solo valida paseos propios (creado_por == uid) para cumplir permisos de Firestore.
 */
async function validarNoSolapamientoPorMascota(
  mascotaId: string,
  fechaInicio: Date,
  duracion: number,
  _uid: string
) {
  try {
    const estadosActivos = [
      ESTADOS_PASEO.PENDIENTE,
      ESTADOS_PASEO.CONFIRMADO,
      ESTADOS_PASEO.EN_CAMINO,
      ESTADOS_PASEO.EN_PROGRESO,
    ]

    // MULTI-TUTOR: Busca TODOS los paseos activos de la mascota, sin importar quién los creó.
    // Esto previene que múltiples tutores de la misma mascota creen paseos solapados.
    const q = query(
      collection(db, 'paseos'),
      where('mascota_ids', 'array-contains', mascotaId),
      where('estado', 'in', estadosActivos)
    )

    const docs = await getDocs(q)
    const fechaFin = new Date(fechaInicio.getTime() + duracion * 60000)

    for (const doc of docs.docs) {
      const paseoExistente = doc.data() as Paseo
      const inicioExistente = new Date(paseoExistente.fecha_hora_inicio)
      const finExistente = new Date(
        inicioExistente.getTime() +
          (paseoExistente.duracion_estimada || 0) * 60000
      )

      const bufferMs = 5 * 60 * 1000
      const overlapDetectado =
        fechaInicio < new Date(finExistente.getTime() + bufferMs) &&
        fechaFin > new Date(inicioExistente.getTime() - bufferMs)

      if (overlapDetectado) {
        return {
          success: false,
          error: 'DOBLE_BOOKING_MASCOTA',
          detalles: `Mascota ${mascotaId} tiene otro paseo de ${paseoExistente.duracion_estimada}min a las ${inicioExistente.toLocaleTimeString()}`,
        }
      }
    }

    return { success: true }
  } catch (error) {
    console.error('[Tier1.3] Error validando solapamiento por mascota:', error)
    return {
      success: false,
      error: 'ERROR_VALIDACION',
      detalles: 'No se pudo verificar disponibilidad de la mascota',
    }
  }
}

// ---------- Funciones públicas del gestor (crearConMascotas) ----------
export async function crearConMascotas(
  data: Omit<
    Paseo,
    | 'id'
    | 'creado_en'
    | 'actualizado_en'
    | 'creado_por'
    | 'actualizado_por'
    | 'mascotas_count'
  >,
  mascotaIds: string[],
  direccion?: Ubicacion
): Promise<{ success: boolean; data?: Paseo; error?: any }> {
  const current = ServicioAuth.obtenerUsuarioActual()
  const uid = current?.uid
  if (!uid) return { success: false, error: ERR.COMUN.NO_AUTENTICADO }

  const unique = Array.from(new Set((mascotaIds || []).filter(Boolean)))
  const maxPaseo =
    typeof (data as any).cupo_maximo_mascotas === 'number'
      ? (data as any).cupo_maximo_mascotas
      : MAX_MASCOTAS_POR_PASEO
  const max = Math.min(MAX_MASCOTAS_POR_PASEO, maxPaseo)
  if (unique.length > max)
    return { success: false, error: ERR.PASEOS.LIMITE_DE_MASCOTAS_SUPERADO }

  const mascotasData: any[] = []
  if (unique.length > 0) {
    const resultados = await Promise.all(
      unique.map(mid => ServicioCrudBase.obtenerPorId<Mascota>('mascotas', mid))
    )

    for (const res of resultados) {
      if (!res.success || !res.data)
        return { success: false, error: ERR.MASCOTAS.MASCOTA_NO_ENCONTRADA }

      const m = res.data as any
      if (m.creado_por !== uid)
        return {
          success: false,
          error: ERR.MASCOTAS.MASCOTA_NO_PERTENECE_AL_USUARIO,
        }
      mascotasData.push(m)
    }
  }

  // Validación adicional: asegurar que ninguna mascota seleccionada tenga
  // otro paseo solapado en la misma franja horaria.
  const fechaInicioRaw = (data as any).fecha_hora_inicio
  const duracionPropuesta = (data as any).duracion_estimada || 60
  if (fechaInicioRaw) {
    const fechaInicio = new Date(fechaInicioRaw)
    for (const mid of unique) {
      const validMasc = await validarNoSolapamientoPorMascota(
        mid,
        fechaInicio,
        duracionPropuesta,
        uid
      )
      if (!validMasc.success) return validMasc
    }
  }

  let locationData: any = {}
  const locObj = (data.ubicacion_inicio as any) || direccion

  if (locObj && typeof locObj === 'object') {
    // Validar que coordenadas existan y sean válidas
    if (
      !locObj.coordenadas ||
      typeof locObj.coordenadas.latitude === 'undefined' ||
      typeof locObj.coordenadas.longitude === 'undefined'
    ) {
      return {
        success: false,
        error: ERR.PASEOS.UBICACION_INVALIDA,
      }
    }

    const lat = Number(locObj.coordenadas.latitude)
    const lng = Number(locObj.coordenadas.longitude)

    // Verificar que las coordenadas convertidas sean números válidos
    if (isNaN(lat) || isNaN(lng)) {
      return {
        success: false,
        error: ERR.PASEOS.COORDENADAS_INVALIDAS,
      }
    }

    const snap = {
      direccion_formateada: locObj.direccion_formateada || '',
      coordenadas: {
        latitude: lat,
        longitude: lng,
      },
      id_origen: locObj.id,
      alias: locObj.alias,
    }
    locationData = {
      ubicacion_inicio: snap,
      ubicacion_inicio_txt:
        locObj.alias || locObj.direccion_formateada || 'Ubicación',
    }
  }

  let visualData: any = {}
  if (mascotasData.length > 0) {
    const fotos: string[] = []
    let primerNombre = ''

    const limit = Math.min(mascotasData.length, 4)
    for (let i = 0; i < limit; i++) {
      const d = mascotasData[i]
      if (i === 0) primerNombre = d.nombre
      const foto = sanitizarFotoDenormalizada(d.foto_url || d.foto)
      if (foto) fotos.push(foto)
    }

    visualData = {
      mascota_nombre_visual: primerNombre,
      mascota_foto_visual: fotos[0] || null,
      mascotas_fotos_visual: fotos,
    }
  }

  // Generar códigos de recogida por tutor
  // En paseos privados: solo el tutor que lo crea (uid)
  // En paseos compartidos: se agregarán cuando otros tutores unan mascotas
  const tutoresIniciales = [uid]
  const codigosRecogidaPorTutor =
    generarCodigosRecogidaPorTutor(tutoresIniciales)

  const paseoRes = await ServicioPaseo.crear({
    ...(data as any),
    ...locationData,
    cupo_maximo_mascotas: max,
    mascotas_count: unique.length,
    mascota_ids: unique,
    codigos_recogida_por_tutor: codigosRecogidaPorTutor,
    codigo_recogida_validado_por_tutor: {},
    intentos_fallidos_recogida_por_tutor: {},
    codigos_entrega_por_tutor: {},
    codigo_entrega_validado_por_tutor: {},
    intentos_fallidos_entrega_por_tutor: {},
    ...visualData,
  } as any)

  if (!paseoRes.success || !paseoRes.data) return paseoRes as any

  if (unique.length > 0) {
    const payloadMascotas = mascotasData.map(m =>
      prepararDataPaseoMascota(paseoRes.data!.id, m, direccion)
    )
    const addRes = await ServicioPaseoMascota.commitMascotasBatch(
      paseoRes.data.id,
      payloadMascotas
    )
    if (!addRes.success) return { success: false, error: (addRes as any).error }
  }

  // Registrar demanda en la zona H3 de inicio (con retry automático)
  const lat = (locObj as any)?.coordenadas?.latitude
  const lng = (locObj as any)?.coordenadas?.longitude
  if (lat && lng) {
    const celdaR9 = coordsAH3(lat, lng, 9)

    if (celdaR9) {
      const exito = await H3TerritorialOrchestrator.procesarEventoPaseo(
        celdaR9,
        'EN_PROGRESO',
        {
          paseo_uid: paseoRes.data?.id,
          tutor_uid: uid,
          mascota_ids: mascotasData?.map(m => m.id),
        }
      )

      if (!exito) {
        console.warn(
          '[h3] Fallo registrar demanda al crear paseo:',
          paseoRes.data?.id
        )
      }
    }
  }

  return paseoRes as any
}

// ---------- Orquestadores de estado (migrados desde services) ----------

/**
 * TIER 1: Aceptar solicitud con reintento automático y validación de double booking
 * - Previene doble asignación (2 clientes aceptan < 1seg)
 * - Previene double booking (cuidador con 2 paseos simultáneos)
 * - Reintentos automáticos (máx 2 intentos)
 */
export async function aceptarSolicitud(paseoId: string) {
  const current = ServicioAuth.obtenerUsuarioActual()
  const uid = current?.uid
  if (!uid) return { success: false, error: ERR.COMUN.NO_AUTENTICADO }

  const paseoRes = await ServicioPaseo.obtenerPorId(paseoId)
  if (!paseoRes.success || !paseoRes.data)
    return { success: false, error: ERR.COMUN.DOCUMENTO_NO_ENCONTRADO }

  const paseo = paseoRes.data as Paseo
  if (paseo.estado !== ESTADOS_PASEO.PENDIENTE)
    return { success: false, error: 'PASEO_NO_DISPONIBLE' }
  if (paseo.creado_por === uid)
    return { success: false, error: 'NO_PUEDE_ACEPTAR_PROPIO_PASEO' }
  if (paseo.id_cuidador && paseo.id_cuidador !== uid)
    return { success: false, error: 'PASEO_YA_ACEPTADO' }

  // TIER 1.2: Validar que cuidador NO tenga otro paseo en mismo horario
  const validacionDbBooking = await validarNoDoubleBooking(
    uid,
    paseo.fecha_hora_inicio,
    paseo.duracion_estimada || 0
  )
  if (!validacionDbBooking.success) {
    return {
      success: false,
      error: validacionDbBooking.error,
      detalles: (validacionDbBooking as any).detalles,
    }
  }

  const cuidador_nombre_visual = current.displayName || 'Cuidador'
  const cuidador_foto_visual = sanitizarFotoDenormalizada(
    current.photoURL || null
  )

  // TIER 1.1: Reintento automático (máx 2 intentos) en caso de doble asignación
  const MAX_REINTENTOS = 2
  let _ultimoError: any = null

  for (let intento = 1; intento <= MAX_REINTENTOS; intento++) {
    const res = await ServicioPaseo.commitEstadoTransaccional(
      paseoId,
      ESTADOS_PASEO.PENDIENTE,
      ESTADOS_PASEO.CONFIRMADO,
      {
        id_cuidador: uid,
        cuidador_nombre_visual,
        cuidador_foto_visual,
      }
    )

    if (res.success) {
      try {
        paseoActivo.aceptarPaseo()
      } catch (e) {
        console.warn('Error actualizando paseoActivo:', e)
      }
      // Registrar evento técnico
      await ServicioPaseo.registrarEvento(paseoId, 'ACEPTAR', {
        estado_anterior: 'PENDIENTE',
        estado_nuevo: 'CONFIRMADO',
        id_cuidador: uid,
        cuidador_nombre_visual,
        cuidador_foto_visual,
        intento,
      })
      return res
    }

    _ultimoError = res.error

    // Si es doble asignación, reintentar (otro cliente ganó, pero podría haber estado en PENDIENTE)
    const esDoubleAsignacion =
      res.error === 'PASEO_YA_ACEPTADO' ||
      res.error?.includes('estado no esperado') ||
      res.error?.includes('ESTADO_NO_ESPERADO')

    if (!esDoubleAsignacion) {
      // Error diferente, no reintentar
      return res
    }

    if (intento < MAX_REINTENTOS) {
      // Wait 100ms before retry
      await new Promise(resolve => setTimeout(resolve, 100))
      // Re-fetch para verificar estado actual
      const paseoActualRes = await ServicioPaseo.obtenerPorId(paseoId)
      if (paseoActualRes.success && paseoActualRes.data) {
        const paseoActual = paseoActualRes.data as Paseo
        if (paseoActual.estado !== ESTADOS_PASEO.PENDIENTE) {
          // Paseo ya no está en PENDIENTE, abortamos
          return {
            success: false,
            error: 'PASEO_YA_ACEPTADO',
            detalles: `Aceptado por ${paseoActual.cuidador_nombre_visual} hace unos segundos`,
          }
        }
      }
    }
  }

  // Si llegamos aquí, fallaron todos los intentos
  return {
    success: false,
    error: 'PASEO_YA_ACEPTADO',
    detalles: 'Este paseo ya fue aceptado por otro cuidador. Intenta con otro.',
  }
}

export async function iniciarRuta(paseoId: string) {
  const current = ServicioAuth.obtenerUsuarioActual()
  const uid = current?.uid
  if (!uid) return { success: false, error: ERR.COMUN.NO_AUTENTICADO }

  const paseoRes = await ServicioPaseo.obtenerPorId(paseoId)
  if (!paseoRes.success || !paseoRes.data)
    return { success: false, error: ERR.COMUN.DOCUMENTO_NO_ENCONTRADO }

  const paseo = paseoRes.data as Paseo
  const maquina = crearMaquinaPaseo(paseo)
  if (!maquina.puede('INICIAR_RUTA'))
    return { success: false, error: 'TRANSICION_INVALIDA' }

  const res = await ServicioPaseo.commitEstadoTransaccional(
    paseoId,
    ESTADOS_PASEO.CONFIRMADO,
    ESTADOS_PASEO.EN_CAMINO
  )
  if (res.success) {
    try {
      paseoActivo.iniciarRuta()
    } catch (e) {
      console.warn('Error actualizando paseoActivo:', e)
    }
    await ServicioPaseo.registrarEvento(paseoId, 'INICIAR_RUTA', {
      estado_anterior: 'CONFIRMADO',
      estado_nuevo: 'EN_CAMINO',
    })
  }
  return res
}

export async function iniciarPaseo(paseoId: string) {
  const current = ServicioAuth.obtenerUsuarioActual()
  const uid = current?.uid
  if (!uid) return { success: false, error: ERR.COMUN.NO_AUTENTICADO }

  const paseoRes = await ServicioPaseo.obtenerPorId(paseoId)
  if (!paseoRes.success || !paseoRes.data)
    return { success: false, error: ERR.COMUN.DOCUMENTO_NO_ENCONTRADO }

  const paseo = paseoRes.data as Paseo
  const maquina = crearMaquinaPaseo(paseo)
  if (!maquina.puede('INICIAR_PASEO'))
    return { success: false, error: 'TRANSICION_INVALIDA' }

  const { serverTimestamp } = await import('firebase/firestore')
  const res = await ServicioPaseo.commitEstadoTransaccional(
    paseoId,
    ESTADOS_PASEO.EN_CAMINO,
    ESTADOS_PASEO.EN_PROGRESO,
    { fecha_inicio_real: serverTimestamp() }
  )
  if (res.success) {
    try {
      paseoActivo.iniciarPaseo(new Date())
    } catch (e) {
      console.warn('Error actualizando paseoActivo:', e)
    }
    await ServicioPaseo.registrarEvento(paseoId, 'INICIAR_PASEO', {
      estado_anterior: 'EN_CAMINO',
      estado_nuevo: 'EN_PROGRESO',
    })
  }
  return res
}

export async function finalizarPaseo(paseoId: string) {
  const current = ServicioAuth.obtenerUsuarioActual()
  const uid = current?.uid
  if (!uid) return { success: false, error: ERR.COMUN.NO_AUTENTICADO }

  const paseoRes = await ServicioPaseo.obtenerPorId(paseoId)
  if (!paseoRes.success || !paseoRes.data)
    return { success: false, error: ERR.COMUN.DOCUMENTO_NO_ENCONTRADO }

  const paseo = paseoRes.data as Paseo
  const maquina = crearMaquinaPaseo(paseo)
  if (!maquina.puede('FINALIZAR_PASEO'))
    return { success: false, error: 'TRANSICION_INVALIDA' }

  const { serverTimestamp } = await import('firebase/firestore')
  const res = await ServicioPaseo.commitEstadoTransaccional(
    paseoId,
    ESTADOS_PASEO.EN_PROGRESO,
    ESTADOS_PASEO.FINALIZADO,
    { fecha_fin_real: serverTimestamp() }
  )
  if (res.success) {
    try {
      paseoActivo.finalizarPaseo(new Date())
    } catch (e) {
      console.warn('Error actualizando paseoActivo:', e)
    }
    await ServicioPaseo.registrarEvento(paseoId, 'FINALIZAR_PASEO', {
      estado_anterior: 'EN_PROGRESO',
      estado_nuevo: 'FINALIZADO',
    })
  }
  return res
}

export async function agregarMascota(paseoId: string, mascotaId: string) {
  const current = ServicioAuth.obtenerUsuarioActual()
  const uid = current?.uid
  if (!uid) return { success: false, error: ERR.COMUN.NO_AUTENTICADO }

  if (!mascotaId)
    return { success: false, error: ERR.MASCOTAS.MASCOTA_REQUERIDA }

  const paseoRes = await ServicioPaseo.obtenerPorId(paseoId)
  if (!paseoRes.success || !paseoRes.data)
    return { success: false, error: ERR.PASEOS.PASEO_NO_ENCONTRADO }

  const paseo = paseoRes.data as Paseo

  // Validaciones de negocio en logic
  if (paseo.modalidad !== 'compartido')
    return { success: false, error: ERR.PASEOS.PASEO_NO_ES_COMPARTIDO }
  if (!(
    paseo.estado === ESTADOS_PASEO.PENDIENTE ||
    paseo.estado === ESTADOS_PASEO.CONFIRMADO
  ))
    return {
      success: false,
      error: ERR.PASEOS.ESTADO_DEL_PASEO_NO_ACEPTA_MASCOTAS,
    }

  const maxGlobal = MAX_MASCOTAS_POR_PASEO
  const maxPaseo =
    typeof paseo.cupo_maximo_mascotas === 'number'
      ? paseo.cupo_maximo_mascotas
      : maxGlobal
  const max = Math.min(maxGlobal, maxPaseo)
  const count =
    typeof paseo.mascotas_count === 'number' ? paseo.mascotas_count : 0
  if (count >= max)
    return { success: false, error: ERR.PASEOS.LIMITE_DE_MASCOTAS_SUPERADO }

  // Verificar mascota y propietario
  const m = await ServicioCrudBase.obtenerPorId<Mascota>('mascotas', mascotaId)
  if (!m.success || !m.data)
    return { success: false, error: ERR.MASCOTAS.MASCOTA_NO_ENCONTRADA }
  if ((m.data as any).creado_por !== uid)
    return {
      success: false,
      error: ERR.MASCOTAS.MASCOTA_NO_PERTENECE_AL_USUARIO,
    }

  // Preparar data denormalizada
  const dataMascota = prepararDataPaseoMascota(paseoId, m.data, undefined)

  // Si este tutor (uid) no tiene código en este paseo, generar uno
  const codigosTutoresActuales = paseo.codigos_recogida_por_tutor || {}
  const actualizacionesCodigos: any = {}
  const actualizacionesValidacion: any = {}
  const actualizacionesIntentos: any = {}

  if (!codigosTutoresActuales[uid]) {
    const nuevosCodigos = generarCodigosRecogidaPorTutor([uid])
    actualizacionesCodigos['codigos_recogida_por_tutor'] = {
      ...codigosTutoresActuales,
      ...nuevosCodigos,
    }
    actualizacionesValidacion['codigo_recogida_validado_por_tutor'] = {
      ...(paseo.codigo_recogida_validado_por_tutor || {}),
      [uid]: false,
    }
    actualizacionesIntentos['intentos_fallidos_recogida_por_tutor'] = {
      ...(paseo.intentos_fallidos_recogida_por_tutor || {}),
      [uid]: 0,
    }
  }

  // Llamar al servicio para la actualización atómica y transaccional
  const res = await ServicioPaseoMascota.commitMascotaTransaccional(
    paseoId,
    mascotaId,
    dataMascota,
    {
      ...actualizacionesCodigos,
      ...actualizacionesValidacion,
      ...actualizacionesIntentos,
    }
  )
  if (res.success) {
    await ServicioPaseo.registrarEvento(paseoId, 'AGREGAR_MASCOTA', {
      id_mascota: mascotaId,
      tutor_uid: uid,
      nuevo_codigo_generado: !codigosTutoresActuales[uid],
    })
  }
  return res
}

// ---------- Consultas de dominio ----------

export async function obtenerEstadisticasCuidador(cuidadorId: string) {
  // 1. Solicitudes pendientes globales (sin cuidador)
  const solicitudesRes = await ServicioPaseo.buscarPaseos([
    { campo: 'estado', op: '==', valor: ESTADOS_PASEO.PENDIENTE },
  ])

  // 2. Paseos vinculados al cuidador
  const misPaseosRes = await ServicioPaseo.buscarPaseos([
    { campo: 'id_cuidador', op: '==', valor: cuidadorId },
    {
      campo: 'estado',
      op: 'in',
      valor: [
        ESTADOS_PASEO.CONFIRMADO,
        ESTADOS_PASEO.EN_CAMINO,
        ESTADOS_PASEO.EN_PROGRESO,
        ESTADOS_PASEO.FINALIZADO,
        ESTADOS_PASEO.COMPLETADO,
      ],
    },
  ])

  if (!solicitudesRes.success || !misPaseosRes.success) {
    return {
      success: false,
      error: solicitudesRes.error || misPaseosRes.error,
    }
  }

  const solicitudes = (solicitudesRes.data || []).filter(p => !p.id_cuidador)
  const misPaseos = misPaseosRes.data || []

  const activos = misPaseos.filter(p =>
    [
      ESTADOS_PASEO.CONFIRMADO,
      ESTADOS_PASEO.EN_CAMINO,
      ESTADOS_PASEO.EN_PROGRESO,
    ].includes(p.estado)
  )

  const completados = misPaseos.filter(p =>
    [ESTADOS_PASEO.FINALIZADO, ESTADOS_PASEO.COMPLETADO].includes(p.estado)
  )

  return {
    success: true,
    data: {
      solicitudesPendientes: solicitudes.length,
      paseosActivos: activos.length,
      paseosCompletados: completados.length,
      valoracionPromedio: 0, // TODO: Integrar con logic/valoraciones
    },
  }
}

export async function completarPaseo(paseoId: string) {
  const res = await ServicioPaseo.actualizar(paseoId, {
    estado: ESTADOS_PASEO.COMPLETADO,
  })

  if (res.success) {
    await ServicioPaseo.registrarEvento(paseoId, 'COMPLETAR', {
      estado_anterior: ESTADOS_PASEO.FINALIZADO,
      estado_nuevo: ESTADOS_PASEO.COMPLETADO,
    })
  }

  return res
}

/**
 * Rechaza una solicitud de paseo (solo para solicitudes directas).
 */
export async function rechazarPaseo(
  paseoId: string,
  motivo: string = 'RECHAZADO_POR_CUIDADOR'
) {
  return ServicioPaseo.registrarEvento(paseoId, 'RECHAZAR', {
    motivo,
  })
}

/**
 * FASE 4: Valida el código de recogida (6 dígitos) proporcionado por el cuidador.
 *
 * Operación que:
 * 1. Valida formato del código
 * 2. Ejecuta validación transaccional en Firestore a nivel de PASEO/TUTOR (no mascota individual)
 * 3. Registra evento de validación (exitosa o fallida)
 * 4. Retorna resultado para UI (validado, intentos restantes, etc.)
 *
 * @param paseoId ID del paseo
 * @param tutorId ID del tutor dueño de las mascotas (recogida de sus mascotas)
 * @param codigoIngresado Código de 6 dígitos proporcionado por el cuidador
 * @returns { success, validado, intentosFallidos } o { success: false, error }
 */
export async function validarCodigoRecogida(
  paseoId: string,
  tutorId: string,
  codigoIngresado: string
) {
  const current = ServicioAuth.obtenerUsuarioActual()
  const uid = current?.uid
  if (!uid) return { success: false, error: ERR.COMUN.NO_AUTENTICADO }

  // Delegar a ServicioPaseo la lógica transaccional de validación de códigos
  const res = await ServicioPaseo.validarCodigoRecogidaPorTutor(
    paseoId,
    tutorId,
    codigoIngresado
  )

  if (!res.success) {
    // Registrar evento de fallo
    const errorMsg = 'error' in res ? res.error : 'Error desconocido'
    const esBloqueo = errorMsg === ERR.PASEOS.CODIGO_RECOGIDA_BLOQUEADO
    const esFormatoInvalido =
      errorMsg === ERR.PASEOS.CODIGO_RECOGIDA_FORMATO_INVALIDO

    await ServicioPaseo.registrarEvento(
      paseoId,
      'VALIDAR_CODIGO_RECOGIDA_FALLO',
      {
        tutor_id: tutorId,
        error: errorMsg,
        bloqueado: esBloqueo,
        formato_invalido: esFormatoInvalido,
      }
    ).catch(e =>
      console.warn('Error registrando evento VALIDAR_CODIGO_RECOGIDA_FALLO:', e)
    )

    return res
  }

  // Éxito: registrar evento positivo
  await ServicioPaseo.registrarEvento(paseoId, 'VALIDAR_CODIGO_RECOGIDA', {
    tutor_id: tutorId,
    validado: res.validado,
    timestamp: new Date(),
  }).catch(e =>
    console.warn('Error registrando evento VALIDAR_CODIGO_RECOGIDA:', e)
  )

  return res
}
