import React, { useState, useRef, useEffect } from 'react'
import { View, StyleSheet, FlatList, ActivityIndicator } from 'react-native'
import MapView from 'react-native-maps'
import { Text } from 'galio-framework'
import { COLOR } from '@/constants'
import Button from '@/components/ui/Button'
import Spacer from '@/components/ui/Spacer'
import { Mapa } from '@/components/ui/Mapa'
import { useTranslation } from 'react-i18next'
import { useDirecciones } from '@/hooks/useDirecciones'
import {
  UbicacionHorizontal,
  AgregarUbicacionHorizontal,
} from '@/components/ui/Direcciones/UbicacionHorizontal'
import { CrearDireccionSheet } from '@/components/ui/Direcciones/CrearDireccionSheet'
// `UbicacionRef` removed because it's not used here

interface Props {
  direccionInicialId?: string | null
  onNext: (_direccionId: string, _direccion?: any) => void
  onCancel: () => void
}

export const SeleccionarDireccionPaso: React.FC<Props> = ({
  direccionInicialId,
  onNext,
  onCancel,
}) => {
  const { t } = useTranslation()
  const { direcciones, loading, agregar } = useDirecciones()
  const mapRef = useRef<MapView>(null)

  const [seleccionada, setSeleccionada] = useState<string | null>(
    direccionInicialId || (direcciones[0] ? direcciones[0].ubicacion_id : null)
  )
  const [mostrarCrear, setMostrarCrear] = useState(false)

  // Encontrar la dirección seleccionada para mostrar el mapa preview
  const direccionObj = direcciones.find(d => d.ubicacion_id === seleccionada)

  // Usar las coordenadas del snapshot en la referencia
  const coordenadasPreview = direccionObj?.coordenadas || undefined

  // Centrar el mapa cuando cambia la dirección seleccionada
  useEffect(() => {
    if (coordenadasPreview && mapRef.current) {
      mapRef.current.animateToRegion(
        {
          latitude: coordenadasPreview.latitude,
          longitude: coordenadasPreview.longitude,
          latitudeDelta: 0.002, // Zoom muy cercano
          longitudeDelta: 0.002 * 0.421,
        },
        300 // Duración de la animación en ms
      )
    }
  }, [coordenadasPreview])

  return (
    <View style={styles.container}>
      <Text h5 bold color={COLOR.TEXTO} style={styles.title}>
        {t('tutor:solicitud.paso_direccion')}
      </Text>

      {/* Lista Horizontal */}
      {loading ? (
        <ActivityIndicator
          size="small"
          color={COLOR.PRIMARIO}
          style={{ marginVertical: 20 }}
        />
      ) : (
        <View style={{ height: 130 }}>
          <FlatList
            horizontal
            data={direcciones}
            keyExtractor={item => item.ubicacion_id}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 4 }}
            ListHeaderComponent={
              <AgregarUbicacionHorizontal
                onPress={() => setMostrarCrear(true)}
              />
            }
            renderItem={({ item }) => (
              <UbicacionHorizontal
                ubicacion={item}
                seleccionada={seleccionada === item.ubicacion_id}
                onPress={() => setSeleccionada(item.ubicacion_id)}
              />
            )}
            ListEmptyComponent={
              direcciones.length === 0 ? (
                <Text
                  color={COLOR.SUBTEXTO}
                  style={{ marginLeft: 12, marginTop: 40 }}
                >
                  {t('tutor:solicitud.sin_direcciones')}
                </Text>
              ) : null
            }
          />
        </View>
      )}

      {/* Mapa Preview (Estático) */}
      <View style={styles.mapContainer}>
        <Mapa
          ref={mapRef}
          alto={150}
          marcador
          coordenadas={
            coordenadasPreview || { latitude: 4.62, longitude: -74.08 }
          } // Fallback bogota
          style={{ borderRadius: 12 }}
          zoom={18}
        />
        {!seleccionada && (
          <View style={styles.mapOverlay}>
            <Text color={COLOR.SUBTEXTO}>
              {t('tutor:solicitud.direccion.seleccionar_para_ver')}
            </Text>
          </View>
        )}
      </View>

      <Spacer size={20} />

      <View style={styles.actions}>
        <Button
          variant="ghost"
          onPress={onCancel}
          style={{ flex: 1, marginRight: 8 }}
          title={t('comun:atras')}
        />
        <Button
          variant="primario"
          onPress={() => seleccionada && onNext(seleccionada, direccionObj)}
          style={{ flex: 1, marginLeft: 8 }}
          title={t('comun:continuar')}
          disabled={!seleccionada}
        />
      </View>

      {/* Sheet para crear dirección inline */}
      <CrearDireccionSheet
        visible={mostrarCrear}
        onClose={() => setMostrarCrear(false)}
        onGuardar={async datos => {
          try {
            // Ahora pasamos 'datos' completo (con coords) y el alias
            const nuevaId = await agregar(datos, datos.alias)
            if (nuevaId) {
              setSeleccionada(nuevaId)
              setMostrarCrear(false)
            }
          } catch (e) {
            console.error(e)
          }
        }}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    paddingTop: 10,
  },
  title: {
    marginBottom: 20,
    textAlign: 'center',
  },
  mapContainer: {
    marginTop: 10,
    position: 'relative',
    height: 150,
  },
  mapOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
})
