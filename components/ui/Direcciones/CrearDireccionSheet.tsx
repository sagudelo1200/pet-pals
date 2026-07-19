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
import { useUbicacionDispositivo } from '@/hooks'
import { BannerUbicacion } from '@/components/comun/BannerUbicacion'
import { mapasService } from '@/services/maps'
import { GestorUbicaciones } from '@/logic/ubicaciones'
import type { Ubicacion } from '@/models/Ubicacion'
import type { DetalleUbicacion } from '@/services/maps/types'

interface CrearDireccionSheetProps {
  visible: boolean
  onClose: () => void
  onGuardar: (
    _datos: Omit<
      Ubicacion,
      'id' | 'creado_en' | 'actualizado_en' | 'creado_por' | 'actualizado_por'
    > & { alias?: string; referencia?: string }
  ) => Promise<void>
}

type Step = 'BUSQUEDA' | 'MAPA_CONFIRMACION' | 'DETALLES'

export const CrearDireccionSheet: React.FC<CrearDireccionSheetProps> = ({
  visible,
  onClose,
  onGuardar,
}) => {
  const { t } = useTranslation()
  const [step, setStep] = useState<Step>('BUSQUEDA')

  const [seleccion, setSeleccion] = useState<DetalleUbicacion | null>(null)
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
  // Simplified: only alias + referencia kept. Additional granular fields removed.
  const [guardando, setGuardando] = useState(false)
  const [localErrorMessage, setLocalErrorMessage] = useState<string | null>(
    null
  )
  const [usuarioMovioMapa, setUsuarioMovioMapa] = useState(false)
  const [direccionMostrada, setDireccionMostrada] = useState('')
  const [buscandoDireccion, setBuscandoDireccion] = useState(false)

  const {
    errorMessage: gpsError,
    obtenerPosicion,
    loading: localizando,
  } = useUbicacionDispositivo()

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
      setDireccionMostrada('')
      setBuscandoDireccion(false)
    }
  }, [visible])

  const handleSelectPlace = (detalles: DetalleUbicacion) => {
    setSeleccion(detalles)
    setDireccionMostrada(detalles.direccion_formateada || '')
    // Coordenadas base
    const { latitude, longitude } = detalles.coordenadas

    setCoordenadasFinales({ latitude, longitude })
    setInitialRegion({
      latitude,
      longitude,
      latitudeDelta: 0.001,
      longitudeDelta: 0.001,
    })
    setStep('MAPA_CONFIRMACION')
  }

  const handleUsarUbicacionActual = async () => {
    const pos = await obtenerPosicion()
    if (pos) {
      const { latitude, longitude } = pos.coords
      let direccion_formateada = t('tutor:solicitud.direccion.ubicacion_actual')

      try {
        const resultado = await mapasService.geocodificarInversa({
          latitude,
          longitude,
        })
        if (resultado?.direccion_formateada) {
          direccion_formateada = resultado.direccion_formateada
        }
      } catch (error) {
        console.warn('Error en geocodificación inversa:', error)
      }

      handleSelectPlace({
        coordenadas: { latitude, longitude },
        direccion_formateada,
        place_id: `current-${Date.now()}`,
      } as DetalleUbicacion)
    }
  }

  const handleSave = async () => {
    if (!seleccion || !coordenadasFinales) return
    setGuardando(true)
    setLocalErrorMessage(null)
    try {
      const payload: any = {
        proveedor: 'google',
        proveedor_place_id:
          (seleccion as any).place_id || (seleccion as any).placeId,
        direccion_formateada: direccionMostrada,
        coordenadas: coordenadasFinales,
        alias: alias || '',
        instrucciones: referencia || '',
      }

      await onGuardar(payload)
      onClose()
    } catch (e) {
      console.error(e)
      // Intentamos mapear el error hacia una clave i18n si viene del gestor
      const code = typeof e === 'string' ? e : (e?.message ?? String(e))
      const key = GestorUbicaciones.obtenerClaveI18nErrorUbicacion(code)
      setLocalErrorMessage(key ? t(key) : t('ubicaciones:errores.generico'))
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

            {gpsError && (
              <BannerUbicacion
                mensaje={gpsError}
                style={{ marginBottom: 16 }}
              />
            )}

            <AutocompletarDireccion onSelect={handleSelectPlace} />

            <Spacer size={16} />

            <TouchableOpacity
              onPress={handleUsarUbicacionActual}
              disabled={localizando}
              style={styles.locationButton}
            >
              <Icon
                name="location-arrow"
                size={16}
                color={localizando ? COLOR.INACTIVO : COLOR.PRIMARIO}
              />
              <Spacer horizontal size={10} />
              <Text
                size={14}
                color={localizando ? COLOR.INACTIVO : COLOR.TEXTO}
              >
                {localizando
                  ? t('comun:cargando')
                  : t('tutor:solicitud.direccion.usar_actual')}
              </Text>
            </TouchableOpacity>

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
                scrollEnabled
                zoomEnabled
                rotateEnabled={false} // Evitar que el mapa gire al hacer zoom
                pitchEnabled={false} // Evitar inclinación accidental
                alto={300}
                pinCentro
                zoom={18}
                // Usamos key para que se remonte si cambia la region inicial (reset)
                key={`map-${initialRegion.latitude}-${initialRegion.longitude}`}
                coordenadas={{
                  latitude: initialRegion.latitude,
                  longitude: initialRegion.longitude,
                }} // Prop para centrar inicial via key
                onRegionChangeComplete={async r => {
                  // Pequeño umbral para evitar peticiones por movimientos microscópicos (drift)
                  const latDiff = Math.abs(
                    r.latitude - (coordenadasFinales?.latitude || 0)
                  )
                  const lngDiff = Math.abs(
                    r.longitude - (coordenadasFinales?.longitude || 0)
                  )

                  if (latDiff < 0.00001 && lngDiff < 0.00001) return

                  setCoordenadasFinales({
                    latitude: r.latitude,
                    longitude: r.longitude,
                  })
                  setUsuarioMovioMapa(true)
                  setBuscandoDireccion(true)
                  try {
                    const res = await mapasService.geocodificarInversa({
                      latitude: r.latitude,
                      longitude: r.longitude,
                    })
                    if (res?.direccion_formateada) {
                      setDireccionMostrada(res.direccion_formateada)
                    } else if (res === null) {
                      // Si no hay resultados, mostramos al menos que es una posición personalizada
                      setDireccionMostrada(
                        t('tutor:solicitud.direccion.pin_personalizado')
                      )
                    }
                  } catch (e) {
                    console.error('Error actualizando dirección:', e)
                  } finally {
                    setBuscandoDireccion(false)
                  }
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
                  {buscandoDireccion
                    ? t('comun:cargando')
                    : direccionMostrada ||
                      (usuarioMovioMapa
                        ? t('tutor:solicitud.direccion.pin_personalizado')
                        : seleccion?.direccion_formateada || '')}
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

            <Spacer size={12} />
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

            {localErrorMessage && (
              <Text style={{ color: COLOR.ERROR, marginTop: 10 }}>
                {localErrorMessage}
              </Text>
            )}

            <Spacer size={30} />

            <Button
              title={
                guardando ? t('comun:guardando') : t('comun:guardar_direccion')
              }
              variant="primario"
              onPress={handleSave}
              disabled={guardando || !coordenadasFinales}
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
      height={step === 'BUSQUEDA' ? 500 : undefined}
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
  inputText: { flex: 1, fontSize: 15, color: COLOR.TEXTO },
  placeholderText: { color: COLOR.SUBTEXTO },
  locationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
})
