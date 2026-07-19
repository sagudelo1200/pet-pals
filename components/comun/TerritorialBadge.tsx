import React from 'react'
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'
import { useZonaH3 } from '@/hooks/useZonaH3'
import { COLOR } from '@/constants'

interface Props {
  h3_r9: string
  onPress?: () => void
}

/**
 * Chip/Badge minimal con puntuación de bienestar de una zona
 * Útil para mostrar en listas, tarjetas de ubicaciones, o breadcrumbs
 *
 * Ejemplo:
 * ```
 * <TerritorialBadge h3_r9={h3_r9} onPress={() => showDetails()} />
 * ```
 *
 * Muestra:
 * - Emoji + valor de bienestar (0-100)
 * - Color rojo/amarillo/verde según el rango
 */
export function TerritorialBadge({ h3_r9, onPress }: Props) {
  const { zona, loading } = useZonaH3(h3_r9)

  if (loading || !zona?.narrativa?.indices) {
    return null
  }

  const bienestar = zona.narrativa.indices.bienestar
  const color = getColorForValue(bienestar)
  const emoji = getEmojiForValue(bienestar)

  return (
    <TouchableOpacity
      style={[
        styles.badge,
        { backgroundColor: color + '20', borderColor: color },
      ]}
      onPress={onPress}
    >
      <Text style={styles.emoji}>{emoji}</Text>
      <Text style={[styles.value, { color }]}>{bienestar}</Text>
    </TouchableOpacity>
  )
}

function getColorForValue(value: number): string {
  if (value >= 75) return COLOR.EXITO
  if (value >= 50) return COLOR.ALERTA
  return COLOR.ERROR
}

function getEmojiForValue(value: number): string {
  if (value >= 75) return '😊'
  if (value >= 50) return '😐'
  return '😟'
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    gap: 4,
  },
  emoji: {
    fontSize: 14,
  },
  value: {
    fontSize: 12,
    fontWeight: '600',
  },
})
