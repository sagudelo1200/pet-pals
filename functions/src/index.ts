import { setGlobalOptions } from 'firebase-functions'

setGlobalOptions({ maxInstances: 9 })

// Auth
export { enviarOTP } from './auth/enviarOTP'
export { validarOTP } from './auth/validarOTP'

// Usuarios
export { actualizarPerfilPublico } from './usuarios/actualizar'

// Verificaciones
export {
  actualizarInsignias,
  actualizarInsigniasOnUpdate,
} from './verificaciones/actualizarInsignias'

// Paseos
export {
  onCrearPaseoDirecto,
  escalarPaseoIndividual,
} from './paseos/escalarSolicitudes'
export { onPaseoConfirmado } from './paseos/chat'

// Evaluaciones
export { crearEvaluacion } from './evaluaciones/crearEvaluacion'
export { alCrearEvaluacion } from './evaluaciones/alCrearEvaluacion'
