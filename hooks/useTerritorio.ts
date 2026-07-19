import { useEffect, useState, useRef } from 'react'
import { doc, onSnapshot, type Unsubscribe } from 'firebase/firestore'
import { db } from '@/firebase.config'
import { toDomain, mapFirebaseError } from '@/services/firebase/comun'
import { ERR } from '@/constants'

/**
 * Territorio: Inteligencia agregada por zona H3 R9
 * Contiene: eventos agregados, identidad de ubicación, índices de inteligencia
 */
export interface Territorio {
  id: string
  h3_r9: string
  h3_r8: string
  total_eventos: number
  eventos_por_tipo: Record<string, number>

  // Fase 2: Identidad de ubicación
  identidad?: {
    tipo?: 'parque' | 'calle' | 'comercio' | 'conjunto' | 'otro' | 'mixto'
    confianza: number // 0-100
    fuente?: 'exploracion' | 'patron'
  }

  // Fase 2: Índices de inteligencia
  indices?: {
    bienestar: number // 0-100
    seguridad: number // 0-100
    actividad: number // 0-100
    socializacion: number // 0-100
  }

  // Sistema
  ultima_actualizacion_en: number
  creado_en?: Date
  actualizado_en?: Date
  creado_por?: string
  actualizado_por?: string
}

/**
 * Hook para leer territorio con inteligencia en realtime
 * @param h3_r9 - Identificador de celda H3 R9
 * @returns { territorio, loading, error }
 *
 * Ejemplo:
 * ```tsx
 * const { territorio, loading } = useTerritorio(h3_r9)
 * if (loading) return <Spinner />
 *
 * return (
 *   <View>
 *     <Text>Bienestar: {territorio?.indices?.bienestar}</Text>
 *     <Text>Tipo: {territorio?.identidad?.tipo}</Text>
 *   </View>
 * )
 * ```
 */
export function useTerritorio(h3_r9?: string) {
  const [territorio, setTerritorio] = useState<Territorio | undefined>(
    undefined
  )
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | undefined>(undefined)

  const unsubRef = useRef<Unsubscribe | null>(null)

  useEffect(() => {
    if (!h3_r9) {
      setTerritorio(undefined)
      setLoading(false)
      return
    }

    setLoading(true)
    setError(undefined)

    try {
      const territorioRef = doc(db, 'h3_zonas', h3_r9)
      unsubRef.current = onSnapshot(
        territorioRef,
        snap => {
          if (snap.exists()) {
            const data = snap.data()
            const domainData = toDomain(data) as Territorio | undefined | null
            setTerritorio({
              id: snap.id,
              ...(domainData ?? (data as any)),
            } as Territorio)
            setLoading(false)
          } else {
            setTerritorio(undefined)
            setError(ERR.COMUN.DOCUMENTO_NO_ENCONTRADO)
            setLoading(false)
          }
        },
        err => {
          setError(mapFirebaseError(err))
          setLoading(false)
        }
      )
    } catch (err: any) {
      setError(mapFirebaseError(err))
      setLoading(false)
    }

    return () => {
      if (unsubRef.current) {
        unsubRef.current()
        unsubRef.current = null
      }
    }
  }, [h3_r9])

  return { territorio, loading, error }
}
