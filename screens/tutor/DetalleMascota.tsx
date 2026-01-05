import React, { useRef, useMemo } from 'react'
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
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native'
import { COLOR, ERR } from '@/constants'
import Button from '@/components/ui/Button'
import Icon from '@/components/ui/Icon'
import { AuthStackParamList } from '@/navigation/types'
import type { Mascota } from '@/models/Mascota'

// Hooks
import { useAnimacionModal } from '@/hooks/useAnimacionModal'
import { useEdicionMascota } from '@/hooks/useEdicionMascota'

// Components
import { HeroMascota } from '@/components/mascota/HeroMascota'
import { InfoPrincipalMascota } from '@/components/mascota/InfoPrincipalMascota'
import { DetalleInfoMascota } from '@/components/mascota/DetalleInfoMascota'
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

  // Hooks
  const { slideAnim, opacityAnim, panResponder, isExpanded, expandir, cerrar } =
    useAnimacionModal({
      onClose: () => {
        if (cambiosRealizados) {
          // Navegar explícitamente al Tab de Tutor -> Mascotas
          ;(navigation as any).navigate('TutorApp', {
            screen: 'Mascotas',
            params: { refresh: Date.now() },
          })
        } else {
          if (navigation.canGoBack()) {
            navigation.goBack()
          } else {
            ;(navigation as any).navigate('TutorApp', { screen: 'Mascotas' })
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
    iniciarEdicion,
    cancelarEdicion,
    guardarCambios,
    cambiarFoto,
    actualizarCampo,
    eliminarMascota,
    cambiosRealizados,
  } = useEdicionMascota(mascotaId, mascotaNormalizada)

  const handleEdit = () => {
    iniciarEdicion()
    if (!isExpanded) {
      expandir()
    }
  }

  const handlePaseo = () => {
    if (mascota) {
      Alert.alert(
        t('paseos:ui.iniciar.titulo'),
        t('paseos:ui.iniciar.mensaje', { nombre: mascota.nombre })
      )
    }
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
            <Icon name="alert-circle" size={48} color={COLOR.ERROR} />
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
              {/* Tarjeta Principal */}
              <InfoPrincipalMascota
                mascota={mascota}
                isEditMode={isEditMode}
                editedData={editedData}
                onUpdateField={actualizarCampo}
              />

              {/* Sobre Mí (Reubicado) */}
              <SobreMiMascota
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

              {/* Información Detallada */}
              <DetalleInfoMascota mascota={mascota} />

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
            </View>
          </ScrollView>
        )}
      </Animated.View>
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
    height: 40,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 12,
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
    paddingBottom: 60,
  },
  contentContainer: {
    paddingHorizontal: 21,
    marginTop: -42,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  actionButton: {
    flex: 1,
  },
  deleteContainer: {
    marginTop: 30,
    alignItems: 'center',
    marginBottom: 21,
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
})

export default DetalleMascota
