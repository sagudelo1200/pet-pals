import React, { useState } from 'react'
import { StyleSheet, Text, TextInput, View } from 'react-native'
import { COLOR } from '@/constants'
import { Badge, Button, Card } from '@/components/ui'
import { estilosAdmin } from '@/components/admin/estilosAdmin'
import { VisorEvidencia } from './VisorEvidencia'
import {
  ETIQUETA_REQUISITO,
  VARIANTE_REQUISITO,
  fechaCorta,
} from '@/logic/habilitaciones/presentacion'
import { MAX_MOTIVO } from '@/functions/src/compartido/versionables'
import type { EstadoRequisito } from '@/functions/src/compartido/habilitacion'
import type { DefinicionRequisito } from '@/functions/src/compartido/servicios'
import type { RequisitoHabilitacion } from '@/models/Habilitacion'
import { useTranslation } from 'react-i18next'

interface Props {
  habilitacionId: string
  /** Servicio al que pertenece (para traducir el título del requisito) */
  servicio: string
  definicion: DefinicionRequisito
  progreso?: RequisitoHabilitacion
  /** Estado real ahora (un aprobado vencido cuenta como vencido). */
  estado: EstadoRequisito
  /** El equipo puede decidir este requisito (está en revisión y lo valida el equipo). */
  puedeDecidir: boolean
  trabajando: boolean
  // eslint-disable-next-line no-unused-vars
  onAprobar: (requisito: string) => void
  // eslint-disable-next-line no-unused-vars
  onRechazar: (requisito: string, motivo: string) => void
}

/** Un requisito de la habilitación, con su evidencia y las decisiones del equipo. */
export const TarjetaRequisito: React.FC<Props> = ({
  habilitacionId,
  servicio,
  definicion,
  progreso,
  estado,
  puedeDecidir,
  trabajando,
  onAprobar,
  onRechazar,
}) => {
  const { t } = useTranslation(['admin', 'comun'])
  const [rechazando, setRechazando] = useState(false)
  const [motivo, setMotivo] = useState('')
  const delSistema = definicion.verificacion === null

  return (
    <Card style={styles.tarjeta}>
      <View style={styles.encabezado}>
        <Text style={styles.titulo}>
          {t(`comun:servicios.${servicio}.requisitos.${definicion.id}.titulo`, {
            defaultValue: definicion.titulo,
          })}
          {definicion.obligatorio ? '' : t('comun:habilitacion.opcional')}
        </Text>
        <Badge
          label={t(`comun:habilitacion.requisito_estados.${estado}`, {
            defaultValue: ETIQUETA_REQUISITO[estado],
          })}
          variant={VARIANTE_REQUISITO[estado]}
          size="sm"
        />
      </View>

      {delSistema ? (
        <Text style={styles.detalle}>
          {t('admin:habilitaciones.tarjeta.lo_comprueba_sistema')}
        </Text>
      ) : (
        <Text style={styles.detalle}>
          {t(
            `comun:servicios.${servicio}.requisitos.${definicion.id}.descripcion`,
            { defaultValue: definicion.descripcion }
          )}
        </Text>
      )}

      {progreso?.vence_en && estado !== 'EXPIRADO' && (
        <Text style={styles.detalle}>
          {t('admin:habilitaciones.tarjeta.vence_el', {
            fecha: fechaCorta(progreso.vence_en),
          })}
        </Text>
      )}
      {estado === 'EXPIRADO' && progreso?.vence_en && (
        <Text style={styles.alerta}>
          {t('admin:habilitaciones.tarjeta.vencio_el', {
            fecha: fechaCorta(progreso.vence_en),
          })}
        </Text>
      )}
      {estado === 'RECHAZADO' && progreso?.motivo && (
        <Text style={styles.alerta}>
          {t('admin:habilitaciones.tarjeta.rechazado', {
            motivo: progreso.motivo,
          })}
        </Text>
      )}

      {estado === 'EN_REVISION' && definicion.evidencia.length > 0 && (
        <VisorEvidencia
          habilitacionId={habilitacionId}
          requisito={definicion.id}
        />
      )}

      {estado === 'EN_REVISION' && !puedeDecidir && (
        <Text style={styles.detalle}>
          {t('admin:habilitaciones.tarjeta.proveedor', {
            proveedor: definicion.validador,
          })}
        </Text>
      )}

      {puedeDecidir && !rechazando && (
        <View style={styles.acciones}>
          <Button
            title={t('admin:habilitaciones.tarjeta.aprobar')}
            icon="check"
            variant="exito"
            size="sm"
            disabled={trabajando}
            onPress={() => onAprobar(definicion.id)}
          />
          <Button
            title={t('admin:habilitaciones.tarjeta.rechazar')}
            icon="times"
            variant="error"
            size="sm"
            disabled={trabajando}
            onPress={() => setRechazando(true)}
          />
        </View>
      )}

      {puedeDecidir && rechazando && (
        <View>
          <Text style={estilosAdmin.label}>
            {t('admin:habilitaciones.tarjeta.que_corregir')}
          </Text>
          <TextInput
            style={estilosAdmin.input}
            value={motivo}
            onChangeText={setMotivo}
            placeholder={t('admin:habilitaciones.tarjeta.motivo_placeholder')}
            placeholderTextColor={COLOR.SUBTEXTO}
            maxLength={MAX_MOTIVO}
            multiline
          />
          <View style={styles.acciones}>
            <Button
              title={t('admin:habilitaciones.tarjeta.confirmar_rechazo')}
              variant="error"
              size="sm"
              disabled={trabajando || !motivo.trim()}
              onPress={() => {
                onRechazar(definicion.id, motivo.trim())
                setRechazando(false)
                setMotivo('')
              }}
            />
            <Button
              title={t('comun:cancelar')}
              variant="ghost"
              size="sm"
              onPress={() => setRechazando(false)}
            />
          </View>
        </View>
      )}
    </Card>
  )
}

const styles = StyleSheet.create({
  tarjeta: { padding: 14, marginBottom: 8, gap: 4 },
  encabezado: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  titulo: { color: COLOR.TEXTO, fontSize: 15, fontWeight: '700', flex: 1 },
  detalle: { color: COLOR.SUBTEXTO, fontSize: 12 },
  alerta: { color: COLOR.ALERTA, fontSize: 12, fontWeight: '600' },
  acciones: { flexDirection: 'row', gap: 8, marginTop: 8 },
})
