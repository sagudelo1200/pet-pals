import { ServicioCrudBase } from './crud'
import { Paseo, PaseoStatus } from '../../models/Paseo'
import { CrudResult } from './types'
import { ServicioAuth } from './auth'
import type { Mascota } from '@/models/Mascota'
import { addMascotasAlPaseo } from './paseo-mascota'
import { MAX_MASCOTAS_POR_PASEO, ERR } from '@/constants'
import { mapFirebaseError } from './errors'
import {
  collection,
  query,
  where,
  orderBy,
  type Query,
  runTransaction,
  doc,
  serverTimestamp,
} from 'firebase/firestore'
import { db } from '@/firebase.config'

export class ServicioPaseo {
  private static readonly COLLECTION = 'paseos'

  /**
   * Obtiene la query para escuchar solicitudes pendientes en tiempo real.
   * Filtra por estado PENDIENTE y ordena por fecha de creación descendente.
   */
  static getQuerySolicitudesPendientes(): Query {
    const { limit } = require('firebase/firestore')
    return query(
      collection(db, this.COLLECTION),
      where('estado', '==', PaseoStatus.PENDIENTE),
      orderBy('creado_en', 'desc'),
      limit(30) // Límite duro para controlar costos de lectura
    )
  }

  static async crear(
    data: Omit<
      Paseo,
      'id' | 'creado_en' | 'actualizado_en' | 'creado_por' | 'actualizado_por'
    >
  ): Promise<CrudResult<Paseo>> {
    const currentUser = ServicioAuth.obtenerUsuarioActual()
    const uid = currentUser?.uid
    if (!uid) return { success: false, error: ERR.COMUN.NO_AUTENTICADO }

    // Enforce que el creador del paseo sea el usuario actual
    const payload: typeof data & { creado_por: string } = {
      ...data,
      creado_por: uid,
    }

    return ServicioCrudBase.crear<Paseo>(this.COLLECTION, payload as any)
  }

  /**
   * Permite a un cuidador aceptar una solicitud de paseo pendiente.
   * Utiliza una transacción para asegurar atomicidad y evitar condiciones de carrera.
   */
  static async aceptarSolicitud(paseoId: string): Promise<CrudResult<void>> {
    const currentUser = ServicioAuth.obtenerUsuarioActual()
    if (!currentUser) return { success: false, error: ERR.COMUN.NO_AUTENTICADO }

    try {
      await runTransaction(db, async transaction => {
        const paseoRef = doc(db, this.COLLECTION, paseoId)
        const paseoDoc = await transaction.get(paseoRef)

        if (!paseoDoc.exists()) {
          throw new Error(ERR.COMUN.DOCUMENTO_NO_ENCONTRADO)
        }

        const data = paseoDoc.data() as Paseo

        // Validaciones de negocio estrictas
        if (data.estado !== PaseoStatus.PENDIENTE) {
          throw new Error('El paseo ya no está disponible (estado incorrecto)')
        }
        // Permitir si no tiene cuidador (mercado abierto) O si el cuidador asignado soy yo (solicitud directa)
        if (data.id_cuidador && data.id_cuidador !== currentUser.uid) {
          throw new Error('El paseo ya fue tomado por otro cuidador')
        }
        if (data.creado_por === currentUser.uid) {
          throw new Error('No puedes aceptar tu propio paseo')
        }

        // Actualizar documento
        transaction.update(paseoRef, {
          id_cuidador: currentUser.uid,
          estado: PaseoStatus.ACEPTADO,
          actualizado_en: serverTimestamp(),
          actualizado_por: currentUser.uid,
        })
      })

      return { success: true }
    } catch (error) {
      return { success: false, error: mapFirebaseError(error) }
    }
  }

  /**
   * Crear paseo con 0..N mascotas (N <= MAX_MASCOTAS_POR_PASEO)
   * Si N=0, paseo propuesto por cuidador; si N>0, se crean subdocs en 'mascotas'.
   */
  static async crearConMascotas(
    data: Omit<
      Paseo,
      | 'id'
      | 'creado_en'
      | 'actualizado_en'
      | 'creado_por'
      | 'actualizado_por'
      | 'mascotas_count'
    >,
    mascotaIds: string[]
  ): Promise<CrudResult<Paseo>> {
    const current = ServicioAuth.obtenerUsuarioActual()
    const uid = current?.uid
    if (!uid) return { success: false, error: ERR.COMUN.NO_AUTENTICADO }

    // Validaciones básicas de mascotaIds
    const unique = Array.from(new Set((mascotaIds || []).filter(Boolean)))
    // Cupo: mínimo entre el máximo permitido y el solicitado en 'data' (si existe)
    const maxPaseo =
      typeof (data as any).cupo_maximo_mascotas === 'number'
        ? (data as any).cupo_maximo_mascotas
        : MAX_MASCOTAS_POR_PASEO
    const max = Math.min(MAX_MASCOTAS_POR_PASEO, maxPaseo)
    // Validación de cupo: si se excede el límite, devolver error
    if (unique.length > max)
      return { success: false, error: ERR.PASEOS.LIMITE_DE_MASCOTAS_SUPERADO }

    // Validar que todas las mascotas pertenecen al usuario actual (si hay)
    // Optimización: Consultar todas las mascotas en paralelo una sola vez
    const mascotasData: any[] = []
    if (unique.length > 0) {
      const resultados = await Promise.all(
        unique.map(mid =>
          ServicioCrudBase.obtenerPorId<Mascota>('mascotas', mid)
        )
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

    // Preparar datos visuales
    let visualData: any = {}
    if (mascotasData.length > 0) {
      // Obtener datos de mascotas (limitado a 4 para visualización)
      const fotos: string[] = []
      let primerNombre = ''

      const limit = Math.min(mascotasData.length, 4)
      for (let i = 0; i < limit; i++) {
        const d = mascotasData[i]
        if (i === 0) primerNombre = d.nombre
        if (d.foto_url || d.foto) fotos.push(d.foto_url || d.foto)
      }

      visualData = {
        mascota_nombre_visual: primerNombre,
        mascota_foto_visual: fotos[0], // Mantener compatibilidad
        mascotas_fotos_visual: fotos,
      }
    }

    // Crear paseo
    const paseoRes = await ServicioCrudBase.crear<Paseo>(this.COLLECTION, {
      ...(data as any),
      creado_por: uid,
      cupo_maximo_mascotas: max,
      mascotas_count: unique.length,
      mascota_ids: unique, // Campo optimizado para búsquedas
      ...visualData,
    } as any)

    if (!paseoRes.success || !paseoRes.data) return paseoRes

    // Crear subdocumentos por mascota (si aplica)
    if (unique.length > 0) {
      const addRes = await addMascotasAlPaseo(paseoRes.data.id, unique)
      if (!addRes.success)
        return { success: false, error: (addRes as any).error }
    }

    return paseoRes
  }

  static async obtenerPorId(id: string): Promise<CrudResult<Paseo>> {
    return ServicioCrudBase.obtenerPorId<Paseo>(this.COLLECTION, id)
  }

  static async actualizar(
    id: string,
    data: Partial<Omit<Paseo, 'id' | 'creado_en' | 'creado_por'>>
  ): Promise<CrudResult<Paseo>> {
    return ServicioCrudBase.actualizar<Paseo>(this.COLLECTION, id, data)
  }
  static async eliminar(id: string): Promise<CrudResult<boolean>> {
    return ServicioCrudBase.eliminar(this.COLLECTION, id)
  }

  static async obtenerTodos(): Promise<CrudResult<Paseo[]>> {
    return ServicioCrudBase.obtenerTodos<Paseo>(this.COLLECTION)
  }

  /**
   * Registra un evento asociado a un paseo en el documento (historial_eventos).
   * Usa `arrayUnion` para añadir entradas atómicas.
   */
  static async registrarEvento(
    paseoId: string,
    evento: string,
    payload?: Record<string, any>
  ): Promise<CrudResult<void>> {
    const currentUser = ServicioAuth.obtenerUsuarioActual()
    try {
      const entry = {
        evento,
        payload: payload || {},
        actor: currentUser?.uid || null,
        creado_en: serverTimestamp(),
      }

      // Persistir evento en subcolección 'eventos' para trazabilidad y reglas más claras
      const { collection, addDoc } = await import('firebase/firestore')
      const eventosCol = collection(db, this.COLLECTION, paseoId, 'eventos')
      await addDoc(eventosCol, {
        ...entry,
        creado_por: currentUser?.uid || null,
      })

      return { success: true }
    } catch (error) {
      return { success: false, error: mapFirebaseError(error) }
    }
  }

  // Métodos específicos
  static async obtenerPorCuidador(
    cuidadorId: string
  ): Promise<CrudResult<Paseo[]>> {
    return ServicioCrudBase.buscar<Paseo>(
      this.COLLECTION,
      'id_cuidador',
      cuidadorId
    )
  }

  static async obtenerPorMascota(
    mascotaId: string
  ): Promise<CrudResult<Paseo[]>> {
    // Optimización: Usar array-contains sobre el campo mascota_ids
    try {
      const { db } = await import('@/firebase.config')
      const { collection, query, where, getDocs, orderBy } = await import(
        'firebase/firestore'
      )

      const q = query(
        collection(db, this.COLLECTION),
        where('mascota_ids', 'array-contains', mascotaId),
        orderBy('fecha_hora_inicio', 'desc')
      )

      const snap = await getDocs(q)
      const results: Paseo[] = []
      snap.forEach(d => {
        results.push({ id: d.id, ...d.data() } as Paseo)
      })

      return { success: true, data: results }
    } catch (e: any) {
      return { success: false, error: mapFirebaseError(e) }
    }
  }

  static async obtenerPorEstado(estado: string): Promise<CrudResult<Paseo[]>> {
    return ServicioCrudBase.buscar<Paseo>(this.COLLECTION, 'estado', estado)
  }

  /**
   * Actualiza el estado del paseo de forma atómica.
   * Útil para transiciones de la máquina de estados.
   */
  static async actualizarEstado(
    id: string,
    nuevoEstado: string,
    meta: Record<string, any> = {}
  ): Promise<CrudResult<Paseo>> {
    const data: any = {
      estado: nuevoEstado,
      ...meta,
    }
    return this.actualizar(id, data)
  }

  /**
   * Obtener paseos del cuidador filtrados por estados.
   */
  static async obtenerPorCuidadorYEstado(
    cuidadorId: string,
    estados: string[]
  ): Promise<CrudResult<Paseo[]>> {
    try {
      const { db } = await import('@/firebase.config')
      const { collection, query, where, getDocs } = await import(
        'firebase/firestore'
      )

      const q = query(
        collection(db, this.COLLECTION),
        where('id_cuidador', '==', cuidadorId),
        where('estado', 'in', estados)
      )

      const snapshot = await getDocs(q)
      const paseos: Paseo[] = []
      snapshot.forEach(doc => {
        paseos.push({ id: doc.id, ...doc.data() } as Paseo)
      })

      return { success: true, data: paseos }
    } catch (e: any) {
      return { success: false, error: mapFirebaseError(e) }
    }
  }

  /**
   * Asignar cuidador a un paseo.
   */
  static async asignarCuidador(
    paseoId: string,
    cuidadorId: string
  ): Promise<CrudResult<Paseo>> {
    return this.actualizar(paseoId, {
      id_cuidador: cuidadorId,
    })
  }
}
