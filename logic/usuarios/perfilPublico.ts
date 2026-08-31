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
import { H3TerritorialOrchestrator } from '@/services/h3'

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
   * Actualiza el perfil del cuidador y sincroniza su cobertura geoespacial en el índice H3.
   * Si `h3OrigenNuevo` cambió respecto al anterior, migra las celdas de cobertura (atómicamente).
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

      // Solo procesar cambio si h3 cambió
      if (h3OrigenAnterior && h3OrigenAnterior !== h3OrigenNuevo) {
        const perfil = perfilActual.data

        // Construir datos sin undefined (solo incluir campos si existen)
        const datosEntrada = {
          nombre: (datos as any).nombre ?? perfil?.nombre ?? '',
          rating_promedio:
            (datos as any).rating_promedio ?? perfil?.rating_promedio ?? 0,
          tarifa_por_hora:
            (datos as any).tarifa_por_hora ?? perfil?.tarifa_por_hora ?? 0,
        } as any

        // Agregar campos opcionales solo si existen
        const fotoParaGuardar = (datos as any).foto ?? perfil?.foto
        if (fotoParaGuardar) {
          datosEntrada.foto = fotoParaGuardar
        }

        if (perfil?.insignias_verificacion) {
          datosEntrada.insignias_verificacion = perfil.insignias_verificacion
        }

        const horarioParaGuardar =
          (datos as any).horario_semanal ?? perfil?.horario_semanal
        if (horarioParaGuardar) {
          datosEntrada.horario_semanal = horarioParaGuardar
        }

        // Usar orquestador: operación atómica con retry automático
        const exito = await H3TerritorialOrchestrator.procesarCambioCobertura(
          uid,
          h3OrigenNuevo,
          h3OrigenAnterior,
          datosEntrada
        )

        if (!exito) {
          console.warn(
            `[h3] Fallo migrar cobertura para ${uid}: ${h3OrigenAnterior} → ${h3OrigenNuevo}`
          )
        }
      }
    }

    const datosConH3: Partial<PerfilPublico> = h3OrigenNuevo
      ? { ...datos, h3_r8: h3OrigenNuevo }
      : datos

    return ServicioPerfilPublico.guardarConId(uid, datosConH3)
  }

  /**
   * Actualiza las celdas de cobertura seleccionadas manualmente por el cuidador.
   * @param uid ID del cuidador
   * @param celdasNuevas Array de celdas H3 seleccionadas
   * @param h3OrigenFallback Fallback de h3_r8 si el perfil no lo tiene guardado aún
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

    const perfil = perfilRes.data
    const h3Origen = perfil.h3_r8 ?? h3OrigenFallback ?? null
    if (!h3Origen) {
      return {
        success: false,
        error:
          'El cuidador no tiene ubicación configurada. Agrega una dirección principal en tu perfil.',
      }
    }

    // Celdas anteriores: las manuales si existen, si no el gridDisk automático
    const celdasAnteriores = perfil.celdas_cobertura?.length
      ? perfil.celdas_cobertura
      : celdasDeCobertura(h3Origen)

    // Construir datos sin undefined
    const datosEntrada = {
      nombre: perfil.nombre,
      rating_promedio: perfil.rating_promedio ?? 0,
      tarifa_por_hora: perfil.tarifa_por_hora ?? 0,
    } as any

    // Agregar campos opcionales
    if (perfil.foto) {
      datosEntrada.foto = perfil.foto
    }
    if (perfil.insignias_verificacion) {
      datosEntrada.insignias_verificacion = perfil.insignias_verificacion
    }
    if (perfil.horario_semanal) {
      datosEntrada.horario_semanal = perfil.horario_semanal
    }

    // Usar orquestador con retry automático
    const exito =
      await H3TerritorialOrchestrator.procesarCambioCoberturaManuales(
        uid,
        h3Origen,
        celdasNuevas,
        celdasAnteriores,
        datosEntrada
      )

    if (!exito) {
      console.warn(`[h3] Fallo actualizar celdas manuales para ${uid}`)
    }

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
