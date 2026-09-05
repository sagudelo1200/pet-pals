import { useCallback, useEffect, useState } from 'react'
import { Alert } from 'react-native'
import { httpsCallable } from 'firebase/functions'
import { functions } from '@/firebase.config'
import { ServicioPerfilPublico } from '@/services/firebase'
import { useTranslation } from 'react-i18next'

export interface ReputacionCuidador {
  promedio: number
  cantidad: number
}

/**
 * Lógica compartida del TUTOR al calificar a su cuidador (modal global y
 * repesca del historial):
 * - Carga la reputación actual del cuidador (prueba social).
 * - Envía la evaluación SOLO cuando el UI lo confirma (nunca al tocar).
 * - Calcula el impacto local (nuevo promedio) tras enviar, sin esperar
 *   al trigger.
 * - `already-exists` se trata como éxito silencioso.
 */
export function useEnviarEvaluacionCuidador(
  cuidadorId: string | undefined,
  paseoId: string | undefined
) {
  const { t } = useTranslation()
  const [ratingPrevio, setRatingPrevio] = useState<ReputacionCuidador | null>(
    null
  )
  const [enviando, setEnviando] = useState(false)
  const [enviado, setEnviado] = useState(false)
  const [nuevoPromedio, setNuevoPromedio] = useState<number | null>(null)

  // Cargar reputación del cuidador (prueba social) al cambiar el objetivo
  useEffect(() => {
    if (!cuidadorId) return undefined
    let activo = true
    setRatingPrevio(null)
    setEnviado(false)
    setNuevoPromedio(null)

    ServicioPerfilPublico.obtenerPorId(cuidadorId)
      .then(res => {
        if (!activo || !res.success || !res.data) return
        const perfil = res.data as any
        setRatingPrevio({
          promedio:
            typeof perfil.rating_promedio === 'number'
              ? perfil.rating_promedio
              : 0,
          cantidad:
            typeof perfil.cantidad_paseos_realizados === 'number'
              ? perfil.cantidad_paseos_realizados
              : 0,
        })
      })
      .catch(() => {
        // Sin reputación disponible: se omite la prueba social
      })

    return () => {
      activo = false
    }
  }, [cuidadorId])

  const enviar = useCallback(
    async (
      rating: number,
      comentario?: string,
      comentarioPrivado?: string
    ) => {
      if (!paseoId || !cuidadorId || enviando || enviado) return
      setEnviando(true)
      try {
        const crearEvaluacion = httpsCallable(functions, 'crearEvaluacion')
        const resultado = (await crearEvaluacion({
          tipo: 'evaluacion_cuidador',
          objetivo: cuidadorId,
          contextoId: paseoId,
          rating,
          comentario: comentario ?? '',
          comentario_privado: comentarioPrivado,
        })) as { data: { success: boolean } }

        if (resultado.data.success) {
          // Impacto inmediato: nuevo promedio calculado localmente
          const prev = ratingPrevio
          const nuevo =
            prev && prev.cantidad > 0
              ? Math.round(
                  ((prev.promedio * prev.cantidad + rating) /
                    (prev.cantidad + 1)) *
                    100
                ) / 100
              : rating
          setNuevoPromedio(nuevo)
          setEnviado(true)
        }
      } catch (error) {
        const code = (error as { code?: string })?.code
        if (code === 'already-exists') {
          // Ya se evaluó antes: se trata como éxito silencioso
          setNuevoPromedio(ratingPrevio?.promedio ?? null)
          setEnviado(true)
        } else {
          console.error('Error creando evaluación:', error)
          Alert.alert(
            t('evaluaciones:error_creando', 'No se pudo enviar la calificación')
          )
        }
      } finally {
        setEnviando(false)
      }
    },
    [paseoId, cuidadorId, enviando, enviado, ratingPrevio, t]
  )

  return { ratingPrevio, enviando, enviado, nuevoPromedio, enviar }
}
