import type { Paseo } from '@/models/Paseo'
import type { Usuario } from '@/models/Usuario'

export interface PaseoActivoTimestamps {
  creado?: Date
  confirmado?: Date
  iniciado?: Date
  finalizado?: Date
  cancelado?: Date
}

export interface PaseoActivo {
  id: string
  estado: any
  tutor: Partial<Usuario>
  cuidador?: Partial<Usuario>
  mascota_ids?: string[]
  direccion?: string
  timestamps: PaseoActivoTimestamps
  esActivo: boolean
  original?: Partial<Paseo>
}

export type ResultadoAccion = { ok: true } | { ok: false; error: string }
