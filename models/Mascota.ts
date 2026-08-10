import { BaseModel } from './BaseModel'
import { UbicacionRef } from './Ubicacion'

/**
 * Tipos de especie permitidas para mascotas.
 * Por ahora sólo se soporta 'perro'.
 */
export type EspecieMascota = 'perro'

/**
 * Género de la mascota.
 */
export type GeneroMascota = 'macho' | 'hembra'

/**
 * Tamaño de la mascota, usado para ajustar precios y disponibilidad del paseador.
 */
export type TamanoMascota = 'pequeño' | 'mediano' | 'grande' | 'gigante'

/**
 * Nivel de energía general de la mascota, influye en las recomendaciones de duración y tipo de paseo.
 */
export type NivelEnergia = 'bajo' | 'medio' | 'alto'

/**
 * Nivel de comportamiento (socialización, ansiedad, reactividad).
 */
export type NivelComportamiento = 'bajo' | 'medio' | 'alto'

/**
 * Ritmo de paseo preferido por la mascota.
 */
export type RitmoPaseo = 'adelante' | 'rapido' | 'tranquilo' | 'explorador'

/**
 * Preferencia de compañía durante paseos.
 */
export type CompaniaPaseo =
  'solo' | 'un_perro' | 'varios_perros' | 'grupo_grande'

/**
 * Tolerancia a frustración en interacciones sociales.
 */
export type ToleranciaFrustracion =
  'ignora' | 'intenta_una' | 'insiste' | 'se_altera'

/**
 * Compatibilidad de tamaño con otros perros en paseos grupales.
 */
export type TamanoCompatible = 'pequeño' | 'mediano' | 'grande' | 'gigante'

/**
 * Observación de compatibilidad registrada por cuidador.
 */
export interface ObservacionCompatibilidad {
  /** ID del cuidador que realizó la observación */
  cuidadorId: string
  /** Ritmo observado */
  ritmo?: RitmoPaseo
  /** Compañía observada */
  compania?: CompaniaPaseo
  /** Tolerancia a frustración observada */
  tolerancia?: ToleranciaFrustracion
  /** Compatibilidad de tamaño observada */
  tamano_compatible?: TamanoCompatible
  /** ID del paseo donde se observó */
  paseoId: string
  /** Timestamp de la observación */
  timestamp: number
}

/**
 * Información de compatibilidad de paseo.
 * Contiene versión del tutor y observaciones de cuidadores.
 */
export interface CompatibilidadPaseo {
  /** Información declarada por el tutor */
  tutor?: {
    ritmo?: RitmoPaseo
    compania?: CompaniaPaseo
    tolerancia?: ToleranciaFrustracion
    tamano_compatible?: TamanoCompatible
    timestamp: number
  }
  /** Observaciones de cuidadores (array, puede crecer) */
  observaciones?: ObservacionCompatibilidad[]
}

/**
 * Detalle de una vacuna aplicada a la mascota.
 */
export interface VacunaMascota {
  /** Nombre de la vacuna. */
  nombre: string
  /** Fecha en que se aplicó la vacuna. */
  fecha?: Date
}

/**
 * Representa los datos de una mascota de un usuario.
 * Incluye información de identificación, características físicas, salud, historial médico y preferencias de paseo.
 *
 * MULTI-TUTOR: Una mascota puede tener múltiples tutores:
 * - creado_por: tutor que creó la mascota (propietario principal, nunca cambia)
 * - ids_tutores: array de UIDs de otros tutores que pueden acceder/editar la mascota
 */
export interface Mascota extends BaseModel {
  /** Nombre dado a la mascota. */
  nombre: string
  /** URL o ruta de la imagen de la mascota. */
  foto?: string
  /** IDs de tutores adicionales que comparten acceso a esta mascota. Array de UIDs. */
  ids_tutores?: string[]

  /** Especie de la mascota. */
  especie: EspecieMascota
  /** Raza específica (opcional). */
  raza?: string
  /** Fecha de nacimiento. */
  fecha_nacimiento?: Date
  /** Género de la mascota. */
  genero?: GeneroMascota
  /** Tamaño físico de la mascota. */
  tamano?: TamanoMascota
  /** Peso en kilogramos. */
  peso?: number

  /** Indica si la mascota está esterilizada. */
  esterilizado?: boolean
  /** Registro de vacunas aplicadas. */
  vacunas?: VacunaMascota[]
  /** Condiciones de salud relevantes. */
  condiciones_salud?: string[]
  /** Alergias de la mascota. */
  alergias?: string[]
  /** Medicamentos que toma la mascota. */
  medicamentos?: string[]

  /** Nivel de energía para recomendaciones de paseo. */
  nivel_energia?: NivelEnergia
  /** Nivel de socialización con otros animales/personas. */
  socializacion?: NivelComportamiento
  /** Nivel de ansiedad. */
  ansiedad?: NivelComportamiento
  /** Nivel de reactividad. */
  reactividad?: NivelComportamiento
  /** Compatibilidad de paseo (ritmo, compañía, tolerancia). */
  compatibilidad_paseo?: CompatibilidadPaseo
  /** Indica si la mascota está activa (visible/usable) o inactiva (no eliminada, solo deshabilitada). */
  activo?: boolean
  /** Preferencias específicas de la mascota durante el paseo. */
  preferencias_paseo?: string[]

  /** Referencia a la ubicación donde vive la mascota (si difiere del tutor). */
  ubicacion?: UbicacionRef

  /** Descripción adicional o notas especiales. */
  descripcion?: string
}
