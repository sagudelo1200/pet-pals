import { useState, useEffect } from 'react'
import { useAuth } from '@/context/AuthContext'
import { GestorPerfilPublico } from '@/logic/usuarios/perfilPublico'
import { LogicMatching } from '@/logic/paseos/matching'
import { STANDARD_SERVICE_PRICE } from '@/constants'
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
  /**
   * Estado de disponibilidad del cuidador.
   * - "disponible": Match exacto con los parámetros solicitados
   * - "otro_horario": En la zona pero con conflicto de horario
   * - "fuera_de_cobertura": No en la zona H3 directa
   * - "capacidad_completa": A futuro (llegó al límite de paseos)
   * - "vacaciones": A futuro (marcado como fuera de servicio)
   */
  estado: 'disponible' | 'otro_horario' | 'fuera_de_cobertura'
  /**
   * Razón legible sobre el estado. Ej:
   * - "Disponible desde las 6:00 p.m."
   * - "Ocupado 2:00 - 4:00 p.m."
   * - "No trabaja los lunes"
   */
  motivo?: string
}

export type { CuidadorListItem }

interface DebugMatchingData {
  h3TutorZona: string | null
  h3CeldasCercanas: string[]
  candidatosRaw: any[]
  horarioSolicitado?: {
    fecha?: Date | null
    hora?: string | null
    duracion?: number | null
  }
  candidatosConDetalle: Array<{
    id: string
    nombre: string
    h3_r8: string | null
    enZonaH3: boolean
    horario: {
      pasa: boolean
      razon?: string
      horariosCuidador?: string
    }
    disponibilidad: {
      pasa: boolean
      razon?: string
      horarioSolicitado?: string
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

      const filtrados = fuente.filter((p: any) => (p.id ?? p.uid) !== user?.uid)

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
        let horarioCheck: {
          pasa: boolean
          razon: string
          horariosCuidador?: string
        } = { pasa: false, razon: 'Sin fecha' }
        if (fecha) {
          const diaKey = fecha.getDay().toString()
          const franja = perfil.horario_semanal?.[diaKey]
          if (!franja) {
            horarioCheck = {
              pasa: false,
              razon: 'No trabaja este día',
              horariosCuidador: '—',
            }
          } else {
            horarioCheck = {
              pasa: true,
              razon: `Disponible ${franja.inicio} - ${franja.fin}`,
              horariosCuidador: `${franja.inicio} - ${franja.fin}`,
            }
          }
        }

        // Check 3: Disponibilidad (matching)
        let disponibilidadCheck: {
          pasa: boolean
          razon: string
          horarioSolicitado?: string
        } = { pasa: false, razon: 'Sin parámetros' }
        if (fecha && hora != null && duracionMinutos != null) {
          // Calcular hora final del paseo
          const [horaStr, minStr] = hora.split(':')
          const horaNum = parseInt(horaStr, 10)
          const minNum = parseInt(minStr, 10)
          const totalMinutos = horaNum * 60 + minNum + duracionMinutos
          const horaFinal = Math.floor(totalMinutos / 60) % 24
          const minFinal = totalMinutos % 60
          const horaSolicitadoFormato = `${hora} - ${String(horaFinal).padStart(2, '0')}:${String(minFinal).padStart(2, '0')} (${duracionMinutos}min)`

          const estaDisponible = LogicMatching.esCuidadorDisponible(
            perfil as any,
            { fecha, hora, duracion: duracionMinutos }
          )
          if (estaDisponible) {
            disponibilidadCheck = {
              pasa: true,
              razon: 'Disponible',
              horarioSolicitado: horaSolicitadoFormato,
            }
          } else {
            disponibilidadCheck = {
              pasa: false,
              razon: 'Conflicto de reserva o sin tiempo',
              horarioSolicitado: horaSolicitadoFormato,
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

      // Separar candidatos disponibles de alternativos (para UI de comunidad)
      let disponibles: any[] = []
      let alternativos: any[] = []

      if (fecha && hora != null && duracionMinutos != null) {
        disponibles = filtrados.filter(p =>
          LogicMatching.esCuidadorDisponible(p as any, {
            fecha,
            hora,
            duracion: duracionMinutos,
          })
        )
        alternativos = filtrados.filter(
          p =>
            !disponibles.find(d => (d.id ?? d.uid) === (p.id ?? p.uid)) &&
            (p.id ?? p.uid) !== user?.uid
        )
      } else if (fecha) {
        disponibles = filtrados.filter((p: any) => {
          const diaKey = fecha.getDay().toString()
          const franja = p.horario_semanal?.[diaKey]
          if (!franja) return false
          return LogicMatching.esCuidadorDisponible(p as any, {
            fecha,
            hora: franja.inicio,
            duracion: 0,
          })
        })
        alternativos = filtrados.filter(
          p =>
            !disponibles.find(d => (d.id ?? d.uid) === (p.id ?? p.uid)) &&
            (p.id ?? p.uid) !== user?.uid
        )
      } else {
        disponibles = filtrados
      }

      // Helper: Generar motivo legible según el estado
      const generarMotivo = (perfil: any): string | undefined => {
        if (!fecha) return undefined

        const diaKey = fecha.getDay().toString()
        const franja = perfil.horario_semanal?.[diaKey]

        if (!franja) {
          return 'No trabaja este día'
        }

        // Simplemente mostrar el horario disponible
        return `Disponible ${franja.inicio} - ${franja.fin}`
      }

      // Mapear a CuidadorListItem con estado y motivo
      const cuidadoresMapeados: CuidadorListItem[] = []

      // Primero los disponibles
      cuidadoresMapeados.push(
        ...disponibles.map((perfil: any) => {
          const id = perfil.id ?? perfil.uid
          const ratingNum = Number(perfil.rating_promedio)
          const cal = !isNaN(ratingNum) ? ratingNum : 0

          let distanciaTexto = '—'
          if (indiceCeldaTutor) {
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
            tarifa: `$${STANDARD_SERVICE_PRICE.toLocaleString()}/hr`,
            insignias:
              perfil.verificacion === 'verificado' ? ['verificado'] : [],
            estado: 'disponible' as const,
            motivo: undefined as undefined,
          }
        })
      )

      // Luego los alternativos (mismo H3, pero sin match exacto)
      cuidadoresMapeados.push(
        ...alternativos.map((perfil: any) => {
          const id = perfil.id ?? perfil.uid
          const ratingNum = Number(perfil.rating_promedio)
          const cal = !isNaN(ratingNum) ? ratingNum : 0

          let distanciaTexto = '—'
          if (indiceCeldaTutor) {
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
            tarifa: `$${STANDARD_SERVICE_PRICE.toLocaleString()}/hr`,
            insignias:
              perfil.verificacion === 'verificado' ? ['verificado'] : [],
            estado: 'otro_horario' as const,
            motivo: generarMotivo(perfil),
          }
        })
      )

      setCuidadores(cuidadoresMapeados)
      setDebugMatching({
        h3TutorZona: indiceCeldaTutor,
        h3CeldasCercanas,
        candidatosRaw,
        horarioSolicitado: {
          fecha,
          hora,
          duracion: duracionMinutos,
        },
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

/**
 * Tipo de propuesta de coordinación.
 * Representa un horario alternativo compatible con el cuidador.
 */
export interface PropuestaCoordinacion {
  fecha: Date
  hora_inicio: string
  hora_fin: string
  diferencial: string // "Mismo horario mañana", "30 min después hoy", etc.
  prioridad: 'alta' | 'media' | 'baja'
}

/**
 * Calcula propuestas inteligentes de coordinación.
 * Ordena por cercanía a la solicitud original.
 *
 * @param perfil - Perfil público del cuidador
 * @param solicitud - Solicitud original {fecha, hora, duracion}
 * @returns Array de 3-4 propuestas ordenadas por prioridad
 */
export const calcularPropuestasCoordinacion = (
  perfil: any, // PerfilPublico
  solicitud: {
    fecha: Date
    hora: string
    duracion: number
  }
): PropuestaCoordinacion[] => {
  const propuestas: PropuestaCoordinacion[] = []

  if (!perfil.horario_semanal) return propuestas

  const timeToMinutes = (time: string): number => {
    const [h, m] = time.split(':').map(Number)
    return h * 60 + m
  }

  const minutesToTime = (minutes: number): string => {
    const h = Math.floor(minutes / 60)
    const m = minutes % 60
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
  }

  const solicitudInicio = timeToMinutes(solicitud.hora)
  const solicitudDuracion = solicitud.duracion
  const solicitudFin = solicitudInicio + solicitudDuracion

  const hoy = new Date(solicitud.fecha)
  hoy.setHours(0, 0, 0, 0)

  const propositionFound: Set<string> = new Set()

  // Estrategia de búsqueda:
  // 1. Mismo día: exacto → +margen → -margen
  // 2. Días siguientes: exacto → ±margen

  for (let offset = 0; offset < 7; offset++) {
    const fecha = new Date(hoy)
    fecha.setDate(hoy.getDate() + offset)
    const diaKey = fecha.getDay().toString()

    const franja = perfil.horario_semanal[diaKey]
    if (!franja) continue

    const franjaInicio = timeToMinutes(franja.inicio)
    const franjaFin = timeToMinutes(franja.fin)

    // === INTENTO 1: Exacto ===
    const solicitudCabeEnFranja =
      solicitudInicio >= franjaInicio && solicitudFin <= franjaFin

    if (solicitudCabeEnFranja) {
      const key = `${fecha.toISOString().split('T')[0]}_${solicitud.hora}`
      if (!propositionFound.has(key)) {
        propositionFound.add(key)
        propuestas.push({
          fecha,
          hora_inicio: solicitud.hora,
          hora_fin: minutesToTime(solicitudFin),
          diferencial:
            offset === 0
              ? 'Hoy, mismo horario'
              : offset === 1
                ? 'Mañana, mismo horario'
                : `${fecha.toLocaleDateString('es-ES', { weekday: 'short' })} - Mismo horario`,
          prioridad: offset === 0 ? 'alta' : offset === 1 ? 'media' : 'baja',
        })
        continue // Pasar al siguiente día
      }
    }

    // === INTENTO 2: Desplazar hacia ADELANTE (+15min, +30min) ===
    const MARGENES_ADELANTE = [15, 30]
    let encontroAlternativaAdelante = false

    for (const margen of MARGENES_ADELANTE) {
      const horaPropuesta = solicitudInicio + margen
      const finPropuesta = horaPropuesta + solicitudDuracion

      if (horaPropuesta >= franjaInicio && finPropuesta <= franjaFin) {
        const newHora = minutesToTime(horaPropuesta)
        const newFin = minutesToTime(finPropuesta)
        const key = `${fecha.toISOString().split('T')[0]}_${newHora}`

        if (!propositionFound.has(key)) {
          propositionFound.add(key)
          propuestas.push({
            fecha,
            hora_inicio: newHora,
            hora_fin: newFin,
            diferencial:
              offset === 0
                ? `${margen} min después`
                : `${margen} min después - ${fecha.toLocaleDateString('es-ES', { weekday: 'short' })}`,
            prioridad: offset === 0 ? 'alta' : 'media',
          })
          encontroAlternativaAdelante = true
          break
        }
      }
    }

    if (encontroAlternativaAdelante) continue // Si encontró adelante, pasar al siguiente día

    // === INTENTO 3: Desplazar hacia ATRÁS (-30min, -15min) solo el mismo día ===
    if (offset === 0) {
      const MARGENES_ATRAS = [30, 15]

      for (const margen of MARGENES_ATRAS) {
        const horaPropuesta = solicitudInicio - margen
        const finPropuesta = horaPropuesta + solicitudDuracion

        if (horaPropuesta >= franjaInicio && finPropuesta <= franjaFin) {
          const newHora = minutesToTime(horaPropuesta)
          const newFin = minutesToTime(finPropuesta)
          const key = `${fecha.toISOString().split('T')[0]}_${newHora}`

          if (!propositionFound.has(key)) {
            propositionFound.add(key)
            propuestas.push({
              fecha,
              hora_inicio: newHora,
              hora_fin: newFin,
              diferencial: `${margen} min antes hoy`,
              prioridad: 'alta',
            })
            break
          }
        }
      }
    }
  }

  // Ordenar por prioridad (alta → media → baja)
  propuestas.sort((a, b) => {
    const prioridadScore: Record<string, number> = {
      alta: 0,
      media: 1,
      baja: 2,
    }
    return prioridadScore[a.prioridad] - prioridadScore[b.prioridad]
  })

  // === ESTRATEGIA DE FALLBACK: Si no encontramos opciones cercanas, buscar slots viables ===
  if (propuestas.length === 0) {
    for (let offset = 0; offset < 7 && propuestas.length < 4; offset++) {
      const fecha = new Date(hoy)
      fecha.setDate(hoy.getDate() + offset)
      const diaKey = fecha.getDay().toString()

      const franja = perfil.horario_semanal[diaKey]
      if (!franja) continue

      const franjaInicio = timeToMinutes(franja.inicio)
      const franjaFin = timeToMinutes(franja.fin)

      // Generar TODOS los slots dinámicos dentro del rango disponible
      const slotsDisponibles: Array<{
        hora: number
        label: string
        distancia: number
      }> = []

      for (
        let minutos = franjaInicio;
        minutos <= franjaFin - solicitudDuracion;
        minutos += 60
      ) {
        const h = Math.floor(minutos / 60)
        const m = minutos % 60
        const label = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`

        // Calcular distancia a la hora solicitada original
        const distancia = Math.abs(minutos - solicitudInicio)

        slotsDisponibles.push({ hora: minutos, label, distancia })
      }

      // Ordenar por cercanía a la solicitud original
      // Los más cercanos primero, priorizando slots ANTES si están igual de cerca
      slotsDisponibles.sort((a, b) => {
        if (a.distancia !== b.distancia) {
          return a.distancia - b.distancia
        }
        // Si mismo distancia, priorizar los que son ANTES (hora más baja)
        return a.hora - b.hora
      })

      // Agregar los slots más cercanos
      for (const slot of slotsDisponibles) {
        if (propuestas.length >= 4) break

        const horaPropuesta = slot.hora
        const finPropuesta = horaPropuesta + solicitudDuracion

        const key = `${fecha.toISOString().split('T')[0]}_${slot.label}`

        if (
          horaPropuesta >= franjaInicio &&
          finPropuesta <= franjaFin &&
          !propositionFound.has(key)
        ) {
          propositionFound.add(key)
          const newFin = minutesToTime(finPropuesta)

          // Describir por qué es una buena alternativa
          let diferencial = ''
          if (offset === 0) {
            // Mismo día
            if (horaPropuesta > solicitudInicio) {
              const minutosDespues = horaPropuesta - solicitudInicio
              diferencial = `Hoy a las ${slot.label} (+${minutosDespues} min)`
            } else {
              const minutosAntes = solicitudInicio - horaPropuesta
              diferencial = `Hoy a las ${slot.label} (${minutosAntes} min antes)`
            }
          } else {
            // Días siguientes
            diferencial =
              offset === 1
                ? `Mañana a las ${slot.label}`
                : `${fecha.toLocaleDateString('es-ES', { weekday: 'short' })} a las ${slot.label}`
          }

          propuestas.push({
            fecha,
            hora_inicio: slot.label,
            hora_fin: newFin,
            diferencial,
            prioridad: offset === 0 ? 'alta' : 'media',
          })
        }
      }
    }
  }

  // Retornar máximo 3-4 opciones
  return propuestas.slice(0, 4)
}
