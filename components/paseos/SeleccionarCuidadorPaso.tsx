import React from 'react'
import { StyleSheet, View, FlatList, TouchableOpacity, Image, Text, ActivityIndicator } from 'react-native'
import { useTranslation } from 'react-i18next'
import { COLOR } from '@/constants'
import { Button, Icon } from '@/components/ui'
import { useSeleccionarCuidador } from '@/hooks/paseos/useSeleccionarCuidador'

interface Props {
  initialWalkerId?: string | null
  onNext: (walkerId: string) => void
  onBack: (walkerId?: string | null) => void
}

export const SeleccionarCuidadorPaso = ({ initialWalkerId, onNext, onBack }: Props) => {
  const { t } = useTranslation()
  const { 
    cuidadores, 
    cargando, 
    error, 
    cuidadorSeleccionado, 
    seleccionarCuidador,
    recargar 
  } = useSeleccionarCuidador(initialWalkerId)

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
        <Image 
          source={{ uri: item.imagen }} 
          style={styles.avatar}
        />
        
        <View style={styles.info}>
          <View style={styles.header}>
            <Text style={[styles.name, { fontWeight: 'bold' }]}>{item.nombre}</Text>
            {item.insignias.includes('verificado') && (
               <Icon name="check-circle" size={16} color={COLOR.PRIMARIO} />
            )}
          </View>
          
          <View style={styles.ratingRow}>
            <Icon name="star" size={14} color={COLOR.ENFASIS} />
            <Text style={styles.rating}>{item.calificacion.toFixed(1)}</Text>
            <Text style={styles.distance}>
              • {item.distancia}
            </Text>
          </View>

          <Text style={styles.price}>
            {item.tarifa}
          </Text>
        </View>

        <View style={styles.radio}>
          {isSelected && <View style={styles.radioSelected} />}
        </View>
      </TouchableOpacity>
    )
  }

  const renderLoading = () => (
    <View style={styles.centerContent}>
      <ActivityIndicator size="large" color={COLOR.PRIMARIO} />
      <Text style={styles.loadingText}>
        {t('paseos:pasos.seleccionar_cuidador.cargando', 'Cargando cuidadores...')}
      </Text>
    </View>
  )

  const renderError = () => (
    <View style={styles.centerContent}>
      <Icon name="exclamation-circle" size={48} color={COLOR.ERROR} />
      <Text style={styles.errorText}>
        {t('paseos:pasos.seleccionar_cuidador.error')}
      </Text>
      <Button
        title={t('comun:reintentar', 'Reintentar')}
        variant="bloque"
        onPress={recargar}
        style={{ marginTop: 16 }}
      />
    </View>
  )

  const renderEmpty = () => (
    <View style={styles.centerContent}>
      <View style={styles.iconWrapper}>
        <Icon name="users" size={64} color={COLOR.SUBTEXTO} />
      </View>
      <Text style={styles.emptyText}>
        {t('paseos:pasos.seleccionar_cuidador.sin_cuidadores')}
      </Text>
      <Text style={styles.emptySubtext}>
        {t('paseos:pasos.seleccionar_cuidador.sin_cuidadores_desc')}
      </Text>
    </View>
  )

  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        {t('paseos:pasos.seleccionar_cuidador.titulo')}
      </Text>
      
      {!cargando && !error && (
        <Text style={styles.subtitle}>
          {t('paseos:pasos.seleccionar_cuidador.lista_titulo')}
        </Text>
      )}

      {cargando ? (
        renderLoading()
      ) : error ? (
        renderError()
      ) : cuidadores.length === 0 ? (
        renderEmpty()
      ) : (
        <FlatList
          data={cuidadores}
          renderItem={renderItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
          style={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}

      <View style={styles.actions}>
        <Button
          title={t('comun:atras')}
          variant="bloque"
          onPress={() => onBack(cuidadorSeleccionado)}
          style={{ flex: 1 }}
        />
        <Button
          title={t('comun:continuar')}
          variant="primario"
          onPress={handleContinuar}
          disabled={!cuidadorSeleccionado || cargando}
          style={{ flex: 1 }}
        />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    height: 500,
  },
  list: {
    flex: 1,
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
    backgroundColor: COLOR.BORDE,
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
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  iconWrapper: {
    width: 80,
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
    color: COLOR.SUBTEXTO,
  },
  errorText: {
    marginTop: 16,
    fontSize: 14,
    color: COLOR.TEXTO,
    textAlign: 'center',
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: '600',
    color: COLOR.TEXTO,
    textAlign: 'center',
  },
  emptySubtext: {
    marginTop: 8,
    fontSize: 14,
    color: COLOR.SUBTEXTO,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
})
