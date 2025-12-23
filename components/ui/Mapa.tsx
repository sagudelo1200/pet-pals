import React, { forwardRef } from 'react'
import { StyleSheet, View, ViewStyle } from 'react-native'
import MapView, {
  Marker,
  Region,
  PROVIDER_DEFAULT,
  PROVIDER_GOOGLE,
} from 'react-native-maps'
import { COLOR } from '@/constants'
import Icon from './Icon'

interface MapaProps {
  /** Coordenadas iniciales o estáticas */
  coordenadas?: {
    latitude: number
    longitude: number
  }
  /** Región controlada (opcional) */
  region?: Region
  /** Callback al terminar de mover el mapa (modo interactivo) */
  onRegionChangeComplete?: (region: Region) => void

  alto?: number | string

  /** Muestra el marcador rojo en las coordenadas fijas (modo estático default) */
  marcador?: boolean

  /** Nivel de zoom inicial */
  zoom?: number

  /** Google o Default (Apple/OSM) */
  provider?: 'google' | 'default'

  style?: ViewStyle

  /** Habilita gestos (scroll, zoom) */
  interactivo?: boolean

  /** Muestra un pin fijo en el centro de la vista (para selección tipo Uber) */
  pinCentro?: boolean

  /** Componentes adicionales para renderizar dentro del mapa (Markers, Polylines, etc.) */
  children?: React.ReactNode

  /** Padding interno para el mapa (útil para centrar la vista con overlays) */
  mapPadding?: { top: number; right: number; bottom: number; left: number }
}

export const Mapa = forwardRef<MapView, MapaProps>(
  (
    {
      coordenadas,
      region,
      onRegionChangeComplete,
      alto = 200,
      marcador = true,
      zoom = 15,
      provider = PROVIDER_GOOGLE, // Google por defecto para consistencia
      style,
      interactivo = false,
      pinCentro = false,
      children,
      mapPadding,
    },
    ref
  ) => {
    const delta = 0.0922 * Math.pow(2, 15 - zoom)

    // Calcular región inicial si no se provee una controlada
    const initialRegion = coordenadas
      ? {
          latitude: coordenadas.latitude,
          longitude: coordenadas.longitude,
          latitudeDelta: delta,
          longitudeDelta: delta * 0.421,
        }
      : undefined

    return (
      <View style={[styles.container, { height: alto } as any, style]}>
        <MapView
          ref={ref}
          provider={provider === 'google' ? PROVIDER_GOOGLE : PROVIDER_DEFAULT}
          style={styles.map}
          initialRegion={initialRegion}
          region={region}
          onRegionChangeComplete={onRegionChangeComplete}
          scrollEnabled={interactivo}
          zoomEnabled={interactivo}
          zoomControlEnabled={interactivo}
          zoomTapEnabled={interactivo}
          pitchEnabled={interactivo}
          rotateEnabled={interactivo}
          showsUserLocation={false}
          showsMyLocationButton={false}
          mapPadding={mapPadding}
        >
          {/* Marcador estático (si no usamos pin central) */}
          {marcador && !pinCentro && coordenadas && (
            <Marker coordinate={coordenadas} pinColor={COLOR.ENFASIS} />
          )}
          {children}
        </MapView>

        {/* Pin Central Flotante (UI Overlay) */}
        {pinCentro && (
          <View style={styles.centerPinContainer} pointerEvents="none">
            <Icon name="map-marker" size={40} color={COLOR.ENFASIS} />
            <View style={styles.pinDot} />
            <View style={styles.pinShadow} />
          </View>
        )}
      </View>
    )
  }
)

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: COLOR.SECUNDARIO,
    borderWidth: 1,
    borderColor: COLOR.BORDE,
    position: 'relative', // Necesario para el overlay
  },
  map: {
    width: '100%',
    height: '100%',
  },
  centerPinContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 40, // Ajuste para que la punta del pin caiga en el centro exacto
    zIndex: 10,
  },
  pinShadow: {
    width: 10,
    height: 4,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 5,
    marginTop: -4,
  },
  pinDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLOR.BASE,
    position: 'absolute',
    top: '50%',
    marginTop: -15,
    zIndex: 11,
  },
})
