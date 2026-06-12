import React from 'react'
import { View, Text, StyleSheet, Pressable } from 'react-native'
import { COLOR } from '@/constants'
import Icon from '@/components/ui/Icon'

interface SectionHeaderWithAssistantProps {
  title: string
  onOpenAssistant: () => void
}

/**
 * Header reutilizable para secciones con asistente guiado.
 * Muestra título + botón de bombillo para abrir modal de asistente.
 */
export const SectionHeaderWithAssistant: React.FC<
  SectionHeaderWithAssistantProps
> = ({ title, onOpenAssistant }) => {
  return (
    <View style={styles.header}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Pressable style={styles.assistantButton} onPress={onOpenAssistant}>
        <Icon name="lightbulb" size={16} color={COLOR.PRIMARIO} />
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLOR.TEXTO,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  assistantButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: `${COLOR.PRIMARIO}15`,
    justifyContent: 'center',
    alignItems: 'center',
  },
})
