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
  variant?: 'horizontal' | 'vertical'
}

export const EstadisticaCard: React.FC<EstadisticaCardProps> = ({
  titulo,
  valor,
  icono,
  color = COLOR.PRIMARIO,
  gradientColors,
  onPress,
  variant = 'horizontal',
}) => {
  const defaultGradient: [string, string] = [`${color}15`, `${color}05`]

  const gradient = gradientColors || defaultGradient
  const isVertical = variant === 'vertical'

  const content = (
    <View style={[styles.content, isVertical && styles.contentVertical]}>
      <View
        style={[
          styles.topRow,
          isVertical && { width: '100%', justifyContent: 'space-between' },
        ]}
      >
        <LinearGradient
          colors={gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[
            styles.iconContainer,
            isVertical && styles.iconContainerSmall,
          ]}
        >
          <Icon name={icono} size={isVertical ? 20 : 24} color={color} />
        </LinearGradient>
        {isVertical && onPress && (
          <Icon name="arrow-right" size={16} color={COLOR.SUBTEXTO} />
        )}
      </View>

      <View
        style={[
          styles.textContainer,
          isVertical && styles.textContainerVertical,
        ]}
      >
        <Text style={[styles.valor, isVertical && styles.valorSmall]}>
          {valor}
        </Text>
        <Text
          style={[styles.titulo, isVertical && styles.tituloSmall]}
          numberOfLines={1}
        >
          {titulo}
        </Text>
      </View>

      {!isVertical && onPress && (
        <Icon name="chevron-right" size={20} color={COLOR.SUBTEXTO} />
      )}
    </View>
  )

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [styles.pressable, pressed && styles.pressed]}
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
  contentVertical: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 12,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 52,
    height: 52,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconContainerSmall: {
    width: 40,
    height: 40,
    borderRadius: 12,
  },
  textContainer: {
    flex: 1,
  },
  textContainerVertical: {
    width: '100%',
  },
  valor: {
    fontSize: 32,
    fontWeight: '800',
    color: COLOR.TEXTO,
    marginBottom: 2,
    letterSpacing: -0.5,
  },
  valorSmall: {
    fontSize: 24,
    marginBottom: 4,
  },
  titulo: {
    fontSize: 13,
    color: COLOR.SUBTEXTO,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  tituloSmall: {
    fontSize: 12,
  },
})
