import { useEffect, useState } from 'react'
import { escucharPoliticaVigente } from '@/services/firebase/economia'
import type { PoliticaComercial } from '@/models/operacionesEconomicas'

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
      escucharPoliticaVigente(
        p => {
          setPolitica(p)
          setError(p ? null : 'No hay una política comercial publicada')
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
