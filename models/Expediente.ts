/**
 * Expediente de la mascota (lo que escribe el servidor y leen la app del
 * tutor y la del cuidador autorizado). El servidor lo define en
 * `functions/src/expediente/expediente.ts`; aquí solo lo que la app lee.
 */
import type {
  Alerta,
  ResumenDeMascota,
} from '@/functions/src/compartido/expediente'

export interface VinculoConCuidador {
  paseos: number
  ultimo_en: number
}

export interface LlegadaRegistrada {
  llegada: string
  paseo_id: string
  fecha_ms: number
}

export interface Expediente {
  mascota_id: string
  tutores: string[]
  cuidadores_autorizados: string[]
  /** "Perro mediano de 4 años, energía alta" */
  quien_es: string
  /** Alergias, medicamentos y condiciones que declaró el tutor. */
  salud_declarada: string[]
  alertas: Alerta[]
  vinculos: Record<string, VinculoConCuidador>
  ultimas_llegadas: LlegadaRegistrada[]
  resumen: ResumenDeMascota
}
