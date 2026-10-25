import { db } from '@/firebase.config'
import { collection, onSnapshot } from 'firebase/firestore'
import {
  COLECCION_CELDAS_ZONA,
  COLECCION_ZONAS,
  type EntradaCeldaZona,
  type Zona,
} from '@/functions/src/compartido/zonas'

/** Una entrada del índice `celdas_zona` con el id de su celda. */
export type CeldaZonaDoc = EntradaCeldaZona & { celda: string }

/**
 * Zonas de negocio, solo lectura. Las escribe únicamente el servidor
 * (callable `guardarZona`, functions/src/zonas).
 */
export class ServicioZonas {
  /** Zonas, en tiempo real. Devuelve la función que cancela la suscripción. */
  static suscribirAZonas(
    // eslint-disable-next-line no-unused-vars
    callback: (zonas: Zona[]) => void,
    // eslint-disable-next-line no-unused-vars
    onError?: (err: Error) => void
  ): () => void {
    return onSnapshot(
      collection(db, COLECCION_ZONAS),
      snap =>
        callback(snap.docs.map(d => ({ ...d.data(), id: d.id }) as Zona)),
      err => onError?.(err)
    )
  }

  /** Índice de qué zona es dueña de cada celda, en tiempo real. */
  static suscribirACeldasZona(
    // eslint-disable-next-line no-unused-vars
    callback: (celdas: CeldaZonaDoc[]) => void,
    // eslint-disable-next-line no-unused-vars
    onError?: (err: Error) => void
  ): () => void {
    return onSnapshot(
      collection(db, COLECCION_CELDAS_ZONA),
      snap =>
        callback(
          snap.docs.map(d => ({ ...d.data(), celda: d.id }) as CeldaZonaDoc)
        ),
      err => onError?.(err)
    )
  }
}
