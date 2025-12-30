import { useState } from 'react'
import { EVENTOS_PASEO, EVENTOS } from '@/logic/paseos/maquinaEstados'
import { paseoActivo } from '@/logic/paseos/gestor/paseoActivo'
import { Alert } from 'react-native'
import { useTranslation } from 'react-i18next'
import { useSincronizadorPaseo } from '@/hooks/paseos/useSincronizadorPaseo'

/**
 * Hook para controlar un paseo desde la perspectiva del cuidador.
 * Reutiliza useSincronizadorPaseo y agrega funcionalidad de cambio de estado.
 */
export const useControlPaseo = (paseoId: string) => {
  const { t } = useTranslation()
  const { paseo, loading, eventos, ruta, ubicacionActual } =
    useSincronizadorPaseo(paseoId)
  const [procesando, setProcesando] = useState(false)

  // Cambiar estado del paseo usando la máquina de estados
  const cambiarEstado = async (evento: EVENTOS_PASEO) => {
    if (!paseo) return

    setProcesando(true)
    try {
      let resultado
      switch (evento) {
        case EVENTOS.INICIAR_RUTA:
          resultado = await paseoActivo.iniciarRutaAsync()
          break
        case EVENTOS.INICIAR_PASEO:
          resultado = await paseoActivo.iniciarPaseoAsync()
          break
        case EVENTOS.FINALIZAR_PASEO:
          resultado = await paseoActivo.finalizarPaseoAsync()
          break
        default:
          throw new Error('Evento no implementado')
      }

      if (!resultado.success) {
        Alert.alert(
          t('comun:error'),
          resultado.error || t('comun:error_desconocido')
        )
      }
    } catch (e: any) {
      Alert.alert(t('comun:error'), e.message || t('comun:error_desconocido'))
    } finally {
      setProcesando(false)
    }
  }

  // Calcular tiempo transcurrido
  const tiempoTranscurrido = paseo?.fecha_inicio_real
    ? Math.floor(
        (Date.now() - new Date(paseo.fecha_inicio_real).getTime()) / 1000
      )
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
