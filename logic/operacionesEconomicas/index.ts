export {
  validateI1,
  validateI2,
  validateI3,
  validateI4,
  validateI5,
} from './invariantes'

// Exportar funciones de casosDeUso sin re-exportar desde index (evita ciclo de require)
export {
  crearOperacionEconomica,
  asignarCuidador,
  registrarServicioEjecutado,
  registrarRecaudo,
  generarObligacion,
  ejecutarPago,
  cerrarOperacion,
  cancelarOperacion,
} from './casosDeUso'
