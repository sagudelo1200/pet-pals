import { useCallback, useState } from 'react'
import { ERRORES_ARCHIVO, GestorArchivos } from '@/logic/archivos/gestor'
import type { DimensionesImagen } from '@/services/imagen/preparar'
import type { TipoPerfilArchivo } from '@/functions/src/compartido/archivos'

export type EstadoArchivo = 'inactivo' | 'subiendo' | 'subida' | 'error'

/**
 * Sube, borra y muestra UN archivo de imagen en una ruta de Storage, para
 * cualquier uso. Quien lo usa decide la ruta (null = aún no se puede subir) y
 * el perfil de archivo (límites).
 */
export function useArchivo(ruta: string | null, perfil: TipoPerfilArchivo) {
  const [estado, setEstado] = useState<EstadoArchivo>('inactivo')
  const [error, setError] = useState<string | null>(null)

  const subir = useCallback(
    async (uri: string, dimensiones?: DimensionesImagen): Promise<boolean> => {
      if (!ruta) return false
      setEstado('subiendo')
      setError(null)
      const resultado = await GestorArchivos.subirImagen(ruta, uri, perfil, dimensiones)
      if (resultado.success) {
        setEstado('subida')
        return true
      }
      setEstado('error')
      setError(resultado.error ?? ERRORES_ARCHIVO.SUBIDA_FALLIDA)
      return false
    },
    [ruta, perfil]
  )

  const borrar = useCallback(async (): Promise<boolean> => {
    if (!ruta) return false
    const resultado = await GestorArchivos.borrar(ruta)
    if (resultado.success) {
      setEstado('inactivo')
      setError(null)
    } else {
      setError(resultado.error ?? ERRORES_ARCHIVO.SUBIDA_FALLIDA)
    }
    return resultado.success
  }, [ruta])

  /** Dirección para mostrar lo que ya se subió, o null si no se puede. */
  const obtenerVista = useCallback(async (): Promise<string | null> => {
    if (!ruta) return null
    const resultado = await GestorArchivos.obtenerUrl(ruta)
    return resultado.success && resultado.data ? resultado.data.url : null
  }, [ruta])

  return { estado, error, subir, borrar, obtenerVista }
}
