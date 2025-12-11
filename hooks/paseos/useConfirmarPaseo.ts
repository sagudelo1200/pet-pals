import { useState, useCallback, useEffect } from 'react'
import { useMascotas } from '@/hooks/useMascotas'
import { ServicioPaseo } from '@/services/firebase/paseo'
import { ServicioPerfilPublico } from '@/services/firebase/perfil-publico'
import { PaseoStatus } from '@/models/Paseo'
import { useAuth } from '@/context/AuthContext'

interface ConfirmarPaseoProps {
  mascotaIds: string[]
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
  cuidadorId,
  fecha,
  hora,
  duracion,
  esCompartido,
}: ConfirmarPaseoProps) => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [cuidador, setCuidador] = useState<CuidadorInfo | null>(null)
  const { user } = useAuth()
  const { mascotas: todasLasMascotas } = useMascotas()

  // Obtener datos completos de los ID
  const mascotas = todasLasMascotas.filter(p => mascotaIds.includes(p.id))

  // Cargar datos del cuidador
  useEffect(() => {
    const cargarCuidador = async () => {
      if (!cuidadorId) {
        setCuidador(null)
        return
      }

      try {
        const resultado = await ServicioPerfilPublico.obtenerPorId(cuidadorId)

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
  }, [cuidadorId])

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
          duracion_estimada: duracion || 60,
          precio: total,
          ubicacion_inicio: 'Ubicación actual', // TODO: Obtener ubicación real
          id_cuidador: cuidadorId || undefined,
          cuidador_nombre_visual: cuidador?.nombre,
          cuidador_foto_visual: cuidador?.imagen,
          modalidad: esCompartido ? 'compartido' : 'privado',
          cupo_maximo_mascotas: esCompartido ? 10 : mascotas.length,
          tutor_ids: user?.uid ? [user.uid] : [],
        },
        mascotaIds
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
