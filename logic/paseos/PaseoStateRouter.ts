import { Paseo, PaseoStatus } from '@/models/Paseo'
import { RolUsuario } from '@/models/Usuario'

/**
 * Tipos de experiencia que el router puede dictar.
 */
export type TipoExperiencia = 'PANTALLA' | 'MODAL' | 'NINGUNA'

/**
 * Identificadores únicos para las experiencias (Pantallas o Modales).
 * Estos IDs deben mapearse luego a componentes reales en la capa de UI.
 */
export type IdExperiencia =
  // Modales Tutor
  | 'EsperandoCuidador'
  | 'PreparacionPaseo'
  | 'ResumenPaseo'
  | 'DetalleHistorico'
  | 'AvisoCancelacion'
  // Modales Cuidador
  | 'SolicitudRecibida'
  | 'ConfirmarInicio'
  // Pantallas Tutor
  | 'PaseoActivo'
  // Pantallas Cuidador
  | 'ControlPaseo'
  // Fallback
  | 'Desconocido'

/**
 * Configuración adicional para la experiencia.
 */
export interface ConfiguracionExperiencia {
  mostrarMapa: boolean
  esInteractivo: boolean
  titulo?: string
}

/**
 * Objeto de decisión que retorna el Router.
 */
export interface ExperienciaPaseo {
  tipo: TipoExperiencia
  id: IdExperiencia
  configuracion: ConfiguracionExperiencia
}

/**
 * Configuración por defecto para evitar nulos.
 */
const SIN_EXPERIENCIA: ExperienciaPaseo = {
  tipo: 'NINGUNA',
  id: 'Desconocido',
  configuracion: { mostrarMapa: false, esInteractivo: false },
}

/**
 * State Router del Paseo.
 * Decide qué experiencia mostrar basándose en el estado del paseo y el rol del usuario.
 *
 * @param paseo Objeto del paseo actual.
 * @param rol Rol del usuario activo (tutor o cuidador).
 * @returns Objeto ExperienciaPaseo con la decisión.
 */
export const obtenerExperienciaPaseo = (
  paseo: Paseo | null | undefined,
  rol: RolUsuario | null | undefined
): ExperienciaPaseo => {
  if (!paseo || !paseo.estado || !rol) {
    return SIN_EXPERIENCIA
  }

  const { estado } = paseo

  // ---------------------------------------------------------
  // 1. Estados Comunes (Independientes del Rol)
  // ---------------------------------------------------------
  switch (estado) {
    case PaseoStatus.FINALIZADO:
      return {
        tipo: 'MODAL',
        id: 'ResumenPaseo',
        configuracion: { mostrarMapa: false, esInteractivo: true },
      }
    case PaseoStatus.COMPLETADO:
      return {
        tipo: 'MODAL',
        id: 'DetalleHistorico',
        configuracion: { mostrarMapa: false, esInteractivo: false },
      }
    case PaseoStatus.CANCELADO:
    case PaseoStatus.ERROR:
      return {
        tipo: 'MODAL',
        id: 'AvisoCancelacion',
        configuracion: { mostrarMapa: false, esInteractivo: true },
      }
  }

  // ---------------------------------------------------------
  // 2. Lógica Específica por Rol
  // ---------------------------------------------------------

  // TUTOR
  if (rol === 'tutor') {
    switch (estado) {
      case PaseoStatus.PENDIENTE:
        return {
          tipo: 'MODAL',
          id: 'EsperandoCuidador',
          configuracion: { mostrarMapa: false, esInteractivo: true },
        }
      case PaseoStatus.CONFIRMADO:
        return {
          tipo: 'MODAL',
          id: 'PreparacionPaseo',
          configuracion: { mostrarMapa: false, esInteractivo: true },
        }
      case PaseoStatus.EN_RUTA:
      case PaseoStatus.EN_PROGRESO:
        return {
          tipo: 'PANTALLA',
          id: 'PaseoActivo',
          configuracion: { mostrarMapa: true, esInteractivo: true },
        }
    }
  }

  // CUIDADOR
  if (rol === 'cuidador') {
    switch (estado) {
      case PaseoStatus.PENDIENTE:
        return {
          tipo: 'MODAL',
          id: 'SolicitudRecibida',
          configuracion: { mostrarMapa: false, esInteractivo: true },
        }
      case PaseoStatus.CONFIRMADO:
      case PaseoStatus.EN_RUTA:
      case PaseoStatus.EN_PROGRESO:
        return {
          tipo: 'PANTALLA',
          id: 'ControlPaseo',
          configuracion: { mostrarMapa: true, esInteractivo: true },
        }
    }
  }

  return SIN_EXPERIENCIA
}
