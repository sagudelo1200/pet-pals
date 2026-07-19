import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Alert } from 'react-native'
import { GestorPerfilPublico } from '@/logic/usuarios/perfilPublico'
import type { PerfilPublico } from '@/models/PerfilPublico'

interface UseCuidadorPerfilModalResult {
  perfil: PerfilPublico | null
  loading: boolean
  error: string | null
  visible: boolean
  // eslint-disable-next-line no-unused-vars
  cargarPerfil: (_cuidadorId: string) => Promise<void>
  cerrar: () => void
}

/**
 * Hook reutilizable para manejar la carga y visualización del perfil de un cuidador
 * Encapsula la lógica de obtención de datos y gestión de estados del modal
 */
export function useCuidadorPerfilModal(): UseCuidadorPerfilModalResult {
  const { t } = useTranslation()
  const [perfil, setPerfil] = useState<PerfilPublico | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [visible, setVisible] = useState(false)

  const cargarPerfil = async (_cuidadorId: string) => {
    setLoading(true)
    setError(null)
    setVisible(true) // Abrir modal con loading state primero
    try {
      const resultado = await GestorPerfilPublico.obtenerPorId(_cuidadorId)
      console.log('[useCuidadorPerfilModal] Resultado:', resultado)
      if (resultado.success && resultado.data) {
        console.log('[useCuidadorPerfilModal] Datos recibidos:', resultado.data)
        setPerfil(resultado.data)
        setLoading(false)
        console.log(
          '[useCuidadorPerfilModal] Loading puesto en false, perfil actualizado'
        )
      } else {
        console.error(
          '[useCuidadorPerfilModal] Error sin datos:',
          resultado.error
        )
        setError(resultado.error || t('comun:error_desconocido'))
        setVisible(false)
        setLoading(false)
        Alert.alert(
          t('comun:error'),
          t('paseos:pasos.seleccionar_cuidador.error_cargar_perfil')
        )
      }
    } catch (err) {
      console.error('[useCuidadorPerfilModal] Exception:', err)
      setError(t('paseos:pasos.seleccionar_cuidador.error_cargar_perfil'))
      setVisible(false)
      setLoading(false)
      Alert.alert(
        t('comun:error'),
        t('paseos:pasos.seleccionar_cuidador.error_cargar_perfil')
      )
    }
  }

  const cerrar = () => {
    setVisible(false)
    setPerfil(null)
    setError(null)
  }

  return {
    perfil,
    loading,
    error,
    visible,
    cargarPerfil,
    cerrar,
  }
}
