import type { Mascota as MascotaModel } from '@/models/Mascota'

/** Alias de tipo local por claridad dentro de /logic */
export type Mascota = MascotaModel

/** Tipo del snapshot liviano generado por helpers */
export type SnapshotMascota = ReturnType<
  typeof import('@/logic/mascotas/helpersMascota').crearSnapshotMascota
>

export default Mascota
