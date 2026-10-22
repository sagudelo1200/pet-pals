import { GestorPaseos } from '@/logic/paseos'
import { ESTADOS_PASEO } from '@/models/Paseo'
import { numeroVersionVigente } from '@/services/firebase/versionado'
import { TIPO_POLITICA_COMERCIAL } from '@/functions/src/compartido/versionables'

type Params = {
  fecha: Date | null
  hora: string | null
  duracion: number | null
  total: number
  /** Versión de la política con la que se calculó el precio mostrado. */
  politicaVersion: number
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
    politicaVersion,
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
    // El paseo se cobra con la política que vio el tutor: si el admin acaba
    // de publicar otra, se pide revisar el nuevo precio (las reglas lo exigen)
    if ((await numeroVersionVigente(TIPO_POLITICA_COMERCIAL)) !== politicaVersion) {
      return { success: false, error: 'politica_actualizada' }
    }

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
        politica_version: politicaVersion,
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
