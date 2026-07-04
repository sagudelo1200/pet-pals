import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Animated,
} from 'react-native'
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons'
import { useTranslation } from 'react-i18next'
import Screen from '@/components/ui/Screen'
import { COLOR } from '@/constants'
import { LinearGradient } from 'expo-linear-gradient'

/**
 * Pantalla de resumen y recompensas - Paso 9 del flujo PawPath
 * Muestra lo capturado, huellas ganadas, XP, zonas, etc.
 */

const ResumenExploracion = ({ route, navigation }: any) => {
  const { t } = useTranslation('explorador')
  const [animationValue] = useState(new Animated.Value(0))

  const { eventos, tiempoTotal, mascotasObservadas, huellas } =
    route.params || {
      eventos: [],
      tiempoTotal: '00:00',
      mascotasObservadas: 0,
      huellas: 40,
    }

  // Contar eventos por tipo
  const eventosPorTipo = {
    mascotas: eventos.filter((e: any) => e.tipo === 'mascotas').length,
    interesados: eventos.filter((e: any) => e.tipo === 'interesados').length,
    aliado: eventos.filter((e: any) => e.tipo === 'aliado').length,
    seguridad: eventos.filter((e: any) => e.tipo === 'seguridad').length,
    nota: eventos.filter((e: any) => e.tipo === 'nota').length,
  }

  // Animación de entrada
  useEffect(() => {
    Animated.sequence([
      Animated.timing(animationValue, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start()
  }, [])

  const escalaAnimada = animationValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0.8, 1],
  })

  const opacidadAnimada = animationValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  })

  return (
    <Screen style={styles.container} includeTopInset={false}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* HEADER CON ÉXITO */}
        <LinearGradient
          colors={[COLOR.PRIMARIO, COLOR.ENFASIS]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.successHeader}
        >
          <Animated.View
            style={[
              styles.iconContainer,
              {
                transform: [{ scale: escalaAnimada }],
                opacity: opacidadAnimada,
              },
            ]}
          >
            <Icon name="check-circle" size={80} color="#FFF" />
          </Animated.View>
          <Text style={styles.successTitle}>
            🌟 {t('exploracion_completada')}
          </Text>
          <Text style={styles.successSubtitle}>
            {t('aporte_construye_mapa')}
          </Text>
        </LinearGradient>

        {/* SECCIÓN: RESUMEN DE ACTIVIDAD */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📊 {t('resumen_actividad')}</Text>

          <View style={styles.summaryGrid}>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryEmoji}>⏱️</Text>
              <Text style={styles.summaryValue}>{tiempoTotal}</Text>
              <Text style={styles.summaryLabel}>{t('tiempo')}</Text>
            </View>

            <View style={styles.summaryCard}>
              <Text style={styles.summaryEmoji}>🐕</Text>
              <Text style={styles.summaryValue}>{mascotasObservadas}</Text>
              <Text style={styles.summaryLabel}>
                {t('mascotas_observadas_count')}
              </Text>
            </View>

            <View style={styles.summaryCard}>
              <Text style={styles.summaryEmoji}>📍</Text>
              <Text style={styles.summaryValue}>{eventos.length}</Text>
              <Text style={styles.summaryLabel}>{t('eventos_count')}</Text>
            </View>
          </View>
        </View>

        {/* SECCIÓN: EVENTOS CAPTURADOS */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📋 {t('eventos_registrados')}</Text>

          <View style={styles.eventosList}>
            {eventosPorTipo.mascotas > 0 && (
              <View style={styles.eventoItem}>
                <Icon name="dog" size={20} color={COLOR.ENFASIS} />
                <Text style={styles.eventoText}>
                  {t('mascotas_observadas')} ({eventosPorTipo.mascotas})
                </Text>
              </View>
            )}

            {eventosPorTipo.interesados > 0 && (
              <View style={styles.eventoItem}>
                <Icon name="account-multiple" size={20} color={COLOR.ENFASIS} />
                <Text style={styles.eventoText}>
                  {t('personas_interesadas')} ({eventosPorTipo.interesados})
                </Text>
              </View>
            )}

            {eventosPorTipo.aliado > 0 && (
              <View style={styles.eventoItem}>
                <Icon name="handshake" size={20} color={COLOR.ENFASIS} />
                <Text style={styles.eventoText}>
                  {t('aliado_negocio')} ({eventosPorTipo.aliado})
                </Text>
              </View>
            )}

            {eventosPorTipo.seguridad > 0 && (
              <View style={styles.eventoItem}>
                <Icon name="shield-alert" size={20} color={COLOR.ENFASIS} />
                <Text style={styles.eventoText}>
                  {t('seguridad_riesgo')} ({eventosPorTipo.seguridad})
                </Text>
              </View>
            )}

            {eventosPorTipo.nota > 0 && (
              <View style={styles.eventoItem}>
                <Icon name="note-multiple" size={20} color={COLOR.ENFASIS} />
                <Text style={styles.eventoText}>
                  {t('nota_rapida')} ({eventosPorTipo.nota})
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* SECCIÓN: RECOMPENSAS */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🏆 {t('recompensas_ganadas')}</Text>

          <LinearGradient
            colors={['#FFF9E6', '#FFF3CC']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.recompensaCard}
          >
            <View style={styles.recompensaRow}>
              <Text style={styles.recompensaEmoji}>🐾</Text>
              <View style={styles.recompensaInfo}>
                <Text style={styles.recompensaLabel}>
                  {t('huellas_ganadas')}
                </Text>
                <Text style={styles.recompensaValue}>+{huellas}</Text>
              </View>
            </View>
          </LinearGradient>

          <LinearGradient
            colors={['#E6F7FF', '#CCF0FF']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.recompensaCard}
          >
            <View style={styles.recompensaRow}>
              <Text style={styles.recompensaEmoji}>⭐</Text>
              <View style={styles.recompensaInfo}>
                <Text style={styles.recompensaLabel}>{t('xp_ganado')}</Text>
                <Text style={styles.recompensaValue}>+25 XP</Text>
              </View>
            </View>
          </LinearGradient>

          <LinearGradient
            colors={['#E6F0FF', '#CCE0FF']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.recompensaCard}
          >
            <View style={styles.recompensaRow}>
              <Text style={styles.recompensaEmoji}>🗺️</Text>
              <View style={styles.recompensaInfo}>
                <Text style={styles.recompensaLabel}>
                  {t('zona_explorada')}
                </Text>
                <Text style={styles.recompensaValue}>
                  +1 {t('zona_explorada')}
                </Text>
              </View>
            </View>
          </LinearGradient>
        </View>

        {/* SECCIÓN: INSIGHTS (opcional) */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>💡 {t('insights')}</Text>

          <View style={styles.insightCard}>
            <Icon name="lightbulb" size={20} color={COLOR.ENFASIS} />
            <View style={{ flex: 1 }}>
              <Text style={styles.insightTitle}>
                {t('zona_activa_detectada')}
              </Text>
              <Text style={styles.insightDesc}>
                {t('zona_actividad_mascotas')}
              </Text>
            </View>
          </View>
        </View>

        {/* BOTONES DE ACCIÓN */}
        <View style={styles.actionButtons}>
          <Pressable
            style={styles.btnSecundario}
            onPress={() => navigation.navigate('ExplorerRoot' as never)}
          >
            <Text style={styles.btnSecundarioText}>
              {t('volver_dashboard')}
            </Text>
          </Pressable>

          <Pressable
            style={styles.btnPrimario}
            onPress={() => navigation.navigate('ExplorarLibremente')}
          >
            <Icon name="plus-circle" size={20} color="#FFF" />
            <Text style={styles.btnPrimarioText}>{t('nueva_exploracion')}</Text>
          </Pressable>
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
    paddingBottom: 20,
  },
  successHeader: {
    paddingVertical: 40,
    paddingHorizontal: 20,
    alignItems: 'center',
    gap: 12,
  },
  iconContainer: {
    marginBottom: 12,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFF',
    textAlign: 'center',
  },
  successSubtitle: {
    fontSize: 14,
    color: '#FFF',
    opacity: 0.9,
    textAlign: 'center',
    lineHeight: 20,
  },
  section: {
    paddingHorizontal: 16,
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLOR.TEXTO,
    marginBottom: 12,
  },
  summaryGrid: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
  },
  summaryCard: {
    flex: 1,
    backgroundColor: COLOR.BLOQUE,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    gap: 6,
  },
  summaryEmoji: {
    fontSize: 28,
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLOR.TEXTO,
  },
  summaryLabel: {
    fontSize: 12,
    color: COLOR.SUBTEXTO,
  },
  eventosList: {
    gap: 10,
  },
  eventoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: COLOR.BLOQUE,
    borderRadius: 8,
  },
  eventoText: {
    fontSize: 13,
    color: COLOR.TEXTO,
    fontWeight: '500',
  },
  recompensaCard: {
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 10,
  },
  recompensaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  recompensaEmoji: {
    fontSize: 32,
  },
  recompensaInfo: {
    flex: 1,
  },
  recompensaLabel: {
    fontSize: 12,
    color: COLOR.SUBTEXTO,
    marginBottom: 4,
  },
  recompensaValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLOR.TEXTO,
  },
  insightCard: {
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 14,
    backgroundColor: COLOR.PRIMARIO + '10',
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: COLOR.ENFASIS,
  },
  insightTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: COLOR.TEXTO,
    marginBottom: 2,
  },
  insightDesc: {
    fontSize: 12,
    color: COLOR.SUBTEXTO,
    lineHeight: 16,
  },
  actionButtons: {
    paddingHorizontal: 16,
    gap: 10,
    marginTop: 24,
  },
  btnSecundario: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLOR.BLOQUE,
    alignItems: 'center',
  },
  btnSecundarioText: {
    color: COLOR.TEXTO,
    fontSize: 14,
    fontWeight: '600',
  },
  btnPrimario: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 8,
    backgroundColor: COLOR.ENFASIS,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  btnPrimarioText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
})

export default ResumenExploracion
