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
  const { paseo, loading, ruta, ubicacionActual } = usePaseoActivo(paseoId)

  // Estados locales
  const [yaNotificado, setYaNotificado] = useState(false)

  // Referencias para control programático y animaciones
  const mapRef = useRef<any>(null)
  const slideAnim = useRef(new Animated.Value(400)).current
  const pulseAnim = useRef(new Animated.Value(0)).current

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
               <View style={styles.liveDot} />
               <Text style={styles.liveLabel}>{t('paseos:activo.estado_label')}</Text>
               <Spacer horizontal size={8} />
               <Text style={styles.timeLabel}>
                 {t('paseos:activo.tiempo_restante', { tiempo: paseo?.duracion_estimada })}
               </Text>
             </View>

             <Spacer size={12} />
             <Text style={styles.messageText}>{t('paseos:activo.mensaje_calma')}</Text>
             <Spacer size={20} />

             <View style={styles.identityRow}>
               <View style={styles.identityItem}>
                 <PetAvatar uri={paseo?.mascota_foto_visual} size="medium" />
                 <Spacer horizontal size={8} />
                 <Text style={styles.nameLabel}>{paseo?.mascota_nombre_visual}</Text>
               </View>

               <Icon name="chevron-right" size={14} color={COLOR.BORDE} />

               <View style={[styles.identityItem, { justifyContent: 'flex-end' }]}>
                 <Text style={styles.nameLabel}>{paseo?.cuidador_nombre_visual}</Text>
                 <Spacer horizontal size={8} />
                 <Avatar uri={paseo?.cuidador_foto_visual} size={40} />
               </View>
             </View>

             <Spacer size={20} />

             <View style={styles.actionsRow}>
               <Button
                 title={t('paseos:solicitado.chat', { name: paseo?.cuidador_nombre_visual })}
                 icon="whatsapp"
                 onPress={() => {}}
                 variant="exito"
                 style={{ flex: 1.5 }}
               />
               <Spacer horizontal size={12} />
               <Button
                 title={t('paseos:detalles')}
                 onPress={() => {}}
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
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
    zIndex: 10,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: COLOR.BORDE,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 8,
  },
  sheetContent: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 20,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLOR.EXITO,
    marginRight: 6,
  },
  liveLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: COLOR.EXITO,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  timeLabel: {
    fontSize: 12,
    color: COLOR.SUBTEXTO,
    fontWeight: '500',
  },
  messageText: {
    fontSize: 18,
    fontWeight: '700',
    color: COLOR.TEXTO,
    lineHeight: 24,
  },
  identityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLOR.BLOQUE,
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLOR.BORDE,
  },
  identityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  nameLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLOR.TEXTO,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  activeMarker: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 100,
    height: 100,
    overflow: 'visible',
  },
  markerCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLOR.PRIMARIO,
    borderWidth: 2,
    borderColor: COLOR.BASE,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    zIndex: 2,
  },
  pulseEffect: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: COLOR.PRIMARIO,
    zIndex: 1,
  },
})
