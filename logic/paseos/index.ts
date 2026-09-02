// Barrel del dominio de paseos.
// La fachada `GestorPaseos` vive aquí (no en gestor.ts) para evitar el ciclo
// de importación gestor <-> casosDeUso (los casos de uso consumen paseoActivo).
import { paseoActivo } from './gestor'
import {
  CODIGOS_ERROR_PASEO,
  MENSAJES_ERROR_FALLBACK,
  obtenerClaveI18nError,
} from './errores'
import {
  crearConMascotas,
  aceptarSolicitud,
  iniciarRuta,
  iniciarPaseo,
  finalizarPaseo,
  agregarMascota,
  obtenerEstadisticasCuidador,
  completarPaseo,
  rechazarPaseo,
  validarCodigoRecogida,
} from './casosDeUso'
import {
  obtenerQueryPaseosTutor,
  obtenerQuerySolicitudesPendientes,
  obtenerQueryAgendaCuidador,
  obtenerQueryHistorialCuidador,
  obtenerQueryMonitorPaseoGlobal,
} from './queries'

export { paseoActivo } from './gestor'
export * from './errores'
export * from './queries'
export * from './casosDeUso'
export * from './seguimiento'
export * from './maquinaEstados'
export * from './matching'

export const GestorPaseos = {
  paseoActivo,
  CODIGOS_ERROR_PASEO,
  MENSAJES_ERROR_FALLBACK,
  obtenerClaveI18nError,
  crearConMascotas,
  aceptarSolicitud,
  iniciarRuta,
  iniciarPaseo,
  finalizarPaseo,
  agregarMascota,
  obtenerEstadisticasCuidador,
  completarPaseo,
  rechazarPaseo,
  validarCodigoRecogida,
  obtenerQueryPaseosTutor,
  obtenerQuerySolicitudesPendientes,
  obtenerQueryAgendaCuidador,
  obtenerQueryHistorialCuidador,
  obtenerQueryMonitorPaseoGlobal,
}
