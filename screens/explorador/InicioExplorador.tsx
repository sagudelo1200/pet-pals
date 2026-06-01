import React from 'react'
import { View, Text, StyleSheet, ScrollView } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Screen from '@/components/ui/Screen'
import { Button, Card, Icon } from '@/components/ui'
import { COLOR } from '@/constants'
import { useTranslation } from 'react-i18next'
import { LinearGradient } from 'expo-linear-gradient'

/**
 * Pantalla principal del rol Explorador.
 * Muestra estadísticas personales, acceso rápido a captura territorial
 * y resumen de contribuciones.
 */
const InicioExplorador = () => {
  const { t } = useTranslation()
  const insets = useSafeAreaInsets()

  return (
    <Screen style={styles.container} includeTopInset={false}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header con gradiente */}
        <LinearGradient
          colors={[COLOR.ENFASIS, COLOR.PRIMARIO]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.headerGradient, { paddingTop: insets.top + 20 }]}
        >
          <Icon name="map-marked-alt" size={48} color="#FFF" />
          <Text style={styles.headerTitle}>
            {t('explorador:bienvenido_explorador')}
          </Text>
          <Text style={styles.headerSubtitle}>
            {t('explorador:ayuda_mapear_territorio')}
          </Text>
        </LinearGradient>

        <View style={styles.content}>
          {/* Tarjeta de estadísticas personales */}
          <Card style={styles.statsCard}>
            <Text style={styles.statsTitle}>
              {t('explorador:mis_contribuciones')}
            </Text>
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>0</Text>
                <Text style={styles.statLabel}>{t('explorador:capturas')}</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>0</Text>
                <Text style={styles.statLabel}>{t('explorador:celdas')}</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>0</Text>
                <Text style={styles.statLabel}>
                  {t('explorador:validaciones')}
                </Text>
              </View>
            </View>
          </Card>

          {/* Botón principal: nueva captura */}
          <Button
            title={t('explorador:nueva_captura')}
            icon="plus-circle"
            variant="primario"
            size="lg"
            style={styles.captureButton}
            onPress={() => {
              // TODO: Abrir bottom sheet de captura territorial
              console.log('Abrir captura territorial')
            }}
          />

          {/* Tarjeta informativa */}
          <Card style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Icon
                name="info-circle"
                size={24}
                color={COLOR.INFO}
                containerStyle={{ marginRight: 12 }}
              />
              <View style={{ flex: 1 }}>
                <Text style={styles.infoTitle}>
                  {t('explorador:como_funciona')}
                </Text>
                <Text style={styles.infoText}>
                  {t('explorador:captura_observaciones_desc')}
                </Text>
              </View>
            </View>
          </Card>

          {/* Placeholder: próximas funcionalidades */}
          <Card style={styles.comingSoonCard}>
            <Text style={styles.comingSoonTitle}>
              {t('explorador:proximamente')}
            </Text>
            <Text style={styles.comingSoonText}>
              • {t('explorador:gamificacion_puntos')}
              {'\n'}• {t('explorador:validacion_comercios')}
              {'\n'}• {t('explorador:alertas_territoriales')}
            </Text>
          </Card>
        </View>
      </ScrollView>
    </Screen>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLOR.BASE,
  },
  scrollContent: {
    flexGrow: 1,
  },
  headerGradient: {
    paddingBottom: 40,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFF',
    marginTop: 16,
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    marginTop: 8,
    textAlign: 'center',
  },
  content: {
    padding: 20,
  },
  statsCard: {
    marginBottom: 20,
  },
  statsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLOR.TEXTO,
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLOR.ENFASIS,
  },
  statLabel: {
    fontSize: 12,
    color: COLOR.SUBTEXTO,
    marginTop: 4,
  },
  captureButton: {
    marginBottom: 20,
  },
  infoCard: {
    marginBottom: 20,
    backgroundColor: COLOR.INFO + '10',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLOR.TEXTO,
    marginBottom: 6,
  },
  infoText: {
    fontSize: 14,
    color: COLOR.SUBTEXTO,
    lineHeight: 20,
  },
  comingSoonCard: {
    backgroundColor: COLOR.INACTIVO,
  },
  comingSoonTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLOR.TEXTO,
    marginBottom: 12,
  },
  comingSoonText: {
    fontSize: 14,
    color: COLOR.SUBTEXTO,
    lineHeight: 22,
  },
})

export default InicioExplorador
