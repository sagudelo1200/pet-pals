/**
 * Representa la estructura base de un modelo en la aplicación.
 * Proporciona campos comunes que todas las entidades comparten.
 */
export interface BaseModel {
  /**
   * Identificador único del registro.
   */
  id: string
  /**
   * Fecha y hora en que se creó el registro.
   */
  createdAt: Date
  /**
   * Fecha y hora de la última actualización del registro.
   */
  updatedAt: Date
  /**
   * ID del usuario que creó originalmente el registro.
   */
  createdBy?: string
  /**
   * ID del usuario que realizó la última modificación.
   */
  updatedBy?: string
}

/**
 * Nota de persistencia:
 * - En Firestore los campos de fecha se almacenan como `Timestamp`.
 * - En la capa de dominio/UI (estos modelos) las fechas son `Date`.
 * La conversión se hace automáticamente en la capa CRUD con utilidades
 * que transforman `Timestamp`↔`Date` de forma recursiva.
 */

// (Opcional, referencia) Tipo equivalente en capa de datos/Firebase
// export interface BaseModelDb {
//   id: string
//   createdAt: import('firebase/firestore').Timestamp
//   updatedAt: import('firebase/firestore').Timestamp
//   createdBy?: string
//   updatedBy?: string
// }
