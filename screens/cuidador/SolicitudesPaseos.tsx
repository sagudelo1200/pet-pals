import React from 'react'
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  ActivityIndicator,
} from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'
import { useTranslation } from 'react-i18next'
import Screen from '@/components/ui/Screen'
import { COLOR } from '@/constants'
import Icon from '@/components/ui/Icon'
import { useSolicitudesCuidador } from '@/hooks/cuidador/useSolicitudesCuidador'
import { TarjetaSolicitud } from '@/components/cuidador/TarjetaSolicitud'
import { Paseo } from '@/models/Paseo'
import { AuthStackParamList } from '@/navigation/types'

const SolicitudesPaseos: React.FC = () => {
  const { t } = useTranslation()
  const navigation = useNavigation<StackNavigationProp<AuthStackParamList>>()
  const { solicitudes, cargando } = useSolicitudesCuidador()

  const handlePressSolicitud = (solicitud: Paseo) => {
    navigation.navigate('DetalleSolicitud', { paseoId: solicitud.id })
  }

  const renderItem = ({ item }: { item: Paseo }) => (
    <TarjetaSolicitud solicitud={item} onPress={handlePressSolicitud} />
  )

  const renderEmpty = () => (
    <View style={styles.emptyState}>
      <Icon
        name="bell-slash"
        size={64}
        color={COLOR.SUBTEXTO}
        style={{ opacity: 0.3 }}
      />
      <Text style={styles.emptyText}>
        {t('cuidador:solicitudes.sin_solicitudes')}
      </Text>
      <Text style={styles.emptySubtext}>
        {t('cuidador:solicitudes.sin_solicitudes_desc')}
      </Text>
    </View>
  )

  return (
    <Screen style={styles.container} includeTopInset>
      <View style={styles.header}>
        <Text style={styles.titulo}>{t('cuidador:solicitudes.titulo')}</Text>
        <Text style={styles.subtitulo}>
          {t('cuidador:solicitudes.subtitulo')}
        </Text>
      </View>

      {cargando ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLOR.ENFASIS} />
        </View>
      ) : (
        <FlatList
          data={solicitudes}
          renderItem={renderItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={renderEmpty}
          showsVerticalScrollIndicator={false}
        />
      )}
    </Screen>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 24,
  },
  titulo: {
    fontSize: 28,
    fontWeight: '800',
    color: COLOR.TEXTO,
    marginBottom: 6,
    letterSpacing: -0.5,
  },
  subtitulo: {
    fontSize: 16,
    color: COLOR.SUBTEXTO,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    flexGrow: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    marginTop: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: COLOR.TEXTO,
    marginTop: 16,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    color: COLOR.SUBTEXTO,
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 20,
  },
})

export default SolicitudesPaseos
