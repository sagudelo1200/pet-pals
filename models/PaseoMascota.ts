import { BaseModel } from './BaseModel'
import { UbicacionSnapshot } from './Ubicacion'

/**
 * Estados que puede tener la mascota dentro de un paseo.
 * Ayuda a controlar la logística desde el inicio hasta la devolución.
 */
export type EstadoMascotaPaseo =
  | 'pendiente'
  | 'en_paseo'
  | 'entregada'
  | 'cancelada'

/**
 * Enlaza una mascota con un paseo, permitiendo registrar el estado y datos específicos por mascota.
 */
export interface PaseoMascota extends BaseModel {
  /** ID del paseo al que pertenece esta entrada. */
  id_paseo: string
  /**
   * ID de la mascota participante (denormalizado y además coincide con el documentId del subdoc).
   * Ruta: paseos/{paseoId}/mascotas/{mascotaId}
   */
  id_mascota: string
  /** ID del dueño de la mascota (denormalizado para reglas y consultas). */
  id_usuario: string
  /** Observaciones hechas por el paseador o dueño durante el servicio. */
  observaciones?: string

  /**
   * NOTA: Los códigos de validación ahora están a nivel de PASEO (por tutor), no por mascota.
   * Ver Paseo.codigos_recogida_por_tutor, Paseo.codigo_recogida_validado_por_tutor, etc.
   * Esto permite que múltiples mascotas del mismo tutor en un paseo compartan UN código.
   */

  /**
   * Dirección donde se recogió a la mascota (Snapshot).
   * Fundamental para el registro histórico y seguridad.
   */
  ubicacion_recogida?: UbicacionSnapshot
  /**
   * Dirección donde se entregó a la mascota (Snapshot).
   * Opcional, por defecto puede asumirse igual a recogida si es ida y vuelta.
   */
  ubicacion_entrega?: UbicacionSnapshot

  /** Estado actual de la mascota en el paseo. */
  estado_mascota: EstadoMascotaPaseo
}
