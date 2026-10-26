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

interface Props {
  habilitacionId: string
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
  definicion,
  progreso,
  estado,
  puedeDecidir,
  trabajando,
  onAprobar,
  onRechazar,
}) => {
  const [rechazando, setRechazando] = useState(false)
  const [motivo, setMotivo] = useState('')
  const delSistema = definicion.verificacion === null

  return (
    <Card style={styles.tarjeta}>
      <View style={styles.encabezado}>
        <Text style={styles.titulo}>
          {definicion.titulo}
          {definicion.obligatorio ? '' : ' (opcional)'}
        </Text>
        {!delSistema && (
          <Badge
            label={ETIQUETA_REQUISITO[estado]}
            variant={VARIANTE_REQUISITO[estado]}
            size="sm"
          />
        )}
      </View>

      {delSistema ? (
        <Text style={styles.detalle}>Lo comprueba el sistema al enviar.</Text>
      ) : (
        <Text style={styles.detalle}>{definicion.descripcion}</Text>
      )}

      {progreso?.vence_en && estado !== 'EXPIRADO' && (
        <Text style={styles.detalle}>
          Vence el {fechaCorta(progreso.vence_en)}
        </Text>
      )}
      {estado === 'EXPIRADO' && progreso?.vence_en && (
        <Text style={styles.alerta}>
          Venció el {fechaCorta(progreso.vence_en)}
        </Text>
      )}
      {estado === 'RECHAZADO' && progreso?.motivo && (
        <Text style={styles.alerta}>Rechazado: {progreso.motivo}</Text>
      )}

      {estado === 'EN_REVISION' && definicion.evidencia.length > 0 && (
        <VisorEvidencia
          habilitacionId={habilitacionId}
          requisito={definicion.id}
        />
      )}

      {estado === 'EN_REVISION' && !puedeDecidir && (
        <Text style={styles.detalle}>
          Lo valida el proveedor ({definicion.validador}): llega su respuesta.
        </Text>
      )}

      {puedeDecidir && !rechazando && (
        <View style={styles.acciones}>
          <Button
            title="Aprobar"
            icon="check"
            variant="exito"
            size="sm"
            disabled={trabajando}
            onPress={() => onAprobar(definicion.id)}
          />
          <Button
            title="Rechazar"
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
          <Text style={estilosAdmin.label}>¿Qué debe corregir?</Text>
          <TextInput
            style={estilosAdmin.input}
            value={motivo}
            onChangeText={setMotivo}
            placeholder="Ej: la foto está borrosa, repítela con buena luz"
            placeholderTextColor={COLOR.SUBTEXTO}
            maxLength={MAX_MOTIVO}
            multiline
          />
          <View style={styles.acciones}>
            <Button
              title="Confirmar rechazo"
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
              title="Cancelar"
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
