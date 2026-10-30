import { useEffect, useMemo, useState } from 'react'
import { useCollection } from '@/hooks/useCollection'
import { GestorPaseos } from '@/logic/paseos'
import {
  celdasDeSolicitudes,
  ordenarSolicitudes,
} from '@/logic/paseos/solicitudes'
import { GestorPerfilPublico } from '@/logic/usuarios/perfilPublico'
import { Paseo } from '@/models/Paseo'
import type { PerfilPublico } from '@/models/PerfilPublico'
import { GestorAuth } from '@/logic/auth'
import { useConfiguracion } from '@/hooks/configuracion/useConfiguracion'

/**
 * Solicitudes que puede tomar el cuidador: las de su zona de cobertura (las
 * dirigidas a él siempre), las suyas primero y luego las más cercanas.
 */
export function useSolicitudesCuidador() {
  const uid = GestorAuth.obtenerUsuarioActual()?.uid
  const [perfil, setPerfil] = useState<PerfilPublico | null>(null)
  const [cargandoPerfil, setCargandoPerfil] = useState(true)
  const { cobertura_manual: manual } = useConfiguracion('funcionalidades')

  useEffect(() => {
    let vigente = true
    if (!uid) {
      setCargandoPerfil(false)
      return undefined
    }
    GestorPerfilPublico.obtenerPorId(uid).then(res => {
      if (!vigente) return
      setPerfil(res.success && res.data ? res.data : null)
      setCargandoPerfil(false)
    })
    return () => {
      vigente = false
    }
  }, [uid])

  const celdas = useMemo(
    () => (perfil ? celdasDeSolicitudes(perfil, manual) : []),
    [perfil, manual]
  )

  // Memoizamos las queries para evitar recrearlas en cada render
  const queryZona = useMemo(
    () =>
      celdas.length > 0 ? GestorPaseos.obtenerQuerySolicitudesEnZona(celdas) : null,
    [celdas]
  )
  const queryDirigidas = useMemo(
    () => (uid ? GestorPaseos.obtenerQuerySolicitudesDirigidas(uid) : null),
    [uid]
  )

  // Usamos listen: true para actualizaciones en tiempo real
  const zona = useCollection<Paseo>(queryZona, { listen: true })
  const dirigidas = useCollection<Paseo>(queryDirigidas, { listen: true })

  const solicitudes = useMemo(
    () =>
      ordenarSolicitudes(
        [...(dirigidas.data ?? []), ...(zona.data ?? [])],
        uid,
        perfil?.h3_r8
      ),
    [dirigidas.data, zona.data, uid, perfil?.h3_r8]
  )

  return {
    solicitudes,
    cargando: cargandoPerfil || zona.cargando || dirigidas.cargando,
    error: zona.error ?? dirigidas.error,
  }
}
