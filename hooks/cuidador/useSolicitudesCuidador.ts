import { useMemo } from 'react'
import { useCollection } from '@/hooks/useCollection'
import { GestorPaseos } from '@/logic/paseos'
import { Paseo } from '@/models/Paseo'
import { GestorAuth } from '@/logic/auth'

export function useSolicitudesCuidador() {
  const user = GestorAuth.obtenerUsuarioActual()

  // Memoizamos la query para evitar recrearla en cada render
  const query = useMemo(
    () => GestorPaseos.obtenerQuerySolicitudesPendientes(),
    []
  )

  // Usamos listen: true para actualizaciones en tiempo real
  const { data, cargando, error } = useCollection<Paseo>(query, {
    listen: true,
  })

  const solicitudes = useMemo(() => {
    if (!data) return []

    const filtradas = data.filter(p => {
      // Excluir solicitudes que el propio usuario haya creado
      // (evita que un tutor pueda auto-aceptarse paseos)
      if (p.creado_por === user?.uid) return false

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
