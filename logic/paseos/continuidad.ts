/**
 * Continuidad (lado app): volver a pedir un paseo al mismo cuidador con las
 * mismas mascotas. Qué cuidadores ya conocen a las mascotas de un pedido (y
 * en qué orden salen) lo decide el servidor en `buscarCuidadores`.
 */

/** Parámetros con los que se abre "Solicitar paseo" para pedir de nuevo. */
export interface ArgumentosPedirDeNuevo {
  abrirSolicitar: true
  mascotaIds: string[]
  cuidadorId: string
  forzarMascotaInicial: true
}

/**
 * Argumentos para volver a pedir un paseo al mismo cuidador con las mismas
 * mascotas.
 * @param paseo Paseo anterior.
 * @returns null si el paseo no tuvo cuidador asignado.
 */
export function argumentosParaPedirDeNuevo(paseo: {
  id_cuidador?: string | null
  mascota_ids?: string[]
}): ArgumentosPedirDeNuevo | null {
  if (!paseo.id_cuidador) return null
  return {
    abrirSolicitar: true,
    mascotaIds: [...(paseo.mascota_ids ?? [])],
    cuidadorId: paseo.id_cuidador,
    forzarMascotaInicial: true,
  }
}
