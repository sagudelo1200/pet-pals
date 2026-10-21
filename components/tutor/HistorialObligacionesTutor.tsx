/**
 * HistorialObligacionesTutor
 * Lista simple de obligaciones/deudas del tutor
 *
 * Muestra:
 * - Paseos completados sin pagar (PENDIENTE)
 * - Paseos ya pagados (CUMPLIDA)
 * - Total a pagar
 * - Botón "Pagar" por paseo (abre PantallaPago)
 * - Aviso de bloqueo si hay cobros vencidos
 */

import React, { useEffect, useState, useMemo } from 'react'
import {
  StyleSheet,
  View,
  Text,
  Pressable,
  ActivityIndicator,
  Modal,
} from 'react-native'
import { collection, query, where } from 'firebase/firestore'
import { db } from '@/firebase.config'
import { LinearGradient } from 'expo-linear-gradient'
import { COLOR } from '@/constants'
import Card from '@/components/ui/Card'
import Icon from '@/components/ui/Icon'
import { useCollection } from '@/hooks'
import type { Obligacion } from '@/models/operacionesEconomicas'
import { ServicioAuth } from '@/services/firebase'
import { useBloqueoFinanciero } from '@/hooks/comercial'
import { formatearCOP } from '@/logic/comercial'
import { PantallaPago } from './PantallaPago'

export const HistorialObligacionesTutor: React.FC = () => {
  const { bloqueado } = useBloqueoFinanciero()
  const [pagando, setPagando] = useState<Obligacion | null>(null)
  const [obligaciones, setObligaciones] = useState<Obligacion[]>([])
  const [loading, setLoading] = useState(true)
  const [totalPendiente, setTotalPendiente] = useState(0)
  const [totalLiquidada, setTotalLiquidada] = useState(0)

  const tutorId = ServicioAuth.obtenerUsuarioActual()?.uid

  // Crear query de Firestore para obligaciones donde tutorId es deudor
  const obligacionesQuery = useMemo(() => {
    if (!tutorId) return null
    return query(collection(db, 'obligaciones'), where('deudor', '==', tutorId))
  }, [tutorId])

  // Hook para obtener obligaciones donde tutorId es deudor
  const { data: obligacionesData } = useCollection(obligacionesQuery, {
    listen: true,
  })

  useEffect(() => {
    if (obligacionesData) {
      const obligacionesTyped = (
        obligacionesData as unknown as Obligacion[]
      ).sort((a, b) => {
        const timeA = (a.creado_en as any)?.toDate?.() || new Date(0)
        const timeB = (b.creado_en as any)?.toDate?.() || new Date(0)
        return timeB.getTime() - timeA.getTime() // Más reciente primero
      })

      setObligaciones(obligacionesTyped)

      // Calcular totales
      const pendiente = obligacionesTyped
        .filter(o => o.estado === 'PENDIENTE')
        .reduce((sum, o) => sum + o.valor, 0)

      const cumplida = obligacionesTyped
        .filter(o => o.estado === 'CUMPLIDA')
        .reduce((sum, o) => sum + o.valor, 0)

      setTotalPendiente(pendiente)
      setTotalLiquidada(cumplida)
      setLoading(false)
    }
  }, [obligacionesData])

  const formatearFecha = (timestamp: any) => {
    if (!timestamp) return 'Sin fecha'
    const fecha = timestamp.toDate?.() || new Date(timestamp)
    return fecha.toLocaleDateString('es-ES', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  const renderObligacion = ({ item }: { item: Obligacion }) => {
    const esCumplida = item.estado === 'CUMPLIDA'

    return (
      <Card
        style={[
          styles.obligacionCard,
          esCumplida && styles.obligacionLiquidada,
        ]}
      >
        <View style={styles.obligacionHeader}>
          <View style={styles.obligacionInfo}>
            <View style={styles.obligacionFecha}>
              <Icon
                name="calendar"
                size={14}
                color={esCumplida ? COLOR.EXITO : COLOR.PRIMARIO}
              />
              <Text style={styles.fecha}>{formatearFecha(item.creado_en)}</Text>
            </View>
            <Text style={styles.concepto}>{item.concepto}</Text>
          </View>

          <View style={styles.obligacionAcciones}>
            <View
              style={[
                styles.estadoBadge,
                esCumplida ? styles.estadoLiquidada : styles.estadoPendiente,
              ]}
            >
              <Icon
                name={esCumplida ? 'check-circle' : 'clock'}
                size={14}
                color={esCumplida ? COLOR.EXITO : COLOR.PRIMARIO}
              />
              <Text
                style={[
                  styles.estadoTexto,
                  esCumplida
                    ? styles.estadoTextoLiquidada
                    : styles.estadoTextoPendiente,
                ]}
              >
                {esCumplida ? 'Pagado' : 'Pendiente'}
              </Text>
            </View>

            <Text
              style={[
                styles.monto,
                esCumplida ? styles.montoLiquidada : styles.montoPendiente,
              ]}
            >
              ${item.valor.toLocaleString()}
            </Text>
          </View>
        </View>

        {esCumplida && item.cumplido_en && (
          <View style={styles.obligacionFooter}>
            <Icon name="check-circle" size={12} color={COLOR.EXITO} />
            <Text style={styles.liquidadaEn}>
              Pagado el {formatearFecha(item.cumplido_en)}
            </Text>
          </View>
        )}

        {item.estado === 'PENDIENTE' && (
          <Pressable
            style={styles.botonPagarTodos}
            onPress={() => setPagando(item)}
          >
            <LinearGradient
              colors={[COLOR.PRIMARIO, `${COLOR.PRIMARIO}80`]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.gradientButton}
            >
              <Icon name="credit-card" size={16} color="white" />
              <Text style={styles.botonTexto}>
                Pagar {formatearCOP(item.valor)}
              </Text>
            </LinearGradient>
          </Pressable>
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

  const obligacionesPendientes = obligaciones.filter(
    o => o.estado === 'PENDIENTE'
  )
  const tieneObligacionesPendientes = obligacionesPendientes.length > 0

  return (
    <View style={styles.container}>
      {/* Header de resumen */}
      <LinearGradient
        colors={[`${COLOR.PRIMARIO}20`, `${COLOR.SECUNDARIO}10`]}
        style={styles.resumenContainer}
      >
        <View style={styles.resumenContent}>
          <Text style={styles.resumenTitulo}>Mis Obligaciones</Text>

          {tieneObligacionesPendientes && (
            <View style={styles.resumenCards}>
              <Card style={[styles.resumenCard, styles.resumenCardPendiente]}>
                <Text style={styles.resumenLabel}>Pendiente de pagar</Text>
                <Text style={styles.resumenValor}>
                  ${totalPendiente.toLocaleString()}
                </Text>
                <Text style={styles.resumenDetalle}>
                  {obligacionesPendientes.length} paseo
                  {obligacionesPendientes.length !== 1 ? 's' : ''}
                </Text>
              </Card>

              {totalLiquidada > 0 && (
                <Card style={[styles.resumenCard, styles.resumenCardLiquidada]}>
                  <Text style={styles.resumenLabel}>Ya pagado</Text>
                  <Text style={styles.resumenValor}>
                    ${totalLiquidada.toLocaleString()}
                  </Text>
                  <Text style={styles.resumenDetalle}>
                    {obligaciones.filter(o => o.estado === 'CUMPLIDA').length}{' '}
                    paseo
                    {obligaciones.filter(o => o.estado === 'CUMPLIDA')
                      .length !== 1
                      ? 's'
                      : ''}
                  </Text>
                </Card>
              )}
            </View>
          )}
        </View>
      </LinearGradient>

      {tieneObligacionesPendientes ? (
        <>
          {/* Lista de obligaciones */}
          <View style={styles.listContent}>
            {obligaciones.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Icon name="inbox" size={48} color={COLOR.SUBTEXTO} />
                <Text style={styles.emptyText}>
                  No hay obligaciones registradas
                </Text>
              </View>
            ) : (
              obligaciones.map(item => (
                <React.Fragment key={item.id}>
                  {renderObligacion({ item })}
                </React.Fragment>
              ))
            )}
          </View>

          {/* Aviso de bloqueo por cobros vencidos */}
          {bloqueado && (
            <View style={styles.footer}>
              <View style={styles.avisoBloqueo}>
                <Icon name="lock" size={16} color={COLOR.ERROR} />
                <Text style={styles.avisoBloqueoTexto}>
                  Tienes un pago vencido. Mientras no lo pagues no podrás
                  solicitar nuevos paseos.
                </Text>
              </View>
            </View>
          )}
        </>
      ) : (
        <View style={styles.successContainer}>
          <LinearGradient
            colors={[`${COLOR.EXITO}20`, `${COLOR.EXITO}05`]}
            style={styles.successGradient}
          >
            <View style={styles.successContent}>
              <View style={styles.successIconContainer}>
                <LinearGradient
                  colors={[COLOR.EXITO, `${COLOR.EXITO}80`]}
                  style={styles.successIcon}
                >
                  <Icon name="check-circle" size={48} color="white" />
                </LinearGradient>
              </View>
              <Text style={styles.successTitulo}>¡Sin deudas!</Text>
              <Text style={styles.successTexto}>
                Todos tus paseos han sido pagados correctamente
              </Text>

              {totalLiquidada > 0 && (
                <View style={styles.successStats}>
                  <Text style={styles.successStatsTexto}>
                    Total pagado: ${totalLiquidada.toLocaleString()}
                  </Text>
                  <Text style={styles.successStatsTexto}>
                    {obligaciones.filter(o => o.estado === 'CUMPLIDA').length}{' '}
                    paseos completados
                  </Text>
                </View>
              )}
            </View>
          </LinearGradient>
        </View>
      )}

      <Modal
        visible={!!pagando}
        animationType="slide"
        onRequestClose={() => setPagando(null)}
      >
        {pagando && (
          <PantallaPago
            operacionId={pagando.operacion_id}
            nombreMascota="tu mascota"
            nombreCuidador="tu cuidador"
            onPagado={() => setPagando(null)}
            onCancel={() => setPagando(null)}
          />
        )}
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  avisoBloqueo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 8,
    backgroundColor: `${COLOR.ERROR}10`,
  },
  avisoBloqueoTexto: {
    flex: 1,
    fontSize: 13,
    color: COLOR.ERROR,
  },
  container: {
    flex: 1,
    backgroundColor: COLOR.SECUNDARIO,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  resumenContainer: {
    paddingVertical: 20,
    paddingHorizontal: 16,
  },
  resumenContent: {
    gap: 16,
  },
  resumenTitulo: {
    fontSize: 24,
    fontWeight: '700',
    color: COLOR.TEXTO,
  },
  resumenCards: {
    flexDirection: 'row',
    gap: 12,
  },
  resumenCard: {
    flex: 1,
    padding: 16,
  },
  resumenCardPendiente: {
    borderLeftWidth: 4,
    borderLeftColor: COLOR.PRIMARIO,
  },
  resumenCardLiquidada: {
    borderLeftWidth: 4,
    borderLeftColor: COLOR.EXITO,
  },
  resumenLabel: {
    fontSize: 12,
    color: COLOR.SUBTEXTO,
    fontWeight: '500',
    marginBottom: 4,
  },
  resumenValor: {
    fontSize: 20,
    fontWeight: '700',
    color: COLOR.TEXTO,
    marginBottom: 4,
  },
  resumenDetalle: {
    fontSize: 11,
    color: COLOR.SUBTEXTO,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  obligacionCard: {
    padding: 14,
  },
  obligacionLiquidada: {
    backgroundColor: `${COLOR.EXITO}05`,
  },
  obligacionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  obligacionInfo: {
    flex: 1,
    gap: 6,
  },
  obligacionFecha: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  fecha: {
    fontSize: 12,
    color: COLOR.SUBTEXTO,
  },
  concepto: {
    fontSize: 14,
    fontWeight: '600',
    color: COLOR.TEXTO,
  },
  obligacionAcciones: {
    alignItems: 'flex-end',
    gap: 8,
  },
  estadoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  estadoPendiente: {
    backgroundColor: `${COLOR.PRIMARIO}20`,
  },
  estadoLiquidada: {
    backgroundColor: `${COLOR.EXITO}20`,
  },
  estadoTexto: {
    fontSize: 11,
    fontWeight: '600',
  },
  estadoTextoPendiente: {
    color: COLOR.PRIMARIO,
  },
  estadoTextoLiquidada: {
    color: COLOR.EXITO,
  },
  monto: {
    fontSize: 16,
    fontWeight: '700',
  },
  montoPendiente: {
    color: COLOR.PRIMARIO,
  },
  montoLiquidada: {
    color: COLOR.EXITO,
  },
  obligacionFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: `${COLOR.SUBTEXTO}10`,
  },
  liquidadaEn: {
    fontSize: 11,
    color: COLOR.EXITO,
    fontWeight: '500',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    color: COLOR.SUBTEXTO,
    marginTop: 12,
  },
  footer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: `${COLOR.SUBTEXTO}20`,
  },
  botonPagarTodos: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  gradientButton: {
    flexDirection: 'row',
    paddingVertical: 14,
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  botonTexto: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
    flex: 1,
    textAlign: 'center',
  },
  successContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  successGradient: {
    flex: 1,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  successContent: {
    alignItems: 'center',
    gap: 16,
  },
  successIconContainer: {
    marginBottom: 8,
  },
  successIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  successTitulo: {
    fontSize: 24,
    fontWeight: '700',
    color: COLOR.EXITO,
  },
  successTexto: {
    fontSize: 14,
    color: COLOR.SUBTEXTO,
    textAlign: 'center',
  },
  successStats: {
    marginTop: 16,
    alignItems: 'center',
    gap: 4,
  },
  successStatsTexto: {
    fontSize: 12,
    color: COLOR.SUBTEXTO,
  },
})
