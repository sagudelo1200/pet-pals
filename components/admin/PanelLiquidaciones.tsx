/**
 * PanelLiquidaciones
 * El admin genera las liquidaciones (también se generan solas en el corte
 * semanal, con una tarea de un solo uso que se agenda cuando hay pagos listos),
 * transfiere a cada cuidador y registra la referencia de la transferencia.
 */
import React, { useMemo, useState } from 'react'
import { View, Text, TextInput, StyleSheet, Alert } from 'react-native'
import { collection, query, where } from 'firebase/firestore'
import { db } from '@/firebase.config'
import { COLOR } from '@/constants'
import { Button, Card } from '@/components/ui'
import { useCollection } from '@/hooks'
import { formatearCOP } from '@/logic/comercial'
import {
  ServicioEconomia,
  mensajeErrorEconomia,
} from '@/services/firebase/economia'
import type { Liquidacion } from '@/models/operacionesEconomicas'

const fecha = (v: any) =>
  (v?.toDate?.() ?? new Date(v)).toLocaleDateString('es-CO', {
    day: 'numeric',
    month: 'short',
  })

export const PanelLiquidaciones: React.FC = () => {
  const [generando, setGenerando] = useState(false)
  const [pagando, setPagando] = useState<string | null>(null)
  const [referencias, setReferencias] = useState<Record<string, string>>({})

  const borradores = useMemo(
    () =>
      query(collection(db, 'liquidaciones'), where('estado', '==', 'BORRADOR')),
    []
  )
  const { data } = useCollection<any>(borradores, { listen: true })
  const liquidaciones = data as unknown as Liquidacion[]

  const generar = async () => {
    setGenerando(true)
    try {
      const { creadas } = await ServicioEconomia.generarLiquidaciones({})
      Alert.alert(
        'Liquidaciones',
        creadas.length
          ? `${creadas.length} liquidación(es) creadas`
          : 'No hay pagos listos para liquidar (o no alcanzan el monto mínimo)'
      )
    } catch (e) {
      Alert.alert('❌ Error', mensajeErrorEconomia(e))
    } finally {
      setGenerando(false)
    }
  }

  const registrarPago = (liq: Liquidacion) => {
    const referencia = (referencias[liq.id] || '').trim()
    if (!referencia) {
      Alert.alert(
        'Falta la referencia',
        'Escribe la referencia de la transferencia'
      )
      return
    }
    Alert.alert(
      'Confirmar pago',
      `¿Registrar transferencia ${referencia} por ${formatearCOP(liq.total)}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Registrar',
          onPress: async () => {
            setPagando(liq.id)
            try {
              await ServicioEconomia.pagarLiquidacion({
                liquidacionId: liq.id,
                referencia,
              })
            } catch (e) {
              Alert.alert('❌ Error', mensajeErrorEconomia(e))
            } finally {
              setPagando(null)
            }
          },
        },
      ]
    )
  }

  return (
    <View>
      <Button
        title={generando ? 'Generando…' : 'Generar liquidaciones ahora'}
        onPress={generar}
        variant="contorno"
        disabled={generando}
      />
      {liquidaciones.length === 0 && (
        <Text style={styles.vacio}>No hay liquidaciones por pagar</Text>
      )}
      {liquidaciones.map(liq => (
        <Card key={liq.id} style={styles.card}>
          <Text style={styles.total}>{formatearCOP(liq.total)}</Text>
          <Text style={styles.detalle}>
            Cuidador {liq.cuidador_id} · {liq.obligacion_ids.length} paseo(s) ·
            hasta {fecha(liq.periodo_hasta)}
          </Text>
          <TextInput
            style={styles.input}
            placeholder="Referencia de la transferencia"
            placeholderTextColor={COLOR.SUBTEXTO}
            value={referencias[liq.id] || ''}
            onChangeText={v => setReferencias({ ...referencias, [liq.id]: v })}
          />
          <Button
            title={pagando === liq.id ? 'Registrando…' : 'Registrar pago'}
            onPress={() => registrarPago(liq)}
            variant="primario"
            disabled={pagando === liq.id}
          />
        </Card>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    padding: 12,
    marginTop: 12,
    gap: 8,
  },
  total: {
    fontSize: 20,
    fontWeight: '700',
    color: COLOR.TEXTO,
  },
  detalle: {
    fontSize: 12,
    color: COLOR.SUBTEXTO,
  },
  input: {
    backgroundColor: COLOR.BLOQUE,
    borderColor: COLOR.BORDE,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: COLOR.TEXTO,
  },
  vacio: {
    fontSize: 13,
    color: COLOR.SUBTEXTO,
    marginTop: 12,
  },
})
