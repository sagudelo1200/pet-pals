import { useState, useEffect } from 'react'
import { useAuth } from '@/context/AuthContext'
import { GestorPerfilPublico } from '@/logic/usuarios/perfilPublico'
import { LogicMatching } from '@/logic/paseos/matching'
import {
  coordsAH3,
  distanciaKmEntreH3,
  celdasDeCobertura,
} from '@/services/geo/h3Utils'

interface CuidadorListItem {
  id: string
  nombre: string
  imagen: string
  calificacion: number
  distancia: string
  tarifa: string
  insignias: string[]
}

interface DebugMatchingData {
  h3TutorZona: string | null
  h3CeldasCercanas: string[]
  candidatosRaw: any[]
  candidatosConDetalle: Array<{
    id: string
    nombre: string
    h3_r8: string | null
    enZonaH3: boolean
    horario: {
      pasa: boolean
      razon?: string
    }
    disponibilidad: {
      pasa: boolean
      razon?: string
    }
    final: boolean
  }>
}

export const useSeleccionarCuidador = (
  cuidadorInicialId: string | null = null,
  fecha?: Date | null,
  hora?: string | null,
  duracionMinutos?: number | null,
  coordenadasTutor?: { latitude: number; longitude: number } | null
) => {
  const { user } = useAuth()
  const [cuidadores, setCuidadores] = useState<CuidadorListItem[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [cuidadorSeleccionado, setCuidadorSeleccionado] = useState<
    string | null
  >(cuidadorInicialId)
  const [debugMatching, setDebugMatching] = useState<DebugMatchingData>({
    h3TutorZona: null,
    h3CeldasCercanas: [],
    candidatosRaw: [],
    candidatosConDetalle: [],
  })

  useEffect(() => {
    cargarCuidadores()
  }, [fecha, hora, duracionMinutos, coordenadasTutor])

  const cargarCuidadores = async () => {
    setCargando(true)
    setError(null)

    try {
      // Búsqueda geoespacial O(1) si tenemos coordenadas del tutor;
      // fallback a búsqueda global verificados cuando no hay ubicación.
      let fuente: any[] = []
      let indiceCeldaTutor: string | null = null
      let h3CeldasCercanas: string[] = []

      if (coordenadasTutor) {
        indiceCeldaTutor = coordsAH3(
          coordenadasTutor.latitude,
          coordenadasTutor.longitude
        )
        // Obtener celdas cercanas para debug
        h3CeldasCercanas = celdasDeCobertura(indiceCeldaTutor, 2) ?? [
          indiceCeldaTutor,
        ]

        const resultado =
          await GestorPerfilPublico.obtenerCuidadoresPorH3(indiceCeldaTutor)
        if (resultado.success && resultado.data) {
          fuente = resultado.data
        }
      } else {
        const resultado =
          await GestorPerfilPublico.obtenerCuidadoresDisponibles()
        if (resultado.success && resultado.data) {
          fuente = resultado.data
        }
      }

      // Guardar candidatos raw para debug
      const candidatosRaw = [...fuente]

      let filtrados = fuente.filter((p: any) => (p.id ?? p.uid) !== user?.uid)

      // Construir array de detalle para debug
      const candidatosConDetalle = candidatosRaw.map((perfil: any) => {
        const id = perfil.id ?? perfil.uid
        const h3Perfil = perfil.h3_r8 ?? perfil.h3_origen

        // Check 1: ¿Está en la zona H3?
        const enZonaH3 =
          indiceCeldaTutor && h3Perfil
            ? h3CeldasCercanas.includes(h3Perfil) ||
              h3Perfil === indiceCeldaTutor
            : false

        // Check 2: Horario
        let horarioCheck = { pasa: false, razon: 'Sin fecha' }
        if (fecha) {
          const diaKey = fecha.getDay().toString()
          const franja = perfil.horario_semanal?.[diaKey]
          if (!franja) {
            horarioCheck = { pasa: false, razon: 'No trabaja este día' }
          } else {
            horarioCheck = {
              pasa: true,
              razon: `${franja.inicio} - ${franja.fin}`,
            }
          }
        }

        // Check 3: Disponibilidad (matching)
        let disponibilidadCheck = { pasa: false, razon: 'Sin parámetros' }
        if (fecha && hora && duracionMinutos) {
          const estaDisponible = LogicMatching.esCuidadorDisponible(
            perfil as any,
            { fecha, hora, duracion: duracionMinutos }
          )
          if (estaDisponible) {
            disponibilidadCheck = {
              pasa: true,
              razon: `Disponible ${duracionMinutos}min`,
            }
          } else {
            disponibilidadCheck = {
              pasa: false,
              razon: 'Conflicto de reserva o sin tiempo',
            }
          }
        }

        // Check 4: ¿Pasa el filtro final?
        const pasaFiltroFinal = filtrados.some(f => (f.id ?? f.uid) === id)

        return {
          id,
          nombre: perfil.nombre,
          h3_r8: h3Perfil,
          enZonaH3,
          horario: horarioCheck,
          disponibilidad: disponibilidadCheck,
          final: pasaFiltroFinal,
        }
      })

      // Aplicar MATCHING si tenemos los parámetros necesarios
      if (fecha && hora && duracionMinutos) {
        filtrados = LogicMatching.filtrarDisponibles(filtrados as any, {
          fecha,
          hora,
          duracion: duracionMinutos,
        })
      } else if (fecha) {
        filtrados = filtrados.filter((p: any) => {
          const diaKey = fecha.getDay().toString()
          const franja = p.horario_semanal?.[diaKey]
          if (!franja) return false
          return LogicMatching.esCuidadorDisponible(p as any, {
            fecha,
            hora: franja.inicio,
            duracion: 0,
          })
        })
      }

      // Mapear a CuidadorListItem calculando distancia real desde H3
      const cuidadoresMapeados: CuidadorListItem[] = filtrados.map(
        (perfil: any) => {
          const id = perfil.id ?? perfil.uid
          const ratingNum = Number(perfil.rating_promedio)
          const cal = !isNaN(ratingNum) ? ratingNum : 0

          let distanciaTexto = '—'
          if (indiceCeldaTutor) {
            // Priorizar h3_r8 (más preciso), luego h3_origen
            const h3 = perfil.h3_r8 ?? perfil.h3_origen
            if (h3) {
              const km = distanciaKmEntreH3(h3, indiceCeldaTutor)
              distanciaTexto = `${km.toFixed(1)} km`
            }
          }

          return {
            id,
            nombre: perfil.nombre,
            imagen: perfil.foto || 'https://via.placeholder.com/69',
            calificacion: cal,
            distancia: distanciaTexto,
            tarifa: perfil.tarifa_por_hora
              ? `$${perfil.tarifa_por_hora.toLocaleString()}/hr`
              : 'A consultar',
            insignias:
              perfil.verificacion === 'verificado' ? ['verificado'] : [],
          }
        }
      )

      setCuidadores(cuidadoresMapeados)
      setDebugMatching({
        h3TutorZona: indiceCeldaTutor,
        h3CeldasCercanas,
        candidatosRaw,
        candidatosConDetalle,
      })
    } catch (err) {
      setError('Error inesperado al cargar cuidadores')
      console.error('Error cargando cuidadores:', err)
    } finally {
      setCargando(false)
    }
  }

  const seleccionarCuidador = (id: string) => {
    setCuidadorSeleccionado(id)
  }

  return {
    cuidadores,
    cargando,
    error,
    cuidadorSeleccionado,
    seleccionarCuidador,
    recargar: cargarCuidadores,
    debugMatching, // ← Expone datos para overlay de debug
  }
}
