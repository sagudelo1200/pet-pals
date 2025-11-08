import { BaseModel } from './BaseModel'

/**
 * Dirección postal/domicilio estructurada.
 */
export interface Direccion {
  /** Calle o avenida */
  calle?: string
  /** Número exterior o indicativo */
  numero?: string
  /** Barrio (ej: barrios de Medellín) */
  barrio?: string
  /** Comuna (ej: comunas de Medellín) */
  comuna?: string
  /** Ciudad */
  ciudad?: string
  /** Departamento / estado */
  departamento?: string
  /** País */
  pais?: string
  /** Código postal */
  codigo_postal?: string
  /** Coordenadas geográficas (lat/lng) */
  coordenadas?: {
    lat: number
    lng: number
  }
  /** Punto de referencia o indicaciones */
  referencia?: string
  /** Descripción libre adicional */
  descripcion?: string
}

/** Roles posibles del usuario en la plataforma */
export type RolUsuario = 'dueño' | 'paseador' | 'admin'

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
  /** Dirección postal/domicilio */
  direccion?: Direccion
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
