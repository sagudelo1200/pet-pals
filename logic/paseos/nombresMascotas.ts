/**
 * Texto con los nombres de las mascotas de un paseo, para mostrarlas todas
 * (el paseo solo guarda `mascota_nombre_visual`, el nombre de la primera).
 *
 * "Max" · "Max y Luna" · "Max, Luna y Rocky"
 */
export function listarNombres(nombres: string[]): string {
  const limpios = nombres.map(n => n?.trim()).filter(Boolean)
  if (limpios.length <= 1) return limpios[0] ?? ''
  return `${limpios.slice(0, -1).join(', ')} y ${limpios[limpios.length - 1]}`
}

/** Nombres de todas las mascotas agrupadas por tutor (orden de aparición). */
export function nombresDeMascotas(
  mascotasPorTutor: Array<{ mascotas: Array<{ nombre: string }> }>
): string[] {
  return mascotasPorTutor.flatMap(t => t.mascotas.map(m => m.nombre))
}
