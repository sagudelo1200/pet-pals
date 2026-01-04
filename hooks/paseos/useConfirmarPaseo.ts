import { useState, useCallback, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useMascotas } from '@/hooks/useMascotas'
import { GestorPerfilPublico } from '@/logic/usuarios/perfilPublico'
import { GestorUbicaciones } from '@/logic/ubicaciones'
import { confirmarReservaPaseo } from '@/logic/paseos/confirmador'
import { useAuth } from '@/context/AuthContext'
import type { Ubicacion } from '@/models/Ubicacion'

interface ConfirmarPaseoProps {
  mascotaIds: string[]
  direccionId: string | null
  cuidadorId: string | null
  fecha: Date | null
  hora: string | null
  duracion: number | null
  esCompartido: boolean
}

interface CuidadorInfo {
  id: string
  nombre: string
  imagen: string
  tarifa: number
}

export const useConfirmarPaseo = ({
  mascotaIds,
  direccionId,
  cuidadorId,
  fecha,
  hora,
  duracion,
  esCompartido,
}: ConfirmarPaseoProps) => {
  const { t } = useTranslation()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [cuidador, setCuidador] = useState<CuidadorInfo | null>(null)
  const [direccion, setDireccion] = useState<Ubicacion | null>(null)
  const { user } = useAuth()
  const { mascotas: todasLasMascotas } = useMascotas()

  // Obtener datos completos de los ID
  const mascotas = todasLasMascotas.filter(p => mascotaIds.includes(p.id))

  // Cargar datos del cuidador y dirección
  useEffect(() => {
    const cargarDatos = async () => {
      setLoading(true)
      try {
        const promises: Promise<any>[] = []

        if (cuidadorId) {
          promises.push(GestorPerfilPublico.obtenerPorId(cuidadorId))
        } else {
          promises.push(Promise.resolve(null))
        }

        if (direccionId) {
          promises.push(GestorUbicaciones.obtenerPorId(direccionId))
        } else {
          promises.push(Promise.resolve(null))
        }

        const [resCuidador, resUbicacion] = await Promise.all(promises)

        if (resCuidador?.success && resCuidador.data) {
          const perfil = resCuidador.data
          setCuidador({
            id: perfil.id,
            nombre: perfil.nombre,
            imagen: perfil.foto || 'https://via.placeholder.com/60',
            tarifa: perfil.tarifa_por_hora || 15000,
          })
        }

        if (resUbicacion?.success && resUbicacion.data) {
          setDireccion(resUbicacion.data)
        }
      } catch (err) {
        console.error('Error cargando datos de confirmación:', err)
      } finally {
        setLoading(false)
      }
    }

    cargarDatos()
  }, [cuidadorId, direccionId])

  // Cálculo simple de costos
  const tarifaBase = cuidador?.tarifa || 15000
  const tarifaMascotaAdicional = 5000 // Tarifa adicional por mascota extra
  const numMascotas = mascotas.length
  const duracionMinutos = duracion || 60
  const factorDuracion = duracionMinutos / 60

  // Si es más de una, sumamos extra por cada adicional
  const totalBase =
    numMascotas > 0
      ? tarifaBase + (numMascotas - 1) * tarifaMascotaAdicional
      : 0

  const total = totalBase * factorDuracion

  const confirmarReserva = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await confirmarReservaPaseo({
        fecha,
        hora,
        duracion,
        total,
        direccion,
        direccionId,
        cuidadorId,
        esCompartido,
        mascotaIds,
        tutorUid: user?.uid,
      })

      if (!res.success) {
        setError(
          typeof res.error === 'string'
            ? t(`paseos:flujo.errores.${res.error}`)
            : String(res.error)
        )
        return false
      }

      return true
    } catch (e: any) {
      console.error('Error creando paseo:', e)
      setError(e.message || 'Error desconocido')
      return false
    } finally {
      setLoading(false)
    }
  }, [
    fecha,
    hora,
    duracion,
    total,
    direccion,
    direccionId,
    cuidadorId,
    esCompartido,
    mascotaIds,
    user,
    t,
  ])

  return {
    mascotas,
    cuidador,
    direccion,
    total,
    loading,
    error,
    confirmarReserva,
  }
}
