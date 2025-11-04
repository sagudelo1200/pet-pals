import React from 'react'
import { StyleSheet, ScrollView, View, Text, Alert, Image } from 'react-native'
import { COLOR } from '@/constants'
import { Card, Button, Spacer, Badge, Chip } from '@/components/ui'

const Mascotas: React.FC = () => {
  const mockMascotas = [
    {
      id: '1',
      nombre: 'Luna',
      raza: 'Mestiza',
      foto: 'https://cdn.pixabay.com/photo/2018/08/20/22/37/dog-3620181_1280.jpg',
    },
    {
      id: '2',
      nombre: 'Max',
      raza: 'Labrador',
      foto: 'https://cdn.pixabay.com/photo/2016/02/11/16/59/dog-1194083_1280.jpg',
    },
    {
      id: '3',
      nombre: 'Nala',
      raza: 'Golden Retriever',
      foto: 'https://cdn.pixabay.com/photo/2024/06/19/21/54/animal-8840824_1280.jpg',
    },
  ]

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Mis Mascotas</Text>
        <Spacer size={12} />

        <View style={styles.grid}>
          {mockMascotas.map(m => (
            <Card
              key={m.id}
              title={m.nombre}
              subtitle={m.raza}
              style={styles.card}
            >
              <View style={styles.itemRow}>
                <Image source={{ uri: m.foto }} style={styles.dogThumb} />
                <View style={{ flex: 1 }}>
                  <Text style={{ color: COLOR.SUBTEXTO }}>
                    Edad: 2 años • Peso: 12kg
                  </Text>
                  <Spacer size={6} />
                  <Badge label="Vacunas al día" variant="exito" size="sm" />
                </View>
              </View>
              <View
                style={{
                  flexDirection: 'row',
                  flexWrap: 'wrap',
                  marginBottom: 8,
                }}
              >
                <Chip label="Enérgico" size="sm" leftIconName="bolt" />
                <Spacer horizontal size={6} />
                <Chip label="Sociable" size="sm" leftIconName="users" />
              </View>
              <View style={{ flexDirection: 'row' }}>
                <Button
                  title="Ver detalles"
                  size="sm"
                  onPress={() => Alert.alert('Detalles', m.nombre)}
                />
                <Spacer horizontal size={8} />
                <Button
                  title="Acción"
                  size="sm"
                  variant="info"
                  onPress={() => {}}
                />
              </View>
            </Card>
          ))}
        </View>
      </ScrollView>
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
})

export default Mascotas
