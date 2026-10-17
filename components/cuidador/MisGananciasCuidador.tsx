/**
 * MisGananciasCuidador
 * Tarjeta resumen de ganancias y obligaciones del cuidador
 *
 * Muestra:
 * - Total de paseos completados
 * - Ganancia total este mes
 * - Dinero pendiente vs liquidado
 * - Próxima liquidación (viernes)
 */

import React, { useEffect, useState, useMemo } from 'react'
import {
  StyleSheet,
  View,
  Text,
  ActivityIndicator,
  Pressable,
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

interface MisGananciasCuidadorProps {
  onVerDetalles?: () => void
}

export const MisGananciasCuidador: React.FC<MisGananciasCuidadorProps> = ({
  onVerDetalles,
}) => {
  const [ganancia, setGanancia] = useState({
    totalGanancia: 0,
    totalPendiente: 0,
    totalLiquidado: 0,
    paseosPendientes: 0,
    paseosLiquidados: 0,
  })
  const [loading, setLoading] = useState(true)

  const cuidadorId = ServicioAuth.obtenerUsuarioActual()?.uid

  // Crear query de Firestore para obligaciones donde cuidador es acreedor
  const obligacionesQuery = useMemo(() => {
    if (!cuidadorId) return null
    return query(
      collection(db, 'obligaciones'),
      where('acreedor', '==', cuidadorId)
    )
  }, [cuidadorId])

  // Hook para obtener obligaciones donde cuidador es acreedor (sus ganancias)
  const { data: obligacionesData } = useCollection(obligacionesQuery)

  useEffect(() => {
    if (obligacionesData) {
      const obligaciones = (obligacionesData as unknown as Obligacion[]) || []

      // Calcular totales
      const pendientes = obligaciones.filter(o => o.estado === 'PENDIENTE')
      const cumplidas = obligaciones.filter(o => o.estado === 'CUMPLIDA')

      const totalPendiente = pendientes.reduce((sum, o) => sum + o.valor, 0)
      const totalLiquidado = cumplidas.reduce((sum, o) => sum + o.valor, 0)
      const totalGanancia = totalPendiente + totalLiquidado

      setGanancia({
        totalGanancia,
        totalPendiente,
        totalLiquidado,
        paseosPendientes: pendientes.length,
        paseosLiquidados: cumplidas.length,
      })

      setLoading(false)
    }
  }, [obligacionesData])

  const getProximaLiquidacion = () => {
    const hoy = new Date()
    const diaSemana = hoy.getDay()
    const diasFaltantes = (5 - diaSemana + 7) % 7 // 5 = viernes

    const proximaFecha = new Date(hoy)
    proximaFecha.setDate(
      hoy.getDate() + (diasFaltantes === 0 ? 7 : diasFaltantes)
    )

    return proximaFecha.toLocaleDateString('es-ES', {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
    })
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLOR.PRIMARIO} />
      </View>
    )
  }

  const porcentajeLiquidado =
    ganancia.totalGanancia > 0
      ? Math.round((ganancia.totalLiquidado / ganancia.totalGanancia) * 100)
      : 0

  return (
    <View style={styles.container}>
      {/* Card Principal - Ganancia Total */}
      <LinearGradient
        colors={[COLOR.PRIMARIO, `${COLOR.PRIMARIO}80`]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.cardPrincipal}
      >
        <View style={styles.headerPrincipal}>
          <View>
            <Text style={styles.labelPrincipal}>Tu Ganancia Este Mes</Text>
            <Text style={styles.valorPrincipal}>
              ${ganancia.totalGanancia.toLocaleString()}
            </Text>
          </View>
          <View style={styles.iconoPrincipal}>
            <Icon name="chart-line" size={36} color="white" />
          </View>
        </View>

        {/* Desglose */}
        <View style={styles.desgloseContainer}>
          <View style={styles.desgloseItem}>
            <View style={styles.desgloseIcono}>
              <Icon name="check" size={14} color="white" />
            </View>
            <View style={styles.desgloseInfo}>
              <Text style={styles.desgloseLabel}>Liquidado</Text>
              <Text style={styles.desgloseValor}>
                ${ganancia.totalLiquidado.toLocaleString()}
              </Text>
            </View>
          </View>

          <View style={styles.separador} />

          <View style={styles.desgloseItem}>
            <View style={[styles.desgloseIcono, styles.desgloseIconoPendiente]}>
              <Icon name="clock" size={14} color={COLOR.PRIMARIO} />
            </View>
            <View style={styles.desgloseInfo}>
              <Text style={styles.desgloseLabel}>Pendiente</Text>
              <Text style={[styles.desgloseValor, { color: COLOR.PRIMARIO }]}>
                ${ganancia.totalPendiente.toLocaleString()}
              </Text>
            </View>
          </View>
        </View>

        {/* Barra de progreso */}
        <View style={styles.barraContainer}>
          <View style={styles.barraFondo}>
            <View
              style={[styles.barraLlena, { width: `${porcentajeLiquidado}%` }]}
            />
          </View>
          <Text style={styles.porcentajeTexto}>
            {porcentajeLiquidado}% recibido
          </Text>
        </View>
      </LinearGradient>

      {/* Tarjetas de detalle */}
      <View style={styles.cardsContainer}>
        <Card style={[styles.cardDetalle, { borderLeftColor: COLOR.PRIMARIO }]}>
          <View style={styles.cardDetalleContent}>
            <View style={styles.cardDetalleIcono}>
              <LinearGradient
                colors={[`${COLOR.PRIMARIO}30`, `${COLOR.PRIMARIO}10`]}
                style={styles.gradienteIcono}
              >
                <Icon name="walking" size={18} color={COLOR.PRIMARIO} />
              </LinearGradient>
            </View>
            <View style={styles.cardDetalleInfo}>
              <Text style={styles.cardDetalleLabel}>Paseos Completados</Text>
              <Text style={styles.cardDetalleValor}>
                {ganancia.paseosPendientes + ganancia.paseosLiquidados}
              </Text>
            </View>
          </View>
        </Card>

        <Card style={[styles.cardDetalle, { borderLeftColor: COLOR.EXITO }]}>
          <View style={styles.cardDetalleContent}>
            <View style={styles.cardDetalleIcono}>
              <LinearGradient
                colors={[`${COLOR.EXITO}30`, `${COLOR.EXITO}10`]}
                style={styles.gradienteIcono}
              >
                <Icon name="check-circle" size={18} color={COLOR.EXITO} />
              </LinearGradient>
            </View>
            <View style={styles.cardDetalleInfo}>
              <Text style={styles.cardDetalleLabel}>Cobrados</Text>
              <Text style={[styles.cardDetalleValor, { color: COLOR.EXITO }]}>
                {ganancia.paseosLiquidados}
              </Text>
            </View>
          </View>
        </Card>

        <Card style={[styles.cardDetalle, { borderLeftColor: '#FF9500' }]}>
          <View style={styles.cardDetalleContent}>
            <View style={styles.cardDetalleIcono}>
              <LinearGradient
                colors={['#FF950030', '#FF950010']}
                style={styles.gradienteIcono}
              >
                <Icon name="clock" size={18} color="#FF9500" />
              </LinearGradient>
            </View>
            <View style={styles.cardDetalleInfo}>
              <Text style={styles.cardDetalleLabel}>Por Cobrar</Text>
              <Text style={[styles.cardDetalleValor, { color: '#FF9500' }]}>
                {ganancia.paseosPendientes}
              </Text>
            </View>
          </View>
        </Card>
      </View>

      {/* Info de próxima liquidación */}
      <Card style={styles.cardLiquidacion}>
        <View style={styles.liquidacionContent}>
          <View style={styles.liquidacionIcono}>
            <LinearGradient
              colors={['#7C3AED30', '#7C3AED10']}
              style={styles.liquidacionGradiente}
            >
              <Icon name="calendar" size={18} color="#7C3AED" />
            </LinearGradient>
          </View>

          <View style={styles.liquidacionInfo}>
            <Text style={styles.liquidacionLabel}>Próxima liquidación</Text>
            <Text style={styles.liquidacionFecha}>
              {getProximaLiquidacion()} a las 18:00
            </Text>
            {ganancia.totalPendiente > 0 && (
              <Text style={styles.liquidacionEstimado}>
                Se transferirá ${ganancia.totalPendiente.toLocaleString()}
              </Text>
            )}
          </View>

          <View style={styles.liquidacionFecha2}>
            <Icon name="chevron-right" size={20} color="#7C3AED" />
          </View>
        </View>
      </Card>

      {/* Botón ver más detalles */}
      {onVerDetalles && (
        <Pressable style={styles.botonVerDetalles} onPress={onVerDetalles}>
          <Text style={styles.botonVerDetallesTexto}>
            Ver historial de ganancias
          </Text>
          <Icon name="arrow-right" size={16} color={COLOR.PRIMARIO} />
        </Pressable>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  cardPrincipal: {
    borderRadius: 16,
    padding: 20,
    gap: 16,
  },
  headerPrincipal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  labelPrincipal: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '500',
    marginBottom: 4,
  },
  valorPrincipal: {
    fontSize: 32,
    fontWeight: '700',
    color: 'white',
  },
  iconoPrincipal: {
    opacity: 0.8,
  },
  desgloseContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 12,
  },
  desgloseItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  desgloseIcono: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  desgloseIconoPendiente: {
    backgroundColor: 'white',
  },
  desgloseInfo: {
    flex: 1,
  },
  desgloseLabel: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 2,
  },
  desgloseValor: {
    fontSize: 14,
    fontWeight: '700',
    color: 'white',
  },
  separador: {
    width: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  barraContainer: {
    gap: 8,
  },
  barraFondo: {
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  barraLlena: {
    height: '100%',
    backgroundColor: 'white',
    borderRadius: 3,
  },
  porcentajeTexto: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '500',
  },
  cardsContainer: {
    gap: 10,
  },
  cardDetalle: {
    padding: 14,
    borderLeftWidth: 4,
  },
  cardDetalleContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  cardDetalleIcono: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gradienteIcono: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardDetalleInfo: {
    flex: 1,
  },
  cardDetalleLabel: {
    fontSize: 12,
    color: COLOR.SUBTEXTO,
    fontWeight: '500',
    marginBottom: 2,
  },
  cardDetalleValor: {
    fontSize: 20,
    fontWeight: '700',
    color: COLOR.TEXTO,
  },
  cardLiquidacion: {
    padding: 14,
  },
  liquidacionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  liquidacionIcono: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  liquidacionGradiente: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  liquidacionInfo: {
    flex: 1,
  },
  liquidacionLabel: {
    fontSize: 12,
    color: COLOR.SUBTEXTO,
    fontWeight: '500',
    marginBottom: 2,
  },
  liquidacionFecha: {
    fontSize: 14,
    fontWeight: '700',
    color: COLOR.TEXTO,
    marginBottom: 2,
  },
  liquidacionEstimado: {
    fontSize: 11,
    color: COLOR.SUBTEXTO,
  },
  liquidacionFecha2: {
    padding: 8,
  },
  botonVerDetalles: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: `${COLOR.PRIMARIO}30`,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  botonVerDetallesTexto: {
    fontSize: 14,
    fontWeight: '600',
    color: COLOR.PRIMARIO,
    flex: 1,
    textAlign: 'center',
  },
})
