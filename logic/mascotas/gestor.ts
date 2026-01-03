import { ServicioMascota, ServicioAuth } from '@/services/firebase'
import { ERR } from '@/constants'
import {
  verificarPropietarioMascota,
  defaultActivoEnCreacion,
} from '@/logic/mascotas/reglasMascota'
import type { Mascota } from '@/models/Mascota'
import { CrudResult } from '@/services/firebase/comun'

/**
 * Gestor de Mascotas.
 * Centraliza la lógica de negocio, validaciones de propiedad y reglas de estado.
 */
export const GestorMascotas = {
  async crear(data: Partial<Mascota>): Promise<CrudResult<Mascota>> {
    const current = ServicioAuth.obtenerUsuarioActual()
    const uid = current?.uid
    if (!uid) return { success: false, error: ERR.COMUN.NO_AUTENTICADO }

    if (!verificarPropietarioMascota(data as any, uid)) {
      return { success: false, error: ERR.MASCOTAS.TUTOR_NO_COINCIDE }
    }

    const payload: Partial<Mascota> = {
      ...(data as any),
      activo: defaultActivoEnCreacion(data),
    }

    return ServicioMascota.crear(payload as Mascota)
  },

  async obtenerPorUsuario(userId: string): Promise<CrudResult<Mascota[]>> {
    return ServicioMascota.obtenerPorUsuario(userId)
  },

  async obtenerPorId(id: string): Promise<CrudResult<Mascota>> {
    return ServicioMascota.obtenerPorId(id)
  },

  async actualizar(
    id: string,
    data: Partial<Mascota>
  ): Promise<CrudResult<Mascota>> {
    // Aquí se podrían añadir validaciones de propiedad antes de actualizar
    return ServicioMascota.actualizar(id, data as any)
  },

  async eliminar(id: string): Promise<CrudResult<boolean>> {
    return ServicioMascota.eliminar(id)
  },
}
