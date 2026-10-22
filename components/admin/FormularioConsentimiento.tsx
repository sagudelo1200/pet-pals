/**
 * FormularioConsentimiento
 * Publica una nueva versión de un documento legal (términos, datos
 * personales, marketing). Parte de la versión vigente; al publicar, quienes
 * aceptaron la anterior ven que deben reconfirmar.
 */
import React, { useEffect, useState } from 'react'
import { View, Text, TextInput, StyleSheet, Alert } from 'react-native'
import { COLOR } from '@/constants'
import { Button, Chip, Switch } from '@/components/ui'
import {
  TIPOS_CONSENTIMIENTO,
  tipoVersionableConsentimiento,
  validarConsentimiento,
  type ContenidoConsentimiento,
  type TipoDocumentoConsentimiento,
} from '@/functions/src/compartido/consentimiento'
import { validarMotivo } from '@/functions/src/compartido/versionables'
import { CONSENTIMIENTOS_METADATOS } from '@/constants/consentimientos'
import {
  escucharVersionVigente,
  ServicioVersionado,
} from '@/services/firebase/versionado'
import { mensajeErrorCallable } from '@/services/firebase/callable'
import { CampoMotivo } from './CampoMotivo'
import { PanelVersiones } from './PanelVersiones'
import { estilosAdmin } from './estilosAdmin'

const VACIO: ContenidoConsentimiento = {
  titulo: '',
  texto: '',
  es_obligatorio: true,
  roles_requeridos: [],
  requiere_reconfirmacion_meses: null,
}

/** Datos del formulario: meses y roles como texto. */
interface Borrador {
  titulo: string
  texto: string
  es_obligatorio: boolean
  roles: string
  meses: string
}

const aBorrador = (c: ContenidoConsentimiento): Borrador => ({
  titulo: c.titulo,
  texto: c.texto,
  es_obligatorio: c.es_obligatorio,
  roles: c.roles_requeridos.join(', '),
  meses: c.requiere_reconfirmacion_meses?.toString() ?? '',
})

const aContenido = (b: Borrador): ContenidoConsentimiento => ({
  titulo: b.titulo,
  texto: b.texto,
  es_obligatorio: b.es_obligatorio,
  roles_requeridos: b.roles
    .split(',')
    .map(r => r.trim())
    .filter(Boolean),
  requiere_reconfirmacion_meses: b.meses.trim() === '' ? null : Number(b.meses),
})

export const FormularioConsentimiento: React.FC = () => {
  const [tipo, setTipo] = useState<TipoDocumentoConsentimiento>(
    TIPOS_CONSENTIMIENTO[0]
  )
  const [vigente, setVigente] = useState<number | null>(null)
  const [borrador, setBorrador] = useState<Borrador>(aBorrador(VACIO))
  const [motivo, setMotivo] = useState('')
  const [publicando, setPublicando] = useState(false)
  const serie = tipoVersionableConsentimiento(tipo)

  // Partir siempre de la versión vigente del tipo elegido
  useEffect(
    () =>
      escucharVersionVigente<ContenidoConsentimiento>(
        serie,
        v => {
          setVigente(v?.version ?? null)
          setBorrador(aBorrador(v?.contenido ?? VACIO))
        },
        e => Alert.alert('❌ Error', e.message)
      ),
    [serie]
  )

  const errores = validarConsentimiento(aContenido(borrador))

  const publicar = async () => {
    setPublicando(true)
    try {
      const r = await ServicioVersionado.publicar({
        tipo: serie,
        contenido: aContenido(borrador),
        motivo,
      })
      Alert.alert(
        r.nueva ? '✅ Publicada' : 'Sin cambios',
        r.nueva
          ? `${CONSENTIMIENTOS_METADATOS[tipo].titulo} v${r.version} vigente. ` +
            'Quienes aceptaron la anterior deberán reconfirmar.'
          : 'El contenido es igual al vigente; no se creó versión.'
      )
      if (r.nueva) setMotivo('')
    } catch (e) {
      Alert.alert('❌ No se publicó', mensajeErrorCallable(e))
    } finally {
      setPublicando(false)
    }
  }

  return (
    <View>
      <View style={styles.tipos}>
        {TIPOS_CONSENTIMIENTO.map(t => (
          <Chip
            key={t}
            label={CONSENTIMIENTOS_METADATOS[t].titulo}
            size="sm"
            selected={t === tipo}
            onPress={() => setTipo(t)}
          />
        ))}
      </View>
      <Text style={estilosAdmin.vigente}>
        {vigente ? `Vigente: versión ${vigente}` : 'Sin versión publicada'}
      </Text>

      <Text style={estilosAdmin.label}>Título</Text>
      <TextInput
        style={estilosAdmin.input}
        value={borrador.titulo}
        onChangeText={titulo => setBorrador({ ...borrador, titulo })}
        placeholderTextColor={COLOR.SUBTEXTO}
      />

      <Text style={estilosAdmin.label}>Texto (Markdown)</Text>
      <TextInput
        style={[estilosAdmin.input, estilosAdmin.areaTexto]}
        value={borrador.texto}
        onChangeText={texto => setBorrador({ ...borrador, texto })}
        multiline
        textAlignVertical="top"
        placeholderTextColor={COLOR.SUBTEXTO}
      />

      <Text style={estilosAdmin.label}>Roles que lo aceptan</Text>
      <TextInput
        style={estilosAdmin.input}
        value={borrador.roles}
        onChangeText={roles => setBorrador({ ...borrador, roles })}
        placeholder="Vacío = todos (ej: tutor, cuidador)"
        placeholderTextColor={COLOR.SUBTEXTO}
        autoCapitalize="none"
      />

      <Text style={estilosAdmin.label}>Reconfirmar cada (meses)</Text>
      <TextInput
        style={estilosAdmin.input}
        value={borrador.meses}
        onChangeText={meses => setBorrador({ ...borrador, meses })}
        placeholder="Vacío = no requiere reconfirmación"
        keyboardType="number-pad"
        placeholderTextColor={COLOR.SUBTEXTO}
      />

      <Switch
        value={borrador.es_obligatorio}
        onValueChange={es_obligatorio => setBorrador({ ...borrador, es_obligatorio })}
        label="Obligatorio"
        description="Sin aceptarlo no se puede usar la app"
        style={styles.switch}
      />

      <CampoMotivo value={motivo} onChange={setMotivo} />

      {errores.length > 0 && (
        <Text style={estilosAdmin.errores}>{errores.join('\n')}</Text>
      )}
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

      <Text style={[estilosAdmin.label, styles.historial]}>Últimas versiones</Text>
      <PanelVersiones tipo={serie} />
    </View>
  )
}

const styles = StyleSheet.create({
  tipos: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  switch: {
    marginTop: 16,
  },
  historial: {
    marginTop: 24,
  },
})
