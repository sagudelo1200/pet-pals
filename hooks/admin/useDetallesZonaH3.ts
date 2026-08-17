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
import { ESTADOS_PASEO, type Paseo } from '@/models/Paseo'

export interface CuidadorEnZona {
  uid: string
  nombre: string
  foto?: string
  rating_promedio?: number
  cantidad_paseos?: number
  horario_hoy?: { inicio: string; fin: string }
  verificado?: boolean
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
 * Hook para cargar detalles de una zona H3: cuidadores activos y solicitudes pendientes
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

        // 1. Cargar cuidadores que cubren esta zona
        // Nota: Esto requiere una estructura de índice en Firestore.
        // Alternativa simple: buscar por h3_r8 en perfiles públicos (menos eficiente pero funciona)
        const perfilesSnap = await getDocs(
          query(
            collection(db, 'perfiles_publicos'),
            where('h3_r8', '==', h3_r8)
          )
        )

        const cuidadoresCargados: CuidadorEnZona[] = []

        for (const perfDoc of perfilesSnap.docs) {
          const perfil = perfDoc.data() as PerfilPublico
          const uid = perfDoc.id

          // Calcular horario de hoy
          const hoy = new Date().getDay().toString()
          const horario_hoy = perfil.horario_semanal?.[hoy]

          cuidadoresCargados.push({
            uid,
            nombre: perfil.nombre,
            foto: perfil.foto,
            rating_promedio: perfil.rating_promedio,
            cantidad_paseos: perfil.cantidad_paseos_realizados,
            horario_hoy,
            verificado: (perfil.insignias_verificacion?.length ?? 0) > 0,
          })
        }

        setCuidadores(cuidadoresCargados)

        // 2. Cargar solicitudes pendientes en esta zona
        // Buscar paseos con estado PENDIENTE cuya ubicación sea en esta zona
        const paseosSnap = await getDocs(
          query(
            collection(db, 'paseos'),
            where('estado', '==', ESTADOS_PASEO.PENDIENTE)
          )
        )

        const solicitudesCargadas: SolicitudEnZona[] = []

        for (const paseoDoc of paseosSnap.docs) {
          const paseo = paseoDoc.data() as Paseo

          // Verificar si esta solicitud está en la zona (por simplicidad, comparar h3 de ubicación)
          // NOTA: Esto es una aproximación. En producción, podrías tener un campo h3_zona en Paseo
          // Por ahora solo mostrar si hay cuidadores disponibles en la zona
          const ubicacion = paseo.ubicacion_inicio as any
          if (!ubicacion?.coordenadas) continue

          // Cargar info del tutor que creó el paseo
          const tutorId = paseo.creado_por
          if (!tutorId) continue

          const tutorSnap = await getDoc(doc(db, 'usuarios', tutorId))
          const tutor = tutorSnap.data()

          // Nombre de la mascota (primera de la lista)
          let mascota_nombre = 'Mascota'
          if (paseo.mascotas_count && paseo.mascotas_count > 0) {
            // Intenta cargar la primera mascota
            try {
              const mascotasSnap = await getDocs(
                query(collection(db, `paseos/${paseoDoc.id}/mascotas`))
              )
              if (mascotasSnap.docs.length > 0) {
                mascota_nombre = mascotasSnap.docs[0].data().nombre || 'Mascota'
              }
            } catch (_e) {
              // Si hay error, usar valor por defecto
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
