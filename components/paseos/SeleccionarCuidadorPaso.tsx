import React, { useRef, useEffect, useState } from 'react'
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
  Alert,
} from 'react-native'
import { useTranslation } from 'react-i18next'
import { COLOR } from '@/constants'
import { Button, Icon, Card, BottomSheet, EmptyState } from '@/components/ui'
import Skeleton from '@/components/ui/Skeleton'
import {
  useSeleccionarCuidador,
  type CuidadorListItem,
  calcularPropuestasCoordinacion,
  type PropuestaCoordinacion,
} from '@/hooks/paseos/useSeleccionarCuidador'
import { useDisponibilidadCercana } from '@/hooks/paseos/useDisponibilidadCercana'
import { MatchingDebugOverlay } from '@/components/dev/MatchingDebugOverlay'
import { ModalPerfilCuidador } from '@/components/cuidador'
import { GestorPerfilPublico } from '@/logic/usuarios/perfilPublico'
import type { PerfilPublico } from '@/models/PerfilPublico'
import PerroTristeSvg from '@/assets/imgs/undraw/perro_triste_come_periodico.svg'

interface Props {
  cuidadorInicialId?: string | null
  horarioInicial?: { hora_inicio: string; hora_fin: string }
  fecha?: Date | null
  hora?: string | null
  duracion?: number | null
  coordenadas?: { latitude: number; longitude: number } // ← Coordenadas de la dirección seleccionada
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
  hora,
  duracion,
  coordenadas,
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
    debugMatching,
  } = useSeleccionarCuidador(initialId, fecha, hora, duracion, coordenadas)

  const [showDisponibilidad, setShowDisponibilidad] = React.useState(false)
  const [showDebugMatching, setShowDebugMatching] = useState(
    process.env.NODE_ENV === 'development' // Auto-show en desarrollo
  )
  const [mostrarPerfilModal, setMostrarPerfilModal] = useState(false)
  const [perfilSeleccionado, setPerfilSeleccionado] =
    useState<PerfilPublico | null>(null)
  const [cargandoPerfil, setCargandoPerfil] = useState(false)
  // Modal de coordinación cuando selecciona cuidador alternativo
  const [mostrarCoordinacion, setMostrarCoordinacion] = useState(false)
  const [cuidadorCoordinacion, setCuidadorCoordinacion] =
    useState<CuidadorListItem | null>(null)
  // Estado para propuestas de coordinación (usado en cálculos internos, no en render)
  const [_propuestasCoordinacion, _setPropuestasCoordinacion] = useState<
    PropuestaCoordinacion[]
  >([])
  const [propuestaSeleccionada, setPropuestaSeleccionada] =
    useState<PropuestaCoordinacion | null>(null)
  // Franjas disponibles explícitas del cuidador (para seleccionar cualquier franja)
  const [franjasCuidador, setFranjasCuidador] = useState<
    Array<{ inicio: string; fin: string }>
  >([])
  const {
    loading: loadingDisponibilidad,
    fechas: fechasDisponibles,
    recargar: recargarDisponibilidad,
  } = useDisponibilidadCercana({ resultsCount: 6, maxWindowDays: 30 })

  // Separar cuidadores por estado para renderizar en dos secciones
  const cuidadoresDisponibles = cuidadores.filter(
    c => c.estado === 'disponible'
  )
  const cuidadoresAlternativos = cuidadores.filter(
    c => c.estado !== 'disponible'
  )

  const handleContinuar = () => {
    if (cuidadorSeleccionado === 'SOLICITUD_ABIERTA') {
      // Horario amplio por defecto para solicitud abierta
      onNext(null, { hora_inicio: '05:00', hora_fin: '23:00' })
    } else if (cuidadorSeleccionado) {
      const selectedCuidador = cuidadores.find(
        c => c.id === cuidadorSeleccionado
      )
      if (selectedCuidador?.estado === 'disponible') {
        onNext(cuidadorSeleccionado)
      } else if (selectedCuidador) {
        // Para cuidadores alternativos: abrir modal de coordinación
        setCuidadorCoordinacion(selectedCuidador)
        setMostrarCoordinacion(true)
      }
    }
  }

  const handleSelectOpenRequest = () => {
    seleccionarCuidador('SOLICITUD_ABIERTA')
  }

  const handleVerPerfil = async (cuidadorId: string) => {
    setCargandoPerfil(true)
    try {
      const resultado = await GestorPerfilPublico.obtenerPorId(cuidadorId)
      if (resultado.success && resultado.data) {
        setPerfilSeleccionado(resultado.data)
        setMostrarPerfilModal(true)
      } else {
        Alert.alert(
          t('comun:error'),
          t('paseos:pasos.seleccionar_cuidador.error_cargar_perfil')
        )
      }
    } catch (err) {
      console.error('Error cargando perfil:', err)
      Alert.alert(
        t('comun:error'),
        t('paseos:pasos.seleccionar_cuidador.error_cargar_perfil')
      )
    } finally {
      setCargandoPerfil(false)
    }
  }

  const handleCerrarPerfil = () => {
    setMostrarPerfilModal(false)
    setPerfilSeleccionado(null)
  }

  /**
   * Calcula y guarda las propuestas de coordinación.
   */
  const calcularPropuestas = (perfil: PerfilPublico) => {
    if (!fecha || !hora || !duracion) return []

    const propuestas = calcularPropuestasCoordinacion(perfil, {
      fecha,
      hora,
      duracion,
    })

    _setPropuestasCoordinacion(propuestas)

    // Pre-seleccionar la primera propuesta
    if (propuestas.length > 0) {
      setPropuestaSeleccionada(propuestas[0])
    }

    return propuestas
  }

  /**
   * Confirma la coordinación y continúa con el nuevo horario.
   */
  const handleConfirmarCoordinacion = () => {
    if (cuidadorCoordinacion && propuestaSeleccionada && fecha) {
      // Actualizar la fecha si es diferente
      if (propuestaSeleccionada.fecha.toDateString() !== fecha.toDateString()) {
        onChangeFechaSuggested?.(propuestaSeleccionada.fecha)
      }

      onNext(cuidadorCoordinacion.id, {
        hora_inicio: propuestaSeleccionada.hora_inicio,
        hora_fin: propuestaSeleccionada.hora_fin,
      })

      // Limpiar estado
      setMostrarCoordinacion(false)
      setCuidadorCoordinacion(null)
      _setPropuestasCoordinacion([])
      setPropuestaSeleccionada(null)
    }
  }

  /**
   * Cancela la coordinación y vuelve a la lista de cuidadores.
   */
  const handleCancelarCoordinacion = () => {
    setMostrarCoordinacion(false)
    setCuidadorCoordinacion(null)
    _setPropuestasCoordinacion([])
    setPropuestaSeleccionada(null)
    seleccionarCuidador(null)
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

  // Cargar perfil y calcular propuestas cuando abre el modal de coordinación
  useEffect(() => {
    const cargarPerfilYPropuestas = async () => {
      if (mostrarCoordinacion && cuidadorCoordinacion) {
        setCargandoPerfil(true)
        try {
          const resultado = await GestorPerfilPublico.obtenerPorId(
            cuidadorCoordinacion.id
          )
          if (resultado.success && resultado.data) {
            setPerfilSeleccionado(resultado.data)
            // Calcular propuestas de coordinación
            calcularPropuestas(resultado.data)
            // Extraer franjas del perfil para el día solicitado (si hay fecha)
            try {
              const dayKey = fecha
                ? fecha.getDay().toString()
                : new Date().getDay().toString()
              const franja = resultado.data.horario_semanal?.[dayKey]
              if (franja) {
                setFranjasCuidador([{ inicio: franja.inicio, fin: franja.fin }])
              } else {
                setFranjasCuidador([])
              }
            } catch (_err) {
              setFranjasCuidador([])
            }
          } else {
            Alert.alert(
              t('comun:error'),
              t(
                'paseos:pasos.seleccionar_cuidador.error_cargar_perfil',
                'No se pudo cargar el perfil del cuidador'
              )
            )
          }
        } catch (err) {
          console.error('Error cargando perfil para coordinación:', err)
          Alert.alert(
            t('comun:error'),
            t('paseos:pasos.seleccionar_cuidador.error_cargar_perfil')
          )
        } finally {
          setCargandoPerfil(false)
        }
      }
    }

    cargarPerfilYPropuestas()
  }, [mostrarCoordinacion, cuidadorCoordinacion])

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

    const isAlternativo = item.estado !== 'disponible'
    const horariosText = (() => {
      if (isAlternativo && item.motivo) {
        return item.motivo
      }
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
            isAlternativo && styles.cardAlternativo,
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
              <Text
                style={[
                  { marginTop: 6 },
                  isAlternativo
                    ? styles.motivoAlternativo
                    : { color: COLOR.SUBTEXTO },
                ]}
              >
                {horariosText}
              </Text>
            )}
          </View>

          <View style={{ alignItems: 'flex-end', gap: 8 }}>
            <TouchableOpacity
              style={styles.infoButton}
              onPress={e => {
                e.stopPropagation()
                handleVerPerfil(item.id)
              }}
              disabled={cargandoPerfil}
              accessibilityLabel={t(
                'paseos:pasos.seleccionar_cuidador.ver_perfil_cuidador'
              )}
              accessibilityHint={t(
                'paseos:pasos.seleccionar_cuidador.ver_perfil_hint'
              )}
            >
              <Icon name="info-circle" size={20} color={COLOR.PRIMARIO} />
            </TouchableOpacity>
            <View style={[styles.radio, { marginTop: 4 }]}>
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
        onPress={recargarDisponibilidad}
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

        {/* Horario solicitado pequeño */}
        {fecha && hora && duracion && (
          <View style={styles.horarioSolicitadoBadge}>
            <Text style={styles.horarioSolicitadoLabel}>
              {t(
                'paseos:pasos.seleccionar_cuidador.horario_solicitado',
                'Horario solicitado'
              )}
            </Text>
            <Text style={styles.horarioSolicitadoTime}>
              {hora} • {duracion}m
            </Text>
          </View>
        )}

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
            data={
              [
                // SECCIÓN 1: Disponibles ahora
                ...(cuidadoresDisponibles.length > 0
                  ? [
                      {
                        id: '__HEADER_DISPONIBLES__',
                        isHeader: true,
                        titulo: t(
                          'paseos:pasos.seleccionar_cuidador.seccion_disponibles',
                          'Disponibles ahora'
                        ),
                        subtitulo: t(
                          'paseos:pasos.seleccionar_cuidador.seccion_disponibles_desc',
                          'Pueden aceptar tu paseo en el horario solicitado.'
                        ),
                      },
                    ]
                  : []),
                ...cuidadoresDisponibles,

                // SECCIÓN 2: Otros cuidadores
                ...(cuidadoresAlternativos.length > 0
                  ? [
                      {
                        id: '__HEADER_ALTERNATIVOS__',
                        isHeader: true,
                        titulo: t(
                          'paseos:pasos.seleccionar_cuidador.seccion_otros',
                          'Otros cuidadores en tu zona'
                        ),
                        subtitulo: t(
                          'paseos:pasos.seleccionar_cuidador.seccion_otros_desc',
                          'También forman parte de la comunidad, aunque no están disponibles en este horario.'
                        ),
                      },
                    ]
                  : []),
                ...cuidadoresAlternativos,

                // FOOTER: Mensaje de ayuda
                ...(cuidadoresAlternativos.length > 0
                  ? [
                      {
                        id: '__FOOTER_AYUDA__',
                        isFooter: true,
                        mensaje: t(
                          'paseos:pasos.seleccionar_cuidador.footer_ayuda',
                          '¿Ningún horario te funciona? Puedes ajustar la hora después de elegir un cuidador.'
                        ),
                      },
                    ]
                  : []),
              ] as any
            }
            renderItem={({ item }) => {
              if (item.isHeader) {
                return (
                  <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitulo}>{item.titulo}</Text>
                    <Text style={styles.sectionSubtitulo}>
                      {item.subtitulo}
                    </Text>
                  </View>
                )
              }
              if (item.isFooter) {
                return (
                  <View style={styles.footerAyuda}>
                    <Text style={styles.footerTexto}>{item.mensaje}</Text>
                  </View>
                )
              }
              return renderItem({ item })
            }}
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

      {/* Debug Overlay - Visible siempre en desarrollo */}
      <MatchingDebugOverlay
        isVisible={showDebugMatching}
        debugMatching={debugMatching}
        onClose={() => setShowDebugMatching(false)}
        cargando={cargando}
      />

      {/* Modal de Acuerdo: Versión con confianza y mejor uso de colores */}
      <BottomSheet
        visible={mostrarCoordinacion}
        onClose={handleCancelarCoordinacion}
      >
        <View style={{ padding: 16, gap: 14 }}>
          {cargandoPerfil ? (
            <ActivityIndicator
              size="large"
              color={COLOR.PRIMARIO}
              style={{ marginVertical: 40 }}
            />
          ) : propuestaSeleccionada ? (
            <>
              {/* HEADER: Título + Nombre del Cuidador (con confianza visual) */}
              <View style={{ gap: 6 }}>
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: '700',
                    color: COLOR.EXITO,
                    textTransform: 'uppercase',
                    letterSpacing: 0.5,
                  }}
                >
                  {t(
                    'paseos:pasos.seleccionar_cuidador.msg_confianza_titulo',
                    '¡Conexión posible!'
                  )}
                </Text>
                {cuidadorCoordinacion && (
                  <View style={{ gap: 2 }}>
                    <Text
                      style={{
                        fontSize: 20,
                        fontWeight: '800',
                        color: COLOR.TEXTO,
                      }}
                    >
                      {cuidadorCoordinacion.nombre}
                    </Text>
                    <Text style={{ fontSize: 13, color: COLOR.SUBTEXTO }}>
                      ⭐ {cuidadorCoordinacion.calificacion} •{' '}
                      {cuidadorCoordinacion.distancia}
                    </Text>
                  </View>
                )}
              </View>

              {/* MOMENTO SUGERIDO: Destacado como recomendación de confianza */}
              {propuestaSeleccionada && (
                <View
                  style={{
                    backgroundColor: `${COLOR.EXITO}15`,
                    borderLeftWidth: 4,
                    borderLeftColor: COLOR.EXITO,
                    padding: 12,
                    borderRadius: 8,
                    gap: 8,
                  }}
                >
                  <View style={{ gap: 2 }}>
                    <Text
                      style={{
                        fontSize: 11,
                        fontWeight: '700',
                        color: COLOR.EXITO,
                        textTransform: 'uppercase',
                        letterSpacing: 0.5,
                      }}
                    >
                      📅 Momento Recomendado
                    </Text>
                    <Text
                      style={{
                        fontSize: 20,
                        fontWeight: '800',
                        color: COLOR.TEXTO,
                      }}
                    >
                      {propuestaSeleccionada.hora_inicio} –{' '}
                      {propuestaSeleccionada.hora_fin}
                    </Text>
                  </View>
                  <Text
                    style={{
                      fontSize: 12,
                      color: COLOR.SUBTEXTO,
                      fontStyle: 'italic',
                    }}
                  >
                    {propuestaSeleccionada.diferencial}
                  </Text>
                </View>
              )}

              {/* MENSAJE DE CONFIANZA: Transmite seguridad en el proceso */}
              {cuidadorCoordinacion && (
                <View style={{ gap: 10 }}>
                  <Text
                    style={{
                      fontSize: 13,
                      color: COLOR.TEXTO,
                      lineHeight: 18,
                      fontWeight: '500',
                    }}
                  >
                    {t(
                      'paseos:pasos.seleccionar_cuidador.msg_confianza',
                      'Hemos verificado que ambos pueden conectar en este momento. Es lo mejor para que {{nombre}} cuide a tu mascota sin interrupciones.'
                    ).replace('{{nombre}}', cuidadorCoordinacion.nombre)}
                  </Text>
                  <View
                    style={{
                      flexDirection: 'row',
                      gap: 10,
                      padding: 10,
                      backgroundColor: `${COLOR.PRIMARIO}10`,
                      borderLeftWidth: 3,
                      borderLeftColor: COLOR.PRIMARIO,
                      borderRadius: 6,
                      alignItems: 'flex-start',
                    }}
                  >
                    <Text style={{ fontSize: 14, marginTop: 0 }}>🛡️</Text>
                    <Text
                      style={{
                        fontSize: 12,
                        color: COLOR.TEXTO,
                        flex: 1,
                        lineHeight: 16,
                        fontWeight: '500',
                      }}
                    >
                      {t(
                        'paseos:pasos.seleccionar_cuidador.msg_seguridad',
                        'Si algo cambia, ajusta en cualquier momento. Tu mascota está protegida en cada paso.'
                      )}
                    </Text>
                  </View>
                </View>
              )}

              {/* Selector de franjas explícitas del cuidador */}
              {franjasCuidador.length > 0 && (
                <View style={{ marginTop: 8, gap: 8 }}>
                  <Text style={{ fontSize: 13, color: COLOR.SUBTEXTO }}>
                    {t(
                      'paseos:pasos.seleccionar_cuidador.otras_franjas',
                      'Otras franjas dentro de la disponibilidad de este cuidador:'
                    )}
                  </Text>
                  {franjasCuidador.map((f, idx) => (
                    <TouchableOpacity
                      key={idx}
                      style={{
                        padding: 10,
                        backgroundColor: COLOR.SECUNDARIO,
                        borderRadius: 8,
                      }}
                      onPress={() => {
                        // Seleccionar esta franja como propuesta
                        const nueva: PropuestaCoordinacion = {
                          fecha: fecha || new Date(),
                          hora_inicio: f.inicio,
                          hora_fin: f.fin,
                          diferencial: 'Franja seleccionada manualmente',
                          prioridad: 'media',
                        }
                        setPropuestaSeleccionada(nueva)
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 15,
                          fontWeight: '700',
                          color: COLOR.TEXTO,
                        }}
                      >
                        {f.inicio} – {f.fin}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {/* BOTONES: Decisión clara y confiada */}
              <View style={{ gap: 8, marginTop: 8 }}>
                <Button
                  title={t(
                    'paseos:pasos.seleccionar_cuidador.btn_confirmar_momento',
                    'Confirmar con {{nombre}}'
                  ).replace(
                    '{{nombre}}',
                    cuidadorCoordinacion?.nombre || 'este cuidador'
                  )}
                  disabled={!propuestaSeleccionada || cargandoPerfil}
                  onPress={handleConfirmarCoordinacion}
                />
                <Button
                  title={t(
                    'paseos:pasos.seleccionar_cuidador.buscar_otro_horario',
                    'Intentar otro horario'
                  )}
                  variant="bloque"
                  onPress={() => {
                    // Volver al paso "Seleccionar Fecha" para cambiar horario
                    onBack()
                    // cerrar modal y limpiar selección local
                    setMostrarCoordinacion(false)
                    setCuidadorCoordinacion(null)
                    _setPropuestasCoordinacion([])
                    setPropuestaSeleccionada(null)
                  }}
                />
              </View>
            </>
          ) : (
            <>
              {/* SIN PROPUESTAS: Mensaje empático con opciones */}
              <View
                style={{ gap: 4, alignItems: 'center', paddingVertical: 12 }}
              >
                <Text style={{ fontSize: 14, marginBottom: 8 }}>⏰</Text>
                <Text
                  style={{
                    fontSize: 16,
                    fontWeight: '700',
                    color: COLOR.TEXTO,
                    textAlign: 'center',
                    marginBottom: 8,
                  }}
                >
                  {cuidadorCoordinacion?.nombre} no tiene disponibilidad
                </Text>
                <Text
                  style={{
                    fontSize: 13,
                    color: COLOR.SUBTEXTO,
                    textAlign: 'center',
                    lineHeight: 18,
                    marginBottom: 12,
                  }}
                >
                  {hora && duracion
                    ? `No puede hacer un paseo de ${duracion} minutos a partir de las ${hora}. Pero tienes opciones:`
                    : 'No disponible para este horario.'}
                </Text>

                {/* Opciones */}
                <View
                  style={{
                    width: '100%',
                    gap: 8,
                    paddingHorizontal: 8,
                  }}
                >
                  <View
                    style={{
                      backgroundColor: `${COLOR.ALERTA}10`,
                      borderLeftWidth: 3,
                      borderLeftColor: COLOR.ALERTA,
                      padding: 10,
                      borderRadius: 6,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 12,
                        fontWeight: '600',
                        color: COLOR.ALERTA,
                        marginBottom: 2,
                      }}
                    >
                      📋 Opción 1:
                    </Text>
                    <Text style={{ fontSize: 12, color: COLOR.TEXTO }}>
                      Ajusta la hora más temprano hoy
                    </Text>
                  </View>

                  <View
                    style={{
                      backgroundColor: `${COLOR.INFO}10`,
                      borderLeftWidth: 3,
                      borderLeftColor: COLOR.INFO,
                      padding: 10,
                      borderRadius: 6,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 12,
                        fontWeight: '600',
                        color: COLOR.INFO,
                        marginBottom: 2,
                      }}
                    >
                      📅 Opción 2:
                    </Text>
                    <Text style={{ fontSize: 12, color: COLOR.TEXTO }}>
                      Intenta mañana o próximos días
                    </Text>
                  </View>

                  <View
                    style={{
                      backgroundColor: `${COLOR.PRIMARIO}10`,
                      borderLeftWidth: 3,
                      borderLeftColor: COLOR.PRIMARIO,
                      padding: 10,
                      borderRadius: 6,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 12,
                        fontWeight: '600',
                        color: COLOR.PRIMARIO,
                        marginBottom: 2,
                      }}
                    >
                      👥 Opción 3:
                    </Text>
                    <Text style={{ fontSize: 12, color: COLOR.TEXTO }}>
                      Elige otro cuidador de la zona
                    </Text>
                  </View>
                </View>
              </View>

              {/* BOTONES: Acciones claras */}
              <View style={{ gap: 8, marginTop: 12 }}>
                <Button
                  title="Ajustar hora y reintentar"
                  onPress={handleCancelarCoordinacion}
                />
                <Button
                  title="Volver a la lista"
                  variant="bloque"
                  onPress={handleCancelarCoordinacion}
                />
              </View>
            </>
          )}
        </View>
      </BottomSheet>

      {/* Modal de Perfil del Cuidador */}
      <ModalPerfilCuidador
        visible={mostrarPerfilModal}
        perfil={perfilSeleccionado}
        loading={cargandoPerfil}
        onCerrar={handleCerrarPerfil}
      />
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
  horarioSolicitadoBadge: {
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 12,
  },
  horarioSolicitadoLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: COLOR.SUBTEXTO,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  horarioSolicitadoTime: {
    fontSize: 13,
    fontWeight: '700',
    color: COLOR.TEXTO,
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
    borderLeftWidth: 3,
    borderLeftColor: COLOR.EXITO,
  },
  openCard: {
    marginTop: 8,
    marginBottom: 16,
    backgroundColor: COLOR.SECUNDARIO,
    borderColor: COLOR.INFO,
    borderLeftColor: COLOR.INFO,
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
  infoButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLOR.PRIMARIO + '15',
    justifyContent: 'center',
    alignItems: 'center',
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
  // ========== Nuevos estilos para dos secciones ==========
  cardAlternativo: {
    borderLeftColor: COLOR.ALERTA,
  },
  motivoAlternativo: {
    color: COLOR.ALERTA,
    fontSize: 11,
    fontWeight: '500',
  },
  sectionHeader: {
    marginTop: 20,
    marginBottom: 12,
    paddingHorizontal: 0,
  },
  sectionTitulo: {
    fontSize: 14,
    fontWeight: '700',
    color: COLOR.TEXTO,
    marginBottom: 6,
  },
  sectionSubtitulo: {
    fontSize: 12,
    color: COLOR.SUBTEXTO,
    lineHeight: 16,
  },
  footerAyuda: {
    marginTop: 20,
    marginBottom: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: `${COLOR.INFO}10`,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: COLOR.INFO,
  },
  footerTexto: {
    fontSize: 12,
    color: COLOR.SUBTEXTO,
    lineHeight: 16,
    fontWeight: '500',
  },
  // ========== Estilos para selector de horarios alternativos ==========
  ajusteLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLOR.TEXTO,
    marginBottom: 8,
  },
  horarioOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: COLOR.BORDE,
    backgroundColor: COLOR.BLOQUE,
    justifyContent: 'space-between',
  },
  horarioOptionSelected: {
    borderColor: COLOR.PRIMARIO,
    backgroundColor: `${COLOR.PRIMARIO}15`,
  },
  horarioDia: {
    fontSize: 12,
    fontWeight: '600',
    color: COLOR.SUBTEXTO,
    textTransform: 'capitalize',
  },
  horarioHora: {
    fontSize: 14,
    fontWeight: '700',
    color: COLOR.TEXTO,
  },
  sinHorarios: {
    fontSize: 13,
    color: COLOR.SUBTEXTO,
    textAlign: 'center',
    paddingVertical: 20,
    fontStyle: 'italic',
  },
  notaFlexibilidad: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: `${COLOR.INFO}08`,
    alignItems: 'center',
    marginTop: 12,
  },
  notaFlexibilidadTexto: {
    fontSize: 12,
    color: COLOR.SUBTEXTO,
    lineHeight: 16,
    flex: 1,
  },
  // Estilos para Modal de Coordinación
  perfilCoordinacion: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLOR.BORDE,
    gap: 12,
  },
  avatarCoordinacion: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  nombreCoordinacion: {
    fontSize: 15,
    fontWeight: '700',
    color: COLOR.TEXTO,
    marginBottom: 4,
  },
  statsCoordinacion: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statTexto: {
    fontSize: 12,
    color: COLOR.SUBTEXTO,
  },
  mensajeCoordinacion: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: `${COLOR.PRIMARIO}08`,
    borderLeftWidth: 4,
    borderLeftColor: COLOR.PRIMARIO,
    gap: 8,
  },
  mensajeCoordinacionParagrafo: {
    fontSize: 13,
    color: COLOR.TEXTO,
    lineHeight: 18,
  },
  hintConfianza: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: `${COLOR.PRIMARIO}08`,
    borderLeftWidth: 3,
    borderLeftColor: COLOR.PRIMARIO,
  },
  hintConfianzaTexto: {
    fontSize: 13,
    color: COLOR.PRIMARIO,
    fontWeight: '500',
    lineHeight: 18,
  },
  preguntaMomentos: {
    fontSize: 14,
    fontWeight: '600',
    color: COLOR.TEXTO,
    marginTop: 4,
  },
  momentoOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLOR.BORDE,
    backgroundColor: COLOR.BLOQUE,
    marginBottom: 8,
  },
  momentoOptionSelected: {
    borderColor: COLOR.PRIMARIO,
    backgroundColor: `${COLOR.PRIMARIO}12`,
  },
  momentoHora: {
    fontSize: 14,
    fontWeight: '600',
    color: COLOR.TEXTO,
    marginBottom: 2,
  },
  momentoDiferencial: {
    fontSize: 12,
    color: COLOR.PRIMARIO,
    fontStyle: 'italic',
  },
  momentoRadio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: COLOR.BORDE,
    marginLeft: 12,
  },
  momentoRadioSelected: {
    borderColor: COLOR.PRIMARIO,
    backgroundColor: COLOR.PRIMARIO,
  },
  sinMomentos: {
    fontSize: 13,
    color: COLOR.SUBTEXTO,
    textAlign: 'center',
    paddingVertical: 20,
    fontStyle: 'italic',
  },
  notaAcuerdo: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: `${COLOR.SUBTEXTO}08`,
  },
  notaAcuerdoTexto: {
    fontSize: 12,
    color: COLOR.SUBTEXTO,
    lineHeight: 16,
    fontStyle: 'italic',
  },
})
