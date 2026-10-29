/**
 * ResumenPoliticaComercial
 * La política comercial vigente en solo lectura (contador): sus valores, lo
 * que paga el tutor y recibe el cuidador, y el historial de versiones.
 */
import React from 'react'
import { useTranslation } from 'react-i18next'
import { View, Text, StyleSheet } from 'react-native'
import { usePoliticaComercial } from '@/hooks/comercial'
import { formatearCOP } from '@/logic/comercial'
import { TIPO_POLITICA_COMERCIAL } from '@/functions/src/compartido/versionables'
import { VistaPrevia } from './FormularioPoliticaComercial'
import { PanelVersiones } from './PanelVersiones'
import { estilosAdmin } from './estilosAdmin'

/** Claves de `comun:datepicker.dias`, indexadas por día de la semana (0 = domingo) */
const DIAS_CLAVES = [
  'domingo',
  'lunes',
  'martes',
  'miercoles',
  'jueves',
  'viernes',
  'sabado',
]

export const ResumenPoliticaComercial: React.FC = () => {
  const { t } = useTranslation(['admin', 'comun'])
  const siNo = (v: boolean) => t(v ? 'admin:comun.si' : 'admin:comun.no')
  const dia = (n: number) =>
    t(`comun:datepicker.dias.${DIAS_CLAVES[n]}`).toLowerCase()
  const { politica, cargando, error } = usePoliticaComercial()

  if (cargando)
    return (
      <Text style={estilosAdmin.ayuda}>{t('admin:politica.cargando')}</Text>
    )
  if (!politica) {
    return (
      <Text style={estilosAdmin.ayuda}>
        {error || t('admin:politica.sin_politica')}
      </Text>
    )
  }

  const { precio, comision } = politica.por_tipo.paseo
  const iva = politica.impuestos.iva_comision
  const { cobro, liquidacion } = politica
  const r = (k: string) => t(`admin:politica.resumen.${k}`)
  const filas: Array<[string, string]> = [
    [r('precio_hora'), formatearCOP(precio.base_por_hora)],
    [r('mascota_adicional'), formatearCOP(precio.mascota_adicional)],
    [r('comision'), `${comision.porcentaje_plataforma} %`],
    [
      r('iva'),
      iva.aplica
        ? t('admin:politica.resumen.iva_valor', {
            porcentaje: iva.porcentaje,
            modo: iva.incluido_en_precio ? r('iva_incluido') : r('iva_se_suma'),
          })
        : r('iva_no_aplica'),
    ],
    [r('plazo'), `${cobro.plazo_pago_horas} h`],
    [
      r('bloqueo'),
      t('admin:politica.resumen.bloqueo_valor', {
        horas: cobro.bloqueo_tras_horas,
      }),
    ],
    [r('corte'), `${dia(liquidacion.dia_corte)} 23:59`],
    [r('dia_pago'), dia(liquidacion.dia_pago)],
    [r('monto_minimo'), formatearCOP(liquidacion.monto_minimo)],
    [r('solo_pagado'), siNo(liquidacion.solo_recaudadas)],
    [
      r('documento_soporte'),
      siNo(politica.contabilidad.documento_soporte_cuidador),
    ],
    [r('cierre_equipo'), siNo(politica.entrega.cobrar_si_cierra_equipo)],
    [r('ventana_reclamo'), `${politica.entrega.ventana_reclamo_horas} h`],
    [
      r('cierre_auto'),
      politica.entrega.cierre_automatico_horas > 0
        ? t(
            politica.entrega.cierre_automatico_requiere_evidencia
              ? 'admin:politica.resumen.cierre_auto_evidencia'
              : 'admin:politica.resumen.cierre_auto_valor',
            { horas: politica.entrega.cierre_automatico_horas }
          )
        : r('apagado'),
    ],
  ]

  return (
    <View>
      <Text style={estilosAdmin.vigente}>
        {t('admin:politica.vigente', { version: politica.version })}
      </Text>
      {filas.map(([etiqueta, valor]) => (
        <View key={etiqueta} style={styles.fila}>
          <Text style={estilosAdmin.ayuda}>{etiqueta}</Text>
          <Text style={styles.valor}>{valor}</Text>
        </View>
      ))}
      <VistaPrevia politica={politica} />
      <Text style={[estilosAdmin.label, styles.historial]}>
        {t('admin:politica.ultimas_versiones')}
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
