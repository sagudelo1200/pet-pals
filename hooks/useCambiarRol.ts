import { useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import { useRol } from '@/context/RolContext'
import { ServicioUsuario } from '@/services/firebase/usuario'
import { ServicioPerfilPublico } from '@/services/firebase/perfil-publico'
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
      const rolesActuales = (profile as any).roles || []

      // Si ya tiene el rol, no hacer nada
      if (rolesActuales.includes(nuevoRol)) {
        setCargando(false)
        return { success: true }
      }

      // Agregar el nuevo rol
      const nuevosRoles = [...rolesActuales, nuevoRol]

      // Actualizar usuario
      const resultadoUsuario = await ServicioUsuario.actualizar(user.uid, {
        roles: nuevosRoles,
      })

      if (!resultadoUsuario.success) {
        throw new Error(resultadoUsuario.error || 'Error al actualizar rol')
      }

      // Si el nuevo rol es cuidador, crear perfil público si no existe
      if (nuevoRol === 'cuidador') {
        // Intentar obtener por ID directo primero (más eficiente)
        const perfilExistente = await ServicioPerfilPublico.obtenerPorId(
          user.uid
        )

        if (!perfilExistente.success) {
          // Crear perfil público básico con el UID del usuario
          const nombreUsuario =
            (profile as any).nombre || user.displayName || 'Usuario'
          const fotoUsuario = (profile as any).foto || user.photoURL || ''

          await ServicioPerfilPublico.crearConId(user.uid, {
            nombre: nombreUsuario,
            foto: fotoUsuario,
            verificacion: 'pendiente',
            rating_promedio: 0,
            cantidad_paseos_realizados: 0,
            tarifa_por_hora: 15000, // Tarifa por defecto
            creado_por: user.uid,
            actualizado_por: user.uid,
          } as any)
        }
      }

      // Refrescar perfil
      await recargarPerfil()

      // Si todo salió bien y tenemos acceso al RolContext, activar el nuevo rol
      try {
        if (typeof cambiarRolActivo === 'function') {
          await cambiarRolActivo(nuevoRol)
        }
      } catch (e) {
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
