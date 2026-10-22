/**
 * Versionado genérico (lado app): leer y escuchar la versión vigente de
 * cualquier tipo versionable, listar su historial y, siendo admin,
 * publicar o reactivar versiones. Las escrituras pasan siempre por Cloud
 * Functions (functions/src/administracion/funciones.ts).
 */
import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  type Timestamp,
  type Unsubscribe,
} from 'firebase/firestore'
import { db } from '@/firebase.config'
import {
  COLECCION_VERSIONADOS,
  SUBCOLECCION_VERSIONES,
  idVersion,
  type VersionPublicada,
} from '@/functions/src/compartido/versionables'
import { llamarCallable } from './callable'

export type VersionApp<T> = VersionPublicada<T, Timestamp>

const refSerie = (tipo: string) => doc(db, COLECCION_VERSIONADOS, tipo)

/** Lee una versión concreta (null si no existe). */
export async function obtenerVersion<T>(
  tipo: string,
  version: number
): Promise<VersionApp<T> | null> {
  const snap = await getDoc(
    doc(db, COLECCION_VERSIONADOS, tipo, SUBCOLECCION_VERSIONES, idVersion(version))
  )
  return snap.exists() ? (snap.data() as VersionApp<T>) : null
}

/** Número de la versión vigente (null si aún no hay ninguna publicada). */
export async function numeroVersionVigente(tipo: string): Promise<number | null> {
  const vigente = (await getDoc(refSerie(tipo))).data()?.version_vigente
  return typeof vigente === 'number' ? vigente : null
}

/** Lee la versión vigente (null si aún no hay ninguna publicada). */
export async function obtenerVersionVigente<T>(
  tipo: string
): Promise<VersionApp<T> | null> {
  const vigente = await numeroVersionVigente(tipo)
  return vigente === null ? null : obtenerVersion<T>(tipo, vigente)
}

/**
 * Escucha la versión vigente: avisa al publicarse una nueva. Llama con null
 * si no hay ninguna publicada. Devuelve la función para dejar de escuchar.
 * Si se publican dos versiones seguidas solo se entrega la última, aunque
 * la lectura de la anterior termine después.
 */
export function escucharVersionVigente<T>(
  tipo: string,
  alCambiar: (_version: VersionApp<T> | null) => void,
  alFallar: (_error: Error) => void
): Unsubscribe {
  let ultima: unknown = undefined
  let activo = true
  const unsub = onSnapshot(
    refSerie(tipo),
    snap => {
      const vigente = snap.data()?.version_vigente
      ultima = vigente
      if (typeof vigente !== 'number') {
        alCambiar(null)
        return
      }
      obtenerVersion<T>(tipo, vigente).then(
        v => activo && ultima === vigente && alCambiar(v),
        e => activo && alFallar(e)
      )
    },
    alFallar
  )
  return () => {
    activo = false
    unsub()
  }
}

/** Últimas versiones de un tipo, de la más reciente a la más antigua. */
export async function listarVersiones<T>(
  tipo: string,
  cantidad = 10
): Promise<VersionApp<T>[]> {
  const snap = await getDocs(
    query(
      collection(db, COLECCION_VERSIONADOS, tipo, SUBCOLECCION_VERSIONES),
      orderBy('version', 'desc'),
      limit(cantidad)
    )
  )
  return snap.docs.map(d => d.data() as VersionApp<T>)
}

interface ResultadoPublicacion {
  version: number
  /** false si el contenido era igual al vigente (no se creó versión). */
  nueva: boolean
  hash: string
}

export const ServicioVersionado = {
  /** Admin: publica una versión nueva de un tipo versionable. */
  publicar: llamarCallable<
    { tipo: string; contenido: unknown; motivo: string },
    ResultadoPublicacion
  >('publicarVersion'),

  /** Admin: vuelve a poner vigente una versión anterior (como copia nueva). */
  reactivar: llamarCallable<
    { tipo: string; version: number; motivo: string },
    ResultadoPublicacion
  >('reactivarVersion'),
}
