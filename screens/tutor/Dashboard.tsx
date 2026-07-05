import React, { useMemo, useCallback, useState } from 'react'
import {
  StyleSheet,
  View,
  Platform,
  ScrollView,
  RefreshControl,
  Alert,
  Animated,
} from 'react-native'
import { theme, Text } from 'galio-framework'
import { useNavigation, useFocusEffect } from '@react-navigation/native'
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs'
import { TutorTabParamList } from '@/navigation/types'
import { useTranslation } from 'react-i18next'
import { COLOR } from '@/constants'

// Contextos y Hooks
import { useAuth } from '@/context/AuthContext'
import { useMascotas } from '@/hooks/useMascotas'
import { usePaseos } from '@/hooks/paseos/usePaseos'
import { useAnimacionFadeIn } from '@/hooks/useAnimacionFadeIn'

// Componentes UI Base
import {
  Chip,
  EmptyState,
  Skeleton,
  ScreenHeader,
  Screen,
  Spacer,
} from '@/components/ui'

// Componentes Dashboard
import { MisMascotasPreview } from '@/components/tutor/dashboard/MisMascotasPreview'
import { ProximoPaseoPreview } from '@/components/tutor/dashboard/ProximoPaseoPreview'
import { ActividadRecientePreview } from '@/components/tutor/dashboard/ActividadRecientePreview'

// Componentes de Dominio
import { SolicitarPaseoModal } from '@/components/paseos/SolicitarPaseoModal'
import DetallePaseoBottomSheet from '@/components/paseos/DetallePaseoBottomSheet'
import { CrearMascotaFlow } from './CrearMascotaFlow'

// Modelos
import { ESTADOS_PASEO } from '@/models/Paseo'

// Helpers
import {
  obtenerProximoPaseo,
  obtenerActividadReciente,
} from '@/logic/dashboard/helpers'
import { calcularCompletitud } from '@/logic/mascotas/calcularCompletitud'

type DashboardNavigationProp = BottomTabNavigationProp<TutorTabParamList>

/**
 * Dashboard del Tutor - Pantalla Principal
 *
 * Estructura:
 * 1. Header con saludo personalizado
 * 2. Mis Mascotas (preview 1-3)
 * 3. Próximo Paseo (si existe)
 * 4. Acciones Rápidas
 * 5. Actividad Reciente (últimos 5 eventos)
 *
 * FASE 1: Datos reales de Firestore
 * FASE 2: Componentes reutilizables
 * FASE 3: Navegación funcional
 */
const Dashboard: React.FC = () => {
  const navigation = useNavigation<DashboardNavigationProp>()
  const { t } = useTranslation()
  const { profile } = useAuth()

  // ===== DATA HOOKS (FASE 1) =====
  const {
    mascotas,
    loading: mascotasLoading,
    error: errorMascotas,
    refrescar: refrescarMascotas,
    crear: crearMascota,
  } = useMascotas()

  const {
    paseos,
    cargando: paseosLoading,
    error: errorPaseos,
    refetch: refetchPaseos,
  } = usePaseos()

  // ===== LOCAL STATE =====
  const [mostrarCrearMascota, setMostrarCrearMascota] = useState(false)
  const [mostrarSolicitarPaseo, setMostrarSolicitarPaseo] = useState(false)
  const [mostrarDetallePaseo, setMostrarDetallePaseo] = useState(false)
  const [refrescando, setRefrescando] = useState(false)
  const [paseoSeleccionadoId, setPaseoSeleccionadoId] = useState<string | null>(
    null
  )

  // ===== ANIMACIONES (FASE 4 - VISUAL) =====
  const { animatedStyle: mascotasAnim } = useAnimacionFadeIn(0, 400)
  const { animatedStyle: paseoAnim } = useAnimacionFadeIn(150, 400)
  const { animatedStyle: accionesAnim } = useAnimacionFadeIn(300, 400)
  const { animatedStyle: actividadAnim } = useAnimacionFadeIn(450, 400)

  // ===== COMPUTED STATES (FASE 1) =====
  const proximoPaseo = useMemo(
    () => obtenerProximoPaseo(paseos || []),
    [paseos]
  )

  const actividadReciente = useMemo(
    () => obtenerActividadReciente(paseos || []),
    [paseos]
  )

  const paseoSeleccionado = useMemo(
    () => paseos?.find(p => p.id === paseoSeleccionadoId) || null,
    [paseos, paseoSeleccionadoId]
  )

  // ===== ERROR HANDLING =====
  useFocusEffect(
    useCallback(() => {
      if (errorMascotas) {
        Alert.alert(t('errores:titulo'), t('mascotas:errores.error_cargar'))
      }
      if (errorPaseos) {
        Alert.alert(t('errores:titulo'), t('paseos:errores.error_cargar'))
      }
    }, [errorMascotas, errorPaseos, t])
  )

  // ===== HANDLERS (FASE 3) =====

  const handleRefrescar = useCallback(async () => {
    setRefrescando(true)
    try {
      await Promise.all([refrescarMascotas(), refetchPaseos()])
    } catch (err) {
      console.error('Error refrescando:', err)
    } finally {
      setRefrescando(false)
    }
  }, [refrescarMascotas, refetchPaseos])

  // Navegación (FASE 3)
  const handleAbrirMascotas = useCallback(() => {
    // @ts-ignore
    navigation.navigate('Mascotas')
  }, [navigation])

  const handleAbrirPaseos = useCallback(() => {
    // @ts-ignore
    navigation.navigate('Paseos')
  }, [navigation])

  const handleAbrirExplorador = useCallback(() => {
    // @ts-ignore
    navigation.navigate('Explorador')
  }, [navigation])

  const handleVerDetallesPaseo = useCallback(() => {
    if (!proximoPaseo) return

    // Si el paseo está activo, navega a la pantalla de seguimiento (mapa)
    if (
      proximoPaseo.estado === ESTADOS_PASEO.EN_PROGRESO ||
      proximoPaseo.estado === ESTADOS_PASEO.EN_CAMINO ||
      proximoPaseo.estado === ESTADOS_PASEO.EN_PUNTO_RECOGIDA
    ) {
      // @ts-ignore
      navigation.navigate('PaseoActivo', { paseoId: proximoPaseo.id })
      return
    }

    // Para otros estados (PENDIENTE, CONFIRMADO, etc.), abre el modal de detalles
    setPaseoSeleccionadoId(proximoPaseo.id)
    setMostrarDetallePaseo(true)
  }, [proximoPaseo, navigation])

  const handleContactarCuidador = useCallback(() => {
    if (proximoPaseo?.id) {
      // Navegar a Chat (FASE 3)
      // @ts-ignore
      navigation.navigate('Chat', { paseoId: proximoPaseo.id })
    }
  }, [proximoPaseo, navigation])

  const handleVerDetalleActividad = useCallback(
    (paseoId: string) => {
      const paseo = paseos?.find(p => p.id === paseoId)
      if (!paseo) return

      // Si el paseo está activo, navega a la pantalla de seguimiento
      if (
        paseo.estado === ESTADOS_PASEO.EN_PROGRESO ||
        paseo.estado === ESTADOS_PASEO.EN_CAMINO ||
        paseo.estado === ESTADOS_PASEO.EN_PUNTO_RECOGIDA
      ) {
        // @ts-ignore
        navigation.navigate('PaseoActivo', { paseoId })
        return
      }

      // Para otros estados, abre el modal de detalles
      setPaseoSeleccionadoId(paseoId)
      setMostrarDetallePaseo(true)
    },
    [paseos, navigation]
  )

  const handleAgregarMascota = useCallback(() => {
    setMostrarCrearMascota(true)
  }, [])

  const handleSolicitarPaseo = useCallback(() => {
    // Validar que existan mascotas
    if (mascotas.length === 0) {
      Alert.alert(
        t('paseos:errores.SIN_MASCOTAS_TITULO'),
        t('paseos:errores.SIN_MASCOTAS_MSG'),
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Crear Mascota',
            onPress: () => setMostrarCrearMascota(true),
          },
        ]
      )
      return
    }

    // Validar que AL MENOS una mascota esté lista (completitud.nivel >= 2)
    const mascotasListas = mascotas.filter(m => {
      const completitud = calcularCompletitud(m)
      return completitud.nivel >= 2
    })

    if (mascotasListas.length === 0) {
      Alert.alert(
        t('paseos:errores.mascota_no_lista_titulo'),
        t('paseos:errores.mascota_no_lista_msg'),
        [
          {
            text: t('comun:entendido'),
            style: 'default',
          },
        ]
      )
      return
    }

    setMostrarSolicitarPaseo(true)
  }, [mascotas, t])

  return (
    <Screen style={styles.container} includeTopInset>
      <ScreenHeader
        title={t('tutor:dashboard.titulo', {
          nombre: profile?.nombre ?? 'Tutor',
        })}
        subtitle={t('tutor:dashboard.subtitulo')}
        showBack={false}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refrescando}
            onRefresh={handleRefrescar}
            tintColor={COLOR.PRIMARIO}
          />
        }
      >
        {/* ===== SECCIÓN 1: MIS MASCOTAS (FASE 2) ===== */}
        <Animated.View style={[styles.section, mascotasAnim]}>
          {mascotasLoading ? (
            <Skeleton height={100} />
          ) : mascotas.length === 0 ? (
            <EmptyState
              iconName="paw"
              title={t('tutor:dashboard.sin_mascotas_titulo')}
              description={t('tutor:dashboard.sin_mascotas_desc')}
              actionLabel={t('tutor:dashboard.agregar_mascota')}
              onActionPress={handleAgregarMascota}
            />
          ) : (
            <MisMascotasPreview
              mascotas={mascotas}
              onVerTodas={handleAbrirMascotas}
              onAgregarMascota={handleAgregarMascota}
            />
          )}
        </Animated.View>

        <Spacer size={theme.SIZES.BASE} />

        {/* ===== SECCIÓN 2: PRÓXIMO PASEO (FASE 1 + 2 + 3) ===== */}
        <Animated.View style={[styles.section, paseoAnim]}>
          <Text style={styles.sectionTitle}>
            {t('tutor:dashboard.proximo_paseo')}
          </Text>

          {paseosLoading ? (
            <Skeleton height={150} />
          ) : proximoPaseo ? (
            <ProximoPaseoPreview
              paseo={proximoPaseo}
              onVerDetalles={handleVerDetallesPaseo}
              onContactar={handleContactarCuidador}
            />
          ) : (
            <EmptyState
              iconName="walking"
              title={t('tutor:dashboard.sin_paseo_titulo')}
              description={t('tutor:dashboard.sin_paseo_desc')}
              actionLabel={t('tutor:dashboard.solicitar_paseo')}
              onActionPress={handleSolicitarPaseo}
            />
          )}
        </Animated.View>

        <Spacer size={theme.SIZES.BASE} />

        {/* ===== SECCIÓN 3: ACCIONES RÁPIDAS (FASE 3) ===== */}
        <Animated.View style={[styles.section, accionesAnim]}>
          <Text style={styles.sectionTitle}>
            {t('tutor:dashboard.acciones_rapidas')}
          </Text>

          <View style={styles.accionesGrid}>
            <Chip
              label={t('tutor:dashboard.solicitar_paseo')}
              leftIconName="walking"
              onPress={handleSolicitarPaseo}
            />
            <Chip
              label={t('tutor:dashboard.agregar_mascota')}
              leftIconName="paw"
              onPress={handleAgregarMascota}
            />
            <Chip
              label={t('tutor:dashboard.ver_paseos')}
              leftIconName="history"
              onPress={handleAbrirPaseos}
            />
            <Chip
              label={t('tutor:dashboard.explorar')}
              leftIconName="map-marker"
              onPress={handleAbrirExplorador}
            />
          </View>
        </Animated.View>

        <Spacer size={theme.SIZES.BASE} />

        {/* ===== SECCIÓN 4: ACTIVIDAD RECIENTE (FASE 1 + 2) ===== */}
        <Animated.View style={[styles.section, actividadAnim]}>
          <Text style={styles.sectionTitle}>
            {t('tutor:dashboard.actividad_reciente')}
          </Text>

          {paseosLoading ? (
            <Skeleton height={200} />
          ) : actividadReciente.length === 0 ? (
            <EmptyState
              iconName="inbox"
              title={t('tutor:dashboard.sin_actividad_titulo')}
              description={t('tutor:dashboard.sin_actividad_desc')}
              actionLabel={t('tutor:dashboard.solicitar_paseo')}
              onActionPress={handleSolicitarPaseo}
            />
          ) : (
            <ActividadRecientePreview
              paseos={actividadReciente}
              onPresionar={handleVerDetalleActividad}
            />
          )}
        </Animated.View>

        <Spacer size={theme.SIZES.BASE * 2} />
      </ScrollView>

      {/* ===== MODALES Y BOTTOM SHEETS ===== */}
      <CrearMascotaFlow
        visible={mostrarCrearMascota}
        onClose={() => setMostrarCrearMascota(false)}
        onGuardar={async datosMascota => {
          try {
            await crearMascota(datosMascota)
            setMostrarCrearMascota(false)
            await refrescarMascotas()
          } catch (error: any) {
            Alert.alert(
              t('errores:titulo'),
              t('mascotas:errores.error_crear') || error.message
            )
          }
        }}
      />

      <SolicitarPaseoModal
        visible={mostrarSolicitarPaseo}
        onClose={() => setMostrarSolicitarPaseo(false)}
      />

      <DetallePaseoBottomSheet
        visible={mostrarDetallePaseo}
        paseo={paseoSeleccionado}
        onClose={() => {
          setMostrarDetallePaseo(false)
          setPaseoSeleccionadoId(null)
        }}
      />
    </Screen>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLOR.BASE,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: theme.SIZES.BASE,
    paddingBottom: Platform.OS === 'android' ? 120 : theme.SIZES.BASE * 2,
  },
  section: {
    marginBottom: theme.SIZES.BASE,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLOR.TEXTO,
    marginBottom: 12,
  },
  accionesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
})

export default Dashboard
