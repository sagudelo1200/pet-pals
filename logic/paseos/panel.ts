/**
 * Panel del paseo del cuidador (lado app): los cálculos pequeños que usa la
 * pantalla mientras pasea, sin pantallas ni Firebase.
 */
import type { Expediente } from '@/models/Expediente'

/** Coordenadas de un punto. */
export interface Punto {
  latitude: number
  longitude: number
}

/**
 * Enlace para que el teléfono abra su app de mapas con la ruta a pie hacia un
 * punto (la dirección donde se entrega la mascota). Funciona en iOS y Android
 * sin dibujar un mapa propio.
 * @param destino Punto de entrega.
 */
export function urlParaVolver(destino: Punto): string {
  return (
    'https://www.google.com/maps/dir/?api=1' +
    `&destination=${destino.latitude},${destino.longitude}` +
    '&travelmode=walking'
  )
}

/**
 * Minutos que faltan para el tiempo estimado del paseo (negativo si ya se
 * pasó).
 * @param duracionEstimada Minutos estimados del paseo.
 * @param tiempoTranscurrido Tiempo en formato "HH:MM:SS".
 * @returns Minutos restantes, o undefined si no hay estimado válido.
 */
export function minutosRestantes(
  duracionEstimada: number | undefined,
  tiempoTranscurrido: string
): number | undefined {
  if (!duracionEstimada || duracionEstimada <= 0) return undefined
  const [h, m, s] = tiempoTranscurrido.split(':').map(Number)
  if ([h, m, s].some(n => !Number.isFinite(n))) return undefined
  const transcurridos = h * 60 + m + s / 60
  return Math.ceil(duracionEstimada - transcurridos)
}

/**
 * ¿Es la primera vez que este cuidador pasea a la mascota? El vínculo se
 * cuenta al finalizar cada paseo, así que durante el primero aún no existe.
 * @param expediente Expediente de la mascota (puede no existir todavía).
 * @param cuidadorId Cuidador.
 */
export function esPrimerPaseo(
  expediente: Pick<Expediente, 'vinculos'> | undefined,
  cuidadorId: string
): boolean {
  return !(expediente?.vinculos?.[cuidadorId]?.paseos ?? 0)
}
