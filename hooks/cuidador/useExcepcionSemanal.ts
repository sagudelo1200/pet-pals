import { useState, useEffect, useCallback } from 'react'
import { ServicioExcepcionesDisponibilidad } from '@/services/firebase/firestore/colecciones/excepciones_disponibilidad'
import type {
  ExcepcionDisponibilidad,
  OverrideDia,
} from '@/models/ExcepcionDisponibilidad'

/**
 * Gestiona la excepción semanal de disponibilidad de un cuidador.
 *
 * @param uid  - UID del cuidador
 * @param semana - Semana ISO (ej: "2026-W21")
 */
export const useExcepcionSemanal = (uid: string | null, semana: string) => {
  const [excepcion, setExcepcion] = useState<ExcepcionDisponibilidad | null>(
    null
  )
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const cargar = useCallback(async () => {
    if (!uid || !semana) return
    setCargando(true)
    setError(null)
    try {
      const data = await ServicioExcepcionesDisponibilidad.obtener(uid, semana)
      setExcepcion(data)
    } catch {
      setError('Error al cargar la excepción')
    } finally {
      setCargando(false)
    }
  }, [uid, semana])

  useEffect(() => {
    cargar()
  }, [cargar])

  const guardar = async (overrides: Record<string, OverrideDia>) => {
    if (!uid) return
    setCargando(true)
    setError(null)
    try {
      await ServicioExcepcionesDisponibilidad.guardar(uid, semana, overrides)
      setExcepcion({ uid_cuidador: uid, semana, overrides })
    } catch {
      setError('Error al guardar la excepción')
    } finally {
      setCargando(false)
    }
  }

  const eliminar = async () => {
    if (!uid) return
    setCargando(true)
    setError(null)
    try {
      await ServicioExcepcionesDisponibilidad.eliminar(uid, semana)
      setExcepcion(null)
    } catch {
      setError('Error al eliminar la excepción')
    } finally {
      setCargando(false)
    }
  }

  return { excepcion, guardar, eliminar, cargando, error, recargar: cargar }
}
