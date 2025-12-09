import React from 'react'
import {
  Switch as RNSwitch,
  StyleSheet,
  View,
  Text,
  ViewStyle,
} from 'react-native'
import { COLOR } from '@/constants'

interface SwitchProps {
  value: boolean
  onValueChange: (value: boolean) => void
  label?: string
  description?: string
  disabled?: boolean
  style?: ViewStyle | ViewStyle[]
}

const Switch: React.FC<SwitchProps> = ({
  value,
  onValueChange,
  label,
  description,
  disabled = false,
  style,
}) => {
  const containerStyle: ViewStyle | ViewStyle[] = [
    styles.container,
    ...(Array.isArray(style) ? style : style ? [style] : []),
  ]

  return (
    <View style={containerStyle}>
      <View style={styles.content}>
        {label && (
          <View style={styles.textContainer}>
            <Text style={styles.label}>{label}</Text>
            {description && (
              <Text style={styles.description}>{description}</Text>
            )}
          </View>
        )}
        <RNSwitch
          value={value}
          onValueChange={onValueChange}
          disabled={disabled}
          trackColor={{ false: COLOR.INACTIVO, true: COLOR.PRIMARIO }}
          thumbColor={COLOR.BASE}
          ios_backgroundColor={COLOR.INACTIVO}
        />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  textContainer: {
    flex: 1,
    marginRight: 12,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    color: COLOR.TEXTO,
    marginBottom: 2,
  },
  description: {
    fontSize: 13,
    color: COLOR.SUBTEXTO,
    marginTop: 2,
  },
})

export default Switch
