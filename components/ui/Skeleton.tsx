import React, { useEffect, useRef } from 'react'
import { Animated, StyleSheet, ViewStyle } from 'react-native'
import { COLOR } from '@/constants'

export interface SkeletonProps {
  width?: number | `${number}%`
  height?: number
  circle?: boolean
  radius?: number
  style?: ViewStyle | ViewStyle[]
  testID?: string
}

const Skeleton: React.FC<SkeletonProps> = ({
  width = '100%',
  height = 14,
  circle,
  radius = 6,
  style,
  testID,
}) => {
  const opacity = useRef(new Animated.Value(0.4)).current

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.4,
          duration: 700,
          useNativeDriver: true,
        }),
      ])
    )
    loop.start()
    return () => loop.stop()
  }, [opacity])

  return (
    <Animated.View
      testID={testID}
      style={[
        styles.base,
        {
          width,
          height,
          borderRadius: circle ? height / 2 : radius,
        },
        { opacity },
        style,
      ]}
    />
  )
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: COLOR.INACTIVO,
  },
})

export default Skeleton
