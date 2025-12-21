import { useState, useCallback, useMemo } from 'react'
import { useAuth } from '@/context/AuthContext'
import { ServicioUsuario } from '@/services/firebase/usuario'
import { UbicacionRef } from '@/models/Ubicacion'

export function useDirecciones() {
  const { user, profile, recargarPerfil } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Las ubicaciones vienen del perfil de usuario (Firestore), no del objeto AuthUser (Firebase Auth)
  const direcciones = useMemo(() => profile?.ubicaciones || [], [profile?.ubicaciones])
  
  const principal = useMemo(() => {
    return direcciones.find(d => d.es_principal)
  }, [direcciones])

  const agregar = useCallback(
    async (ubicacionId: string, alias: string = 'Casa') => {
      if (!user?.uid) return
      setLoading(true)
      setError(null)
      const res = await ServicioUsuario.agregarUbicacion(user.uid, ubicacionId, alias)
      setLoading(false)
      if (res.success) {
        await recargarPerfil() // Recargar perfil para actualizar UI
      } else {
        setError(String(res.error))
        throw new Error(String(res.error))
      }
    },
    [user?.uid, recargarPerfil]
  )

  const fijarPrincipal = useCallback(
    async (ubicacionId: string) => {
      if (!user?.uid) return
      setLoading(true)
      setError(null)
      const res = await ServicioUsuario.fijarUbicacionPrincipal(user.uid, ubicacionId)
      setLoading(false)
      if (res.success) {
        await recargarPerfil()
      } else {
        setError(String(res.error))
        throw new Error(String(res.error))
      }
    },
    [user?.uid, recargarPerfil]
  )

  const eliminar = useCallback(
    async (ubicacionId: string) => {
      if (!user?.uid) return
      setLoading(true)
      setError(null)
      const res = await ServicioUsuario.eliminarUbicacion(user.uid, ubicacionId)
      setLoading(false)
      if (res.success) {
        await recargarPerfil()
      } else {
        setError(String(res.error))
        throw new Error(String(res.error))
      }
    },
    [user?.uid, recargarPerfil]
  )

  return {
    direcciones,
    principal,
    loading,
    error,
    agregar,
    fijarPrincipal,
    eliminar,
    // Helpers visuales
    tieneDirecciones: direcciones.length > 0,
    usuarioId: user?.uid,
  }
}
