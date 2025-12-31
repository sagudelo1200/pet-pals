import { Mascota } from '@/models/Mascota'

/**
 * Crea una vista normalizada y liviana de la mascota para uso en UI o logs.
 */
export function crearSnapshotMascota(mascota: Mascota) {
  return {
    id: mascota.id,
    nombre: mascota.nombre,
    foto: mascota.foto || null,
    tamano: mascota.tamano || null,
    peso: mascota.peso || null,
    activo: mascota.activo !== false,
  }
}

export default { crearSnapshotMascota }
