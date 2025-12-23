import React, { useEffect, useRef, useState, useCallback } from 'react'
import {
  StyleSheet,
  View,
  Text,
  ActivityIndicator,
  TouchableOpacity,
  Animated,
  Platform,
} from 'react-native'
import {
  useRoute,
  type RouteProp,
  useNavigation,
  useFocusEffect,
} from '@react-navigation/native'
import { useTranslation } from 'react-i18next'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import MapView, { Marker, Polyline } from 'react-native-maps'
import { Ionicons } from '@expo/vector-icons'
import * as Haptics from 'expo-haptics'
import { BlurView } from 'expo-blur'
import { COLOR } from '@/constants'
import { PaseoStatus } from '@/models/Paseo'
import { useControlPaseo } from '@/hooks/cuidador/useControlPaseo'
import { usePublicarUbicacion } from '@/hooks/cuidador/usePublicarUbicacion'
import { Button, Mapa, Icon } from '@/components/ui'
import type { AuthStackParamList } from '@/navigation/types'

type ControlPaseoRouteProp = RouteProp<AuthStackParamList, 'ControlPaseo'>

const ESTADOS_FLUJO = [
  PaseoStatus.CONFIRMADO,
  PaseoStatus.EN_RUTA,
  PaseoStatus.EN_PROGRESO,
  PaseoStatus.FINALIZADO,
]

const ControlPaseo: React.FC = () => {
  const { t } = useTranslation()
  const route = useRoute<ControlPaseoRouteProp>()
  const navigation = useNavigation()
  const insets = useSafeAreaInsets()
  const { paseoId } = route.params

  const { paseo, loading, procesando, cambiarEstado, ruta, ubicacionActual } =
    useControlPaseo(paseoId)

  // Referencia al mapa para centrado
  const mapRef = useRef<MapView>(null)

  // Centrar mapa cuando cambia la ubicación o se enfoca la pantalla
  useFocusEffect(
    useCallback(() => {
      if (ubicacionActual && mapRef.current) {
        mapRef.current.animateToRegion(
          {
            ...ubicacionActual,
            latitudeDelta: 0.005,
            longitudeDelta: 0.005,
          },
          1000
        )
      }
    }, [ubicacionActual])
  )

  // Activar publicación de ubicación en tiempo real
  usePublicarUbicacion(paseoId, paseo?.estado)

  // Animaciones
  const slideAnim = useRef(new Animated.Value(300)).current
  const pulseAnim = useRef(new Animated.Value(1)).current
  const scaleAnim = useRef(new Animated.Value(1)).current
  const glowAnim = useRef(new Animated.Value(0.4)).current

  const [showSuccess, setShowSuccess] = useState(false)

  // Temporizador
  const [tiempoTranscurrido, setTiempoTranscurrido] = useState('00:00:00')
  const [bottomPanelHeight, setBottomPanelHeight] = useState(340)

  // Configuraciones de pantalla y animación de entrada
  useEffect(() => {
    navigation.setOptions({ headerShown: false })

    Animated.spring(slideAnim, {
      toValue: 0,
      tension: 50,
      friction: 8,
      useNativeDriver: true,
    }).start()
  }, [])

  // Animación de pulso y glow para el botón activo
  useEffect(() => {
    if (paseo?.estado === PaseoStatus.EN_PROGRESO) {
      // Pulso del botón
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.05,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ).start()
    }

    // Glow constante pero sutil para invitar a la acción
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(glowAnim, {
          toValue: 0.4,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    ).start()
  }, [paseo?.estado])

  // Temporizador en tiempo real
  useEffect(() => {
    if (!paseo?.fecha_inicio_real || paseo.estado !== PaseoStatus.EN_PROGRESO) {
      // Si no hay fecha o no está en progreso, no activamos el intervalo,
      // pero si está FINALIZADO, mantenemos el último valor calculado.
      if (
        paseo?.estado === PaseoStatus.PENDIENTE ||
        paseo?.estado === PaseoStatus.CONFIRMADO ||
        paseo?.estado === PaseoStatus.EN_RUTA
      ) {
        setTiempoTranscurrido('00:00:00')
      }
      return undefined
    }

    const interval = setInterval(() => {
      const inicio =
        paseo.fecha_inicio_real instanceof Date
          ? paseo.fecha_inicio_real
          : (paseo.fecha_inicio_real as any).toDate()
      const diff = Date.now() - inicio.getTime()
      const horas = Math.floor(diff / 3600000)
      const minutos = Math.floor((diff % 3600000) / 60000)
      const segundos = Math.floor((diff % 60000) / 1000)

      setTiempoTranscurrido(
        `${String(horas).padStart(2, '0')}:${String(minutos).padStart(2, '0')}:${String(segundos).padStart(2, '0')}`
      )
    }, 1000)

    return () => clearInterval(interval)
  }, [paseo?.fecha_inicio_real, paseo?.estado])

  // Configuración del botón según estado
  const getButtonConfig = (
    estado: PaseoStatus
  ): {
    label: string
    icon: string
    evento: 'INICIAR_RUTA' | 'INICIAR_PASEO' | 'FINALIZAR_PASEO' | null
    color: string
  } | null => {
    const estadoColor =
      COLOR.ESTADO[estado as keyof typeof COLOR.ESTADO] ||
      COLOR.ESTADO.CONFIRMADO

    switch (estado) {
      case PaseoStatus.CONFIRMADO:
        return {
          label: t('paseos:control.iniciar_ruta'),
          icon: '🚶',
          evento: 'INICIAR_RUTA',
          color: estadoColor.primario,
        }
      case PaseoStatus.EN_RUTA:
        return {
          label: t('paseos:control.iniciar_paseo'),
          icon: '🐕',
          evento: 'INICIAR_PASEO',
          color: estadoColor.primario,
        }
      case PaseoStatus.EN_PROGRESO:
        return {
          label: t('paseos:control.finalizar_paseo'),
          icon: '🏁',
          evento: 'FINALIZAR_PASEO',
          color: estadoColor.primario,
        }
      case PaseoStatus.FINALIZADO:
        return {
          label: t('paseos:control.ver_resumen'),
          icon: '✅',
          evento: null,
          color: estadoColor.primario,
        }
      default:
        return null
    }
  }

  const handleButtonPress = async () => {
    if (!paseo) return

    const config = getButtonConfig(paseo.estado)
    if (!config) return

    // Animación de presión
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start()

    // Haptic feedback diferenciado
    if (Platform.OS !== 'web') {
      if (config.evento === 'FINALIZAR_PASEO') {
        await Haptics.notificationAsync(
          Haptics.NotificationFeedbackType.Success
        )
      } else {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)
      }
    }

    if (config.evento) {
      await cambiarEstado(config.evento)
      // Si acabamos de finalizar, activamos la pantalla de éxito
      if (config.evento === 'FINALIZAR_PASEO') {
        setShowSuccess(true)
      }
    } else if (paseo.estado === PaseoStatus.FINALIZADO) {
      setShowSuccess(true)
    }
  }

  // Si estamos en la pantalla de éxito, mostramos el overlay
  if (showSuccess) {
    return (
      <SuccessOverlay
        onClose={() => navigation.goBack()}
        tiempo={tiempoTranscurrido}
        mascota={paseo.mascota_nombre_visual}
      />
    )
  }

  const estadoCompletado = (estado: PaseoStatus) => {
    if (!paseo) return false
    const estadoActualIndex = ESTADOS_FLUJO.indexOf(paseo.estado)
    const estadoIndex = ESTADOS_FLUJO.indexOf(estado)
    return estadoIndex < estadoActualIndex
  }

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={COLOR.PRIMARIO} />
        <Text style={styles.loadingText}>{t('comun:cargando')}</Text>
      </View>
    )
  }

  if (!paseo) {
    return (
      <View style={styles.error}>
        <Text style={styles.errorText}>{t('paseos:activo.no_encontrado')}</Text>
        <Button
          title={t('comun:volver')}
          onPress={() => navigation.goBack()}
          variant="secundario"
        />
      </View>
    )
  }

  const buttonConfig = getButtonConfig(paseo.estado)
  const estadoColor =
    COLOR.ESTADO[paseo.estado as keyof typeof COLOR.ESTADO] ||
    COLOR.ESTADO.CONFIRMADO
  const ubicacionInicio =
    typeof paseo.ubicacion_inicio === 'object'
      ? paseo.ubicacion_inicio.coordenadas
      : null

  return (
    <View style={styles.container}>
      {/* Mapa de fondo */}
      <Mapa
        ref={mapRef}
        style={styles.map}
        alto="100%"
        interactivo
        marcador={false}
        coordenadas={
          ubicacionActual ||
          ubicacionInicio || { latitude: -34.6037, longitude: -58.3816 }
        }
        mapPadding={{
          top: insets.top + 80,
          bottom: bottomPanelHeight,
          left: 0,
          right: 0,
        }}
      >
        {/* Marcador de punto de recogida */}
        {ubicacionInicio && (
          <Marker
            coordinate={{
              latitude: ubicacionInicio.latitude,
              longitude: ubicacionInicio.longitude,
            }}
            title={t('paseos:control.punto_recogida')}
            description={paseo.ubicacion_inicio_txt || ''}
            pinColor={COLOR.ENFASIS}
          />
        )}

        {/* Ruta recorrida */}
        {ruta.length > 0 && (
          <Polyline
            coordinates={ruta}
            strokeColor={COLOR.PRIMARIO}
            strokeWidth={4}
          />
        )}

        {/* Marcador de ubicación actual (si es diferente al punto de recogida) */}
        {ubicacionActual && (
          <Marker
            coordinate={ubicacionActual}
            pinColor={COLOR.ENFASIS}
            zIndex={999}
          />
        )}
      </Mapa>

      {/* Header Flotante con Glassmorphism */}
      <View style={[styles.headerFloating, { top: insets.top + 8 }]}>
        {Platform.OS === 'ios' ? (
          <BlurView intensity={80} tint="dark" style={styles.blurContainer}>
            <HeaderContent
              navigation={navigation}
              tiempoTranscurrido={tiempoTranscurrido}
              estado={paseo.estado}
              estadoColor={estadoColor}
              t={t}
            />
          </BlurView>
        ) : (
          <View style={styles.androidHeader}>
            <HeaderContent
              navigation={navigation}
              tiempoTranscurrido={tiempoTranscurrido}
              estado={paseo.estado}
              estadoColor={estadoColor}
              t={t}
            />
          </View>
        )}
      </View>

      {/* Panel inferior con animación */}
      <Animated.View
        onLayout={e => setBottomPanelHeight(e.nativeEvent.layout.height)}
        style={[
          styles.bottomPanel,
          {
            transform: [{ translateY: slideAnim }],
            paddingBottom: Math.max(insets.bottom, 16) + 24,
          },
        ]}
      >
        {/* Stepper de progreso */}
        <View style={styles.stepper}>
          {ESTADOS_FLUJO.map((est, index) => (
            <View key={est} style={styles.stepContainer}>
              <View
                style={[
                  styles.stepDot,
                  paseo.estado === est && styles.stepDotActive,
                  estadoCompletado(est) && styles.stepDotCompleted,
                  paseo.estado === est && {
                    backgroundColor: estadoColor.primario,
                  },
                ]}
              >
                {estadoCompletado(est) && (
                  <Ionicons name="checkmark" size={12} color={COLOR.TEXTO} />
                )}
              </View>
              {index < ESTADOS_FLUJO.length - 1 && (
                <View
                  style={[
                    styles.stepLine,
                    estadoCompletado(est) && styles.stepLineCompleted,
                  ]}
                />
              )}
            </View>
          ))}
        </View>

        {/* Información del paseo */}
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <View style={styles.infoIconBox}>
              <Text style={styles.infoIcon}>🐕</Text>
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>
                {t('paseos:control.mascota')}
              </Text>
              <Text style={styles.infoText}>{paseo.mascota_nombre_visual}</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <View style={styles.infoIconBox}>
              <Text style={styles.infoIcon}>📍</Text>
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>
                {t('paseos:control.ubicacion')}
              </Text>
              <Text style={styles.infoText} numberOfLines={1}>
                {paseo.ubicacion_inicio_txt ||
                  t('paseos:control.ubicacion_desconocida')}
              </Text>
            </View>
          </View>

          {tiempoTranscurrido !== '00:00:00' && (
            <View style={styles.infoRow}>
              <View
                style={[
                  styles.infoIconBox,
                  { backgroundColor: `${COLOR.EXITO}1A` },
                ]}
              >
                <Text style={styles.infoIcon}>⏰</Text>
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>
                  {t('paseos:control.tiempo_transcurrido')}
                </Text>
                <Text
                  style={[
                    styles.infoText,
                    { color: COLOR.EXITO, fontWeight: '700' },
                  ]}
                >
                  {tiempoTranscurrido}
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* Hero Button */}
        {buttonConfig && (
          <Animated.View
            style={{
              transform: [
                {
                  scale:
                    paseo.estado === PaseoStatus.EN_PROGRESO
                      ? pulseAnim
                      : scaleAnim,
                },
              ],
              shadowColor: buttonConfig.color,
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: glowAnim,
              shadowRadius: 15,
            }}
          >
            <TouchableOpacity
              style={[
                styles.heroButton,
                { backgroundColor: buttonConfig.color },
                procesando && styles.heroButtonDisabled,
              ]}
              onPress={handleButtonPress}
              disabled={procesando}
              activeOpacity={0.8}
            >
              <Animated.View
                style={[
                  StyleSheet.absoluteFill,
                  {
                    backgroundColor: '#FFF',
                    opacity: glowAnim.interpolate({
                      inputRange: [0.4, 1],
                      outputRange: [0, 0.1],
                    }),
                    borderRadius: 20,
                  },
                ]}
              />
              {procesando ? (
                <ActivityIndicator color={COLOR.TEXTO} size="small" />
              ) : (
                <>
                  <Text style={styles.heroButtonIcon}>{buttonConfig.icon}</Text>
                  <Text style={styles.heroButtonText}>
                    {buttonConfig.label}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </Animated.View>
        )}
      </Animated.View>
    </View>
  )
}

// Componente auxiliar para el header
const HeaderContent: React.FC<{
  navigation: any
  tiempoTranscurrido: string
  estado: PaseoStatus
  estadoColor: any
  t: any
}> = ({ navigation, tiempoTranscurrido, estado, estadoColor, t }) => (
  <View style={styles.headerContent}>
    <TouchableOpacity
      onPress={() => navigation.goBack()}
      style={styles.headerButton}
    >
      <Ionicons name="arrow-back" size={24} color={COLOR.TEXTO} />
    </TouchableOpacity>

    <View style={styles.headerCenter}>
      {tiempoTranscurrido !== '00:00:00' && (
        <Text style={styles.headerTimer}>⏱️ {tiempoTranscurrido}</Text>
      )}
      <View
        style={[styles.estadoBadge, { backgroundColor: estadoColor.fondo }]}
      >
        <Text style={[styles.estadoText, { color: estadoColor.texto }]}>
          {t(`paseos:estados.${estado}`)}
        </Text>
      </View>
    </View>

    <TouchableOpacity style={styles.headerButton}>
      <Ionicons name="ellipsis-vertical" size={24} color={COLOR.TEXTO} />
    </TouchableOpacity>
  </View>
)

// Componente de Pantalla de Éxito Premium
const SuccessOverlay: React.FC<{
  onClose: () => void
  tiempo: string
  mascota: string
}> = ({ onClose, tiempo, mascota }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current
  const scaleAnim = useRef(new Animated.Value(0.8)).current

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 40,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start()
  }, [])

  return (
    <View style={styles.successContainer}>
      <Animated.View
        style={[
          styles.successCard,
          { opacity: fadeAnim, transform: [{ scale: scaleAnim }] },
        ]}
      >
        <View style={styles.successIconCircle}>
          <Ionicons name="checkmark-done" size={60} color={COLOR.EXITO} />
        </View>
        <Text style={styles.successTitle}>¡Gran trabajo!</Text>
        <Text style={styles.successSubtitle}>
          El paseo con {mascota} ha sido completado con éxito.
        </Text>

        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>TIEMPO TOTAL</Text>
            <Text style={styles.statValue}>{tiempo}</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.successButton} onPress={onClose}>
          <Text style={styles.successButtonText}>Finalizar y Volver</Text>
        </TouchableOpacity>
      </Animated.View>

      {/* Mini "Confetti" simple */}
      {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
        <Animated.View
          key={i}
          style={[
            styles.confetti,
            {
              left: `${i * 12}%`,
              top: `${(i % 3) * 20}%`,
              opacity: fadeAnim,
              backgroundColor: i % 2 === 0 ? COLOR.PRIMARIO : COLOR.EXITO,
            },
          ]}
        />
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLOR.BASE,
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLOR.BASE,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: COLOR.TEXTO,
  },
  error: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLOR.BASE,
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: COLOR.ERROR,
    textAlign: 'center',
    marginBottom: 20,
  },
  // Header Flotante
  headerFloating: {
    position: 'absolute',
    left: 16,
    right: 16,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    zIndex: 10,
  },
  blurContainer: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  androidHeader: {
    backgroundColor: 'rgba(18, 25, 24, 0.95)',
    borderRadius: 16,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
  },
  headerButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  headerTimer: {
    fontSize: 13,
    fontWeight: '700',
    color: COLOR.TEXTO,
    letterSpacing: 0.5,
  },
  estadoBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
  },
  estadoText: {
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  // Panel Inferior
  bottomPanel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLOR.BLOQUE,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 24,
    paddingBottom: 24, // El padding dinámico se aplicará vía estilo inline o insets
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 20,
    borderWidth: 1,
    borderColor: `${COLOR.TEXTO}0D`,
  },
  // Stepper
  stepper: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  stepContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: COLOR.INACTIVO,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepDotActive: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 3,
    borderColor: `${COLOR.TEXTO}33`,
  },
  stepDotCompleted: {
    backgroundColor: COLOR.EXITO,
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  stepLine: {
    width: 40,
    height: 2,
    backgroundColor: COLOR.INACTIVO,
    marginHorizontal: 0,
  },
  stepLineCompleted: {
    backgroundColor: COLOR.EXITO,
  },
  // Info Card
  infoCard: {
    backgroundColor: `${COLOR.TEXTO}08`,
    borderRadius: 20,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: `${COLOR.TEXTO}0D`,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  infoIconBox: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: `${COLOR.TEXTO}0D`,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 10,
    color: COLOR.SUBTEXTO,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 2,
  },
  infoIcon: {
    fontSize: 16,
  },
  infoText: {
    fontSize: 15,
    color: COLOR.TEXTO,
    fontWeight: '600',
  },
  // Hero Button
  heroButton: {
    height: 64,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  heroButtonDisabled: {
    opacity: 0.6,
  },
  heroButtonIcon: {
    fontSize: 24,
  },
  heroButtonText: {
    fontSize: 18,
    fontWeight: '800',
    color: COLOR.TEXTO,
    letterSpacing: 1,
  },
  // Success Overlay styles
  successContainer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: `${COLOR.BASE}FA`,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
    padding: 24,
  },
  successCard: {
    backgroundColor: COLOR.BLOQUE,
    borderRadius: 32,
    padding: 32,
    width: '100%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: `${COLOR.TEXTO}0D`,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 20,
  },
  successIconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: `${COLOR.EXITO}26`,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  successTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: COLOR.TEXTO,
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  successSubtitle: {
    fontSize: 16,
    color: COLOR.SUBTEXTO,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    width: '100%',
    marginBottom: 40,
    backgroundColor: `${COLOR.TEXTO}05`,
    borderRadius: 20,
    padding: 20,
  },
  statItem: {
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 10,
    color: COLOR.SUBTEXTO,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  statValue: {
    fontSize: 32,
    fontWeight: '800',
    color: COLOR.EXITO,
  },
  successButton: {
    backgroundColor: COLOR.PRIMARIO,
    paddingHorizontal: 40,
    paddingVertical: 18,
    borderRadius: 20,
    width: '100%',
    alignItems: 'center',
  },
  successButtonText: {
    color: COLOR.TEXTO,
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 1,
  },
  confetti: {
    position: 'absolute',
    width: 6,
    height: 6,
    borderRadius: 3,
  },
})

export default ControlPaseo
