import { useEffect, useState } from 'react'
import { Keyboard, Platform } from 'react-native'

/**
 * ¿Está el teclado visible? Se actualiza con los eventos del sistema
 * (en iOS al empezar a mostrarse/ocultarse; en Android al terminar).
 */
export function useTecladoVisible(): boolean {
  const [visible, setVisible] = useState(() => Keyboard.isVisible())

  useEffect(() => {
    const ios = Platform.OS === 'ios'
    const alMostrar = Keyboard.addListener(
      ios ? 'keyboardWillShow' : 'keyboardDidShow',
      () => setVisible(true)
    )
    const alOcultar = Keyboard.addListener(
      ios ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setVisible(false)
    )
    return () => {
      alMostrar.remove()
      alOcultar.remove()
    }
  }, [])

  return visible
}
