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
import { StackScreenProps } from '@react-navigation/stack'
import { useTranslation } from 'react-i18next'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import MapView, { Marker, Polyline, AnimatedRegion } from 'react-native-maps'
import { Ionicons } from '@expo/vector-icons'
import * as Haptics from 'expo-haptics'
import { BlurView } from 'expo-blur'
import { COLOR } from '@/constants'
import { ESTADOS_PASEO } from '@/models/Paseo'
import { useControlPaseo } from '@/hooks/cuidador/useControlPaseo'
import { usePublicarUbicacion } from '@/hooks/cuidador/usePublicarUbicacion'
import { useCodigosRecogidaPorTutor } from '@/hooks/paseos/useCodigosRecogidaPorTutor'
import { useRutaARecogida } from '@/hooks/paseos/useRutaARecogida'
import { Button, Mapa, Icon } from '@/components/ui'
import { BannerUbicacion } from '@/components/comun/BannerUbicacion'
import { ModalIngresarCodigo } from '@/components/paseos/ModalIngresarCodigo'
import RegistrarMomentoPaseo from '@/components/paseos/RegistrarMomentoPaseo'
import { useBitacoraPaseo } from '@/hooks/useBitacoraPaseo'
import type { AuthStackParamList } from '@/navigation/types'
import { densificarRuta } from '@/services/geo'
import { GestorPaseos } from '@/logic/paseos'
import { ServicioPaseo } from '@/services/firebase/firestore/colecciones/paseo'

type ControlPaseoRouteProp = RouteProp<AuthStackParamList, 'ControlPaseo'>

const ESTADOS_FLUJO = [
  ESTADOS_PASEO.CONFIRMADO,
  ESTADOS_PASEO.EN_CAMINO,
  ESTADOS_PASEO.EN_PUNTO_RECOGIDA,
  ESTADOS_PASEO.EN_PROGRESO,
  ESTADOS_PASEO.FINALIZADO,
]

const ControlPaseo: React.FC = () => {
  const { t } = useTranslation()
  const route = useRoute<ControlPaseoRouteProp>()
  const navigation =
    useNavigation<
      StackScreenProps<AuthStackParamList, 'ControlPaseo'>['navigation']
    >()
  const insets = useSafeAreaInsets()
  const { paseoId } = route.params

  const { paseo, loading, procesando, cambiarEstado, ruta, ubicacionActual } =
    useControlPaseo(paseoId)

  // Códigos de recogida por tutor
  const { mascotasPorTutor, validadosPorTutor, intentosFallidosPorTutor } =
    useCodigosRecogidaPorTutor(paseoId)

  // Obtener ruta hacia punto de recogida (cacheada, calcula solo primera vez en EN_CAMINO)
  const coordRecogida =
    typeof paseo?.ubicacion_inicio === 'object'
      ? paseo.ubicacion_inicio.coordenadas
      : null

  // Estado para modo de transporte (caminando vs vehículo)
  const [modoTransporte, setModoTransporte] = useState<'walking' | 'driving'>(
    'walking'
  )

  // Guardar modo de transporte en Firestore para sincronizar con tutor
  useEffect(() => {
    if (paseo?.estado === ESTADOS_PASEO.EN_CAMINO && paseoId) {
      void ServicioPaseo.actualizar(paseoId, {
        modo_transporte_actual: modoTransporte,
      } as any)
    }
  }, [modoTransporte, paseo?.estado, paseoId])

  const { ruta: rutaARecogida, cargando: cargandoRuta } = useRutaARecogida({
    paseoId,
    coordCuidador: ubicacionActual,
    coordRecogida,
    habilitado: paseo?.estado === ESTADOS_PASEO.EN_CAMINO,
    modo: modoTransporte,
  })

  // Estados para modal de validación de código
  const [mostrarModalCodigo, setMostrarModalCodigo] = useState(false)
  const [validandoCodigo, setValidandoCodigo] = useState(false)

  // Estado para modal de registrar momento (bitácora)
  const [mostrarRegistrarMomento, setMostrarRegistrarMomento] = useState(false)

  // Hook para obtener bitácoras en tiempo real
  const { cargando: _cargandoBitacoras } = useBitacoraPaseo(paseoId)

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

  // Centrar en ubicación de inicio cuando el paseo está confirmado
  useFocusEffect(
    useCallback(() => {
      const ubicacionInicioLocal =
        typeof paseo?.ubicacion_inicio === 'object'
          ? paseo.ubicacion_inicio.coordenadas
          : null
      if (
        paseo?.estado === ESTADOS_PASEO.CONFIRMADO &&
        ubicacionInicioLocal &&
        mapRef.current
      ) {
        try {
          mapRef.current.animateToRegion(
            {
              latitude: ubicacionInicioLocal.latitude,
              longitude: ubicacionInicioLocal.longitude,
              latitudeDelta: 0.003,
              longitudeDelta: 0.003,
            },
            700
          )
        } catch (_e) {
          // ignore
        }
      }
    }, [paseo?.estado, paseo?.ubicacion_inicio])
  )

  // Centrar mapa en toda la ruta cuando se carga por primera vez (EN_CAMINO)
  useEffect(() => {
    if (
      rutaARecogida?.polyline &&
      rutaARecogida.polyline.length > 0 &&
      mapRef.current &&
      paseo?.estado === ESTADOS_PASEO.EN_CAMINO
    ) {
      try {
        // Usar fitToCoordinates para mostrar toda la polyline
        (mapRef.current as any).fitToCoordinates(rutaARecogida.polyline, {
          edgePadding: { top: 100, right: 50, bottom: 150, left: 50 },
          animated: true,
        })
      } catch (err) {
        console.debug('[Mapa] Error al centrar en ruta:', err)
      }
    }
  }, [rutaARecogida?.polyline, paseo?.estado])

  // Activar publicación de ubicación en tiempo real
  const { errorMessage: gpsError } = usePublicarUbicacion(
    paseoId,
    paseo?.estado
  )

  // Animaciones
  const slideAnim = useRef(new Animated.Value(300)).current
  const pulseAnim = useRef(new Animated.Value(1)).current
  const scaleAnim = useRef(new Animated.Value(1)).current
  const glowAnim = useRef(new Animated.Value(0.4)).current

  // Animación suave del marcador en vivo
  const AnimatedMarker = Animated.createAnimatedComponent(Marker)
  const initialCoord = ubicacionActual ||
    (typeof paseo?.ubicacion_inicio === 'object'
      ? paseo.ubicacion_inicio.coordenadas
      : null) || { latitude: -34.6037, longitude: -58.3816 }
  const markerCoordinate = useRef(
    new AnimatedRegion({
      latitude: initialCoord.latitude,
      longitude: initialCoord.longitude,
      latitudeDelta: 0,
      longitudeDelta: 0,
    })
  ).current

  const lastUpdateRef = useRef<number | null>(null)
  const prevCoordRef = useRef<any>(initialCoord)

  // Evitar parpadeo: componente memoizado para el icono paw
  const PawMarker = React.useMemo(
    () =>
      React.memo(() => (
        <View style={styles.liveMarkerWrapper}>
          <View style={styles.liveMarkerIcon}>
            <Icon name="paw" size={18} color={COLOR.TEXTO} />
          </View>
        </View>
      )),
    []
  )

  // Componente memoizado para el icono de paseador (walking) en EN_CAMINO
  const CaregiverMarker = React.useMemo(
    () =>
      React.memo(() => (
        <View style={styles.liveMarkerWrapper}>
          <View style={styles.liveMarkerIcon}>
            <Icon name="walking" size={18} color={COLOR.TEXTO} />
          </View>
        </View>
      )),
    []
  )

  // Animar marcador cuando llega nueva ubicación (duración basada en delta)
  useEffect(() => {
    if (!ubicacionActual || !markerCoordinate) return
    const { latitude, longitude } = ubicacionActual
    const now = Date.now()
    const last = lastUpdateRef.current
    const delta = last ? Math.max(0, now - last) : 600
    const duration = Math.min(Math.max(delta, 300), 1200)
    lastUpdateRef.current = now
    prevCoordRef.current = ubicacionActual

    if (typeof (markerCoordinate as any).timing === 'function') {
      void (markerCoordinate as any)
        .timing({ latitude, longitude, duration })
        .start()
    } else {
      void (markerCoordinate as any).setValue({ latitude, longitude })
    }
  }, [ubicacionActual, markerCoordinate])

  // Densificar ruta y reducir saltos visuales
  const [displayedRuta, setDisplayedRuta] = useState(ruta)

  useEffect(() => {
    setDisplayedRuta(densificarRuta(ruta))
  }, [ruta])

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
    if (paseo?.estado === ESTADOS_PASEO.EN_PROGRESO) {
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
    if (
      !paseo?.fecha_inicio_real ||
      paseo.estado !== ESTADOS_PASEO.EN_PROGRESO
    ) {
      // Si no hay fecha o no está en progreso, no activamos el intervalo,
      // pero si está FINALIZADO, mantenemos el último valor calculado.
      if (
        paseo?.estado === ESTADOS_PASEO.PENDIENTE ||
        paseo?.estado === ESTADOS_PASEO.CONFIRMADO ||
        paseo?.estado === ESTADOS_PASEO.EN_CAMINO
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
    estado: ESTADOS_PASEO
  ): {
    label: string
    icon: string
    evento:
      | 'INICIAR_RUTA'
      | 'INICIAR_PASEO'
      | 'FINALIZAR_PASEO'
      | 'LLEGAR_PUNTO_RECOGIDA'
      | null
    color: string
  } | null => {
    const estadoColor =
      COLOR.ESTADO[estado as keyof typeof COLOR.ESTADO] ||
      COLOR.ESTADO.CONFIRMADO

    switch (estado) {
      case ESTADOS_PASEO.CONFIRMADO:
        return {
          label: t('paseos:control.iniciar_ruta'),
          icon: '🚶',
          evento: 'INICIAR_RUTA',
          color: estadoColor.primario,
        }
      case ESTADOS_PASEO.EN_CAMINO:
        return {
          label: t('paseos:control.he_llegado'),
          icon: '📍',
          evento: 'LLEGAR_PUNTO_RECOGIDA',
          color: estadoColor.primario,
        }
      case ESTADOS_PASEO.EN_PUNTO_RECOGIDA:
        return {
          label: t('paseos:control.verificar_codigo'),
          icon: '🔐',
          evento: null,
          color: estadoColor.primario,
        }
      case ESTADOS_PASEO.EN_PROGRESO:
        return {
          label: t('paseos:control.finalizar_paseo'),
          icon: '🏁',
          evento: 'FINALIZAR_PASEO',
          color: estadoColor.primario,
        }
      case ESTADOS_PASEO.FINALIZADO:
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

    // FASE 6: Si está en EN_PUNTO_RECOGIDA, mostrar modal de validación de código
    // (El cuidador ha llegado al punto y el tutor está listo para entregar el código)
    if (paseo.estado === ESTADOS_PASEO.EN_PUNTO_RECOGIDA) {
      setMostrarModalCodigo(true)
      return
    }

    // CONFIRMADO: cambiar directamente a EN_CAMINO (cuidador se va a buscar)
    if (paseo.estado === ESTADOS_PASEO.CONFIRMADO) {
      if (config.evento) {
        await cambiarEstado(config.evento) // INICIAR_RUTA → EN_CAMINO
      }
      return
    }

    // Otros estados: cambiar directamente
    if (config.evento) {
      await cambiarEstado(config.evento)
      if (config.evento === 'FINALIZAR_PASEO') {
        setShowSuccess(true)
      }
    } else if (paseo.estado === ESTADOS_PASEO.FINALIZADO) {
      setShowSuccess(true)
    }
  }

  /**
   * FASE 6: Valida el código ingresado por tutor y cambia a EN_PROGRESO cuando todos validados
   */
  const handleValidarCodigo = async (
    tutorId: string,
    codigoIngresado: string
  ) => {
    if (!paseo) {
      throw new Error('Paseo no encontrado')
    }

    setValidandoCodigo(true)
    try {
      const res = await GestorPaseos.validarCodigoRecogida(
        paseoId,
        tutorId,
        codigoIngresado
      )

      if (res.success) {
        // ✅ Código válido para este tutor
        if ('validado' in res && res.validado) {
          // Verificar si TODOS los tutores han validado
          const tutoresEnPaseo = mascotasPorTutor.map(t => t.tutorId)

          // Incluir el tutor que acaba de validarse (porque Firestore aún no actualizó)
          const validadosActualizado = {
            ...validadosPorTutor,
            [tutorId]: true,
          }

          const allValidated = tutoresEnPaseo.every(
            tId => validadosActualizado[tId] === true
          )

          if (allValidated) {
            // ✅ Todos validados, cerrar modal y cambiar a EN_PROGRESO
            setMostrarModalCodigo(false)
            await cambiarEstado('INICIAR_PASEO')
          }
        }
      } else {
        // ❌ Código inválido: lanzar error con los intentos actualizados
        const error = 'error' in res ? res.error : 'Error desconocido'
        const intentosFallidos =
          'intentosFallidos' in res ? res.intentosFallidos : undefined
        const intentosRestantes =
          intentosFallidos !== undefined ? Math.max(0, 3 - intentosFallidos) : 2

        if (
          error === 'CODIGO_RECOGIDA_BLOQUEADO' ||
          error?.includes('BLOQUEADO') ||
          intentosRestantes === 0
        ) {
          throw new Error(t('paseos:validacion_codigo.intentos_agotados'))
        } else {
          // Lanzar error con contador actualizado
          throw new Error(
            `Código incorrecto. ${intentosRestantes} intento${intentosRestantes !== 1 ? 's' : ''} restante${intentosRestantes !== 1 ? 's' : ''}`
          )
        }
      }
    } finally {
      setValidandoCodigo(false)
    }
  }

  // Si estamos en la pantalla de éxito, mostramos el overlay
  if (showSuccess) {
    return (
      <SuccessOverlay
        // Post-paseo: continuar al registro de la mascota (observación) y
        // luego a la evaluación del tutor. Si el cuidador omite, vuelve al
        // Dashboard desde esas pantallas.
        onClose={() =>
          navigation.navigate('ObservacionMascota', { paseoId })
        }
        tiempo={tiempoTranscurrido}
        mascota={paseo.mascota_nombre_visual}
      />
    )
  }

  const estadoCompletado = (estado: ESTADOS_PASEO) => {
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
          title={t('comun:atras')}
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
        zoom={18}
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
        {/* Ruta recorrida en paseo activo */}
        {displayedRuta.length > 0 &&
          paseo?.estado === ESTADOS_PASEO.EN_PROGRESO && (
            <Polyline
              coordinates={displayedRuta}
              strokeColor={COLOR.PRIMARIO}
              strokeWidth={4}
              geodesic
            />
          )}

        {/* Ruta hacia punto de recogida (EN_CAMINO) */}
        {rutaARecogida?.polyline &&
          paseo?.estado === ESTADOS_PASEO.EN_CAMINO && (
            <Polyline
              coordinates={rutaARecogida.polyline}
              strokeColor={COLOR.PRIMARIO}
              strokeWidth={3}
              geodesic
            />
          )}

        {/* Pin de ubicación de inicio: mostrar cuando el paseo está CONFIRMADO */}
        {ubicacionInicio && paseo?.estado === ESTADOS_PASEO.CONFIRMADO && (
          <Marker
            coordinate={ubicacionInicio}
            anchor={{ x: 0.5, y: 1 }}
            pinColor={COLOR.PRIMARIO}
            identifier="inicio"
          />
        )}

        {/* Icono paw en punto de recogida: mostrar cuando está EN_CAMINO */}
        {coordRecogida && paseo?.estado === ESTADOS_PASEO.EN_CAMINO && (
          <Marker
            coordinate={coordRecogida}
            anchor={{ x: 0.5, y: 0.5 }}
            identifier="recogida"
          >
            <PawMarker />
          </Marker>
        )}

        {ubicacionActual && (
          <AnimatedMarker
            coordinate={markerCoordinate as any}
            zIndex={999}
            anchor={
              paseo?.estado === ESTADOS_PASEO.EN_PROGRESO ||
              paseo?.estado === ESTADOS_PASEO.EN_CAMINO
                ? { x: 0.52, y: 0.52 }
                : undefined
            }
            pinColor={
              paseo?.estado === ESTADOS_PASEO.EN_PROGRESO ||
              paseo?.estado === ESTADOS_PASEO.EN_CAMINO
                ? 'transparent'
                : COLOR.ENFASIS
            }
          >
            {paseo?.estado === ESTADOS_PASEO.EN_CAMINO && <CaregiverMarker />}
            {paseo?.estado === ESTADOS_PASEO.EN_PROGRESO && <PawMarker />}
          </AnimatedMarker>
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
              modoTransporte={modoTransporte}
              setModoTransporte={setModoTransporte}
              mostrarToggleModo={paseo?.estado === ESTADOS_PASEO.EN_CAMINO}
              onChat={() => navigation.navigate('Chat', { paseoId })}
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
              modoTransporte={modoTransporte}
              setModoTransporte={setModoTransporte}
              mostrarToggleModo={paseo?.estado === ESTADOS_PASEO.EN_CAMINO}
              onChat={() => navigation.navigate('Chat', { paseoId })}
            />
          </View>
        )}
      </View>

      {/* Alerta de GPS si hay error */}
      {gpsError && (
        <View
          style={{
            position: 'absolute',
            top: insets.top + 80,
            left: 0,
            right: 0,
            zIndex: 100,
          }}
        >
          <BannerUbicacion
            mensaje={gpsError}
            style={{ marginHorizontal: 16 }}
          />
        </View>
      )}

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

          {/* Distancia y ETA hacia punto de recogida (EN_CAMINO) */}
          {paseo?.estado === ESTADOS_PASEO.EN_CAMINO &&
            rutaARecogida &&
            !cargandoRuta && (
              <View style={styles.infoRow}>
                <View
                  style={[
                    styles.infoIconBox,
                    { backgroundColor: `${COLOR.PRIMARIO}1A` },
                  ]}
                >
                  <Text style={styles.infoIcon}>🗺️</Text>
                </View>
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>
                    {t('paseos:control.ruta_a_recogida') ||
                      'Ruta a punto de recogida'}
                  </Text>
                  <Text style={styles.infoText}>
                    {rutaARecogida.distanciaFormato} •{' '}
                    {rutaARecogida.duracionFormato}
                  </Text>
                </View>
              </View>
            )}

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
                    paseo.estado === ESTADOS_PASEO.EN_PROGRESO
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

      {/* FASE 6: Modal de validación de código por tutor (EN_PUNTO_RECOGIDA -> EN_PROGRESO) */}
      <ModalIngresarCodigo
        visible={mostrarModalCodigo}
        mascotasPorTutor={mascotasPorTutor}
        intentosFallidosPorTutor={intentosFallidosPorTutor}
        onVerificar={handleValidarCodigo}
        onCerrar={() => setMostrarModalCodigo(false)}
        isLoading={validandoCodigo}
        esUnicoTutor={mascotasPorTutor.length === 1}
      />

      {/* Modal para registrar momento del paseo (bitácora) */}
      <RegistrarMomentoPaseo
        visible={mostrarRegistrarMomento}
        paseoId={paseoId}
        ubicacionActual={ubicacionActual}
        onClose={() => setMostrarRegistrarMomento(false)}
        onGuardado={() => {
          // Recargar bitácoras después de guardar
          console.log('[ControlPaseo] Momento registrado')
        }}
      />

      {/* Botón flotante para registrar momento (visible durante EN_PROGRESO) */}
      {paseo?.estado === ESTADOS_PASEO.EN_PROGRESO && (
        <TouchableOpacity
          style={styles.floatingButton}
          onPress={() => setMostrarRegistrarMomento(true)}
          activeOpacity={0.8}
        >
          <Text style={styles.floatingButtonText}>➕</Text>
        </TouchableOpacity>
      )}

      {/* Chat Panel: Bottom Sheet */}
    </View>
  )
}

// Componente auxiliar para el header
const HeaderContent: React.FC<{
  navigation: any
  tiempoTranscurrido: string
  estado: ESTADOS_PASEO
  estadoColor: any
  t: any
  modoTransporte?: 'walking' | 'driving'
  setModoTransporte?: (_modo: 'walking' | 'driving') => void
  mostrarToggleModo?: boolean
  onChat?: () => void
}> = ({
  navigation,
  tiempoTranscurrido,
  estado,
  estadoColor,
  t,
  modoTransporte = 'walking',
  setModoTransporte,
  mostrarToggleModo,
  onChat,
}) => (
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

      {/* Toggle para modo de transporte (solo en EN_CAMINO) */}
      {mostrarToggleModo && setModoTransporte && (
        <TouchableOpacity
          onPress={() =>
            setModoTransporte(
              modoTransporte === 'walking' ? 'driving' : 'walking'
            )
          }
          style={[
            styles.modoTransporteButton,
            {
              backgroundColor:
                modoTransporte === 'walking'
                  ? 'rgba(76, 175, 80, 0.3)'
                  : 'rgba(33, 150, 243, 0.3)',
            },
          ]}
        >
          <Text style={styles.modoTransporteText}>
            {modoTransporte === 'walking'
              ? `🚶 ${t('paseos:control.a_pie')}`
              : `🚗 ${t('paseos:control.vehiculo')}`}
          </Text>
        </TouchableOpacity>
      )}
    </View>

    <TouchableOpacity onPress={onChat} style={styles.headerButton}>
      <Ionicons name="chatbubble" size={24} color={COLOR.TEXTO} />
    </TouchableOpacity>
  </View>
)

// Componente de Pantalla de Éxito Premium
const SuccessOverlay: React.FC<{
  onClose: () => void
  tiempo: string
  mascota: string
}> = ({ onClose, tiempo, mascota }) => {
  const { t } = useTranslation()
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
        <Text style={styles.successTitle}>
          {t('paseos:control.gran_trabajo')}
        </Text>
        <Text style={styles.successSubtitle}>
          {t('paseos:control.exito_mensaje', { mascota })}
        </Text>

        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>
              {t('paseos:control.tiempo_total')}
            </Text>
            <Text style={styles.statValue}>{tiempo}</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.successButton} onPress={onClose}>
          <Text style={styles.successButtonText}>
            {t('paseos:control.registrar_paseo')}
          </Text>
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
    shadowColor: COLOR.SOMBRA,
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
  modoTransporteButton: {
    marginTop: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLOR.SUBTEXTO,
  },
  modoTransporteText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLOR.TEXTO,
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
    shadowColor: COLOR.SOMBRA,
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
    shadowColor: COLOR.SOMBRA,
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
    shadowColor: COLOR.SOMBRA,
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
  liveMarkerWrapper: {
    width: 33,
    height: 33,
    justifyContent: 'center',
    alignItems: 'center',
  },

  liveMarkerIcon: {
    backgroundColor: COLOR.ENFASIS,
    width: 33,
    height: 33,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLOR.BASE,
    zIndex: 2,
  },
  floatingButton: {
    position: 'absolute',
    right: 20,
    bottom: 350,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLOR.PRIMARIO,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLOR.PRIMARIO,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  floatingButtonText: {
    fontSize: 28,
  },
})

export default ControlPaseo
