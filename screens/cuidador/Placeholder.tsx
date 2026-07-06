import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import Screen from '@/components/ui/Screen'
import { COLOR } from '@/constants'

const Placeholder: React.FC<{ titulo: string }> = ({ titulo }) => {
  return (
    <Screen style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.titulo}>{titulo}</Text>
        <Text style={styles.subtitulo}>Próximamente...</Text>
      </View>
    </Screen>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  titulo: {
    fontSize: 24,
    fontWeight: '700',
    color: COLOR.TEXTO,
    marginBottom: 8,
  },
  subtitulo: {
    fontSize: 16,
    color: COLOR.SUBTEXTO,
  },
})

export default Placeholder
