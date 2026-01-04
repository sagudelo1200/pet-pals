import React, { useEffect, useRef } from 'react'
import {
  Animated,
  Pressable,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native'
import { COLOR } from '@/constants'
import { formatearEdadMascota } from '@/logic/mascotas/utilidades'
import Avatar from './Avatar'
import Icon from './Icon'
import Chip from './Chip'
import type { Mascota } from '@/models/Mascota'

interface PetCardProps {
  pet: Mascota
  onPress?: () => void
  style?: ViewStyle | ViewStyle[]
  animationDelay?: number
  testID?: string
}

/**
 * PetCard: Tarjeta especializada para mostrar información de mascotas
 * con animación de entrada y acciones rápidas
 */
const PetCard: React.FC<PetCardProps> = ({
  pet,
  onPress,
  style,
  animationDelay = 0,
  testID,
}) => {
  const scaleAnim = useRef(new Animated.Value(0)).current
  const opacityAnim = useRef(new Animated.Value(0)).current

  useEffect(() => {
    // Animación de entrada con escala y opacidad
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        delay: animationDelay,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        delay: animationDelay,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start()
  }, [animationDelay])

  const edad = formatearEdadMascota(pet.fecha_nacimiento)

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity: opacityAnim,
          transform: [{ scale: scaleAnim }],
        },
        style,
      ]}
      testID={testID}
    >
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          styles.card,
          pressed && styles.cardPressed,
          !pet.activo && styles.cardInactive,
        ]}
        android_ripple={{ color: 'rgba(54, 199, 161, 0.1)' }}
      >
        {/* Contenido principal */}
        <View style={styles.content}>
          {/* Avatar */}
          <Avatar
            uri={pet.foto}
            name={pet.nombre}
            size={64}
            containerStyle={styles.avatar}
          />

          {/* Información */}
          <View style={styles.info}>
            <Text style={styles.nombre} numberOfLines={1}>
              {pet.nombre}
            </Text>

            {pet.raza && (
              <Text style={styles.raza} numberOfLines={1}>
                {pet.raza}
              </Text>
            )}

            <View style={styles.metaRow}>
              {edad && <Text style={styles.meta}>{edad}</Text>}
              {pet.tamano && edad && (
                <Text style={styles.metaSeparator}>•</Text>
              )}
              {pet.tamano && (
                <Chip label={pet.tamano} size="sm" style={styles.chip} />
              )}
            </View>
          </View>
        </View>

        {/* Indicador de nivel de energía */}
        {pet.nivel_energia && (
          <View style={styles.footer}>
            <View style={styles.energiaContainer}>
              <Icon
                name={
                  pet.nivel_energia === 'alto'
                    ? 'bolt'
                    : pet.nivel_energia === 'medio'
                      ? 'walking'
                      : 'bed'
                }
                size={14}
                color={COLOR.SUBTEXTO}
              />
              <Text style={styles.energiaText}>
                Energía {pet.nivel_energia}
              </Text>
            </View>
          </View>
        )}
      </Pressable>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 12,
  },
  card: {
    backgroundColor: COLOR.BLOQUE,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLOR.BORDE,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 3,
  },
  cardPressed: {
    backgroundColor: COLOR.SECUNDARIO,
    transform: [{ scale: 0.98 }],
  },
  cardInactive: {
    opacity: 0.5,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  avatar: {
    marginRight: 12,
  },
  info: {
    flex: 1,
  },
  nombre: {
    fontSize: 18,
    fontWeight: '700',
    color: COLOR.TEXTO,
    marginBottom: 4,
  },
  raza: {
    fontSize: 14,
    color: COLOR.SUBTEXTO,
    marginBottom: 6,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  meta: {
    fontSize: 13,
    color: COLOR.SUBTEXTO,
  },
  metaSeparator: {
    fontSize: 13,
    color: COLOR.SUBTEXTO,
    marginHorizontal: 6,
  },
  chip: {
    marginLeft: 0,
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: COLOR.BORDE,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  energiaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  energiaText: {
    fontSize: 12,
    color: COLOR.SUBTEXTO,
    marginLeft: 6,
    textTransform: 'capitalize',
  },
})

export default PetCard
