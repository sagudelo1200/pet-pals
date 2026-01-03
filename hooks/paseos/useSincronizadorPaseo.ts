import { useState, useEffect } from 'react'
import {
  doc,
  onSnapshot,
  collection,
  query,
  orderBy,
  limit,
} from 'firebase/firestore'
import { db } from '@/firebase.config'
import { Paseo } from '@/models/Paseo'
import { GestorPaseos } from '@/logic/paseos'
import { toDomain } from '@/services/firebase/comun'
import { ServicioPaseo } from '@/services/firebase'
import { useSeguimientoPaseo } from './useSeguimientoPaseo'

export interface EventoPaseo {
  id: string
  evento: string
  payload?: any
  actor: string
  creado_en: Date
}

/**
 * Hook "Sincronizador".
 * Su responsabilidad es escuchar Firebase y mantener actualizado al Singleton `GestorPaseos.paseoActivo`.
 * También devuelve los datos crudos para quien lo invoca (legacy support).
 *
 * @param paseoId ID del paseo a sincronizar
 */
export const useSincronizadorPaseo = (paseoId: string) => {
  const [paseo, setPaseo] = useState<Paseo | null>(null)
  const [loading, setLoading] = useState(true)
  const [eventos, setEventos] = useState<EventoPaseo[]>([])

  // Integración con Realtime Database para el tracking
  // Nota: Esto quizás debería moverse a otro lado si queremos desacoplar totalmente,
  // pero por ahora lo mantenemos aquí para no romper funcionalidad.
  const { ubicacionActual, ruta } = useSeguimientoPaseo(paseoId)

  useEffect(() => {
    if (!paseoId) return () => {}

    setLoading(true)

    // 1. Suscripción al documento principal del paseo
    const paseoRef = doc(db, 'paseos', paseoId)
    const unsubPaseo = onSnapshot(
      paseoRef,
      snapshot => {
        if (snapshot.exists()) {
          const data = toDomain(snapshot.data()) as Paseo
          const paseoDoc = { id: snapshot.id, ...data } as Paseo
          setPaseo(paseoDoc)

          // ALIMENTAMOS EL SINGLETON
          try {
            GestorPaseos.paseoActivo.setPaseoActivo(paseoDoc)
          } catch (e) {
            console.warn(
              'GestorPaseos.paseoActivo: error al setear paseo en singleton',
              e
            )
          }
        } else {
          setPaseo(null)
          // LIMPIAMOS EL SINGLETON
          try {
            GestorPaseos.paseoActivo.limpiarPaseoActivo()
          } catch (e) {
            console.warn(
              'GestorPaseos.paseoActivo: error al limpiar paseo singleton',
              e
            )
          }
        }
        setLoading(false)
      },
      error => {
        console.error('[Firebase] Error suscribiendo al paseo:', error)
        setLoading(false)
      }
    )

    // 2. Suscripción a eventos (Hitos)
    const eventosRef = collection(db, 'paseos', paseoId, 'eventos')
    // Nota: El ordenamiento y límite son correctos
    const qEventos = query(eventosRef, orderBy('creado_en', 'desc'), limit(50))
    const unsubEventos = onSnapshot(
      qEventos,
      snapshot => {
        const serverDocs = snapshot.docs.map(d => ({
          id: d.id,
          ...toDomain(d.data()),
        })) as EventoPaseo[]
        // Añadir eventos locales pendientes (optimistic updates) al inicio
        const pending = ServicioPaseo.obtenerEventosPendientes(paseoId) as any[]
        const merged = [...pending, ...serverDocs]
        setEventos(merged)
      },
      err => {
        console.error('[Firebase] Error suscribiendo a eventos:', err)
      }
    )

    return () => {
      unsubPaseo()
      unsubEventos()
      // Opcional: limpiar singleton al desmontar si es la única fuente de verdad
      // GestorPaseos.paseoActivo.limpiarPaseoActivo()
      // Cuidado con desmontajes al navegar entre pestañas.
    }
  }, [paseoId])

  return {
    paseo,
    loading,
    eventos,
    ruta,
    ubicacionActual,
  }
}
