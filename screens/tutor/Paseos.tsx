import React from 'react'
import { StyleSheet, View, Text } from 'react-native'
import { COLOR } from '@/constants'
import Screen from '@/components/ui/Screen'

const Paseos: React.FC = () => {
  return (
    <Screen
      scroll
      style={styles.container}
      contentContainerStyle={styles.content}
    >
      <Text style={styles.title}>Paseos</Text>
      <View style={styles.section}>
        <Text style={{ color: COLOR.SUBTEXTO }}>
          Gestión de paseos
        </Text>
      </View>
    </Screen>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLOR.BASE,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: COLOR.TEXTO,
    marginBottom: 12,
  },
  map: {
    width: '100%',
    height: 220,
    borderRadius: 12,
    backgroundColor: COLOR.SECUNDARIO,
    marginBottom: 16,
  },
  section: {
    marginBottom: 16,
  },
  rowWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap' as const,
  },
  label: {
    color: COLOR.SUBTEXTO,
    marginBottom: 8,
  },
})

export default Paseos
