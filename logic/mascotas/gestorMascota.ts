import { ServicioMascota, ServicioAuth } from '@/services/firebase'
import { ERR } from '@/constants'
import {
  verificarPropietarioMascota,
  defaultActivoEnCreacion,
} from '@/logic/mascotas/reglasMascota'
import type { Mascota } from '@/models/Mascota'

type Result<T> = { success: true; data: T } | { success: false; error?: string }

export async function crearMascota(
  data: Partial<Mascota>
): Promise<Result<Mascota>> {
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

  const res = await ServicioMascota.crear(payload as Mascota)
  return res as Result<Mascota>
}

export async function obtenerPorUsuario(
  userId: string
): Promise<Result<Mascota[]>> {
  const res = await ServicioMascota.obtenerPorUsuario(userId)
  return res as Result<Mascota[]>
}

export async function obtenerPorId(id: string): Promise<Result<Mascota>> {
  const res = await ServicioMascota.obtenerPorId(id)
  return res as Result<Mascota>
}

export async function actualizarMascota(
  id: string,
  data: Partial<Mascota>
): Promise<Result<null>> {
  const res = await ServicioMascota.actualizar(id, data as any)
  return res as Result<null>
}

export async function eliminarMascota(id: string): Promise<Result<null>> {
  const res = await ServicioMascota.eliminar(id)
  return res as Result<null>
}

export default {
  crearMascota,
  obtenerPorUsuario,
  actualizarMascota,
  eliminarMascota,
}
