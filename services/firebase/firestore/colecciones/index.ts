/**
 * Exporta todos los servicios CRUD de colecciones
 * Facilita importaciones desde componentes React
 *
 * Uso:
 * import { ServicioMascota, ServicioPaseo } from '@/services/firebase/firestore/colecciones'
 */

// Consentimientos
export {
  ServicioDocumentoConsentimiento,
  ServicioConsentimiento,
} from './consentimiento'

// Mascotas
export { ServicioMascota } from './mascota'

// Paseos
export { ServicioPaseo } from './paseo'
export { ServicioPaseoMascota } from './paseo-mascota'

// Operaciones (genérico, padre de Paseo, Guardería, Vet, etc.)
export { ServicioOperacion } from './operacion'

// Chat
export { ServicioChat } from './chat'

// Excepciones de disponibilidad
export { ServicioExcepcionesDisponibilidad } from './excepciones_disponibilidad'

// Exploraciones territoriales
export { ServicioExploracionTerritorial } from './exploraciones'

// Perfiles públicos
export { ServicioPerfilPublico } from './perfiles_publicos'

// Coberturas de cuidadores
