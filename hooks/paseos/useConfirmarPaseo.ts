import { useState, useCallback, useEffect } from 'react'
import { useMascotas } from '@/hooks/useMascotas'
import { ServicioPaseo } from '@/services/firebase/paseo'
import { ServicioPerfilPublico } from '@/services/firebase/perfil-publico'
import { PaseoStatus } from '@/models/Paseo'
import type { PerfilPublico } from '@/models/PerfilPublico'
import { useAuth } from '@/context/AuthContext'

interface ConfirmarPaseoProps {
  petIds: string[]
  walkerId: string | null
  fecha: Date | null
  hora: string | null
  esCompartido: boolean
}

interface CuidadorInfo {
  id: string
  nombre: string
  imagen: string
  tarifa: number
}

export const useConfirmarPaseo = ({
  petIds,
  walkerId,
  fecha,
  hora,
  esCompartido,
}: ConfirmarPaseoProps) => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [cuidador, setCuidador] = useState<CuidadorInfo | null>(null)
  const { user } = useAuth()
  const { mascotas: todasLasMascotas } = useMascotas()

  // Obtener datos completos de los ID
  const mascotas = todasLasMascotas.filter(p => petIds.includes(p.id))

  // Cargar datos del cuidador
  useEffect(() => {
    const cargarCuidador = async () => {
      if (!walkerId) {
        setCuidador(null)
        return
      }

      try {
        const resultado = await ServicioPerfilPublico.obtenerPorId(walkerId)

        if (resultado.success && resultado.data) {
          const perfil = resultado.data
          setCuidador({
            id: perfil.id,
            nombre: perfil.nombre,
            imagen: perfil.foto || 'https://via.placeholder.com/60',
            tarifa: perfil.tarifa_por_hora || 15000,
          })
        } else {
          setCuidador(null)
        }
      } catch (err) {
        console.error('Error cargando cuidador:', err)
        setCuidador(null)
      }
    }

    cargarCuidador()
  }, [walkerId])

  // Cálculo simple de costos
  const tarifaBase = cuidador?.tarifa || 15000
  const tarifaMascotaAdicional = 5000 // Tarifa adicional por mascota extra
  const numMascotas = mascotas.length

  // Si es más de una, sumamos extra por cada adicional
  const total =
    numMascotas > 0
      ? tarifaBase + (numMascotas - 1) * tarifaMascotaAdicional
      : 0

  const confirmarReserva = useCallback(async () => {
    if (!fecha || !hora) {
      setError('Fecha y hora requeridas')
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
          duracion_estimada: 60, // Default 1h
          precio: total,
          ubicacion_inicio: 'Ubicación actual', // TODO: Obtener ubicación real
          id_cuidador: walkerId || undefined,
          cuidador_nombre_visual: cuidador?.nombre,
          cuidador_foto_visual: cuidador?.imagen,
          modalidad: esCompartido ? 'compartido' : 'privado',
          cupo_maximo_mascotas: esCompartido ? 10 : mascotas.length,
          tutor_ids: user?.uid ? [user.uid] : [],
        },
        petIds
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
    total,
    walkerId,
    petIds,
    mascotas.length,
    esCompartido,
    cuidador,
    user,
  ])

  return {
    mascotas,
    cuidador,
    total,
    loading,
    error,
    confirmarReserva,
  }
}
