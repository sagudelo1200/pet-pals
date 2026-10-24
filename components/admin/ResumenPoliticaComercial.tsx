/**
 * ResumenPoliticaComercial
 * La política comercial vigente en solo lectura (contador): sus valores, lo
 * que paga el tutor y recibe el cuidador, y el historial de versiones.
 */
import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { usePoliticaComercial } from '@/hooks/comercial'
import { formatearCOP } from '@/logic/comercial'
import { TIPO_POLITICA_COMERCIAL } from '@/functions/src/compartido/versionables'
import { VistaPrevia } from './FormularioPoliticaComercial'
import { PanelVersiones } from './PanelVersiones'
import { estilosAdmin } from './estilosAdmin'

const DIAS = [
  'domingo',
  'lunes',
  'martes',
  'miércoles',
  'jueves',
  'viernes',
  'sábado',
]
const siNo = (v: boolean) => (v ? 'sí' : 'no')

export const ResumenPoliticaComercial: React.FC = () => {
  const { politica, cargando, error } = usePoliticaComercial()

  if (cargando)
    return <Text style={estilosAdmin.ayuda}>Cargando política…</Text>
  if (!politica) {
    return (
      <Text style={estilosAdmin.ayuda}>
        {error || 'No hay política publicada'}
      </Text>
    )
  }

  const { precio, comision } = politica.por_tipo.paseo
  const iva = politica.impuestos.iva_comision
  const { cobro, liquidacion } = politica
  const filas: Array<[string, string]> = [
    ['Precio por hora', formatearCOP(precio.base_por_hora)],
    ['Mascota adicional (por hora)', formatearCOP(precio.mascota_adicional)],
    ['Comisión Paw-Path', `${comision.porcentaje_plataforma} %`],
    [
      'IVA sobre la comisión',
      iva.aplica
        ? `${iva.porcentaje} % (${iva.incluido_en_precio ? 'incluido en el precio' : 'se suma al precio'})`
        : 'no aplica',
    ],
    ['Plazo para pagar', `${cobro.plazo_pago_horas} h`],
    ['Bloqueo tras', `${cobro.bloqueo_tras_horas} h sin pagar`],
    ['Corte de liquidación', `${DIAS[liquidacion.dia_corte]} 23:59`],
    ['Día de pago', DIAS[liquidacion.dia_pago]],
    ['Monto mínimo a liquidar', formatearCOP(liquidacion.monto_minimo)],
    ['Liquidar solo lo ya pagado', siNo(liquidacion.solo_recaudadas)],
    [
      'Documento soporte a cuidadores',
      siNo(politica.contabilidad.documento_soporte_cuidador),
    ],
    [
      'Equipo puede cerrar entrega sin confirmar y cobrar',
      siNo(politica.entrega.cobrar_si_cierra_equipo),
    ],
    [
      'Ventana de reclamo del tutor',
      `${politica.entrega.ventana_reclamo_horas} h`,
    ],
    [
      'Cierre automático de entrega',
      politica.entrega.cierre_automatico_horas > 0
        ? `tras ${politica.entrega.cierre_automatico_horas} h${politica.entrega.cierre_automatico_requiere_evidencia ? ' (con evidencia)' : ''}`
        : 'apagado',
    ],
  ]

  return (
    <View>
      <Text style={estilosAdmin.vigente}>
        Vigente: versión {politica.version}
      </Text>
      {filas.map(([etiqueta, valor]) => (
        <View key={etiqueta} style={styles.fila}>
          <Text style={estilosAdmin.ayuda}>{etiqueta}</Text>
          <Text style={styles.valor}>{valor}</Text>
        </View>
      ))}
      <VistaPrevia politica={politica} />
      <Text style={[estilosAdmin.label, styles.historial]}>
        Últimas versiones
      </Text>
      <PanelVersiones tipo={TIPO_POLITICA_COMERCIAL} soloLectura />
    </View>
  )
}

const styles = StyleSheet.create({
  fila: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 4,
  },
  valor: {
    fontSize: 13,
    fontWeight: '600',
    flexShrink: 1,
    textAlign: 'right',
    color: estilosAdmin.label.color,
  },
  historial: {
    marginTop: 20,
  },
})
