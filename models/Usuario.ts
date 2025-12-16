import { BaseModel } from './BaseModel'
import { UbicacionRef } from './Ubicacion'

/**
 * Dirección postal/domicilio estructurada.
 *
 * Nota: mantenemos este tipo por compatibilidad pero NO debe usarse
 * para nuevos desarrollos. Use `Ubicacion` y referencias (`UbicacionRef`).
 */
export interface Direccion {
  calle?: string
  numero?: string
  barrio?: string
  comuna?: string
  ciudad?: string
  departamento?: string
  pais?: string
  codigo_postal?: string
  coordenadas?: { lat: number; lng: number }
  referencia?: string
  descripcion?: string
}

/** Roles posibles del usuario en la plataforma */
export type RolUsuario = 'admin' | 'tutor' | 'cuidador'

/** Estado operativo del usuario */
export type EstadoUsuario = 'activo' | 'inactivo' | 'baneado'

/** Tipos de documento de identidad soportados */
export type TipoDocumento = 'NUIP' | 'CC' | 'CE' | 'Pasaporte'

/** Documento de identidad estructurado */
export interface DocumentoIdentidad {
  tipo: TipoDocumento
  numero: string
}

/** Modelo de usuario en la capa de dominio */
export interface Usuario extends BaseModel {
  /** Nombre completo */
  nombre: string
  /** URL de la foto de perfil */
  foto?: string
  /** Correo electrónico */
  correo: string
  /** Número de celular (formato internacional recomendado) */
  celular: string

  /** Fecha de nacimiento */
  fecha_nacimiento?: Date
  /** Referencias a ubicaciones geocodificadas (recomendado). */
  ubicaciones?: UbicacionRef[]

  /**
   * Identificador de la ubicación principal (si aplica). Mantener para consultas rápidas.
   * Opcional: puede ser `undefined` si el usuario no definió una principal.
   */
  ubicacion_principal_id?: string
  /** Zona o sector (texto libre) */
  zona?: string

  /** Roles asignados al usuario */
  roles: RolUsuario[]
  /** Documento de identidad (opcional) */
  documento_identidad?: DocumentoIdentidad
  /** Indicador de verificación del perfil */
  verificado: boolean

  /** Estado del usuario (activo/inactivo/baneado) */
  estado: EstadoUsuario
}
