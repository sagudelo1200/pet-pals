import { useState, useCallback } from 'react'
import { Alert } from 'react-native'
import { useAuth } from '@/context/AuthContext'
import { useTranslation } from 'react-i18next'
import { ServicioUsuario } from '@/services/firebase'
import {
  validarCelularColombia,
  obtenerErrorCelularI18n,
} from '@/logic/usuarios'

interface UsePedirCelularSiFaltaOptions {
  /** Callback ejecutado si celular se completa con éxito */
  onCompletado?: () => void
  /** Callback ejecutado si usuario cancela */
  onCancelado?: () => void
  /** Mensaje personalizado en el título del modal */
  titulo?: string
  /** Mensaje personalizado en la descripción */
  descripcion?: string
}

export const usePedirCelularSiFalta = (
  options?: UsePedirCelularSiFaltaOptions
) => {
  const { user, profile, recargarPerfil } = useAuth()
  const { t } = useTranslation(['usuarios', 'comun'])
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [celularEnModal, setCelularEnModal] = useState('')

  /**
   * Chequea si el usuario tiene celular válido
   */
  const tieneCelular = useCallback((): boolean => {
    return !!(profile?.celular && profile.celular.trim().length > 0)
  }, [profile])

  /**
   * Muestra modal para completar celular
   */
  const mostrarModalCelular = useCallback(
    (_respuesta: (_celular: string | null) => void) => {
      const titulo =
        options?.titulo || t('perfil.celular.titulo_modal', { ns: 'usuarios' })
      const descripcion =
        options?.descripcion ||
        t('perfil.celular.descripcion_modal', { ns: 'usuarios' })

      // Para React Native Alert, no hay input directo
      // Usamos los botones para proporcionar flujo de entrada
      Alert.alert(
        titulo,
        descripcion,
        [
          {
            text: t('cancelar', { ns: 'comun' }),
            onPress: () => {
              _respuesta(null)
              options?.onCancelado?.()
            },
            style: 'cancel',
          },
          {
            text: t('continuar', { ns: 'comun' }),
            onPress: () => {
              // Aquí deberemos usar un modal custom (ver PASO B)
              // Por ahora, retornamos null indicando que necesita UI custom
              _respuesta(null)
            },
          },
        ],
        { cancelable: false }
      )
    },
    [t, options]
  )

  /**
   * Guarda el celular en Firestore después de validar
   */
  const guardarCelular = useCallback(
    async (
      celularIngresado: string
    ): Promise<{ success: boolean; error?: string }> => {
      if (!user?.uid) {
        const err = t('errores.usuario_no_autenticado', {
          ns: 'usuarios',
        }) as string
        setError(err)
        return { success: false, error: err }
      }

      // Validar formato
      const validacion = validarCelularColombia(celularIngresado)
      if (!validacion.valido) {
        const errorI18n = obtenerErrorCelularI18n(celularIngresado)
        const mensajeError: string = errorI18n
          ? (t(errorI18n.key, {
              ns: 'usuarios',
              ...errorI18n.params,
            }) as string)
          : (t('errores.generico', { ns: 'usuarios' }) as string)
        setError(mensajeError)
        return { success: false, error: mensajeError }
      }

      const celularSanitizado = validacion.celularSanitizado!

      setCargando(true)
      setError(null)

      try {
        // Actualizar en Firestore
        const res = await ServicioUsuario.actualizar(user.uid, {
          celular: celularSanitizado,
        })

        if (!res.success) {
          throw new Error(
            res.error || (t('usuarios.errores.error_guardar_celular') as string)
          )
        }

        // Refrescar perfil
        await recargarPerfil()
        setCelularEnModal('')
        options?.onCompletado?.()

        return { success: true }
      } catch (err) {
        const mensajeError: string =
          err instanceof Error
            ? err.message
            : (t('errores.generico', { ns: 'usuarios' }) as string)
        setError(mensajeError)
        return { success: false, error: mensajeError }
      } finally {
        setCargando(false)
      }
    },
    [user?.uid, t, recargarPerfil, options]
  )

  /**
   * Ejecuta el flujo completo: verifica, pregunta, valida y guarda
   */
  const ejecutarSiNoTieneCelular = useCallback(async (): Promise<boolean> => {
    if (tieneCelular()) {
      return true // Ya tiene, no hacer nada
    }

    // Aquí se dispararía un flujo que necesita UI custom
    // Retornamos false indicando que necesita intervención
    return false
  }, [tieneCelular])

  return {
    tieneCelular,
    mostrarModalCelular,
    guardarCelular,
    ejecutarSiNoTieneCelular,
    celularEnModal,
    setCelularEnModal,
    cargando,
    error,
    setError,
  }
}
