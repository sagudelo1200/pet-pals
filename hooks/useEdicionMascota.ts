import { useState, useEffect } from 'react'
import { Alert } from 'react-native'
import * as ImagePicker from 'expo-image-picker'
import { useTranslation } from 'react-i18next'
import { GestorMascotas } from '@/logic/mascotas'
import {
  calcularCompletitud,
  type CompletitudMascota,
} from '@/logic/mascotas/calcularCompletitud'
import {
  validarTamañoImagen,
  obtenerMensajeErrorTamaño,
} from '@/services/imagen/compresion'
import type { Mascota } from '@/models/Mascota'
import { useMascotaRealtime } from './useMascotaRealtime'

export const useEdicionMascota = (
  mascotaId: string,
  mascotaParam?: Mascota
) => {
  const { t } = useTranslation()

  // Listener en tiempo real para mantener sincronización
  const { mascota: mascotaRealtime } = useMascotaRealtime(mascotaId)

  const [mascota, setMascota] = useState<Mascota | null>(mascotaParam || null)
  const [loading, setLoading] = useState(!mascotaParam)
  const [error, setError] = useState<string | null>(null)

  const [isEditMode, setIsEditMode] = useState(false)
  const [editedData, setEditedData] = useState<Partial<Mascota>>({})
  const [saving, setSaving] = useState(false)
  const [cambiosRealizados, setCambiosRealizados] = useState(false)

  // 1. Cargar mascota inicial
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

  // 2. SINCRONIZACIÓN EN TIEMPO REAL: Escuchar cambios de Firestore
  // Solo sincronizar si NO estamos en modo edición Y NO estamos guardando
  // Esto evita sobrescribir cambios optimistas durante el guardado
  useEffect(() => {
    if (
      !isEditMode &&
      !saving &&
      mascotaRealtime &&
      mascota?.id === mascotaRealtime.id
    ) {
      // Actualizar el estado local con los cambios de Firestore
      setMascota(mascotaRealtime)
    }
  }, [mascotaRealtime, isEditMode, saving, mascota?.id])

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

    // Filtrar vacunas: ignorar las que no tengan nombre
    const vacunasValidas = (editedData.vacunas || []).filter(
      v => v.nombre && v.nombre.trim().length > 0
    )

    // Crear payload final con todos los datos editados
    // Los campos de comportamiento y compatibilidad pueden venir de los modales
    // o ser editados directamente, así que los incluimos en el guardado
    const payloadGuardar = {
      ...editedData,
      vacunas: vacunasValidas.length > 0 ? vacunasValidas : undefined,
    }

    // 1. Guardar estado previo para rollback
    const previousMascota = { ...mascota }

    // 2. Aplicar actualización optimista
    const optimisticMascota = { ...mascota, ...payloadGuardar }
    setMascota(optimisticMascota as Mascota)

    // 3. Cerrar UI de edición inmediatamente
    setIsEditMode(false)
    setEditedData({})

    // Indicador de proceso en segundo plano (opcionalmente usado por la UI)
    setSaving(true)

    try {
      // 4. Ejecutar petición en segundo plano
      const resultado = await GestorMascotas.actualizar(
        mascota.id,
        payloadGuardar
      )

      if (!resultado || !resultado.success) {
        throw new Error((resultado as any)?.error || 'Error al guardar')
      }

      setCambiosRealizados(true)
      // mascotaRealtime sincronizará automáticamente via listener
    } catch (error) {
      // Rollback en caso de error
      console.error('Error guardando mascota:', error)
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
        quality: 0.7,
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

            // Validar tamaño usando el servicio centralizado
            const validacion = validarTamañoImagen(base64data)
            if (!validacion.valido) {
              Alert.alert(
                t('mascotas:errores.foto_muy_grande'),
                obtenerMensajeErrorTamaño(validacion.tamaño, 'es')
              )
              return
            }

            setEditedData(prev => ({
              ...prev,
              foto: base64data,
            }))
          }

          reader.onerror = () => {
            Alert.alert(
              t('comun:error'),
              t('mascotas:errores.error_cargar_imagen')
            )
          }

          reader.readAsDataURL(blob)
        } catch (e) {
          console.error('Error convirtiendo imagen a base64:', e)
          Alert.alert(
            t('comun:error'),
            t('mascotas:errores.error_cargar_imagen')
          )
        }
      }
    } catch (e) {
      console.error('Error al cambiar foto:', e)
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
    setEditedData(prev => ({
      ...prev,
      [field]: value,
    }))
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
          compatibilidad: {},
          notas: {},
        },
      }
    }
    return calcularCompletitud(mascota)
  }

  const actualizarMascotaLocal = (updates: Partial<Mascota>) => {
    if (mascota) {
      // Actualizar AMBOS estados: mascota (para cálculo de completitud) y editedData (para guardado)
      const mascotaActualizada = { ...mascota, ...updates }
      setMascota(mascotaActualizada)
      setEditedData(prev => ({ ...prev, ...updates }))
    }
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
    actualizarMascotaLocal,
  }
}
