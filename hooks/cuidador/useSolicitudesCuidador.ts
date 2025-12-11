import { useMemo } from 'react'
import { useCollection } from '@/hooks/useCollection'
import { ServicioPaseo } from '@/services/firebase/paseo'
import { Paseo } from '@/models/Paseo'
import { ServicioAuth } from '@/services/firebase/auth'

export function useSolicitudesCuidador() {
  const user = ServicioAuth.obtenerUsuarioActual()

  // Memoizamos la query para evitar recrearla en cada render
  const query = useMemo(() => ServicioPaseo.getQuerySolicitudesPendientes(), [])

  // Usamos listen: true para actualizaciones en tiempo real
  const { data, cargando, error } = useCollection<Paseo>(query, {
    listen: true,
  })

  const solicitudes = useMemo(() => {
    if (!data) return []

    const filtradas = data.filter(p => {
      // Mostrar si no tiene cuidador asignado (mercado abierto)
      if (!p.id_cuidador) return true
      // Mostrar si está asignado a mí específicamente
      if (p.id_cuidador === user?.uid) return true
      // Ocultar si está asignado a otro
      return false
    })

    // Ordenar: Directas primero, luego Abiertas
    return filtradas.sort((a, b) => {
      const aEsDirecta = a.id_cuidador === user?.uid
      const bEsDirecta = b.id_cuidador === user?.uid

      if (aEsDirecta && !bEsDirecta) return -1
      if (!aEsDirecta && bEsDirecta) return 1
      return 0 // Mantener orden original (por fecha)
    })
  }, [data, user?.uid])

  return { solicitudes, cargando, error }
}
