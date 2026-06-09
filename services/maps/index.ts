import { IProveedorMapas } from '@/services/maps/types'
import { mockMapas } from '@/services/maps/mock'
import { googleMapas } from '@/services/maps/google'
import Constants from 'expo-constants'

// Configuración simple para switch
// En el futuro, esto podría venir de un Remote Config o Flag
const apiKey = Constants.expoConfig?.extra?.google?.mapsApiKey
const USE_MOCK = !apiKey

// DEBUG: Ver qué está pasando
console.log(
  '[Maps Service] API Key:',
  apiKey ? '✓ Presente' : '✗ No encontrada'
)
console.log('[Maps Service] Usando:', USE_MOCK ? 'MOCK' : 'GOOGLE API')

export const mapasService: IProveedorMapas = USE_MOCK ? mockMapas : googleMapas

// Exportar instancias individuales por si se necesitan específicamente (ej. tests)
export { mockMapas, googleMapas }
