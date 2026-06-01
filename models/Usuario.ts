import { BaseModel } from './BaseModel'
import { UbicacionRef } from './Ubicacion'

/** Roles posibles del usuario en la plataforma */
export type RolUsuario = 'admin' | 'tutor' | 'cuidador' | 'explorador'

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
  id_ubicacion_principal?: string
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
