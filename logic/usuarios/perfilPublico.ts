import { ServicioPerfilPublico } from '@/services/firebase/firestore/colecciones/perfiles_publicos'
import { ServicioCrudBase } from '@/services/firebase/firestore/base'
import { PerfilPublico } from '@/models/PerfilPublico'
import { CrudResult } from '@/services/firebase/comun'
import { ERR } from '@/constants'

/**
 * Gestor de Perfiles Públicos (Cuidadores).
 * Maneja la lógica de visibilidad, filtros y sincronización de perfiles.
 */
export class GestorPerfilPublico {
  /**
   * Obtiene la lista de paseadores verificados (con IDENTIDAD verificada), ordenados por rating.
   * VALIDACIÓN: insignias_verificacion debe contener 'IDENTIDAD' (no solo EMAIL).
   * Ejemplo: Un tutor solo puede solicitar paseos a cuidadores con identidad verificada.
   */
  static async obtenerCuidadoresDestacados(
    limite: number = 20
  ): Promise<CrudResult<PerfilPublico[]>> {
    return ServicioPerfilPublico.buscarPerfiles(
      [
        {
          campo: 'insignias_verificacion',
          op: 'array-contains',
          valor: 'IDENTIDAD',
        },
      ],
      { campo: 'rating_promedio', dir: 'desc' },
      limite
    )
  }

  /**
   * Obtiene cuidadores disponibles y verificados (con IDENTIDAD verificada).
   * VALIDACIÓN: insignias_verificacion debe contener 'IDENTIDAD'.
   * Usado para filtrado de disponibilidad en búsqueda de paseos.
   */
  static async obtenerCuidadoresDisponibles(): Promise<
    CrudResult<PerfilPublico[]>
  > {
    return ServicioPerfilPublico.buscarPerfiles(
      [
        {
          campo: 'insignias_verificacion',
          op: 'array-contains',
          valor: 'IDENTIDAD',
        },
      ],
      { campo: 'rating_promedio', dir: 'desc' },
      21
    )
  }

  /**
   * Obtiene el perfil público de un usuario por su ID.
   */
  static async obtenerPorId(id: string): Promise<CrudResult<PerfilPublico>> {
    return ServicioPerfilPublico.obtenerPorId(id)
  }

  /**
   * Asegura que un usuario tenga un perfil público básico.
   * Se usa durante el registro o cambio de rol.
   */
  static async inicializarPerfil(
    uid: string,
    datos: Partial<PerfilPublico>
  ): Promise<CrudResult<PerfilPublico>> {
    if (!uid) return { success: false, error: ERR.COMUN.NO_AUTENTICADO }

    // Lógica: si no tiene nombre, usar un fallback
    const payload: Partial<PerfilPublico> = {
      ...datos,
      rating_promedio: datos.rating_promedio || 0,
      cantidad_paseos_realizados: datos.cantidad_paseos_realizados || 0,
    }

    return ServicioPerfilPublico.guardarConId(uid, payload)
  }

  /**
   * Actualiza el perfil público.
   */
  static async actualizar(
    uid: string,
    datos: Partial<PerfilPublico>
  ): Promise<CrudResult<PerfilPublico>> {
    if (!uid) return { success: false, error: ERR.COMUN.NO_AUTENTICADO }
    return ServicioPerfilPublico.guardarConId(uid, datos)
  }

  /**
   * Actualiza el perfil del cuidador. Si cambió su zona de origen (`h3_r8`),
   * la guarda con el perfil. El índice de cobertura y la oferta de la zona los
   * mantiene el servidor al ver el cambio en el perfil: la app no escribe
   * ninguno de los dos.
   */
  static async actualizarCoberturaYPerfil(
    uid: string,
    datos: Partial<PerfilPublico>,
    h3OrigenNuevo: string | null
  ): Promise<CrudResult<PerfilPublico>> {
    if (!uid) return { success: false, error: ERR.COMUN.NO_AUTENTICADO }

    const datosConH3: Partial<PerfilPublico> = h3OrigenNuevo
      ? { ...datos, h3_r8: h3OrigenNuevo }
      : datos

    return ServicioPerfilPublico.guardarConId(uid, datosConH3)
  }

  /**
   * Guarda las celdas de cobertura que el cuidador eligió a mano. El servidor
   * actualiza el índice a partir del perfil.
   * @param uid ID del cuidador
   * @param celdasNuevas Celdas H3 seleccionadas
   * @param h3OrigenFallback Origen a guardar si el perfil aún no tiene `h3_r8`
   */
  static async actualizarCeldasCobertura(
    uid: string,
    celdasNuevas: string[],
    h3OrigenFallback?: string | null
  ): Promise<CrudResult<PerfilPublico>> {
    if (!uid) return { success: false, error: ERR.COMUN.NO_AUTENTICADO }

    const perfilRes = await ServicioCrudBase.obtenerPorId<PerfilPublico>(
      'perfiles_publicos',
      uid
    )
    if (!perfilRes.success || !perfilRes.data) {
      return { success: false, error: 'Perfil no encontrado' }
    }

    const h3Origen = perfilRes.data.h3_r8 ?? h3OrigenFallback ?? null
    if (!h3Origen) {
      return {
        success: false,
        error:
          'El cuidador no tiene ubicación configurada. Agrega una dirección principal en tu perfil.',
      }
    }

    return ServicioPerfilPublico.guardarConId(uid, {
      celdas_cobertura: celdasNuevas,
      h3_r8: h3Origen,
    })
  }
}
