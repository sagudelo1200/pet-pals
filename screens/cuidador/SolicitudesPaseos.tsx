import React from 'react'
import { StyleSheet, View, Text, FlatList } from 'react-native'
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
import Skeleton from '@/components/ui/Skeleton'
import Card from '@/components/ui/Card'

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

  const renderSkeleton = () => (
    <View style={styles.skeletonContainer}>
      {[1, 2, 3].map(i => (
        <Card key={i} style={styles.skeletonCard}>
          <View style={styles.skeletonHeader}>
            <Skeleton width={100} height={16} />
            <Skeleton width={80} height={24} radius={12} />
          </View>
          <View style={styles.skeletonBody}>
            <Skeleton
              circle
              width={40}
              height={40}
              style={{ marginRight: 12 }}
            />
            <View>
              <Skeleton width={140} height={16} style={{ marginBottom: 8 }} />
              <Skeleton width={100} height={14} />
            </View>
          </View>
          <View style={styles.skeletonFooter}>
            <Skeleton width="100%" height={40} radius={8} />
          </View>
        </Card>
      ))}
    </View>
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
        renderSkeleton()
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
  skeletonContainer: {
    paddingHorizontal: 20,
  },
  skeletonCard: {
    marginBottom: 16,
    padding: 16,
  },
  skeletonHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  skeletonBody: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  skeletonFooter: {
    marginTop: 8,
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
