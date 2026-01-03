import { useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import { useRol } from '@/context/RolContext'
import { GestorUsuarios } from '@/logic/usuarios'
import type { RolUsuario } from '@/models/Usuario'

export const useCambiarRol = () => {
  const { user, profile, recargarPerfil } = useAuth()
  const { cambiarRolActivo } = useRol()
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const cambiarRol = async (nuevoRol: RolUsuario) => {
    if (!user?.uid || !profile) {
      setError('Usuario no autenticado')
      return { success: false, error: 'Usuario no autenticado' }
    }

    setCargando(true)
    setError(null)

    try {
      const res = await GestorUsuarios.agregarRol(user.uid, nuevoRol, {
        nombre: (profile as any).nombre || user.displayName || 'Usuario',
        foto: (profile as any).foto || user.photoURL || '',
      })

      if (!res.success) {
        throw new Error(res.error || 'Error al actualizar rol')
      }

      // Refrescar perfil
      await recargarPerfil()

      // Si todo salió bien y tenemos acceso al RolContext, activar el nuevo rol
      try {
        if (typeof cambiarRolActivo === 'function') {
          await cambiarRolActivo(nuevoRol)
        }
      } catch (_e) {
        // ignore
      }

      setCargando(false)
      return { success: true }
    } catch (err: any) {
      const errorMsg = err.message || 'Error al cambiar rol'
      setError(errorMsg)
      setCargando(false)
      return { success: false, error: errorMsg }
    }
  }

  const rolesActuales = (profile as any)?.roles || []

  return {
    cambiarRol,
    cargando,
    error,
    rolesActuales,
    esTutor: rolesActuales.includes('tutor'),
    esCuidador: rolesActuales.includes('cuidador'),
  }
}
