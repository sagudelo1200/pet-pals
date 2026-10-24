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

const DIAS = [
  'Domingo',
  'Lunes',
  'Martes',
  'Miércoles',
  'Jueves',
  'Viernes',
  'Sábado',
]

// Campos numéricos editables: clave → [etiqueta, ayuda]
const CAMPOS = {
  base_por_hora: ['Precio por hora (COP)', 'Paseo de 1 mascota, 60 minutos'],
  mascota_adicional: ['Recargo por mascota adicional (COP/hora)', ''],
  porcentaje_plataforma: [
    'Comisión Paw-Path (%)',
    'El resto es para el cuidador',
  ],
  porcentaje_iva: [
    'IVA sobre la comisión (%)',
    'Solo grava la comisión, no el dinero del cuidador',
  ],
  plazo_pago_horas: [
    'Plazo para pagar (horas)',
    'Desde que finaliza el paseo; luego se envían recordatorios',
  ],
  bloqueo_tras_horas: [
    'Bloquear tras (horas)',
    'Sin pagar, el tutor no puede pedir nuevos paseos',
  ],
  max_recordatorios: ['Máximo de recordatorios', ''],
  intervalo_recordatorios_horas: ['Horas entre recordatorios', ''],
  horario_desde: ['Recordatorios desde (hora 0-23)', 'Hora de Colombia'],
  horario_hasta: ['Recordatorios hasta (hora 1-24)', ''],
  dia_corte: [
    'Día de corte (0=domingo … 6=sábado)',
    'El periodo cierra a las 23:59',
  ],
  dia_pago: [
    'Día de pago (0=domingo … 6=sábado)',
    'Informativo para el cuidador',
  ],
  monto_minimo: [
    'Monto mínimo a liquidar (COP)',
    'Si no se alcanza, pasa a la semana siguiente',
  ],
  ventana_reclamo_horas: [
    'Ventana de reclamo (horas)',
    'Tiempo del tutor para reclamar un cobro cerrado por el equipo',
  ],
  cierre_automatico_horas: [
    'Cierre automático tras (horas, 0 = apagado)',
    'Cierra la entrega sin confirmar solo, desde que el cuidador finaliza',
  ],
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
}) => (
  <View style={styles.vistaPrevia}>
    <Text style={estilosAdmin.label}>Vista previa (paseo de 1 hora)</Text>
    {[1, 2].map(mascotas => {
      const d = desglosarPaseo(politica, mascotas, 60)
      return (
        <Text key={mascotas} style={estilosAdmin.ayuda}>
          {mascotas} {mascotas === 1 ? 'mascota' : 'mascotas'}: tutor paga{' '}
          {formatearCOP(d.valor_acordado)} · cuidador recibe{' '}
          {formatearCOP(d.recursos_administrados)} · Paw-Path{' '}
          {formatearCOP(d.comision_base)} + IVA {formatearCOP(d.iva_comision)}
        </Text>
      )
    })}
  </View>
)

export const FormularioPoliticaComercial: React.FC = () => {
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
        r.nueva ? '✅ Publicada' : 'Sin cambios',
        r.nueva
          ? `Política comercial v${r.version} vigente desde ahora.`
          : 'Los valores son iguales a la versión vigente; no se creó versión.'
      )
      if (r.nueva) setMotivo('')
    } catch (e) {
      Alert.alert('❌ No se publicó', mensajeErrorCallable(e))
    } finally {
      setPublicando(false)
    }
  }

  if (cargando)
    return <Text style={estilosAdmin.ayuda}>Cargando política…</Text>
  if (!politica || !form || !opciones || !borrador) {
    return (
      <Text style={estilosAdmin.ayuda}>
        {error || 'No hay política publicada'}. Crea la versión 1 con `npm run
        seed:base`.
      </Text>
    )
  }

  return (
    <View>
      <Text style={estilosAdmin.vigente}>
        Vigente: versión {politica.version}
      </Text>
      {(Object.keys(CAMPOS) as Campo[]).map(campo => {
        const [etiqueta, ayuda] = CAMPOS[campo]
        const esDia = campo === 'dia_corte' || campo === 'dia_pago'
        const dia = DIAS[Number(form[campo])]
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
        label="Cobrar IVA sobre la comisión"
        description="Si Paw-Path es responsable de IVA"
      />
      <Switch
        value={opciones.ivaIncluido}
        onValueChange={v => setOpciones({ ...opciones, ivaIncluido: v })}
        label="IVA incluido en el precio"
        description="Si se desactiva, el IVA se suma al precio que paga el tutor"
      />
      <Switch
        value={opciones.soloRecaudadas}
        onValueChange={v => setOpciones({ ...opciones, soloRecaudadas: v })}
        label="Liquidar solo paseos ya pagados por el tutor"
        description="Si se desactiva, Paw-Path paga al cuidador aunque el tutor no haya pagado"
      />
      <Switch
        value={opciones.documentoSoporte}
        onValueChange={v => setOpciones({ ...opciones, documentoSoporte: v })}
        label="Documento soporte al pagar a cuidadores"
        description="Para cuidadores no obligados a facturar (DIAN)"
      />
      <Switch
        value={opciones.cobrarSiCierraEquipo}
        onValueChange={v =>
          setOpciones({ ...opciones, cobrarSiCierraEquipo: v })
        }
        label="El equipo puede cerrar una entrega sin confirmar y cobrar"
        description="Si el tutor no confirma, el equipo cierra a favor del cuidador y se genera el cobro (el tutor puede reclamar)"
      />
      <Switch
        value={opciones.cierreRequiereEvidencia}
        onValueChange={v =>
          setOpciones({ ...opciones, cierreRequiereEvidencia: v })
        }
        label="El cierre automático exige evidencia"
        description="Foto del grupo subida por el cuidador"
      />
      {errores.length > 0 ? (
        <Text style={estilosAdmin.errores}>{errores.join('\n')}</Text>
      ) : (
        <VistaPrevia politica={borrador} />
      )}
      <CampoMotivo value={motivo} onChange={setMotivo} />
      <View style={estilosAdmin.acciones}>
        <Button
          title={publicando ? 'Publicando…' : 'Publicar nueva versión'}
          onPress={publicar}
          variant="primario"
          disabled={
            publicando || errores.length > 0 || validarMotivo(motivo) !== null
          }
        />
      </View>

      <Text style={[estilosAdmin.label, styles.historial]}>
        Últimas versiones
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
