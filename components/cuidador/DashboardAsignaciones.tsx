/**
 * DashboardAsignacionesCuidador
 * Lista de paseos asignados al cuidador por estado
 *
 * Estados mostrados:
 * - 🟢 CONFIRMADO: Aceptar/Rechazar
 * - 🚀 EN_PROGRESO: Ver en vivo, Finalizar
 * - ✅ FINALIZADO: Ver detalles, Obligaciones
 * - 💰 COMPLETADO: Confirmación de pago
 */

import React, { useEffect, useState, useMemo } from 'react'
import {
  StyleSheet,
  View,
  Text,
  Pressable,
  ActivityIndicator,
  ScrollView,
} from 'react-native'
import { collection, query, where } from 'firebase/firestore'
import { db } from '@/firebase.config'
import { LinearGradient } from 'expo-linear-gradient'
import { COLOR } from '@/constants'
import Card from '@/components/ui/Card'
import Icon from '@/components/ui/Icon'
import { useCollection } from '@/hooks'
import type { Paseo } from '@/models/Paseo'
import { ServicioAuth } from '@/services/firebase'
import { useTranslation } from 'react-i18next'
import { localeActual } from '@/utils/locale'

interface DashboardAsignacionesCuidadorProps {
  onAceptarPaseo?: (_paseoId: string) => void
  onRechazarPaseo?: (_paseoId: string) => void
  onFinalizarPaseo?: (_paseoId: string) => void
  onVerDetalles?: (_paseoId: string) => void
}

export const DashboardAsignaciones: React.FC<
  DashboardAsignacionesCuidadorProps
> = ({ onAceptarPaseo, onRechazarPaseo, onFinalizarPaseo, onVerDetalles }) => {
  const { t } = useTranslation(['cuidador', 'paseos'])
  const [paseos, setPaseos] = useState<Paseo[]>([])
  const [loading, setLoading] = useState(true)
  const [estadisticas, setEstadisticas] = useState({
    disponibles: 0,
    enProgreso: 0,
    finalizados: 0,
  })

  const cuidadorId = ServicioAuth.obtenerUsuarioActual()?.uid

  // Crear query de Firestore para paseos del cuidador
  const paseosQuery = useMemo(() => {
    if (!cuidadorId) return null
    return query(
      collection(db, 'operaciones'),
      where('tipo', '==', 'paseo'),
      where('id_cuidador', '==', cuidadorId)
    )
  }, [cuidadorId])

  // Hook para obtener paseos del cuidador
  const { data: paseosData } = useCollection(paseosQuery, { listen: true })

  useEffect(() => {
    if (paseosData) {
      const paseosTyped = (paseosData as unknown as Paseo[]).sort((a, b) => {
        const estadoOrder: { [key: string]: number } = {
          CONFIRMADO: 0,
          EN_CAMINO: 1,
          EN_PUNTO_RECOGIDA: 2,
          EN_PROGRESO: 3,
          FINALIZADO: 4,
          COMPLETADO: 5,
        }
        return (estadoOrder[a.estado] ?? 99) - (estadoOrder[b.estado] ?? 99)
      })

      setPaseos(paseosTyped)

      // Calcular estadísticas
      const stats = {
        disponibles: paseosTyped.filter(p => p.estado === 'CONFIRMADO').length,
        enProgreso: paseosTyped.filter(
          p =>
            p.estado === 'EN_PROGRESO' ||
            p.estado === 'EN_CAMINO' ||
            p.estado === 'EN_PUNTO_RECOGIDA'
        ).length,
        finalizados: paseosTyped.filter(
          p => p.estado === 'FINALIZADO' || p.estado === 'COMPLETADO'
        ).length,
      }

      setEstadisticas(stats)
      setLoading(false)
    }
  }, [paseosData])

  const getEstadoInfo = (estado: string) => {
    const info: {
      [key: string]: { icon: string; color: string }
    } = {
      CONFIRMADO: {
        icon: 'exclamation-circle',
        color: COLOR.PRIMARIO,
      },
      EN_CAMINO: {
        icon: 'play-circle',
        color: COLOR.ALERTA,
      },
      EN_PUNTO_RECOGIDA: {
        icon: 'map-pin',
        color: COLOR.ALERTA,
      },
      EN_PROGRESO: {
        icon: 'play-circle',
        color: COLOR.ALERTA,
      },
      FINALIZADO: {
        icon: 'check-circle',
        color: COLOR.EXITO,
      },
      COMPLETADO: {
        icon: 'award',
        color: COLOR.INFO,
      },
    }
    const base = info[estado] || {
      icon: 'question-circle',
      color: COLOR.SUBTEXTO,
    }
    return {
      ...base,
      label: t(`paseos:estados.${estado}`, { defaultValue: estado }),
    }
  }

  const formatearHora = (timestamp: any) => {
    if (!timestamp) return t('cuidador:asignaciones.sin_hora')
    const fecha = timestamp.toDate?.() || new Date(timestamp)
    return fecha.toLocaleTimeString(localeActual(), {
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const renderPaseo = ({ item }: { item: Paseo }) => {
    const estadoInfo = getEstadoInfo(item.estado)
    const isConfirmado = item.estado === 'CONFIRMADO'
    const isEnProgreso =
      item.estado === 'EN_PROGRESO' ||
      item.estado === 'EN_CAMINO' ||
      item.estado === 'EN_PUNTO_RECOGIDA'
    const isFinalizado =
      item.estado === 'FINALIZADO' || item.estado === 'COMPLETADO'

    return (
      <Card style={styles.paseoCard}>
        <View style={styles.paseoHeader}>
          <View style={styles.paseoInfo}>
            <View
              style={[
                styles.estadoBadge,
                { backgroundColor: `${estadoInfo.color}20` },
              ]}
            >
              <Icon name={estadoInfo.icon} size={14} color={estadoInfo.color} />
              <Text style={[styles.estadoLabel, { color: estadoInfo.color }]}>
                {estadoInfo.label}
              </Text>
            </View>

            <Text style={styles.mascotaNombre}>
              {item.mascotas?.[0]?.nombre || 'Mascota'}
            </Text>

            <View style={styles.tutorInfo}>
              <Icon name="user" size={12} color={COLOR.SUBTEXTO} />
              <Text style={styles.tutorNombre}>
                {item.tutor_nombre || 'Tutor'}
              </Text>
            </View>
          </View>

          <View style={styles.horaInfo}>
            <Icon name="clock" size={14} color={COLOR.SUBTEXTO} />
            <Text style={styles.hora}>{formatearHora(item.fecha_inicio)}</Text>
          </View>
        </View>

        {/* Acciones según estado */}
        <View style={styles.acciones}>
          {isConfirmado && (
            <>
              <Pressable
                style={styles.botonRechazar}
                onPress={() => onRechazarPaseo?.(item.id)}
              >
                <Icon name="times-circle" size={16} color={COLOR.ERROR} />
                <Text style={styles.textoRechazar}>
                  {t('cuidador:asignaciones.rechazar')}
                </Text>
              </Pressable>

              <Pressable
                style={styles.botonAceptar}
                onPress={() => onAceptarPaseo?.(item.id)}
              >
                <Icon name="check-circle" size={16} color="white" />
                <Text style={styles.textoAceptar}>
                  {t('cuidador:asignaciones.aceptar')}
                </Text>
              </Pressable>
            </>
          )}

          {isEnProgreso && (
            <>
              <Pressable
                style={styles.botonSecundario}
                onPress={() => onVerDetalles?.(item.id)}
              >
                <Icon name="map-pin" size={16} color={COLOR.PRIMARIO} />
                <Text style={styles.textoSecundario}>
                  {t('cuidador:asignaciones.ver_mapa')}
                </Text>
              </Pressable>

              <Pressable
                style={styles.botonPrimario}
                onPress={() => onFinalizarPaseo?.(item.id)}
              >
                <Icon name="flag" size={16} color="white" />
                <Text style={styles.textoPrimario}>
                  {t('cuidador:asignaciones.finalizar')}
                </Text>
              </Pressable>
            </>
          )}

          {isFinalizado && (
            <Pressable
              style={[styles.botonSecundario, { flex: 1 }]}
              onPress={() => onVerDetalles?.(item.id)}
            >
              <Icon name="info" size={16} color={COLOR.PRIMARIO} />
              <Text style={styles.textoSecundario}>
                {t('cuidador:asignaciones.ver_detalles')}
              </Text>
            </Pressable>
          )}
        </View>

        {/* Info de ganancia si está finalizado/pagado */}
        {isFinalizado && (
          <View style={styles.gananciaInfo}>
            <Icon
              name={item.estado === 'COMPLETADO' ? 'check' : 'clock'}
              size={12}
              color={
                item.estado === 'COMPLETADO' ? COLOR.EXITO : COLOR.PRIMARIO
              }
            />
            <Text
              style={[
                styles.gananciaTexto,
                item.estado === 'COMPLETADO' && styles.liquidadoTexto,
              ]}
            >
              {item.estado === 'COMPLETADO'
                ? t('cuidador:asignaciones.ganancia', {
                    monto: (item.valor_acordado * 0.9).toLocaleString(
                      localeActual()
                    ),
                  })
                : t('cuidador:asignaciones.esperando_pago', {
                    monto: (item.valor_acordado * 0.9).toLocaleString(
                      localeActual()
                    ),
                  })}
            </Text>
          </View>
        )}
      </Card>
    )
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLOR.PRIMARIO} />
      </View>
    )
  }

  return (
    <View style={styles.container}>
      {/* Tarjetas de estadísticas */}
      {(estadisticas.disponibles > 0 || estadisticas.enProgreso > 0) && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.statsContainer}
        >
          {estadisticas.disponibles > 0 && (
            <Card style={[styles.statCard, styles.statDisponible]}>
              <View style={styles.statIcon}>
                <LinearGradient
                  colors={[COLOR.PRIMARIO, `${COLOR.PRIMARIO}80`]}
                  style={styles.statIconGradient}
                >
                  <Icon name="exclamation-circle" size={20} color="white" />
                </LinearGradient>
              </View>
              <Text style={styles.statValor}>{estadisticas.disponibles}</Text>
              <Text style={styles.statLabel}>
                {t('cuidador:asignaciones.por_aceptar')}
              </Text>
            </Card>
          )}

          {estadisticas.enProgreso > 0 && (
            <Card style={[styles.statCard, styles.statEnProgreso]}>
              <View style={styles.statIcon}>
                <LinearGradient
                  colors={[COLOR.ALERTA, `${COLOR.ALERTA}B3`]}
                  style={styles.statIconGradient}
                >
                  <Icon name="play-circle" size={20} color="white" />
                </LinearGradient>
              </View>
              <Text style={styles.statValor}>{estadisticas.enProgreso}</Text>
              <Text style={styles.statLabel}>
                {t('cuidador:asignaciones.en_ejecucion')}
              </Text>
            </Card>
          )}
        </ScrollView>
      )}

      {/* Lista de paseos */}
      <View style={styles.listContent}>
        {paseos.length === 0 ? (
          <View style={styles.emptyContainer}>
            <LinearGradient
              colors={[`${COLOR.PRIMARIO}10`, `${COLOR.PRIMARIO}05`]}
              style={styles.emptyGradient}
            >
              <View style={styles.emptyContent}>
                <Icon name="inbox" size={48} color={COLOR.SUBTEXTO} />
                <Text style={styles.emptyTitle}>
                  {t('cuidador:asignaciones.sin_asignados')}
                </Text>
                <Text style={styles.emptyText}>
                  {t('cuidador:asignaciones.sin_asignados_desc')}
                </Text>
              </View>
            </LinearGradient>
          </View>
        ) : (
          paseos.map(item => (
            <React.Fragment key={item.id}>
              {renderPaseo({ item })}
            </React.Fragment>
          ))
        )}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLOR.SECUNDARIO,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  statCard: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    minWidth: 140,
    alignItems: 'center',
    gap: 8,
  },
  statDisponible: {
    borderLeftWidth: 4,
    borderLeftColor: COLOR.PRIMARIO,
  },
  statEnProgreso: {
    borderLeftWidth: 4,
    borderLeftColor: COLOR.ALERTA,
  },
  statIcon: {
    marginBottom: 4,
  },
  statIconGradient: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statValor: {
    fontSize: 24,
    fontWeight: '700',
    color: COLOR.TEXTO,
  },
  statLabel: {
    fontSize: 11,
    color: COLOR.SUBTEXTO,
    fontWeight: '500',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  paseoCard: {
    padding: 14,
    gap: 12,
  },
  paseoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  paseoInfo: {
    flex: 1,
    gap: 6,
  },
  estadoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  estadoLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  mascotaNombre: {
    fontSize: 16,
    fontWeight: '700',
    color: COLOR.TEXTO,
  },
  tutorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  tutorNombre: {
    fontSize: 12,
    color: COLOR.SUBTEXTO,
  },
  horaInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 6,
    backgroundColor: `${COLOR.SUBTEXTO}10`,
    borderRadius: 6,
  },
  hora: {
    fontSize: 12,
    fontWeight: '600',
    color: COLOR.TEXTO,
  },
  acciones: {
    flexDirection: 'row',
    gap: 8,
  },
  botonAceptar: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: COLOR.PRIMARIO,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  textoAceptar: {
    fontSize: 13,
    fontWeight: '600',
    color: 'white',
  },
  botonRechazar: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: COLOR.ERROR,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  textoRechazar: {
    fontSize: 13,
    fontWeight: '600',
    color: COLOR.ERROR,
  },
  botonSecundario: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: `${COLOR.PRIMARIO}30`,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  textoSecundario: {
    fontSize: 13,
    fontWeight: '600',
    color: COLOR.PRIMARIO,
  },
  botonPrimario: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: COLOR.PRIMARIO,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  textoPrimario: {
    fontSize: 13,
    fontWeight: '600',
    color: 'white',
  },
  gananciaInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: `${COLOR.PRIMARIO}10`,
    borderRadius: 8,
    marginTop: 4,
  },
  gananciaTexto: {
    fontSize: 12,
    fontWeight: '600',
    color: COLOR.PRIMARIO,
  },
  liquidadoTexto: {
    color: COLOR.EXITO,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 60,
  },
  emptyGradient: {
    paddingVertical: 40,
    borderRadius: 16,
  },
  emptyContent: {
    alignItems: 'center',
    gap: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLOR.TEXTO,
  },
  emptyText: {
    fontSize: 14,
    color: COLOR.SUBTEXTO,
    textAlign: 'center',
  },
})
