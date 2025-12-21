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

interface CrearDireccionSheetProps {
  visible: boolean
  onClose: () => void
  onGuardar: (datos: {
    placeId: string
    direccion: string
    coordenadas: { lat: number; lng: number }
    alias: string
    referencia?: string
  }) => Promise<void>
}

type Step = 'BUSQUEDA' | 'MAPA_CONFIRMACION' | 'DETALLES'

export const CrearDireccionSheet: React.FC<CrearDireccionSheetProps> = ({
  visible,
  onClose,
  onGuardar,
}) => {
  const [step, setStep] = useState<Step>('BUSQUEDA')
  
  const [seleccion, setSeleccion] = useState<any>(null)
  // Region inicial solo para enfocar el mapa al principio
  const [initialRegion, setInitialRegion] = useState<Region | undefined>(undefined)
  // Coordenadas finales (fuente de verdad al guardar)
  const [coordenadasFinales, setCoordenadasFinales] = useState<{lat: number, lng: number} | null>(null)
  
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
    const lat = detalles.coordenadas.latitude
    const lng = detalles.coordenadas.longitude
    
    setCoordenadasFinales({ lat, lng })
    setInitialRegion({
      latitude: lat,
      longitude: lng,
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
        placeId: seleccion.placeId,
        direccion: seleccion.direccion,
        coordenadas: coordenadasFinales,
        alias: alias || 'Casa',
        referencia,
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
              Nueva Dirección
            </Text>
            <AutocompletarDireccion onSelect={handleSelectPlace} />
            <Spacer size={20} />
            <View style={styles.infoBox}>
              <Icon name="info-circle" size={20} color={COLOR.INFO} />
              <Spacer horizontal size={10} />
              <Text size={13} color={COLOR.SUBTEXTO} style={{ flex: 1 }}>
                Busca la dirección exacta para ubicarla en el mapa.
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
                Confirmar Ubicación
              </Text>
            </View>

            <Text color={COLOR.SUBTEXTO} style={{ marginBottom: 12 }}>
              Mueve el mapa para ajustar la posición exacta.
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
                  coordenadas={{ latitude: initialRegion.latitude, longitude: initialRegion.longitude }} // Prop para centrar inicial si mapa lo soporta
                  region={initialRegion} // Solo inicial
                  onRegionChangeComplete={(r) => {
                     setCoordenadasFinales({ lat: r.latitude, lng: r.longitude })
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
                <Text size={10} color={COLOR.SUBTEXTO} bold style={{ textTransform: 'uppercase', marginBottom: 2 }}>
                  {usuarioMovioMapa ? "Ubicación Ajustada" : "Ubicación Original"}
                </Text>
                <Text bold size={14} color={COLOR.TEXTO} numberOfLines={2}>
                  {usuarioMovioMapa ? "📍 Pin en posición personalizada" : seleccion?.direccion}
                </Text>
                {usuarioMovioMapa && (
                  <Text size={11} color={COLOR.ENFASIS} style={{ marginTop: 2 }}>
                    Se usará la posición del pin
                  </Text>
                )}
              </View>
            </View>

            <Button
              title="Confirmar Ubicación"
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
                Detalles Finales
              </Text>
            </View>

            <Text color={COLOR.SUBTEXTO} style={{ marginBottom: 20 }}>
              Dale un nombre para recordarla fácilmente.
            </Text>

            <Text size={12} bold color={COLOR.SUBTEXTO} style={{ marginBottom: 6 }}>
              ALIAS (Ej. Casa, Trabajo)
            </Text>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder="Casa"
                placeholderTextColor={COLOR.INACTIVO}
                value={alias}
                onChangeText={setAlias}
              />
            </View>
            
            <Spacer size={16} />

            <Text size={12} bold color={COLOR.SUBTEXTO} style={{ marginBottom: 6 }}>
              REFERENCIA (Opcional)
            </Text>
             <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder="Ej. Portón negro, apto 201"
                placeholderTextColor={COLOR.INACTIVO}
                value={referencia}
                onChangeText={setReferencia}
              />
            </View>

            <Spacer size={30} />

            <Button
              title={guardando ? "Guardando..." : "Guardar Dirección"}
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
    <BottomSheet visible={visible} onClose={onClose} height={step === 'BUSQUEDA' ? 500 : 700}>
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
