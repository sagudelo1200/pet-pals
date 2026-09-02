import React, { useRef, useEffect, useState } from 'react'
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Animated,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useTranslation } from 'react-i18next'
import { COLOR } from '@/constants'
import { Button, Spacer } from '@/components/ui'

interface ReputacionCuidador {
  promedio: number
  cantidad: number
}

interface PaseoFinalizadoCardProps {
  mascotaNombre: string
  cuidadorNombre: string
  onClose: () => void
  /**
   * Se invoca UNA sola vez, cuando el usuario CONFIRMA la cantidad de
   * estrellas seleccionada (nunca al tocar una estrella).
   * El segundo argumento es el feedback privado opcional (solo lo ve el
   * evaluado tras la revelación; nunca es público).
   */
  onRate?: (rating: number, comentarioPrivado?: string) => void
  /** Reputación actual del cuidador (prueba social antes de calificar). */
  ratingPrevio?: ReputacionCuidador | null
  /** True mientras se envía la evaluación. */
  enviando?: boolean
  /** True una vez enviada con éxito. */
  enviado?: boolean
  /** Nuevo promedio (impacto) calculado tras enviar. */
  nuevoPromedio?: number | null
}

export const PaseoFinalizadoCard: React.FC<PaseoFinalizadoCardProps> = ({
  mascotaNombre,
  cuidadorNombre,
  onClose,
  onRate,
  ratingPrevio,
  enviando = false,
  enviado = false,
  nuevoPromedio = null,
}) => {
  const { t } = useTranslation()
  const fadeAnim = useRef(new Animated.Value(0)).current
  const scaleAnim = useRef(new Animated.Value(0.8)).current
  const [rating, setRating] = useState(5)
  const [comentarioPrivado, setComentarioPrivado] = useState('')
  const confirmadoRef = useRef(false)

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

  const seleccionarEstrella = (r: number) => {
    if (enviado || enviando) return
    setRating(r) // Solo selección visual; NO dispara la evaluación
  }

  const confirmar = () => {
    if (!onRate || confirmadoRef.current || enviado || enviando) return
    confirmadoRef.current = true
    onRate(rating, comentarioPrivado.trim() || undefined) // Única invocación, al confirmar
  }

  const mostrarReputacion =
    !!ratingPrevio && ratingPrevio.cantidad > 0 && !enviado
  const totalPaseosTrasEnvio =
    ratingPrevio && ratingPrevio.cantidad > 0
      ? ratingPrevio.cantidad + 1
      : 1

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

        <Text style={styles.title}>{t('paseos:finalizado.titulo')}</Text>
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

          {/* Prueba social: reputación actual del cuidador */}
          {mostrarReputacion && (
            <Text style={styles.reputacion}>
              {t('paseos:finalizado.reputacion', {
                promedio: ratingPrevio.promedio.toFixed(1),
                cantidad: ratingPrevio.cantidad,
              })}
            </Text>
          )}

          <Spacer size={12} />
          <View style={styles.starsRow}>
            {[1, 2, 3, 4, 5].map(star => (
              <TouchableOpacity
                key={star}
                onPress={() => seleccionarEstrella(star)}
                style={styles.starButton}
                disabled={enviado || enviando}
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
            {rating === 5
              ? t('paseos:finalizado.excelente')
              : t('paseos:finalizado.toca_calificar')}
          </Text>

          {/* Feedback privado opcional: solo lo ve el evaluado tras la
              revelación; nunca es público (sin fricción) */}
          {!enviado && (
            <TextInput
              style={styles.comentarioPrivado}
              placeholder={t(
                'evaluaciones:comentario_privado_placeholder',
                'Opcional: algo que solo vea el cuidador'
              )}
              value={comentarioPrivado}
              onChangeText={setComentarioPrivado}
              editable={!enviando}
              placeholderTextColor={COLOR.SUBTEXTO}
              multiline
              numberOfLines={2}
            />
          )}

          {/* Impacto tras confirmar */}
          {enviado && (
            <View style={styles.impacto}>
              <Ionicons name="checkmark-circle" size={20} color={COLOR.EXITO} />
              <Text style={styles.impactoTexto}>
                {nuevoPromedio != null
                  ? t('paseos:finalizado.nuevo_promedio', {
                      cuidador: cuidadorNombre,
                      promedio: nuevoPromedio.toFixed(1),
                      cantidad: totalPaseosTrasEnvio,
                    })
                  : t('paseos:finalizado.gracias')}
              </Text>
            </View>
          )}
        </View>

        <Spacer size={24} />

        {/* Confirmación explícita: la evaluación solo se envía aquí */}
        {onRate && !enviado && (
          <>
            <Button
              title={
                enviando
                  ? t('paseos:finalizado.enviando')
                  : t('paseos:finalizado.confirmar')
              }
              onPress={confirmar}
              loading={enviando}
              variant="primario"
              style={styles.button}
            />
            <Spacer size={12} />
          </>
        )}

        <Button
          title={t('comun:finalizar')}
          onPress={onClose}
          variant={enviado ? 'primario' : 'secundario'}
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
  reputacion: {
    fontSize: 13,
    color: COLOR.ORO,
    textAlign: 'center',
    fontWeight: '700',
    marginTop: 8,
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
  comentarioPrivado: {
    width: '100%',
    borderWidth: 1,
    borderColor: COLOR.BORDE,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: COLOR.TEXTO,
    marginTop: 12,
    textAlignVertical: 'top',
    minHeight: 44,
  },
  impacto: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: `${COLOR.EXITO}12`,
  },
  impactoTexto: {
    flex: 1,
    fontSize: 13,
    color: COLOR.TEXTO,
    fontWeight: '600',
    textAlign: 'left',
  },
  button: {
    width: '100%',
  },
})
