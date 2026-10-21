import React from 'react'
import {
  KeyboardAvoidingView,
  Platform,
  type KeyboardAvoidingViewProps,
} from 'react-native'
import { useTecladoVisible } from '@/hooks/useTecladoVisible'

/**
 * KeyboardAvoidingView con el cierre del teclado corregido en Android.
 * Mismas props que KeyboardAvoidingView: úsalo en su lugar.
 *
 * En Android, React Native trata el cierre del teclado como un cambio más y
 * recalcula el espacio con las coordenadas del evento de cierre. Con
 * edge-to-edge esas coordenadas excluyen la barra de navegación del sistema,
 * así que queda un espacio sobrante (una franja abajo). Apagando el ajuste
 * mientras el teclado no está visible, ese espacio vuelve a 0. En iOS el
 * cierre ya funciona bien y se deja igual.
 *
 * Usa behavior="padding" (o "position"): en "height" React Native suma el
 * valor anterior al recalcular, y con el ajuste apagado entre aperturas ese
 * valor quedaría desactualizado.
 */
const AjusteTeclado: React.FC<KeyboardAvoidingViewProps> = ({
  enabled = true,
  ...props
}) => {
  const tecladoVisible = useTecladoVisible()
  return (
    <KeyboardAvoidingView
      {...props}
      enabled={enabled && (Platform.OS === 'ios' || tecladoVisible)}
    />
  )
}

export default AjusteTeclado
