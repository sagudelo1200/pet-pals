import React, { useRef, useEffect, useState } from 'react'
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Animated,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useTranslation } from 'react-i18next'
import { COLOR } from '@/constants'
import { Button, Spacer } from '@/components/ui'

interface PaseoFinalizadoCardProps {
  mascotaNombre: string
  cuidadorNombre: string
  onClose: () => void
  onRate?: (_rating: number) => void
}

export const PaseoFinalizadoCard: React.FC<PaseoFinalizadoCardProps> = ({
  mascotaNombre,
  cuidadorNombre,
  onClose,
  onRate,
}) => {
  const { t } = useTranslation()
  const fadeAnim = useRef(new Animated.Value(0)).current
  const scaleAnim = useRef(new Animated.Value(0.8)).current
  const [rating, setRating] = useState(5)

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 20,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start()
  }, [fadeAnim, scaleAnim])

  const handleRate = (r: number) => {
    setRating(r)
    if (onRate) onRate(r)
  }

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.card,
          { opacity: fadeAnim, transform: [{ scale: scaleAnim }] },
        ]}
      >
        {/* Icono de éxito alegre */}
        <View style={styles.iconContainer}>
          <View style={styles.iconCircle}>
            <Ionicons name="happy" size={60} color={COLOR.EXITO} />
          </View>
          {/* Confetti decorativo */}
          {[...Array(12)].map((_, i) => (
            <View
              key={i}
              style={[
                styles.confetti,
                {
                  transform: [{ rotate: `${i * 30}deg` }, { translateY: -65 }],
                  backgroundColor: [
                    COLOR.PRIMARIO,
                    COLOR.ENFASIS,
                    COLOR.INFO,
                    COLOR.ORO,
                  ][i % 4],
                },
              ]}
            />
          ))}
        </View>

        <Text style={styles.title}>
          {t('paseos:finalizado.titulo', '¡Paseo Completado!')}
        </Text>
        <Text style={styles.subtitle}>
          {t('paseos:finalizado.mensaje', {
            nombre: mascotaNombre,
            cuidador: cuidadorNombre,
          })}
        </Text>

        <View style={styles.divider} />

        {/* Sección de Calificación */}
        <View style={styles.ratingSection}>
          <Text style={styles.ratingLabel}>
            {t(
              'paseos:finalizado.calificar',
              '¿Cómo estuvo el servicio de {{cuidador}}?',
              {
                cuidador: cuidadorNombre,
              }
            )}
          </Text>
          <Spacer size={16} />
          <View style={styles.starsRow}>
            {[1, 2, 3, 4, 5].map(star => (
              <TouchableOpacity
                key={star}
                onPress={() => handleRate(star)}
                style={styles.starButton}
              >
                <Ionicons
                  name={star <= rating ? 'star' : 'star-outline'}
                  size={40}
                  color={star <= rating ? COLOR.ORO : COLOR.SUBTEXTO}
                />
              </TouchableOpacity>
            ))}
          </View>
          <Text style={styles.ratingHint}>
            {rating === 5 ? '¡Excelente servicio!' : 'Toca para calificar'}
          </Text>
        </View>

        <Spacer size={32} />

        <Button
          title={t('comun:finalizar', 'Finalizar')}
          onPress={onClose}
          variant="primario"
          style={styles.button}
        />
      </Animated.View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    padding: 24,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
    width: '100%',
  },
  card: {
    backgroundColor: COLOR.BLOQUE,
    borderRadius: 32,
    padding: 32,
    width: '100%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: `${COLOR.TEXTO}0D`,
    shadowColor: COLOR.SOMBRA,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  iconContainer: {
    width: 120,
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: `${COLOR.EXITO}1A`,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  confetti: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  title: {
    fontSize: 26,
    fontWeight: '900',
    color: COLOR.TEXTO,
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: COLOR.SUBTEXTO,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  divider: {
    width: '100%',
    height: 1,
    backgroundColor: COLOR.BORDE,
    marginBottom: 24,
  },
  ratingSection: {
    width: '100%',
    alignItems: 'center',
  },
  ratingLabel: {
    fontSize: 14,
    color: COLOR.TEXTO,
    textAlign: 'center',
    fontWeight: '600',
  },
  starsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  starButton: {
    padding: 4,
  },
  ratingHint: {
    fontSize: 12,
    color: COLOR.SUBTEXTO,
    marginTop: 8,
    fontStyle: 'italic',
  },
  button: {
    width: '100%',
  },
})
