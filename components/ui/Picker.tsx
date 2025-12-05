import React, { useState } from 'react'
import {
  StyleSheet,
  Text,
  View,
  ViewStyle,
  Modal,
  Pressable,
  ScrollView,
} from 'react-native'
import { COLOR } from '@/constants'
import Icon from './Icon'

interface PickerOption {
  label: string
  value: string
}

interface PickerProps {
  label?: string
  value: string
  onValueChange: (value: string) => void
  options: PickerOption[]
  placeholder?: string
  errorText?: string
  style?: ViewStyle | ViewStyle[]
  testID?: string
  disabled?: boolean
}

/**
 * Picker: Componente de selección dropdown con diseño PetPals
 */
const Picker: React.FC<PickerProps> = ({
  label,
  value,
  onValueChange,
  options,
  placeholder = 'Selecciona una opción',
  errorText,
  style,
  testID,
  disabled = false,
}) => {
  const [modalVisible, setModalVisible] = useState(false)

  const selectedOption = options.find(opt => opt.value === value)
  const displayText = selectedOption?.label || placeholder

  const containerStyle: ViewStyle | ViewStyle[] = [
    styles.container,
    ...(Array.isArray(style) ? style : style ? [style] : []),
  ]

  const borderColor = errorText ? COLOR.ERROR : COLOR.BORDE

  return (
    <View style={containerStyle} testID={testID}>
      {label && <Text style={styles.label}>{label}</Text>}

      <Pressable
        onPress={() => !disabled && setModalVisible(true)}
        style={[
          styles.input,
          { borderColor },
          disabled && styles.inputDisabled,
        ]}
        accessibilityLabel={label}
        accessibilityRole="button"
        accessibilityState={{ disabled }}
      >
        <Text
          style={[
            styles.inputText,
            !selectedOption && styles.placeholderText,
            disabled && styles.textDisabled,
          ]}
          numberOfLines={1}
        >
          {displayText}
        </Text>
        <Icon
          name="chevron-down"
          size={16}
          color={disabled ? COLOR.INACTIVO : COLOR.SUBTEXTO}
        />
      </Pressable>

      {errorText && <Text style={styles.error}>{errorText}</Text>}

      {/* Modal de selección */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
        statusBarTranslucent
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setModalVisible(false)}
        >
          <Pressable
            style={styles.modalContent}
            onPress={e => e.stopPropagation()}
          >
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{label || 'Selecciona'}</Text>
              <Pressable
                onPress={() => setModalVisible(false)}
                style={styles.closeButton}
                hitSlop={8}
              >
                <Icon name="times" size={20} color={COLOR.TEXTO} />
              </Pressable>
            </View>

            <ScrollView style={styles.optionsList}>
              {options.map(option => {
                const isSelected = option.value === value
                return (
                  <Pressable
                    key={option.value}
                    onPress={() => {
                      onValueChange(option.value)
                      setModalVisible(false)
                    }}
                    style={({ pressed }) => [
                      styles.option,
                      isSelected && styles.optionSelected,
                      pressed && styles.optionPressed,
                    ]}
                    android_ripple={{ color: 'rgba(54, 199, 161, 0.1)' }}
                  >
                    <Text
                      style={[
                        styles.optionText,
                        isSelected && styles.optionTextSelected,
                      ]}
                    >
                      {option.label}
                    </Text>
                    {isSelected && (
                      <Icon name="check" size={18} color={COLOR.ENFASIS} />
                    )}
                  </Pressable>
                )
              })}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 14,
  },
  label: {
    color: COLOR.SUBTEXTO,
    marginBottom: 6,
    fontSize: 13,
    fontWeight: '600',
  },
  input: {
    height: 48,
    backgroundColor: COLOR.BLOQUE,
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  inputDisabled: {
    backgroundColor: COLOR.INACTIVO,
    opacity: 0.6,
  },
  inputText: {
    flex: 1,
    fontSize: 15,
    color: COLOR.TEXTO,
  },
  placeholderText: {
    color: COLOR.SUBTEXTO,
  },
  textDisabled: {
    color: COLOR.SUBTEXTO,
  },
  error: {
    color: COLOR.ERROR,
    marginTop: 6,
    fontSize: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: COLOR.BASE,
    borderRadius: 12,
    width: '100%',
    maxWidth: 400,
    maxHeight: '70%',
    borderWidth: 1,
    borderColor: COLOR.BORDE,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLOR.BORDE,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLOR.TEXTO,
  },
  closeButton: {
    padding: 4,
  },
  optionsList: {
    maxHeight: 400,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLOR.BORDE,
  },
  optionSelected: {
    backgroundColor: `${COLOR.ENFASIS}15`,
  },
  optionPressed: {
    backgroundColor: COLOR.SECUNDARIO,
  },
  optionText: {
    fontSize: 15,
    color: COLOR.TEXTO,
  },
  optionTextSelected: {
    color: COLOR.ENFASIS,
    fontWeight: '600',
  },
})

export default Picker
