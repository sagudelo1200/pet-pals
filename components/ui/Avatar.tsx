import React, { useMemo } from 'react'
import { Image, StyleSheet, Text, View, ViewStyle } from 'react-native'
import { COLOR } from '@/constants'
import Icon from './Icon'

export interface AvatarProps {
  uri?: string
  name?: string
  size?: number
  rounded?: boolean
  backgroundColor?: string
  color?: string
  statusColor?: string
  showStatus?: boolean
  testID?: string
  containerStyle?: ViewStyle | ViewStyle[]
}

const getInitials = (name?: string) => {
  if (!name) return ''
  const parts = name.trim().split(/\s+/)
  const [a, b] = [parts[0], parts[1]]
  const first = a?.[0] ?? ''
  const second = b?.[0] ?? ''
  return (first + second).toUpperCase()
}

const Avatar: React.FC<AvatarProps> = ({
  uri,
  name,
  size = 40,
  rounded = true,
  backgroundColor = COLOR.SECUNDARIO,
  color = COLOR.TEXTO,
  statusColor,
  showStatus,
  testID,
  containerStyle,
}) => {
  const radius = rounded ? size / 2 : 8
  const initials = useMemo(() => getInitials(name), [name])

  return (
    <View
      testID={testID}
      style={[
        styles.box,
        {
          width: size,
          height: size,
          borderRadius: radius,
          backgroundColor,
        },
        containerStyle,
      ]}
    >
      {uri ? (
        <Image
          source={{ uri }}
          style={{ width: size, height: size, borderRadius: radius }}
        />
      ) : initials ? (
        <Text style={[styles.initials, { color, fontSize: size * 0.6 }]}>
          {initials}
        </Text>
      ) : (
        <Icon name="paw" size={size * 0.6} color={color} />
      )}

      {showStatus ? (
        <View
          style={[
            styles.status,
            {
              backgroundColor: statusColor || COLOR.EXITO,
              width: Math.max(8, Math.round(size * 0.24)),
              height: Math.max(8, Math.round(size * 0.24)),
              borderRadius: Math.max(4, Math.round(size * 0.12)),
            },
          ]}
        />
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  box: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  initials: {
    fontWeight: '700',
  },
  status: {
    position: 'absolute',
    bottom: 3,
    right: 3,
    borderColor: COLOR.BLOQUE,
    borderWidth: 2,
  },
})

export default Avatar
