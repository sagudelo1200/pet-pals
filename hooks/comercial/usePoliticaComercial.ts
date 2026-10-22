import { useEffect, useState } from 'react'
import { escucharVersionVigente } from '@/services/firebase/versionado'
import { TIPO_POLITICA_COMERCIAL } from '@/functions/src/compartido/versionables'
import type {
  DatosPoliticaComercial,
  PoliticaComercial,
} from '@/models/operacionesEconomicas'

/**
 * Política comercial vigente (precios, comisión, cobro y liquidación),
 * en tiempo real. `politica` es null si aún no se ha publicado ninguna.
 */
export function usePoliticaComercial() {
  const [politica, setPolitica] = useState<PoliticaComercial | null>(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(
    () =>
      escucharVersionVigente<DatosPoliticaComercial>(
        TIPO_POLITICA_COMERCIAL,
        v => {
          setPolitica(v ? { ...v.contenido, version: v.version } : null)
          setError(v ? null : 'No hay una política comercial publicada')
          setCargando(false)
        },
        e => {
          setError(e.message)
          setCargando(false)
        }
      ),
    []
  )

  return { politica, cargando, error }
}
