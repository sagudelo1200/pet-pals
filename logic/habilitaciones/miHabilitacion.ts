/**
 * Mi habilitación (lado de la persona): qué debe hacer en cada requisito, si
 * puede enviar y qué mensaje ver. Reglas puras; el proceso está en
 * functions/src/compartido/habilitacion.ts y lo decide el servidor.
 */
import {
  camposFaltantes,
  estadoDelRequisito,
  type EstadoRequisito,
  type ProgresoHabilitacion,
} from '@/functions/src/compartido/habilitacion'
import {
  requisitosDe,
  type DefinicionRequisito,
  type TipoServicio,
} from '@/functions/src/compartido/servicios'
import type { Habilitacion } from '@/models/Habilitacion'

type Perfil = Record<string, unknown> | null | undefined

/**
 * Avance guardado en la habilitación, en la forma que usan las reglas.
 * @param habilitacion Habilitación, si ya existe.
 * @return Avance por requisito.
 */
export function progresoDe(
  habilitacion: Habilitacion | null
): ProgresoHabilitacion {
  const progreso: ProgresoHabilitacion = {}
  for (const [id, r] of Object.entries(habilitacion?.requisitos ?? {})) {
    progreso[id] = {
      estado: r.estado,
      venceEnMs: r.vence_en ? r.vence_en.getTime() : null,
      verificacionId: r.verificacion_id,
      motivo: r.motivo,
    }
  }
  return progreso
}

/**
 * Perfil con el que se comprueban los requisitos: el público más el celular,
 * que es privado (vive en `usuarios`). Igual que lo arma el servidor.
 * @param publico Perfil público de la persona.
 * @param usuario Su documento de usuario (donde está el celular).
 * @return Perfil para evaluar, o null si no hay ninguno de los dos.
 */
export function perfilParaRequisitos(
  publico: Perfil,
  usuario: { celular?: string } | null | undefined
): Record<string, unknown> | null {
  if (!publico && !usuario) return null
  return { ...(publico ?? {}), celular: usuario?.celular }
}

export interface FilaRequisito {
  definicion: DefinicionRequisito
  /** Estado real ahora (lo aprobado y vencido cuenta como vencido). */
  estado: EstadoRequisito
  /** Se cumple con datos del perfil, no con evidencia. */
  delPerfil: boolean
  /** Campos del perfil que faltan (solo si es del perfil). */
  camposFaltantes: string[]
  /** Por qué se rechazó. */
  motivo?: string
  venceEn?: Date | null
  /** Puede subir o reemplazar su evidencia ahora. */
  puedeSubir: boolean
}

const SE_PUEDE_CORREGIR: EstadoRequisito[] = [
  'PENDIENTE',
  'RECHAZADO',
  'EXPIRADO',
]

/**
 * Una fila por requisito del servicio, con lo que la persona puede hacer.
 * @param servicio Servicio.
 * @param habilitacion Habilitación, si ya existe.
 * @param perfil Perfil público de la persona.
 * @param ahoraMs Momento actual.
 * @return Filas en el orden del catálogo.
 */
export function filasDe(
  servicio: TipoServicio,
  habilitacion: Habilitacion | null,
  perfil: Perfil,
  ahoraMs: number
): FilaRequisito[] {
  const progreso = progresoDe(habilitacion)
  const estadoHabilitacion = habilitacion?.estado ?? 'BORRADOR'
  return requisitosDe(servicio).map(definicion => {
    const estado = estadoDelRequisito(
      definicion,
      progreso[definicion.id],
      perfil,
      ahoraMs
    )
    const delPerfil = definicion.verificacion === null
    // Editable en borrador; en una aprobada, solo lo que venció (renovar)
    const editable =
      estadoHabilitacion === 'BORRADOR' ||
      (estadoHabilitacion === 'APROBADA' && estado === 'EXPIRADO')
    return {
      definicion,
      estado,
      delPerfil,
      camposFaltantes: delPerfil
        ? camposFaltantes(perfil, definicion.perfil ?? [])
        : [],
      motivo: habilitacion?.requisitos[definicion.id]?.motivo,
      venceEn: habilitacion?.requisitos[definicion.id]?.vence_en,
      puedeSubir:
        !delPerfil &&
        definicion.validador !== 'sistema' &&
        definicion.evidencia.length > 0 &&
        editable &&
        SE_PUEDE_CORREGIR.includes(estado),
    }
  })
}

/**
 * ¿Puede enviar a revisión? En borrador, o renovando algo vencido, y solo
 * cuando lo que comprueba el sistema (correo, perfil) ya está. La evidencia la
 * comprueba el servidor al enviar.
 * @param habilitacion Habilitación, si ya existe.
 * @param filas Filas de los requisitos.
 * @return Si se ofrece el botón de enviar.
 */
export function puedeEnviar(
  habilitacion: Habilitacion | null,
  filas: FilaRequisito[]
): boolean {
  const estado = habilitacion?.estado ?? 'BORRADOR'
  const renovando =
    estado === 'APROBADA' && filas.some(f => f.estado === 'EXPIRADO')
  if (estado !== 'BORRADOR' && !renovando) return false
  return filas
    .filter(f => f.delPerfil || f.definicion.validador === 'sistema')
    .every(f => f.estado === 'VERIFICADO')
}

export type ClaveBanner =
  | 'borrador'
  | 'revision'
  | 'aprobada'
  | 'renovar'
  | 'rechazada'
  | 'suspendida'

export interface Banner {
  clave: ClaveBanner
  variante: 'neutral' | 'alerta' | 'exito' | 'error'
  /** Lo que dijo el equipo (devolución, rechazo, suspensión). */
  motivo: string | null
  /** Cuándo vence lo más próximo a vencer (solo aprobada). */
  venceEn: Date | null
}

/**
 * El mensaje principal de la pantalla según el estado.
 * @param habilitacion Habilitación, si ya existe.
 * @param filas Filas de los requisitos.
 * @return Mensaje (clave de texto, color, motivo y vencimiento).
 */
export function bannerDe(
  habilitacion: Habilitacion | null,
  filas: FilaRequisito[]
): Banner {
  const motivo = habilitacion?.motivo ?? null
  switch (habilitacion?.estado ?? 'BORRADOR') {
    case 'EN_REVISION':
      return { clave: 'revision', variante: 'alerta', motivo: null, venceEn: null }
    case 'APROBADA': {
      if (filas.some(f => f.estado === 'EXPIRADO')) {
        return { clave: 'renovar', variante: 'alerta', motivo: null, venceEn: null }
      }
      const vencimientos = filas
        .filter(f => f.definicion.obligatorio && f.venceEn)
        .map(f => f.venceEn as Date)
        .sort((a, b) => a.getTime() - b.getTime())
      return {
        clave: 'aprobada',
        variante: 'exito',
        motivo: null,
        venceEn: vencimientos[0] ?? null,
      }
    }
    case 'RECHAZADA':
      return { clave: 'rechazada', variante: 'error', motivo, venceEn: null }
    case 'SUSPENDIDA':
      return { clave: 'suspendida', variante: 'error', motivo, venceEn: null }
    default:
      return { clave: 'borrador', variante: 'neutral', motivo, venceEn: null }
  }
}
