import { useState, useEffect } from 'react'
import { Alert } from 'react-native'
import * as ImagePicker from 'expo-image-picker'
import { useTranslation } from 'react-i18next'
import { GestorMascotas } from '@/logic/mascotas'
import { calcularCompletitud, type CompletitudMascota } from '@/logic/mascotas/calcularCompletitud'
import type { Mascota } from '@/models/Mascota'

export const useEdicionMascota = (
  mascotaId: string,
  mascotaParam?: Mascota
) => {
  const { t } = useTranslation()

  const [mascota, setMascota] = useState<Mascota | null>(mascotaParam || null)
  const [loading, setLoading] = useState(!mascotaParam)
  const [error, setError] = useState<string | null>(null)

  const [isEditMode, setIsEditMode] = useState(false)
  const [editedData, setEditedData] = useState<Partial<Mascota>>({})
  const [saving, setSaving] = useState(false)
  const [cambiosRealizados, setCambiosRealizados] = useState(false)

  useEffect(() => {
    const cargarMascota = async () => {
      if (mascotaParam) {
        setLoading(false)
        return
      }

      if (!mascotaId) {
        setError(t('mascotas:errores.MASCOTA_NO_ENCONTRADA'))
        setLoading(false)
        return
      }

      setLoading(true)
      try {
        const resultado = await GestorMascotas.obtenerPorId(mascotaId)
        if (resultado && resultado.success && resultado.data) {
          setMascota(resultado.data)
        } else {
          setError(t('mascotas:errores.error_cargar'))
        }
      } catch (_e) {
        setError(t('mascotas:errores.error_cargar'))
      } finally {
        setLoading(false)
      }
    }

    cargarMascota()
  }, [mascotaId, mascotaParam, t])

  const iniciarEdicion = () => {
    if (!mascota) return
    setEditedData({ ...mascota })
    setIsEditMode(true)
  }

  const cancelarEdicion = () => {
    setIsEditMode(false)
    setEditedData({})
  }

  const guardarCambios = async () => {
    if (!mascota || !editedData.nombre || editedData.nombre.trim().length < 2) {
      Alert.alert(t('comun:error'), t('mascotas:errores.nombre_muy_corto'))
      return
    }

    // 1. Guardar estado previo para rollback
    const previousMascota = { ...mascota }

    // 2. Aplicar actualización optimista
    const optimisticMascota = { ...mascota, ...editedData }
    setMascota(optimisticMascota as Mascota)

    // 3. Cerrar UI de edición inmediatamente
    setIsEditMode(false)
    setEditedData({})

    // Indicador de proceso en segundo plano (opcionalmente usado por la UI)
    setSaving(true)

    try {
      // 4. Ejecutar petición en segundo plano
      const resultado = await GestorMascotas.actualizar(mascota.id, editedData)

      if (resultado && resultado.success && (resultado as any).data) {
        setMascota((resultado as any).data)
        setCambiosRealizados(true)
      } else if (resultado && resultado.success) {
        setCambiosRealizados(true)
      } else {
        throw new Error((resultado as any)?.error || 'Error al guardar')
      }
    } catch (error) {
      // 6. Rollback en caso de error
      console.error('Error guardando mascota:', error)
      setMascota(previousMascota)
      setMascota(previousMascota)
      Alert.alert(
        t('mascotas:errores.sincronizacion_fallida'),
        t('mascotas:mensajes.rollback_realizado')
      )
    } finally {
      setSaving(false)
    }
  }

  const cambiarFoto = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
      if (status !== 'granted') {
        Alert.alert(
          t('comun:permisos_requeridos'),
          t('mascotas:mensajes.permisos_galeria')
        )
        return
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: 'images',
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
        // base64: true, // Deprecated en versiones recientes de Expo
      })

      if (!result.canceled) {
        const asset = result.assets[0]

        // Convertir a base64 manualmente para evitar warning de deprecación
        try {
          const response = await fetch(asset.uri)
          const blob = await response.blob()

          const reader = new FileReader()
          reader.onload = () => {
            const base64data = reader.result as string
            setEditedData(prev => ({
              ...prev,
              foto: base64data,
            }))
          }
          reader.readAsDataURL(blob)
        } catch (e) {
          console.error('Error convirtiendo imagen a base64:', e)
          // Fallback a URI local si falla la conversión (aunque no persistirá en nube)
          setEditedData(prev => ({
            ...prev,
            foto: asset.uri,
          }))
        }
      }
    } catch (error) {
      console.error('Error al seleccionar imagen:', error)
      Alert.alert(t('comun:error'), t('mascotas:errores.error_cargar_imagen'))
    }
  }

  const eliminarMascota = async () => {
    if (!mascota) return { success: false, error: 'No mascota' }

    // UI Optimista: No esperamos a que termine para dar feedback visual
    // La navegación debe ocurrir inmediatamente en el componente
    try {
      const res = await GestorMascotas.eliminar(mascota.id)
      if (res && res.success) return { success: true }
      return { success: false, error: (res as any)?.error }
    } catch (e) {
      console.error('Error al eliminar mascota:', e)
      return { success: false, error: e }
    }
  }

  const actualizarCampo = <K extends keyof Mascota>(
    field: K,
    value: Mascota[K]
  ) => {
    setEditedData(prev => ({ ...prev, [field]: value }))
  }

  const calcularProgresoActual = (): CompletitudMascota => {
    if (!mascota) {
      return {
        nivel: 1,
        porcentaje: 0,
        readiness: 'incompleto',
        campos: {
          basico: {},
          fisico: {},
          comportamiento: {},
          salud: {},
        },
      }
    }
    return calcularCompletitud(mascota)
  }

  return {
    mascota,
    loading,
    error,
    isEditMode,
    editedData,
    saving,
    cambiosRealizados,
    iniciarEdicion,
    cancelarEdicion,
    guardarCambios,
    cambiarFoto,
    actualizarCampo,
    eliminarMascota,
    calcularProgresoActual,
  }
}
