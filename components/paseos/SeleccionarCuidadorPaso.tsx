import React, { useRef, useEffect } from 'react'
import {
  StyleSheet,
  View,
  FlatList,
  TouchableOpacity,
  Image,
  Text,
  ActivityIndicator,
  Animated,
  Easing,
  Platform,
} from 'react-native'
import { useTranslation } from 'react-i18next'
import { COLOR } from '@/constants'
import { Button, Icon, Card, BottomSheet, EmptyState } from '@/components/ui'
import Skeleton from '@/components/ui/Skeleton'
import { useSeleccionarCuidador } from '@/hooks/paseos/useSeleccionarCuidador'
import { useDisponibilidadCercana } from '@/hooks/paseos/useDisponibilidadCercana'
import PerroTristeSvg from '@/assets/imgs/undraw/perro_triste_come_periodico.svg'

interface Props {
  cuidadorInicialId?: string | null
  horarioInicial?: { hora_inicio: string; hora_fin: string }
  fecha?: Date | null
  esSolicitudAbiertaInicial?: boolean
  onNext: (
    // eslint-disable-next-line no-unused-vars
    cuidadorId: string | null,
    // eslint-disable-next-line no-unused-vars
    horario?: { hora_inicio: string; hora_fin: string }
  ) => void
  // eslint-disable-next-line no-unused-vars
  onBack: (cuidadorId?: string | null) => void
  // Allow unused name in type to avoid no-unused-vars lint in some toolchains
  // eslint-disable-next-line no-unused-vars
  onChangeFechaSuggested?: (_date: Date) => void
}

export const SeleccionarCuidadorPaso = ({
  cuidadorInicialId,
  horarioInicial: _horarioInicial,
  fecha,
  onNext,
  onBack,
  onChangeFechaSuggested,
  esSolicitudAbiertaInicial = false,
}: Props) => {
  const { t } = useTranslation()
  const initialId = esSolicitudAbiertaInicial
    ? 'SOLICITUD_ABIERTA'
    : cuidadorInicialId
  const {
    cuidadores,
    cargando,
    error,
    cuidadorSeleccionado,
    seleccionarCuidador,
    recargar,
  } = useSeleccionarCuidador(initialId, fecha)

  const [showDisponibilidad, setShowDisponibilidad] = React.useState(false)
  const {
    loading: loadingDisponibilidad,
    fechas: fechasDisponibles,
    recargar: recargarDisponibilidad,
  } = useDisponibilidadCercana({ resultsCount: 6, maxWindowDays: 30 })

  const handleContinuar = () => {
    if (cuidadorSeleccionado === 'SOLICITUD_ABIERTA') {
      // Horario amplio por defecto para solicitud abierta
      onNext(null, { hora_inicio: '05:00', hora_fin: '23:00' })
    } else if (cuidadorSeleccionado) {
      const walker = cuidadores.find(c => c.id === cuidadorSeleccionado)
      onNext(cuidadorSeleccionado, walker?.horario_laboral)
    }
  }

  const handleSelectOpenRequest = () => {
    seleccionarCuidador('SOLICITUD_ABIERTA')
  }

  // Animacion para el modal (fade + slide)
  const modalAnim = useRef(new Animated.Value(0)).current
  useEffect(() => {
    Animated.timing(modalAnim, {
      toValue: showDisponibilidad ? 1 : 0,
      duration: 280,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start()
  }, [showDisponibilidad, modalAnim])

  const ModalAnimatedView: React.FC<any> = ({ children }) => {
    const translateY = modalAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [20, 0],
    })
    return (
      <Animated.View
        style={{
          opacity: modalAnim,
          transform: [{ translateY }],
        }}
      >
        {children}
      </Animated.View>
    )
  }

  const renderOpenRequestCard = () => {
    const isSelected = cuidadorSeleccionado === 'SOLICITUD_ABIERTA'
    return (
      <TouchableOpacity
        style={[
          styles.card,
          styles.openCard,
          isSelected && styles.cardSelected,
        ]}
        onPress={handleSelectOpenRequest}
        activeOpacity={0.8}
      >
        <View style={[styles.avatar, styles.openAvatar]}>
          <Icon name="bullhorn" size={24} color={COLOR.INFO} />
        </View>

        <View style={styles.info}>
          <View style={styles.header}>
            <Text style={[styles.name, { fontWeight: 'bold' }]}>
              {t('paseos:pasos.seleccionar_cuidador.solicitud_abierta_titulo')}
            </Text>
          </View>

          <Text style={styles.description}>
            {t(
              'paseos:pasos.seleccionar_cuidador.solicitud_abierta_desc',
              'Publica tu solicitud para que cualquier cuidador disponible pueda aceptarla.'
            )}
          </Text>
        </View>

        <View style={styles.radio}>
          {isSelected && <View style={styles.radioSelected} />}
        </View>
      </TouchableOpacity>
    )
  }

  const renderItem = ({ item }: { item: any }) => {
    const isSelected = cuidadorSeleccionado === item.id
    // Animated card: scale on press
    const scale = new Animated.Value(1)

    const onPressIn = () => {
      Animated.spring(scale, { toValue: 0.98, useNativeDriver: true }).start()
    }
    const onPressOut = () => {
      Animated.spring(scale, { toValue: 1, useNativeDriver: true }).start()
    }

    const horariosText = (() => {
      const parts = item.horariosEjemplo || []
      if (parts.length === 0) return ''
      const shown = parts.slice(0, 2).join(' · ')
      return parts.length > 2 ? `${shown}…` : shown
    })()

    return (
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() => seleccionarCuidador(item.id)}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        style={{ marginBottom: 8 }}
      >
        <Animated.View
          style={[
            styles.card,
            isSelected && styles.cardSelected,
            { transform: [{ scale }] },
            styles.cardShadow,
          ]}
        >
          <Image
            source={{ uri: item.imagen }}
            style={[styles.avatar, isSelected && styles.avatarSelected]}
          />

          <View style={styles.info}>
            <View style={styles.header}>
              <Text style={[styles.name, { fontWeight: 'bold' }]}>
                {item.nombre}
              </Text>
              {item.insignias.includes('verificado') && (
                <Icon name="check-circle" size={16} color={COLOR.PRIMARIO} />
              )}
            </View>

            <View style={styles.ratingRow}>
              <Icon name="star" size={14} color={COLOR.ENFASIS} />
              <Text style={styles.rating}>
                {typeof item.calificacion === 'number'
                  ? item.calificacion.toFixed(1)
                  : '—'}
              </Text>
              <Text style={styles.distance}>• {item.distancia}</Text>
            </View>

            <Text style={styles.price}>{item.tarifa}</Text>
            {horariosText.length > 0 && (
              <Text style={{ color: COLOR.SUBTEXTO, marginTop: 6 }}>
                {horariosText}
              </Text>
            )}
          </View>

          <View style={{ alignItems: 'flex-end' }}>
            <View style={[styles.radio, { marginTop: 8 }]}>
              {isSelected && <View style={styles.radioSelected} />}
            </View>
          </View>
        </Animated.View>
      </TouchableOpacity>
    )
  }

  const renderError = () => (
    <View style={styles.centerContent}>
      <Icon name="exclamation-circle" size={48} color={COLOR.ERROR} />
      <Text style={styles.errorText}>
        {t('paseos:pasos.seleccionar_cuidador.error')}
      </Text>
      <Button
        title={t('comun:reintentar')}
        variant="bloque"
        onPress={recargar}
        style={{ marginTop: 16 }}
      />
    </View>
  )

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>
          {t('paseos:pasos.seleccionar_cuidador.titulo')}
        </Text>

        {renderOpenRequestCard()}

        {!error && (
          <Text style={styles.subtitle}>
            {t('paseos:pasos.seleccionar_cuidador.lista_titulo')}
          </Text>
        )}

        {cargando ? (
          <View style={{ marginTop: 8 }}>
            {Array.from({ length: 2 }).map((_, i) => (
              <View
                key={i}
                style={[
                  styles.card,
                  { marginBottom: 12, minHeight: 76, alignItems: 'center' },
                ]}
              >
                <Skeleton
                  circle
                  height={60}
                  width={60}
                  style={{ marginRight: 12 }}
                />
                <View style={{ flex: 1, justifyContent: 'center' }}>
                  <Skeleton
                    width={'60%'}
                    height={16}
                    style={{ marginBottom: 8 }}
                  />
                  <Skeleton width={'40%'} height={12} />
                </View>
              </View>
            ))}
          </View>
        ) : error ? (
          renderError()
        ) : cuidadores.length === 0 ? (
          <EmptyState
            image={<PerroTristeSvg width={100} height={100} />}
            title={t('paseos:pasos.seleccionar_cuidador.sin_cuidadores')}
            description={t(
              'paseos:pasos.seleccionar_cuidador.sin_cuidadores_desc'
            )}
            actionLabel={t(
              'paseos:pasos.seleccionar_cuidador.ver_horarios_cercanos'
            )}
            onActionPress={() => {
              recargarDisponibilidad()
              setShowDisponibilidad(true)
            }}
            style={{
              flex: 0,
              paddingVertical: 0,
              paddingTop: 8,
              paddingBottom: 12,
            }}
          />
        ) : (
          <FlatList
            data={cuidadores}
            renderItem={renderItem}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.listContent}
            style={styles.list}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>
      <View style={styles.actions}>
        <Button
          title={t('comun:atras')}
          variant="bloque"
          onPress={() => onBack(cuidadorSeleccionado)}
          style={{ flex: 1 }}
        />
        <Button
          title={t('comun:continuar')}
          variant="primario"
          onPress={handleContinuar}
          disabled={!cuidadorSeleccionado || cargando}
          style={{ flex: 1 }}
        />
      </View>

      <BottomSheet
        visible={showDisponibilidad}
        onClose={() => setShowDisponibilidad(false)}
        height="auto"
      >
        <ModalAnimatedView>
          <View style={{ paddingBottom: 96 }}>
            <View style={{ marginBottom: 8, paddingVertical: 8 }}>
              <Text
                style={{
                  fontSize: 18,
                  fontWeight: '700',
                  textAlign: 'center',
                  color: COLOR.TEXTO,
                }}
              >
                {t(
                  'paseos:pasos.seleccionar_cuidador.fechas_disponibles_titulo'
                )}
              </Text>
            </View>

            {loadingDisponibilidad ? (
              <View style={{ padding: 20 }}>
                <ActivityIndicator size="large" color={COLOR.PRIMARIO} />
              </View>
            ) : fechasDisponibles.length === 0 ? (
              <EmptyState
                image={<PerroTristeSvg width={100} height={100} />}
                title={t(
                  'paseos:pasos.seleccionar_cuidador.no_encontrado_30dias'
                )}
                description={t(
                  'paseos:pasos.seleccionar_cuidador.opciones_explicacion'
                )}
                actionLabel={t(
                  'paseos:pasos.seleccionar_cuidador.publicar_solicitud_abierta'
                )}
                onActionPress={() => {
                  seleccionarCuidador('SOLICITUD_ABIERTA')
                  setShowDisponibilidad(false)
                  // Avanzar directamente al siguiente paso con horario amplio
                  onNext(null, { hora_inicio: '05:00', hora_fin: '23:00' })
                }}
                style={{ flex: 0, paddingVertical: 20, paddingBottom: 40 }}
              />
            ) : (
              <View style={{ marginTop: 8 }}>
                {fechasDisponibles.slice(0, 6).map(item => (
                  <TouchableOpacity
                    key={item.fecha.toISOString()}
                    activeOpacity={0.9}
                    onPress={() => {
                      onChangeFechaSuggested?.(item.fecha)
                      setShowDisponibilidad(false)
                    }}
                  >
                    <Card
                      style={{
                        marginBottom: 10,
                        borderWidth: 0,
                        borderRadius: 14,
                        padding: 12,
                        backgroundColor: COLOR.BLOQUE,
                      }}
                    >
                      <View
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 12,
                        }}
                      >
                        <View style={{ flex: 1 }}>
                          <Text
                            style={{
                              fontSize: 16,
                              fontWeight: '700',
                              color: COLOR.TEXTO,
                            }}
                          >
                            {item.fecha.toLocaleDateString(undefined, {
                              weekday: 'short',
                              month: 'short',
                              day: 'numeric',
                            })}
                          </Text>
                          <Text style={{ color: COLOR.SUBTEXTO, marginTop: 4 }}>
                            {t(
                              'paseos:pasos.seleccionar_cuidador.disponibles_para_fecha',
                              { count: item.count }
                            )}
                          </Text>
                          {item.horariosEjemplo.length > 0 && (
                            <Text
                              style={{ color: COLOR.SUBTEXTO, marginTop: 6 }}
                            >
                              {item.horariosEjemplo.join(' · ')}
                            </Text>
                          )}
                        </View>
                        <Icon
                          name="chevron-right"
                          size={20}
                          color={COLOR.BORDE}
                        />
                      </View>
                    </Card>
                  </TouchableOpacity>
                ))}

                <View style={{ marginTop: 12, flexDirection: 'row', gap: 12 }}>
                  <Button
                    title={t(
                      'paseos:pasos.seleccionar_cuidador.publicar_solicitud_abierta'
                    )}
                    variant="primario"
                    onPress={() => {
                      seleccionarCuidador('SOLICITUD_ABIERTA')
                      setShowDisponibilidad(false)
                      if (fecha) {
                        // avanzar directamente si la fecha se mantiene
                        onNext(null, {
                          hora_inicio: '05:00',
                          hora_fin: '23:00',
                        })
                      }
                    }}
                    style={{ flex: 1 }}
                  />

                  <Button
                    title={t(
                      'paseos:pasos.seleccionar_cuidador.recibir_notificacion'
                    )}
                    variant="bloque"
                    onPress={() => setShowDisponibilidad(false)}
                    style={{ flex: 1 }}
                  />
                </View>
              </View>
            )}
          </View>

          <View style={styles.modalFooter}>
            <Button
              title={t('comun:cerrar')}
              variant="bloque"
              onPress={() => setShowDisponibilidad(false)}
            />
          </View>
        </ModalAnimatedView>
      </BottomSheet>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    height: 600,
  },
  list: {
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: COLOR.TEXTO,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: COLOR.SUBTEXTO,
    marginBottom: 16,
  },
  listContent: {
    paddingBottom: 20,
    gap: 12,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: COLOR.BLOQUE,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLOR.BORDE,
  },
  openCard: {
    marginTop: 8,
    marginBottom: 16,
    backgroundColor: COLOR.SECUNDARIO,
    borderColor: COLOR.INFO,
    borderStyle: 'dashed',
  },
  cardSelected: {
    borderColor: COLOR.PRIMARIO,
    borderWidth: 1,
    backgroundColor: COLOR.BLOQUE,
    borderStyle: 'solid',
  },
  avatarSelected: {
    borderColor: COLOR.PRIMARIO,
    borderWidth: 1,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 12,
    backgroundColor: COLOR.BORDE,
  },
  openAvatar: {
    backgroundColor: 'rgba(42, 134, 168, 0.2)', // COLOR.INFO con opacidad
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLOR.INFO,
  },
  info: {
    flex: 1,
    justifyContent: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  name: {
    fontSize: 16,
    color: COLOR.TEXTO,
  },
  description: {
    fontSize: 12,
    color: COLOR.SUBTEXTO,
    lineHeight: 16,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  rating: {
    fontSize: 14,
    color: COLOR.TEXTO,
    fontWeight: 'bold',
  },
  distance: {
    fontSize: 12,
    color: COLOR.SUBTEXTO,
  },
  price: {
    fontSize: 14,
    color: COLOR.PRIMARIO,
    fontWeight: '600',
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: COLOR.BORDE,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  radioSelected: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLOR.PRIMARIO,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    color: COLOR.SUBTEXTO,
  },
  errorText: {
    marginTop: 12,
    color: COLOR.ERROR,
    textAlign: 'center',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 40,
  },
  emptyImage: {
    width: 200,
    height: 200,
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLOR.TEXTO,
    textAlign: 'center',
    marginBottom: 12,
  },
  emptyDescription: {
    fontSize: 15,
    color: COLOR.SUBTEXTO,
    textAlign: 'center',
    lineHeight: 22,
  },
  modalEmptyState: {
    paddingVertical: 32,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  modalEmptyIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: `${COLOR.PRIMARIO}15`,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalEmptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLOR.TEXTO,
    textAlign: 'center',
    marginBottom: 20,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLOR.TEXTO,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    color: COLOR.SUBTEXTO,
    textAlign: 'center',
  },
  iconWrapper: {
    marginBottom: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actions: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 16,
    flexDirection: 'row',
    gap: 12,
  },
  content: {
    paddingBottom: 96,
    flex: 1,
  },
  cardShadow: Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 6,
    },
    android: {
      elevation: 2,
    },
    default: {},
  }),
  skeletonCard: {
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderColor: 'rgba(255,255,255,0.03)',
  },
  skeletonBlock: {
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  skeletonRow: {
    height: 12,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 6,
  },
  modalFooter: {
    position: 'absolute',
    left: 20,
    right: 20,
    bottom: 20,
  },
  countBadge: {
    backgroundColor: COLOR.PRIMARIO,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
})
