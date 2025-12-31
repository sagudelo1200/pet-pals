import { Mascota } from '@/models/Mascota'

/**
 * Devuelve true si la mascota está marcada como activa.
 */
export function esMascotaActiva(mascota: Mascota | null | undefined): boolean {
  if (!mascota) return false
  return mascota.activo !== false
}

/**
 * Comprueba que la mascota tenga los datos mínimos necesarios
 * para operar en flujos de negocio (paseos, reservas, etc.).
 */
export function tieneDatosMinimos(
  mascota: Mascota | null | undefined
): boolean {
  if (!mascota) return false
  // Nombre y especie son campos obligatorios en el dominio
  if (!mascota.nombre) return false
  if (!mascota.especie) return false

  // Para pasar, normalmente necesitamos tamaño o peso para calcular precios/duración
  if (!mascota.tamano && (mascota.peso === undefined || mascota.peso === null))
    return false

  return true
}

/**
 * Valida que el `creado_por` presente en los datos coincida con el uid del usuario actual.
 * Esta es una regla de negocio sobre ownership que hoy se valida en el servicio.
 */
export function esCreadoPorValido(
  data: Partial<Mascota> | Record<string, any>,
  uid: string | null | undefined
): boolean {
  if (!uid) return false
  if ((data as any).creado_por && (data as any).creado_por !== uid) return false
  return true
}

/**
 * Determina si una mascota es 'paseable' combinando reglas de negocio.
 * Ejemplo: debe estar activa y tener datos mínimos.
 */
export function esMascotaPaseable(
  mascota: Mascota | null | undefined
): boolean {
  return esMascotaActiva(mascota) && tieneDatosMinimos(mascota)
}

export default {
  esMascotaActiva,
  tieneDatosMinimos,
  esMascotaPaseable,
}
