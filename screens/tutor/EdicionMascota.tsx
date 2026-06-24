import React, { useCallback, useMemo, useEffect, useState } from 'react'
import {
  View,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Text,
  StyleSheet,
  Animated,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRoute, useNavigation } from '@react-navigation/native'
import { useTranslation } from 'react-i18next'
import { Ionicons } from '@expo/vector-icons'

import { useEdicionMascota } from '@/hooks/useEdicionMascota'
import { calcularCompletitud } from '@/logic/mascotas/calcularCompletitud'

// Secciones
import { InfoPrincipalMascota } from '@/components/mascota/InfoPrincipalMascota'
import { SobreMiMascota } from '@/components/mascota/SobreMiMascota'
import { SeccionSalud } from '@/components/mascota/SeccionSalud'
import { SeccionComportamiento } from '@/components/mascota/SeccionComportamiento'
import { SeccionCompatibilidad } from '@/components/mascota/SeccionCompatibilidad'
import { IndicadorCompletitud } from '@/components/mascota/IndicadorCompletitud'

// Modales asistentes
import { ModalComportamientoAsistente } from '@/components/mascota/ModalComportamientoAsistente'
import { ModalCompatibilidadAsistente } from '@/components/mascota/ModalCompatibilidadAsistente'

import { COLOR } from '@/constants'
import type { Mascota } from '@/models/Mascota'

interface RouteParams {
  mascotaId: string
}

interface ExpandedState {
  basica: boolean
  salud: boolean
  comportamiento: boolean
  compatibilidad: boolean
  notas: boolean
}

export const EdicionMascota = () => {
  const { t } = useTranslation()
  const navigation = useNavigation()
  const route = useRoute()
  const { mascotaId } = route.params as RouteParams

  const {
    mascota,
    editedData,
    actualizarCampo,
    guardarCambios,
    saving,
    loading,
    actualizarMascotaLocal,
  } = useEdicionMascota(mascotaId)

  // Sincronizar editedData con mascota cuando carga
  useEffect(() => {
    if (mascota && (!editedData || Object.keys(editedData).length === 0)) {
      // Inicializar editedData con los datos de mascota
      Object.entries(mascota).forEach(([key, value]) => {
        if (key !== 'usuario_id') {
          actualizarCampo(key as keyof Mascota, value as any)
        }
      })
    }
  }, [mascota?.id]) // Solo ejecutar cuando cambie mascotaId

  const [showModalComportamiento, setShowModalComportamiento] = useState(false)
  const [showModalCompatibilidad, setShowModalCompatibilidad] = useState(false)

  const [expanded, setExpanded] = useState<ExpandedState>({
    basica: true,
    salud: false,
    comportamiento: false,
    compatibilidad: false,
    notas: false,
  })

  const toggleSection = useCallback((section: keyof ExpandedState) => {
    setExpanded(prev => ({
      ...prev,
      [section]: !prev[section],
    }))
  }, [])

  const completitud = useMemo(() => {
    if (!editedData || Object.keys(editedData).length === 0) return null
    return calcularCompletitud(editedData as any)
  }, [editedData])

  const handleGuardar = useCallback(async () => {
    try {
      await guardarCambios()
      Alert.alert(
        t('mascotas:editar.guardado_exitoso'),
        t('mascotas:editar.cambios_guardados'),
        [
          {
            text: t('comun:aceptar'),
            onPress: () => navigation.goBack(),
          },
        ]
      )
    } catch (error) {
      Alert.alert(
        t('mascotas:errores.error_guardar'),
        error instanceof Error ? error.message : 'Error desconocido'
      )
    }
  }, [guardarCambios, navigation, t])

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLOR.PRIMARIO} />
      </SafeAreaView>
    )
  }

  if (!mascota || !editedData) {
    return (
      <SafeAreaView style={styles.errorContainer}>
        <Ionicons
          name="alert-circle-outline"
          size={48}
          color={COLOR.ERROR}
          style={{ marginBottom: 16 }}
        />
        <Text style={styles.errorText}>
          {t('mascotas:errores.MASCOTA_NO_ENCONTRADA')}
        </Text>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.errorButton}
        >
          <Text style={styles.errorButtonText}>{t('comun:atras')}</Text>
        </TouchableOpacity>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <Ionicons name="chevron-back" size={28} color={COLOR.PRIMARIO} />
          </TouchableOpacity>

          <Text style={styles.headerTitle}>
            {t('mascotas:editar.edicion_info')}
          </Text>

          <View style={{ width: 28 }} />
        </View>

        {completitud && (
          <View style={styles.completitudContainer}>
            <IndicadorCompletitud completitud={completitud} size="md" />
          </View>
        )}
      </View>

      {/* Contenido scrolleable */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <AccordionSection
          title={t('mascotas:editar.seccion_basica')}
          isExpanded={expanded.basica}
          onToggle={() => toggleSection('basica')}
          completionPercent={completitud?.campos.basico}
        >
          <InfoPrincipalMascota
            mascota={mascota}
            isEditMode={true}
            editedData={editedData}
            onUpdateField={actualizarCampo}
          />
        </AccordionSection>

        <AccordionSection
          title={t('mascotas:editar.seccion_salud')}
          isExpanded={expanded.salud}
          onToggle={() => toggleSection('salud')}
          completionPercent={completitud?.campos.salud}
        >
          <SeccionSalud
            mascota={mascota}
            isEditMode={true}
            editedData={editedData}
            onUpdateField={actualizarCampo}
          />
        </AccordionSection>

        <AccordionSection
          title={t('mascotas:editar.seccion_comportamiento')}
          isExpanded={expanded.comportamiento}
          onToggle={() => toggleSection('comportamiento')}
          completionPercent={completitud?.campos.comportamiento}
        >
          <SeccionComportamiento
            mascota={mascota}
            onOpenAsistente={() => setShowModalComportamiento(true)}
          />
        </AccordionSection>

        <AccordionSection
          title={t('mascotas:editar.seccion_compatibilidad')}
          isExpanded={expanded.compatibilidad}
          onToggle={() => toggleSection('compatibilidad')}
          completionPercent={completitud?.campos.compatibilidad}
        >
          <SeccionCompatibilidad
            mascota={mascota}
            onOpenAssistant={() => setShowModalCompatibilidad(true)}
          />
        </AccordionSection>

        <AccordionSection
          title={t('mascotas:editar.sobre_mi_mascota')}
          isExpanded={expanded.notas}
          onToggle={() => toggleSection('notas')}
          completionPercent={completitud?.campos.notas}
        >
          <SobreMiMascota
            mascota={mascota}
            isEditMode={true}
            editedData={editedData}
            onUpdateField={actualizarCampo}
          />
        </AccordionSection>

        {/* Banner: Mascota lista para paseos */}
        {completitud && completitud.nivel >= 2 && (
          <View style={styles.readyBannerContainer}>
            <View style={styles.readyBannerContent}>
              <Ionicons
                name="checkmark-circle"
                size={32}
                color={COLOR.EXITO}
                style={{ marginRight: 12 }}
              />
              <View style={{ flex: 1 }}>
                <Text style={styles.readyBannerTitle}>
                  {t('mascotas:editar.lista_para_paseos')}
                </Text>
                <Text style={styles.readyBannerSubtitle}>
                  {t('mascotas:editar.puedes_solicitar_paseo')}
                </Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.requestWalkButton}
              onPress={() => {
                navigation.goBack()
                // Navegar a Paseos tab
                ;(navigation as any).navigate('TutorApp', {
                  screen: 'PaseosTab',
                  params: {
                    abrirSolicitar: true,
                    mascotaId: mascotaId,
                  },
                })
              }}
              activeOpacity={0.7}
            >
              <Ionicons name="paw" size={18} color="#fff" />
              <Text style={styles.requestWalkButtonText}>
                {t('mascotas:editar.solicitar_paseo')}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Footer con botón guardar */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={handleGuardar}
          disabled={saving}
          activeOpacity={0.7}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Ionicons name="checkmark-done" size={20} color="#fff" />
              <Text style={styles.saveButtonText}>
                {t('mascotas:editar.guardar')}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Modales */}
      {showModalComportamiento && mascota && (
        <ModalComportamientoAsistente
          visible={showModalComportamiento}
          petName={mascota.nombre!}
          mascotaId={mascota.id!}
          initialBehaviorData={editedData}
          onClose={() => setShowModalComportamiento(false)}
          onCompleted={savedData => {
            actualizarMascotaLocal(savedData)
            setShowModalComportamiento(false)
          }}
        />
      )}

      {showModalCompatibilidad && mascota && (
        <ModalCompatibilidadAsistente
          visible={showModalCompatibilidad}
          petName={mascota.nombre!}
          mascotaId={mascota.id!}
          initialCompatibilidadData={editedData}
          onClose={() => setShowModalCompatibilidad(false)}
          onCompleted={savedData => {
            actualizarMascotaLocal(savedData)
            setShowModalCompatibilidad(false)
          }}
        />
      )}
    </SafeAreaView>
  )
}

interface AccordionSectionProps {
  title: string
  isExpanded: boolean
  onToggle: () => void
  completionPercent?: Record<string, boolean>
  children: React.ReactNode
}

const AccordionSection: React.FC<AccordionSectionProps> = ({
  title,
  isExpanded,
  onToggle,
  completionPercent,
  children,
}) => {
  const completionPercentage = completionPercent
    ? Math.round(
        (Object.values(completionPercent).filter(Boolean).length /
          Object.values(completionPercent).length) *
          100
      )
    : 0

  const [contentHeight, setContentHeight] = useState(0)
  const animatedHeight = useMemo(() => new Animated.Value(0), [])

  useEffect(() => {
    Animated.timing(animatedHeight, {
      toValue: isExpanded ? contentHeight : 0,
      duration: 300,
      useNativeDriver: false,
    }).start()
  }, [isExpanded, contentHeight])

  return (
    <View style={styles.sectionContainer}>
      <TouchableOpacity
        onPress={onToggle}
        style={[
          styles.sectionHeader,
          isExpanded && styles.sectionHeaderExpanded,
        ]}
        activeOpacity={0.7}
      >
        <View style={{ flex: 1 }}>
          <Text style={styles.sectionTitle}>{title}</Text>
          {completionPercent && (
            <View style={styles.progressContainer}>
              <View style={styles.progressBarBackground}>
                <View
                  style={[
                    styles.progressBarFill,
                    {
                      width: `${completionPercentage}%`,
                      backgroundColor:
                        completionPercentage === 100
                          ? COLOR.EXITO
                          : COLOR.ENFASIS,
                    },
                  ]}
                />
              </View>
              <Text style={styles.progressText}>{completionPercentage}%</Text>
            </View>
          )}
        </View>

        <Ionicons
          name={isExpanded ? 'chevron-up' : 'chevron-down'}
          size={24}
          color={COLOR.PRIMARIO}
        />
      </TouchableOpacity>

      {isExpanded && (
        <View
          style={styles.sectionContent}
          onLayout={event => setContentHeight(event.nativeEvent.layout.height)}
        >
          {children}
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLOR.BASE,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: COLOR.BASE,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    backgroundColor: COLOR.BASE,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  errorText: {
    fontSize: 16,
    color: COLOR.TEXTO,
    textAlign: 'center',
    marginBottom: 24,
  },
  errorButton: {
    backgroundColor: COLOR.PRIMARIO,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  errorButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },

  // Header
  header: {
    backgroundColor: COLOR.BLOQUE,
    borderBottomWidth: 1,
    borderBottomColor: COLOR.BORDE,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  backButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: -12,
  },
  headerTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: COLOR.TEXTO,
    textAlign: 'center',
  },
  completitudContainer: {
    marginTop: 8,
  },

  // Scroll
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingBottom: 24,
  },

  // Section
  sectionContainer: {
    marginBottom: 12,
    borderRadius: 12,
    backgroundColor: COLOR.BLOQUE,
    borderWidth: 1,
    borderColor: COLOR.BORDE,
    overflow: 'hidden',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: COLOR.BLOQUE,
  },
  sectionHeaderExpanded: {
    backgroundColor: COLOR.SECUNDARIO,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: COLOR.TEXTO,
    marginBottom: 8,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  progressBarBackground: {
    flex: 1,
    height: 4,
    backgroundColor: COLOR.BORDE,
    borderRadius: 2,
    maxWidth: 120,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: 4,
    borderRadius: 2,
  },
  progressText: {
    fontSize: 11,
    color: COLOR.SUBTEXTO,
    fontWeight: '500',
    minWidth: 30,
  },
  sectionContent: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: COLOR.BORDE,
    backgroundColor: COLOR.BASE,
  },

  // Footer
  footer: {
    backgroundColor: COLOR.BLOQUE,
    borderTopWidth: 1,
    borderTopColor: COLOR.BORDE,
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingBottom: 24,
  },
  saveButton: {
    backgroundColor: COLOR.PRIMARIO,
    flexDirection: 'row',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },

  // Ready Banner
  readyBannerContainer: {
    backgroundColor: COLOR.BLOQUE,
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 0,
    marginVertical: 16,
    borderLeftWidth: 4,
    borderLeftColor: COLOR.EXITO,
    borderWidth: 1,
    borderColor: COLOR.BORDE,
  },
  readyBannerContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  readyBannerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLOR.EXITO,
    marginBottom: 4,
  },
  readyBannerSubtitle: {
    fontSize: 13,
    color: COLOR.SUBTEXTO,
    fontWeight: '400',
  },
  requestWalkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLOR.EXITO,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    gap: 8,
  },
  requestWalkButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
})
