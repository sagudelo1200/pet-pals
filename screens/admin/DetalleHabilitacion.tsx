import React, { useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { useRoute, type RouteProp } from '@react-navigation/native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { COLOR } from '@/constants'
import { Badge, Button, Card } from '@/components/ui'
import ScreenHeader from '@/components/ui/ScreenHeader'
import { estilosAdmin } from '@/components/admin/estilosAdmin'
import { TarjetaRequisito } from '@/components/admin/habilitaciones/TarjetaRequisito'
import { useHabilitacionDetalle } from '@/hooks/admin/useHabilitacionDetalle'
import {
  decidirHabilitacion,
  decidirRequisito,
} from '@/services/firebase/habilitaciones'
import { mensajeErrorCallable } from '@/services/firebase/callable'
import {
  ETIQUETA_ESTADO,
  VARIANTE_ESTADO,
  decisionExigeMotivo,
  etiquetaDecision,
  fechaCorta,
} from '@/logic/habilitaciones/presentacion'
import {
  decisionesPosibles,
  estadoDelRequisito,
  type DecisionHabilitacion,
} from '@/functions/src/compartido/habilitacion'
import {
  CATALOGO_SERVICIOS,
  requisitosDe,
} from '@/functions/src/compartido/servicios'
import { MAX_MOTIVO } from '@/functions/src/compartido/versionables'
import type { AuthStackParamList } from '@/navigation/types'

const VARIANTE_DECISION: Record<
  DecisionHabilitacion,
  'error' | 'exito' | 'contorno'
> = {
  RECHAZAR: 'error',
  SUSPENDER: 'error',
  REACTIVAR: 'exito',
  REABRIR: 'contorno',
}

/**
 * Una habilitación (admin): quién es, cómo va cada requisito, su evidencia, las
 * decisiones del equipo y el historial.
 */
const DetalleHabilitacion: React.FC = () => {
  const { id } =
    useRoute<RouteProp<AuthStackParamList, 'DetalleHabilitacion'>>().params
  const insets = useSafeAreaInsets()
  const { habilitacion: h, historial, cargando, error } =
    useHabilitacionDetalle(id)
  const [trabajando, setTrabajando] = useState(false)
  const [decision, setDecision] = useState<DecisionHabilitacion | null>(null)
  const [motivo, setMotivo] = useState('')

  const ejecutar = async (accion: () => Promise<unknown>) => {
    setTrabajando(true)
    try {
      await accion()
    } catch (e) {
      Alert.alert('No se pudo completar', mensajeErrorCallable(e))
    } finally {
      setTrabajando(false)
    }
  }

  const aprobar = (requisito: string) => {
    const titulo =
      h && requisitosDe(h.servicio).find(r => r.id === requisito)?.titulo
    Alert.alert(`Aprobar ${titulo ?? requisito}`, '¿La evidencia es válida?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Aprobar',
        onPress: () => {
          void ejecutar(() =>
            decidirRequisito({ id, requisito, decision: 'APROBAR' })
          )
        },
      },
    ])
  }

  const rechazar = (requisito: string, motivoRechazo: string) => {
    void ejecutar(() =>
      decidirRequisito({
        id,
        requisito,
        decision: 'RECHAZAR',
        motivo: motivoRechazo,
      })
    )
  }

  const confirmarDecision = () => {
    if (!decision) return
    void ejecutar(async () => {
      await decidirHabilitacion({
        id,
        decision,
        motivo: motivo.trim() || undefined,
      })
      setDecision(null)
      setMotivo('')
    })
  }

  if (cargando) {
    return (
      <View style={[styles.contenedor, styles.centrado]}>
        <ActivityIndicator size="large" color={COLOR.PRIMARIO} />
      </View>
    )
  }

  if (error || !h) {
    return (
      <View style={[styles.contenedor, { paddingTop: insets.top }]}>
        <ScreenHeader title="Habilitación" />
        <View style={styles.centrado}>
          <Text style={styles.error}>{error ?? 'La habilitación no existe.'}</Text>
        </View>
      </View>
    )
  }

  const exigeMotivo = decision ? decisionExigeMotivo(h.estado, decision) : false

  return (
    <View style={[styles.contenedor, { paddingTop: insets.top }]}>
      <ScreenHeader
        title={h.usuario_nombre || 'Sin nombre'}
        subtitle={CATALOGO_SERVICIOS[h.servicio].titulo}
      />
      <ScrollView
        contentContainerStyle={[
          styles.contenido,
          { paddingBottom: insets.bottom + 24 },
        ]}
      >
        <Card style={styles.tarjeta}>
          <View style={styles.encabezado}>
            <Text style={styles.titulo}>Estado</Text>
            <Badge
              label={ETIQUETA_ESTADO[h.estado]}
              variant={VARIANTE_ESTADO[h.estado]}
              size="sm"
            />
          </View>
          {h.motivo && <Text style={styles.alerta}>{h.motivo}</Text>}
          <Text style={styles.detalle}>Usuario: {h.usuario_id}</Text>
        </Card>

        <Text style={styles.seccion}>Requisitos</Text>
        {requisitosDe(h.servicio).map(def => {
          const progreso = h.requisitos[def.id]
          const estado =
            def.verificacion === null
              ? 'VERIFICADO'
              : estadoDelRequisito(
                  def,
                  progreso && {
                    estado: progreso.estado,
                    venceEnMs: progreso.vence_en?.getTime() ?? null,
                  },
                  null,
                  Date.now()
                )
          return (
            <TarjetaRequisito
              key={def.id}
              habilitacionId={id}
              definicion={def}
              progreso={progreso}
              estado={estado}
              puedeDecidir={estado === 'EN_REVISION' && def.validador === 'manual'}
              trabajando={trabajando}
              onAprobar={aprobar}
              onRechazar={rechazar}
            />
          )
        })}

        {decisionesPosibles(h.estado).length > 0 && (
          <>
            <Text style={styles.seccion}>Decisión sobre la habilitación</Text>
            {!decision ? (
              <View style={styles.acciones}>
                {decisionesPosibles(h.estado).map(d => (
                  <Button
                    key={d}
                    title={etiquetaDecision(h.estado, d)}
                    variant={VARIANTE_DECISION[d]}
                    size="sm"
                    disabled={trabajando}
                    onPress={() => setDecision(d)}
                  />
                ))}
              </View>
            ) : (
              <Card style={styles.tarjeta}>
                <Text style={styles.titulo}>
                  {etiquetaDecision(h.estado, decision)}
                </Text>
                <Text style={estilosAdmin.label}>
                  {exigeMotivo ? 'Motivo (obligatorio)' : 'Motivo (opcional)'}
                </Text>
                <TextInput
                  style={estilosAdmin.input}
                  value={motivo}
                  onChangeText={setMotivo}
                  placeholder="La persona lo verá"
                  placeholderTextColor={COLOR.SUBTEXTO}
                  maxLength={MAX_MOTIVO}
                  multiline
                />
                <View style={styles.acciones}>
                  <Button
                    title="Confirmar"
                    variant={VARIANTE_DECISION[decision]}
                    size="sm"
                    loading={trabajando}
                    disabled={trabajando || (exigeMotivo && !motivo.trim())}
                    onPress={confirmarDecision}
                  />
                  <Button
                    title="Cancelar"
                    variant="ghost"
                    size="sm"
                    onPress={() => {
                      setDecision(null)
                      setMotivo('')
                    }}
                  />
                </View>
              </Card>
            )}
          </>
        )}

        <Text style={styles.seccion}>Historial</Text>
        {historial.length === 0 ? (
          <Text style={styles.detalle}>Sin movimientos todavía.</Text>
        ) : (
          historial.slice(0, 15).map(e => (
            <View key={e.id} style={styles.entrada}>
              <Text style={styles.detalle}>
                {fechaCorta(e.en)} · {e.requisito ? `${e.requisito}: ` : ''}
                {e.de} → {e.a}
              </Text>
              {e.motivo ? <Text style={styles.detalle}>“{e.motivo}”</Text> : null}
              <Text style={styles.autor}>{e.autor}</Text>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  contenedor: { flex: 1, backgroundColor: COLOR.BASE },
  contenido: { padding: 20, gap: 8 },
  centrado: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  error: { color: COLOR.ERROR, textAlign: 'center' },
  seccion: {
    color: COLOR.TEXTO,
    fontSize: 16,
    fontWeight: '700',
    marginTop: 16,
    marginBottom: 4,
  },
  tarjeta: { padding: 14, marginBottom: 8, gap: 4 },
  encabezado: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  titulo: { color: COLOR.TEXTO, fontSize: 15, fontWeight: '700' },
  detalle: { color: COLOR.SUBTEXTO, fontSize: 12 },
  alerta: { color: COLOR.ALERTA, fontSize: 13, fontWeight: '600' },
  acciones: { flexDirection: 'row', gap: 8, marginTop: 8, flexWrap: 'wrap' },
  entrada: { paddingVertical: 6, gap: 2 },
  autor: { color: COLOR.INACTIVO, fontSize: 11 },
})

export default DetalleHabilitacion
