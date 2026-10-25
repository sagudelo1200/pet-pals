import { db } from '@/firebase.config'
import {
  collection,
  doc,
  onSnapshot,
  type DocumentData,
} from 'firebase/firestore'
import {
  COLECCION_TERRITORIO,
  type CeldaTerritorial,
} from '@/functions/src/compartido/territorio'

/**
 * Territorio, solo lectura. `territorio/{celda}` lo escriben únicamente las
 * Cloud Functions (functions/src/territorio): oferta y demanda en las celdas
 * de cobertura y lo observado en las microzonas.
 */
export class ServicioTerritorio {
  /**
   * Suscripción en tiempo real a todas las celdas (para el mapa del admin).
   * Devuelve la función que cancela la suscripción.
   */
  static suscribirATodas(
    // eslint-disable-next-line no-unused-vars
    callback: (celdas: CeldaTerritorial[]) => void,
    // eslint-disable-next-line no-unused-vars
    onError?: (err: Error) => void
  ): () => void {
    return onSnapshot(
      collection(db, COLECCION_TERRITORIO),
      snap =>
        callback(
          snap.docs.map(d => ({ celda: d.id, ...d.data() }) as CeldaTerritorial)
        ),
      err => onError?.(err)
    )
  }

  /**
   * Suscripción en tiempo real a una celda. `null` si todavía no hay datos.
   */
  static suscribirACelda(
    celda: string,
    // eslint-disable-next-line no-unused-vars
    callback: (celda: CeldaTerritorial | null) => void,
    // eslint-disable-next-line no-unused-vars
    onError?: (err: Error) => void
  ): () => void {
    return onSnapshot(
      doc(db, COLECCION_TERRITORIO, celda),
      snap =>
        callback(
          snap.exists()
            ? ({ celda: snap.id, ...(snap.data() as DocumentData) } as CeldaTerritorial)
            : null
        ),
      err => onError?.(err)
    )
  }
}
