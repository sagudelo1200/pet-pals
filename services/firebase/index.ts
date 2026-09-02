// Servicio base (Firestore)
export { ServicioCrudBase } from './firestore/base'

// Realtime DB (RTDB)
export { ServicioRealtime } from './rtdb'
export { RUTAS_REALTIME } from './rtdb'

// Utilidades compartidas
export { ahoraRealtime } from './comun'

// Servicios Firestore - colecciones
export { ServicioMascota } from './firestore/colecciones/mascota'
export { ServicioUsuario } from './firestore/colecciones/usuario'
export {
  ServicioPaseo,
  ServicioPaseo as default,
} from './firestore/colecciones/paseo'
export { ServicioPerfilPublico } from './firestore/colecciones/perfiles_publicos'
export { ServicioUbicacion } from './firestore/colecciones/ubicacion'
export { ServicioPaseoMascota } from './firestore/colecciones/paseo-mascota'
export { ServicioChat } from './firestore/colecciones/chat'
export { ServicioExploracionTerritorial } from './firestore/colecciones/exploraciones'
export { ServicioVerificaciones } from './firestore/colecciones/verificaciones'
export { ServicioResumenEvaluacion } from './firestore/colecciones/resumenes_evaluacion'

// Auth
export { ServicioAuth } from './auth/auth'

// Tipos y converters
export * from './comun'
