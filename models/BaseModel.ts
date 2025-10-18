/**
 * Representa la estructura base de un modelo en la aplicación.
 * Proporciona campos comunes que todas las entidades comparten.
 */
export interface BaseModel {
  /**
   * Identificador único del registro.
   */
  id: string;
  /**
   * Fecha y hora en que se creó el registro.
   */
  createdAt: Date;
  /**
   * Fecha y hora de la última actualización del registro.
   */
  updatedAt: Date;
  /**
   * ID del usuario que creó originalmente el registro.
   */
  createdBy?: string;
  /**
   * ID del usuario que realizó la última modificación.
   */
  updatedBy?: string;
}
