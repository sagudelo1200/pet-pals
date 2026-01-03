import { useState, useCallback, useMemo } from 'react'
import { useAuth } from '@/context/AuthContext'
import { GestorUbicaciones } from '@/logic/ubicaciones'
import { GestorUsuarios } from '@/logic/usuarios'
import { useTranslation } from 'react-i18next'

export function useDirecciones() {
  const { user, profile, recargarPerfil } = useAuth()
  const { t } = useTranslation()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Las ubicaciones vienen del perfil de usuario (Firestore), no del objeto AuthUser (Firebase Auth)
  const direcciones = useMemo(
    () => profile?.ubicaciones || [],
    [profile?.ubicaciones]
  )

  const principal = useMemo(() => {
    return direcciones.find(d => d.es_principal)
  }, [direcciones])

  const agregar = useCallback(
    async (datos: any, alias: string = 'Casa'): Promise<string> => {
      if (!user?.uid) throw new Error('NO_AUTENTICADO')
      setLoading(true)
      setError(null)
      setErrorMessage(null)

      try {
        // 1. Crear documento real en /direcciones
        const ubicacionNueva = {
          ...datos, // debe incluir coordenadas, direccion_formateada, etc.
          estado: 'pendiente',
          creado_por: user?.uid,
        }
        const resUbic = await GestorUbicaciones.crearSiNoExiste(
          ubicacionNueva as any
        )
        if (!resUbic.success || !resUbic.data) {
          const code = String(resUbic.error ?? 'ERROR_CREAR_UBICACION')
          const key = GestorUbicaciones.obtenerClaveI18nErrorUbicacion(code)
          setError(code)
          setErrorMessage(key ? t(key) : t('ubicaciones:errores.generico'))
          throw new Error(code)
        }

        const nuevaId = resUbic.data.id

        // 2. Ligar al usuario con snapshot de coordenadas
        const resUser = await GestorUsuarios.agregarUbicacion(
          user.uid,
          nuevaId,
          alias,
          datos.coordenadas // Snapshot crucial para el mapa
        )

        if (!resUser.success) {
          const code = String(resUser.error ?? 'ERROR_AGREGAR_UBICACION')
          const key = GestorUbicaciones.obtenerClaveI18nErrorUbicacion(code)
          setError(code)
          setErrorMessage(key ? t(key) : t('ubicaciones:errores.generico'))
          throw new Error(code)
        }

        await recargarPerfil()
        return nuevaId // Retornar ID para seleccionarlo en UI
      } catch (e: any) {
        const code = typeof e === 'string' ? e : (e?.message ?? String(e))
        const key = GestorUbicaciones.obtenerClaveI18nErrorUbicacion(code)
        setError(String(code))
        setErrorMessage(key ? t(key) : t('ubicaciones:errores.generico'))
        throw e
      } finally {
        setLoading(false)
      }
    },
    [user?.uid, recargarPerfil]
  )

  const fijarPrincipal = useCallback(
    async (ubicacionId: string): Promise<void> => {
      if (!user?.uid) throw new Error('NO_AUTENTICADO')
      setLoading(true)
      setError(null)
      setErrorMessage(null)
      const res = await GestorUsuarios.fijarUbicacionPrincipal(
        user.uid,
        ubicacionId
      )
      setLoading(false)
      if (res.success) {
        await recargarPerfil()
      } else {
        const code = String(res.error)
        const key = GestorUbicaciones.obtenerClaveI18nErrorUbicacion(code)
        setError(code)
        setErrorMessage(key ? t(key) : t('ubicaciones:errores.generico'))
        throw new Error(code)
      }
    },
    [user?.uid, recargarPerfil]
  )

  const eliminar = useCallback(
    async (ubicacionId: string): Promise<void> => {
      if (!user?.uid) throw new Error('NO_AUTENTICADO')
      setLoading(true)
      setError(null)
      setErrorMessage(null)
      const res = await GestorUsuarios.eliminarUbicacion(user.uid, ubicacionId)
      setLoading(false)
      if (res.success) {
        await recargarPerfil()
      } else {
        const code = String(res.error)
        const key = GestorUbicaciones.obtenerClaveI18nErrorUbicacion(code)
        setError(code)
        setErrorMessage(key ? t(key) : t('ubicaciones:errores.generico'))
        throw new Error(code)
      }
    },
    [user?.uid, recargarPerfil]
  )

  return {
    direcciones,
    principal,
    loading,
    error,
    // Mensaje localizado para mostrar en la UI (puede ser null)
    errorMessage,
    agregar,
    fijarPrincipal,
    eliminar,
    // Helpers visuales
    tieneDirecciones: direcciones.length > 0,
    usuarioId: user?.uid,
  }
}
