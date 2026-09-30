import React, { useEffect, useState, useMemo } from 'react'
import { View, Text, Image, StyleSheet } from 'react-native'
import { COLOR } from '@/constants'
import { i18n } from '@/services/i18n'

interface LoadingPanelProps {
  /**
   * Mensaje personalizado de carga.
   * Si no se proporciona, se usa uno aleatorio del i18n
   */
  message?: string

  /**
   * Tipo de mensaje predefinido (para elegir mensajes del i18n)
   */
  messageType?: 'general' | 'auth' | 'mascota' | 'cuidador' | 'consentimiento'

  /**
   * Mostrar el GIF animado del perro
   */
  showSpinner?: boolean

  /**
   * Tamaño del spinner: 'small' (80px) o 'large' (120px)
   */
  spinnerSize?: 'small' | 'large'

  /**
   * Estilos personalizados para el contenedor
   */
  containerStyle?: object
}

/**
 * Componente de carga compacto para modales y panels.
 * Similar a LoadingScreen pero optimizado para espacios reducidos.
 *
 * Muestra un GIF animado + mensaje de carga.
 */
export const LoadingPanel: React.FC<LoadingPanelProps> = ({
  message,
  messageType = 'general',
  showSpinner = true,
  spinnerSize = 'small',
  containerStyle,
}) => {
  const [currentMessage, setCurrentMessage] = useState<string>('')

  const gifSize = spinnerSize === 'small' ? 80 : 120

  const messageCollections = useMemo(() => {
    const loadFromI18n = (key: string) => {
      try {
        const path = `cargando:${key}`
        if (i18n.exists(path)) {
          const arr = i18n.t(path, { returnObjects: true }) as unknown
          if (Array.isArray(arr)) return arr as string[]
        }
      } catch {
        /* ignore */
      }
      return undefined
    }

    return {
      general: loadFromI18n('general') || ['Cargando...'],
      auth: loadFromI18n('auth') || ['Verificando...'],
      mascota: loadFromI18n('mascota') || ['Cargando mascota...'],
      cuidador: loadFromI18n('cuidador') || ['Cargando cuidador...'],
      consentimiento: loadFromI18n('consentimiento') || [
        'Cargando documento...',
        'Un momento...',
        'Preparando documento...',
      ],
    }
  }, [i18n.language])

  useEffect(() => {
    if (message) {
      setCurrentMessage(message)
      return
    }

    const messages =
      messageCollections[messageType as keyof typeof messageCollections] ||
      messageCollections.general

    const safeMessages =
      Array.isArray(messages) && messages.length > 0
        ? messages
        : ['Cargando...']

    const randomMessage =
      safeMessages[Math.floor(Math.random() * safeMessages.length)]
    setCurrentMessage(randomMessage)
  }, [message, messageType, messageCollections])

  return (
    <View style={[styles.container, containerStyle]}>
      {showSpinner && (
        <Image
          source={require('@/assets/gif/perro_caminando.gif')}
          style={{ width: gifSize, height: gifSize }}
          resizeMode="contain"
        />
      )}
      <Text style={styles.text}>{currentMessage}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  text: {
    fontSize: 14,
    textAlign: 'center',
    color: COLOR.TEXTO,
    marginTop: 12,
    fontWeight: '500',
  },
})
