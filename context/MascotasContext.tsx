import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
  useRef,
} from 'react'
import { useTranslation } from 'react-i18next'
import { GestorMascotas } from '@/logic/mascotas'
import { ServicioMascota } from '@/services/firebase/firestore/colecciones/mascota'
import { useAuth } from '@/context/AuthContext'
import type { Mascota } from '@/models/Mascota'

interface MascotasContextType {
  mascotas: Mascota[]
  loading: boolean
  error: string | null
  refrescar: () => Promise<void>
  // eslint-disable-next-line no-unused-vars
  crear: (data: Partial<Mascota>) => Promise<void>
  // eslint-disable-next-line no-unused-vars
  actualizar: (id: string, data: Partial<Mascota>) => Promise<void>
  // eslint-disable-next-line no-unused-vars
  eliminar: (id: string) => Promise<void>
}

const MascotasContext = createContext<MascotasContextType>(
  {} as MascotasContextType
)

export const useMascotasContext = () => useContext(MascotasContext)

export const MascotasProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const { t } = useTranslation()
  const { user } = useAuth()
  const [mascotas, setMascotas] = useState<Mascota[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const unsubscribeRef = useRef<(() => void) | null>(null)

  const cargarMascotas = useCallback(async () => {
    if (!user?.uid) {
      setMascotas([])
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)
      const resultado = await GestorMascotas.obtenerPorUsuario(user.uid)
      if (resultado && resultado.success && resultado.data) {
        setMascotas(resultado.data)
      } else {
        setError(t('mascotas:errores.error_cargar'))
        setMascotas([])
      }
    } catch (_err) {
      setError(t('mascotas:errores.error_cargar'))
      setMascotas([])
    } finally {
      setLoading(false)
    }
  }, [t, user])

  // Sincronización inicial + escucha en tiempo real
  useEffect(() => {
    if (!user?.uid) {
      setMascotas([])
      setLoading(false)
      // Limpiar suscripción anterior si existe
      if (unsubscribeRef.current) {
        unsubscribeRef.current()
        unsubscribeRef.current = null
      }
      return
    }

    setLoading(true)
    setError(null)

    // Establecer listener en tiempo real para cambios en cualquier mascota del usuario
    const unsubscribe = ServicioMascota.escucharPorUsuario(
      user.uid,
      (mascotasData: Mascota[]) => {
        setMascotas(mascotasData)
        setLoading(false)
        setError(null)
      },
      (mensajeError: string) => {
        console.error('Error en listener de mascotas:', mensajeError)
        setError(mensajeError)
        setLoading(false)
      }
    )

    unsubscribeRef.current = unsubscribe

    // Limpieza al cambiar usuario
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current()
        unsubscribeRef.current = null
      }
    }
  }, [user?.uid])

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
        nombre: data.nombre || '',
        especie: data.especie || 'perro',
      } as Mascota

      const mascotasAnteriores = [...mascotas]

      // 1. Actualizar UI inmediatamente
      setMascotas(prev => [nuevaMascotaTemp, ...prev])
      setError(null)

      // 2. Ejecutar operación en segundo plano
      try {
        const resultado = await GestorMascotas.crear(data as Mascota)
        if (resultado && resultado.success && resultado.data) {
          setMascotas(prev =>
            prev.map(m => (m.id === tempId ? resultado.data! : m))
          )
        } else {
          setMascotas(mascotasAnteriores)
          setError(t('mascotas:errores.error_guardar'))
        }
      } catch (_err) {
        setMascotas(mascotasAnteriores)
        setError(t('mascotas:errores.error_guardar'))
      }
      return Promise.resolve()
    },
    [mascotas, t]
  )

  const actualizar = useCallback(
    async (id: string, data: Partial<Mascota>) => {
      try {
        setLoading(true)
        setError(null)
        const resultado = await GestorMascotas.actualizar(id, data)
        if (resultado && resultado.success) {
          await cargarMascotas()
        } else {
          setError(t('mascotas:errores.error_guardar'))
          throw new Error((resultado as any)?.error)
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
      const mascotasAnteriores = [...mascotas]
      try {
        setMascotas(prev => prev.filter(m => m.id !== id))
        setError(null)
        const resultado = await GestorMascotas.eliminar(id)
        if (!resultado || !resultado.success) {
          setMascotas(mascotasAnteriores)
          setError(t('mascotas:errores.error_eliminar'))
          throw new Error((resultado as any)?.error)
        }
      } catch (err) {
        setMascotas(mascotasAnteriores)
        setError(t('mascotas:errores.error_eliminar'))
        throw err
      }
    },
    [mascotas, t]
  )

  return (
    <MascotasContext.Provider
      value={{
        mascotas,
        loading,
        error,
        refrescar,
        crear,
        actualizar,
        eliminar,
      }}
    >
      {children}
    </MascotasContext.Provider>
  )
}

export { MascotasContext }
