import { useState } from 'react'
import { ServicioPaseo } from '@/services/firebase/paseo'
import type { PaseoEvent } from '@/services/firebase/maquina-estados-paseo'
import { crearMaquinaPaseo } from '@/services/firebase/maquina-estados-paseo'
import { Alert } from 'react-native'
import { useTranslation } from 'react-i18next'
import { usePaseoActivo } from '@/hooks/paseos/usePaseoActivo'

/**
 * Hook para controlar un paseo desde la perspectiva del cuidador.
 * Reutiliza usePaseoActivo y agrega funcionalidad de cambio de estado.
 */
export const useControlPaseo = (paseoId: string) => {
  const { t } = useTranslation()
  const { paseo, loading, eventos, ruta, ubicacionActual } = usePaseoActivo(paseoId)
  const [procesando, setProcesando] = useState(false)

  // Cambiar estado del paseo usando la máquina de estados
  const cambiarEstado = async (evento: PaseoEvent) => {
    if (!paseo) return

    setProcesando(true)
    try {
      // Validar transición con la máquina
      const maquina = crearMaquinaPaseo(paseo)
      if (!maquina.puede(evento)) {
        Alert.alert(
          t('comun:error'),
          t('paseos:control.transicion_invalida')
        )
        setProcesando(false)
        return
      }

      // Ejecutar transición según el evento
      let resultado
      switch (evento) {
        case 'INICIAR_RUTA':
          resultado = await ServicioPaseo.iniciarRuta(paseo.id)
          break
        case 'INICIAR_PASEO':
          resultado = await ServicioPaseo.iniciarPaseo(paseo.id)
          break
        case 'FINALIZAR_PASEO':
          resultado = await ServicioPaseo.finalizarPaseo(paseo.id)
          break
        default:
          throw new Error('Evento no implementado')
      }

      if (!resultado.success) {
        Alert.alert(t('comun:error'), resultado.error || t('comun:error_desconocido'))
      }
    } catch (e: any) {
      Alert.alert(t('comun:error'), e.message || t('comun:error_desconocido'))
    } finally {
      setProcesando(false)
    }
  }

  // Calcular tiempo transcurrido
  const tiempoTranscurrido = paseo?.fecha_inicio_real
    ? Math.floor((Date.now() - new Date(paseo.fecha_inicio_real).getTime()) / 1000)
    : 0

  return {
    paseo,
    loading,
    eventos,
    ruta,
    ubicacionActual,
    procesando,
    cambiarEstado,
    tiempoTranscurrido,
  }
}
