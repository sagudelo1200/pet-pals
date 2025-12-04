import { useRef, useEffect, useState } from 'react'
import {
  Animated,
  PanResponder,
  Dimensions,
  useWindowDimensions,
} from 'react-native'

const { height: INITIAL_HEIGHT } = Dimensions.get('window')

interface UseAnimacionModalProps {
  onClose: () => void
  onCollapse?: () => void
}

export const useAnimacionModal = ({
  onClose,
  onCollapse,
}: UseAnimacionModalProps) => {
  const { height: screenHeight } = useWindowDimensions()
  const [isExpanded, setIsExpanded] = useState(false)

  // Ref para acceder al estado actualizado dentro del PanResponder
  const isExpandedRef = useRef(false)

  useEffect(() => {
    isExpandedRef.current = isExpanded
  }, [isExpanded])

  // Constante para el estado parcial (altura oculta inicialmente)
  // Calculado para dejar visible aprox 465px (Imagen + Info + Botones)
  const PARTIAL_OFFSET = Math.max(0, screenHeight * 0.85 - 465)

  // Animaciones
  const slideAnim = useRef(new Animated.Value(INITIAL_HEIGHT)).current
  const opacityAnim = useRef(new Animated.Value(0)).current

  // Funciones de animación
  const animateTo = (toValue: number, callback?: () => void) => {
    Animated.spring(slideAnim, {
      toValue,
      useNativeDriver: true,
      tension: 45,
      friction: 8,
    }).start(callback)
  }

  const expandir = () => {
    setIsExpanded(true)
    animateTo(0)
  }

  const colapsar = () => {
    setIsExpanded(false)
    animateTo(PARTIAL_OFFSET)
    if (onCollapse) onCollapse()
  }

  const cerrar = () => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: screenHeight,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(onClose)
  }

  // PanResponder para gestos
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        const { dy } = gestureState
        const expanded = isExpandedRef.current

        // Umbral mínimo de movimiento
        if (Math.abs(dy) < 10) return false

        // Si está expandido, solo capturar si el movimiento es hacia abajo (colapsar)
        // Si es hacia arriba (dy < 0), dejamos que el ScrollView maneje el scroll del contenido
        if (expanded) {
          return dy > 0
        }

        // Si no está expandido, capturamos cualquier movimiento vertical
        return true
      },
      onPanResponderMove: (_, gestureState) => {
        const expanded = isExpandedRef.current
        const startValue = expanded ? 0 : PARTIAL_OFFSET
        const newValue = startValue + gestureState.dy

        if (newValue < 0) {
          slideAnim.setValue(newValue / 3)
        } else {
          slideAnim.setValue(newValue)
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        const expanded = isExpandedRef.current

        if (expanded) {
          if (
            gestureState.dy > 300 ||
            (gestureState.dy > 200 && gestureState.vy > 1.5)
          ) {
            cerrar()
          } else if (gestureState.dy > 100 || gestureState.vy > 0.5) {
            colapsar()
          } else {
            expandir()
          }
        } else {
          if (gestureState.dy < -50 || gestureState.vy < -0.5) {
            expandir()
          } else if (gestureState.dy > 100 || gestureState.vy > 0.5) {
            cerrar()
          } else {
            colapsar()
          }
        }
      },
    })
  ).current

  // Inicialización y respuesta a cambios de dimensiones
  useEffect(() => {
    // Animación de entrada (opacidad) solo al montar
    Animated.timing(opacityAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start()
  }, [])

  useEffect(() => {
    // Si cambia la altura (rotación) y no está expandido, ajustar posición
    if (!isExpanded) {
      Animated.spring(slideAnim, {
        toValue: PARTIAL_OFFSET,
        useNativeDriver: true,
        tension: 45,
        friction: 8,
      }).start()
    }
  }, [PARTIAL_OFFSET, isExpanded])

  return {
    slideAnim,
    opacityAnim,
    panResponder,
    isExpanded,
    expandir,
    colapsar,
    cerrar,
  }
}
