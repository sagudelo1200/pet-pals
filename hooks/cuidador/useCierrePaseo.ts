import { useCallback, useMemo, useState } from 'react'
import { httpsCallable } from 'firebase/functions'
import { functions } from '@/firebase.config'
import { useDoc } from '@/hooks/useDoc'
import { useCollection } from '@/hooks/useCollection'
import {
  planDeCierre,
  yaRegistrado,
  type SeleccionMascota,
} from '@/logic/evaluaciones/cierrePaseo'
import type { EjeComportamiento } from '@/logic/mascotas/comportamiento'

/** Resultado de intentar cerrar: lo que falta o salió mal, o éxito. */
export interface ResultadoCierre {
  ok: boolean
  /** Por qué no se pudo cerrar (solo si `ok` es falso). */
  motivo?: 'incompleta' | 'error'
  /** Mascota con la observación a medias (motivo `incompleta`). */
  mascota?: string
}

/**
 * Cierre del paseo del cuidador: observación de cada mascota y calificación
 * del tutor en una sola pantalla. Todo es opcional; solo se envía lo marcado.
 * @param paseoId Paseo que se cierra.
 */
export function useCierrePaseo(paseoId: string) {
  const { data: paseo, cargando: cargandoPaseo } = useDoc<any>(
    'operaciones',
    paseoId
  )
  const { data: mascotasPaseo, cargando: cargandoMascotas } = useCollection(
    `operaciones/${paseoId}/mascotas`
  )
  const tutorId: string | undefined = paseo?.creado_por
  const { data: tutor } = useDoc<any>('perfiles_publicos', tutorId, {
    enabled: !!tutorId,
  })

  const [observaciones, setObservaciones] = useState<
    Record<string, SeleccionMascota | undefined>
  >({})
  const [ratingTutor, setRatingTutor] = useState(0)
  const [notaTutor, setNotaTutor] = useState('')
  const [enviando, setEnviando] = useState(false)

  const mascotas = useMemo(
    () => (mascotasPaseo ?? []) as Array<{ id: string; nombre: string }>,
    [mascotasPaseo]
  )

  const marcar = useCallback(
    (mascotaId: string, eje: EjeComportamiento, valor: string) =>
      setObservaciones(prev => ({
        ...prev,
        [mascotaId]: { ...prev[mascotaId], [eje]: valor },
      })),
    []
  )

  const llamar = async (datos: Record<string, unknown>): Promise<void> => {
    try {
      await httpsCallable(functions, 'crearEvaluacion')({
        contextoId: paseoId,
        ...datos,
      })
    } catch (error) {
      // Reintentar un cierre a medias no debe fallar por lo ya guardado
      if (!yaRegistrado(error)) throw error
    }
  }

  /** Envía lo marcado; sin nada marcado solo termina. */
  const terminar = useCallback(async (): Promise<ResultadoCierre> => {
    const plan = planDeCierre(
      { observaciones, ratingTutor },
      mascotas.map(m => m.id)
    )
    if (plan.incompletas.length > 0) {
      const mascota = mascotas.find(m => m.id === plan.incompletas[0])
      return { ok: false, motivo: 'incompleta', mascota: mascota?.nombre ?? '' }
    }
    if (plan.observar.length === 0 && !plan.evaluarTutor) return { ok: true }

    setEnviando(true)
    try {
      await Promise.all([
        ...plan.observar.map(id => {
          const s = observaciones[id]!
          return llamar({
            tipo: 'evaluacion_mascota',
            objetivo: id,
            ritmo: s.ritmo,
            compania: s.compania,
            tolerancia: s.tolerancia,
            comentario: '',
          })
        }),
        ...(plan.evaluarTutor && tutorId
          ? [
              llamar({
                tipo: 'evaluacion_tutor',
                objetivo: tutorId,
                rating: ratingTutor,
                comentario: '',
                comentario_privado: notaTutor.trim() || undefined,
              }),
            ]
          : []),
      ])
      return { ok: true }
    } catch (error) {
      console.error('[useCierrePaseo] No se pudo guardar el cierre:', error)
      return { ok: false, motivo: 'error' }
    } finally {
      setEnviando(false)
    }
  }, [observaciones, ratingTutor, notaTutor, mascotas, tutorId, paseoId])

  return {
    cargando: cargandoPaseo || cargandoMascotas,
    mascotas,
    nombreTutor: (tutor?.nombre as string | undefined) ?? '',
    observaciones,
    marcar,
    ratingTutor,
    setRatingTutor,
    notaTutor,
    setNotaTutor,
    enviando,
    terminar,
  }
}
