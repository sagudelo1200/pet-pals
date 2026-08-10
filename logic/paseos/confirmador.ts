import { GestorPaseos } from '@/logic/paseos'
import { ESTADOS_PASEO } from '@/models/Paseo'

type Params = {
  fecha: Date | null
  hora: string | null
  duracion: number | null
  total: number
  direccion: any | undefined
  direccionId: string | null
  cuidadorId: string | null
  esCompartido: boolean
  mascotaIds: string[]
  tutorUid?: string | null
}

export async function confirmarReservaPaseo(params: Params) {
  const {
    fecha,
    hora,
    duracion,
    total,
    direccion,
    direccionId,
    cuidadorId,
    esCompartido,
    mascotaIds,
    tutorUid,
  } = params

  if (!fecha || !hora) {
    return { success: false, error: 'fecha_hora_requerida' }
  }

  if (!direccionId) {
    return { success: false, error: 'ubicacion_requerida' }
  }

  // ✅ VALIDACIÓN: Prevenir solapamiento por mascota
  // Cada mascota NO puede tener múltiples paseos simultáneos, sin importar
  // cuál tutor los solicita (soporte MULTI-TUTOR).
  // La validación ocurre en crearConMascotas → validarNoSolapamientoPorMascota

  try {
    const fechaInicio = new Date(fecha)
    const [hours, minutes] = (hora || '00:00').split(':').map(Number)
    fechaInicio.setHours(hours, minutes, 0, 0)

    const result = await GestorPaseos.crearConMascotas(
      {
        tipo_paseo: 'solicitado',
        estado: ESTADOS_PASEO.PENDIENTE,
        fecha_hora_inicio: fechaInicio,
        duracion_estimada: duracion || 60,
        precio: total,
        ubicacion_inicio: direccion || null,
        id_cuidador: cuidadorId || null,
        cuidador_nombre_visual: undefined,
        cuidador_foto_visual: undefined,
        modalidad: esCompartido ? 'compartido' : 'privado',
        cupo_maximo_mascotas: esCompartido ? 10 : mascotaIds.length,
        tutor_ids: tutorUid ? [tutorUid] : [],
      },
      mascotaIds,
      direccion || ''
    )

    return result
  } catch (err: any) {
    return { success: false, error: err?.message || 'unknown' }
  }
}
