/**
 * FormularioPoliticaComercial
 * El admin edita precios, comisión, cobro y liquidación y publica una nueva
 * versión. La validación definitiva la hace el servidor
 * (publicarPoliticaComercial); las operaciones ya creadas conservan la
 * versión con la que nacieron.
 */
import React, { useEffect, useState } from 'react'
import { View, Text, TextInput, StyleSheet, Alert } from 'react-native'
import { COLOR } from '@/constants'
import { Button, Switch } from '@/components/ui'
import { usePoliticaComercial } from '@/hooks/comercial'
import {
  ServicioEconomia,
  mensajeErrorEconomia,
} from '@/services/firebase/economia'
import type {
  DatosPoliticaComercial,
  PoliticaComercial,
} from '@/models/operacionesEconomicas'

const DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']

// Campos numéricos editables: clave → [etiqueta, ayuda]
const CAMPOS = {
  base_por_hora: ['Precio por hora (COP)', 'Paseo de 1 mascota, 60 minutos'],
  mascota_adicional: ['Recargo por mascota adicional (COP/hora)', ''],
  porcentaje_plataforma: ['Comisión Paw-Path (%)', 'El resto es para el cuidador'],
  porcentaje_iva: ['IVA sobre la comisión (%)', 'Solo grava la comisión, no el dinero del cuidador'],
  plazo_pago_horas: ['Plazo para pagar (horas)', 'Desde que finaliza el paseo; luego se envían recordatorios'],
  bloqueo_tras_horas: ['Bloquear tras (horas)', 'Sin pagar, el tutor no puede pedir nuevos paseos'],
  max_recordatorios: ['Máximo de recordatorios', ''],
  intervalo_recordatorios_horas: ['Horas entre recordatorios', ''],
  horario_desde: ['Recordatorios desde (hora 0-23)', 'Hora de Colombia'],
  horario_hasta: ['Recordatorios hasta (hora 1-24)', ''],
  dia_corte: ['Día de corte (0=domingo … 6=sábado)', 'El periodo cierra a las 23:59'],
  dia_pago: ['Día de pago (0=domingo … 6=sábado)', 'Informativo para el cuidador'],
  monto_minimo: ['Monto mínimo a liquidar (COP)', 'Si no se alcanza, pasa a la semana siguiente'],
} as const

type Campo = keyof typeof CAMPOS

function aFormulario(p: PoliticaComercial): Record<Campo, string> {
  const { precio, comision } = p.por_tipo.paseo
  return {
    base_por_hora: String(precio.base_por_hora),
    mascota_adicional: String(precio.mascota_adicional),
    porcentaje_plataforma: String(comision.porcentaje_plataforma),
    // Versiones antiguas sin impuestos: se propone el 19 % para completarlas
    porcentaje_iva: String(p.impuestos?.iva_comision.porcentaje ?? 19),
    plazo_pago_horas: String(p.cobro.plazo_pago_horas),
    bloqueo_tras_horas: String(p.cobro.bloqueo_tras_horas),
    max_recordatorios: String(p.cobro.max_recordatorios),
    intervalo_recordatorios_horas: String(p.cobro.intervalo_recordatorios_horas),
    horario_desde: String(p.cobro.horario_recordatorios.desde),
    horario_hasta: String(p.cobro.horario_recordatorios.hasta),
    dia_corte: String(p.liquidacion.dia_corte),
    dia_pago: String(p.liquidacion.dia_pago),
    monto_minimo: String(p.liquidacion.monto_minimo),
  }
}

interface Opciones {
  soloRecaudadas: boolean
  ivaAplica: boolean
  ivaIncluido: boolean
  documentoSoporte: boolean
}

function aOpciones(p: PoliticaComercial): Opciones {
  return {
    soloRecaudadas: p.liquidacion.solo_recaudadas,
    ivaAplica: p.impuestos?.iva_comision.aplica ?? true,
    ivaIncluido: p.impuestos?.iva_comision.incluido_en_precio ?? true,
    documentoSoporte: p.contabilidad?.documento_soporte_cuidador ?? true,
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
      horario_recordatorios: { desde: n('horario_desde'), hasta: n('horario_hasta') },
    },
    liquidacion: {
      frecuencia: 'SEMANAL',
      dia_corte: n('dia_corte'),
      dia_pago: n('dia_pago'),
      monto_minimo: n('monto_minimo'),
      solo_recaudadas: o.soloRecaudadas,
    },
    contabilidad: { documento_soporte_cuidador: o.documentoSoporte },
  }
}

export const FormularioPoliticaComercial: React.FC = () => {
  const { politica, cargando, error } = usePoliticaComercial()
  const [form, setForm] = useState<Record<Campo, string> | null>(null)
  const [opciones, setOpciones] = useState<Opciones | null>(null)
  const [publicando, setPublicando] = useState(false)

  // Cargar la versión vigente al abrir (y tras publicar)
  useEffect(() => {
    if (politica) {
      setForm(aFormulario(politica))
      setOpciones(aOpciones(politica))
    }
  }, [politica])

  const publicar = async () => {
    if (!form || !opciones) return
    setPublicando(true)
    try {
      const { version } = await ServicioEconomia.publicarPolitica(
        aPolitica(form, opciones)
      )
      Alert.alert('✅ Publicada', `Política comercial v${version} vigente desde ahora.`)
    } catch (e) {
      Alert.alert('❌ No se publicó', mensajeErrorEconomia(e))
    } finally {
      setPublicando(false)
    }
  }

  if (cargando) return <Text style={styles.ayuda}>Cargando política…</Text>
  if (!politica || !form || !opciones) {
    return (
      <Text style={styles.ayuda}>
        {error || 'No hay política publicada'}. Crea la versión 1 con
        `npm run seed:politica-comercial`.
      </Text>
    )
  }

  return (
    <View>
      <Text style={styles.vigente}>Vigente: versión {politica.version}</Text>
      {(Object.keys(CAMPOS) as Campo[]).map(campo => {
        const [etiqueta, ayuda] = CAMPOS[campo]
        const esDia = campo === 'dia_corte' || campo === 'dia_pago'
        const dia = DIAS[Number(form[campo])]
        return (
          <View key={campo}>
            <Text style={styles.label}>{etiqueta}</Text>
            <TextInput
              style={styles.input}
              value={form[campo]}
              onChangeText={v => setForm({ ...form, [campo]: v })}
              keyboardType="numeric"
              placeholderTextColor={COLOR.SUBTEXTO}
            />
            {(ayuda || (esDia && dia)) && (
              <Text style={styles.ayudaCampo}>
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
      <Button
        title={publicando ? 'Publicando…' : 'Publicar nueva versión'}
        onPress={publicar}
        variant="primario"
        disabled={publicando}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  vigente: {
    fontSize: 13,
    color: COLOR.EXITO,
    fontWeight: '600',
    marginBottom: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: COLOR.TEXTO,
    marginTop: 12,
    marginBottom: 6,
  },
  input: {
    backgroundColor: COLOR.BLOQUE,
    borderColor: COLOR.BORDE,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: COLOR.TEXTO,
  },
  ayudaCampo: {
    fontSize: 12,
    color: COLOR.SUBTEXTO,
    marginTop: 4,
  },
  ayuda: {
    fontSize: 13,
    color: COLOR.SUBTEXTO,
    lineHeight: 18,
  },
})
