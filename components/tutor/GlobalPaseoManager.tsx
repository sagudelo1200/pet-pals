import { useEffect } from 'react'
import { useNavigation } from '@react-navigation/native'
import { useAuth } from '@/context/AuthContext'
import { useMonitorPaseoGlobal } from '@/hooks/paseos/useMonitorPaseoGlobal'
import type { AuthStackParamList } from '@/navigation/types'
import type { StackNavigationProp } from '@react-navigation/stack'

/**
 * Coordinador global del TUTOR al finalizar un paseo (estado FINALIZADO).
 * Vive en el navigator RAÍZ para actuar sobre cualquier pantalla del tutor
 * (PaseoActivo, Chat, tabs).
 *
 * Al finalizar lleva directo a PaseoFinalizado, que sigue el orden correcto:
 * 1. Validar la entrega con el código del cuidador (ahí nace el cobro)
 * 2. Pagar (o pagar después)
 * 3. Calificar al cuidador
 * Antes mostraba primero la calificación y la entrega quedaba sin validar.
 *
 * SOLO actúa con el rol activo TUTOR: el cuidador tiene su propio flujo.
 */
export const GlobalPaseoManager = (): null => {
  const { rolActivo } = useAuth()
  const { showFinishedModal, paseo, handleClose } = useMonitorPaseoGlobal()
  const navigation = useNavigation<StackNavigationProp<AuthStackParamList>>()
  const paseoId = paseo?.id

  useEffect(() => {
    if (!showFinishedModal || !paseoId || rolActivo !== 'tutor') return
    handleClose()
    try {
      navigation.navigate('PaseoFinalizado', { paseoId })
    } catch (_e) {
      // Si el contexto de navegación no está listo, el tutor puede retomarlo
      // desde Paseos (el paseo sigue FINALIZADO hasta validar la entrega)
      console.warn('[GlobalPaseoManager] No se pudo abrir PaseoFinalizado:', _e)
    }
    // handleClose/navigation son estables durante el ciclo de vida del manager
  }, [showFinishedModal, paseoId, rolActivo])

  return null
}
