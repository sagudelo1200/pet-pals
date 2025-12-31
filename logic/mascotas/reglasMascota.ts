import { Mascota } from '@/models/Mascota'
import { esMascotaPaseable } from '@/logic/mascotas/validacionesMascota'

/**
 * Calcula una duración recomendada en minutos basada en el tamaño y nivel de energía.
 * Regla simple por ahora: combina `tamano` y `nivel_energia`.
 */
export function calcularDuracionRecomendada(
  mascota: Mascota | null | undefined
): number {
  if (!mascota) return 0

  const energia = mascota.nivel_energia || 'medio'
  const tamano = mascota.tamano || 'mediano'

  let base = 30

  switch (tamano) {
    case 'muy pequeño':
    case 'pequeño':
      base = 25
      break
    case 'mediano':
      base = 35
      break
    case 'grande':
      base = 45
      break
    case 'gigante':
      base = 55
      break
  }

  if (energia === 'alto') base += 10
  if (energia === 'bajo') base -= 5

  return Math.max(10, base)
}

/**
 * Valida si la mascota puede iniciar un paseo. Devuelve true/false.
 */
export function validarMascotaParaPaseo(
  mascota: Mascota | null | undefined
): boolean {
  return esMascotaPaseable(mascota)
}

export default {
  calcularDuracionRecomendada,
  validarMascotaParaPaseo,
}
