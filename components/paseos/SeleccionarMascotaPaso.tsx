import React from 'react'
import { StyleSheet, View, FlatList, TouchableOpacity, Image, Text } from 'react-native'
import { useTranslation } from 'react-i18next'
import { COLOR } from '@/constants'
import { Button, PetAvatar } from '@/components/ui'
import { useSeleccionarMascota } from '@/hooks/paseos/useSeleccionarMascota'

interface Props {
  initialSelectedIds?: string[]
  onNext: (petIds: string[]) => void
  onCancel: () => void
}

export const SeleccionarMascotaPaso = ({ initialSelectedIds, onNext, onCancel }: Props) => {
  const { t } = useTranslation()
  const { mascotas, mascotasSeleccionadas, toggleMascota } = useSeleccionarMascota(initialSelectedIds)

  const handleContinuar = () => {
    if (mascotasSeleccionadas.length > 0) {
      onNext(mascotasSeleccionadas)
    }
  }

  const renderItem = ({ item }: { item: any }) => {
    const isSelected = mascotasSeleccionadas.includes(item.id)
    
    return (
      <TouchableOpacity
        style={[styles.card, isSelected && styles.cardSelected]}
        onPress={() => toggleMascota(item.id)}
        activeOpacity={0.8}
      >
        <PetAvatar
          uri={item.foto}
          size="medium"
        />
        <Text style={[styles.name, isSelected && styles.nameSelected, { fontWeight: 'bold' }]}>
          {item.nombre}
        </Text>
        <Text style={styles.breed}>
          {item.raza}
        </Text>
      </TouchableOpacity>
    )
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        {t('paseos:pasos.seleccionar_mascota.titulo')}
      </Text>
      <Text style={styles.subtitle}>
        {t('paseos:pasos.seleccionar_mascota.emocional')}
      </Text>

      <FlatList
        data={mascotas}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        horizontal
        contentContainerStyle={styles.listContent}
        showsHorizontalScrollIndicator={false}
        ItemSeparatorComponent={() => <View style={{ width: 16 }} />}
      />

      <View style={styles.actions}>
        <Button
          title={t('comun:cancelar')}
          variant="bloque"
          onPress={onCancel}
          style={{ flex: 1 }}
        />
        <Button
          title={t('comun:continuar')}
          variant="primario"
          onPress={handleContinuar}
          disabled={mascotasSeleccionadas.length === 0}
          style={{ flex: 1 }}
        />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: COLOR.TEXTO,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: COLOR.SUBTEXTO,
    textAlign: 'center',
    marginBottom: 32,
  },
  listContent: {
    paddingHorizontal: 8,
    paddingBottom: 24,
    alignItems: 'center', // Center items vertically if they differ in height
  },
  card: {
    width: 120,
    padding: 16,
    borderRadius: 16,
    backgroundColor: COLOR.BLOQUE,
    alignItems: 'center',
    gap: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  cardSelected: {
    borderColor: COLOR.PRIMARIO,
    backgroundColor: 'rgba(29, 143, 115, 0.1)',
  },
  name: {
    fontSize: 16,
    color: COLOR.TEXTO,
    textAlign: 'center',
    width: '100%',
  },
  nameSelected: {
    color: COLOR.PRIMARIO,
  },
  breed: {
    fontSize: 12,
    color: COLOR.SUBTEXTO,
    textAlign: 'center',
    width: '100%',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
})
