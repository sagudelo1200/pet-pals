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
  // eslint-disable-next-line no-unused-vars
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

  /** Control granular de gestos (si interactivo es true) */
  scrollEnabled?: boolean
  zoomEnabled?: boolean
  rotateEnabled?: boolean
  pitchEnabled?: boolean

  /** Muestra un pin fijo en el centro de la vista (para selección tipo Uber) */
  pinCentro?: boolean

  /** Opcional: Icono personalizado para el pin central (URI o require) */
  pinCustomIcon?: any

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
      zoom = 18,
      provider = PROVIDER_GOOGLE, // Google por defecto para consistencia
      style,
      interactivo = false,
      scrollEnabled,
      zoomEnabled,
      rotateEnabled,
      pitchEnabled,
      pinCentro = false,
      pinCustomIcon: _pinCustomIcon,
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

    const handleRegionChangeComplete = (newRegion: Region) => {
      // Llamar al callback del usuario cuando termine el movimiento
      if (onRegionChangeComplete) {
        onRegionChangeComplete(newRegion)
      }
    }

    return (
      <View style={[styles.container, { height: alto } as any, style]}>
        <MapView
          ref={ref}
          provider={provider === 'google' ? PROVIDER_GOOGLE : PROVIDER_DEFAULT}
          style={styles.map}
          initialRegion={initialRegion}
          region={region}
          onRegionChangeComplete={handleRegionChangeComplete}
          scrollEnabled={scrollEnabled ?? interactivo}
          zoomEnabled={zoomEnabled ?? interactivo}
          zoomControlEnabled={zoomEnabled ?? interactivo}
          zoomTapEnabled={zoomEnabled ?? interactivo}
          pitchEnabled={pitchEnabled ?? interactivo}
          rotateEnabled={rotateEnabled ?? interactivo}
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

        {/* Pin central visual (tipo Uber/Rappi) - Overlay fuera de MapView */}
        {pinCentro && (
          <View style={styles.markerFixed} pointerEvents="none">
            <Icon
              name="map-marker-alt"
              size={36}
              color={COLOR.ENFASIS}
              style={styles.markerIcon}
            />
            {/* Pequeña sombra en la punta del pin */}
            <View style={styles.markerShadow} />
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
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  map: {
    width: '100%',
    height: '100%',
  },
  markerFixed: {
    position: 'absolute',
    left: '50%',
    top: '50%',
    marginLeft: -27, // Ajuste para centrar el IconView (size 36 * 1.5 / 2 = 27)
    marginTop: -54, // Ajuste para que la punta esté en el centro (size 36 * 1.5 = 54)
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  markerIcon: {
    // Sombra para darle profundidad
    textShadowColor: 'rgba(0, 0, 0, 0.25)',
    textShadowOffset: { width: 0, height: 3 },
    textShadowRadius: 4,
  },
  markerShadow: {
    width: 6,
    height: 3,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    borderRadius: 3,
    marginTop: -4,
  },
})
