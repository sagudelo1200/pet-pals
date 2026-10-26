import { i18n } from '@/services/i18n'
import { useState, useCallback, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useMascotas } from '@/hooks/useMascotas'
import { GestorPerfilPublico } from '@/logic/usuarios/perfilPublico'
import { GestorUbicaciones } from '@/logic/ubicaciones'
import { confirmarReservaPaseo } from '@/logic/paseos/confirmador'
import { useAuth } from '@/context/AuthContext'
import type { Ubicacion } from '@/models/Ubicacion'
import { usePoliticaComercial, useBloqueoFinanciero } from '@/hooks/comercial'
import { calcularPrecioPaseo, desglosarCobro } from '@/logic/comercial'

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

  // Precio estimado con la política comercial vigente (el servidor cobra
  // con la misma fórmula al validar la entrega). Sin política no hay precio:
  // la pantalla lo indica en vez de mostrar $0
  const { politica, error: errorPolitica } = usePoliticaComercial()
  const { bloqueado } = useBloqueoFinanciero()
  const desglose = politica
    ? desglosarCobro(
        politica.por_tipo.paseo,
        politica.impuestos,
        calcularPrecioPaseo(
          politica.por_tipo.paseo,
          mascotas.length,
          duracion || 60
        )
      )
    : null
  const total = desglose?.valor_acordado ?? 0

  const confirmarReserva = useCallback(async () => {
    if (bloqueado) {
      setError(t('paseos:flujo.errores.bloqueo_financiero'))
      return false
    }
    if (!politica) {
      setError(
        errorPolitica || t('paseos:flujo.errores.sin_politica_comercial')
      )
      return false
    }
    setLoading(true)
    setError(null)
    try {
      const res = await confirmarReservaPaseo({
        fecha,
        hora,
        duracion,
        total,
        politicaVersion: politica.version,
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
      setError(e.message || i18n.t('errores:error_desconocido'))
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
    bloqueado,
    politica,
    errorPolitica,
  ])

  return {
    mascotas,
    cuidador,
    direccion,
    total,
    desglose,
    bloqueado,
    loading,
    error,
    confirmarReserva,
  }
}
