/**
 * Configuración operativa (lado app): lectura de las áreas públicas del
 * catálogo y, siendo admin, actualización vía Cloud Functions. El catálogo
 * vive en functions/src/compartido/configuracion.ts.
 *
 * Si un valor falta o no se puede leer, se usa el del catálogo: un valor
 * operativo ausente nunca debe bloquear la app.
 */
import {
  collection,
  doc,
  getDoc,
  limit,
  onSnapshot,
  orderBy,
  query,
  type Timestamp,
  type Unsubscribe,
} from 'firebase/firestore'
import { db } from '@/firebase.config'
import {
  resolverConfiguracion,
  valoresPorDefecto,
  type AreaConfiguracion,
  type ConfiguracionAreas,
} from '@/functions/src/compartido/configuracion'
import { llamarCallable } from './callable'

const COLECCION = 'configuracion'

/** Lee un área (con los valores del catálogo si falta algo o hay error). */
export async function leerConfiguracion<A extends AreaConfiguracion>(
  area: A
): Promise<ConfiguracionAreas[A]> {
  try {
    const snap = await getDoc(doc(db, COLECCION, area))
    return resolverConfiguracion(area, snap.data()).valores
  } catch (error) {
    console.warn(`[configuracion] No se pudo leer ${area}; uso el catálogo`, error)
    return valoresPorDefecto(area)
  }
}

/** Escucha un área; empieza y, ante errores, sigue con los valores del catálogo. */
export function escucharConfiguracion<A extends AreaConfiguracion>(
  area: A,
  alCambiar: (_valores: ConfiguracionAreas[A]) => void
): Unsubscribe {
  return onSnapshot(
    doc(db, COLECCION, area),
    snap => alCambiar(resolverConfiguracion(area, snap.data()).valores),
    error => {
      console.warn(`[configuracion] No se pudo escuchar ${area}; uso el catálogo`, error)
      alCambiar(valoresPorDefecto(area))
    }
  )
}

/** Un cambio del historial de un área (solo lo lee el admin). */
export interface CambioConfiguracion {
  id: string
  cambios: Record<string, { antes: unknown; despues: unknown }>
  motivo?: string
  autor: string
  en: Timestamp
}

/** Admin: últimos cambios de un área, del más reciente al más antiguo. */
export function escucharHistorialConfiguracion(
  area: AreaConfiguracion,
  cantidad: number,
  alCambiar: (_cambios: CambioConfiguracion[]) => void
): Unsubscribe {
  return onSnapshot(
    query(
      collection(db, COLECCION, area, 'historial'),
      orderBy('en', 'desc'),
      limit(cantidad)
    ),
    snap =>
      alCambiar(
        snap.docs.map(d => ({ ...(d.data() as CambioConfiguracion), id: d.id }))
      ),
    error => console.warn(`[configuracion] Historial de ${area} no disponible`, error)
  )
}

export const ServicioConfiguracion = {
  /** Admin: guarda cambios validados con su motivo (queda en el historial). */
  actualizar: llamarCallable<
    { area: AreaConfiguracion; cambios: Record<string, unknown>; motivo: string },
    { cambiadas: string[] }
  >('actualizarConfiguracion'),
}
