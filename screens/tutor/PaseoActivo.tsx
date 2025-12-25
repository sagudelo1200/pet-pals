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
import { Marker, Polyline, Region } from 'react-native-maps'
import { useTranslation } from 'react-i18next'
import { useFocusEffect } from '@react-navigation/native'
import { StackScreenProps } from '@react-navigation/stack'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { BlurView } from 'expo-blur'
import { Mapa, Icon, Avatar, Spacer, Button } from '@/components/ui'
import { usePaseoActivo } from '@/hooks/paseos/usePaseoActivo'
import { AuthStackParamList } from '@/navigation/types'
import { COLOR } from '@/constants'
import { PaseoStatus } from '@/models/Paseo'

type Props = StackScreenProps<AuthStackParamList, 'PaseoActivo'>

export default function PaseoActivo({ route, navigation }: Props) {
  const { paseoId } = route.params
  const { t } = useTranslation()
  const insets = useSafeAreaInsets()
  const { paseo, loading, eventos, ruta, ubicacionActual } =
    usePaseoActivo(paseoId)

  const [yaNotificado, setYaNotificado] = useState(false)
  const navigationAttempted = useRef(false)
  const mapRef = useRef<any>(null)
  const slideAnim = useRef(new Animated.Value(400)).current
  const liveGlowAnim = useRef(new Animated.Value(0)).current

  const [bottomPanelHeight, setBottomPanelHeight] = useState(350)

  useEffect(() => {
    navigation.setOptions({ headerShown: false })
  }, [])

  useEffect(() => {
    if (!paseo || yaNotificado || navigationAttempted.current) return
    if (
      paseo.estado === PaseoStatus.FINALIZADO ||
      paseo.estado === PaseoStatus.COMPLETADO
    ) {
      navigationAttempted.current = true
      setYaNotificado(true)
      navigation.navigate('PaseoFinalizado', { paseoId })
    }
    if (paseo.estado === PaseoStatus.CANCELADO) {
      navigationAttempted.current = true
      setYaNotificado(true)
      Alert.alert(
        t('paseos:activo.cancelado_titulo'),
        t('paseos:activo.cancelado_mensaje'),
        [{ text: t('comun:aceptar'), onPress: () => navigation.goBack() }]
      )
    }
  }, [paseo?.estado, yaNotificado, t, navigation])

  useEffect(() => {
    if (!loading) {
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 50,
        friction: 10,
      }).start()
      Animated.loop(
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
      ).start()
    }
  }, [loading])

  // Efecto para centrar el mapa al entrar a la pantalla o recuperar el foco
  useFocusEffect(
    useCallback(() => {
      if (ubicacionActual && mapRef.current) {
        mapRef.current.animateToRegion(
          {
            latitude: ubicacionActual.latitude,
            longitude: ubicacionActual.longitude,
            latitudeDelta: 0.005,
            longitudeDelta: 0.005,
          },
          1000
        )
      }
    }, [ubicacionActual])
  )

  // Efecto para centrar el mapa cuando llega la primera ubicación real (fallback)
  useEffect(() => {
    if (ubicacionActual && mapRef.current) {
      mapRef.current.animateToRegion(
        {
          latitude: ubicacionActual.latitude,
          longitude: ubicacionActual.longitude,
          latitudeDelta: 0.005,
          longitudeDelta: 0.005,
        },
        1000
      )
    }
  }, [ubicacionActual === null]) // Solo ejecutar cuando pasa de null a tener valor

  // eslint-disable-next-line
  const handleRegionChange = useCallback((_region: Region) => {
    // Lógica opcional: si el usuario mueve mucho el mapa, mostrar botón "Recentrar"
  }, [])

  if (loading)
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={COLOR.PRIMARIO} />
      </View>
    )
  if (!paseo)
    return (
      <View style={styles.loading}>
        <Icon name="exclamation-circle" size={48} color={COLOR.SUBTEXTO} />
        <Spacer size={16} />
        <Text style={styles.messageText}>
          {t('paseos:activo.no_encontrado')}
        </Text>
        <Spacer size={24} />
        <Button
          title={t('comun:volver')}
          onPress={() => navigation.goBack()}
          variant="secundario"
        />
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
      case PaseoStatus.CONFIRMADO:
        return t('paseos:activo.mensajes.confirmado', placeholders)
      case PaseoStatus.EN_RUTA:
        return t('paseos:activo.mensajes.en_ruta', placeholders)
      case PaseoStatus.EN_PROGRESO:
        return t('paseos:activo.mensajes.en_progreso', placeholders)
      default:
        return t(`paseos:estados.${paseo.estado}`)
    }
  }

  const ubicacionInicio =
    typeof paseo.ubicacion_inicio === 'object'
      ? paseo.ubicacion_inicio.coordenadas
      : null

  return (
    <View style={styles.container}>
      <Mapa
        ref={mapRef}
        alto="100%"
        zoom={15}
        interactivo={true}
        marcador={false} // Desactivar marcador estático por defecto
        style={styles.mapOverride}
        onRegionChangeComplete={handleRegionChange}
        mapPadding={{
          bottom: bottomPanelHeight,
          top: insets.top + 80,
          left: 0,
          right: 0,
        }}
        coordenadas={
          ubicacionActual ||
          ubicacionInicio || { latitude: -34.6037, longitude: -58.3816 }
        }
      >
        {ruta.length > 0 && paseo?.estado === PaseoStatus.EN_PROGRESO && (
          <Polyline
            coordinates={ruta}
            strokeColor={COLOR.ENFASIS}
            strokeWidth={4}
          />
        )}
        {ubicacionActual && (
          <Marker
            coordinate={ubicacionActual}
            zIndex={999}
            anchor={
              paseo?.estado === PaseoStatus.EN_PROGRESO
                ? { x: 0.52, y: 0.52 }
                : undefined
            }
            pinColor={
              paseo?.estado === PaseoStatus.EN_PROGRESO
                ? 'transparent'
                : COLOR.ENFASIS
            }
          >
            {paseo?.estado === PaseoStatus.EN_PROGRESO && (
              <View style={styles.liveMarkerWrapper}>
                <View style={styles.liveMarkerIcon}>
                  <Icon name="paw" size={18} color={COLOR.TEXTO} />
                </View>
              </View>
            )}
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
          <View style={styles.personCard}>
            <Avatar uri={paseo.cuidador_foto_visual} size={48} />
            <View style={styles.personInfo}>
              <Text style={styles.personInfoLabel}>
                {t('paseos:detalle.cuidador')}
              </Text>
              <Text style={styles.personName}>
                {paseo.cuidador_nombre_visual}
              </Text>
            </View>
            <TouchableOpacity style={styles.chatButton}>
              <Ionicons
                name="chatbubble-ellipses"
                size={22}
                color={COLOR.PRIMARIO}
              />
            </TouchableOpacity>
          </View>

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
                      {formatTime(ev.creado_en)}
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
    </View>
  )
}

function estadoIcono(estado: PaseoStatus) {
  switch (estado) {
    case PaseoStatus.CONFIRMADO:
      return 'checkmark-circle'
    case PaseoStatus.EN_RUTA:
      return 'bicycle'
    case PaseoStatus.EN_PROGRESO:
      return 'walk'
    case PaseoStatus.FINALIZADO:
      return 'flag'
    default:
      return 'help'
  }
}

function formatTime(date: Date) {
  if (!date) return ''
  const d =
    date instanceof Date ? date : (date as any).toDate?.() || new Date(date)
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
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
})
