/**
 * ModalReclamoCobro
 * El tutor dice "no estoy de acuerdo" con un cobro que se generó porque el
 * equipo cerró la entrega sin su código. Pide un motivo y abre el reclamo:
 * mientras esté abierto no recibe recordatorios ni se le bloquea por ese cobro.
 */
import React, { useState } from 'react'
import { Modal, View, Text, TextInput, StyleSheet, Alert } from 'react-native'
import { COLOR } from '@/constants'
import { Button } from '@/components/ui'
import { abrirReclamoCobro } from '@/services/firebase/entrega'
import { mensajeErrorCallable } from '@/services/firebase/callable'
import { validarMotivo } from '@/functions/src/compartido/versionables'

interface Props {
  visible: boolean
  obligacionId: string | null
  onCerrar: () => void
}

export const ModalReclamoCobro: React.FC<Props> = ({
  visible,
  obligacionId,
  onCerrar,
}) => {
  const [motivo, setMotivo] = useState('')
  const [enviando, setEnviando] = useState(false)

  const enviar = async () => {
    if (!obligacionId) return
    setEnviando(true)
    try {
      await abrirReclamoCobro({ obligacionId, motivo: motivo.trim() })
      setMotivo('')
      onCerrar()
      Alert.alert(
        'Reclamo enviado',
        'El equipo de Paw-Path lo revisará. Mientras tanto no recibirás recordatorios por este cobro.'
      )
    } catch (e) {
      Alert.alert('No se pudo enviar', mensajeErrorCallable(e))
    } finally {
      setEnviando(false)
    }
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCerrar}
    >
      <View style={styles.fondo}>
        <View style={styles.caja}>
          <Text style={styles.titulo}>No estoy de acuerdo</Text>
          <Text style={styles.texto}>
            Este cobro se generó porque el equipo cerró la entrega del paseo.
            Cuéntanos qué pasó para revisarlo.
          </Text>
          <TextInput
            style={styles.input}
            value={motivo}
            onChangeText={setMotivo}
            placeholder="Ej: mi mascota no fue entregada"
            placeholderTextColor={COLOR.SUBTEXTO}
            multiline
            maxLength={300}
          />
          <View style={styles.acciones}>
            <Button
              title="Cancelar"
              variant="contorno"
              onPress={onCerrar}
              disabled={enviando}
            />
            <Button
              title={enviando ? 'Enviando…' : 'Enviar reclamo'}
              onPress={enviar}
              disabled={enviando || validarMotivo(motivo) !== null}
            />
          </View>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  fondo: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    padding: 24,
  },
  caja: {
    backgroundColor: COLOR.BASE,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: COLOR.BORDE,
  },
  titulo: { fontSize: 18, fontWeight: '700', color: COLOR.TEXTO },
  texto: { fontSize: 13, color: COLOR.SUBTEXTO, marginTop: 8, lineHeight: 18 },
  input: {
    backgroundColor: COLOR.BLOQUE,
    borderColor: COLOR.BORDE,
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
    minHeight: 80,
    textAlignVertical: 'top',
    color: COLOR.TEXTO,
  },
  acciones: { marginTop: 14, gap: 8 },
})
