import { useEffect, useState } from 'react'
import { doc, onSnapshot, collection, getDocs } from 'firebase/firestore'
import { db } from '@/firebase.config'
import type { Paseo } from '@/models/Paseo'

interface MascotaPorTutor {
  tutorId: string
  tutorNombre: string
  mascotas: { id: string; nombre: string; foto?: string | null }[]
}

interface useCodigosRecogidaPorTutorReturn {
  mascotasPorTutor: MascotaPorTutor[]
  codigosPorTutor: Record<string, string>
  validadosPorTutor: Record<string, boolean>
  intentosFallidosPorTutor: Record<string, number>
  loading: boolean
  error: string | null
}

/**
 * Hook para obtener códigos de recogida POR TUTOR en tiempo real
 * Escucha cambios del documento Paseo y actualiza automáticamente
 * Retorna:
 * - Mascotas agrupadas por tutor
 * - Códigos por tutor
 * - Estados de validación y intentos fallidos por tutor (actualizado en tiempo real)
 *
 * Casos de uso:
 * - Cuidador ve cómo otros tutores validan en tiempo real
 * - Tutor ve confirmación inmediata de su código
 *
 * @param paseoId ID del paseo
 * @returns Objeto con mascotasPorTutor, codigosPorTutor, validadosPorTutor, intentosFallidosPorTutor
 */
export function useCodigosRecogidaPorTutor(
  paseoId: string | null
): useCodigosRecogidaPorTutorReturn {
  const [mascotasPorTutor, setMascotasPorTutor] = useState<MascotaPorTutor[]>(
    []
  )
  const [codigosPorTutor, setCodigosPorTutor] = useState<
    Record<string, string>
  >({})
  const [validadosPorTutor, setValidadosPorTutor] = useState<
    Record<string, boolean>
  >({})
  const [intentosFallidosPorTutor, setIntentosFallidosPorTutor] = useState<
    Record<string, number>
  >({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!paseoId) {
      setMascotasPorTutor([])
      setCodigosPorTutor({})
      setValidadosPorTutor({})
      setIntentosFallidosPorTutor({})
      return undefined
    }

    let isMounted = true
    setLoading(true)
    setError(null)

    // Suscribirse a cambios en tiempo real del documento Paseo
    const paseoRef = doc(db, 'paseos', paseoId)
    const unsubscribePaseo = onSnapshot(
      paseoRef,
      snapshot => {
        if (!snapshot.exists()) {
          if (isMounted) {
            setError('Paseo no encontrado')
            setLoading(false)
          }
        } else {
          const paseo = snapshot.data() as Paseo

          // Extraer códigos del paseo
          const codigos = paseo.codigos_recogida_por_tutor || {}
          const validados = paseo.codigo_recogida_validado_por_tutor || {}
          const intentos = paseo.intentos_fallidos_recogida_por_tutor || {}

          if (isMounted) {
            setCodigosPorTutor(codigos)
            setValidadosPorTutor(validados)
            setIntentosFallidosPorTutor(intentos)
          }

          // Agrupar mascotas por tutor desde la subcolección (async sin await aquí)
          const mascotasRef = collection(db, 'paseos', paseoId, 'mascotas')
          getDocs(mascotasRef)
            .then(mascotasSnap => {
              const mascotasPorTutorMap: Record<string, MascotaPorTutor> = {}

              // Inicializar un entry por cada tutor que tiene código
              Object.keys(codigos).forEach(tutorId => {
                if (!mascotasPorTutorMap[tutorId]) {
                  mascotasPorTutorMap[tutorId] = {
                    tutorId,
                    tutorNombre: tutorId,
                    mascotas: [],
                  }
                }
              })

              // Llenar mascotas
              mascotasSnap.forEach(mascotaDoc => {
                const mascotaData = mascotaDoc.data()
                const tutorId = mascotaData.id_usuario || mascotaData.creado_por

                if (!mascotasPorTutorMap[tutorId]) {
                  mascotasPorTutorMap[tutorId] = {
                    tutorId,
                    tutorNombre: tutorId,
                    mascotas: [],
                  }
                }

                mascotasPorTutorMap[tutorId].mascotas.push({
                  id: mascotaDoc.id,
                  nombre: mascotaData.nombre || 'Mascota sin nombre',
                  // Usar solo el campo definido en el modelo `Mascota`.
                  // Evitar asumir variantes de nombres (foto_url, mascota_foto_visual, etc.).
                  foto: mascotaData.foto || null,
                })
              })

              if (isMounted) {
                setMascotasPorTutor(Object.values(mascotasPorTutorMap))
                setLoading(false)
                setError(null)
              }
            })
            .catch((err: any) => {
              if (isMounted) {
                setError(err?.message || 'Error obteniendo mascotas')
                console.error(
                  '[useCodigosRecogidaPorTutor] Error mascotas:',
                  err
                )
                setLoading(false)
              }
            })
        }
      },
      err => {
        if (isMounted) {
          setError(err?.message || 'Error escuchando cambios')
          console.error('[useCodigosRecogidaPorTutor] Error snapshot:', err)
          setLoading(false)
        }
      }
    )

    return () => {
      isMounted = false
      unsubscribePaseo()
    }
  }, [paseoId])

  return {
    mascotasPorTutor,
    codigosPorTutor,
    validadosPorTutor,
    intentosFallidosPorTutor,
    loading,
    error,
  }
}
