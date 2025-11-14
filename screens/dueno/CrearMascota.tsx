import React, { useState } from 'react'
import { Modal, StyleSheet, View, Text, Alert, Pressable } from 'react-native'
import { COLOR } from '@/constants'
import TextInput from '@/components/ui/TextInput'
import Button from '@/components/ui/Button'
import { ServicioMascota } from '@/services/firebase'
import type { Mascota } from '@/models/Mascota'

interface Props {
  visible: boolean
  onClose: () => void
  onCreated?: () => void
}

const CrearMascota: React.FC<Props> = ({ visible, onClose, onCreated }) => {
  const [nombre, setNombre] = useState('')
  const [especie, setEspecie] = useState('perro')
  const [descripcion, setDescripcion] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | undefined>()

  const handleSave = async () => {
    setError(undefined)
    const trimmed = nombre.trim()
    if (trimmed.length < 2) {
      setError('El nombre debe tener al menos 2 caracteres')
      return
    }

    setLoading(true)
    try {
      const payload: Partial<Mascota> = {
        nombre: trimmed,
        especie: especie as any,
        descripcion: descripcion || undefined,
      }
      const res = await ServicioMascota.crear(payload as any)
      if (res.success) {
        onCreated?.()
        onClose()
      } else {
        Alert.alert('Error', String(res.error))
      }
    } catch (err) {
      Alert.alert('Error', 'No se pudo crear la mascota')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
      transparent
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.panel} onPress={() => {}}>
          <Text style={styles.title}>Crear mascota</Text>
          <View style={styles.form}>
            <TextInput
              label="Nombre"
              value={nombre}
              onChangeText={setNombre}
              placeholder="Nombre de la mascota"
            />
            <TextInput
              label="Especie"
              value={especie}
              onChangeText={setEspecie}
              placeholder="perro / gato / otro"
            />
            <TextInput
              label="Descripción"
              value={descripcion}
              onChangeText={setDescripcion}
              placeholder="Notas sobre la mascota"
            />
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <View style={styles.actions}>
              <Button title="Cancelar" variant="bloque" onPress={onClose} />
              <Button title="Guardar" onPress={handleSave} loading={loading} />
            </View>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  panel: {
    backgroundColor: COLOR.BASE,
    padding: 16,
    paddingTop: 20,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: COLOR.TEXTO,
    marginBottom: 12,
  },
  form: {
    marginTop: 8,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  error: {
    color: COLOR.ERROR,
    marginTop: 8,
  },
})

export default CrearMascota
