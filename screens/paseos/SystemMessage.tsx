import React from 'react'
import { View, StyleSheet, Text } from 'react-native'
import { useTranslation } from 'react-i18next'
import { COLOR } from '@/constants'
import { Mensaje } from '@/models/Chat'

interface SystemMessageProps {
  mensaje: Mensaje
}

/**
 * Componente para mostrar mensajes del sistema de forma narrativa
 * como "capítulos" de la historia del paseo, no como eventos técnicos
 *
 * El contenido es una clave i18n que, cuando se traduce, incluye el emoji:
 * "chat:system_lugar_parque" → "🌳 Llegamos al parque"
 */
export const SystemMessage: React.FC<SystemMessageProps> = ({ mensaje }) => {
  const { t, i18n } = useTranslation()

  // Traducir la clave i18n (formato único: "chat:sistema.acciones_mascota.necesidades")
  const parseSystemMessage = (claveI18n: string) => {
    try {
      // Traducir con el formato único estandarizado
      const textoTraducido = t(claveI18n)

      // Si la traducción devuelve la misma clave, no existe
      if (textoTraducido === claveI18n) {
        console.warn(
          '[SystemMessage] Clave i18n no encontrada:',
          claveI18n,
          'Idioma:',
          i18n.language
        )
        return {
          emoji: '🐾',
          texto: claveI18n,
        }
      }

      // Extraer emoji del texto traducido: "🌳 Llegamos al parque"
      const emojiMatch = textoTraducido.match(/^(\p{Emoji})\s+(.+)$/u)
      if (emojiMatch) {
        return {
          emoji: emojiMatch[1],
          texto: emojiMatch[2],
        }
      }

      // Si no hay emoji, devolver el texto completo
      return {
        emoji: '🐾',
        texto: textoTraducido,
      }
    } catch (err) {
      console.error('[SystemMessage] Error traduciendo:', claveI18n, err)
      return {
        emoji: '🐾',
        texto: claveI18n,
      }
    }
  }

  const getRelativeTime = (creado_en?: Date) => {
    if (!creado_en) return ''

    const fecha = new Date(creado_en)
    const ahora = new Date()
    const diferencia = ahora.getTime() - fecha.getTime()
    const minutos = Math.floor(diferencia / 60000)
    const horas = Math.floor(minutos / 60)
    const _dias = Math.floor(horas / 24)

    if (minutos < 1) return t('chat:time_just_now')
    if (minutos < 60) {
      return t('chat:time_minutes_ago', { count: minutos })
    }
    if (horas < 24) {
      return t('chat:time_hours_ago', { count: horas })
    }
    return t('chat:time_recently')
  }

  const { emoji, texto } = parseSystemMessage(mensaje.contenido)
  const tiempoRelativo = getRelativeTime(mensaje.creado_en)

  return (
    <View style={styles.container}>
      {/* Línea divisoria superior */}
      <View style={styles.separator} />

      {/* Contenido narrativo */}
      <View style={styles.content}>
        <Text style={styles.emoji}>{emoji}</Text>
        <Text style={styles.texto}>{texto}</Text>
        <Text style={styles.tiempo}>{tiempoRelativo}</Text>
      </View>

      {/* Línea divisoria inferior */}
      <View style={styles.separator} />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 12,
    alignItems: 'center',
  },
  separator: {
    width: '30%',
    height: 1,
    backgroundColor: COLOR.BORDE,
    marginVertical: 8,
  },
  content: {
    alignItems: 'center',
    gap: 4,
  },
  emoji: {
    fontSize: 24,
    marginBottom: 2,
  },
  texto: {
    fontSize: 14,
    fontWeight: '500',
    color: COLOR.TEXTO,
    textAlign: 'center',
    maxWidth: '80%',
  },
  tiempo: {
    fontSize: 12,
    color: COLOR.SUBTEXTO,
    marginTop: 2,
  },
})
