/**
 * Momentos del paseo (lado app): lo que decide el menú del cuidador, sin
 * pantallas ni Firebase. El catálogo y las reglas viven en
 * `compartido/expediente.ts`, que comparten la app y las Cloud Functions.
 */
import {
  momentoPorClave,
  type DefinicionMomento,
  type GrupoMomento,
  type MomentoRegistrado,
  type Seguimiento,
} from '@/functions/src/compartido/expediente'

/** Los dos momentos que más se registran: van como atajos arriba del menú. */
export const ATAJOS_DE_MOMENTO: readonly string[] = [
  'como_esta.jugo',
  'necesidades.tomo_agua',
]

/** Prefijo de las claves de los momentos de lugar. */
const PREFIJO_LUGAR = 'lugar_y_ambiente.lugar_'

/** Evento tal como lo guarda la bitácora del paseo. */
interface EventoDeBitacora {
  evento?: string
  payload?: { accion?: string }
}

/**
 * Último lugar registrado en el paseo, para dar contexto a lo que viene
 * después ("jugó" en el parque).
 * @param eventos Eventos del paseo, del más reciente al más antiguo.
 * @returns Clave del momento de lugar, o undefined si aún no hay ninguno.
 */
export function ultimoLugarDelPaseo(
  eventos: readonly EventoDeBitacora[]
): string | undefined {
  for (const e of eventos) {
    const accion = e.payload?.accion
    if (e.evento === 'bitacora' && accion?.startsWith(PREFIJO_LUGAR)) {
      return accion
    }
  }
  return undefined
}

/**
 * Pregunta opcional que sigue a un momento (causa y calma, detalle del
 * conflicto), si le corresponde.
 * @param clave Clave del momento.
 * @returns Seguimiento, o undefined si se guarda directo.
 */
export function seguimientoDe(clave: string): Seguimiento | undefined {
  return momentoPorClave(clave)?.seguimiento
}

/**
 * ¿El momento necesita confirmación antes de guardarse? (solo la emergencia
 * crítica: avisa de inmediato al tutor, no debe ser un toque accidental)
 * @param def Definición del momento.
 */
export function pideConfirmacion(def: DefinicionMomento): boolean {
  return def.gravedad === 'critica'
}

export interface SeleccionDeSeguimiento {
  causa?: string
  calmo_con?: string
  detalle_del_conflicto?: string
}

/** Lo que la app envía al registrar un momento. */
export type MomentoParaEnviar = Omit<
  MomentoRegistrado,
  'cuidador_id' | 'paseo_id' | 'fecha_ms'
>

/**
 * Arma el momento a registrar con su contexto y el seguimiento elegido
 * (omitido o vacío no se envía).
 * @param clave Clave del momento.
 * @param ultimoLugar Último lugar del paseo.
 * @param seleccion Lo elegido en el seguimiento.
 */
export function armarMomento(
  clave: string,
  ultimoLugar: string | undefined,
  seleccion: SeleccionDeSeguimiento = {}
): MomentoParaEnviar {
  const momento: MomentoParaEnviar = { clave }
  if (ultimoLugar && !clave.startsWith(PREFIJO_LUGAR)) {
    momento.lugar = ultimoLugar
  }
  if (seleccion.causa) momento.causa = seleccion.causa
  if (seleccion.calmo_con) momento.calmo_con = seleccion.calmo_con
  if (seleccion.detalle_del_conflicto) {
    momento.detalle_del_conflicto = seleccion.detalle_del_conflicto
  }
  return momento
}

/**
 * Clave del texto traducible de un momento: `paseos:momentos.opciones.<clave>`.
 * @param clave Clave del momento.
 */
export const claveDeEtiqueta = (clave: string): string =>
  `paseos:momentos.opciones.${clave}`

/** Grupos del menú, en el orden en que se muestran. */
export const GRUPOS_DEL_MENU: readonly GrupoMomento[] = [
  'como_esta',
  'necesidades',
  'lugar_y_ambiente',
  'emergencia',
]
