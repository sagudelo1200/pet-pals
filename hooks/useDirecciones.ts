import { useState, useCallback, useMemo } from 'react'
import { useAuth } from '@/context/AuthContext'
import { ServicioUsuario } from '@/services/firebase/usuario'
import { ServicioUbicaciones } from '@/services/firebase/ubicaciones'
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
    async (datos: any, alias: string = 'Casa') => {
      if (!user?.uid) return
      setLoading(true)
      setError(null)

      try {
        // 1. Crear documento real en /direcciones
        const ubicacionNueva = {
          ...datos, // debe incluir coordenadas, direccion_formateada, etc.
          estado: 'pendiente',
        }
        const resUbic = await ServicioUbicaciones.crear(ubicacionNueva)
        if (!resUbic.success || !resUbic.data) throw new Error('ERROR_CREAR_UBICACION')
        
        const nuevaId = resUbic.data.id

        // 2. Ligar al usuario con snapshot de coordenadas
        const resUser = await ServicioUsuario.agregarUbicacion(
          user.uid, 
          nuevaId, 
          alias,
          datos.coordenadas // Snapshot crucial para el mapa
        )
        
        if (!resUser.success) throw new Error(String(resUser.error))

        await recargarPerfil()
        return nuevaId // Retornar ID para seleccionarlo en UI
      } catch (e: any) {
         setError(String(e))
         throw e
      } finally {
        setLoading(false)
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
