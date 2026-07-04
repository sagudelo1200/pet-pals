import React from 'react'
import { View, Text, StyleSheet, ScrollView } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useNavigation } from '@react-navigation/native'
import Screen from '@/components/ui/Screen'
import { Button, Card, Icon } from '@/components/ui'
import { COLOR } from '@/constants'
import { useTranslation } from 'react-i18next'
import { LinearGradient } from 'expo-linear-gradient'
import { useHistorialExploraciones } from '@/hooks/explorador/useHistorialExploraciones'

/**
 * Pantalla principal del explorador - Dashboard territorial.
 * Primero: Información territorial y oportunidades
 * Luego: Estadísticas personales (huellas)
 */
const InicioExplorador = () => {
  const { t } = useTranslation()
  const insets = useSafeAreaInsets()
  const navigation = useNavigation<any>()
  const { exploraciones } = useHistorialExploraciones()

  // Calcular estadísticas
  const capturas = exploraciones.length
  const celdas = new Set(exploraciones.map(e => e.h3_index)).size

  // Simular zonas por explorar (este número será dinámico en FASE 2+)
  const zonasProximas = 4

  return (
    <Screen style={styles.container} includeTopInset={false}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header con gradiente */}
        <LinearGradient
          colors={[COLOR.PRIMARIO, COLOR.ENFASIS]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.headerGradient, { paddingTop: insets.top + 24 }]}
        >
          <Icon name="compass" size={44} color="#FFF" />
          <Text style={styles.headerTitle}>
            {t('explorador:bienvenido_explorador')}
          </Text>
          <Text style={styles.headerSubtitle}>
            {t('explorador:ayuda_mapear_territorio')}
          </Text>
        </LinearGradient>

        {/* SECCIÓN 1: Información Territorial */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            🗺️ {t('explorador:actividad_territorial')}
          </Text>

          {/* Oportunidades */}
          <Card style={styles.opportunityCard}>
            <View style={styles.opportunityContent}>
              <Text style={styles.opportunityNumber}>{zonasProximas}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.opportunityText}>
                  {t('explorador:zonas_por_explorar')}
                </Text>
                <Text style={styles.opportunitySubtext}>
                  {t('explorador:tu_barrio_actividad')} medio
                </Text>
              </View>
              <Icon name="map-marked-alt" size={32} color={COLOR.ENFASIS} />
            </View>
          </Card>

          {/* Botón principal de exploración */}
          <Button
            title={`🧭 ${t('explorador:nueva_exploracion')}`}
            variant="primario"
            size="lg"
            icon="plus-circle"
            onPress={() => navigation.navigate('ExplorarLibremente')}
            style={styles.explorationButton}
          />

          {/* Nota informativa */}
          <Card style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Icon name="lightbulb" size={18} color={COLOR.ENFASIS} />
              <Text style={styles.infoText}>
                Cada exploración suma huellas y ayuda a descubrir demanda real
                en tu zona.
              </Text>
            </View>
          </Card>
        </View>

        {/* SECCIÓN 2: Tu Impacto Territorial */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📊 Tu Impacto Territorial</Text>

          <View style={styles.impactGrid}>
            {/* Impacto 1: Exploraciones */}
            <Card style={styles.impactCard}>
              <View style={styles.impactContent}>
                <Text style={styles.impactEmoji}>🗺️</Text>
                <Text style={styles.impactValue}>{capturas}</Text>
                <Text style={styles.impactLabel}>Exploraciones</Text>
                <Text style={styles.impactDesc}>
                  {capturas === 1
                    ? 'Zona visitada y mapeada'
                    : 'Zonas visitadas y mapeadas'}
                </Text>
              </View>
            </Card>

            {/* Impacto 2: Celdas */}
            <Card style={styles.impactCard}>
              <View style={styles.impactContent}>
                <Text style={styles.impactEmoji}>📍</Text>
                <Text style={styles.impactValue}>{celdas}</Text>
                <Text style={styles.impactLabel}>Territorios</Text>
                <Text style={styles.impactDesc}>
                  {celdas === 1
                    ? 'Área única descubierta'
                    : 'Áreas únicas descubiertas'}
                </Text>
              </View>
            </Card>
          </View>

          <Card style={styles.impactFooter}>
            <View style={styles.impactFooterRow}>
              <Icon name="heart" size={16} color={COLOR.ENFASIS} />
              <Text style={styles.impactFooterText}>
                Cada exploración ayuda a las mascotas y cuidadores de tu barrio.
              </Text>
            </View>
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
    paddingBottom: 32,
  },
  headerGradient: {
    paddingHorizontal: 20,
    paddingBottom: 32,
    alignItems: 'center',
    gap: 12,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFF',
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#FFF',
    opacity: 0.9,
    textAlign: 'center',
  },
  section: {
    paddingHorizontal: 16,
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLOR.TEXTO,
    marginBottom: 16,
  },
  opportunityCard: {
    backgroundColor: COLOR.ENFASIS + '15',
    borderLeftColor: COLOR.ENFASIS,
    borderLeftWidth: 4,
    marginBottom: 12,
  },
  opportunityContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  opportunityNumber: {
    fontSize: 32,
    fontWeight: 'bold',
    color: COLOR.ENFASIS,
  },
  opportunityText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLOR.TEXTO,
  },
  opportunitySubtext: {
    fontSize: 12,
    color: COLOR.SUBTEXTO,
    marginTop: 2,
  },
  explorationButton: {
    marginBottom: 12,
    paddingVertical: 16,
  },
  infoCard: {
    backgroundColor: COLOR.PRIMARIO + '10',
    borderRadius: 8,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    color: COLOR.SUBTEXTO,
    lineHeight: 18,
  },
  impactGrid: {
    display: 'flex',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  impactCard: {
    width: '48%',
    backgroundColor: COLOR.BLOQUE,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: COLOR.ENFASIS,
  },
  impactContent: {
    alignItems: 'center',
    paddingVertical: 20,
    gap: 8,
  },
  impactEmoji: {
    fontSize: 32,
  },
  impactValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: COLOR.ENFASIS,
  },
  impactLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COLOR.TEXTO,
  },
  impactDesc: {
    fontSize: 11,
    color: COLOR.SUBTEXTO,
    textAlign: 'center',
    lineHeight: 15,
  },
  impactFooter: {
    backgroundColor: COLOR.ENFASIS + '08',
    borderRadius: 8,
  },
  impactFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  impactFooterText: {
    flex: 1,
    fontSize: 12,
    color: COLOR.SUBTEXTO,
    lineHeight: 16,
  },
})

export default InicioExplorador
