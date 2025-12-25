import { ServicioCrudBase } from '@/services/firebase/firestore/base'
import { Paseo, PaseoStatus } from '@/models/Paseo'
import { CrudResult, mapFirebaseError } from '@/services/firebase/comun'
import { ServicioAuth } from '@/services/firebase/auth'
import type { Mascota } from '@/models/Mascota'
import { addMascotasAlPaseo } from '@/services/firebase/firestore/colecciones/paseo-mascota'
import { MAX_MASCOTAS_POR_PASEO, ERR } from '@/constants'
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

import type { Ubicacion } from '@/models/Ubicacion'

export class ServicioPaseo {
  private static readonly COLLECTION = 'paseos'

  static getQuerySolicitudesPendientes(): Query {
    const { limit } = require('firebase/firestore')
    return query(
      collection(db, this.COLLECTION),
      where('estado', '==', PaseoStatus.PENDIENTE),
      orderBy('creado_en', 'desc'),
      limit(30)
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

    const payload: typeof data & { creado_por: string } = {
      ...data,
      creado_por: uid,
    }

    return ServicioCrudBase.crear<Paseo>(this.COLLECTION, payload as any)
  }

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

        if (data.estado !== PaseoStatus.PENDIENTE) {
          throw new Error('El paseo ya no está disponible (estado incorrecto)')
        }
        if (data.id_cuidador && data.id_cuidador !== currentUser.uid) {
          throw new Error('El paseo ya fue tomado por otro cuidador')
        }
        if (data.creado_por === currentUser.uid) {
          throw new Error('No puedes aceptar tu propio paseo')
        }

        transaction.update(paseoRef, {
          id_cuidador: currentUser.uid,
          cuidador_nombre_visual: currentUser.displayName || 'Cuidador',
          cuidador_foto_visual: currentUser.photoURL || null,
          estado: PaseoStatus.CONFIRMADO,
          actualizado_en: serverTimestamp(),
          actualizado_por: currentUser.uid,
        })
      })

      await this.registrarEvento(paseoId, 'ACEPTAR', {
        estado_anterior: 'PENDIENTE',
        estado_nuevo: 'CONFIRMADO',
        id_cuidador: ServicioAuth.obtenerUsuarioActual()?.uid,
      })

      return { success: true }
    } catch (error) {
      return { success: false, error: mapFirebaseError(error) }
    }
  }

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
    mascotaIds: string[],
    direccion?: Ubicacion
  ): Promise<CrudResult<Paseo>> {
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

    let locationData: any = {}
    const locObj = (data.ubicacion_inicio as any) || direccion

    if (locObj && typeof locObj === 'object') {
      const snap = {
        direccion_formateada: locObj.direccion_formateada || '',
        coordenadas: {
          latitude: Number(locObj.coordenadas.latitude),
          longitude: Number(locObj.coordenadas.longitude),
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
        if (d.foto_url || d.foto) fotos.push(d.foto_url || d.foto)
      }

      visualData = {
        mascota_nombre_visual: primerNombre,
        mascota_foto_visual: fotos[0],
        mascotas_fotos_visual: fotos,
      }
    }

    const paseoRes = await ServicioCrudBase.crear<Paseo>(this.COLLECTION, {
      ...(data as any),
      ...locationData,
      creado_por: uid,
      cupo_maximo_mascotas: max,
      mascotas_count: unique.length,
      mascota_ids: unique,
      ...visualData,
    } as any)

    if (!paseoRes.success || !paseoRes.data) return paseoRes

    if (unique.length > 0) {
      const addRes = await addMascotasAlPaseo(
        paseoRes.data.id,
        unique,
        direccion
      )
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
    try {
      const { db } = await import('@/firebase.config')
      const { collection, query, where, getDocs, orderBy } =
        await import('firebase/firestore')

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

  static async obtenerPorCuidadorYEstado(
    cuidadorId: string,
    estados: string[]
  ): Promise<CrudResult<Paseo[]>> {
    try {
      const { db } = await import('@/firebase.config')
      const { collection, query, where, getDocs } =
        await import('firebase/firestore')

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

  static async asignarCuidador(
    paseoId: string,
    cuidadorId: string
  ): Promise<CrudResult<Paseo>> {
    return this.actualizar(paseoId, {
      id_cuidador: cuidadorId,
    })
  }

  static async iniciarRuta(paseoId: string): Promise<CrudResult<void>> {
    const currentUser = ServicioAuth.obtenerUsuarioActual()
    if (!currentUser) return { success: false, error: ERR.COMUN.NO_AUTENTICADO }

    try {
      await runTransaction(db, async transaction => {
        const paseoRef = doc(db, this.COLLECTION, paseoId)
        const paseoDoc = await transaction.get(paseoRef)

        if (!paseoDoc.exists()) {
          throw new Error(ERR.COMUN.DOCUMENTO_NO_ENCONTRADO)
        }

        const paseo = paseoDoc.data() as Paseo

        const { crearMaquinaPaseo } =
          await import('@/services/firebase/maquina-estados-paseo')
        const maquina = crearMaquinaPaseo(paseo)

        if (!maquina.puede('INICIAR_RUTA')) {
          throw new Error('No se puede iniciar ruta desde el estado actual')
        }

        transaction.update(paseoRef, {
          estado: PaseoStatus.EN_RUTA,
          actualizado_en: serverTimestamp(),
          actualizado_por: currentUser.uid,
        })
      })

      await this.registrarEvento(paseoId, 'INICIAR_RUTA', {
        estado_anterior: 'CONFIRMADO',
        estado_nuevo: 'EN_RUTA',
      })

      return { success: true }
    } catch (error) {
      return { success: false, error: mapFirebaseError(error) }
    }
  }

  static async iniciarPaseo(paseoId: string): Promise<CrudResult<void>> {
    const currentUser = ServicioAuth.obtenerUsuarioActual()
    if (!currentUser) return { success: false, error: ERR.COMUN.NO_AUTENTICADO }

    try {
      await runTransaction(db, async transaction => {
        const paseoRef = doc(db, this.COLLECTION, paseoId)
        const paseoDoc = await transaction.get(paseoRef)

        if (!paseoDoc.exists()) {
          throw new Error(ERR.COMUN.DOCUMENTO_NO_ENCONTRADO)
        }

        const paseo = paseoDoc.data() as Paseo

        const { crearMaquinaPaseo } =
          await import('@/services/firebase/maquina-estados-paseo')
        const maquina = crearMaquinaPaseo(paseo)

        if (!maquina.puede('INICIAR_PASEO')) {
          throw new Error('No se puede iniciar paseo desde el estado actual')
        }

        transaction.update(paseoRef, {
          estado: PaseoStatus.EN_PROGRESO,
          fecha_inicio_real: serverTimestamp(),
          actualizado_en: serverTimestamp(),
          actualizado_por: currentUser.uid,
        })
      })

      await this.registrarEvento(paseoId, 'INICIAR_PASEO', {
        estado_anterior: 'EN_RUTA',
        estado_nuevo: 'EN_PROGRESO',
      })

      return { success: true }
    } catch (error) {
      return { success: false, error: mapFirebaseError(error) }
    }
  }

  static async finalizarPaseo(paseoId: string): Promise<CrudResult<void>> {
    const currentUser = ServicioAuth.obtenerUsuarioActual()
    if (!currentUser) return { success: false, error: ERR.COMUN.NO_AUTENTICADO }

    let duracionReal: number | undefined

    try {
      await runTransaction(db, async transaction => {
        const paseoRef = doc(db, this.COLLECTION, paseoId)
        const paseoDoc = await transaction.get(paseoRef)

        if (!paseoDoc.exists()) {
          throw new Error(ERR.COMUN.DOCUMENTO_NO_ENCONTRADO)
        }

        const paseo = paseoDoc.data() as Paseo

        const { crearMaquinaPaseo } =
          await import('@/services/firebase/maquina-estados-paseo')
        const maquina = crearMaquinaPaseo(paseo)

        if (!maquina.puede('FINALIZAR_PASEO')) {
          throw new Error('No se puede finalizar desde el estado actual')
        }

        transaction.update(paseoRef, {
          estado: PaseoStatus.FINALIZADO,
          fecha_fin_real: serverTimestamp(),
          actualizado_en: serverTimestamp(),
          actualizado_por: currentUser.uid,
        })
      })

      await this.registrarEvento(paseoId, 'FINALIZAR_PASEO', {
        estado_anterior: 'EN_PROGRESO',
        estado_nuevo: 'FINALIZADO',
      })

      return { success: true }
    } catch (error) {
      return { success: false, error: mapFirebaseError(error) }
    }
  }
}
