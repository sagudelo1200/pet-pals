import React, { useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  Alert,
  ScrollView,
  TextInput,
} from 'react-native'
import { COLOR } from '@/constants'
import { Button } from '@/components/ui'
import { ServicioPublicarConsentimiento } from '@/services/firebase/consentimientos/publicarNuevaVersion'

const AdminDashboard: React.FC = () => {
  const [cargando, setCargando] = useState(false)
  const [tipoDocumento, setTipoDocumento] = useState('DATOS_PERSONALES')
  const [titulo, setTitulo] = useState(
    'Tratamiento de Datos Personales v2 (Actualizado)'
  )
  const [contenido, setContenido] = useState('')

  const publicarNuevaVersion = async () => {
    if (!contenido.trim()) {
      Alert.alert('Error', 'El contenido es requerido')
      return
    }

    setCargando(true)
    try {
      const resultado =
        await ServicioPublicarConsentimiento.publicarNuevaVersion(
          tipoDocumento,
          contenido,
          titulo
        )

      if (resultado.exito) {
        Alert.alert(
          '✅ Éxito',
          `Documento ${resultado.documento_id} v${resultado.version} publicado exitosamente.\n\n` +
            'Los usuarios que aceptaron versiones anteriores verán: "⚠️ Nueva versión disponible"'
        )
        setContenido('')
      } else {
        Alert.alert('❌ Error', resultado.error || 'Error desconocido')
      }
    } catch (error) {
      Alert.alert(
        '❌ Error',
        `Error: ${error instanceof Error ? error.message : 'Error desconocido'}`
      )
    } finally {
      setCargando(false)
    }
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.titulo}>Panel de Administración</Text>
      <Text style={styles.subtitulo}>
        Publicar Nueva Versión de Consentimiento
      </Text>

      <View style={styles.form}>
        <Text style={styles.label}>Tipo de Documento</Text>
        <TextInput
          style={styles.input}
          value={tipoDocumento}
          onChangeText={setTipoDocumento}
          editable={false}
          placeholderTextColor={COLOR.SUBTEXTO}
        />

        <Text style={styles.label}>Título</Text>
        <TextInput
          style={styles.input}
          value={titulo}
          onChangeText={setTitulo}
          placeholder="Título del documento"
          placeholderTextColor={COLOR.SUBTEXTO}
        />

        <Text style={styles.label}>Contenido (Markdown)</Text>
        <TextInput
          style={[styles.input, styles.textAreaInput]}
          value={contenido}
          onChangeText={setContenido}
          placeholder="Escribe el contenido del documento..."
          placeholderTextColor={COLOR.SUBTEXTO}
          multiline
          numberOfLines={12}
          textAlignVertical="top"
        />

        <Button
          title={cargando ? 'Publicando...' : 'Publicar Nueva Versión'}
          onPress={publicarNuevaVersion}
          variant="primario"
          disabled={cargando}
        />

        <Text style={styles.ayuda}>
          📝 Al publicar una nueva versión:
          {'\n'}• La versión anterior se marca como inactiva
          {'\n'}• Los usuarios ven "⚠️ Nueva versión disponible"
          {'\n'}• Se dispara sincronización en tiempo real
        </Text>
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLOR.BASE,
    padding: 24,
  },
  titulo: {
    fontSize: 22,
    fontWeight: '700',
    color: COLOR.TEXTO,
    marginBottom: 8,
    marginTop: 20,
  },
  subtitulo: {
    fontSize: 15,
    color: COLOR.SUBTEXTO,
    marginBottom: 24,
  },
  form: {
    marginBottom: 32,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: COLOR.TEXTO,
    marginBottom: 8,
    marginTop: 16,
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
    marginBottom: 12,
  },
  textAreaInput: {
    paddingVertical: 12,
    height: 180,
  },
  ayuda: {
    fontSize: 12,
    color: COLOR.SUBTEXTO,
    marginTop: 16,
    padding: 12,
    backgroundColor: COLOR.BLOQUE,
    borderRadius: 8,
    lineHeight: 18,
  },
})

export default AdminDashboard
