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
export { ServicioPerfilPublico } from './firestore/colecciones/perfil-publico'
export { ServicioUbicacion } from './firestore/colecciones/ubicacion'
export { ServicioPaseoMascota } from './firestore/colecciones/paseo-mascota'

// Auth
export { ServicioAuth } from './auth/auth'

// Tipos y converters
export * from './comun'
