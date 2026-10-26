import { useState, useEffect } from 'react'
import { db } from '@/firebase.config'
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
} from 'firebase/firestore'
import type { PerfilPublico } from '@/models/PerfilPublico'
import { ofreceServicio } from '@/functions/src/compartido/habilitacion'
import { ESTADOS_PASEO, type Paseo } from '@/models/Paseo'

export interface CuidadorEnZona {
  uid: string
  nombre: string
  foto?: string
  rating_promedio?: number
  cantidad_paseos?: number
  horario_hoy?: { inicio: string; fin: string }
  /** Habilitado para pasear ahora (puerta única `ofreceServicio`). */
  habilitado?: boolean
}

export interface SolicitudEnZona {
  id: string
  mascota_nombre: string
  tutor_nombre: string
  tutor_id: string
  hora_solicitud: Date
  estado: string
}

interface DetallesZonaH3 {
  cuidadores: CuidadorEnZona[]
  solicitudes: SolicitudEnZona[]
  cargando: boolean
  error: string | null
}

/**
 * Hook para cargar los detalles de una celda de cobertura: los cuidadores que la
 * cubren y sus solicitudes pendientes.
 */
export function useDetallesZonaH3(h3_r8: string | null): DetallesZonaH3 {
  const [cuidadores, setCuidadores] = useState<CuidadorEnZona[]>([])
  const [solicitudes, setSolicitudes] = useState<SolicitudEnZona[]>([])
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!h3_r8) {
      setCuidadores([])
      setSolicitudes([])
      return
    }

    const cargarDetalles = async () => {
      try {
        setCargando(true)
        setError(null)

        // 1. Cuidadores que cubren esta celda (índice de cobertura: lo arma el
        //    servidor a partir de los perfiles)
        const indiceSnap = await getDocs(
          collection(db, `indice_cobertura/${h3_r8}/cuidadores`)
        )
        const hoy = new Date().getDay().toString()
        const perfiles = await Promise.all(
          indiceSnap.docs.map(d => getDoc(doc(db, 'perfiles_publicos', d.id)))
        )
        const cuidadoresCargados: CuidadorEnZona[] = perfiles.flatMap(snap => {
          if (!snap.exists()) return []
          const perfil = snap.data() as PerfilPublico
          return [
            {
              uid: snap.id,
              nombre: perfil.nombre,
              foto: perfil.foto,
              rating_promedio: perfil.rating_promedio,
              cantidad_paseos: perfil.cantidad_paseos_realizados,
              horario_hoy: perfil.horario_semanal?.[hoy],
              habilitado: ofreceServicio(perfil, 'paseo', Date.now()),
            },
          ]
        })
        setCuidadores(cuidadoresCargados)

        // 2. Solicitudes pendientes de esta celda (cada paseo guarda su celda)
        const paseosSnap = await getDocs(
          query(
            collection(db, 'operaciones'),
            where('tipo', '==', 'paseo'),
            where('estado', '==', ESTADOS_PASEO.PENDIENTE),
            where('h3_r8', '==', h3_r8)
          )
        )

        const solicitudesCargadas: SolicitudEnZona[] = []

        for (const paseoDoc of paseosSnap.docs) {
          const paseo = paseoDoc.data() as Paseo

          // Cargar info del tutor que creó el paseo
          const tutorId = paseo.creado_por
          if (!tutorId) continue

          const tutorSnap = await getDoc(doc(db, 'usuarios', tutorId))
          const tutor = tutorSnap.data()

          // Nombre de la mascota (primera de la lista)
          let mascota_nombre = 'Mascota'
          if (paseo.mascotas_count && paseo.mascotas_count > 0) {
            try {
              const mascotasSnap = await getDocs(
                query(collection(db, `operaciones/${paseoDoc.id}/mascotas`))
              )
              if (mascotasSnap.docs.length > 0) {
                mascota_nombre = mascotasSnap.docs[0].data().nombre || 'Mascota'
              }
            } catch (_e) {
              console.warn('[useDetallesZonaH3.cargarDetalles] Error manejado:', _e)
            }
          }

          solicitudesCargadas.push({
            id: paseoDoc.id,
            mascota_nombre,
            tutor_nombre: tutor?.nombre || 'Desconocido',
            tutor_id: tutorId,
            hora_solicitud: (paseo.creado_en as any)?.toDate?.() || new Date(),
            estado: paseo.estado,
          })
        }

        // Ordenar solicitudes por fecha descendente (más recientes primero)
        solicitudesCargadas.sort(
          (a, b) => b.hora_solicitud.getTime() - a.hora_solicitud.getTime()
        )

        setSolicitudes(solicitudesCargadas)
      } catch (err: any) {
        console.error('[useDetallesZonaH3] Error:', err)
        setError(err?.message || 'Error cargando detalles')
      } finally {
        setCargando(false)
      }
    }

    cargarDetalles()
  }, [h3_r8])

  return { cuidadores, solicitudes, cargando, error }
}
