/**
 * Expediente de la mascota (lado app). Todo cambio pasa por Cloud Functions
 * (functions/src/expediente/funciones.ts); la app solo lee según las reglas.
 */
import { llamarCallable } from './callable'
import type { Llegada } from '@/functions/src/compartido/expediente'

/** El tutor confirma ("es así") o rechaza ("no es así") un aprendizaje. */
export const confirmarAprendizaje = llamarCallable<
  { mascotaId: string; clave: string; decision: 'confirmado' | 'rechazado' },
  { ok: boolean }
>('confirmarAprendizaje')

/** El tutor responde "¿cómo llegó?" (todas sus mascotas si se omiten los ids). */
export const registrarLlegada = llamarCallable<
  { paseoId: string; llegada: Llegada; mascotaIds?: string[] },
  { mascotas: string[] }
>('registrarLlegada')
