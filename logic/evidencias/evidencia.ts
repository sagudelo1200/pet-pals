/**
 * Evidencia de las solicitudes de servicio (fotos de documentos): qué archivo
 * se puede subir y a dónde. Es lo ÚNICO propio de este dominio; subir, comprimir
 * y mostrar el archivo lo hace la capa de archivos (logic/archivos).
 */
import {
  esTipoServicio,
  requisitoDe,
  rutaEvidencia,
} from '@/functions/src/compartido/servicios'

export interface DestinoEvidencia {
  uid: string
  servicio: string
  requisito: string
  archivo: string
}

/**
 * Ruta de Storage de un archivo, si el catálogo lo pide. Un servicio,
 * requisito o archivo que no existe no tiene ruta: nada se sube "a ciegas".
 * @param destino Dueño y archivo de destino.
 * @return Ruta, o null si el catálogo no pide ese archivo.
 */
export function rutaDeDestino(destino: DestinoEvidencia): string | null {
  const { uid, servicio, requisito, archivo } = destino
  if (!uid || !esTipoServicio(servicio)) return null
  const definicion = requisitoDe(servicio, requisito)
  if (!definicion || !definicion.evidencia.includes(archivo)) return null
  return rutaEvidencia(uid, servicio, requisito, archivo)
}
