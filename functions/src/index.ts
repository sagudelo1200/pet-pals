import {setGlobalOptions} from 'firebase-functions';

setGlobalOptions({maxInstances: 9});

// Auth
export {enviarOTP} from './auth/enviarOTP';
export {validarOTP} from './auth/validarOTP';

// Usuarios
export {actualizarPerfilPublico} from './usuarios/actualizar';

// Verificaciones
export {
  actualizarInsignias,
  actualizarInsigniasOnUpdate,
} from './verificaciones/actualizarInsignias';

// Paseos
export {
  onCrearPaseoDirecto,
  escalarPaseoIndividual,
} from './paseos/escalarSolicitudes';
export {onPaseoConfirmado} from './paseos/chat';
export {
  alFinalizarPaseoEntrega,
  avisarEntregaPendiente,
  revisarEntregaPendiente,
  cerrarEntregaAutomatico,
  resolverEntregaPendiente,
  abrirReclamoCobro,
  resolverReclamoCobro,
} from './paseos/entregaFunciones';

// Notificaciones (bandeja + push)
export {alCrearNotificacion} from './notificaciones/funciones';

// Evaluaciones
export {crearEvaluacion} from './evaluaciones/crearEvaluacion';
export {alCrearEvaluacion} from './evaluaciones/alCrearEvaluacion';
export {alCompletarPaseo} from './evaluaciones/alCompletarPaseo';
export {revelarEvaluacionVencida} from './evaluaciones/revelarEvaluacion';

// Consentimientos
export {registrarConsentimiento} from './consentimientos/registrarConsentimiento';
export {alArchivarConsentimiento} from './consentimientos/alArchivarConsentimiento';

// Administración: configuración operativa y versionado genérico
export {
  actualizarConfiguracion,
  publicarVersion,
  reactivarVersion,
} from './administracion/funciones';

// Economía (cobros, pagos y liquidaciones)
export {
  alCrearPaseoEconomia,
  alValidarEntregaEconomia,
  iniciarPagoOperacion,
  confirmarPagoOperacion,
  generarLiquidacionesAhora,
  pagarLiquidacion,
  reenviarDocumentoContable,
  revisarCobroTutor,
  ejecutarCorteLiquidacion,
} from './economia/funciones';

// Expediente de la mascota (conocimiento acumulado de los paseos)
export {
  alRegistrarMomentoExpediente,
  alCambiarEstadoPaseoExpediente,
  alActualizarMascotaExpediente,
  alBorrarMascotaExpediente,
  registrarLlegada,
  confirmarAprendizaje,
} from './expediente/funciones';

// Emparejamiento de mascota y cuidador
export {
  buscarCuidadores,
  aceptarPaseo,
  alCrearPaseoValidarCuidador,
} from './emparejamiento/funciones';
