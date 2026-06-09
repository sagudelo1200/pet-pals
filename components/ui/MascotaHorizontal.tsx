import React from 'react'
import { View, Text, StyleSheet, Pressable } from 'react-native'
import Avatar from './Avatar'
import { COLOR } from '@/constants'
import type { Mascota } from '@/models/Mascota'

interface Props {
  mascota: Partial<Mascota> & { id: string }
  style?: any
  onPress?: () => void
  testID?: string
}

const MascotaHorizontal: React.FC<Props> = ({
  mascota,
  style,
  onPress,
  testID,
}) => {
  // Priorizar el campo definido en el modelo `Mascota` ('foto').
  // Si encontramos `foto_url` lo usamos como fallback pero lo advertimos,
  // para evitar "adivinar" estructuras sin revisar la fuente de datos.
  const uri = (mascota as any).foto ?? (mascota as any).foto_url ?? null
  if (!(mascota as any).foto && (mascota as any).foto_url) {
    console.warn(
      'MascotaHorizontal: usando campo `foto_url` como fallback. Considere migrar al campo `foto` en el modelo Mascota.'
    )
  }

  const content = (
    <View style={[styles.container, style]} testID={testID}>
      <Avatar uri={uri} size={64} />

      <Text style={styles.nombre} numberOfLines={1}>
        {(mascota as any).nombre}
      </Text>
      <Text style={styles.raza} numberOfLines={1}>
        {(mascota as any).raza}
      </Text>
    </View>
  )

  if (onPress) {
    return <Pressable onPress={onPress}>{content}</Pressable>
  }

  return content
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', marginRight: 20, width: 80 },
  nombre: {
    fontSize: 14,
    fontWeight: '600',
    color: COLOR.TEXTO,
    textAlign: 'center',
    marginTop: 8,
  },
  raza: { fontSize: 12, color: COLOR.SUBTEXTO, textAlign: 'center' },
})

export default MascotaHorizontal
