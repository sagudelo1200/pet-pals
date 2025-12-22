import { useState, useCallback, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useMascotas } from '@/hooks/useMascotas'
import { ServicioPaseo } from '@/services/firebase/paseo'
import { ServicioPerfilPublico } from '@/services/firebase/perfil-publico'
import { ServicioUbicaciones } from '@/services/firebase/ubicaciones'
import { PaseoStatus } from '@/models/Paseo'
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
          promises.push(ServicioPerfilPublico.obtenerPorId(cuidadorId))
        } else {
          promises.push(Promise.resolve(null))
        }

        if (direccionId) {
          promises.push(ServicioUbicaciones.obtenerPorId(direccionId))
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
    if (!fecha || !hora) {
      setError(t('paseos:flujo.errores.fecha_hora_requerida'))
      return false
    }

    if (!direccionId) {
      setError(t('paseos:flujo.errores.ubicacion_requerida'))
      return false
    }

    setLoading(true)
    setError(null)

    try {
      // Combinar fecha y hora
      const fechaInicio = new Date(fecha)
      const [hours, minutes] = hora.split(':').map(Number)
      fechaInicio.setHours(hours, minutes, 0, 0)

      const result = await ServicioPaseo.crearConMascotas(
        {
          tipo_paseo: 'solicitado',
          estado: PaseoStatus.PENDIENTE,
          fecha_hora_inicio: fechaInicio,
          duracion_estimada: duracion || 60,
          precio: total,
          ubicacion_inicio: direccion
            ? direccion.alias || direccion.direccion_formateada
            : 'Ubicación actual',
          id_cuidador: cuidadorId || undefined,
          cuidador_nombre_visual: cuidador?.nombre,
          cuidador_foto_visual: cuidador?.imagen,
          modalidad: esCompartido ? 'compartido' : 'privado',
          cupo_maximo_mascotas: esCompartido ? 10 : mascotas.length,
          tutor_ids: user?.uid ? [user.uid] : [],
        },
        mascotaIds,
        direccion || undefined
      )

      if (!result.success) {
        throw new Error(result.error)
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
    cuidadorId,
    mascotaIds,
    mascotas.length,
    esCompartido,
    cuidador,
    user,
    direccion,
    direccionId,
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
