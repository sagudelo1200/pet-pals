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
import { useDoc } from '@/hooks/useDoc'
import { perfilParaRequisitos } from '@/logic/habilitaciones/miHabilitacion'
import {
  decidirHabilitacion,
  decidirRequisito,
} from '@/services/firebase/habilitaciones'
import { mensajeErrorCallable } from '@/services/firebase/callable'
import {
  ETIQUETA_ESTADO,
  VARIANTE_ESTADO,
  decisionExigeMotivo,
  claveDecision,
  describirMovimiento,
  fechaHoraCorta,
  type VarianteEstado,
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
import { useTranslation } from 'react-i18next'

const COLOR_TONO: Record<VarianteEstado, string> = {
  exito: COLOR.EXITO,
  alerta: COLOR.ALERTA,
  error: COLOR.ERROR,
  info: COLOR.PRIMARIO,
  neutral: COLOR.INACTIVO,
}

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
  const { t } = useTranslation(['admin', 'comun'])
  const { id } =
    useRoute<RouteProp<AuthStackParamList, 'DetalleHabilitacion'>>().params
  const insets = useSafeAreaInsets()
  const {
    habilitacion: h,
    historial,
    cargando,
    error,
  } = useHabilitacionDetalle(id)
  // Lo que comprueba el sistema (perfil, celular) se calcula con los datos de la
  // persona, igual que lo hace el servidor
  const uidPersona = h?.usuario_id
  const { data: perfilPublico } = useDoc<any>('perfiles_publicos', uidPersona, {
    listen: true,
    enabled: !!uidPersona,
  })
  const { data: usuario } = useDoc<any>('usuarios', uidPersona, {
    enabled: !!uidPersona,
  })
  const [trabajando, setTrabajando] = useState(false)
  const [decision, setDecision] = useState<DecisionHabilitacion | null>(null)
  const [motivo, setMotivo] = useState('')

  const ejecutar = async (accion: () => Promise<unknown>) => {
    setTrabajando(true)
    try {
      await accion()
    } catch (e) {
      Alert.alert(
        t('admin:habilitaciones.detalle.no_se_pudo'),
        mensajeErrorCallable(e)
      )
    } finally {
      setTrabajando(false)
    }
  }

  const aprobar = (requisito: string) => {
    const def = h && requisitosDe(h.servicio).find(r => r.id === requisito)
    const titulo =
      h && def
        ? t(`comun:servicios.${h.servicio}.requisitos.${requisito}.titulo`, {
            defaultValue: def.titulo,
          })
        : requisito
    Alert.alert(
      t('admin:habilitaciones.detalle.aprobar_titulo', { requisito: titulo }),
      t('admin:habilitaciones.detalle.evidencia_valida'),
      [
        { text: t('comun:cancelar'), style: 'cancel' },
        {
          text: t('admin:habilitaciones.detalle.aprobar'),
          onPress: () => {
            void ejecutar(() =>
              decidirRequisito({ id, requisito, decision: 'APROBAR' })
            )
          },
        },
      ]
    )
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
        <ScreenHeader title={t('admin:habilitaciones.detalle.titulo_vacio')} />
        <View style={styles.centrado}>
          <Text style={styles.error}>
            {error ?? t('admin:habilitaciones.detalle.no_existe')}
          </Text>
        </View>
      </View>
    )
  }

  const exigeMotivo = decision ? decisionExigeMotivo(h.estado, decision) : false

  return (
    <View style={[styles.contenedor, { paddingTop: insets.top }]}>
      <ScreenHeader
        title={h.usuario_nombre || t('admin:habilitaciones.sin_nombre')}
        subtitle={t(`comun:servicios.${h.servicio}.titulo`, {
          defaultValue: CATALOGO_SERVICIOS[h.servicio].titulo,
        })}
      />
      <ScrollView
        contentContainerStyle={[
          styles.contenido,
          { paddingBottom: insets.bottom + 24 },
        ]}
      >
        <Card style={styles.tarjeta}>
          <View style={styles.encabezado}>
            <Text style={styles.titulo}>
              {t('admin:habilitaciones.detalle.estado')}
            </Text>
            <Badge
              label={t(`comun:habilitacion.estados.${h.estado}`, {
                defaultValue: ETIQUETA_ESTADO[h.estado],
              })}
              variant={VARIANTE_ESTADO[h.estado]}
              size="sm"
            />
          </View>
          {h.motivo && <Text style={styles.alerta}>{h.motivo}</Text>}
          <Text style={styles.detalle}>
            {t('admin:habilitaciones.detalle.usuario', { id: h.usuario_id })}
          </Text>
        </Card>

        <Text style={styles.seccion}>
          {t('admin:habilitaciones.detalle.requisitos')}
        </Text>
        {requisitosDe(h.servicio).map(def => {
          const progreso = h.requisitos[def.id]
          const estado = estadoDelRequisito(
            def,
            progreso && {
              estado: progreso.estado,
              venceEnMs: progreso.vence_en?.getTime() ?? null,
            },
            perfilParaRequisitos(perfilPublico, usuario),
            Date.now()
          )
          return (
            <TarjetaRequisito
              key={def.id}
              habilitacionId={id}
              servicio={h.servicio}
              definicion={def}
              progreso={progreso}
              estado={estado}
              puedeDecidir={
                estado === 'EN_REVISION' && def.validador === 'manual'
              }
              trabajando={trabajando}
              onAprobar={aprobar}
              onRechazar={rechazar}
            />
          )
        })}

        {decisionesPosibles(h.estado).length > 0 && (
          <>
            <Text style={styles.seccion}>
              {t('admin:habilitaciones.detalle.decision')}
            </Text>
            {!decision ? (
              <View style={styles.acciones}>
                {decisionesPosibles(h.estado).map(d => (
                  <Button
                    key={d}
                    title={t(
                      `admin:habilitaciones.decisiones.${claveDecision(h.estado, d)}`
                    )}
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
                  {t(
                    `admin:habilitaciones.decisiones.${claveDecision(h.estado, decision)}`
                  )}
                </Text>
                <Text style={estilosAdmin.label}>
                  {exigeMotivo
                    ? t('admin:habilitaciones.detalle.motivo_obligatorio')
                    : t('admin:habilitaciones.detalle.motivo_opcional')}
                </Text>
                <TextInput
                  style={estilosAdmin.input}
                  value={motivo}
                  onChangeText={setMotivo}
                  placeholder={t(
                    'admin:habilitaciones.detalle.motivo_placeholder'
                  )}
                  placeholderTextColor={COLOR.SUBTEXTO}
                  maxLength={MAX_MOTIVO}
                  multiline
                />
                <View style={styles.acciones}>
                  <Button
                    title={t('admin:habilitaciones.detalle.confirmar')}
                    variant={VARIANTE_DECISION[decision]}
                    size="sm"
                    loading={trabajando}
                    disabled={trabajando || (exigeMotivo && !motivo.trim())}
                    onPress={confirmarDecision}
                  />
                  <Button
                    title={t('comun:cancelar')}
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

        <Text style={styles.seccion}>
          {t('admin:habilitaciones.detalle.historial')}
        </Text>
        {historial.length === 0 ? (
          <Text style={styles.detalle}>
            {t('admin:habilitaciones.detalle.sin_movimientos')}
          </Text>
        ) : (
          <View>
            {historial.slice(0, 15).map((e, indice, visibles) => {
              const m = describirMovimiento(e, h.usuario_id)
              const ultimo = indice === visibles.length - 1
              return (
                <View key={e.id} style={styles.entrada}>
                  <View style={styles.riel}>
                    <View
                      style={[styles.punto, { backgroundColor: COLOR_TONO[m.tono] }]}
                    />
                    {!ultimo && <View style={styles.linea} />}
                  </View>
                  <View style={styles.entradaTexto}>
                    <Text style={styles.entradaTitulo}>
                      {t(`admin:habilitaciones.historial.${m.clave}`, {
                        requisito: e.requisito
                          ? t(
                              `comun:servicios.${h.servicio}.requisitos.${e.requisito}.titulo`,
                              { defaultValue: e.requisito }
                            )
                          : '',
                      })}
                    </Text>
                    {e.motivo ? (
                      <Text style={styles.entradaMotivo}>“{e.motivo}”</Text>
                    ) : null}
                    <Text style={styles.autor}>
                      {fechaHoraCorta(e.en)} ·{' '}
                      {t(`admin:habilitaciones.historial.quien.${m.quien}`)}
                    </Text>
                  </View>
                </View>
              )
            })}
            {historial.length > 15 && (
              <Text style={styles.detalle}>
                {t('admin:habilitaciones.historial.mas', {
                  cantidad: historial.length - 15,
                })}
              </Text>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  contenedor: { flex: 1, backgroundColor: COLOR.BASE },
  contenido: { padding: 20, gap: 8 },
  centrado: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
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
  entrada: { flexDirection: 'row', gap: 12 },
  riel: { alignItems: 'center', width: 12 },
  punto: { width: 10, height: 10, borderRadius: 5, marginTop: 4 },
  linea: {
    flex: 1,
    width: 1,
    backgroundColor: COLOR.BORDE,
    marginVertical: 2,
  },
  entradaTexto: { flex: 1, gap: 2, paddingBottom: 14 },
  entradaTitulo: { color: COLOR.TEXTO, fontSize: 13, fontWeight: '600' },
  entradaMotivo: { color: COLOR.SUBTEXTO, fontSize: 12, fontStyle: 'italic' },
  autor: { color: COLOR.SUBTEXTO, fontSize: 11 },
})

export default DetalleHabilitacion
