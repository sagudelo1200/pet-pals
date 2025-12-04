import React, { useState, useEffect, useMemo } from 'react'
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native'
import { COLOR } from '@/constants'
import { i18n } from '@/services/i18n'

interface LoadingScreenProps {
  message?: string
  messageType?: 'general' | 'auth' | 'mascota' | 'cuidador' | 'custom'
  customMessages?: string[]
  showSpinner?: boolean
  spinnerColor?: string
  spinnerSize?: 'small' | 'large'
  containerStyle?: object
  textStyle?: object
}

const LoadingScreen: React.FC<LoadingScreenProps> = ({
  message,
  messageType = 'general',
  customMessages,
  showSpinner = true,
  spinnerColor = COLOR.PRIMARIO,
  spinnerSize = 'large',
  containerStyle,
  textStyle,
}) => {
  const [currentMessage, setCurrentMessage] = useState<string>('')

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

    const general = loadFromI18n('general') || ['Cargando...']
    const auth = loadFromI18n('auth') || ['Verificando...']
    const mascota = loadFromI18n('mascota') || ['Cargando mascota...']
    const cuidador = loadFromI18n('cuidador') || ['Cargando cuidador...']

    return {
      general,
      auth,
      mascota,
      cuidador,
      custom: customMessages || [],
    }
  }, [customMessages, i18n.language])

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
        <ActivityIndicator
          size={spinnerSize}
          color={spinnerColor}
          style={styles.spinner}
        />
      )}
      <Text style={[styles.text, textStyle]}>{currentMessage}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLOR.BASE,
    padding: 20,
  },
  spinner: {
    marginBottom: 20,
  },
  text: {
    fontSize: 16,
    textAlign: 'center',
    color: COLOR.TEXTO,
  },
})

export default LoadingScreen
