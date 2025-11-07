import React from 'react'
import { StyleSheet, View, Text } from 'react-native'
import { COLOR } from '@/constants'
import { ScreenScrollView } from '@/components/ui'

const Mascotas: React.FC = () => {
  return (
    <View style={styles.container}>
      <ScreenScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Mascotas</Text>
        <View style={styles.section}>
          <Text style={{ color: COLOR.SUBTEXTO }}>
            Esta pantalla ha sido limpiada: la implementación de prueba fue
            eliminada. Aquí añadiremos la UI final de gestión de mascotas.
          </Text>
        </View>
      </ScreenScrollView>
    </View>
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
  section: {
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: COLOR.TEXTO,
    marginBottom: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap' as const,
    justifyContent: 'space-between',
  },
  card: {
    width: '100%',
    marginBottom: 12,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  dogThumb: {
    width: 56,
    height: 56,
    borderRadius: 8,
    backgroundColor: COLOR.SECUNDARIO,
    marginRight: 12,
  },
  cardEmoji: {
    fontSize: 28,
    marginBottom: 8,
  },
  /* nuevos estilos para acciones del card */
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  iconActions: {
    marginLeft: 8,
    alignItems: 'flex-end',
    justifyContent: 'flex-start',
  },
  iconButton: {
    padding: 6,
    borderRadius: 20,
  },
  cardInactive: {
    opacity: 0.55,
  },
})

export default Mascotas
