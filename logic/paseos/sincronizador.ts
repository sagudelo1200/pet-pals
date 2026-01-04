import {
  doc,
  onSnapshot,
  collection,
  query,
  orderBy,
  limit,
} from 'firebase/firestore'
import { db } from '@/firebase.config'
import { toDomain } from '@/services/firebase/comun'
import { ServicioPaseo } from '@/services/firebase'
import { GestorPaseos } from '@/logic/paseos'
import { Paseo } from '@/models/Paseo'

export interface EventoPaseo {
  id: string
  evento: string
  payload?: any
  actor?: string
  creado_en?: Date
}

export interface SincronizadorHandlers {
  onPaseo?: (paseo: Paseo | null) => void
  onEventos?: (eventos: EventoPaseo[]) => void
  onError?: (err: unknown) => void
}

/**
 * Inicia listeners en Firestore para un `paseoId` y mantiene el singleton `GestorPaseos.paseoActivo`.
 * Devuelve una función de limpieza que desuscribe ambos listeners.
 */
export function iniciarSincronizador(
  paseoId: string,
  handlers: SincronizadorHandlers = {}
) {
  if (!paseoId) return () => {}

  const { onPaseo, onEventos, onError } = handlers

  // Listener documento principal
  const paseoRef = doc(db, 'paseos', paseoId)
  const unsubPaseo = onSnapshot(
    paseoRef,
    snapshot => {
      try {
        if (snapshot.exists()) {
          const data = toDomain(snapshot.data())
          const paseoDoc = { id: snapshot.id, ...(data as any) } as Paseo
          // Actualizar singleton
          try {
            GestorPaseos.paseoActivo.setPaseoActivo(paseoDoc)
          } catch (e) {
            console.error(
              'GestorPaseos.paseoActivo: error al setear paseo en singleton',
              e
            )
          }
          onPaseo && onPaseo(paseoDoc)
        } else {
          // Documento eliminado / no existe
          try {
            GestorPaseos.paseoActivo.limpiarPaseoActivo()
          } catch (e) {
            console.error(
              'GestorPaseos.paseoActivo: error al limpiar paseo singleton',
              e
            )
          }
          onPaseo && onPaseo(null)
        }
      } catch (err) {
        onError && onError(err)
      }
    },
    error => {
      onError && onError(error)
    }
  )

  // Listener de eventos (hitos)
  const eventosRef = collection(db, 'paseos', paseoId, 'eventos')
  const qEventos = query(eventosRef, orderBy('creado_en', 'desc'), limit(50))
  const unsubEventos = onSnapshot(
    qEventos,
    snapshot => {
      try {
        const serverDocs: EventoPaseo[] = snapshot.docs.map(d => ({
          id: d.id,
          ...(toDomain(d.data()) as any),
        }))
        const pending =
          (ServicioPaseo.obtenerEventosPendientes(paseoId) as EventoPaseo[]) ||
          []
        const merged = [...pending, ...serverDocs]
        onEventos && onEventos(merged)
      } catch (err) {
        onError && onError(err)
      }
    },
    err => {
      onError && onError(err)
    }
  )

  return () => {
    try {
      unsubPaseo()
    } catch (e) {
      console.error('Error unsubscribing paseo listener', e)
    }
    try {
      unsubEventos()
    } catch (e) {
      console.error('Error unsubscribing eventos listener', e)
    }
  }
}
