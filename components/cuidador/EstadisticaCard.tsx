import React from 'react'
import { StyleSheet, View, Text, Pressable } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { COLOR } from '@/constants'
import Card from '@/components/ui/Card'
import Icon from '@/components/ui/Icon'

type IconName = React.ComponentProps<typeof Icon>['name']

interface EstadisticaCardProps {
  titulo: string
  valor: number | string
  icono: IconName
  color?: string
  gradientColors?: [string, string]
  onPress?: () => void
}

export const EstadisticaCard: React.FC<EstadisticaCardProps> = ({
  titulo,
  valor,
  icono,
  color = COLOR.PRIMARIO,
  gradientColors,
  onPress,
}) => {
  const defaultGradient: [string, string] = [
    `${color}15`,
    `${color}05`,
  ]

  const gradient = gradientColors || defaultGradient

  const content = (
    <View style={styles.content}>
      <LinearGradient
        colors={gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.iconContainer]}
      >
        <Icon name={icono} size={24} color={color} />
      </LinearGradient>
      <View style={styles.textContainer}>
        <Text style={styles.valor}>{valor}</Text>
        <Text style={styles.titulo}>{titulo}</Text>
      </View>
      {onPress && (
        <Icon name="chevron-right" size={20} color={COLOR.SUBTEXTO} />
      )}
    </View>
  )

  if (onPress) {
    return (
      <Pressable 
        onPress={onPress} 
        style={({ pressed }) => [
          styles.pressable,
          pressed && styles.pressed
        ]}
      >
        <Card style={styles.card}>{content}</Card>
      </Pressable>
    )
  }

  return <Card style={styles.card}>{content}</Card>
}

const styles = StyleSheet.create({
  pressable: {
    flex: 1,
    marginBottom: 12,
  },
  pressed: {
    opacity: 0.7,
    transform: [{ scale: 0.98 }],
  },
  card: {
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  iconContainer: {
    width: 52,
    height: 52,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textContainer: {
    flex: 1,
  },
  valor: {
    fontSize: 32,
    fontWeight: '800',
    color: COLOR.TEXTO,
    marginBottom: 2,
    letterSpacing: -0.5,
  },
  titulo: {
    fontSize: 13,
    color: COLOR.SUBTEXTO,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
})
