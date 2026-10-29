/**
 * FormularioPoliticaComercial
 * El admin edita precios, comisión, cobro y liquidación y publica una nueva
 * versión con su motivo. Antes de publicar muestra cuánto pagaría el tutor
 * y cuánto recibiría el cuidador. La validación definitiva la hace el
 * servidor (publicarVersion); publicar lo mismo no crea versión y las
 * operaciones ya creadas conservan la versión con la que nacieron.
 */
import React, { useEffect, useState } from 'react'
import { View, Text, TextInput, StyleSheet, Alert } from 'react-native'
import { COLOR } from '@/constants'
import { useTranslation } from 'react-i18next'
import { Button, Switch } from '@/components/ui'
import { usePoliticaComercial } from '@/hooks/comercial'
import { desglosarPaseo, formatearCOP } from '@/logic/comercial'
import { ServicioVersionado } from '@/services/firebase/versionado'
import { mensajeErrorCallable } from '@/services/firebase/callable'
import {
  TIPO_POLITICA_COMERCIAL,
  validarMotivo,
} from '@/functions/src/compartido/versionables'
import { validarPolitica } from '@/functions/src/compartido/politicaComercial'
import type {
  DatosPoliticaComercial,
  PoliticaComercial,
} from '@/models/operacionesEconomicas'
import { CampoMotivo } from './CampoMotivo'
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

// Campos numéricos editables: clave → si tiene texto de ayuda
// (etiquetas y ayudas en `admin:politica.campos.<clave>`)
const CAMPOS = {
  base_por_hora: true,
  mascota_adicional: false,
  porcentaje_plataforma: true,
  porcentaje_iva: true,
  plazo_pago_horas: true,
  bloqueo_tras_horas: true,
  max_recordatorios: false,
  intervalo_recordatorios_horas: false,
  horario_desde: true,
  horario_hasta: false,
  dia_corte: true,
  dia_pago: true,
  monto_minimo: true,
  ventana_reclamo_horas: true,
  cierre_automatico_horas: true,
} as const

type Campo = keyof typeof CAMPOS

function aFormulario(p: PoliticaComercial): Record<Campo, string> {
  const { precio, comision } = p.por_tipo.paseo
  return {
    base_por_hora: String(precio.base_por_hora),
    mascota_adicional: String(precio.mascota_adicional),
    porcentaje_plataforma: String(comision.porcentaje_plataforma),
    porcentaje_iva: String(p.impuestos.iva_comision.porcentaje),
    plazo_pago_horas: String(p.cobro.plazo_pago_horas),
    bloqueo_tras_horas: String(p.cobro.bloqueo_tras_horas),
    max_recordatorios: String(p.cobro.max_recordatorios),
    intervalo_recordatorios_horas: String(
      p.cobro.intervalo_recordatorios_horas
    ),
    horario_desde: String(p.cobro.horario_recordatorios.desde),
    horario_hasta: String(p.cobro.horario_recordatorios.hasta),
    dia_corte: String(p.liquidacion.dia_corte),
    dia_pago: String(p.liquidacion.dia_pago),
    monto_minimo: String(p.liquidacion.monto_minimo),
    ventana_reclamo_horas: String(p.entrega.ventana_reclamo_horas),
    cierre_automatico_horas: String(p.entrega.cierre_automatico_horas),
  }
}

interface Opciones {
  soloRecaudadas: boolean
  ivaAplica: boolean
  ivaIncluido: boolean
  documentoSoporte: boolean
  cobrarSiCierraEquipo: boolean
  cierreRequiereEvidencia: boolean
}

function aOpciones(p: PoliticaComercial): Opciones {
  return {
    soloRecaudadas: p.liquidacion.solo_recaudadas,
    ivaAplica: p.impuestos.iva_comision.aplica,
    ivaIncluido: p.impuestos.iva_comision.incluido_en_precio,
    documentoSoporte: p.contabilidad.documento_soporte_cuidador,
    cobrarSiCierraEquipo: p.entrega.cobrar_si_cierra_equipo,
    cierreRequiereEvidencia: p.entrega.cierre_automatico_requiere_evidencia,
  }
}

function aPolitica(
  f: Record<Campo, string>,
  o: Opciones
): DatosPoliticaComercial {
  const n = (c: Campo) => Number(f[c].replace(',', '.'))
  return {
    por_tipo: {
      paseo: {
        precio: {
          base_por_hora: n('base_por_hora'),
          mascota_adicional: n('mascota_adicional'),
        },
        comision: { porcentaje_plataforma: n('porcentaje_plataforma') },
      },
    },
    impuestos: {
      iva_comision: {
        aplica: o.ivaAplica,
        porcentaje: n('porcentaje_iva'),
        incluido_en_precio: o.ivaIncluido,
      },
    },
    cobro: {
      plazo_pago_horas: n('plazo_pago_horas'),
      bloqueo_tras_horas: n('bloqueo_tras_horas'),
      max_recordatorios: n('max_recordatorios'),
      intervalo_recordatorios_horas: n('intervalo_recordatorios_horas'),
      horario_recordatorios: {
        desde: n('horario_desde'),
        hasta: n('horario_hasta'),
      },
    },
    liquidacion: {
      frecuencia: 'SEMANAL',
      dia_corte: n('dia_corte'),
      dia_pago: n('dia_pago'),
      monto_minimo: n('monto_minimo'),
      solo_recaudadas: o.soloRecaudadas,
    },
    contabilidad: { documento_soporte_cuidador: o.documentoSoporte },
    entrega: {
      ventana_reclamo_horas: n('ventana_reclamo_horas'),
      cobrar_si_cierra_equipo: o.cobrarSiCierraEquipo,
      cierre_automatico_horas: n('cierre_automatico_horas'),
      cierre_automatico_requiere_evidencia: o.cierreRequiereEvidencia,
    },
  }
}

/** Vista previa: paseo de 1 hora con 1 y con 2 mascotas. */
export const VistaPrevia: React.FC<{ politica: DatosPoliticaComercial }> = ({
  politica,
}) => {
  const { t } = useTranslation('admin')
  return (
    <View style={styles.vistaPrevia}>
      <Text style={estilosAdmin.label}>
        {t('politica.vista_previa.titulo')}
      </Text>
      {[1, 2].map(mascotas => {
        const d = desglosarPaseo(politica, mascotas, 60)
        return (
          <Text key={mascotas} style={estilosAdmin.ayuda}>
            {t('politica.vista_previa.linea', {
              count: mascotas,
              tutor: formatearCOP(d.valor_acordado),
              cuidador: formatearCOP(d.recursos_administrados),
              comision: formatearCOP(d.comision_base),
              iva: formatearCOP(d.iva_comision),
            })}
          </Text>
        )
      })}
    </View>
  )
}

export const FormularioPoliticaComercial: React.FC = () => {
  const { t } = useTranslation(['admin', 'comun'])
  const { politica, cargando, error } = usePoliticaComercial()
  const [form, setForm] = useState<Record<Campo, string> | null>(null)
  const [opciones, setOpciones] = useState<Opciones | null>(null)
  const [motivo, setMotivo] = useState('')
  const [publicando, setPublicando] = useState(false)

  // Cargar la versión vigente al abrir (y tras publicar)
  useEffect(() => {
    if (politica) {
      setForm(aFormulario(politica))
      setOpciones(aOpciones(politica))
    }
  }, [politica])

  const borrador = form && opciones ? aPolitica(form, opciones) : null
  const errores = borrador ? validarPolitica(borrador) : []

  const publicar = async () => {
    if (!borrador) return
    setPublicando(true)
    try {
      const r = await ServicioVersionado.publicar({
        tipo: TIPO_POLITICA_COMERCIAL,
        contenido: borrador,
        motivo,
      })
      Alert.alert(
        r.nueva
          ? t('admin:politica.publicada')
          : t('admin:politica.sin_cambios'),
        r.nueva
          ? t('admin:politica.publicada_desc', { version: r.version })
          : t('admin:politica.sin_cambios_desc')
      )
      if (r.nueva) setMotivo('')
    } catch (e) {
      Alert.alert(t('admin:politica.no_publico'), mensajeErrorCallable(e))
    } finally {
      setPublicando(false)
    }
  }

  if (cargando)
    return (
      <Text style={estilosAdmin.ayuda}>{t('admin:politica.cargando')}</Text>
    )
  if (!politica || !form || !opciones || !borrador) {
    return (
      <Text style={estilosAdmin.ayuda}>
        {error || t('admin:politica.sin_politica')}.
        {t('admin:politica.crear_v1')}
      </Text>
    )
  }

  return (
    <View>
      <Text style={estilosAdmin.vigente}>
        {t('admin:politica.vigente', { version: politica.version })}
      </Text>
      {(Object.keys(CAMPOS) as Campo[]).map(campo => {
        const etiqueta = t(`admin:politica.campos.${campo}.etiqueta`)
        const ayuda = CAMPOS[campo]
          ? t(`admin:politica.campos.${campo}.ayuda`)
          : ''
        const esDia = campo === 'dia_corte' || campo === 'dia_pago'
        const claveDia = DIAS_CLAVES[Number(form[campo])]
        const dia = claveDia
          ? t(`comun:datepicker.dias.${claveDia}`)
          : undefined
        return (
          <View key={campo}>
            <Text style={estilosAdmin.label}>{etiqueta}</Text>
            <TextInput
              style={estilosAdmin.input}
              value={form[campo]}
              onChangeText={v => setForm({ ...form, [campo]: v })}
              keyboardType="numeric"
              placeholderTextColor={COLOR.SUBTEXTO}
            />
            {(ayuda || (esDia && dia)) && (
              <Text style={estilosAdmin.ayudaCampo}>
                {esDia && dia ? `${dia}. ` : ''}
                {ayuda}
              </Text>
            )}
          </View>
        )
      })}
      <Switch
        value={opciones.ivaAplica}
        onValueChange={v => setOpciones({ ...opciones, ivaAplica: v })}
        label={t('admin:politica.opciones.iva_aplica.label')}
        description={t('admin:politica.opciones.iva_aplica.desc')}
      />
      <Switch
        value={opciones.ivaIncluido}
        onValueChange={v => setOpciones({ ...opciones, ivaIncluido: v })}
        label={t('admin:politica.opciones.iva_incluido.label')}
        description={t('admin:politica.opciones.iva_incluido.desc')}
      />
      <Switch
        value={opciones.soloRecaudadas}
        onValueChange={v => setOpciones({ ...opciones, soloRecaudadas: v })}
        label={t('admin:politica.opciones.solo_recaudadas.label')}
        description={t('admin:politica.opciones.solo_recaudadas.desc')}
      />
      <Switch
        value={opciones.documentoSoporte}
        onValueChange={v => setOpciones({ ...opciones, documentoSoporte: v })}
        label={t('admin:politica.opciones.documento_soporte.label')}
        description={t('admin:politica.opciones.documento_soporte.desc')}
      />
      <Switch
        value={opciones.cobrarSiCierraEquipo}
        onValueChange={v =>
          setOpciones({ ...opciones, cobrarSiCierraEquipo: v })
        }
        label={t('admin:politica.opciones.cobrar_si_cierra_equipo.label')}
        description={t('admin:politica.opciones.cobrar_si_cierra_equipo.desc')}
      />
      <Switch
        value={opciones.cierreRequiereEvidencia}
        onValueChange={v =>
          setOpciones({ ...opciones, cierreRequiereEvidencia: v })
        }
        label={t('admin:politica.opciones.cierre_requiere_evidencia.label')}
        description={t(
          'admin:politica.opciones.cierre_requiere_evidencia.desc'
        )}
      />
      {errores.length > 0 ? (
        <Text style={estilosAdmin.errores}>{errores.join('\n')}</Text>
      ) : (
        <VistaPrevia politica={borrador} />
      )}
      <CampoMotivo value={motivo} onChange={setMotivo} />
      <View style={estilosAdmin.acciones}>
        <Button
          title={
            publicando
              ? t('admin:politica.publicando')
              : t('admin:politica.publicar')
          }
          onPress={publicar}
          variant="primario"
          disabled={
            publicando || errores.length > 0 || validarMotivo(motivo) !== null
          }
        />
      </View>

      <Text style={[estilosAdmin.label, styles.historial]}>
        {t('admin:politica.ultimas_versiones')}
      </Text>
      <PanelVersiones tipo={TIPO_POLITICA_COMERCIAL} />
    </View>
  )
}

const styles = StyleSheet.create({
  vistaPrevia: {
    marginTop: 8,
    gap: 4,
  },
  historial: {
    marginTop: 24,
  },
})
