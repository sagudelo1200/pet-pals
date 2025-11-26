import React, { useState, useEffect } from 'react'
import {
  Modal,
  StyleSheet,
  View,
  Text,
  Alert,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { COLOR } from '@/constants'
import { TextInput, Button, Icon } from '@/components/ui'
import { ServicioMascota, ServicioAuth } from '@/services/firebase'
import type { Mascota, EspecieMascota } from '@/models/Mascota'
import { useTranslation } from 'react-i18next'
import { useNavigation } from '@react-navigation/native'

interface Props {
  visible: boolean
  onClose: () => void
  onCreated?: () => void
  editingPet?: Mascota
}

const CrearMascota: React.FC<Props> = ({
  visible,
  onClose,
  onCreated,
  editingPet,
}) => {
  const { t } = useTranslation()
  const navigation = useNavigation<any>()
  const isEditing = !!editingPet

  // Basic fields only
  const [nombre, setNombre] = useState('')
  const [especie, setEspecie] = useState<EspecieMascota>('perro')
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Load data when editing (only basic fields)
  useEffect(() => {
    if (editingPet) {
      setNombre(editingPet.nombre || '')
      setEspecie(editingPet.especie || 'perro')
    } else {
      setNombre('')
      setEspecie('perro')
    }
    setErrors({})
  }, [editingPet, visible])

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {}
    if (!nombre.trim())
      newErrors.nombre = t('mascotas:errores.nombre_requerido')
    if (!especie) newErrors.especie = t('mascotas:errores.especie_requerida')
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSave = async () => {
    if (!validate()) return
    setLoading(true)
    try {
      const user = ServicioAuth.obtenerUsuarioActual()
      if (!user) throw new Error(t('comun:errores.NO_AUTENTICADO'))

      const payload: any = {
        nombre: nombre.trim(),
        especie: especie,
        activo: true,
      }

      const res = await ServicioMascota.crear(payload)
      if (res.success) {
        // Try to get the created pet ID if available
        const petId = (res as any).id || (res as any).payload?.id
        Alert.alert(
          t('mascotas:exitoso.titulo'),
          t('mascotas:exitoso.mensaje', { nombre: payload.nombre }),
          [
            {
              text: t('comun:ok'),
              onPress: () => {
                if (petId) {
                  navigation.navigate('DetalleMascota', { petId })
                } else {
                  navigation.navigate('Mascotas')
                }
              },
            },
          ]
        )
        onCreated?.()
        onClose()
      } else {
        Alert.alert(
          t('comun:error'),
          String(res.error) || t('mascotas:errores.error_guardar')
        )
      }
    } catch (e) {
      Alert.alert(
        t('comun:error'),
        e instanceof Error ? e.message : t('mascotas:errores.error_guardar')
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <StatusBar
        backgroundColor="transparent"
        barStyle="dark-content"
        translucent
      />
      <SafeAreaView
        style={styles.safeArea}
        edges={['top', 'bottom', 'left', 'right']}
      >
        <View style={styles.fullScreenBackground}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.keyboardView}
          >
            <Pressable style={styles.overlay} onPress={onClose} />
            <Pressable style={styles.panel} onPress={e => e.stopPropagation()}>
              {/* Header */}
              <View style={styles.header}>
                <Text style={styles.title}>
                  {isEditing
                    ? t('mascotas:formulario.titulo_editar')
                    : t('mascotas:formulario.titulo_crear')}
                </Text>
                <Pressable
                  onPress={onClose}
                  style={styles.closeButton}
                  hitSlop={8}
                >
                  <Icon name="times" size={20} color={COLOR.TEXTO} />
                </Pressable>
              </View>

              <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.form}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
              >
                {/* Name */}
                <TextInput
                  label={t('mascotas:formulario.nombre_label')}
                  value={nombre}
                  onChangeText={setNombre}
                  placeholder={t('mascotas:formulario.nombre_placeholder')}
                  errorText={errors.nombre}
                  autoCapitalize="words"
                />
              </ScrollView>

              <View style={styles.actions}>
                <Button
                  title={t('mascotas:formulario.cancelar')}
                  variant="bloque"
                  onPress={onClose}
                  style={{ flex: 1, marginRight: 8 }}
                />
                <Button
                  title={t('mascotas:formulario.guardar')}
                  onPress={handleSave}
                  loading={loading}
                  style={{ flex: 1, marginLeft: 8 }}
                />
              </View>
            </Pressable>
          </KeyboardAvoidingView>
        </View>
      </SafeAreaView>
    </Modal>
  )
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLOR.BASE },
  fullScreenBackground: { flex: 1, backgroundColor: COLOR.BASE },
  keyboardView: { flex: 1 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' },
  panel: {
    flex: 1,
    backgroundColor: COLOR.BASE,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
    borderWidth: 1,
    borderColor: COLOR.BORDE,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLOR.BORDE,
  },
  title: { fontSize: 22, fontWeight: '700', color: COLOR.TEXTO },
  closeButton: { padding: 4 },
  scrollView: { maxHeight: '60%' },
  form: { padding: 20, paddingTop: 16 },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: COLOR.BORDE,
  },
})

export default CrearMascota
