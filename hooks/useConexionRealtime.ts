import { useTiempoReal } from './useTiempoReal'
import { RUTAS_REALTIME } from '@/services/firebase'

/**
 * Hook para monitorear el estado de la conexión con Firebase Realtime Database.
 * Utiliza el nodo especial '.info/connected' de Firebase.
 *
 * @returns boolean - true si el cliente está conectado al servidor de Realtime DB.
 */
export function useConexionRealtime(): boolean {
  const { datos: conectado } = useTiempoReal<boolean>(
    RUTAS_REALTIME.infoConexion
  )

  // Firebase devuelve true/false en este nodo especial.
  // Forzamos a boolean para evitar nulos iniciales.
  return !!conectado
}
