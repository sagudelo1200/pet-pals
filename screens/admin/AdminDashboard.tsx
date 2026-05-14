import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { COLOR } from '@/constants'

const AdminDashboard: React.FC = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.titulo}>Panel de Administración</Text>
      <Text style={styles.subtitulo}>Próximamente…</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLOR.BASE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titulo: {
    fontSize: 22,
    fontWeight: '700',
    color: COLOR.TEXTO,
    marginBottom: 8,
  },
  subtitulo: {
    fontSize: 15,
    color: COLOR.SUBTEXTO,
  },
})

export default AdminDashboard
