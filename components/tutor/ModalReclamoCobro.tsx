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
import { useTranslation } from 'react-i18next'

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
  const { t } = useTranslation(['tutor', 'comun'])
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
        t('tutor:reclamo.enviado'),
        t('tutor:reclamo.enviado_desc')
      )
    } catch (e) {
      Alert.alert(t('tutor:reclamo.no_enviado'), mensajeErrorCallable(e))
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
          <Text style={styles.titulo}>{t('tutor:obligaciones.no_estoy_de_acuerdo')}</Text>
          <Text style={styles.texto}>
            {t('tutor:reclamo.descripcion')}
          </Text>
          <TextInput
            style={styles.input}
            value={motivo}
            onChangeText={setMotivo}
            placeholder={t('tutor:reclamo.placeholder')}
            placeholderTextColor={COLOR.SUBTEXTO}
            multiline
            maxLength={300}
          />
          <View style={styles.acciones}>
            <Button
              title={t('comun:cancelar')}
              variant="contorno"
              onPress={onCerrar}
              disabled={enviando}
            />
            <Button
              title={
                enviando ? t('tutor:reclamo.enviando') : t('tutor:reclamo.enviar')
              }
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
