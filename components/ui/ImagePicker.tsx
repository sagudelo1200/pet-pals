import React, { useState } from 'react'
import {
  StyleSheet,
  Text,
  View,
  ViewStyle,
  Pressable,
  Alert,
  Image,
} from 'react-native'
import { COLOR } from '@/constants'
import Icon from './Icon'
import * as ImagePickerLib from 'expo-image-picker'

interface ImagePickerProps {
  label?: string
  value?: string
  onValueChange: (_uri: string) => void
  placeholder?: string
  errorText?: string
  style?: ViewStyle | ViewStyle[]
  testID?: string
  disabled?: boolean
}

/**
 * ImagePicker: Componente para seleccionar imágenes desde cámara o galería
 */
const ImagePicker: React.FC<ImagePickerProps> = ({
  label,
  value,
  onValueChange,
  placeholder = 'Agregar foto',
  errorText,
  style,
  testID,
  disabled = false,
}) => {
  const [loading, setLoading] = useState(false)

  const requestPermissions = async (type: 'camera' | 'library') => {
    try {
      const permission =
        type === 'camera'
          ? await ImagePickerLib.requestCameraPermissionsAsync()
          : await ImagePickerLib.requestMediaLibraryPermissionsAsync()

      if (!permission.granted) {
        Alert.alert(
          'Permisos necesarios',
          `Necesitamos acceso a tu ${type === 'camera' ? 'cámara' : 'galería'} para continuar.`
        )
        return false
      }
      return true
    } catch (error) {
      console.error('Error requesting permissions:', error)
      return false
    }
  }

  const pickFromCamera = async () => {
    const hasPermission = await requestPermissions('camera')
    if (!hasPermission) return

    setLoading(true)
    try {
      const result = await ImagePickerLib.launchCameraAsync({
        mediaTypes: 'images',
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      })

      if (!result.canceled && result.assets[0]) {
        onValueChange(result.assets[0].uri)
      }
    } catch (error) {
      console.error('Error picking from camera:', error)
      Alert.alert('Error', 'No se pudo tomar la foto')
    } finally {
      setLoading(false)
    }
  }

  const pickFromLibrary = async () => {
    const hasPermission = await requestPermissions('library')
    if (!hasPermission) return

    setLoading(true)
    try {
      const result = await ImagePickerLib.launchImageLibraryAsync({
        mediaTypes: 'images',
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      })

      if (!result.canceled && result.assets[0]) {
        onValueChange(result.assets[0].uri)
      }
    } catch (error) {
      console.error('Error picking from library:', error)
      Alert.alert('Error', 'No se pudo seleccionar la imagen')
    } finally {
      setLoading(false)
    }
  }

  const showOptions = () => {
    Alert.alert(
      'Seleccionar foto',
      'Elige una opción',
      [
        {
          text: 'Cámara',
          onPress: pickFromCamera,
        },
        {
          text: 'Galería',
          onPress: pickFromLibrary,
        },
        {
          text: 'Cancelar',
          style: 'cancel',
        },
      ],
      { cancelable: true }
    )
  }

  const containerStyle: ViewStyle | ViewStyle[] = [
    styles.container,
    ...(Array.isArray(style) ? style : style ? [style] : []),
  ]

  const borderColor = errorText ? COLOR.ERROR : COLOR.BORDE

  return (
    <View style={containerStyle} testID={testID}>
      {label && <Text style={styles.label}>{label}</Text>}

      <Pressable
        onPress={() => !disabled && !loading && showOptions()}
        style={[
          styles.picker,
          { borderColor },
          disabled && styles.pickerDisabled,
        ]}
        accessibilityLabel={label || 'Seleccionar foto'}
        accessibilityRole="button"
        accessibilityState={{ disabled }}
      >
        {value ? (
          <View style={styles.imageContainer}>
            <Image source={{ uri: value }} style={styles.image} />
            <View style={styles.changeOverlay}>
              <Icon name="camera" size={24} color={COLOR.TEXTO} />
              <Text style={styles.changeText}>Cambiar</Text>
            </View>
          </View>
        ) : (
          <View style={styles.emptyContainer}>
            <View style={styles.iconCircle}>
              <Icon
                name="camera"
                size={28}
                color={disabled ? COLOR.INACTIVO : COLOR.ENFASIS}
              />
            </View>
            <Text
              style={[styles.placeholderText, disabled && styles.textDisabled]}
            >
              {loading ? 'Cargando...' : placeholder}
            </Text>
          </View>
        )}
      </Pressable>

      {errorText && <Text style={styles.error}>{errorText}</Text>}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 14,
  },
  label: {
    color: COLOR.SUBTEXTO,
    marginBottom: 6,
    fontSize: 13,
    fontWeight: '600',
  },
  picker: {
    height: 140,
    backgroundColor: COLOR.BLOQUE,
    borderWidth: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  pickerDisabled: {
    backgroundColor: COLOR.INACTIVO,
    opacity: 0.6,
  },
  imageContainer: {
    flex: 1,
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  changeOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(10, 20, 17, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  changeText: {
    color: COLOR.TEXTO,
    fontSize: 14,
    fontWeight: '600',
    marginTop: 4,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLOR.SECUNDARIO,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  placeholderText: {
    fontSize: 14,
    color: COLOR.SUBTEXTO,
  },
  textDisabled: {
    color: COLOR.INACTIVO,
  },
  error: {
    color: COLOR.ERROR,
    marginTop: 6,
    fontSize: 12,
  },
})

export default ImagePicker
