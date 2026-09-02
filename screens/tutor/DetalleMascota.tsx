import React, { useRef, useMemo, useCallback, useEffect, useState } from 'react'
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  Pressable,
  Alert,
  Animated,
  ActivityIndicator,
} from 'react-native'
import { useTranslation } from 'react-i18next'
import {
  useNavigation,
  useRoute,
  RouteProp,
  useFocusEffect,
} from '@react-navigation/native'
import { COLOR, ERR } from '@/constants'
import Button from '@/components/ui/Button'
import Icon from '@/components/ui/Icon'
import { AuthStackParamList } from '@/navigation/types'
import type { Mascota } from '@/models/Mascota'
import { calcularCompletitud } from '@/logic/mascotas/calcularCompletitud'
import { ServicioResumenEvaluacion } from '@/services/firebase'
import type { ObservacionMascota } from '@/models/ResumenEvaluacion'

// Hooks
import { useAnimacionModal } from '@/hooks/useAnimacionModal'
import { useEdicionMascota } from '@/hooks/useEdicionMascota'
import { useComportamientoEditor } from '@/hooks/useComportamientoEditor'
import { useCompatibilidadEditor } from '@/hooks/useCompatibilidadEditor'

// Components
import { HeroMascota } from '@/components/mascota/HeroMascota'
import { IndicadorCompletitud } from '@/components/mascota/IndicadorCompletitud'
import { InfoPrincipalMascota } from '@/components/mascota/InfoPrincipalMascota'
import { SeccionComportamiento } from '@/components/mascota/SeccionComportamiento'
import { SeccionSalud } from '@/components/mascota/SeccionSalud'
import { SeccionCompatibilidad } from '@/components/mascota/SeccionCompatibilidad'
import { ModalComportamientoAsistente } from '@/components/mascota/ModalComportamientoAsistente'
import { ModalCompatibilidadAsistente } from '@/components/mascota/ModalCompatibilidadAsistente'
import { SobreMiMascota } from '@/components/mascota/SobreMiMascota'

type DetalleMascotaRouteProp = RouteProp<AuthStackParamList, 'DetalleMascota'>

const DetalleMascota: React.FC = () => {
  const { t } = useTranslation()
  const navigation = useNavigation()
  const route = useRoute<DetalleMascotaRouteProp>()
  const { mascotaId, mascota: mascotaParam } = route.params

  // Normalizar fechas si vienen como strings (por serialización de navegación)
  const mascotaNormalizada = useMemo(() => {
    if (!mascotaParam) return undefined
    return {
      ...mascotaParam,
      fecha_nacimiento:
        typeof mascotaParam.fecha_nacimiento === 'string'
          ? new Date(mascotaParam.fecha_nacimiento)
          : mascotaParam.fecha_nacimiento,
      vacunas: mascotaParam.vacunas?.map(v => ({
        ...v,
        fecha: typeof v.fecha === 'string' ? new Date(v.fecha) : v.fecha,
      })),
      creado_en:
        typeof mascotaParam.creado_en === 'string'
          ? new Date(mascotaParam.creado_en)
          : mascotaParam.creado_en,
      actualizado_en:
        typeof mascotaParam.actualizado_en === 'string'
          ? new Date(mascotaParam.actualizado_en)
          : mascotaParam.actualizado_en,
    } as Mascota
  }, [mascotaParam])

  const scrollViewRef = useRef<ScrollView>(null)
  const lastNavTime = useRef(0)

  // Observaciones de cuidadores: la observación pertenece al expediente de la
  // mascota (resumenes_evaluacion/{mascotaId}.observaciones_recientes)
  const [observaciones, setObservaciones] = useState<ObservacionMascota[] | null>(
    null
  )
  useEffect(() => {
    if (!mascotaNormalizada?.id) return undefined
    let activo = true
    setObservaciones(null)
    ServicioResumenEvaluacion.obtenerPorObjetivo(mascotaNormalizada.id)
      .then(res => {
        if (!activo) return
        setObservaciones(res.success ? (res.data?.observaciones_recientes ?? []) : [])
      })
      .catch(() => {
        if (activo) setObservaciones([])
      })
    return () => {
      activo = false
    }
  }, [mascotaNormalizada?.id])

  // Hook para abrir/cerrar modal de comportamiento
  const {
    modalVisible: asistenteVisible,
    openModal: abrirAsistente,
    closeModal: cerrarAsistente,
  } = useComportamientoEditor(mascotaNormalizada)

  // Hook para abrir/cerrar modal de compatibilidad
  const {
    modalVisible: compatibilidadModalVisible,
    openModal: abrirCompatibilidadModal,
    closeModal: cerrarCompatibilidadModal,
  } = useCompatibilidadEditor(mascotaNormalizada)

  // Hooks
  const { slideAnim, opacityAnim, panResponder, isExpanded, cerrar } =
    useAnimacionModal({
      onClose: () => {
        if (cambiosRealizados) {
          // Navegar explícitamente al Tab de Tutor -> Mascotas
          void (navigation as any).navigate('TutorApp', {
            screen: 'Mascotas',
            params: { refresh: Date.now() },
          })
        } else {
          if (navigation.canGoBack()) {
            navigation.goBack()
          } else {
            void (navigation as any).navigate('TutorApp', {
              screen: 'Mascotas',
            })
          }
        }
      },
      onCollapse: () => {
        scrollViewRef.current?.scrollTo({ y: 0, animated: true })
      },
    })

  const {
    mascota,
    loading,
    error,
    isEditMode,
    editedData,
    saving,
    cancelarEdicion,
    guardarCambios,
    cambiarFoto,
    actualizarCampo,
    eliminarMascota,
    cambiosRealizados,
    actualizarMascotaLocal,
  } = useEdicionMascota(mascotaId, mascotaNormalizada)

  const handleEdit = () => {
    // Navegar a pantalla de edición completa
    (navigation as any).navigate('EdicionMascota', {
      mascotaId,
    })
  }

  // Refresco automático cuando volvemos de EdicionMascota
  // Esto asegura que los cambios guardados se reflejen inmediatamente
  useFocusEffect(
    useCallback(() => {
      // El hook useEdicionMascota ya sincroniza via mascotaRealtime
      // Solo aseguramos que está subscrito cuando el componente está visible
    }, [])
  )

  const handlePaseo = async () => {
    if (!mascota) return

    // Si estamos en modo edición, guardar cambios primero
    if (
      isEditMode &&
      (cambiosRealizados || Object.keys(editedData).length > 0)
    ) {
      // Mostrar alerta para que el usuario confirme guardar antes de ir a paseos
      Alert.alert(
        t('comun:atencion'),
        t('mascotas:mensajes.cambios_no_guardados_paseo'),
        [
          {
            text: t('comun:cancelar'),
            style: 'cancel',
          },
          {
            text: t('comun:guardar'),
            onPress: async () => {
              // Guardar y luego navegar
              try {
                await guardarCambios()
                navegarAPaseos()
              } catch (e) {
                console.error('Error guardando cambios:', e)
              }
            },
          },
        ]
      )
    } else {
      // Si no está en edición o no hay cambios, navegar directamente
      navegarAPaseos()
    }
  }

  const navegarAPaseos = () => {
    if (!mascota) return

    const now = Date.now()
    if (now - lastNavTime.current < 1000) return
    lastNavTime.current = now

    // Navegar con pequeño retardo para evitar conflictos con gestos/animaciones
    setTimeout(() => {
      try {
        // Navegar al Tab Paseos y abrir modal con forzado de mascota inicial
        void (navigation as any).navigate('Paseos', {
          abrirSolicitar: true,
          mascotaId: mascota.id,
          forzarMascotaInicial: true,
        })
      } catch (e) {
        console.warn('Error navegando a Paseos:', e)
      }
    }, 30)
  }

  return (
    <View style={styles.container}>
      {/* Backdrop con cierre al tocar */}
      <Animated.View style={[styles.backdrop, { opacity: opacityAnim }]}>
        <Pressable
          style={styles.backdropPress}
          onPress={() => {
            // Evitar múltiples toques rápidos
            if (Date.now() - lastNavTime.current < 1000) return
            lastNavTime.current = Date.now()
            cerrar()
          }}
        />
      </Animated.View>

      {/* Bottom Sheet */}
      <Animated.View
        style={[styles.sheet, { transform: [{ translateY: slideAnim }] }]}
      >
        <View {...panResponder.panHandlers} style={styles.handleArea}>
          <View style={styles.handle} />
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLOR.PRIMARIO} />
          </View>
        ) : error || !mascota ? (
          <View style={styles.errorContainer}>
            <Icon name="exclamation-circle" size={48} color={COLOR.ERROR} />
            <Text style={styles.errorText}>
              {error || ERR.MASCOTAS.MASCOTA_NO_ENCONTRADA}
            </Text>
            <Button
              title={t('comun:cerrar')}
              onPress={cerrar}
              variant="secundario"
            />
          </View>
        ) : (
          <ScrollView
            ref={scrollViewRef}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            scrollEnabled={isExpanded}
          >
            {/* Imagen Hero */}
            <HeroMascota
              foto={isEditMode ? editedData.foto : mascota.foto}
              isEditMode={isEditMode}
              onChangePhoto={cambiarFoto}
              panHandlers={panResponder.panHandlers}
            />

            <View style={styles.contentContainer}>
              {/* Indicador de Completitud */}
              <IndicadorCompletitud
                completitud={calcularCompletitud(mascota)}
                size="md"
              />

              {/* Tarjeta Principal */}
              <InfoPrincipalMascota
                mascota={mascota}
                isEditMode={isEditMode}
                editedData={editedData}
                onUpdateField={actualizarCampo}
              />

              {/* Sobre Mí */}
              <SobreMiMascota
                mascota={mascota}
                isEditMode={isEditMode}
                editedData={editedData}
                onUpdateField={actualizarCampo}
              />

              {/* Sección de Comportamiento */}
              <SeccionComportamiento
                mascota={mascota}
                onOpenAsistente={abrirAsistente}
              />

              {/* Sección de Compatibilidad de Paseo */}
              <SeccionCompatibilidad
                mascota={mascota}
                onOpenAssistant={abrirCompatibilidadModal}
              />

              {/* Sección de Salud */}
              <SeccionSalud
                mascota={mascota}
                isEditMode={isEditMode}
                editedData={editedData}
                onUpdateField={actualizarCampo}
              />

              {/* Acciones */}
              <View style={styles.actionsRow}>
                {isEditMode ? (
                  <>
                    <Button
                      title={t('comun:cancelar')}
                      onPress={cancelarEdicion}
                      variant="secundario"
                      style={{ flex: 1, marginRight: 8 }}
                    />
                    <Button
                      title={saving ? t('comun:guardando') : t('comun:guardar')}
                      onPress={guardarCambios}
                      variant="primario"
                      disabled={saving}
                      style={{ flex: 2 }}
                    />
                  </>
                ) : (
                  <>
                    <Button
                      title={t('mascotas:detalle.editar')}
                      onPress={handleEdit}
                      variant="secundario"
                      style={styles.actionButton}
                    />
                    <Button
                      title={t('paseos:lista.programar_btn')}
                      onPress={handlePaseo}
                      variant="primario"
                      style={styles.actionButton}
                    />
                  </>
                )}
              </View>

              {/* Botón Eliminar (Visible solo en modo visualización) */}
              {!isEditMode && (
                <View style={styles.deleteContainer}>
                  <Button
                    title={t('comun:eliminar')}
                    onPress={() => {
                      Alert.alert(
                        t('mascotas:eliminar.titulo', {
                          nombre: mascota.nombre,
                        }),
                        t('mascotas:eliminar.mensaje'),
                        [
                          {
                            text: t('mascotas:eliminar.cancelar'),
                            style: 'cancel',
                          },
                          {
                            text: t('mascotas:eliminar.confirmar'),
                            style: 'destructive',
                            onPress: async () => {
                              // Optimistic UI: Navegamos atrás con refresh
                              // @ts-ignore
                              navigation.navigate('Mascotas', {
                                refresh: Date.now(),
                              })
                              // Ejecutamos la eliminación pero no bloqueamos la UI
                              eliminarMascota()
                            },
                          },
                        ]
                      )
                    }}
                    variant="secundario" // Base transparente/borde
                    style={styles.deleteButton}
                    textStyle={styles.deleteText}
                  />
                </View>
              )}

              {/* Expediente de la mascota: observaciones de cuidadores */}
              {!isEditMode && observaciones && observaciones.length > 0 && (
                <View style={styles.observacionesSeccion}>
                  <Text style={styles.observacionesTitulo}>
                    {t('mascotas:detalle.observaciones_cuidadores')}
                  </Text>
                  {observaciones.map((obs, i) => (
                    <View key={i} style={styles.observacionCard}>
                      <Text style={styles.observacionDetalle}>
                        {t('mascotas:detalle.ritmo', 'Ritmo')}: {obs.ritmo || '—'}{' '}
                        · {t('mascotas:detalle.compania', 'Compañía')}:{' '}
                        {obs.compania || '—'} ·{' '}
                        {t('mascotas:detalle.tolerancia', 'Tolerancia')}:{' '}
                        {obs.tolerancia || '—'}
                      </Text>
                      {obs.comentario ? (
                        <Text style={styles.observacionComentario}>
                          {obs.comentario}
                        </Text>
                      ) : null}
                      <Text style={styles.observacionFirma}>
                        {t('mascotas:detalle.firma_cuidador')}
                      </Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          </ScrollView>
        )}
      </Animated.View>

      {/* Modal Asistente de Comportamiento - Independiente */}
      {mascota && (
        <ModalComportamientoAsistente
          visible={asistenteVisible}
          petName={mascota.nombre}
          mascotaId={mascota.id}
          initialBehaviorData={mascota}
          onClose={cerrarAsistente}
          onCompleted={savedData => {
            // Modal guardó los datos a Firebase y los devuelve
            // Actualizamos el estado local sin query adicional
            actualizarMascotaLocal(savedData)
            cerrarAsistente()
          }}
        />
      )}

      {/* Modal Asistente de Compatibilidad - Independiente */}
      {mascota && (
        <ModalCompatibilidadAsistente
          visible={compatibilidadModalVisible}
          petName={mascota.nombre}
          mascotaId={mascota.id}
          initialCompatibilidadData={mascota}
          onClose={cerrarCompatibilidadModal}
          onCompleted={(savedData: Partial<Mascota>) => {
            // Modal guardó los datos a Firebase y los devuelve
            // Actualizamos el estado local sin query adicional
            actualizarMascotaLocal(savedData)
            cerrarCompatibilidadModal()
          }}
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  backdropPress: {
    flex: 1,
  },
  sheet: {
    backgroundColor: COLOR.BASE,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 10,
    overflow: 'hidden',
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: COLOR.BORDE,
  },
  handleArea: {
    width: '100%',
    height: 36,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 10,
    position: 'absolute',
    zIndex: 20,
    top: 0,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.5)',
    borderRadius: 2,
  },
  loadingContainer: {
    height: 400,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    padding: 40,
    alignItems: 'center',
    gap: 16,
  },
  errorText: {
    fontSize: 16,
    color: COLOR.TEXTO,
    textAlign: 'center',
  },
  scrollContent: {
    paddingBottom: 40,
  },
  contentContainer: {
    paddingHorizontal: 16,
    marginTop: -42,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  actionButton: {
    flex: 1,
  },
  deleteContainer: {
    marginTop: 20,
    alignItems: 'center',
    marginBottom: 16,
  },
  deleteButton: {
    borderColor: COLOR.ERROR,
    backgroundColor: 'transparent',
    borderWidth: 1,
    paddingHorizontal: 30,
    height: 42,
  },
  deleteText: {
    color: COLOR.ERROR,
    fontSize: 14,
  },
  observacionesSeccion: {
    marginTop: 8,
    marginBottom: 8,
  },
  observacionesTitulo: {
    fontSize: 16,
    fontWeight: '700',
    color: COLOR.TEXTO,
    marginBottom: 10,
  },
  observacionCard: {
    backgroundColor: COLOR.SECUNDARIO,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  observacionDetalle: {
    fontSize: 13,
    lineHeight: 18,
    color: COLOR.TEXTO,
    fontWeight: '600',
  },
  observacionComentario: {
    fontSize: 13,
    lineHeight: 18,
    color: COLOR.TEXTO,
    marginTop: 6,
  },
  observacionFirma: {
    fontSize: 11,
    color: COLOR.SUBTEXTO,
    fontStyle: 'italic',
    marginTop: 6,
  },
})

export default DetalleMascota
