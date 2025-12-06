import React from 'react'
import { StyleSheet, View, FlatList, TouchableOpacity, Image, Text } from 'react-native'
import { useTranslation } from 'react-i18next'
import { COLOR } from '@/constants'
import { Button, Icon, Badge } from '@/components/ui'
import { useSeleccionarCuidador } from '@/hooks/paseos/useSeleccionarCuidador'

interface Props {
  initialWalkerId?: string | null
  onNext: (walkerId: string) => void
  onBack: (walkerId?: string | null) => void
}

export const SeleccionarCuidadorPaso = ({ initialWalkerId, onNext, onBack }: Props) => {
  const { t } = useTranslation()
  const { cuidadores, cuidadorSeleccionado, seleccionarCuidador } = useSeleccionarCuidador(initialWalkerId)

  const handleContinuar = () => {
    if (cuidadorSeleccionado) {
      onNext(cuidadorSeleccionado)
    }
  }

  const renderItem = ({ item }: { item: any }) => {
    const isSelected = cuidadorSeleccionado === item.id
    
    return (
      <TouchableOpacity
        style={[styles.card, isSelected && styles.cardSelected]}
        onPress={() => seleccionarCuidador(item.id)}
        activeOpacity={0.8}
      >
        <Image source={{ uri: item.imagen }} style={styles.avatar} />
        
        <View style={styles.info}>
          <View style={styles.header}>
            <Text style={[styles.name, { fontWeight: 'bold' }]}>{item.nombre}</Text>
            {item.insignias.includes('verificado') && (
               <Icon name="check-circle" size={16} color={COLOR.PRIMARIO} />
            )}
          </View>
          
          <View style={styles.ratingRow}>
            <Icon name="star" size={14} color={COLOR.ENFASIS} />
            <Text style={styles.rating}>{item.calificacion}</Text>
            <Text style={styles.distance}>
              • {t('paseos:pasos.seleccionar_cuidador.distancia', { distancia: item.distancia })}
            </Text>
          </View>

          <Text style={styles.price}>
            {t('paseos:pasos.seleccionar_cuidador.tarifa', { precio: item.tarifa })}
          </Text>
        </View>

        <View style={styles.radio}>
          {isSelected && <View style={styles.radioSelected} />}
        </View>
      </TouchableOpacity>
    )
  }

  return (
    <View style={styles.container}>
      <Text style={[styles.title, { fontWeight: 'bold' }]}>
        {t('paseos:pasos.seleccionar_cuidador.titulo')}
      </Text>
      
      <Text style={styles.subtitle}>
        {t('paseos:pasos.seleccionar_cuidador.lista_titulo')}
      </Text>

      <FlatList
        data={cuidadores}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        style={styles.list}
        showsVerticalScrollIndicator={false}
      />

      <View style={styles.actions}>
        <Button
          title={t('comun:atras')}
          variant="secundario"
          onPress={() => onBack(cuidadorSeleccionado)}
          style={{ flex: 1 }}
        />
        <Button
          title={t('comun:continuar')}
          variant={cuidadorSeleccionado ? 'primario' : 'inactivo'}
          onPress={handleContinuar}
          disabled={!cuidadorSeleccionado}
          style={{ flex: 1 }}
        />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    height: 500, // Fixed height to ensure BottomSheet expands
  },
  list: {
    flex: 1, // Allow list to scroll within the container
  },
  title: {
    fontSize: 24,
    color: COLOR.TEXTO,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: COLOR.SUBTEXTO,
    marginBottom: 16,
  },
  listContent: {
    paddingBottom: 20,
    gap: 12,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: COLOR.BLOQUE,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLOR.BORDE,
  },
  cardSelected: {
    borderColor: COLOR.PRIMARIO,
    backgroundColor: 'rgba(29, 143, 115, 0.05)',
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 12,
  },
  info: {
    flex: 1,
    justifyContent: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  name: {
    fontSize: 16,
    color: COLOR.TEXTO,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  rating: {
    fontSize: 14,
    color: COLOR.TEXTO,
    fontWeight: 'bold',
  },
  distance: {
    fontSize: 12,
    color: COLOR.SUBTEXTO,
  },
  price: {
    fontSize: 14,
    color: COLOR.PRIMARIO,
    fontWeight: '600',
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: COLOR.BORDE,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  radioSelected: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLOR.PRIMARIO,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
})
