import React from 'react'
import { StyleSheet, View, FlatList } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'
import { useTranslation } from 'react-i18next'
import Screen from '@/components/ui/Screen'
import ScreenHeader from '@/components/ui/ScreenHeader'
import { useSolicitudesCuidador } from '@/hooks/cuidador/useSolicitudesCuidador'
import { TarjetaSolicitud } from '@/components/cuidador/TarjetaSolicitud'
import { Paseo } from '@/models/Paseo'
import { AuthStackParamList } from '@/navigation/types'
import Skeleton from '@/components/ui/Skeleton'
import Card from '@/components/ui/Card'
import EmptyState from '@/components/ui/EmptyState'
import DiaEnElParqueSvg from '@/assets/imgs/undraw/dia_en_el_parque.svg'

const SolicitudesPaseos: React.FC = () => {
  const { t } = useTranslation()
  const navigation = useNavigation<StackNavigationProp<AuthStackParamList>>()
  const { solicitudes, cargando } = useSolicitudesCuidador()

  const handlePressSolicitud = (solicitud: Paseo) => {
    // Redirigir a la vista de detalle general del paseo
    navigation.navigate('DetallePaseo', { id: solicitud.id })
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
    <EmptyState
      image={
        <DiaEnElParqueSvg width={200} height={160} style={{ opacity: 0.8 }} />
      }
      title={t('cuidador:solicitudes.sin_solicitudes')}
      description={t('cuidador:solicitudes.sin_solicitudes_desc')}
      style={{ paddingBottom: 0 }}
    />
  )

  return (
    <Screen style={styles.container} includeTopInset>
      <ScreenHeader
        title={t('cuidador:solicitudes.titulo')}
        subtitle={t('cuidador:solicitudes.subtitulo')}
        showBack={false}
      />

      {cargando ? (
        renderSkeleton()
      ) : (
        <FlatList
          data={solicitudes}
          renderItem={renderItem}
          keyExtractor={item => item.id}
          style={{ flex: 1 }}
          contentContainerStyle={[
            styles.listContent,
            solicitudes.length === 0 && { justifyContent: 'center' },
          ]}
          ListEmptyComponent={renderEmpty()}
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
  listContent: {
    paddingHorizontal: 20,
    paddingTop: 16, // Espacio superior añadido
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
})

export default SolicitudesPaseos
