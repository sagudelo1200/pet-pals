/**
 * PanelLiquidaciones
 * El admin genera las liquidaciones (también se generan solas en el corte
 * semanal, con una tarea de un solo uso que se agenda cuando hay pagos listos),
 * transfiere a cada cuidador y registra la referencia de la transferencia.
 * Con `soloLectura` (contador) solo se consultan las pendientes de pago.
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
import { NombreUsuario } from './NombreUsuario'
import { useTranslation } from 'react-i18next'
import { localeActual } from '@/utils/locale'

const fecha = (v: any) =>
  (v?.toDate?.() ?? new Date(v)).toLocaleDateString(localeActual(), {
    day: 'numeric',
    month: 'short',
  })

export const PanelLiquidaciones: React.FC<{ soloLectura?: boolean }> = ({
  soloLectura = false,
}) => {
  const { t } = useTranslation('admin')
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
        t('liquidaciones.titulo_alerta'),
        creadas.length
          ? t('liquidaciones.creadas', { count: creadas.length })
          : t('liquidaciones.ninguna')
      )
    } catch (e) {
      Alert.alert(t('liquidaciones.error'), mensajeErrorEconomia(e))
    } finally {
      setGenerando(false)
    }
  }

  const registrarPago = (liq: Liquidacion) => {
    const referencia = (referencias[liq.id] || '').trim()
    if (!referencia) {
      Alert.alert(
        t('liquidaciones.falta_referencia'),
        t('liquidaciones.escribe_referencia')
      )
      return
    }
    Alert.alert(
      t('liquidaciones.confirmar_pago'),
      t('liquidaciones.confirmar_pago_msg', {
        referencia,
        monto: formatearCOP(liq.total),
      }),
      [
        { text: t('comun:cancelar'), style: 'cancel' },
        {
          text: t('liquidaciones.registrar'),
          onPress: async () => {
            setPagando(liq.id)
            try {
              await ServicioEconomia.pagarLiquidacion({
                liquidacionId: liq.id,
                referencia,
              })
            } catch (e) {
              Alert.alert(t('liquidaciones.error'), mensajeErrorEconomia(e))
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
      {!soloLectura && (
        <Button
          title={
            generando
              ? t('liquidaciones.generando')
              : t('liquidaciones.generar')
          }
          onPress={generar}
          variant="contorno"
          disabled={generando}
        />
      )}
      {liquidaciones.length === 0 && (
        <Text style={styles.vacio}>{t('liquidaciones.vacio')}</Text>
      )}
      {liquidaciones.map(liq => (
        <Card key={liq.id} style={styles.card}>
          <Text style={styles.total}>{formatearCOP(liq.total)}</Text>
          <Text style={styles.detalle}>
            <NombreUsuario uid={liq.cuidador_id} style={styles.detalle} /> ·{' '}
            {t('liquidaciones.detalle_paseos', {
              count: liq.obligacion_ids.length,
            })}{' '}
            · {t('liquidaciones.hasta', { fecha: fecha(liq.periodo_hasta) })}
          </Text>
          {!soloLectura && (
            <>
              <TextInput
                style={styles.input}
                placeholder={t('liquidaciones.referencia_placeholder')}
                placeholderTextColor={COLOR.SUBTEXTO}
                value={referencias[liq.id] || ''}
                onChangeText={v =>
                  setReferencias({ ...referencias, [liq.id]: v })
                }
              />
              <Button
                title={
                  pagando === liq.id
                    ? t('liquidaciones.registrando')
                    : t('liquidaciones.registrar_pago')
                }
                onPress={() => registrarPago(liq)}
                variant="primario"
                disabled={pagando === liq.id}
              />
            </>
          )}
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
