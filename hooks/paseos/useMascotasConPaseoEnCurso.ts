import { useState, useEffect } from 'react'
import { query, where, onSnapshot, collection } from 'firebase/firestore'
import { useAuth } from '@/context/AuthContext'
import { ESTADOS_PASEO, type Paseo } from '@/models/Paseo'
import { db } from '@/firebase.config'

/**
 * Hook que valida en realtime qué mascotas del usuario actual tienen
 * un paseo en estado activo (PENDIENTE, CONFIRMADO, EN_CAMINO, EN_PROGRESO).
 *
 * Retorna un Set con los IDs de mascotas que no pueden ser seleccionadas
 * para un nuevo paseo porque ya tienen uno en curso.
 *
 * Usa realtime listeners para mantener sincronizado con la BD.
 */
export const useMascotasConPaseoEnCurso = () => {
  const { user } = useAuth()
  const [mascotasConPaseo, setMascotasConPaseo] = useState<Set<string>>(
    new Set()
  )
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!user?.uid) {
      setMascotasConPaseo(new Set())
      return undefined
    }

    setLoading(true)

    // Query: obtener todos los paseos del usuario en estados activos
    // Nota: Por seguridad, solo podemos filtrar por creado_por == uid
    // ya que es el que está autenticado. Firestore security rules
    // garantizan que no se puedan leer paseos de otros usuarios.
    const estadosActivos = [
      ESTADOS_PASEO.PENDIENTE,
      ESTADOS_PASEO.CONFIRMADO,
      ESTADOS_PASEO.EN_CAMINO,
      ESTADOS_PASEO.EN_PROGRESO,
    ]

    const q = query(
      collection(db, 'paseos'),
      where('creado_por', '==', user.uid),
      where('estado', 'in', estadosActivos)
    )

    // Configurar listener en realtime
    const unsubscribe = onSnapshot(
      q,
      (snapshot): void => {
        const mascotasIds = new Set<string>()

        snapshot.forEach(doc => {
          const paseo = doc.data() as Paseo
          // Extraer IDs de mascotas de este paseo
          if (Array.isArray(paseo.mascota_ids)) {
            paseo.mascota_ids.forEach(id => {
              mascotasIds.add(id)
            })
          }
        })

        setMascotasConPaseo(mascotasIds)
        setLoading(false)
      },
      (error): void => {
        console.error('Error escuchando paseos activos para validación:', error)
        setLoading(false)
        setMascotasConPaseo(new Set())
      }
    )

    return (): void => {
      unsubscribe()
    }
  }, [user?.uid])

  return { mascotasConPaseo, loading }
}
