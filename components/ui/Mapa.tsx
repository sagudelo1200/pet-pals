import React from 'react'
import { StyleSheet, View, ViewStyle } from 'react-native'
import MapView, { Marker, PROVIDER_DEFAULT, PROVIDER_GOOGLE } from 'react-native-maps'
import { COLOR } from '@/constants'

interface MapaProps {
  coordenadas: {
    latitude: number
    longitude: number
  }
  alto?: number
  marcador?: boolean
  zoom?: number
  provider?: 'google' | 'default'
  style?: ViewStyle
}

export const Mapa = ({
  coordenadas,
  alto = 200,
  marcador = true,
  zoom = 15,
  provider = PROVIDER_DEFAULT,
  style,
}: MapaProps) => {
  const delta = 0.0922 * Math.pow(2, 15 - zoom)

  return (
    <View style={[styles.container, { height: alto }, style]}>
      <MapView
        provider={provider === 'google' ? PROVIDER_GOOGLE : PROVIDER_DEFAULT}
        style={styles.map}
        initialRegion={{
          latitude: coordenadas.latitude,
          longitude: coordenadas.longitude,
          latitudeDelta: delta,
          longitudeDelta: delta * 0.420, // Aspect ratio correction
        }}
        region={{
          latitude: coordenadas.latitude,
          longitude: coordenadas.longitude,
          latitudeDelta: delta,
          longitudeDelta: delta * 0.420,
        }}
        scrollEnabled={false} // Static preview by default, customizable if needed
        zoomEnabled={false}
      >
        {marcador && (
          <Marker
            coordinate={coordenadas}
            pinColor={COLOR.PRIMARIO}
          />
        )}
      </MapView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: COLOR.SECUNDARIO,
    borderWidth: 1,
    borderColor: COLOR.BORDE,
    alignItems: 'center',
    justifyContent: 'flex-end',

  },
  map: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
})
