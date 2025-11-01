import React, { useState, useEffect, useMemo } from 'react'
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native'
import { COLOR } from '../constants'

interface LoadingScreenProps {
  /** Mensaje personalizado, si no se proporciona usa uno aleatorio */
  message?: string
  /** Tipo de mensajes a mostrar */
  messageType?: 'general' | 'pets' | 'auth' | 'walks' | 'custom'
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

// Definir las colecciones de mensajes fuera del componente para evitar recrearlas
const defaultMessageCollections = {
  general: [
    '⏳ Cargando...',
    '🚀 Preparando todo para ti...',
    '✨ Un momento por favor...',
    '🔄 Actualizando información...',
    '📱 Configurando la aplicación...',
  ],

  auth: [
    '🔐 Verificando credenciales...',
    '👤 Iniciando sesión...',
    '🔑 Autenticando usuario...',
    '✅ Configurando tu perfil...',
    '🏠 Preparando tu cuenta...',
  ],

  pets: [
    /* Tips de cuidado y bienestar */
    '🚶‍♂️🐕 Un paseo diario mantiene a tu perro feliz y saludable.',
    '💧🐶 Lleva siempre agua fresca en los paseos.',
    '🦴🍖 Una dieta equilibrada es clave para la salud de tu mascota.',
    '🐾🔍 Revisa sus patitas al volver, pueden tener piedritas.',
    '🧘‍♂️🐕 El ejercicio reduce el estrés y la ansiedad.',
    '☀️🔥🐾 Evita pasear en horas de calor para cuidar sus patas.',

    /* Mensajes divertidos/tiernos */
    '🐶💤 "¿Otra vez pasear? ¡Estoy listo para la aventura!"',
    '🌎🐕 Cada paseo es una aventura para tu perro.',
    '🐶➡️👋 Una cola moviéndose es pura alegría.',
    '🐕💨 "¡Corre, salta y juega! ¡El mundo es nuestro!"',
    '🐾❤️ "Un paseo contigo es lo mejor del día."',
    '🐕🌳 "Explorar nuevos lugares es mi pasatiempo favorito."',

    /* Educación y responsabilidad */
    '🦺🐕 Usa siempre correa para la seguridad de tu perro.',
    '💩🗑️ Recoge siempre los desechos de tu mascota.',
    '📅🐶 Mantén sus vacunas y desparasitaciones al día.',
    '👂🐶 Escucha a tu perro, su lenguaje corporal dice mucho.',
  ],

  walks: [
    '🚶‍♂️ Preparando el paseo perfecto...',
    '🗺️ Buscando las mejores rutas...',
    '🐕 Tu mascota está emocionada por salir...',
    '🌳 Encontrando parques cercanos...',
    '⏰ Calculando tiempo ideal de paseo...',
    '🐾 Configurando el seguimiento del paseo...',
  ],
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

  // Usar useMemo para crear las colecciones de mensajes solo cuando customMessages cambie
  const messageCollections = useMemo(
    () => ({
      ...defaultMessageCollections,
      custom: customMessages || [],
    }),
    [customMessages]
  )

  useEffect(() => {
    // Si hay un mensaje específico, usarlo
    if (message) {
      setCurrentMessage(message)
      return
    }

    // Obtener la colección de mensajes según el tipo
    const messages =
      messageCollections[messageType] || messageCollections.general

    // Seleccionar mensaje aleatorio
    const randomMessage = messages[Math.floor(Math.random() * messages.length)]
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
