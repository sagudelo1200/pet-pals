import { ServicioPerfilPublico } from '@/services/firebase/firestore/colecciones/perfiles_publicos'
import { ServicioCrudBase } from '@/services/firebase/firestore/base'
import {
  ServicioIndiceCobertura,
  type EntradaCuidadorCobertura,
} from '@/services/firebase/firestore/colecciones/indice_cobertura'
import { PerfilPublico } from '@/models/PerfilPublico'
import { CrudResult } from '@/services/firebase/comun'
import { ERR } from '@/constants'
import { celdasDeCobertura } from '@/services/geo'

/**
 * Gestor de Perfiles Públicos (Cuidadores).
 * Maneja la lógica de visibilidad, filtros y sincronización de perfiles.
 */
export class GestorPerfilPublico {
  /**
   * Obtiene la lista de cuidadores verificados ordenados por rating.
   */
  static async obtenerCuidadoresDestacados(
    limite: number = 20
  ): Promise<CrudResult<PerfilPublico[]>> {
    return ServicioPerfilPublico.buscarPerfiles(
      [{ campo: 'verificacion', op: '==', valor: 'verificado' }],
      { campo: 'rating_promedio', dir: 'desc' },
      limite
    )
  }

  /**
   * Obtiene cuidadores que tienen disponibilidad configurada.
   */
  static async obtenerCuidadoresDisponibles(): Promise<
    CrudResult<PerfilPublico[]>
  > {
    return ServicioPerfilPublico.buscarPerfiles(
      [{ campo: 'verificacion', op: '==', valor: 'verificado' }],
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
      verificacion: datos.verificacion || 'pendiente',
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
   * Actualiza el perfil del cuidador y sincroniza su cobertura geoespacial en el índice H3.
   * Si `h3OrigenNuevo` cambió respecto al anterior, migra las 19 celdas de cobertura.
   */
  static async actualizarCoberturaYPerfil(
    uid: string,
    datos: Partial<PerfilPublico>,
    h3OrigenNuevo: string | null
  ): Promise<CrudResult<PerfilPublico>> {
    if (!uid) return { success: false, error: ERR.COMUN.NO_AUTENTICADO }

    if (h3OrigenNuevo) {
      // Leer el perfil actual para detectar si cambió el h3_r8
      const perfilActual = await ServicioCrudBase.obtenerPorId<PerfilPublico>(
        'perfiles_publicos',
        uid
      )
      const h3OrigenAnterior = perfilActual.success
        ? ((perfilActual.data as any)?.h3_r8 ?? null)
        : null

      if (h3OrigenAnterior && h3OrigenAnterior !== h3OrigenNuevo) {
        // Migrar: eliminar cobertura antigua antes de escribir la nueva
        await ServicioIndiceCobertura.eliminarCoberturaWalker(
          h3OrigenAnterior,
          uid
        )
      }

      // Solo escribir cobertura si el origen cambió (o si es la primera vez)
      // Evita double-counting de cuidadores_count cuando el perfil se actualiza
      // sin cambiar de dirección.
      if (h3OrigenNuevo !== h3OrigenAnterior) {
        const perfil = perfilActual.data

        await ServicioIndiceCobertura.escribirCoberturaWalker(
          uid,
          h3OrigenNuevo,
          {
            nombre: (datos as any).nombre ?? perfil?.nombre ?? '',
            foto: (datos as any).foto ?? perfil?.foto,
            rating_promedio:
              (datos as any).rating_promedio ?? perfil?.rating_promedio ?? 0,
            tarifa_por_hora:
              (datos as any).tarifa_por_hora ?? perfil?.tarifa_por_hora ?? 0,
            verificacion:
              (datos as any).verificacion ??
              perfil?.verificacion ??
              'pendiente',
            horario_semanal:
              (datos as any).horario_semanal ?? perfil?.horario_semanal,
          }
        )
      }
    }

    const datosConH3: Partial<PerfilPublico> = h3OrigenNuevo
      ? { ...datos, h3_r8: h3OrigenNuevo }
      : datos

    return ServicioPerfilPublico.guardarConId(uid, datosConH3)
  }

  /**
   * Actualiza las celdas de cobertura seleccionadas manualmente por el cuidador.
   * Migra el índice H3 eliminando celdas anteriores y escribiendo las nuevas.
   */
  static async actualizarCeldasCobertura(
    uid: string,
    celdasNuevas: string[]
  ): Promise<CrudResult<PerfilPublico>> {
    if (!uid) return { success: false, error: ERR.COMUN.NO_AUTENTICADO }

    const perfilRes = await ServicioCrudBase.obtenerPorId<PerfilPublico>(
      'perfiles_publicos',
      uid
    )
    if (!perfilRes.success || !perfilRes.data) {
      return { success: false, error: 'Perfil no encontrado' }
    }

    const perfil = perfilRes.data
    const h3Origen = perfil.h3_r8
    if (!h3Origen) {
      return {
        success: false,
        error: 'El cuidador no tiene ubicación configurada',
      }
    }

    // Celdas anteriores: las manuales si existen, si no el gridDisk automático
    const celdasAnteriores = perfil.celdas_cobertura?.length
      ? perfil.celdas_cobertura
      : celdasDeCobertura(h3Origen)

    await ServicioIndiceCobertura.escribirCeldasManuales(
      uid,
      h3Origen,
      celdasNuevas,
      celdasAnteriores,
      {
        nombre: perfil.nombre,
        foto: perfil.foto,
        rating_promedio: perfil.rating_promedio ?? 0,
        tarifa_por_hora: perfil.tarifa_por_hora ?? 0,
        verificacion: perfil.verificacion,
        horario_semanal: perfil.horario_semanal,
      }
    )

    return ServicioPerfilPublico.guardarConId(uid, {
      celdas_cobertura: celdasNuevas,
    })
  }

  /**
   * Obtiene los cuidadores cuya cobertura H3 incluye la celda indicada.
   * Resolución O(1): un getDocs sobre la subcolección `/indice_cobertura/{celda}/cuidadores`.
   */
  static async obtenerCuidadoresPorH3(
    indiceCelda: string
  ): Promise<CrudResult<EntradaCuidadorCobertura[]>> {
    return ServicioIndiceCobertura.obtenerCuidadoresPorCelda(indiceCelda)
  }
}
