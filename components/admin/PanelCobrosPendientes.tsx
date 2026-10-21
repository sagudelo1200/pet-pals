/**
 * PanelCobrosPendientes
 * Cobros a tutores sin pagar, con el tiempo transcurrido. Los que superan el
 * plazo de bloqueo de la política impiden al tutor pedir nuevos paseos.
 */
import React, { useMemo } from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { collection, query, where } from 'firebase/firestore'
import { db } from '@/firebase.config'
import { COLOR } from '@/constants'
import { Card } from '@/components/ui'
import { useCollection } from '@/hooks'
import { usePoliticaComercial } from '@/hooks/comercial'
import { formatearCOP } from '@/logic/comercial'
import type { Obligacion } from '@/models/operacionesEconomicas'

const HORA_MS = 60 * 60 * 1000
const aMs = (v: any): number => v?.toMillis?.() ?? new Date(v).getTime()

export const PanelCobrosPendientes: React.FC = () => {
  const { politica } = usePoliticaComercial()
  const pendientes = useMemo(
    () =>
      query(
        collection(db, 'obligaciones'),
        where('tipo', '==', 'COBRO_TUTOR'),
        where('estado', '==', 'PENDIENTE')
      ),
    []
  )
  const { data } = useCollection<any>(pendientes, { listen: true })
  const cobros = (data as unknown as Obligacion[])
    .map(o => ({
      ...o,
      horas: Math.floor((Date.now() - aMs(o.creado_en)) / HORA_MS),
    }))
    .sort((a, b) => b.horas - a.horas)
  const limite = politica?.cobro.bloqueo_tras_horas

  if (cobros.length === 0) {
    return <Text style={styles.vacio}>No hay cobros pendientes</Text>
  }

  return (
    <View>
      {cobros.map(o => {
        const vencido = limite !== undefined && o.horas >= limite
        return (
          <Card key={o.id} style={[styles.card, vencido && styles.vencido]}>
            <Text style={styles.total}>{formatearCOP(o.valor)}</Text>
            <Text style={styles.detalle}>
              {`Tutor ${o.deudor} · hace ${o.horas} h · ${o.recordatorios_enviados ?? 0} recordatorio(s)`}
            </Text>
            {vencido && (
              <Text style={styles.textoVencido}>Vencido: tutor bloqueado</Text>
            )}
          </Card>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    padding: 12,
    marginTop: 8,
  },
  vencido: {
    borderWidth: 1,
    borderColor: COLOR.ERROR,
  },
  total: {
    fontSize: 16,
    fontWeight: '700',
    color: COLOR.TEXTO,
  },
  detalle: {
    fontSize: 12,
    color: COLOR.SUBTEXTO,
    marginTop: 2,
  },
  textoVencido: {
    fontSize: 12,
    color: COLOR.ERROR,
    fontWeight: '600',
    marginTop: 4,
  },
  vacio: {
    fontSize: 13,
    color: COLOR.SUBTEXTO,
  },
})
