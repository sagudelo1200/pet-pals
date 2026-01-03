import { nowServerTimestamp } from './converters'
import { ServicioAuth } from '@/services/firebase/auth/auth'

export interface CamposSistemaCreacion {
  creado_en: any
  actualizado_en: any
  creado_por: string | undefined
  actualizado_por: string | undefined
}

export interface CamposSistemaActualizacion {
  actualizado_en: any
  actualizado_por: string | undefined
}

/**
 * Genera los campos de sistema para la creación de un documento.
 * Si no se proporciona uid, intenta obtenerlo del usuario actual.
 * @param uid (Opcional) UID del usuario creador.
 */
export const camposSistemaCrear = (uid?: string): CamposSistemaCreacion => {
  const userId = uid ?? ServicioAuth.obtenerUsuarioActual()?.uid
  const now = nowServerTimestamp()
  return {
    creado_en: now,
    actualizado_en: now,
    creado_por: userId,
    actualizado_por: userId,
  }
}

/**
 * Genera los campos de sistema para la actualización de un documento.
 * Si no se proporciona uid, intenta obtenerlo del usuario actual.
 * @param uid (Opcional) UID del usuario que actualiza.
 */
export const camposSistemaActualizar = (
  uid?: string
): CamposSistemaActualizacion => {
  const userId = uid ?? ServicioAuth.obtenerUsuarioActual()?.uid
  return {
    actualizado_en: nowServerTimestamp(),
    actualizado_por: userId,
  }
}
