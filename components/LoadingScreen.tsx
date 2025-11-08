import React, { useState, useEffect, useMemo } from 'react'
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native'
import { COLOR } from '../constants'
import { i18n } from '@/services/i18n'

interface LoadingScreenProps {
  /** Mensaje personalizado, si no se proporciona usa uno aleatorio */
  message?: string
  /** Tipo de mensajes a mostrar */
  messageType?: 'general' | 'auth' | 'mascota' | 'paseador' | 'custom'
  /** Mensajes personalizados para usar con messageType='custom' */
  customMessages?: string[]
  /** Mostrar o no el ActivityIndicator */
  showSpinner?: boolean
  /** Color del spinner */
  spinnerColor?: string
  /** Tamaño del spinner */
  spinnerSize?: 'small' | 'large'
  /** Estilo personalizado del contenedor */
  containerStyle?: object
  /** Estilo personalizado del texto */
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

  // Minimal safe fallbacks used only if i18n isn't ready. Kept intentionally
  // small because i18n is the single source of truth per project decision.
  const MINIMAL_FALLBACKS: Record<string, string[]> = {
    general: ['⏳ Cargando...'],
    auth: ['🔐 Verificando credenciales...'],
    mascota: ['🐾 Cargando información de la mascota...'],
    paseador: ['🗺️ Preparando paseo...'],
  }

  // Usar useMemo para construir la colección de mensajes a usar (i18n + custom)
  const messageCollections = useMemo(() => {
    // Intentar leer arrays desde i18n: 'loading:<messageType>' devuelve array si existe
    const loadFromI18n = (key: string) => {
      try {
        const path = `loading:${key}`
        if (i18n.exists(path)) {
          // returnObjects para obtener arrays definidos en JSON
          const arr = i18n.t(path, { returnObjects: true }) as unknown
          if (Array.isArray(arr)) return arr as string[]
        }
      } catch {
        /* ignore */
      }
      return undefined
    }

    const general = loadFromI18n('general') || MINIMAL_FALLBACKS.general
    const auth = loadFromI18n('auth') || MINIMAL_FALLBACKS.auth
    const mascota = loadFromI18n('mascota') || MINIMAL_FALLBACKS.mascota
    const paseador = loadFromI18n('paseador') || MINIMAL_FALLBACKS.paseador

    return {
      general,
      auth,
      mascota,
      paseador,
      custom: customMessages || [],
    }
  }, [customMessages, i18n.language])

  useEffect(() => {
    // Si hay un mensaje específico, usarlo
    if (message) {
      setCurrentMessage(message)
      return
    }
    // Obtener la colección de mensajes según el tipo
    const messages =
      messageCollections[messageType as keyof typeof messageCollections] ||
      messageCollections.general

    // Proteger contra arrays vacíos (puede ocurrir si i18n aún no tiene las claves)
    const safeMessages =
      Array.isArray(messages) && messages.length > 0
        ? messages
        : MINIMAL_FALLBACKS.general

    // Seleccionar mensaje aleatorio (siempre habrá al menos 1)
    const randomMessage =
      safeMessages[Math.floor(Math.random() * safeMessages.length)]
    setCurrentMessage(randomMessage)
  }, [message, messageType])

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
