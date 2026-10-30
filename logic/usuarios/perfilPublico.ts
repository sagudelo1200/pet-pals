import { ServicioPerfilPublico } from '@/services/firebase/firestore/colecciones/perfiles_publicos'
import { ServicioCrudBase } from '@/services/firebase/firestore/base'
import { PerfilPublico } from '@/models/PerfilPublico'
import { CrudResult } from '@/services/firebase/comun'
import { ERR } from '@/constants'
import { ofreceServicio } from '@/functions/src/compartido/habilitacion'
import { TIPO_PASEO } from '@/functions/src/compartido/servicios'
import {
  RADIOS_COBERTURA,
  errorDeCobertura,
} from '@/functions/src/compartido/geografia'

/**
 * Gestor de Perfiles Públicos (Cuidadores).
 * Maneja la lógica de visibilidad, filtros y sincronización de perfiles.
 */
export class GestorPerfilPublico {
  /**
   * Cuidadores habilitados para pasear, con mejor calificación primero. Usa la
   * puerta única (`ofreceServicio`): quien tiene la habilitación vencida no
   * aparece aunque su perfil todavía la liste.
   * Sin ordenar en la consulta (así no hace falta un índice compuesto): se
   * ordena aquí.
   */
  static async obtenerCuidadoresDisponibles(
    ahoraMs: number = Date.now()
  ): Promise<CrudResult<PerfilPublico[]>> {
    const res = await ServicioPerfilPublico.buscarPerfiles(
      [
        {
          campo: 'servicios_habilitados',
          op: 'array-contains',
          valor: TIPO_PASEO,
        },
      ],
      undefined,
      50
    )
    if (!res.success || !res.data) return res
    return {
      success: true,
      data: res.data
        .filter(p => ofreceServicio(p, TIPO_PASEO, ahoraMs))
        .sort((a, b) => (b.rating_promedio ?? 0) - (a.rating_promedio ?? 0)),
    }
  }

  /**
   * Obtiene el perfil público de un usuario por su ID.
   */
  static async obtenerPorId(id: string): Promise<CrudResult<PerfilPublico>> {
    return ServicioPerfilPublico.obtenerPorId(id)
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
   * Guarda el radio de atención del cuidador. Elegir un radio reemplaza lo que
   * hubiera elegido a mano. El servidor actualiza el índice a partir del perfil.
   * @param uid ID del cuidador
   * @param radio Anillos de celdas alrededor de su casa (1 o 2)
   * @param h3OrigenFallback Origen a guardar si el perfil aún no tiene `h3_r8`
   */
  static async actualizarRadioCobertura(
    uid: string,
    radio: number,
    h3OrigenFallback?: string | null
  ): Promise<CrudResult<PerfilPublico>> {
    if (!uid) return { success: false, error: ERR.COMUN.NO_AUTENTICADO }
    if (!(RADIOS_COBERTURA as readonly number[]).includes(radio)) {
      return { success: false, error: ERR.COMUN.DATOS_INVALIDOS }
    }

    const perfilRes = await ServicioCrudBase.obtenerPorId<PerfilPublico>(
      'perfiles_publicos',
      uid
    )
    if (!perfilRes.success || !perfilRes.data) {
      return { success: false, error: 'Perfil no encontrado' }
    }
    const h3Origen = perfilRes.data.h3_r8 ?? h3OrigenFallback ?? null
    if (!h3Origen) {
      return { success: false, error: ERR.COMUN.DATOS_INVALIDOS }
    }

    return ServicioPerfilPublico.guardarConId(uid, {
      radio_cobertura: radio,
      celdas_cobertura: [],
      h3_r8: h3Origen,
    })
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

    // Una cobertura vacía el servidor la lee como "el vecindario de casa": la
    // pantalla mostraría una cosa y el sistema haría otra
    const problema = errorDeCobertura(celdasNuevas)
    if (problema) {
      return { success: false, error: ERR.COMUN.DATOS_INVALIDOS }
    }

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
