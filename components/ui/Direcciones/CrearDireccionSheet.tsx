import React, { useState, useEffect } from 'react'
import {
  View,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Platform,
} from 'react-native'
import { Text } from 'galio-framework'
import { Region } from 'react-native-maps'
import { COLOR } from '@/constants'
import { BottomSheet } from '../BottomSheet'
import { AutocompletarDireccion } from '../AutocompletarDireccion'
import Icon from '../Icon'
import Button from '../Button'
import Spacer from '../Spacer'
import { Mapa } from '../Mapa'
import { useTranslation } from 'react-i18next'

interface CrearDireccionSheetProps {
  visible: boolean
  onClose: () => void
  onGuardar: (_datos: {
    proveedor: 'google' | 'mapbox'
    proveedor_place_id: string
    direccion_formateada: string
    coordenadas: { latitude: number; longitude: number }
    alias: string
    referencia?: string
    metadata?: Record<string, any>
  }) => Promise<void>
}

type Step = 'BUSQUEDA' | 'MAPA_CONFIRMACION' | 'DETALLES'

export const CrearDireccionSheet: React.FC<CrearDireccionSheetProps> = ({
  visible,
  onClose,
  onGuardar,
}) => {
  const { t } = useTranslation()
  const [step, setStep] = useState<Step>('BUSQUEDA')

  const [seleccion, setSeleccion] = useState<any>(null)
  // Region inicial solo para enfocar el mapa al principio
  const [initialRegion, setInitialRegion] = useState<Region | undefined>(
    undefined
  )
  // Coordenadas finales (fuente de verdad al guardar)
  const [coordenadasFinales, setCoordenadasFinales] = useState<{
    latitude: number
    longitude: number
  } | null>(null)

  const [alias, setAlias] = useState('')
  const [referencia, setReferencia] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [usuarioMovioMapa, setUsuarioMovioMapa] = useState(false)

  // Reset al abrir
  useEffect(() => {
    if (visible) {
      setStep('BUSQUEDA')
      setSeleccion(null)
      setInitialRegion(undefined)
      setCoordenadasFinales(null)
      setAlias('')
      setReferencia('')
      setGuardando(false)
      setUsuarioMovioMapa(false)
    }
  }, [visible])

  const handleSelectPlace = (detalles: any) => {
    setSeleccion(detalles)
    // Coordenadas base
    const { latitude, longitude } = detalles.coordenadas

    setCoordenadasFinales({ latitude, longitude })
    setInitialRegion({
      latitude,
      longitude,
      latitudeDelta: 0.005,
      longitudeDelta: 0.005,
    })
    setStep('MAPA_CONFIRMACION')
  }

  const handleSave = async () => {
    if (!seleccion || !coordenadasFinales) return
    setGuardando(true)
    try {
      await onGuardar({
        proveedor: 'google', // Default for now since AutocompletarDireccion uses Google
        proveedor_place_id: seleccion.place_id || seleccion.placeId,
        direccion_formateada:
          seleccion.direccion_formateada || seleccion.direccion,
        coordenadas: coordenadasFinales,
        alias: alias || t('tutor:solicitud.direccion.alias_placeholder'),
        referencia,
        metadata: {}, // Empty metadata for consistency
      })
      onClose()
    } catch (e) {
      console.error(e)
    } finally {
      setGuardando(false)
    }
  }

  const renderContent = () => {
    switch (step) {
      case 'BUSQUEDA':
        return (
          <View style={{ minHeight: 400 }}>
            <Text h5 bold color={COLOR.TEXTO} style={{ marginBottom: 16 }}>
              {t('tutor:solicitud.direccion.nueva_titulo')}
            </Text>
            <AutocompletarDireccion onSelect={handleSelectPlace} />
            <Spacer size={20} />
            <View style={styles.infoBox}>
              <Icon name="info-circle" size={20} color={COLOR.INFO} />
              <Spacer horizontal size={10} />
              <Text size={13} color={COLOR.SUBTEXTO} style={{ flex: 1 }}>
                {t('tutor:solicitud.direccion.busqueda_ayuda')}
              </Text>
            </View>
          </View>
        )

      case 'MAPA_CONFIRMACION':
        return (
          <View style={{ height: 500 }}>
            <View style={styles.stepHeader}>
              <TouchableOpacity onPress={() => setStep('BUSQUEDA')}>
                <Icon name="arrow-left" size={24} color={COLOR.TEXTO} />
              </TouchableOpacity>
              <Text h5 bold color={COLOR.TEXTO} style={{ marginLeft: 12 }}>
                {t('tutor:solicitud.direccion.confirmar_titulo')}
              </Text>
            </View>

            <Text color={COLOR.SUBTEXTO} style={{ marginBottom: 12 }}>
              {t('tutor:solicitud.direccion.ajuste_ayuda')}
            </Text>

            {/* Mapa Reutilizable en modo interactivo */}
            {/* Mapa Reutilizable en modo interactivo - SIN region (uncontrolled) para evitar drift */}
            {initialRegion && (
              <Mapa
                interactivo
                pinCentro
                alto={300}
                // Usamos key para que se remonte si cambia la region inicial (reset)
                key={`map-${initialRegion.latitude}-${initialRegion.longitude}`}
                coordenadas={{
                  latitude: initialRegion.latitude,
                  longitude: initialRegion.longitude,
                }} // Prop para centrar inicial via key
                onRegionChangeComplete={r => {
                  setCoordenadasFinales({
                    latitude: r.latitude,
                    longitude: r.longitude,
                  })
                  setUsuarioMovioMapa(true)
                }}
                style={{ marginBottom: 16 }}
              />
            )}

            <View style={styles.addressPreview}>
              <View style={{ marginRight: 12 }}>
                <Icon name="map-marker-alt" size={20} color={COLOR.PRIMARIO} />
              </View>
              <View style={{ flex: 1 }}>
                <Text
                  size={10}
                  color={COLOR.SUBTEXTO}
                  bold
                  style={{ textTransform: 'uppercase', marginBottom: 2 }}
                >
                  {usuarioMovioMapa
                    ? t('tutor:solicitud.direccion.ubicacion_ajustada')
                    : t('tutor:solicitud.direccion.ubicacion_original')}
                </Text>
                <Text bold size={14} color={COLOR.TEXTO} numberOfLines={2}>
                  {usuarioMovioMapa
                    ? t('tutor:solicitud.direccion.pin_personalizado')
                    : seleccion?.direccion_formateada || seleccion?.direccion}
                </Text>
                {usuarioMovioMapa && (
                  <Text
                    size={11}
                    color={COLOR.ENFASIS}
                    style={{ marginTop: 2 }}
                  >
                    {t('tutor:solicitud.direccion.uso_pin_ayuda')}
                  </Text>
                )}
              </View>
            </View>

            <Button
              title={t('tutor:solicitud.direccion.confirmar_titulo')}
              variant="primario"
              onPress={() => setStep('DETALLES')}
              fullWidth
            />
          </View>
        )

      case 'DETALLES':
        return (
          <View>
            <View style={styles.stepHeader}>
              <TouchableOpacity onPress={() => setStep('MAPA_CONFIRMACION')}>
                <Icon name="arrow-left" size={24} color={COLOR.TEXTO} />
              </TouchableOpacity>
              <Text h5 bold color={COLOR.TEXTO} style={{ marginLeft: 12 }}>
                {t('tutor:solicitud.direccion.detalles_titulo')}
              </Text>
            </View>

            <Text color={COLOR.SUBTEXTO} style={{ marginBottom: 20 }}>
              {t('tutor:solicitud.direccion.detalles_ayuda')}
            </Text>

            <Text
              size={12}
              bold
              color={COLOR.SUBTEXTO}
              style={{ marginBottom: 6 }}
            >
              {t('tutor:solicitud.direccion.alias_label')}
            </Text>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder={t('tutor:solicitud.direccion.alias_placeholder')}
                placeholderTextColor={COLOR.INACTIVO}
                value={alias}
                onChangeText={setAlias}
              />
            </View>

            <Spacer size={16} />

            <Text
              size={12}
              bold
              color={COLOR.SUBTEXTO}
              style={{ marginBottom: 6 }}
            >
              {t('tutor:solicitud.direccion.referencia_label')}
            </Text>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder={t(
                  'tutor:solicitud.direccion.referencia_placeholder'
                )}
                placeholderTextColor={COLOR.INACTIVO}
                value={referencia}
                onChangeText={setReferencia}
              />
            </View>

            <Spacer size={30} />

            <Button
              title={
                guardando ? t('comun:guardando') : t('comun:guardar_direccion')
              }
              variant="primario"
              onPress={handleSave}
              disabled={guardando}
              fullWidth
            />
          </View>
        )
    }
  }

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      height={step === 'BUSQUEDA' ? 500 : 700}
    >
      {renderContent()}
    </BottomSheet>
  )
}

const styles = StyleSheet.create({
  stepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: COLOR.BLOQUE,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  addressPreview: {
    backgroundColor: COLOR.BLOQUE,
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLOR.BORDE,
  },
  inputContainer: {
    backgroundColor: COLOR.BASE,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLOR.BORDE,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 12 : 4,
  },
  input: {
    color: COLOR.TEXTO,
    fontSize: 16,
  },
})
