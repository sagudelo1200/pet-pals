import React, { useEffect, useRef, useCallback, useState } from 'react'
import {
  StyleSheet,
  View,
  ActivityIndicator,
  Text,
  Animated,
  Alert,
  TouchableOpacity,
  Platform,
} from 'react-native'
import { Marker, Polyline, Region, AnimatedRegion } from 'react-native-maps'
import { useTranslation } from 'react-i18next'
import { useFocusEffect, useNavigation } from '@react-navigation/native'
import { StackScreenProps } from '@react-navigation/stack'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { BlurView } from 'expo-blur'
import { Mapa, Icon, Spacer, Button } from '@/components/ui'
import PerroTristeSvg from '@/assets/imgs/undraw/perro_triste_come_periodico.svg'
import InfoCuidadorCard from '@/components/paseos/InfoCuidadorCard'
import { ModalCodigoRecogidaTutor } from '@/components/paseos/ModalCodigoRecogidaTutor'
import { useSincronizadorPaseo } from '@/hooks/paseos/useSincronizadorPaseo'
import { useCodigosRecogidaPorTutor } from '@/hooks/paseos/useCodigosRecogidaPorTutor'
import { useRutaARecogida } from '@/hooks/paseos/useRutaARecogida'
import { useAuth } from '@/context/AuthContext'
import { AuthStackParamList } from '@/navigation/types'
import { COLOR } from '@/constants'
import { ESTADOS_PASEO } from '@/models/Paseo'
import { densificarRuta } from '@/services/geo'

type Props = StackScreenProps<AuthStackParamList, 'PaseoActivo'>

export default function PaseoActivo({ route, navigation }: Props) {
  const { paseoId } = route.params
  const { t, i18n } = useTranslation()
  const insets = useSafeAreaInsets()
  const { paseo, loading, eventos, ruta, ubicacionActual } =
    useSincronizadorPaseo(paseoId)

  // FASE 6: Obtener códigos de recogida por tutor
  const { mascotasPorTutor, codigosPorTutor, validadosPorTutor } =
    useCodigosRecogidaPorTutor(paseoId)

  // Usuario actual (tutor)
  const { user } = useAuth()

  // Extraer coordenadas de recogida del paseo
  const coordRecogida =
    typeof paseo?.ubicacion_inicio === 'object'
      ? paseo.ubicacion_inicio.coordenadas
      : null

  // Extraer ubicación inicial (punto de encuentro/recogida)
  const ubicacionInicio =
    typeof paseo?.ubicacion_inicio === 'object'
      ? paseo.ubicacion_inicio.coordenadas
      : null

  // Obtener ruta hacia punto de recogida (EN_CAMINO) - sincronizado con modo del cuidador
  const { ruta: rutaARecogida } = useRutaARecogida({
    paseoId,
    coordCuidador: ubicacionActual,
    coordRecogida,
    habilitado: paseo?.estado === ESTADOS_PASEO.EN_CAMINO,
    modo: (paseo?.modo_transporte_actual as 'walking' | 'driving') || 'walking',
  })

  const [mostrarModalCodigo, setMostrarModalCodigo] = useState(false)
  const [yaNotificado, setYaNotificado] = useState(false)
  const navigationAttempted = useRef(false)
  const modalCodigoProcessed = useRef(false)
  const mapRef = useRef<any>(null)
  const slideAnim = useRef(new Animated.Value(400)).current
  const liveGlowAnim = useRef(new Animated.Value(0)).current
  const liveLoopRef = useRef<any>(null)
  // Preservar el zoom que el usuario configuró manualmente
  const userDeltaRef = useRef<{
    latitudeDelta: number
    longitudeDelta: number
  } | null>(null)

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

  // Densificar ruta para polyline y reducir saltos visuales
  const [displayedRuta, setDisplayedRuta] = useState(ruta)

  useEffect(() => {
    setDisplayedRuta(densificarRuta(ruta))
  }, [ruta])

  // Evitar parpadeo: componentes memoizados para los iconos (igual que cuidador)
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

  const PawMarkerPickup = React.useMemo(
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

  const [bottomPanelHeight, setBottomPanelHeight] = useState(350)
  const mapPadding = React.useMemo(
    () => ({
      bottom: bottomPanelHeight + 8,
      top: insets.top + 80,
      left: 0,
      right: 0,
    }),
    [bottomPanelHeight, insets.top]
  )

  useEffect(() => {
    navigation.setOptions({ headerShown: false })
  }, [])

  // Reset modalCodigoProcessed cuando salimos de EN_PUNTO_RECOGIDA
  useEffect(() => {
    if (paseo?.estado !== ESTADOS_PASEO.EN_PUNTO_RECOGIDA) {
      modalCodigoProcessed.current = false
    }
  }, [paseo?.estado])

  useEffect(() => {
    if (!paseo || yaNotificado || navigationAttempted.current) return

    // NOTA: La redirección a 'PaseoFinalizado' se reemplaza por GlobalPaseoManager
    // que mostrará un Overlay global.
    // Solo manejamos acciones críticas aquí si fuera necesario.

    if (paseo.estado === ESTADOS_PASEO.CANCELADO) {
      navigationAttempted.current = true
      setYaNotificado(true)
      Alert.alert(
        t('paseos:activo.cancelado_titulo'),
        t('paseos:activo.cancelado_mensaje'),
        [{ text: t('comun:aceptar'), onPress: () => navigation.goBack() }]
      )
    }

    // FASE 6: Mostrar modal con código de recogida cuando cuidador llega (EN_PUNTO_RECOGIDA)
    if (
      paseo.estado === ESTADOS_PASEO.EN_PUNTO_RECOGIDA &&
      !mostrarModalCodigo &&
      !modalCodigoProcessed.current
    ) {
      setMostrarModalCodigo(true)
      modalCodigoProcessed.current = true
    }
  }, [paseo?.estado, yaNotificado, mostrarModalCodigo, t, navigation])

  useEffect(() => {
    if (!loading) {
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 50,
        friction: 10,
      }).start()

      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(liveGlowAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(liveGlowAnim, {
            toValue: 0.3,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      )

      liveLoopRef.current = loop
      loop.start()
    }

    return () => {
      if (liveLoopRef.current) {
        try {
          liveLoopRef.current.stop()
        } catch (_e) {
          // ignore
        }
        liveLoopRef.current = null
      }
    }
  }, [loading, slideAnim, liveGlowAnim])

  // Efecto para centrar el mapa al entrar a la pantalla o recuperar el foco
  // ⚠️ Dependencia [] intencional: no re-centrar en cada actualización GPS
  useFocusEffect(
    useCallback(() => {
      if (ubicacionActual && mapRef.current) {
        const delta = userDeltaRef.current ?? {
          latitudeDelta: 0.005,
          longitudeDelta: 0.005,
        }
        mapRef.current.animateToRegion(
          {
            latitude: ubicacionActual.latitude,
            longitude: ubicacionActual.longitude,
            ...delta,
          },
          1000
        )
      }
    }, [])
  )

  // Efecto para centrar el mapa cuando llega la primera ubicación real (fallback)
  useEffect(() => {
    if (ubicacionActual && mapRef.current) {
      const delta = userDeltaRef.current ?? {
        latitudeDelta: 0.005,
        longitudeDelta: 0.005,
      }
      mapRef.current.animateToRegion(
        {
          latitude: ubicacionActual.latitude,
          longitude: ubicacionActual.longitude,
          ...delta,
        },
        1000
      )
    }
  }, [ubicacionActual === null]) // Solo ejecutar cuando pasa de null a tener valor

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

  // Centrar mapa en el paw (punto de recogida) cuando está EN_CAMINO o EN_PROGRESO (activo y en vivo)
  useEffect(() => {
    if (
      mapRef.current &&
      (paseo?.estado === ESTADOS_PASEO.EN_CAMINO ||
        paseo?.estado === ESTADOS_PASEO.EN_PROGRESO) &&
      ubicacionInicio
    ) {
      const delta = userDeltaRef.current ?? {
        latitudeDelta: 0.008,
        longitudeDelta: 0.008,
      }
      mapRef.current.animateToRegion(
        {
          latitude: ubicacionInicio.latitude,
          longitude: ubicacionInicio.longitude,
          ...delta,
        },
        1200
      )
    }
  }, [ubicacionActual, paseo?.estado])

  // eslint-disable-next-line
  const handleRegionChange = useCallback((region: Region) => {
    // Guardar el zoom actual del usuario para preservarlo en futuros re-centrados
    userDeltaRef.current = {
      latitudeDelta: region.latitudeDelta,
      longitudeDelta: region.longitudeDelta,
    }
  }, [])

  // Centro el mapa en el punto de recogida cuando es CONFIRMADO (sin ubicación del cuidador aún)
  useEffect(() => {
    if (
      mapRef.current &&
      paseo?.estado === ESTADOS_PASEO.CONFIRMADO &&
      !ubicacionActual &&
      ubicacionInicio
    ) {
      const delta = userDeltaRef.current ?? {
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      }
      mapRef.current.animateToRegion(
        {
          latitude: ubicacionInicio.latitude,
          longitude: ubicacionInicio.longitude,
          ...delta,
        },
        1000
      )
    }
  }, [paseo?.estado, ubicacionActual, paseo?.ubicacion_inicio])

  if (loading)
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={COLOR.PRIMARIO} />
      </View>
    )
  if (!paseo)
    return (
      <View style={styles.errorContainer}>
        <View style={styles.errorContent}>
          <View style={styles.errorImageWrapper}>
            <PerroTristeSvg width={280} height={200} />
          </View>

          <Spacer size={32} />

          <Text style={styles.errorTitle}>
            {t('paseos:activo.no_encontrado_titulo') || 'Paseo no disponible'}
          </Text>

          <Spacer size={12} />

          <Text style={styles.errorDescription}>
            {t('paseos:activo.no_encontrado')}
          </Text>

          <Spacer size={32} />

          <Button
            title={t('comun:atras')}
            onPress={() => navigation.goBack()}
            variant="primario"
          />
        </View>
      </View>
    )

  const estadoConfig =
    COLOR.ESTADO[paseo.estado as keyof typeof COLOR.ESTADO] ||
    COLOR.ESTADO.CONFIRMADO

  const getStatusMessage = () => {
    const placeholders = {
      cuidador: paseo.cuidador_nombre_visual,
      mascota: paseo.mascota_nombre_visual,
    }
    switch (paseo.estado) {
      case ESTADOS_PASEO.CONFIRMADO:
        return t('paseos:activo.mensajes.confirmado', placeholders)
      case ESTADOS_PASEO.EN_CAMINO:
        return t('paseos:activo.mensajes.EN_CAMINO', placeholders)
      case ESTADOS_PASEO.EN_PUNTO_RECOGIDA:
        return t('paseos:activo.mensajes.en_punto_recogida', placeholders)
      case ESTADOS_PASEO.EN_PROGRESO:
        return t('paseos:activo.mensajes.en_progreso', placeholders)
      default:
        return t(`paseos:estados.${paseo.estado}`)
    }
  }

  return (
    <View style={styles.container}>
      <Mapa
        ref={mapRef}
        alto="100%"
        zoom={18}
        interactivo={true}
        marcador={false} // Desactivar marcador estático por defecto
        style={styles.mapOverride}
        onRegionChangeComplete={handleRegionChange}
        mapPadding={mapPadding}
        coordenadas={
          ubicacionActual ||
          ubicacionInicio || { latitude: -34.6037, longitude: -58.3816 }
        }
      >
        {/* Ruta recorrida en paseo activo (EN_PROGRESO) */}
        {displayedRuta.length > 0 &&
          paseo?.estado === ESTADOS_PASEO.EN_PROGRESO && (
            <Polyline
              coordinates={displayedRuta}
              strokeColor={COLOR.ENFASIS}
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

        {/* Marcador de ubicación actual del cuidador (EN_CAMINO y EN_PROGRESO) */}
        {ubicacionActual &&
          (paseo?.estado === ESTADOS_PASEO.EN_CAMINO ||
            paseo?.estado === ESTADOS_PASEO.EN_PROGRESO) && (
            <AnimatedMarker
              coordinate={markerCoordinate as any}
              zIndex={999}
              anchor={{ x: 0.52, y: 0.52 }}
              pinColor="transparent"
            >
              {paseo?.estado === ESTADOS_PASEO.EN_CAMINO && <CaregiverMarker />}
              {paseo?.estado === ESTADOS_PASEO.EN_PROGRESO && <PawMarker />}
            </AnimatedMarker>
          )}

        {/* Marcador del punto de encuentro (CONFIRMADO, EN_CAMINO, EN_PUNTO_RECOGIDA) */}
        {ubicacionInicio &&
          (paseo?.estado === ESTADOS_PASEO.CONFIRMADO ||
            paseo?.estado === ESTADOS_PASEO.EN_CAMINO ||
            paseo?.estado === ESTADOS_PASEO.EN_PUNTO_RECOGIDA) && (
            <Marker
              coordinate={ubicacionInicio}
              zIndex={500}
              pinColor="transparent"
              anchor={{ x: 0.52, y: 0.52 }}
              title="Punto de recogida"
              description={
                paseo?.ubicacion_inicio_txt || 'Aquí recogeré a tu mascota'
              }
            >
              <PawMarkerPickup />
            </Marker>
          )}
      </Mapa>

      {/* Header Flotante Premium */}
      <View style={[styles.floatingHeader, { top: insets.top + 12 }]}>
        {Platform.OS === 'ios' ? (
          <BlurView intensity={80} tint="dark" style={styles.headerBlur}>
            <HeaderContent
              navigation={navigation}
              glowAnim={liveGlowAnim}
              msg={getStatusMessage()}
              estadoConfig={estadoConfig}
              t={t}
              estado={paseo.estado}
            />
          </BlurView>
        ) : (
          <View
            style={[
              styles.headerBlur,
              { backgroundColor: `${COLOR.BLOQUE}F2` },
            ]}
          >
            <HeaderContent
              navigation={navigation}
              glowAnim={liveGlowAnim}
              msg={getStatusMessage()}
              estadoConfig={estadoConfig}
              t={t}
              estado={paseo.estado}
            />
          </View>
        )}
      </View>

      {/* Panel Inferior Premium */}
      <Animated.View
        onLayout={e => setBottomPanelHeight(e.nativeEvent.layout.height)}
        style={[
          styles.premiumSheet,
          {
            transform: [{ translateY: slideAnim }],
            paddingBottom: Math.max(insets.bottom, 16) + 24,
          },
        ]}
      >
        <View style={styles.sheetHandle} />

        <View style={styles.sheetContent}>
          {/* Tarjeta de Identidad síncrona con el cuidador */}
          <InfoCuidadorCard
            uri={paseo.cuidador_foto_visual}
            name={paseo.cuidador_nombre_visual}
            size={48}
            onChat={() => {
              navigation.navigate('Chat', { paseoId })
            }}
          />

          <Spacer size={20} />

          {/* Información de Ruta EN_CAMINO */}
          {paseo?.estado === ESTADOS_PASEO.EN_CAMINO && rutaARecogida && (
            <View style={styles.infoCard}>
              <View style={styles.infoRow}>
                <View
                  style={[
                    styles.infoIconBox,
                    { backgroundColor: COLOR.PRIMARIO + '20' },
                  ]}
                >
                  <Icon name="map" size={20} color={COLOR.PRIMARIO} />
                </View>
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>
                    {t('paseos:control.ruta_a_recogida')}
                  </Text>
                  <View style={{ marginTop: 8, gap: 4 }}>
                    <Text style={styles.infoText}>
                      📍 {rutaARecogida.distanciaFormato}
                    </Text>
                    <Text style={styles.infoText}>
                      ⏱️ {rutaARecogida.duracionFormato}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          )}

          <Spacer size={20} />

          {/* Tarjeta de Estado unificada con el diseño del cuidador */}
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <View
                style={[
                  styles.infoIconBox,
                  { backgroundColor: estadoConfig.fondo },
                ]}
              >
                <Ionicons
                  name={estadoIcono(paseo.estado)}
                  size={20}
                  color={estadoConfig.primario}
                />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>
                  {t(`paseos:estados.${paseo.estado}`)}
                </Text>
                <Text style={styles.infoText}>{getStatusMessage()}</Text>
              </View>
            </View>
          </View>

          {/* Actividad Reciente */}
          <View style={styles.timelineSection}>
            <Text style={styles.sectionTitle}>
              {t('paseos:activo.actividad_reciente')}
            </Text>
            <Spacer size={12} />
            {eventos.length > 0 ? (
              eventos.slice(0, 2).map(ev => (
                <View key={ev.id} style={styles.timelineItem}>
                  <View style={styles.timelineLine} />
                  <View
                    style={[
                      styles.timelineDot,
                      { backgroundColor: COLOR.PRIMARIO },
                    ]}
                  />
                  <View style={styles.timelineContent}>
                    <Text style={styles.timelineText}>
                      {t(
                        `paseos:activo.tipo_evento.${ev.evento?.toLowerCase()}`
                      )}
                    </Text>
                    <Text style={styles.timelineTime}>
                      {formatTime(ev.creado_en, i18n?.language)}
                    </Text>
                  </View>
                </View>
              ))
            ) : (
              <Text style={styles.emptyText}>
                {t('paseos:activo.esperando_actividad')}
              </Text>
            )}
          </View>
        </View>
      </Animated.View>

      {/* FASE 6: Modal con código de recogida para que tutor autorize */}
      {paseo &&
        user &&
        (() => {
          const tutorActual = mascotasPorTutor.find(t => t.tutorId === user.uid)
          const codigoTutor = tutorActual
            ? codigosPorTutor[tutorActual.tutorId]
            : '------'
          const codigoValidado = validadosPorTutor[user.uid] === true
          const esUnicoTutor = mascotasPorTutor.length === 1
          return (
            <ModalCodigoRecogidaTutor
              visible={mostrarModalCodigo}
              codigo={codigoTutor}
              codigoValidado={codigoValidado}
              esUnicoTutor={esUnicoTutor}
              onConfirmar={() => {
                if (codigoValidado) {
                  setMostrarModalCodigo(false)
                }
              }}
              onCancelar={() => {
                setMostrarModalCodigo(false)
                navigation.goBack()
              }}
            />
          )
        })()}
    </View>
  )
}

function estadoIcono(estado: ESTADOS_PASEO) {
  switch (estado) {
    case ESTADOS_PASEO.CONFIRMADO:
      return 'checkmark-circle'
    case ESTADOS_PASEO.EN_CAMINO:
      return 'bicycle'
    case ESTADOS_PASEO.EN_PUNTO_RECOGIDA:
      return 'location'
    case ESTADOS_PASEO.EN_PROGRESO:
      return 'walk'
    case ESTADOS_PASEO.FINALIZADO:
      return 'flag'
    default:
      return 'help'
  }
}

function formatTime(date: Date, locale?: string) {
  if (!date) return ''
  const d =
    date instanceof Date ? date : (date as any).toDate?.() || new Date(date)
  return d.toLocaleTimeString(locale || undefined, {
    hour: '2-digit',
    minute: '2-digit',
  })
}

const HeaderContent = ({
  navigation,
  glowAnim,
  msg,
  estadoConfig,
  t,
  estado,
}: any) => (
  <View style={styles.headerRow}>
    <TouchableOpacity
      style={styles.backBtn}
      onPress={() => navigation.goBack()}
    >
      <Ionicons name="chevron-back" size={24} color={COLOR.TEXTO} />
    </TouchableOpacity>
    <View style={styles.headerInfo}>
      <View style={styles.liveContainer}>
        <View style={styles.liveDotWrapper}>
          <Animated.View
            style={[
              styles.liveRipple,
              {
                transform: [
                  {
                    scale: glowAnim.interpolate({
                      inputRange: [0.3, 1],
                      outputRange: [1, 2.5],
                    }),
                  },
                ],
                opacity: glowAnim.interpolate({
                  inputRange: [0.3, 1],
                  outputRange: [0.4, 0],
                }),
              },
            ]}
          />
          <Animated.View style={[styles.liveDot, { opacity: glowAnim }]} />
        </View>
        <Text style={styles.liveText}>{t('paseos:activo.en_vivo')}</Text>
      </View>
      <Text style={styles.headerMsg} numberOfLines={1}>
        {msg}
      </Text>
    </View>
    <View style={[styles.headerBadge, { backgroundColor: estadoConfig.fondo }]}>
      <Text style={[styles.headerBadgeText, { color: estadoConfig.texto }]}>
        {t(`paseos:estados.${estado}`).slice(0, 1)}
      </Text>
    </View>
  </View>
)

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLOR.BASE },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  mapOverride: { ...StyleSheet.absoluteFillObject },
  floatingHeader: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 100,
    shadowColor: COLOR.BASE,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 8,
  },
  headerBlur: { borderRadius: 20, overflow: 'hidden' },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    paddingRight: 16,
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerInfo: { flex: 1, paddingHorizontal: 4 },
  liveContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  liveDotWrapper: {
    width: 12,
    height: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 6,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLOR.EXITO,
  },
  liveRipple: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLOR.EXITO,
  },
  liveText: {
    fontSize: 10,
    fontWeight: '900',
    color: COLOR.EXITO,
    letterSpacing: 0.5,
  },
  headerMsg: { color: COLOR.TEXTO, fontSize: 13, fontWeight: '700' },
  headerBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerBadgeText: { fontSize: 12, fontWeight: '800' },
  premiumSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLOR.BLOQUE,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    zIndex: 10,
    shadowColor: COLOR.SOMBRA,
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 20,
    borderWidth: 1,
    borderColor: `${COLOR.TEXTO}0D`,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    backgroundColor: COLOR.BORDE,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
  },
  sheetContent: { padding: 24 },
  personCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${COLOR.TEXTO}08`,
    padding: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: `${COLOR.TEXTO}0D`,
  },
  personInfo: { flex: 1, marginLeft: 12 },
  personInfoLabel: {
    fontSize: 10,
    color: COLOR.SUBTEXTO,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 2,
  },
  personName: { color: COLOR.TEXTO, fontSize: 16, fontWeight: '700' },
  chatButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: `${COLOR.TEXTO}0D`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoCard: {
    backgroundColor: `${COLOR.TEXTO}08`,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: `${COLOR.TEXTO}0D`,
  },
  infoRow: { flexDirection: 'row', alignItems: 'center' },
  infoIconBox: {
    width: 40,
    height: 40,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  infoContent: { flex: 1 },
  infoLabel: {
    fontSize: 10,
    color: COLOR.SUBTEXTO,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 2,
  },
  infoText: { fontSize: 15, color: COLOR.TEXTO, fontWeight: '600' },
  timelineSection: { marginTop: 8 },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: COLOR.SUBTEXTO,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  timelineItem: { flexDirection: 'row', height: 50, alignItems: 'center' },
  timelineLine: {
    position: 'absolute',
    left: 4,
    top: 0,
    bottom: 0,
    width: 2,
    backgroundColor: COLOR.BORDE,
  },
  timelineDot: { width: 10, height: 10, borderRadius: 5, zIndex: 2 },
  timelineContent: {
    marginLeft: 20,
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timelineText: { color: COLOR.TEXTO, fontSize: 14, fontWeight: '500' },
  timelineTime: { color: COLOR.SUBTEXTO, fontSize: 12 },
  emptyText: {
    color: COLOR.SUBTEXTO,
    fontSize: 13,
    fontStyle: 'italic',
    marginTop: 8,
  },
  messageText: {
    fontSize: 18,
    fontWeight: '700',
    color: COLOR.TEXTO,
    textAlign: 'center',
    paddingHorizontal: 40,
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLOR.BASE,
    paddingHorizontal: 24,
  },
  errorContent: {
    alignItems: 'center',
    maxWidth: 380,
  },
  errorImageWrapper: {
    width: 280,
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: COLOR.TEXTO,
    textAlign: 'center',
    marginBottom: 8,
  },
  errorDescription: {
    fontSize: 14,
    color: COLOR.SUBTEXTO,
    textAlign: 'center',
    lineHeight: 21,
    fontWeight: '500',
  },
})
