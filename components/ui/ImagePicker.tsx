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
import { useTranslation } from 'react-i18next'

interface ImagePickerProps {
  label?: string
  value?: string
  /** `medidas` son las de la foto elegida (sirven para reducirla antes de subirla). */
  onValueChange: (_uri: string, _medidas?: { ancho: number; alto: number }) => void
  placeholder?: string
  errorText?: string
  style?: ViewStyle | ViewStyle[]
  testID?: string
  disabled?: boolean
  /** Recortar al elegir (foto de perfil). Desactívalo para documentos. */
  allowsEditing?: boolean
  aspect?: [number, number]
}

/**
 * ImagePicker: Componente para seleccionar imágenes desde cámara o galería
 */
const ImagePicker: React.FC<ImagePickerProps> = ({
  label,
  value,
  onValueChange,
  placeholder,
  errorText,
  style,
  testID,
  disabled = false,
  allowsEditing = true,
  aspect = [1, 1],
}) => {
  const { t } = useTranslation('comun')
  const [loading, setLoading] = useState(false)

  const requestPermissions = async (type: 'camera' | 'library') => {
    try {
      const permission =
        type === 'camera'
          ? await ImagePickerLib.requestCameraPermissionsAsync()
          : await ImagePickerLib.requestMediaLibraryPermissionsAsync()

      if (!permission.granted) {
        Alert.alert(
          t('imagen.permisos_titulo'),
          type === 'camera'
            ? t('imagen.permiso_camara')
            : t('imagen.permiso_galeria')
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
        allowsEditing,
        ...(allowsEditing ? { aspect } : {}),
        quality: 0.8,
      })

      if (!result.canceled && result.assets[0]) {
        const { uri, width, height } = result.assets[0]
        onValueChange(uri, { ancho: width, alto: height })
      }
    } catch (error) {
      console.error('Error picking from camera:', error)
      Alert.alert(t('error'), t('imagen.error_tomar'))
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
        allowsEditing,
        ...(allowsEditing ? { aspect } : {}),
        quality: 0.8,
      })

      if (!result.canceled && result.assets[0]) {
        const { uri, width, height } = result.assets[0]
        onValueChange(uri, { ancho: width, alto: height })
      }
    } catch (error) {
      console.error('Error picking from library:', error)
      Alert.alert(t('error'), t('imagen.error_seleccionar'))
    } finally {
      setLoading(false)
    }
  }

  const showOptions = () => {
    Alert.alert(
      t('imagen.seleccionar_foto'),
      t('imagen.elige_opcion'),
      [
        {
          text: t('imagen.camara'),
          onPress: pickFromCamera,
        },
        {
          text: t('imagen.galeria'),
          onPress: pickFromLibrary,
        },
        {
          text: t('cancelar'),
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
              <Text style={styles.changeText}>{t('imagen.cambiar')}</Text>
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
              {loading
                ? t('imagen.cargando')
                : (placeholder ?? t('imagen.agregar_foto'))}
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
