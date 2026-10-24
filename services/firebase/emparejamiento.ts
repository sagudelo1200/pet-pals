/**
 * Emparejamiento de mascota y cuidador (lado app). La búsqueda la hace el
 * servidor (functions/src/emparejamiento): solo él ve las agendas ajenas.
 */
import { llamarCallable } from './callable'
import type {
  PeticionBusqueda,
  RespuestaAceptacion,
  RespuestaBusqueda,
} from '@/functions/src/compartido/emparejamiento'

/** Cuidadores para un pedido, ordenados por encaje y con sus razones. */
export const buscarCuidadores = llamarCallable<
  PeticionBusqueda,
  RespuestaBusqueda
>('buscarCuidadores')

/**
 * El cuidador acepta un paseo. El servidor comprueba que puede tomarlo y lo
 * confirma; si no puede, falla con el motivo en el mensaje. Si hay avisos
 * (tamaño de las mascotas, más perros de los que prefiere) responde con ellos
 * sin aceptar: se repite con `confirmo: true` cuando el cuidador decide seguir.
 */
export const aceptarPaseo = llamarCallable<
  { paseoId: string; confirmo?: boolean },
  RespuestaAceptacion
>('aceptarPaseo')
