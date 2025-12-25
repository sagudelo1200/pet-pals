import React, { useState } from 'react'
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ViewStyle,
} from 'react-native'
import { ScrollView } from 'react-native-gesture-handler'
import { Text } from 'galio-framework'
import { useTranslation } from 'react-i18next'
import { COLOR } from '@/constants'
import TextInput from './TextInput'
import Icon from './Icon'
import { usePlacesAutocomplete } from '@/hooks/usePlacesAutocomplete'
import { usePlaceDetails } from '@/hooks/usePlaceDetails'
import { DetalleUbicacion, SugerenciaAutocomplete } from '@/services/maps/types'

interface AutocompletarDireccionProps {
  onSelect: (_ubicacion: DetalleUbicacion) => void
  placeholder?: string
  containerStyle?: ViewStyle
}

export const AutocompletarDireccion = ({
  onSelect,
  placeholder, // Si no viene, usamos i18n default
  containerStyle,
}: AutocompletarDireccionProps) => {
  const { t } = useTranslation('comun')
  const {
    query,
    sugerencias,
    cargando: cargandoBusqueda,
    buscar,
  } = usePlacesAutocomplete()

  const { obtenerDetalles, cargando: cargandoDetalles } = usePlaceDetails()
  const [seleccionado, setSeleccionado] = useState(false)

  const handleSelect = async (item: SugerenciaAutocomplete) => {
    if (cargandoDetalles) return

    const detalles = await obtenerDetalles(item.place_id)
    if (detalles) {
      setSeleccionado(true)
      buscar(item.titulo)
      onSelect(detalles)
    }
  }

  const handleChangeText = (text: string) => {
    setSeleccionado(false)
    buscar(text)
  }

  const isLoading = cargandoBusqueda || cargandoDetalles

  return (
    <View style={[styles.container, containerStyle]}>
      <View>
        <TextInput
          value={query}
          onChangeText={handleChangeText}
          placeholder={placeholder || t('comun:maps.buscar_placeholder')}
          iconName="search-location"
          style={{ marginBottom: 0 }} // Eliminar margen para alinear el spinner
        />
        {isLoading && (
          <View style={styles.loaderRight}>
            <ActivityIndicator size="small" color={COLOR.PRIMARIO} />
          </View>
        )}
      </View>

      {/* Lista de sugerencias */}
      {!seleccionado && sugerencias.length > 0 && query.length > 0 && (
        <View style={styles.suggestionsContainer}>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            nestedScrollEnabled={false}
            bounces={false}
            overScrollMode="never"
          >
            {sugerencias.map((item, index) => (
              <React.Fragment key={item.place_id}>
                <TouchableOpacity
                  style={styles.suggestionItem}
                  onPress={() => handleSelect(item)}
                >
                  <Icon
                    name="map-marker-alt"
                    size={14}
                    color={COLOR.SUBTEXTO}
                    style={{ marginTop: 2 }}
                  />
                  <View style={styles.textContainer}>
                    <Text style={styles.mainText}>{item.titulo}</Text>
                    <Text style={styles.subText}>{item.subtitulo}</Text>
                  </View>
                </TouchableOpacity>
                {index < sugerencias.length - 1 && (
                  <View style={styles.separator} />
                )}
              </React.Fragment>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    zIndex: 10,
    position: 'relative',
  },
  loaderRight: {
    position: 'absolute',
    right: 12,
    top: 0,
    height: 48, // Match exact input height
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 20,
  },
  suggestionsContainer: {
    position: 'absolute',
    top: 50,
    left: 0,
    right: 0,
    backgroundColor: COLOR.SECUNDARIO,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLOR.BORDE,
    maxHeight: 200,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    zIndex: 20,
  },
  suggestionItem: {
    flexDirection: 'row',
    padding: 12,
    alignItems: 'flex-start',
  },
  textContainer: {
    marginLeft: 10,
    flex: 1,
  },
  mainText: {
    color: COLOR.TEXTO,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  subText: {
    color: COLOR.SUBTEXTO,
    fontSize: 12,
  },
  separator: {
    height: 1,
    backgroundColor: COLOR.BORDE,
  },
})
