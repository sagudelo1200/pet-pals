/**
 * Solicitudes que ve un cuidador: solo las de su zona de cobertura (las
 * dirigidas a él siempre), las suyas primero y luego las más cercanas.
 */
import {
  MAX_CELDAS_COBERTURA,
  celdasDeCoberturaDe,
  distanciaKmEntreCeldas,
  esCeldaValida,
} from '@/functions/src/compartido/geografia'

/** Límite de valores de un filtro `in` en Firestore (= máximo de cobertura). */
export const MAX_CELDAS_CONSULTA = MAX_CELDAS_COBERTURA

/**
 * Celdas H3 donde el cuidador atiende, ordenadas de la más cercana a su casa a
 * la más lejana. Son exactamente las que cubre según el servidor
 * (`celdasDeCoberturaDe`): si no la eligió, su casa tampoco está, y así no ve
 * solicitudes que luego no podría aceptar.
 * @param perfil Casa, radio y celdas de cobertura manuales (si las hay).
 * @param manual Si el modo manual está permitido (config del admin).
 */
export function celdasDeSolicitudes(
  perfil: {
    h3_r8?: string
    radio_cobertura?: number
    celdas_cobertura?: string[]
  },
  manual = false
): string[] {
  const origen = perfil.h3_r8
  const celdas = celdasDeCoberturaDe(perfil, manual)
  if (!origen || !esCeldaValida(origen)) {
    return celdas.slice(0, MAX_CELDAS_CONSULTA)
  }
  return celdas
    .map(celda => ({ celda, km: distanciaKmEntreCeldas(celda, origen) }))
    .sort((a, b) => a.km - b.km)
    .slice(0, MAX_CELDAS_CONSULTA)
    .map(({ celda }) => celda)
}

interface SolicitudOrdenable {
  id?: string
  creado_por?: string
  id_cuidador?: string | null
  h3_r8?: string
  creado_en?: Date | number | null
}

const ms = (f: SolicitudOrdenable['creado_en']) =>
  f instanceof Date ? f.getTime() : (f ?? 0)

/**
 * Deja las solicitudes que el cuidador puede ver y las ordena: primero las
 * dirigidas a él, luego las más cercanas a su casa y, a igual distancia, las
 * más recientes. Quita las que creó él mismo y las dirigidas a otro.
 * @param solicitudes Solicitudes de su zona y las dirigidas a él (sin repetir).
 * @param uid Cuidador.
 * @param origen Celda H3 de su casa.
 */
export function ordenarSolicitudes<T extends SolicitudOrdenable>(
  solicitudes: readonly T[],
  uid: string | undefined,
  origen?: string
): T[] {
  const vistas = new Set<string>()
  const visibles = solicitudes.filter(p => {
    if (p.id) {
      if (vistas.has(p.id)) return false
      vistas.add(p.id)
    }
    if (p.creado_por === uid) return false
    return !p.id_cuidador || p.id_cuidador === uid
  })

  const km = (p: T) =>
    origen && p.h3_r8 ? distanciaKmEntreCeldas(p.h3_r8, origen) : Infinity
  return visibles
    .map(p => ({ p, directa: p.id_cuidador === uid, km: km(p) }))
    .sort(
      (a, b) =>
        Number(b.directa) - Number(a.directa) ||
        (a.km === b.km ? 0 : a.km - b.km) ||
        ms(b.p.creado_en) - ms(a.p.creado_en)
    )
    .map(({ p }) => p)
}
