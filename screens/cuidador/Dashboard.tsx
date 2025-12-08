import React from 'react'
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  RefreshControl,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { useTranslation } from 'react-i18next'
import { useNavigation } from '@react-navigation/native'
import { COLOR } from '@/constants'
import Screen from '@/components/ui/Screen'
import { EstadisticaCard } from '@/components/cuidador/EstadisticaCard'
import TarjetaPaseo from '@/components/ui/TarjetaPaseo'
import { useEstadisticasCuidador } from '@/hooks/cuidador/useEstadisticasCuidador'
import { useAgendaCuidador } from '@/hooks/cuidador/useAgendaCuidador'
import { useAuth } from '@/context/AuthContext'
import LoadingScreen from '@/components/ui/LoadingScreen'
import PaseadorPerrosSvg from '@/assets/imgs/undraw/paseador_perros.svg'

const Dashboard: React.FC = () => {
  const { t } = useTranslation()
  const navigation = useNavigation()
  const { user } = useAuth()
  const estadisticas = useEstadisticasCuidador()
  const { proximos, cargando, refetch } = useAgendaCuidador()

  // Filtrar próximos paseos del cuidador (hoy y futuros)
  const proximosPaseos = (proximos || []).slice(0, 3)

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <PaseadorPerrosSvg width={150} height={120} style={{ opacity: 0.6 }} />
      <Text style={styles.emptyText}>{t('cuidador:dashboard.sin_paseos')}</Text>
    </View>
  )

  if (estadisticas.cargando && cargando) {
    return <LoadingScreen />
  }

  return (
    <Screen style={styles.container} includeTopInset>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={cargando}
            onRefresh={refetch}
            tintColor={COLOR.PRIMARIO}
          />
        }
      >
        {/* Header con gradiente sutil */}
        <LinearGradient
          colors={[`${COLOR.PRIMARIO}08`, 'transparent']}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={styles.headerGradient}
        >
          <View style={styles.header}>
            <Text style={styles.titulo}>{t('cuidador:dashboard.titulo')}</Text>
            <Text style={styles.subtitulo}>
              {t('cuidador:dashboard.subtitulo')}
            </Text>
          </View>
        </LinearGradient>

        {/* Estadísticas con diseño premium */}
        <View style={styles.estadisticas}>
          <EstadisticaCard
            titulo={t('cuidador:dashboard.solicitudes_pendientes')}
            valor={estadisticas.solicitudesPendientes}
            icono="bell"
            color={COLOR.INFO}
            gradientColors={['#3B82F615', '#3B82F605']}
            onPress={() => {
              // @ts-ignore
              navigation.navigate('Solicitudes')
            }}
          />
          <EstadisticaCard
            titulo={t('cuidador:dashboard.paseos_activos')}
            valor={estadisticas.paseosActivos}
            icono="walking"
            color={COLOR.PRIMARIO}
            gradientColors={['#8B5CF615', '#8B5CF605']}
            onPress={() => {
              // @ts-ignore
              navigation.navigate('Agenda')
            }}
          />
          <EstadisticaCard
            titulo={t('cuidador:dashboard.paseos_completados')}
            valor={estadisticas.paseosCompletados}
            icono="check-circle"
            color={COLOR.EXITO}
            gradientColors={['#10B98115', '#10B98105']}
          />
        </View>

        {/* Próximos Paseos */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              {t('cuidador:dashboard.proximos_paseos')}
            </Text>
            {proximosPaseos.length > 0 && (
              <Text style={styles.sectionCount}>{proximosPaseos.length}</Text>
            )}
          </View>
          {proximosPaseos.length > 0
            ? proximosPaseos.map(paseo => (
                <TarjetaPaseo
                  key={paseo.id}
                  paseo={paseo}
                  onPress={() => {
                    // @ts-ignore
                    navigation.navigate('DetallePaseo', { id: paseo.id })
                  }}
                />
              ))
            : renderEmptyState()}
        </View>
      </ScrollView>
    </Screen>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  headerGradient: {
    paddingTop: 20,
    paddingBottom: 24,
  },
  header: {
    paddingHorizontal: 20,
  },
  titulo: {
    fontSize: 28,
    fontWeight: '800',
    color: COLOR.TEXTO,
    marginBottom: 6,
    letterSpacing: -0.5,
  },
  subtitulo: {
    fontSize: 15,
    color: COLOR.SUBTEXTO,
    fontWeight: '500',
    letterSpacing: 0.1,
  },
  estadisticas: {
    paddingHorizontal: 20,
    marginBottom: 32,
  },
  section: {
    paddingHorizontal: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLOR.TEXTO,
    letterSpacing: -0.3,
  },
  sectionCount: {
    fontSize: 14,
    fontWeight: '600',
    color: COLOR.PRIMARIO,
    backgroundColor: `${COLOR.PRIMARIO}15`,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    marginTop: 20,
    fontSize: 15,
    color: COLOR.SUBTEXTO,
    textAlign: 'center',
    fontWeight: '500',
  },
})

export default Dashboard
