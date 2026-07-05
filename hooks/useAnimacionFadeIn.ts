import { useEffect, useRef } from 'react'
import { Animated } from 'react-native'

/**
 * Hook para animaciones de fade-in
 * Útil para transiciones suaves de componentes
 * @param delay - Delay inicial en ms (default: 0)
 * @param duration - Duración de la animación en ms (default: 400)
 * @returns Objeto con opacity animada y estilos aplicables
 */
export const useAnimacionFadeIn = (delay = 0, duration = 400) => {
  const opacity = useRef(new Animated.Value(0)).current

  useEffect(() => {
    const timer = setTimeout(() => {
      Animated.timing(opacity, {
        toValue: 1,
        duration,
        useNativeDriver: true,
      }).start()
    }, delay)

    return () => clearTimeout(timer)
  }, [opacity, delay, duration])

  return {
    opacity,
    animatedStyle: { opacity },
  }
}
