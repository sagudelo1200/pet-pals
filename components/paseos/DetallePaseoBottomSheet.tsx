import InfoCuidadorCard from '@/components/paseos/InfoCuidadorCard'
import React, { useEffect, useState, useRef } from 'react'
import {
  Text,
  StyleSheet,
  View,
  ActivityIndicator,
  Animated,
} from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { BottomSheet, Button, Icon, Avatar } from '@/components/ui'
import { COLOR } from '@/constants'
import { Paseo, ESTADOS_PASEO } from '@/models/Paseo'
import { useTranslation } from 'react-i18next'
import { GestorPerfilPublico } from '@/logic/usuarios/perfilPublico'
import { PerfilPublico } from '@/models/PerfilPublico'

interface Props {
  visible: boolean
  onClose: () => void
  title?: string
  paseo?: Paseo | null
}

const DetallePaseoBottomSheet: React.FC<Props> = ({
  visible,
  onClose,
  title,
  paseo,
}) => {
  const { t } = useTranslation()
  const navigation = useNavigation()
  const [cuidador, setCuidador] = useState<PerfilPublico | null>(null)
  const pulseAnim = useRef(new Animated.Value(1)).current
  const rippleAnim = useRef(new Animated.Value(0)).current
  const rippleLoopRef = useRef<Animated.CompositeAnimation | null>(null)
  const pulseLoopRef = useRef<Animated.CompositeAnimation | null>(null)

  useEffect(() => {
    // detener cualquier loop previo antes de (re)iniciar
    rippleLoopRef.current?.stop()
    rippleLoopRef.current = null

    if (visible && paseo?.estado === ESTADOS_PASEO.PENDIENTE) {
      rippleAnim.setValue(0)
      const loop = Animated.loop(
        Animated.timing(rippleAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        })
      )
      rippleLoopRef.current = loop
      loop.start()
    } else {
      rippleAnim.setValue(0)
    }

    return () => {
      rippleLoopRef.current?.stop()
      rippleLoopRef.current = null
    }
  }, [paseo?.estado, visible, rippleAnim])

  useEffect(() => {
    pulseLoopRef.current?.stop()
    pulseLoopRef.current = null

    if (visible && paseo?.estado === ESTADOS_PASEO.EN_CAMINO) {
      pulseAnim.setValue(1)
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.05,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      )
      pulseLoopRef.current = loop
      loop.start()
    } else {
      pulseAnim.setValue(1)
    }

    return () => {
      pulseLoopRef.current?.stop()
      pulseLoopRef.current = null
    }
  }, [paseo?.estado, visible, pulseAnim])

  // Si el BottomSheet se oculta, detener y resetear animaciones para evitar estados congelados
  useEffect(() => {
    if (!visible) {
      rippleLoopRef.current?.stop()
      rippleLoopRef.current = null
      rippleAnim.setValue(0)

      pulseLoopRef.current?.stop()
      pulseLoopRef.current = null
      pulseAnim.setValue(1)
    }
  }, [visible, rippleAnim, pulseAnim])

  useEffect(() => {
    let mounted = true
    if (paseo?.id_cuidador) {
      GestorPerfilPublico.obtenerPorId(paseo.id_cuidador).then(res => {
        if (mounted && res.success && res.data) {
          setCuidador(res.data)
        }
      })
    }
    return () => {
      mounted = false
    }
  }, [paseo?.id_cuidador])

  // Si el paseo pasa a EN_PROGRESO mientras el BottomSheet está abierto,
  // cerrar el sheet y navegar a la pantalla `PaseoActivo` para seguimiento.
  const prevEstadoRef = React.useRef<string | null>(null)
  useEffect(() => {
    const prev = prevEstadoRef.current
    const current = paseo?.estado
    if (
      visible &&
      paseo?.id &&
      current === ESTADOS_PASEO.EN_PROGRESO &&
      prev !== ESTADOS_PASEO.EN_PROGRESO
    ) {
      // Cerrar el BottomSheet y navegar al seguimiento activo
      try {
        onClose()
      } catch (_e) {
        // ignore
      }
      // Dejamos una pequeña pausa para permitir animación de cierre
      setTimeout(() => {
        // @ts-ignore
        navigation.navigate('PaseoActivo', { paseoId: paseo.id })
      }, 250)
    }

    prevEstadoRef.current = current || null
  }, [paseo?.estado, visible, paseo?.id, navigation, onClose])

  if (!paseo) return null

  const renderPendiente = () => (
    <View style={styles.content}>
      <View style={styles.radarContainer}>
        <Animated.View
          style={[
            styles.radarRipple,
            {
              transform: [
                {
                  scale: rippleAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [1, 2.5],
                  }),
                },
              ],
              opacity: rippleAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0.4, 0],
              }),
            },
          ]}
        />
        <View style={styles.mascotaAvatarContainer}>
          <Avatar
            uri={paseo.mascota_foto_visual}
            name={paseo.mascota_nombre_visual || 'Mascota'}
            size={80}
          />
          <View style={styles.searchingBadge}>
            <Icon name="search" size={12} color={COLOR.TEXTO} />
          </View>
        </View>
      </View>

      <Text style={styles.statusTitle}>
        {t('paseos:estados.pendiente_titulo_mascota', {
          mascota: paseo.mascota_nombre_visual || 'tu mascota',
        })}
      </Text>

      <Text style={styles.description}>
        {t('paseos:estados.pendiente_desc_premium')}
      </Text>

      <View style={styles.progressContainer}>
        <View style={styles.progressStep}>
          <ActivityIndicator size="small" color={COLOR.PRIMARIO} />
          <Text style={[styles.progressText, styles.progressTextActive]}>
            Buscando
          </Text>
        </View>
        <View style={styles.progressLine} />
        <View style={styles.progressStep}>
          <Icon name="check-circle" size={16} color={COLOR.SUBTEXTO} />
          <Text style={styles.progressText}>Aceptado</Text>
        </View>
        <View style={styles.progressLine} />
        <View style={styles.progressStep}>
          <Icon name="clock" size={16} color={COLOR.SUBTEXTO} />
          <Text style={styles.progressText}>En camino</Text>
        </View>
        <View style={styles.progressLine} />
        <View style={styles.progressStep}>
          <Icon name="paw" size={16} color={COLOR.SUBTEXTO} />
          <Text style={styles.progressText}>Paseo</Text>
        </View>
      </View>

      <View style={styles.actions}>
        <Button
          variant="ghost"
          title={t('comun:acciones.cancelar_solicitud')}
          onPress={() => {
            // TODO: Implementar cancelación
            onClose()
          }}
          style={styles.cancelButton}
          textStyle={{ color: COLOR.ERROR }}
        />
      </View>
    </View>
  )

  const renderConfirmado = () => {
    const enCamino = paseo.estado === ESTADOS_PASEO.EN_CAMINO

    return (
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.statusTitle}>
            {enCamino
              ? t('paseos:estados.en_camino_titulo', {
                  nombre: paseo.cuidador_nombre_visual || 'El cuidador',
                })
              : t('paseos:estados.confirmado_titulo', {
                  mascota: paseo.mascota_nombre_visual || 'Tu mascota',
                })}
          </Text>
          <Text style={styles.description}>
            {enCamino
              ? t('paseos:estados.en_camino_desc', {
                  mascota: paseo.mascota_nombre_visual || 'tu mascota',
                })
              : t('paseos:estados.confirmado_desc', {
                  cuidador: paseo.cuidador_nombre_visual || 'El cuidador',
                })}
          </Text>
          {!enCamino && (
            <Text style={styles.microcopy}>
              {t('paseos:estados.confirmado_micro')}
            </Text>
          )}
        </View>

        <InfoCuidadorCard
          cuidadorId={paseo.id_cuidador}
          uri={paseo.cuidador_foto_visual}
          name={paseo.cuidador_nombre_visual}
          size={64}
          rating={cuidador?.rating_promedio ?? null}
          count={cuidador?.cantidad_paseos_realizados ?? 0}
        />

        <View style={styles.progressContainer}>
          <View style={styles.progressStep}>
            <Icon name="check-circle" size={16} color={COLOR.EXITO} />
            <Text style={styles.progressText}>Solicitud</Text>
          </View>
          <View style={styles.progressLineActive} />
          <View style={styles.progressStep}>
            <Icon name="check-circle" size={16} color={COLOR.EXITO} />
            <Text style={styles.progressText}>Aceptado</Text>
          </View>
          <View
            style={enCamino ? styles.progressLineActive : styles.progressLine}
          />
          <View style={styles.progressStep}>
            <Icon
              name={enCamino ? 'check-circle' : 'clock'}
              size={16}
              color={enCamino ? COLOR.EXITO : COLOR.SUBTEXTO}
            />
            <Text
              style={
                enCamino
                  ? [styles.progressText, styles.progressTextActive]
                  : styles.progressText
              }
            >
              En camino
            </Text>
          </View>
          <View style={styles.progressLine} />
          <View style={styles.progressStep}>
            <Icon name="paw" size={16} color={COLOR.SUBTEXTO} />
            <Text style={styles.progressText}>Paseo</Text>
          </View>
        </View>

        <View style={styles.actions}>
          <Button
            variant="primario"
            title={t('comun:acciones.escribir_a', {
              nombre: paseo.cuidador_nombre_visual || 'Cuidador',
            })}
            icon="comment-dots"
            onPress={() => {
              onClose()
              setTimeout(() => {
                // @ts-ignore
                navigation.navigate('Chat', { paseoId: paseo.id })
              }, 300)
            }}
            style={styles.actionButton}
          />
          <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
            <Button
              variant="contorno"
              title={
                enCamino
                  ? t('comun:acciones.seguir_cuidador', {
                      nombre: paseo.cuidador_nombre_visual || 'Cuidador',
                    })
                  : t('comun:acciones.ver_punto_encuentro')
              }
              onPress={() => {
                onClose()
                // @ts-ignore
                navigation.navigate('PaseoActivo', { paseoId: paseo.id })
              }}
              style={{ borderColor: COLOR.PRIMARIO }}
              textStyle={{ color: COLOR.PRIMARIO }}
            />
          </Animated.View>
        </View>
      </View>
    )
  }

  const renderHistorico = () => {
    const esCancelado = paseo.estado === ESTADOS_PASEO.CANCELADO
    const fecha = new Date(paseo.fecha_hora_inicio)

    return (
      <View style={styles.content}>
        <View style={styles.header}>
          <View
            style={[
              styles.iconBadge,
              esCancelado ? styles.iconBadgeError : styles.iconBadgeSuccess,
            ]}
          >
            <Icon
              name={esCancelado ? 'x' : 'check'}
              size={32}
              color={esCancelado ? COLOR.ERROR : COLOR.EXITO}
            />
          </View>
          <Text style={styles.statusTitle}>
            {esCancelado
              ? t('paseos:estados.cancelado_titulo')
              : t('paseos:estados.completado_titulo')}
          </Text>
          <Text style={styles.description}>
            {fecha.toLocaleDateString(undefined, {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
            })}{' '}
            •{' '}
            {fecha.toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </Text>
        </View>

        <View style={styles.receiptCard}>
          {paseo.cuidador_nombre_visual && (
            <View style={styles.receiptRow}>
              <View style={styles.receiptLabelContainer}>
                <Icon name="user" size={16} color={COLOR.SUBTEXTO} />
                <Text style={styles.receiptLabel}>{t('comun:cuidador')}</Text>
              </View>
              <Text style={styles.receiptValue}>
                {paseo.cuidador_nombre_visual}
              </Text>
            </View>
          )}

          <View style={styles.receiptDivider} />

          <View style={styles.receiptRow}>
            <View style={styles.receiptLabelContainer}>
              <Icon name="clock" size={16} color={COLOR.SUBTEXTO} />
              <Text style={styles.receiptLabel}>{t('comun:duracion')}</Text>
            </View>
            <Text style={styles.receiptValue}>
              {paseo.duracion_real || paseo.duracion_estimada} min
            </Text>
          </View>

          <View style={styles.receiptDivider} />

          <View style={styles.receiptRow}>
            <View style={styles.receiptLabelContainer}>
              <Icon name="dollar-sign" size={16} color={COLOR.SUBTEXTO} />
              <Text style={styles.receiptLabel}>{t('comun:precio')}</Text>
            </View>
            <Text style={[styles.receiptValue, styles.receiptTotal]}>
              ${paseo.precio}
            </Text>
          </View>
        </View>

        <View style={styles.actions}>
          <Button
            variant="contorno"
            title={t('comun:cerrar')}
            onPress={onClose}
            style={styles.actionButton}
          />
        </View>
      </View>
    )
  }

  const renderContent = () => {
    switch (paseo.estado) {
      case ESTADOS_PASEO.PENDIENTE:
        return renderPendiente()
      case ESTADOS_PASEO.CONFIRMADO:
      case ESTADOS_PASEO.EN_CAMINO:
        return renderConfirmado()
      case ESTADOS_PASEO.COMPLETADO:
      case ESTADOS_PASEO.FINALIZADO:
      case ESTADOS_PASEO.CANCELADO:
        return renderHistorico()
      default:
        return <Text style={styles.title}>{title || ''}</Text>
    }
  }

  return (
    <BottomSheet visible={visible} onClose={onClose}>
      {renderContent()}
    </BottomSheet>
  )
}

const styles = StyleSheet.create({
  content: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 20,
  },
  radarContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
    marginTop: 16,
    width: 120,
    height: 120,
  },
  radarRipple: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: `${COLOR.PRIMARIO}30`,
    borderWidth: 1,
    borderColor: `${COLOR.PRIMARIO}50`,
  },
  mascotaAvatarContainer: { position: 'relative' },
  searchingBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: COLOR.PRIMARIO,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: COLOR.BLOQUE,
  },
  statusTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: COLOR.TEXTO,
    marginBottom: 12,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  description: {
    fontSize: 16,
    color: COLOR.SUBTEXTO,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 12,
    paddingHorizontal: 10,
  },
  actions: { width: '100%', gap: 12 },
  cancelButton: { borderColor: `${COLOR.ERROR}50` },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: COLOR.TEXTO,
    marginBottom: 8,
  },
  header: { alignItems: 'center', marginBottom: 32 },
  cuidadorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLOR.BLOQUE,
    padding: 20,
    borderRadius: 24,
    width: '100%',
    marginBottom: 24,
    shadowColor: COLOR.SOMBRA,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 3,
    borderWidth: 1,
    borderColor: COLOR.BORDE,
  },
  cuidadorInfo: { marginLeft: 16, flex: 1 },
  cuidadorName: {
    fontSize: 18,
    fontWeight: '700',
    color: COLOR.TEXTO,
    marginBottom: 6,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${COLOR.ALERTA}15`,
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  ratingText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLOR.ALERTA,
    marginLeft: 4,
  },
  microcopy: {
    fontSize: 14,
    color: COLOR.PRIMARIO,
    fontWeight: '600',
    marginTop: 8,
    textAlign: 'center',
  },
  statsRow: { flexDirection: 'row', alignItems: 'center' },
  statsText: { fontSize: 13, color: COLOR.SUBTEXTO, marginLeft: 8 },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 32,
    paddingHorizontal: 10,
  },
  progressStep: { alignItems: 'center', gap: 4 },
  progressText: { fontSize: 12, color: COLOR.SUBTEXTO, fontWeight: '500' },
  progressTextActive: { color: COLOR.PRIMARIO, fontWeight: '700' },
  progressLine: {
    flex: 1,
    height: 2,
    backgroundColor: COLOR.BORDE,
    marginHorizontal: 8,
    marginBottom: 14,
  },
  progressLineActive: {
    flex: 1,
    height: 2,
    backgroundColor: COLOR.EXITO,
    marginHorizontal: 8,
    marginBottom: 14,
  },
  actionButton: { marginBottom: 0 },
  iconBadge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 4,
  },
  iconBadgeSuccess: {
    backgroundColor: `${COLOR.EXITO}15`,
    borderColor: `${COLOR.EXITO}30`,
  },
  iconBadgeError: {
    backgroundColor: `${COLOR.ERROR}15`,
    borderColor: `${COLOR.ERROR}30`,
  },
  receiptCard: {
    width: '100%',
    backgroundColor: COLOR.BLOQUE,
    borderRadius: 24,
    padding: 24,
    marginBottom: 32,
    borderWidth: 1,
    borderColor: COLOR.BORDE,
    shadowColor: COLOR.SOMBRA,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 2,
  },
  receiptRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  receiptLabelContainer: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  receiptLabel: { fontSize: 14, color: COLOR.SUBTEXTO, fontWeight: '500' },
  receiptValue: { fontSize: 16, color: COLOR.TEXTO, fontWeight: '600' },
  receiptTotal: { fontSize: 20, fontWeight: '800', color: COLOR.PRIMARIO },
  receiptDivider: {
    height: 1,
    backgroundColor: COLOR.BORDE,
    marginVertical: 16,
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: COLOR.BORDE,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    width: '100%',
    marginBottom: 32,
    paddingHorizontal: 20,
    backgroundColor: COLOR.BLOQUE,
    paddingVertical: 16,
    borderRadius: 16,
  },
  statItem: { alignItems: 'center', gap: 4 },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: COLOR.TEXTO,
    marginTop: 4,
  },
  statLabel: { fontSize: 12, color: COLOR.SUBTEXTO, fontWeight: '500' },
  statDivider: { width: 1, height: 40, backgroundColor: COLOR.BORDE },
})

export default DetallePaseoBottomSheet
