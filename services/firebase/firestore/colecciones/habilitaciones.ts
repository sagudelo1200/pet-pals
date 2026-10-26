import { db } from '@/firebase.config'
import {
  collection,
  doc,
  onSnapshot,
  query,
  where,
} from 'firebase/firestore'
import { toDomain } from '@/services/firebase/comun'
import {
  COLECCION_HABILITACIONES,
  type EstadoHabilitacion,
} from '@/functions/src/compartido/habilitacion'
import type { EntradaHistorial, Habilitacion } from '@/models/Habilitacion'

/**
 * Habilitaciones, solo lectura. Las escribe únicamente el servidor (callables
 * de functions/src/habilitaciones). La persona lee la suya; el admin, todas.
 */
export class ServicioHabilitaciones {
  /** Habilitaciones en un estado, en tiempo real (cola de revisión del admin). */
  static suscribirPorEstado(
    estado: EstadoHabilitacion,
    // eslint-disable-next-line no-unused-vars
    callback: (habilitaciones: Habilitacion[]) => void,
    // eslint-disable-next-line no-unused-vars
    onError?: (err: Error) => void
  ): () => void {
    return onSnapshot(
      query(
        collection(db, COLECCION_HABILITACIONES),
        where('estado', '==', estado)
      ),
      snap =>
        callback(
          snap.docs.map(
            d => ({ ...toDomain<object>(d.data()), id: d.id }) as Habilitacion
          )
        ),
      err => onError?.(err)
    )
  }

  /** Una habilitación, en tiempo real (null si no existe). */
  static suscribirADetalle(
    id: string,
    // eslint-disable-next-line no-unused-vars
    callback: (habilitacion: Habilitacion | null) => void,
    // eslint-disable-next-line no-unused-vars
    onError?: (err: Error) => void
  ): () => void {
    return onSnapshot(
      doc(db, COLECCION_HABILITACIONES, id),
      snap =>
        callback(
          snap.exists()
            ? ({ ...toDomain<object>(snap.data()), id: snap.id } as Habilitacion)
            : null
        ),
      err => onError?.(err)
    )
  }

  /** Historial de una habilitación (solo admin), en tiempo real. */
  static suscribirAHistorial(
    id: string,
    // eslint-disable-next-line no-unused-vars
    callback: (entradas: EntradaHistorial[]) => void,
    // eslint-disable-next-line no-unused-vars
    onError?: (err: Error) => void
  ): () => void {
    return onSnapshot(
      collection(db, COLECCION_HABILITACIONES, id, 'historial'),
      snap =>
        callback(
          snap.docs.map(
            d =>
              ({ ...toDomain<object>(d.data()), id: d.id }) as EntradaHistorial
          )
        ),
      err => onError?.(err)
    )
  }
}
