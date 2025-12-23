import React from 'react'
import { StyleSheet, View, Text, ActivityIndicator, Alert } from 'react-native'
import { useRoute, type RouteProp, useNavigation } from '@react-navigation/native'
import { useTranslation } from 'react-i18next'
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps'
import { COLOR } from '@/constants'
import { PaseoStatus } from '@/models/Paseo'
import { useControlPaseo } from '@/hooks/cuidador/useControlPaseo'
import { Button, Screen } from '@/components/ui'
import type { CuidadorStackParamList } from '@/navigation/types'

type ControlPaseoRouteProp = RouteProp<CuidadorStackParamList, 'ControlPaseo'>

const ControlPaseoScreen: React.FC = () => {
  const { t } = useTranslation()
  const route = useRoute<ControlPaseoRouteProp>()
  const navigation = useNavigation()
  const { paseoId } = route.params

  const { paseo, loading, procesando, cambiarEstado } = useControlPaseo(paseoId)

  // Configuración del botón según estado
  const getButtonConfig = (estado: PaseoStatus) => {
    switch (estado) {
      case PaseoStatus.CONFIRMADO:
        return {
          label: t('paseos:control.iniciar_ruta'),
          evento: 'INICIAR_RUTA' as const,
          color: COLOR.INFO,
        }
      case PaseoStatus.EN_RUTA:
        return {
          label: t('paseos:control.iniciar_paseo'),
          evento: 'INICIAR_PASEO' as const,
          color: COLOR.PRIMARIO,
        }
      case PaseoStatus.EN_PROGRESO:
        return {
          label: t('paseos:control.finalizar_paseo'),
          evento: 'FINALIZAR_PASEO' as const,
          color: COLOR.EXITO,
        }
      case PaseoStatus.FINALIZADO:
        return {
          label: t('paseos:control.ver_resumen'),
          evento: null,
          color: COLOR.TEXTO,
        }
      default:
        return null
    }
  }

  const handleButtonPress = () => {
    if (!paseo) return

    const config = getButtonConfig(paseo.estado)
    if (!config) return

    if (config.evento) {
      cambiarEstado(config.evento)
    } else if (paseo.estado === PaseoStatus.FINALIZADO) {
      // Navegar a resumen
      Alert.alert(t('comun:exito'), t('paseos:control.paseo_finalizado'))
      navigation.goBack()
    }
  }

  if (loading) {
    return (
      <Screen style={styles.loading}>
        <ActivityIndicator size="large" color={COLOR.PRIMARIO} />
        <Text style={styles.loadingText}>{t('comun:cargando')}</Text>
      </Screen>
    )
  }

  if (!paseo) {
    return (
      <Screen style={styles.error}>
        <Text style={styles.errorText}>{t('paseos:activo.no_encontrado')}</Text>
        <Button
          title={t('comun:volver')}
          onPress={() => navigation.goBack()}
          variant="secundario"
        />
      </Screen>
    )
  }

  const buttonConfig = getButtonConfig(paseo.estado)
  const ubicacionInicio =
    typeof paseo.ubicacion_inicio === 'object'
      ? paseo.ubicacion_inicio.coordenadas
      : null

  return (
    <View style={styles.container}>
      {/* Mapa de fondo */}
      <MapView
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        initialRegion={{
          latitude: ubicacionInicio?.latitude || -34.6037,
          longitude: ubicacionInicio?.longitude || -58.3816,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        }}
        showsUserLocation
        showsMyLocationButton
      >
        {/* Marcador de punto de recogida */}
        {ubicacionInicio && (
          <Marker
            coordinate={{
              latitude: ubicacionInicio.latitude,
              longitude: ubicacionInicio.longitude,
            }}
            title={t('paseos:control.punto_recogida')}
            description={paseo.ubicacion_inicio_txt || ''}
            pinColor={COLOR.ERROR}
          />
        )}
      </MapView>

      {/* StatusBar superior */}
      <View style={styles.statusBar}>
        <Text style={styles.statusText}>
          {t(`paseos:estados.${paseo.estado}`)}
        </Text>
      </View>

      {/* Panel inferior */}
      <View style={styles.bottomPanel}>
        <View style={styles.infoSection}>
          <Text style={styles.mascotaName}>{paseo.mascota_nombre_visual}</Text>
          <Text style={styles.ubicacionText}>
            {paseo.ubicacion_inicio_txt || t('paseos:control.ubicacion_desconocida')}
          </Text>
        </View>

        {buttonConfig && (
          <Button
            title={buttonConfig.label}
            onPress={handleButtonPress}
            loading={procesando}
            style={[styles.heroButton, { backgroundColor: buttonConfig.color }]}
            variant="primario"
          />
        )}
      </View>
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
  statusBar: {
    position: 'absolute',
    top: 60,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
  },
  statusText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLOR.TEXTO,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  bottomPanel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLOR.BLOQUE,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  infoSection: {
    marginBottom: 20,
  },
  mascotaName: {
    fontSize: 24,
    fontWeight: '800',
    color: COLOR.TEXTO,
    marginBottom: 8,
  },
  ubicacionText: {
    fontSize: 14,
    color: COLOR.SUBTEXTO,
  },
  heroButton: {
    height: 56,
  },
})

export default ControlPaseoScreen
