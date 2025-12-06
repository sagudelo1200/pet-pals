import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { ServicioMascota, ServicioAuth } from '@/services/firebase'
import type { Mascota } from '@/models/Mascota'

interface UseMascotasReturn {
  mascotas: Mascota[]
  loading: boolean
  error: string | null
  refrescar: () => Promise<void>
  crear: (data: Partial<Mascota>) => Promise<void>
  actualizar: (id: string, data: Partial<Mascota>) => Promise<void>
  eliminar: (id: string) => Promise<void>
}

export const useMascotas = (): UseMascotasReturn => {
  const { t } = useTranslation()
  const [mascotas, setMascotas] = useState<Mascota[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const cargarMascotas = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const user = ServicioAuth.obtenerUsuarioActual()
      if (!user?.uid) {
        setError(t('comun:errores.NO_AUTENTICADO'))
        setMascotas([])
        return
      }
      const resultado = await ServicioMascota.obtenerPorUsuario(user.uid)
      if (resultado.success && resultado.data) {
        setMascotas(resultado.data)
      } else {
        setError(t('mascotas:errores.error_cargar'))
        setMascotas([])
      }
    } catch (err) {
      setError(t('mascotas:errores.error_cargar'))
      setMascotas([])
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => {
    cargarMascotas()
  }, [cargarMascotas])

  const refrescar = useCallback(async () => {
    await cargarMascotas()
  }, [cargarMascotas])

  const crear = useCallback(
    async (data: Partial<Mascota>) => {
      // Optimistic update
      const tempId = `temp-${Date.now()}`
      const nuevaMascotaTemp = {
        ...data,
        id: tempId,
        activo: true,
        // Valores por defecto para evitar errores de renderizado
        nombre: data.nombre || '',
        especie: data.especie || 'perro',
      } as Mascota

      const mascotasAnteriores = [...mascotas]

      // 1. Actualizar UI inmediatamente
      setMascotas(prev => [nuevaMascotaTemp, ...prev])
      setError(null)

      // 2. Ejecutar operación en segundo plano
      ServicioMascota.crear(data as Mascota)
        .then(resultado => {
          if (resultado.success && resultado.data) {
            // Reemplazar temporal con real
            setMascotas(prev =>
              prev.map(m => (m.id === tempId ? resultado.data! : m))
            )
          } else {
            // Revertir en caso de error lógico
            setMascotas(mascotasAnteriores)
            setError(t('mascotas:errores.error_guardar'))
          }
        })
        .catch(err => {
          // Revertir en caso de excepción
          setMascotas(mascotasAnteriores)
          setError(t('mascotas:errores.error_guardar'))
        })

      // Retornar inmediatamente para cerrar UI
      return Promise.resolve()
    },
    [mascotas, t]
  )

  const actualizar = useCallback(
    async (id: string, data: Partial<Mascota>) => {
      try {
        setLoading(true)
        setError(null)
        const resultado = await ServicioMascota.actualizar(id, data)
        if (resultado.success) {
          await cargarMascotas()
        } else {
          setError(t('mascotas:errores.error_guardar'))
          throw new Error(resultado.error)
        }
      } catch (err) {
        setError(t('mascotas:errores.error_guardar'))
        throw err
      } finally {
        setLoading(false)
      }
    },
    [cargarMascotas, t]
  )



  const eliminar = useCallback(
    async (id: string) => {
      // Optimistic update: Guardamos estado anterior
      const mascotasAnteriores = [...mascotas]

      try {
        // 1. Actualizamos UI inmediatamente
        setMascotas(prev => prev.filter(m => m.id !== id))
        setError(null)

        // 2. Ejecutamos operación en segundo plano
        const resultado = await ServicioMascota.eliminar(id)

        if (!resultado.success) {
          // Si falla, revertimos y lanzamos error
          setMascotas(mascotasAnteriores)
          setError(t('mascotas:errores.error_eliminar'))
          throw new Error(resultado.error)
        }
        // Si tiene éxito, el estado local ya está actualizado
      } catch (err) {
        // Revertimos en caso de excepción
        setMascotas(mascotasAnteriores)
        setError(t('mascotas:errores.error_eliminar'))
        throw err
      }
    },
    [mascotas, t]
  )

  return {
    mascotas,
    loading,
    error,
    refrescar,
    crear,
    actualizar,
    eliminar,
  }
}
