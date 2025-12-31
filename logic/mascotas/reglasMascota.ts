import type { Mascota } from '@/models/Mascota'

// --- Helpers / rules used by the gestor ---
export function verificarPropietarioMascota(
  data: Partial<Mascota>,
  uid: string
) {
  if (!data) return true
  if (!('creado_por' in data)) return true
  const cp = (data as any).creado_por
  if (!cp) return true
  return String(cp) === String(uid)
}

export function defaultActivoEnCreacion(data: Partial<Mascota>) {
  if (!data) return true
  if (typeof data.activo === 'boolean') return data.activo
  return true
}

// Minimal implementation of paseability check to avoid tight coupling.
export function esMascotaPaseable(m?: Mascota | null) {
  if (!m) return false
  if (m.activo === false) return false
  if (!m.nombre || m.nombre.trim().length === 0) return false
  return true
}

export function calcularDuracionRecomendada(
  mascota: Mascota | null | undefined
): number {
  if (!mascota) return 0

  const energia = mascota.nivel_energia || 'medio'
  const tamano = mascota.tamano || 'mediano'

  let base = 30

  switch (tamano) {
    case 'muy pequeño':
    case 'pequeño':
      base = 25
      break
    case 'mediano':
      base = 35
      break
    case 'grande':
      base = 45
      break
    case 'gigante':
      base = 55
      break
  }

  if (energia === 'alto') base += 10
  if (energia === 'bajo') base -= 5

  return Math.max(10, base)
}

export function validarMascotaParaPaseo(
  mascota: Mascota | null | undefined
): boolean {
  return esMascotaPaseable(mascota)
}

export default {
  verificarPropietarioMascota,
  defaultActivoEnCreacion,
  calcularDuracionRecomendada,
  validarMascotaParaPaseo,
}
