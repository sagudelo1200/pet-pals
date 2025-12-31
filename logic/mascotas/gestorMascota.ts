import { ServicioMascota } from '@/services/firebase/firestore/colecciones/mascota'
import { ServicioAuth } from '@/services/firebase/auth/auth'
import { ERR } from '@/constants'
import {
  verificarPropietarioMascota,
  defaultActivoEnCreacion,
} from '@/logic/mascotas/reglasMascota'
import type { Mascota } from '@/models/Mascota'

export async function crearMascota(data: Partial<Mascota>) {
  const current = ServicioAuth.obtenerUsuarioActual()
  const uid = current?.uid
  if (!uid) return { success: false, error: ERR.COMUN.NO_AUTENTICADO }

  // Validación de ownership: si viene creado_por, debe coincidir
  if (!verificarPropietarioMascota(data as any, uid)) {
    return { success: false, error: ERR.MASCOTAS.TUTOR_NO_COINCIDE }
  }

  // Aplicar defaults de dominio
  const payload = { ...(data as any), activo: defaultActivoEnCreacion(data) }

  return ServicioMascota.crear(payload as any)
}

export async function obtenerPorUsuario(userId: string) {
  return ServicioMascota.obtenerPorUsuario(userId)
}

export async function actualizarMascota(id: string, data: Partial<Mascota>) {
  return ServicioMascota.actualizar(id, data as any)
}

export async function eliminarMascota(id: string) {
  return ServicioMascota.eliminar(id)
}

export default {
  crearMascota,
  obtenerPorUsuario,
  actualizarMascota,
  eliminarMascota,
}
