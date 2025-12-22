import React, { useEffect, useRef, useCallback, useState } from 'react'
import { StyleSheet, View, ActivityIndicator, Text, Animated, Easing, Alert } from 'react-native'
import { Marker, Polyline, Region } from 'react-native-maps'
import { useTranslation } from 'react-i18next'
import { StackScreenProps } from '@react-navigation/stack'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Mapa, Icon, Avatar, PetAvatar, Spacer, Button } from '@/components/ui'
import { usePaseoActivo } from '@/hooks/paseos/usePaseoActivo'
import { AuthStackParamList } from '@/navigation/types'
import { COLOR } from '@/constants'
import { PaseoStatus } from '@/models/Paseo'

type Props = StackScreenProps<AuthStackParamList, 'PaseoActivo'>

/**
 * Función helper para calcular distancia aproximada en metros entre dos coordenadas.
 */
const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371e3 // Radio de la tierra en metros
  const phi1 = (lat1 * Math.PI) / 180
  const phi2 = (lat2 * Math.PI) / 180
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

  return R * c
}

/**
 * Pantalla de Paseo Activo (Tutor).
 * Muestra el mapa en pantalla completa e interactivo con un panel inferior animado.
 */
export default function PaseoActivoScreen({ route, navigation }: Props) {
  const { paseoId } = route.params
  const { t } = useTranslation()
  const insets = useSafeAreaInsets()
  const { paseo, loading, eventos, ruta, ubicacionActual } = usePaseoActivo(paseoId)

  // Función para renderizar el icono adecuado por tipo de evento
  const getEventoIcon = (tipo: string) => {
    switch (tipo?.toLowerCase()) {
      case 'foto': return { name: 'camera', color: COLOR.PRIMARIO }
      case 'necesidad': return { name: 'poop', color: '#8B4513' } // Marrón
      case 'hidratacion': return { name: 'tint', color: '#00BFFF' } // Azul agua
      default: return { name: 'info-circle', color: COLOR.SUBTEXTO }
    }
  }

  // Estados locales
  const [yaNotificado, setYaNotificado] = useState(false)

  // Referencias para control programático y animaciones
  const mapRef = useRef<any>(null)
  const slideAnim = useRef(new Animated.Value(400)).current
  const pulseAnim = useRef(new Animated.Value(0)).current
  const glowAnim = useRef(new Animated.Value(0)).current

  // Monitoreo de Transiciones de Estado
  useEffect(() => {
    if (!paseo || yaNotificado) return

    // Caso 1: Paseo Finalizado
    if (paseo.estado === PaseoStatus.FINALIZADO || paseo.estado === PaseoStatus.COMPLETADO) {
      setYaNotificado(true)
      Alert.alert(
        t('paseos:activo.finalizado_titulo'),
        t('paseos:activo.finalizado_mensaje', { nombre: paseo.mascota_nombre_visual }),
        [
          { 
            text: t('comun:aceptar'), 
            onPress: () => navigation.goBack() 
          }
        ]
      )
    }

    // Caso 2: Paseo Cancelado
    if (paseo.estado === PaseoStatus.CANCELADO) {
      setYaNotificado(true)
      Alert.alert(
        t('paseos:activo.cancelado_titulo'),
        t('paseos:activo.cancelado_mensaje'),
        [
          { 
            text: t('comun:aceptar'), 
            onPress: () => navigation.goBack() 
          }
        ]
      )
    }
  }, [paseo?.estado, yaNotificado, t, navigation])

  useEffect(() => {
    if (!loading) {
      // Entrada del panel inferior
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 50,
        friction: 10,
      }).start()

      // Loop de pulso para el marcador (3s para calma)
      Animated.loop(
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 3000,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      ).start()

      // Glow de "Live" (Latido suave)
      Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, {
            toValue: 1,
            duration: 1200,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(glowAnim, {
            toValue: 0.4,
            duration: 1200,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      ).start()
    }
  }, [loading])

  // Lógica de Geocerca (3km)
  const handleRegionChange = useCallback((region: Region) => {
    if (!ubicacionActual) return

    const distance = getDistance(
      region.latitude,
      region.longitude,
      ubicacionActual.latitude,
      ubicacionActual.longitude
    )

    if (distance > 3000) {
      mapRef.current?.animateToRegion({
        ...region,
        latitude: ubicacionActual.latitude,
        longitude: ubicacionActual.longitude,
      }, 1000)
    }
  }, [ubicacionActual])

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={COLOR.PRIMARIO} />
      </View>
    )
  }

  // Caso: Paseo no encontrado o sin permisos
  if (!paseo) {
    return (
      <View style={styles.loading}>
        <Icon name="exclamation-circle" size={48} color={COLOR.SUBTEXTO} />
        <Spacer size={16} />
        <Text style={[styles.messageText, { textAlign: 'center', paddingHorizontal: 40 }]}>
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
  }

  const SHEET_HEIGHT = 300
  
  const pulseStyle = {
    transform: [{
      scale: pulseAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [1, 2.8],
      })
    }],
    opacity: pulseAnim.interpolate({
      inputRange: [0, 0.7, 1],
      outputRange: [0.6, 0.3, 0],
    })
  }

  return (
    <View style={styles.container}>
      {/* MAPA: Interacción completa habilitada */}
      <Mapa
        alto="100%"
        zoom={16}
        interactivo={true}
        style={styles.mapOverride}
        onRegionChangeComplete={handleRegionChange}
        mapPadding={{ bottom: SHEET_HEIGHT + insets.bottom, top: 0, left: 0, right: 0 }}
        coordenadas={ubicacionActual || {
          latitude: 4.6767,
          longitude: -74.0483,
        }}
      >
        {/* Renderizado de Hitos (Eventos) */}
        {eventos.map((ev) => {
          const coords = ev.payload?.coordenadas
          if (!coords) return null
          const icon = getEventoIcon(ev.evento)

          return (
            <Marker 
              key={ev.id} 
              coordinate={coords} 
              anchor={{ x: 0.5, y: 0.5 }}
              tracksViewChanges={false} // Optimización
            >
              <View style={styles.eventMarker}>
                <View style={[styles.eventCircle, { borderColor: icon.color }]}>
                  <Icon name={icon.name} size={10} color={icon.color} />
                </View>
              </View>
            </Marker>
          )
        })}

        {ruta.length > 0 && (
          <Polyline
            coordinates={ruta}
            strokeColor={COLOR.PRIMARIO}
            strokeWidth={4}
          />
        )}

        {ubicacionActual && (
          <Marker coordinate={ubicacionActual} anchor={{ x: 0.5, y: 0.5 }}>
            <View style={styles.activeMarker}>
              <Animated.View style={[styles.pulseEffect, pulseStyle]} />
              <View style={styles.markerCircle}>
                 <Icon name="paw" size={14} color={COLOR.BASE} />
              </View>
            </View>
          </Marker>
        )}
      </Mapa>

      {/* BLOQUEO TRANSPARENCIA (Android Nav Bar) */}
      <View style={[styles.bottomBlocker, { height: insets.bottom }]} />

      {/* PANEL LOCAL (No Modal): Permite interactividad y navegación superior */}
      <Animated.View 
        style={[
          styles.localSheet, 
          { 
            height: SHEET_HEIGHT + insets.bottom, 
            transform: [{ translateY: slideAnim }],
            paddingBottom: insets.bottom
          }
        ]}
      >
        <View style={styles.handle} />
        
        <View style={styles.sheetContent}>
             <View style={styles.statusHeader}>
               <Animated.View style={[styles.liveDot, { opacity: glowAnim }]} />
               <Text style={styles.liveLabel}>{t('paseos:activo.estado_label')}</Text>
               <View style={styles.dividerDot} />
               <Text style={styles.timeLabel}>
                 {t('paseos:activo.tiempo_restante', { tiempo: paseo?.duracion_estimada })}
               </Text>
             </View>

             <Spacer size={16} />
             <Text style={styles.messageText}>{t('paseos:activo.mensaje_calma')}</Text>
             <Spacer size={24} />

             {/* Tarjetas de Identidad Premium */}
             <View style={styles.identityCard}>
               <View style={styles.identityItem}>
                 <View style={styles.avatarWrapper}>
                   <PetAvatar uri={paseo?.mascota_foto_visual} size="medium" />
                   <View style={styles.onlineBadge} />
                 </View>
                 <View style={styles.identityText}>
                   <Text style={styles.nameLabel}>{paseo?.mascota_nombre_visual}</Text>
                   <Text style={styles.subLabel}>{t('paseos:activo.mascota_protegida')}</Text>
                 </View>
               </View>

               <View style={styles.verticalDivider} />

               <View style={[styles.identityItem, { justifyContent: 'flex-end' }]}>
                 <View style={[styles.identityText, { alignItems: 'flex-end' }]}>
                   <Text style={styles.nameLabel}>{paseo?.cuidador_nombre_visual}</Text>
                   <Text style={styles.subLabel}>{t('paseos:activo.cuidador_verificado')}</Text>
                 </View>
                 <Spacer horizontal size={12} />
                 <Avatar uri={paseo?.cuidador_foto_visual} size={44} />
               </View>
             </View>

             <Spacer size={24} />

             {/* Feed de Actividad Reciente */}
             <View style={styles.eventsSection}>
               <Text style={styles.sectionHeader}>{t('paseos:activo.actividad_reciente')}</Text>
               <Spacer size={12} />
               {eventos.length > 0 ? (
                 eventos.slice(0, 3).map((ev) => {
                   const icon = getEventoIcon(ev.evento)
                   return (
                     <View key={ev.id} style={styles.eventRow}>
                       <View style={[styles.eventDot, { backgroundColor: icon.color }]} />
                       <View style={styles.eventIconSmall}>
                         <Icon name={icon.name} size={14} color={icon.color} />
                       </View>
                       <Text style={styles.eventText}>
                         {t(`paseos:activo.tipo_evento.${ev.evento?.toLowerCase()}`)}
                       </Text>
                     </View>
                   )
                 })
               ) : (
                 <Text style={styles.emptyEventsText}>{t('paseos:activo.eventos_vacios')}</Text>
               )}
             </View>

             <Spacer size={24} />

              <View style={styles.actionsRow}>
                <Button
                  title={t('paseos:solicitado.chat', { name: paseo?.cuidador_nombre_visual })}
                  icon="whatsapp"
                  onPress={() => {
                    // Placeholder para futuro chat interno
                    Alert.alert(
                      t('comun:proximamente'),
                      t('paseos:activo.chat_interno_aviso')
                    )
                  }}
                  variant="exito"
                  style={{ flex: 1.5 }}
                />
                <Spacer horizontal size={12} />
                <Button
                  title={t('paseos:detalles')}
                  onPress={() => {
                    Alert.alert(
                      t('paseos:detalle.titulo'),
                      `${t('paseos:campos.precio')}: $${paseo?.precio}\n${t('paseos:campos.duracion')}: ${paseo?.duracion_estimada} min\n${t('paseos:lista.mascotas')}: ${paseo?.mascota_nombre_visual}`
                    )
                  }}
                  variant="secundario"
                  style={{ flex: 1 }}
                />
              </View>
        </View>
      </Animated.View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLOR.BASE,
  },
  mapOverride: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 0,
    borderWidth: 0,
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLOR.BASE,
  },
  bottomBlocker: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLOR.BASE,
    zIndex: 1,
  },
  localSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLOR.SECUNDARIO,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 15,
    zIndex: 10,
    borderWidth: 1,
    borderColor: COLOR.BORDE,
  },
  handle: {
    width: 36,
    height: 4,
    backgroundColor: COLOR.BORDE,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 6,
  },
  sheetContent: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 24,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  liveDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLOR.EXITO,
    marginRight: 8,
    shadowColor: COLOR.EXITO,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
  },
  liveLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: COLOR.EXITO,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  dividerDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: COLOR.BORDE,
    marginHorizontal: 10,
  },
  timeLabel: {
    fontSize: 13,
    color: COLOR.SUBTEXTO,
    fontWeight: '600',
  },
  messageText: {
    fontSize: 22,
    fontWeight: '800',
    color: COLOR.TEXTO, 
    lineHeight: 28,
    letterSpacing: -0.5,
  },
  identityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLOR.BLOQUE,
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLOR.BORDE,
  },
  identityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatarWrapper: {
    position: 'relative',
  },
  onlineBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: COLOR.EXITO,
    borderWidth: 2,
    borderColor: COLOR.BLOQUE,
  },
  identityText: {
    flex: 1,
    marginLeft: 10,
  },
  nameLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: COLOR.TEXTO,
  },
  subLabel: {
    fontSize: 11,
    color: COLOR.SUBTEXTO,
    fontWeight: '500',
    marginTop: 1,
  },
  verticalDivider: {
    width: 1,
    height: 30,
    backgroundColor: COLOR.BORDE,
    marginHorizontal: 12,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  eventsSection: {
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  sectionHeader: {
    fontSize: 12,
    fontWeight: '800',
    color: COLOR.SUBTEXTO,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  eventRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  eventDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 10,
  },
  eventIconSmall: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  eventText: {
    fontSize: 14,
    color: COLOR.TEXTO,
    fontWeight: '500',
  },
  emptyEventsText: {
    fontSize: 13,
    color: COLOR.SUBTEXTO,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 8,
  },
  activeMarker: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 100,
    height: 100,
    overflow: 'visible',
  },
  markerCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLOR.PRIMARIO,
    borderWidth: 3,
    borderColor: COLOR.BASE,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    zIndex: 2,
  },
  pulseEffect: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLOR.PRIMARIO,
    zIndex: 1,
  },
  eventMarker: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 40,
    height: 40,
  },
  eventCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLOR.BASE,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
  },
})
