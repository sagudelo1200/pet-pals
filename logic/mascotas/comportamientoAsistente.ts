/**
 * Configuración del Asistente de Comportamiento
 * Define escenarios, preguntas y opciones para cada atributo
 */

import type { Atributo } from '@/components/mascota/ModalAsistenteGenerico'

export type NivelComportamiento = 'bajo' | 'medio' | 'alto'

export interface OpcionComportamiento {
  valor: NivelComportamiento
  icon: string // fontawesome5 icon name
  nombre: string
  descripcion: string
}

export interface AtributoComportamiento extends Atributo {
  key: 'nivel_energia' | 'socializacion' | 'ansiedad' | 'reactividad'
  labelKey: string
  scenarioKey: string
  preguntaKey: string
  opciones: OpcionComportamiento[]
}

export const atributosComportamiento: AtributoComportamiento[] = [
  {
    key: 'nivel_energia',
    labelKey: 'mascotas:comportamiento.energia',
    scenarioKey: 'mascotas:asistente.energia_scenario',
    preguntaKey: 'mascotas:asistente.energia_pregunta',
    opciones: [
      {
        valor: 'bajo',
        icon: 'heart',
        nombre: 'mascotas:asistente.energia_bajo',
        descripcion: 'mascotas:asistente.energia_bajo_desc',
      },
      {
        valor: 'medio',
        icon: 'walking',
        nombre: 'mascotas:asistente.energia_medio',
        descripcion: 'mascotas:asistente.energia_medio_desc',
      },
      {
        valor: 'alto',
        icon: 'running',
        nombre: 'mascotas:asistente.energia_alto',
        descripcion: 'mascotas:asistente.energia_alto_desc',
      },
    ],
  },
  {
    key: 'socializacion',
    labelKey: 'mascotas:comportamiento.socializacion',
    scenarioKey: 'mascotas:asistente.socializacion_scenario',
    preguntaKey: 'mascotas:asistente.socializacion_pregunta',
    opciones: [
      {
        valor: 'bajo',
        icon: 'user-slash',
        nombre: 'mascotas:asistente.socializacion_bajo',
        descripcion: 'mascotas:asistente.socializacion_bajo_desc',
      },
      {
        valor: 'medio',
        icon: 'user',
        nombre: 'mascotas:asistente.socializacion_medio',
        descripcion: 'mascotas:asistente.socializacion_medio_desc',
      },
      {
        valor: 'alto',
        icon: 'users',
        nombre: 'mascotas:asistente.socializacion_alto',
        descripcion: 'mascotas:asistente.socializacion_alto_desc',
      },
    ],
  },
  {
    key: 'ansiedad',
    labelKey: 'mascotas:comportamiento.ansiedad',
    scenarioKey: 'mascotas:asistente.ansiedad_scenario',
    preguntaKey: 'mascotas:asistente.ansiedad_pregunta',
    opciones: [
      {
        valor: 'bajo',
        icon: 'smile',
        nombre: 'mascotas:asistente.ansiedad_bajo',
        descripcion: 'mascotas:asistente.ansiedad_bajo_desc',
      },
      {
        valor: 'medio',
        icon: 'meh',
        nombre: 'mascotas:asistente.ansiedad_medio',
        descripcion: 'mascotas:asistente.ansiedad_medio_desc',
      },
      {
        valor: 'alto',
        icon: 'frown',
        nombre: 'mascotas:asistente.ansiedad_alto',
        descripcion: 'mascotas:asistente.ansiedad_alto_desc',
      },
    ],
  },
  {
    key: 'reactividad',
    labelKey: 'mascotas:comportamiento.reactividad',
    scenarioKey: 'mascotas:asistente.reactividad_scenario',
    preguntaKey: 'mascotas:asistente.reactividad_pregunta',
    opciones: [
      {
        valor: 'bajo',
        icon: 'spa',
        nombre: 'mascotas:asistente.reactividad_bajo',
        descripcion: 'mascotas:asistente.reactividad_bajo_desc',
      },
      {
        valor: 'medio',
        icon: 'eye',
        nombre: 'mascotas:asistente.reactividad_medio',
        descripcion: 'mascotas:asistente.reactividad_medio_desc',
      },
      {
        valor: 'alto',
        icon: 'bolt',
        nombre: 'mascotas:asistente.reactividad_alto',
        descripcion: 'mascotas:asistente.reactividad_alto_desc',
      },
    ],
  },
]

/**
 * Obtener un atributo por su key
 */
export const obtenerAtributo = (
  key: string
): AtributoComportamiento | undefined => {
  return atributosComportamiento.find(a => a.key === key)
}

/**
 * Mapear valor numérico a NivelComportamiento
 */
export const mapearValorANivel = (valor: number): NivelComportamiento => {
  if (valor <= 1) return 'bajo'
  if (valor <= 2) return 'medio'
  return 'alto'
}
