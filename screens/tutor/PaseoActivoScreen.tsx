import React, { useEffect, useRef, useCallback, useState } from 'react'
import {
  StyleSheet,
  View,
  ActivityIndicator,
  Text,
  Animated,
  Easing,
  Alert,
  TouchableOpacity,
  Platform,
} from 'react-native'
import { Marker, Polyline, Region } from 'react-native-maps'
import { useTranslation } from 'react-i18next'
import { StackScreenProps } from '@react-navigation/stack'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { BlurView } from 'expo-blur'
import { Mapa, Icon, Avatar, PetAvatar, Spacer, Button } from '@/components/ui'
import { usePaseoActivo } from '@/hooks/paseos/usePaseoActivo'
import { AuthStackParamList } from '@/navigation/types'
import { COLOR } from '@/constants'
import { PaseoStatus } from '@/models/Paseo'

type Props = StackScreenProps<AuthStackParamList, 'PaseoActivo'>

const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371e3
  const phi1 = (lat1 * Math.PI) / 180
  const phi2 = (lat2 * Math.PI) / 180
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180
  const a = Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) + Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

export default function PaseoActivoScreen({ route, navigation }: Props) {
  const { paseoId } = route.params
  const { t } = useTranslation()
  const insets = useSafeAreaInsets()
  const { paseo, loading, eventos, ruta, ubicacionActual } = usePaseoActivo(paseoId)

  const [yaNotificado, setYaNotificado] = useState(false)
  const mapRef = useRef<any>(null)
  const slideAnim = useRef(new Animated.Value(400)).current
  const pulseAnim = useRef(new Animated.Value(0)).current
  const liveGlowAnim = useRef(new Animated.Value(0)).current
  
  const [bottomPanelHeight, setBottomPanelHeight] = useState(350)

  useEffect(() => {
    navigation.setOptions({ headerShown: false })
  }, [])

  useEffect(() => {
    if (!paseo || yaNotificado) return
    if (paseo.estado === PaseoStatus.FINALIZADO || paseo.estado === PaseoStatus.COMPLETADO) {
      setYaNotificado(true)
      Alert.alert(t('paseos:activo.finalizado_titulo'), t('paseos:activo.finalizado_mensaje', { nombre: paseo.mascota_nombre_visual }), [{ text: t('comun:aceptar'), onPress: () => navigation.goBack() }])
    }
    if (paseo.estado === PaseoStatus.CANCELADO) {
      setYaNotificado(true)
      Alert.alert(t('paseos:activo.cancelado_titulo'), t('paseos:activo.cancelado_mensaje'), [{ text: t('comun:aceptar'), onPress: () => navigation.goBack() }])
    }
  }, [paseo?.estado, yaNotificado, t, navigation])

  useEffect(() => {
    if (!loading) {
      Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 50, friction: 10 }).start()
      Animated.loop(Animated.timing(pulseAnim, { toValue: 1, duration: 3000, easing: Easing.linear, useNativeDriver: true })).start()
      Animated.loop(Animated.sequence([Animated.timing(liveGlowAnim, { toValue: 1, duration: 1000, useNativeDriver: true }), Animated.timing(liveGlowAnim, { toValue: 0.3, duration: 1000, useNativeDriver: true })])).start()
    }
  }, [loading])

  const handleRegionChange = useCallback((region: Region) => {
    if (!ubicacionActual) return
    const distance = getDistance(region.latitude, region.longitude, ubicacionActual.latitude, ubicacionActual.longitude)
    if (distance > 3000) { mapRef.current?.animateToRegion({ ...region, latitude: ubicacionActual.latitude, longitude: ubicacionActual.longitude }, 1000) }
  }, [ubicacionActual])

  if (loading) return <View style={styles.loading}><ActivityIndicator size="large" color={COLOR.PRIMARIO} /></View>
  if (!paseo) return <View style={styles.loading}><Icon name="exclamation-circle" size={48} color={COLOR.SUBTEXTO} /><Spacer size={16} /><Text style={styles.messageText}>{t('paseos:activo.no_encontrado')}</Text><Spacer size={24} /><Button title={t('comun:volver')} onPress={() => navigation.goBack()} variant="secundario" /></View>

  const estadoConfig = COLOR.ESTADO[paseo.estado as keyof typeof COLOR.ESTADO] || COLOR.ESTADO.CONFIRMADO

  const getStatusMessage = () => {
    const placeholders = {
      cuidador: paseo.cuidador_nombre_visual,
      mascota: paseo.mascota_nombre_visual,
    }
    switch (paseo.estado) {
      case PaseoStatus.CONFIRMADO: return t('paseos:activo.mensajes.confirmado', placeholders)
      case PaseoStatus.EN_RUTA: return t('paseos:activo.mensajes.en_ruta', placeholders)
      case PaseoStatus.EN_PROGRESO: return t('paseos:activo.mensajes.en_progreso', placeholders)
      default: return t(`paseos:estados.${paseo.estado}`)
    }
  }

  return (
    <View style={styles.container}>
      <Mapa alto="100%" zoom={16} interactivo={true} style={styles.mapOverride} onRegionChangeComplete={handleRegionChange} mapPadding={{ bottom: bottomPanelHeight, top: insets.top + 80, left: 0, right: 0 }} coordenadas={ubicacionActual || { latitude: -34.6037, longitude: -58.3816 }}>
        {eventos.map((ev) => { const coords = ev.payload?.coordenadas; if (!coords) return null; return ( <Marker key={ev.id} coordinate={coords} anchor={{ x: 0.5, y: 0.5 }}><View style={[styles.eventMarkerOuter, { borderColor: COLOR.PRIMARIO }]}><View style={styles.eventMarkerInner}><Text style={{ fontSize: 10 }}>📍</Text></View></View></Marker> ) })}
        {ruta.length > 0 && <Polyline coordinates={ruta} strokeColor={COLOR.PRIMARIO} strokeWidth={4} />}
        {ubicacionActual && ( <Marker coordinate={ubicacionActual} anchor={{ x: 0.5, y: 0.5 }}><View style={styles.activeMarker}><Animated.View style={[styles.pulseEffect, { transform: [{ scale: pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 2.5] }) }], opacity: pulseAnim.interpolate({ inputRange: [0, 0.8, 1], outputRange: [0.6, 0.2, 0] }) }]} /><View style={[styles.markerCircle, { backgroundColor: COLOR.PRIMARIO }]}><PetAvatar uri={paseo.mascota_foto_visual} size="small" /></View></View></Marker> )}
      </Mapa>

      {/* Header Flotante Premium */}
      <View style={[styles.floatingHeader, { top: insets.top + 12 }]}>
        {Platform.OS === 'ios' ? (
          <BlurView intensity={80} tint="dark" style={styles.headerBlur}>
            <HeaderContent navigation={navigation} glowAnim={liveGlowAnim} msg={getStatusMessage()} estadoConfig={estadoConfig} t={t} estado={paseo.estado} />
          </BlurView>
        ) : (
          <View style={[styles.headerBlur, { backgroundColor: 'rgba(18, 25, 24, 0.95)' }]}>
            <HeaderContent navigation={navigation} glowAnim={liveGlowAnim} msg={getStatusMessage()} estadoConfig={estadoConfig} t={t} estado={paseo.estado} />
          </View>
        )}
      </View>

      {/* Panel Inferior Premium */}
      <Animated.View
        onLayout={(e) => setBottomPanelHeight(e.nativeEvent.layout.height)}
        style={[styles.premiumSheet, { transform: [{ translateY: slideAnim }], paddingBottom: Math.max(insets.bottom, 16) + 24 }]}
      >
         <View style={styles.sheetHandle} />
         
         <View style={styles.sheetContent}>
            {/* Tarjeta de Identidad síncrona con el cuidador */}
            <View style={styles.personCard}>
               <Avatar uri={paseo.cuidador_foto_visual} size={48} />
               <View style={styles.personInfo}>
                  <Text style={styles.personInfoLabel}>{t('paseos:detalle.cuidador')}</Text>
                  <Text style={styles.personName}>{paseo.cuidador_nombre_visual}</Text>
               </View>
               <TouchableOpacity style={styles.chatButton}>
                  <Ionicons name="chatbubble-ellipses" size={22} color={COLOR.PRIMARIO} />
               </TouchableOpacity>
            </View>

            <Spacer size={20} />

            {/* Tarjeta de Estado unificada con el diseño del cuidador */}
            <View style={styles.infoCard}>
               <View style={styles.infoRow}>
                  <View style={[styles.infoIconBox, { backgroundColor: estadoConfig.fondo }]}>
                     <Ionicons name={estadoIcono(paseo.estado)} size={20} color={estadoConfig.primario} />
                  </View>
                  <View style={styles.infoContent}>
                     <Text style={styles.infoLabel}>{t(`paseos:estados.${paseo.estado}`)}</Text>
                     <Text style={styles.infoText}>{getStatusMessage()}</Text>
                  </View>
               </View>
            </View>

            {/* Actividad Reciente */}
            <View style={styles.timelineSection}>
               <Text style={styles.sectionTitle}>{t('paseos:activo.actividad_reciente')}</Text>
               <Spacer size={12} />
               {eventos.length > 0 ? (
                 eventos.slice(0, 2).map((ev) => (
                   <View key={ev.id} style={styles.timelineItem}>
                      <View style={styles.timelineLine} />
                      <View style={[styles.timelineDot, { backgroundColor: COLOR.PRIMARIO }]} />
                      <View style={styles.timelineContent}>
                         <Text style={styles.timelineText}>{t(`paseos:activo.tipo_evento.${ev.evento?.toLowerCase()}`)}</Text>
                         <Text style={styles.timelineTime}>{formatTime(ev.creado_en)}</Text>
                      </View>
                   </View>
                 ))
               ) : (
                 <Text style={styles.emptyText}>{t('paseos:activo.esperando_actividad')}</Text>
               )}
            </View>
         </View>
      </Animated.View>
    </View>
  )
}

function estadoIcono(estado: PaseoStatus) {
  switch (estado) {
    case PaseoStatus.CONFIRMADO: return 'checkmark-circle'
    case PaseoStatus.EN_RUTA: return 'bicycle'
    case PaseoStatus.EN_PROGRESO: return 'walk'
    case PaseoStatus.FINALIZADO: return 'flag'
    default: return 'help'
  }
}

function formatTime(date: Date) {
  if (!date) return ''
  const d = date instanceof Date ? date : (date as any).toDate?.() || new Date(date)
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

const HeaderContent = ({ navigation, glowAnim, msg, estadoConfig, t, estado }: any) => (
  <View style={styles.headerRow}>
    <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
      <Ionicons name="chevron-back" size={24} color={COLOR.TEXTO} />
    </TouchableOpacity>
    <View style={styles.headerInfo}>
      <View style={styles.liveContainer}>
        <View style={styles.liveDotWrapper}>
          <Animated.View style={[styles.liveRipple, { transform: [{ scale: glowAnim.interpolate({ inputRange: [0.3, 1], outputRange: [1, 2.5] }) }], opacity: glowAnim.interpolate({ inputRange: [0.3, 1], outputRange: [0.4, 0] }) }]} />
          <Animated.View style={[styles.liveDot, { opacity: glowAnim }]} />
        </View>
        <Text style={styles.liveText}>LIVE</Text>
      </View>
      <Text style={styles.headerMsg} numberOfLines={1}>{msg}</Text>
    </View>
    <View style={[styles.headerBadge, { backgroundColor: estadoConfig.fondo }]}>
       <Text style={[styles.headerBadgeText, { color: estadoConfig.texto }]}>{t(`paseos:estados.${estado}`).slice(0, 1)}</Text>
    </View>
  </View>
)

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLOR.BASE },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  mapOverride: { ...StyleSheet.absoluteFillObject },
  floatingHeader: { position: 'absolute', left: 16, right: 16, zIndex: 100, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 10, elevation: 8 },
  headerBlur: { borderRadius: 20, overflow: 'hidden' },
  headerRow: { flexDirection: 'row', alignItems: 'center', padding: 12, paddingRight: 16 },
  backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  headerInfo: { flex: 1, paddingHorizontal: 4 },
  liveContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 2 },
  liveDotWrapper: { width: 12, height: 12, justifyContent: 'center', alignItems: 'center', marginRight: 6 },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#FF3B30' },
  liveRipple: { position: 'absolute', width: 8, height: 8, borderRadius: 4, backgroundColor: '#FF3B30' },
  liveText: { fontSize: 10, fontWeight: '900', color: '#FF3B30', letterSpacing: 0.5 },
  headerMsg: { color: COLOR.TEXTO, fontSize: 13, fontWeight: '700' },
  headerBadge: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  headerBadgeText: { fontSize: 12, fontWeight: '800' },
  premiumSheet: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: COLOR.BLOQUE, borderTopLeftRadius: 32, borderTopRightRadius: 32, zIndex: 10, shadowColor: '#000', shadowOffset: { width: 0, height: -8 }, shadowOpacity: 0.25, shadowRadius: 16, elevation: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  sheetHandle: { width: 40, height: 4, backgroundColor: COLOR.BORDE, borderRadius: 2, alignSelf: 'center', marginTop: 12 },
  sheetContent: { padding: 24 },
  personCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.03)', padding: 12, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  personInfo: { flex: 1, marginLeft: 12 },
  personInfoLabel: { fontSize: 10, color: COLOR.SUBTEXTO, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 2 },
  personName: { color: COLOR.TEXTO, fontSize: 16, fontWeight: '700' },
  chatButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center' },
  infoCard: { backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 20, padding: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  infoRow: { flexDirection: 'row', alignItems: 'center' },
  infoIconBox: { width: 40, height: 40, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  infoContent: { flex: 1 },
  infoLabel: { fontSize: 10, color: COLOR.SUBTEXTO, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 2 },
  infoText: { fontSize: 15, color: COLOR.TEXTO, fontWeight: '600' },
  timelineSection: { marginTop: 8 },
  sectionTitle: { fontSize: 14, fontWeight: '800', color: COLOR.SUBTEXTO, textTransform: 'uppercase', letterSpacing: 1 },
  timelineItem: { flexDirection: 'row', height: 50, alignItems: 'center' },
  timelineLine: { position: 'absolute', left: 4, top: 0, bottom: 0, width: 2, backgroundColor: COLOR.BORDE },
  timelineDot: { width: 10, height: 10, borderRadius: 5, zIndex: 2 },
  timelineContent: { marginLeft: 20, flex: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  timelineText: { color: COLOR.TEXTO, fontSize: 14, fontWeight: '500' },
  timelineTime: { color: COLOR.SUBTEXTO, fontSize: 12 },
  emptyText: { color: COLOR.SUBTEXTO, fontSize: 13, fontStyle: 'italic', marginTop: 8 },
  messageText: { fontSize: 18, fontWeight: '700', color: COLOR.TEXTO, textAlign: 'center', paddingHorizontal: 40 },
  activeMarker: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  markerCircle: { width: 36, height: 36, borderRadius: 18, borderWidth: 3, borderColor: COLOR.BASE, overflow: 'hidden', zIndex: 2 },
  pulseEffect: { position: 'absolute', width: 40, height: 40, borderRadius: 20, backgroundColor: COLOR.PRIMARIO },
  eventMarkerOuter: { width: 24, height: 24, borderRadius: 12, backgroundColor: COLOR.BASE, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  eventMarkerInner: { width: 18, height: 18, borderRadius: 9, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },
})
