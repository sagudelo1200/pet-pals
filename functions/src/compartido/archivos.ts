/* eslint-disable camelcase */
/**
 * PERFILES DE ARCHIVO: cuánto puede pesar y cómo se prepara cada clase de
 * archivo que Paw-Path guarda en Storage. Compartido por la app y las reglas
 * (storage.rules repite estos límites; un test comprueba que coinciden).
 *
 * Es el único lugar que describe "una clase de archivo": agregar una (foto de
 * perfil, foto de entrega, foto de mascota...) es una entrada aquí, un bloque
 * en storage.rules para su ruta y una llamada a GestorArchivos con su ruta.
 * Nada de esto sabe para qué se usa el archivo.
 */

export interface PerfilArchivo {
  /** Tamaño máximo de un archivo, en MB. */
  max_mb: number
  /** Tipos de contenido que acepta la regla de Storage. */
  tipos: string[]
  /** Lado más largo (px) al que se reduce una imagen antes de subirla. */
  lado_max: number
  /** Calidad JPEG (0-1) con la que se recomprime. */
  calidad: number
}

export const PERFILES_ARCHIVO = {
  /** Fotos de documentos de las solicitudes de servicio (identidad, ...). */
  evidencia: {
    max_mb: 5,
    tipos: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
    lado_max: 1600,
    calidad: 0.7,
  },
  /** Foto del grupo que el cuidador sube al terminar un paseo. */
  foto_entrega: {
    max_mb: 3,
    tipos: ['image/jpeg', 'image/png', 'image/webp'],
    lado_max: 1600,
    calidad: 0.7,
  },
} satisfies Record<string, PerfilArchivo>;

export type TipoPerfilArchivo = keyof typeof PERFILES_ARCHIVO;

/**
 * Nombre de un archivo dentro de su carpeta: fijo por uso (frente, reverso...),
 * así reemplazar no acumula copias. storage.rules repite este patrón.
 */
export const NOMBRE_ARCHIVO = /^[a-z0-9_]{1,30}$/;
