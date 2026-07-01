import React from 'react'
import {
  View,
  StyleSheet,
  TextInput,
  Pressable,
  ActivityIndicator,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Icon } from '@/components/ui'
import { COLOR } from '@/constants'

interface InputFooterProps {
  inputRef: React.RefObject<TextInput>
  contenido: string
  setContenido: (text: string) => void
  handleEnviar: () => Promise<void>
  enviando: boolean
  conversacion: any
}

export const InputFooter: React.FC<InputFooterProps> = ({
  inputRef,
  contenido,
  setContenido,
  handleEnviar,
  enviando,
  conversacion,
}) => {
  const insets = useSafeAreaInsets()

  return (
    <View
      style={[styles.inputContainer, { paddingBottom: insets.bottom + 42 }]}
    >
      <TextInput
        ref={inputRef}
        placeholder="Escribe un mensaje..."
        placeholderTextColor={COLOR.SUBTEXTO}
        value={contenido}
        onChangeText={setContenido}
        multiline
        maxLength={500}
        style={styles.input}
        editable={!enviando && !!conversacion}
      />
      <Pressable
        onPress={handleEnviar}
        disabled={enviando || !contenido.trim() || !conversacion}
        style={({ pressed }) => [
          styles.botonEnviar,
          (enviando || !contenido.trim() || !conversacion) &&
            styles.botonDeshabilitado,
          pressed &&
            !enviando &&
            contenido.trim() &&
            conversacion &&
            styles.botonPresionado,
        ]}
      >
        {enviando ? (
          <ActivityIndicator size="small" color={COLOR.BASE} />
        ) : (
          <Icon name="paper-plane" size={20} color={COLOR.BASE} />
        )}
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: COLOR.BORDE,
    backgroundColor: COLOR.BLOQUE,
    gap: 8,
  },
  input: {
    flex: 1,
    backgroundColor: COLOR.BASE,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    minHeight: 40,
    maxHeight: 100,
    color: COLOR.TEXTO,
    fontSize: 14,
  },
  botonEnviar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLOR.ENFASIS,
    justifyContent: 'center',
    alignItems: 'center',
  },
  botonPresionado: {
    opacity: 0.7,
  },
  botonDeshabilitado: {
    backgroundColor: COLOR.SUBTEXTO,
    opacity: 0.5,
  },
})
