import React, { useState, useEffect } from 'react'
import {
  StyleSheet,
  View,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { useTranslation } from 'react-i18next'
import { COLOR } from '@/constants'
import Screen from '@/components/ui/Screen'
import ScreenHeader from '@/components/ui/ScreenHeader'
import Button from '@/components/ui/Button'
import TextInput from '@/components/ui/TextInput'
import ImagePicker from '@/components/ui/ImagePicker'
import { useAuth } from '@/context/AuthContext'
import { ServicioCrudBase } from '@/services/firebase/crud'
import { PerfilPublico } from '@/models/PerfilPublico'

const PerfilCuidador: React.FC = () => {
  const { t } = useTranslation()
  const navigation = useNavigation()
  const { user } = useAuth()

  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  // Form State
  const [foto, setFoto] = useState('')
  const [biografia, setBiografia] = useState('')
  const [experiencia, setExperiencia] = useState('') // Usaremos este campo para años numéricos en el MVP
  const [tarifa, setTarifa] = useState('')

  useEffect(() => {
    cargarPerfil()
  }, [])

  const cargarPerfil = async () => {
    if (!user) return
    setLoading(true)
    const res = await ServicioCrudBase.obtenerPorId<PerfilPublico>(
      'perfil_publico',
      user.uid
    )

    if (res.success && res.data) {
      const data = res.data
      setFoto(data.foto || '')
      setBiografia(data.biografia || '')
      setExperiencia(data.experiencia || '')
      setTarifa(data.tarifa_por_hora ? data.tarifa_por_hora.toString() : '')
    }
    setLoading(false)
  }

  const handleGuardar = async () => {
    if (!user) return

    // Validaciones básicas
    if (!biografia.trim()) {
      Alert.alert(t('comun:error'), 'La biografía es obligatoria')
      return
    }
    if (!tarifa.trim() || isNaN(Number(tarifa))) {
      Alert.alert(t('comun:error'), 'Ingresa una tarifa válida')
      return
    }

    setSaving(true)

    const updateData: Partial<PerfilPublico> = {
      foto,
      biografia,
      experiencia, // En este MVP lo usamos como texto libre o años
      tarifa_por_hora: Number(tarifa),
    }

    const res = await ServicioCrudBase.actualizar(
      'perfil_publico',
      user.uid,
      updateData
    )

    setSaving(false)

    if (res.success) {
      Alert.alert(t('comun:exito'), t('perfil:editar.exito_guardar'), [
        { text: 'OK', onPress: () => navigation.goBack() },
      ])
    } else {
      Alert.alert(t('comun:error'), res.error || 'Error al guardar')
    }
  }

  return (
    <Screen style={styles.container} includeTopInset>
      <ScreenHeader
        title={t('perfil:editar.titulo')}
        subtitle={t('perfil:editar.subtitulo')}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.section}>
            <ImagePicker
              label={t('perfil:editar.foto_label')}
              value={foto}
              onValueChange={setFoto}
              style={styles.imagePicker}
            />
          </View>

          <TextInput
            label={t('perfil:editar.bio_label')}
            placeholder={t('perfil:editar.bio_placeholder')}
            value={biografia}
            onChangeText={setBiografia}
            style={[styles.input, { height: 100 }]}
            multiline
            numberOfLines={4}
          />

          <View style={styles.row}>
            <TextInput
              label={t('perfil:editar.experiencia_label')}
              placeholder="Ej: 2 años"
              value={experiencia}
              onChangeText={setExperiencia}
              style={[styles.input, { flex: 1, marginRight: 10 }]}
            />

            <TextInput
              label={t('perfil:editar.tarifa_label')}
              placeholder="0"
              value={tarifa}
              onChangeText={setTarifa}
              keyboardType="numeric"
              style={[styles.input, { flex: 1 }]}
            />
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <Button
            title={t('perfil:editar.guardar')}
            onPress={handleGuardar}
            loading={saving}
            disabled={loading}
          />
        </View>
      </KeyboardAvoidingView>
    </Screen>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLOR.BASE,
  },
  content: {
    padding: 20,
    paddingBottom: 100,
  },
  section: {
    marginBottom: 24,
    alignItems: 'center',
  },
  imagePicker: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  input: {
    marginBottom: 20,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: COLOR.BORDE,
    backgroundColor: COLOR.BASE,
  },
})

export default PerfilCuidador
