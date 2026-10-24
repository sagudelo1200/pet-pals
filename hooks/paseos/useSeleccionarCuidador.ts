import { useState, useEffect, useMemo, useCallback } from 'react'
import { usePoliticaComercial } from '@/hooks/comercial'
import { formatearCOP } from '@/logic/comercial'
import { buscarCuidadores } from '@/services/firebase/emparejamiento'
import { coordsAH3 } from '@/services/geo/h3Utils'
import type {
  Advertencia,
  Continuidad,
  CuidadorEncontrado,
  MotivoAlternativo,
  FranjaDia,
  Razon,
} from '@/functions/src/compartido/emparejamiento'

interface CuidadorListItem {
  id: string
  nombre: string
  imagen: string
  calificacion: number
  distancia: string
  tarifa: string
  insignias: string[]
  /**
   * - "disponible": cumple zona, horario, agenda, cupo y tamaño
   * - "otro_horario": en la zona y apto para la mascota, pero no a esa hora
   */
  estado: 'disponible' | 'otro_horario'
  /** Por qué no está disponible a esa hora (solo `otro_horario`). */
  motivo?: MotivoAlternativo
  /** Horario del cuidador ese día, si trabaja. */
  franja?: FranjaDia
  /** Por qué aparece donde aparece (para explicárselo al tutor). */
  razones: Razon[]
  /** Si ya conoce a alguna mascota del pedido. */
  continuidad?: Continuidad
  /** Lo que normalmente no hace (tamaño, cupo): se avisa y el tutor decide. */
  advertencias: Advertencia[]
}

export type { CuidadorListItem }

const dosDigitos = (n: number) => String(n).padStart(2, '0')

/** Fecha local como "YYYY-MM-DD" (el servidor la lee como fecha de Colombia). */
const fechaComoTexto = (f: Date) =>
  `${f.getFullYear()}-${dosDigitos(f.getMonth() + 1)}-${dosDigitos(f.getDate())}`

const aItem = (c: CuidadorEncontrado): CuidadorListItem => ({
  id: c.id,
  nombre: c.nombre,
  imagen: c.foto || 'https://via.placeholder.com/69',
  calificacion: c.calificacion,
  distancia: c.distanciaKm === undefined ? '—' : `${c.distanciaKm.toFixed(1)} km`,
  tarifa: '',
  insignias: c.insignias,
  estado: c.estado,
  motivo: c.motivo,
  franja: c.franja,
  razones: c.razones,
  continuidad: c.continuidad,
  advertencias: c.advertencias,
})

/**
 * Cuidadores para el pedido. La búsqueda la hace el servidor
 * (`buscarCuidadores`): zona, horario y excepciones, agenda, cupo, tamaño de
 * la mascota y orden por encaje. Aquí solo se pide y se guarda la selección.
 * @param cuidadorInicialId Cuidador preseleccionado (o 'SOLICITUD_ABIERTA').
 * @param fecha Día del paseo.
 * @param hora Hora de inicio "HH:mm".
 * @param duracionMinutos Duración del paseo.
 * @param coordenadasTutor Punto de recogida.
 * @param mascotaIds Mascotas del pedido.
 */
export const useSeleccionarCuidador = (
  cuidadorInicialId: string | null = null,
  fecha?: Date | null,
  hora?: string | null,
  duracionMinutos?: number | null,
  coordenadasTutor?: { latitude: number; longitude: number } | null,
  mascotaIds: string[] = []
) => {
  const [cuidadores, setCuidadores] = useState<CuidadorListItem[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [cuidadorSeleccionado, setCuidadorSeleccionado] = useState<
    string | null
  >(cuidadorInicialId)

  const clave = mascotaIds.join(',')
  const cargarCuidadores = useCallback(async () => {
    setError(null)
    if (
      !fecha ||
      !hora ||
      !duracionMinutos ||
      !coordenadasTutor ||
      !clave
    ) {
      setCuidadores([])
      setCargando(false)
      return
    }
    setCargando(true)
    try {
      const { cuidadores: encontrados } = await buscarCuidadores({
        fecha: fechaComoTexto(fecha),
        hora,
        duracion: duracionMinutos,
        celda: coordsAH3(coordenadasTutor.latitude, coordenadasTutor.longitude),
        mascotaIds: clave.split(','),
      })
      setCuidadores(encontrados.map(aItem))
    } catch (err) {
      setError('Error inesperado al cargar cuidadores')
      console.error('Error cargando cuidadores:', err)
    } finally {
      setCargando(false)
    }
  }, [fecha, hora, duracionMinutos, coordenadasTutor, clave])

  useEffect(() => {
    cargarCuidadores()
  }, [cargarCuidadores])

  const seleccionarCuidador = (id: string | null) => {
    setCuidadorSeleccionado(id)
  }

  // Tarifa global de la política comercial vigente
  const { politica } = usePoliticaComercial()
  const cuidadoresConTarifa = useMemo(() => {
    const base = politica?.por_tipo.paseo.precio.base_por_hora
    const tarifa = base ? `${formatearCOP(base)}/hr` : '—'
    return cuidadores.map(c => ({ ...c, tarifa }))
  }, [cuidadores, politica])

  return {
    cuidadores: cuidadoresConTarifa,
    cargando,
    error,
    cuidadorSeleccionado,
    seleccionarCuidador,
    recargar: cargarCuidadores,
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
