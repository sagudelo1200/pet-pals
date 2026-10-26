/**
 * Foto de entrega del paseo (evidencia de cierre).
 *
 * Storage ya está habilitado (ver ServicioArchivos, el único punto que habla con
 * él) pero esta foto aún no tiene reglas ni ruta en storage.rules: mientras
 * tanto responde de forma explícita que no está disponible (no finge guardar).
 *
 * Ruta prevista: paseos/{paseoId}/entrega/grupo.jpg (foto del grupo) y
 * paseos/{paseoId}/entrega/{mascotaId}.jpg (foto individual opcional).
 */

export type ResultadoFotoEntrega =
  { success: true; url: string } | { success: false; error: string }

export const ERROR_STORAGE_NO_HABILITADO = 'STORAGE_NO_HABILITADO'

export async function subirFotoEntrega(
  _paseoId: string,
  _uri: string,
  _mascotaId?: string
): Promise<ResultadoFotoEntrega> {
  return { success: false, error: ERROR_STORAGE_NO_HABILITADO }
}
