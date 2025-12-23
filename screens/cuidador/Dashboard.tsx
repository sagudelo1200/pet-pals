import React, { useCallback, useState } from 'react'
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  RefreshControl,
} from 'react-native'
import { useTranslation } from 'react-i18next'
import { useNavigation, useFocusEffect } from '@react-navigation/native'
import { COLOR } from '@/constants'
import { EstadisticaCard } from '@/components/cuidador/EstadisticaCard'
import { useEstadisticasCuidador } from '@/hooks/cuidador/useEstadisticasCuidador'
import { useAgendaCuidador } from '@/hooks/cuidador/useAgendaCuidador'
import { useAuth } from '@/context/AuthContext'
import PaseadorPerrosSvg from '@/assets/imgs/undraw/paseador_perros.svg'
import {
  Screen,
  LoadingScreen,
  ScreenHeader,
  TarjetaPaseo,
} from '@/components/ui'

const Dashboard: React.FC = () => {
  const { t } = useTranslation()
  const navigation = useNavigation()
  const { user } = useAuth()
  const estadisticas = useEstadisticasCuidador()
  const { proximos, cargando, refetch } = useAgendaCuidador()

  // Recargar estadísticas al enfocar la pantalla
  useFocusEffect(
    useCallback(() => {
      estadisticas.refetch()
    }, [])
  )

  const handleRefresh = async () => {
    await Promise.all([refetch(), estadisticas.refetch()])
  }

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
      {/* El el titulo, saludar al usuario */}
      <ScreenHeader
        title={t('cuidador:dashboard.titulo', {
          nombre: user?.displayName || '',
        })}
        subtitle={t('cuidador:dashboard.subtitulo')}
        showBack={false}
      />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={cargando || estadisticas.cargando}
            onRefresh={handleRefresh}
            tintColor={COLOR.PRIMARIO}
          />
        }
      >
        {/* Estadísticas con diseño premium */}
        <View style={styles.estadisticas}>
          {/* Principal: Paseos Activos */}
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

          <View style={{ height: 12 }} />

          {/* Grid Secundario */}
          <View style={styles.statsGrid}>
            <View style={styles.gridItemLeft}>
              <EstadisticaCard
                titulo={t('cuidador:dashboard.solicitudes_pendientes')}
                valor={estadisticas.solicitudesPendientes}
                icono="bell"
                color={COLOR.INFO}
                gradientColors={['#3B82F615', '#3B82F605']}
                variant="vertical"
                onPress={() => {
                  // @ts-ignore
                  navigation.navigate('Solicitudes')
                }}
              />
            </View>
            <View style={styles.gridItemRight}>
              <EstadisticaCard
                titulo={t('cuidador:dashboard.paseos_completados')}
                valor={estadisticas.paseosCompletados}
                icono="check-circle"
                color={COLOR.EXITO}
                gradientColors={['#10B98115', '#10B98105']}
                variant="vertical"
              />
            </View>
          </View>
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
                    // Navegar al panel de control del paseo
                    // @ts-ignore
                    navigation.navigate('ControlPaseo', { paseoId: paseo.id })
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
    paddingTop: 20,
  },
  estadisticas: {
    paddingHorizontal: 20,
    marginBottom: 32,
  },
  statsGrid: {
    flexDirection: 'row',
  },
  gridItemLeft: {
    flex: 1,
    marginRight: 6,
  },
  gridItemRight: {
    flex: 1,
    marginLeft: 6,
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
