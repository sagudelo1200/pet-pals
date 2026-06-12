/**
 * Configuración de opciones para compatibilidad de paseo.
 * Define preguntas, icons y valores para la sección de compatibilidad.
 */

import type {
  Atributo,
  Opcion,
} from '@/components/mascota/ModalAsistenteGenerico'

export interface AtributoCompatibilidad extends Atributo {
  key: string
  labelKey: string // i18n key for the attribute name
  scenarioKey: string // i18n key for context/scenario
  preguntaKey: string // i18n key for the question
  opciones: Opcion[]
}

/**
 * Atributos de compatibilidad de paseo que el tutor declara.
 */
export const atributosCompatibilidad: AtributoCompatibilidad[] = [
  {
    key: 'ritmo',
    labelKey: 'mascotas:compatibilidad.ritmo',
    scenarioKey: 'mascotas:compatibilidad.ritmo_scenario',
    preguntaKey: 'mascotas:compatibilidad.pregunta_ritmo',
    opciones: [
      {
        icon: 'horse',
        nombre: 'mascotas:compatibilidad.ritmo_adelante',
        descriptor: 'mascotas:compatibilidad.ritmo_adelante_descriptor',
        valor: 'adelante',
      },
      {
        icon: 'walking',
        nombre: 'mascotas:compatibilidad.ritmo_rapido',
        descriptor: 'mascotas:compatibilidad.ritmo_rapido_descriptor',
        valor: 'rapido',
      },
      {
        icon: 'paw',
        nombre: 'mascotas:compatibilidad.ritmo_tranquilo',
        descriptor: 'mascotas:compatibilidad.ritmo_tranquilo_descriptor',
        valor: 'tranquilo',
      },
      {
        icon: 'tree',
        nombre: 'mascotas:compatibilidad.ritmo_explorador',
        descriptor: 'mascotas:compatibilidad.ritmo_explorador_descriptor',
        valor: 'explorador',
      },
    ],
  },
  {
    key: 'compania',
    labelKey: 'mascotas:compatibilidad.compania',
    scenarioKey: 'mascotas:compatibilidad.compania_paseo_grupal_scenario',
    preguntaKey: 'mascotas:compatibilidad.pregunta_compania',
    opciones: [
      {
        icon: 'dog',
        nombre: 'mascotas:compatibilidad.compania_solo',
        descriptor: 'mascotas:compatibilidad.compania_solo_descriptor',
        valor: 'solo',
      },
      {
        icon: 'user-friends',
        nombre: 'mascotas:compatibilidad.compania_un_perro',
        descriptor: 'mascotas:compatibilidad.compania_un_perro_descriptor',
        valor: 'un_perro',
      },
      {
        icon: 'users',
        nombre: 'mascotas:compatibilidad.compania_varios',
        descriptor: 'mascotas:compatibilidad.compania_varios_descriptor',
        valor: 'varios_perros',
      },
      {
        icon: 'people-carry',
        nombre: 'mascotas:compatibilidad.compania_grupo',
        descriptor: 'mascotas:compatibilidad.compania_grupo_descriptor',
        valor: 'grupo_grande',
      },
    ],
  },
  {
    key: 'tolerancia',
    labelKey: 'mascotas:compatibilidad.tolerancia',
    scenarioKey: 'mascotas:compatibilidad.tolerancia_scenario',
    preguntaKey: 'mascotas:compatibilidad.pregunta_tolerancia',
    opciones: [
      {
        icon: 'heart',
        nombre: 'mascotas:compatibilidad.tolerancia_ignora',
        descriptor: 'mascotas:compatibilidad.tolerancia_ignora_descriptor',
        valor: 'ignora',
      },
      {
        icon: 'handshake',
        nombre: 'mascotas:compatibilidad.tolerancia_intenta',
        descriptor: 'mascotas:compatibilidad.tolerancia_intenta_descriptor',
        valor: 'intenta_una',
      },
      {
        icon: 'fist-raised',
        nombre: 'mascotas:compatibilidad.tolerancia_insiste',
        descriptor: 'mascotas:compatibilidad.tolerancia_insiste_descriptor',
        valor: 'insiste',
      },
      {
        icon: 'bolt',
        nombre: 'mascotas:compatibilidad.tolerancia_altera',
        descriptor: 'mascotas:compatibilidad.tolerancia_altera_descriptor',
        valor: 'se_altera',
      },
    ],
  },
  {
    key: 'tamaño_compatible',
    labelKey: 'mascotas:compatibilidad.tamaño_compatible',
    scenarioKey: 'mascotas:compatibilidad.tamaño_compatible_parque_scenario',
    preguntaKey: 'mascotas:compatibilidad.pregunta_tamaño_compatible',
    opciones: [
      {
        icon: 'paw',
        nombre: 'mascotas:compatibilidad.tamaño_pequeño',
        descriptor: 'mascotas:compatibilidad.tamaño_pequeño_descriptor',
        valor: 'pequeño',
      },
      {
        icon: 'dog',
        nombre: 'mascotas:compatibilidad.tamaño_mediano',
        descriptor: 'mascotas:compatibilidad.tamaño_mediano_descriptor',
        valor: 'mediano',
      },
      {
        icon: 'heart',
        nombre: 'mascotas:compatibilidad.tamaño_grande',
        descriptor: 'mascotas:compatibilidad.tamaño_grande_descriptor',
        valor: 'grande',
      },
      {
        icon: 'horse',
        nombre: 'mascotas:compatibilidad.tamaño_gigante',
        descriptor: 'mascotas:compatibilidad.tamaño_gigante_descriptor',
        valor: 'gigante',
      },
    ],
  },
]
