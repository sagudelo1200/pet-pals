import React, { useState } from 'react'
import { Modal, View, StyleSheet } from 'react-native'
import { Text as GalioText } from 'galio-framework'
import { TextInput, Button } from '@/components/ui'
import { COLOR } from '@/constants'
import { useTranslation } from 'react-i18next'
import { obtenerErrorCelularI18n } from '@/logic/usuarios'

interface Props {
  visible: boolean
  onClose: () => void
  onCelularConfirmado: (_celular: string) => void
  cargando?: boolean
  titulo?: string
  descripcion?: string
}

export const ModalCompletarCelular: React.FC<Props> = ({
  visible,
  onClose,
  onCelularConfirmado,
  cargando = false,
  titulo,
  descripcion,
}) => {
  const { t } = useTranslation()
  const [celular, setCelular] = useState('')

  const errorI18n = obtenerErrorCelularI18n(celular)
  const errorMensaje: string | undefined = errorI18n
    ? (t(errorI18n.key, errorI18n.params) as string)
    : undefined
  const esValido = !errorI18n && celular.length > 0

  const handleConfirmar = () => {
    if (!esValido) return
    onCelularConfirmado(celular)
    setCelular('')
  }

  const handleCerrar = () => {
    setCelular('')
    onClose()
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleCerrar}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Título */}
          <GalioText bold size={18} color={COLOR.TEXTO}>
            {titulo || t('usuarios.perfil.celular.titulo_modal')}
          </GalioText>

          {/* Descripción */}
          <GalioText
            size={14}
            color={COLOR.SUBTEXTO}
            style={styles.descripcion}
          >
            {descripcion || t('usuarios.perfil.celular.descripcion_modal')}
          </GalioText>

          {/* Input celular */}
          <TextInput
            label={t('usuarios.perfil.celular.label')}
            value={celular}
            onChangeText={setCelular}
            placeholder={t('usuarios.perfil.celular.placeholder')}
            errorText={errorMensaje}
            keyboardType="phone-pad"
            style={styles.input}
          />

          {/* Botones */}
          <View style={styles.botones}>
            <Button
              title={t('comun.cancelar')}
              onPress={handleCerrar}
              variant="contorno"
              disabled={cargando}
              style={styles.botonSecundario}
            />

            <Button
              title={cargando ? '...' : t('comun.continuar')}
              onPress={handleConfirmar}
              variant={esValido ? 'primario' : 'inactivo'}
              disabled={!esValido || cargando}
              style={styles.botonPrimario}
            />
          </View>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    backgroundColor: COLOR.HUESO,
    borderRadius: 12,
    padding: 20,
    width: '85%',
    maxWidth: 400,
  },
  descripcion: {
    marginTop: 12,
    marginBottom: 20,
    lineHeight: 20,
  },
  input: {
    marginBottom: 20,
  },
  botones: {
    flexDirection: 'row',
    gap: 12,
  },
  botonSecundario: {
    flex: 1,
  },
  botonPrimario: {
    flex: 1,
  },
})
