/**
 * Textos de las advertencias del emparejamiento: lo que un cuidador
 * normalmente no hace (tamaño de las mascotas, más perros de los que prefiere).
 * No bloquean: se le dicen al tutor al elegir y al cuidador al aceptar.
 */
import type { TFunction } from 'i18next'
import type { Advertencia } from '@/functions/src/compartido/emparejamiento'

/** Desde quién se lee el aviso (cambia la redacción). */
export type Perspectiva = 'tutor' | 'cuidador'

/**
 * Una advertencia en una frase.
 * @param advertencia Advertencia del servidor.
 * @param t Función de traducción.
 * @param perspectiva Quién lo lee.
 */
export function textoDeAdvertencia(
  advertencia: Advertencia,
  t: TFunction,
  perspectiva: Perspectiva
): string {
  const base = `paseos:advertencias.${perspectiva}`
  if (advertencia.tipo === 'tamano') {
    return t(`${base}.tamano`, { mascotas: advertencia.mascotas.join(', ') })
  }
  return advertencia.cupo === 1
    ? t(`${base}.cupo_uno`)
    : t(`${base}.cupo_otros`, { cupo: advertencia.cupo })
}

/** Varias advertencias en un texto. */
export function textoDeAdvertencias(
  advertencias: readonly Advertencia[],
  t: TFunction,
  perspectiva: Perspectiva
): string {
  return advertencias
    .map(a => textoDeAdvertencia(a, t, perspectiva))
    .join('. ')
}
