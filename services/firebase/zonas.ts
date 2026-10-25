/**
 * Zonas de negocio (lado app). Crear o editar una zona (admin) pasa por el
 * servidor: él valida, evita que dos zonas se adueñen de la misma celda y deja
 * el índice y el historial al día. También: si se atiende una celda y "avísame
 * cuando lleguemos" (tutor o cuidador).
 */
import { llamarCallable } from './callable'
import type {
  EstadoServicio,
  EstadoZona,
  RolInteres,
} from '@/functions/src/compartido/zonas'

export interface EntradaGuardarZona {
  /** Sin id se crea una zona nueva. */
  id?: string
  nombre: string
  ciudad: string
  estado: EstadoZona
  celdas: string[]
  excluidas: string[]
  /** Queda en el historial de la zona. */
  motivo: string
}

export const guardarZona = llamarCallable<
  EntradaGuardarZona,
  { id: string; agregadas: number; quitadas: number }
>('guardarZona')

/** ¿Se atiende en esta celda de cobertura? */
export const consultarServicio = llamarCallable<
  { celda: string },
  EstadoServicio
>('consultarServicio')

/**
 * "Avísame cuando lleguemos": queda registrado como interesado y recibe un
 * aviso cuando la zona abra.
 */
export const avisarCuandoLleguen = llamarCallable<
  { celda: string; rol: RolInteres },
  { ok: boolean }
>('avisarCuandoLleguen')
