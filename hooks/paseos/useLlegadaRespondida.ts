import { useDoc } from '@/hooks/useDoc'

/**
 * ¿El tutor ya respondió "¿cómo llegó?" en este paseo? Lo guarda el servidor
 * como el evento `llegada` del paseo.
 */
export function useLlegadaRespondida(paseoId: string) {
  const { data, cargando } = useDoc<any>(
    `operaciones/${paseoId || '__sin_paseo__'}/eventos`,
    'llegada',
    { listen: !!paseoId }
  )
  return { respondida: !!data, cargando }
}
