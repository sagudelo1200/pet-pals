/**
 * Cierre del paseo del cuidador: en una sola pantalla puede dejar la
 * observación de cada mascota (tres toques) y la calificación del tutor (una
 * estrella), todo opcional. Aquí está lo que decide qué se envía; el envío es
 * del hook `useCierrePaseo`.
 */
import {
  OPCIONES_COMPORTAMIENTO,
  type EjeComportamiento,
} from '@/logic/mascotas/comportamiento'

export const EJES: EjeComportamiento[] = ['ritmo', 'compania', 'tolerancia']

/** Lo marcado para una mascota (un valor por eje). */
export type SeleccionMascota = Partial<Record<EjeComportamiento, string>>

export interface EntradaCierre {
  /** Selección por id de mascota. */
  observaciones: Record<string, SeleccionMascota | undefined>
  /** Estrellas del tutor (0 = sin calificar). */
  ratingTutor: number
}

export interface PlanCierre {
  /** Mascotas con los tres ejes marcados: se registra su observación. */
  observar: string[]
  /** Mascotas con algo marcado pero sin completar (el cuidador debe decidir). */
  incompletas: string[]
  /** Si hay una calificación del tutor para enviar. */
  evaluarTutor: boolean
}

const marcados = (s: SeleccionMascota | undefined): number =>
  EJES.filter(eje => s?.[eje]).length

/**
 * ¿Los tres ejes tienen una opción válida?
 * @param seleccion Lo marcado para una mascota.
 * @return Si la observación se puede registrar.
 */
export function observacionCompleta(
  seleccion: SeleccionMascota | undefined
): boolean {
  return EJES.every(eje =>
    (OPCIONES_COMPORTAMIENTO[eje] as readonly string[]).includes(
      seleccion?.[eje] ?? ''
    )
  )
}

/**
 * Qué se enviará con lo que el cuidador marcó. Nada marcado es válido: es
 * "terminar sin dejar nada".
 * @param entrada Lo marcado en la pantalla.
 * @param mascotaIds Mascotas del paseo, en el orden en que se muestran.
 * @return Qué enviar y qué falta completar.
 */
export function planDeCierre(
  entrada: EntradaCierre,
  mascotaIds: string[]
): PlanCierre {
  const observar: string[] = []
  const incompletas: string[] = []
  for (const id of mascotaIds) {
    const seleccion = entrada.observaciones[id]
    if (marcados(seleccion) === 0) continue
    if (observacionCompleta(seleccion)) observar.push(id)
    else incompletas.push(id)
  }
  return {
    observar,
    incompletas,
    evaluarTutor: entrada.ratingTutor >= 1 && entrada.ratingTutor <= 5,
  }
}

/**
 * ¿El servidor ya tenía este registro? Reintentar un cierre a medias no debe
 * fallar por lo que sí se guardó.
 * @param error Error del callable.
 * @return Si el registro ya existía.
 */
export function yaRegistrado(error: unknown): boolean {
  return (error as { code?: string } | null)?.code === 'functions/already-exists' ||
    (error as { code?: string } | null)?.code === 'already-exists'
}
