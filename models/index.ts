/**
 * Central export point for all domain models
 * Allows: import { RolUsuario, Usuario, ... } from '@/models'
 */

export { type RolUsuario, type Usuario } from './Usuario'
export { type Mascota } from './Mascota'
export {
  type Paseo,
  type TipoPaseo,
  type ModalidadPaseo,
  ESTADOS_PASEO,
} from './Paseo'
export { type PaseoMascota } from './PaseoMascota'
export { type PerfilPublico } from './PerfilPublico'
export {
  type Conversacion,
  type Mensaje,
  type ListaMensajes,
  type TipoMensaje,
} from './Chat'
export {
  type ExploracionTerritorial,
  type TipoPunto,
  type NivelObservable,
  type EstadoExploracion,
} from './ExploracionTerritorial'
export { type Ubicacion } from './Ubicacion'
export { type ResumenTerritorial } from './ResumenTerritorial'
export { type ExcepcionDisponibilidad } from './ExcepcionDisponibilidad'
export { type BaseModel } from './BaseModel'
export {
  type TipoEvaluacion,
  type ReferenciaSistema,
  type Evaluacion,
} from './Evaluacion'
export {
  type DesglosePorTipo,
  type ResumenEvaluacion,
} from './ResumenEvaluacion'
export {
  type TipoVerificacion,
  type EstadoVerificacion,
  type MetodoVerificacion,
  type ProveedorVerificacion,
  type RazonTransicion,
  type Verificacion,
  TRANSICIONES_VALIDAS,
  transicionValida,
  revalidacionValida,
} from './Verificacion'
