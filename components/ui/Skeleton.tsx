import React, { useEffect, useRef } from 'react'
import { Animated, StyleSheet, ViewStyle } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { COLOR } from '@/constants'

/**
 * Props del Skeleton: placeholders animados para carga
 */
export interface SkeletonProps {
  width?: number | `${number}%`
  height?: number
  circle?: boolean
  radius?: number
  style?: ViewStyle | ViewStyle[]
  testID?: string
  shimmer?: boolean
}

/**
 * Skeleton: bloque animado que simula contenido cargando.
 * Soporta animación de shimmer (brillo deslizante) para mejor feedback visual.
 */
const Skeleton: React.FC<SkeletonProps> = ({
  width = '100%',
  height = 14,
  circle,
  radius = 6,
  style,
  testID,
  shimmer = true,
}) => {
  const opacity = useRef(new Animated.Value(0.5)).current
  const shimmerPosition = useRef(new Animated.Value(-1)).current

  // Animación de opacidad (pulse)
  useEffect(() => {
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.5,
          duration: 600,
          useNativeDriver: true,
        }),
      ])
    )
    pulseLoop.start()
    return () => pulseLoop.stop()
  }, [opacity])

  // Animación de shimmer (deslizante)
  useEffect(() => {
    if (!shimmer) return undefined
    const shimmerLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerPosition, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: false,
        }),
        Animated.timing(shimmerPosition, {
          toValue: -1,
          duration: 0,
          useNativeDriver: false,
        }),
      ])
    )
    shimmerLoop.start()
    return () => shimmerLoop.stop()
  }, [shimmer, shimmerPosition])

  const translateX = shimmerPosition.interpolate({
    inputRange: [-1, 1],
    outputRange: ['-100%', '100%'],
  })

  return (
    <Animated.View
      testID={testID}
      style={[
        styles.base,
        {
          width,
          height,
          borderRadius: circle ? height / 2 : radius,
          overflow: 'hidden',
        },
        { opacity },
        style,
      ]}
    >
      {shimmer && (
        <Animated.View
          style={[
            styles.shimmerGradient,
            {
              transform: [{ translateX }],
            },
          ]}
        >
          <LinearGradient
            colors={['transparent', 'rgba(255,255,255,0.3)', 'transparent']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.gradientFill}
          />
        </Animated.View>
      )}
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: COLOR.INACTIVO,
  },
  shimmerGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  gradientFill: {
    ...StyleSheet.absoluteFillObject,
  },
})

export default Skeleton
