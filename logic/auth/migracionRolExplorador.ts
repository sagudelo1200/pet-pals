/**
 * Migración: Agregar rol 'explorador' a usuarios existentes que solo tengan 'tutor'
 * Ejecutar una sola vez por usuario cuando inicia sesión
 */

import { ServicioUsuario } from '@/services/firebase/firestore/colecciones/usuario'
import { RolUsuario } from '@/models'

/**
 * Verifica si el usuario tiene el rol 'explorador' y lo agrega si falta
 */
export async function asegurarRolExplorador(uid: string): Promise<boolean> {
  try {
    const res = await ServicioUsuario.obtenerPorId(uid)

    if (!res.success || !res.data) {
      return false
    }

    const rolesActuales = res.data.roles || []

    // Si ya tiene el rol, no hacer nada
    if (rolesActuales.includes('explorador')) {
      return true
    }

    // Agregar rol 'explorador'
    const nuevosRoles: RolUsuario[] = [...rolesActuales, 'explorador']

    const updateRes = await ServicioUsuario.actualizar(uid, {
      roles: nuevosRoles,
    })

    return updateRes.success
  } catch (_err) {
    return false
  }
}
