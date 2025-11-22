import React, { useState } from 'react'
import { StyleSheet, Text, View, ViewStyle, Modal, Pressable, Platform } from 'react-native'
import { COLOR } from '@/constants'
import Icon from './Icon'
import DateTimePicker from '@react-native-community/datetimepicker'

interface DatePickerProps {
  label?: string
  value?: Date
  onValueChange: (date: Date) => void
  placeholder?: string
  errorText?: string
  style?: ViewStyle | ViewStyle[]
  testID?: string
  disabled?: boolean
  maximumDate?: Date
  minimumDate?: Date
}

/**
 * DatePicker: Componente de selección de fecha con diseño PetPals
 */
const DatePicker: React.FC<DatePickerProps> = ({
  label,
  value,
  onValueChange,
  placeholder = 'Selecciona una fecha',
  errorText,
  style,
  testID,
  disabled = false,
  maximumDate,
  minimumDate,
}) => {
  const [showPicker, setShowPicker] = useState(false)
  const [tempDate, setTempDate] = useState<Date>(value || new Date())

  const formatDate = (date?: Date): string => {
    if (!date) return placeholder
    
    const day = date.getDate().toString().padStart(2, '0')
    const month = (date.getMonth() + 1).toString().padStart(2, '0')
    const year = date.getFullYear()
    
    return `${day}/${month}/${year}`
  }

  const handleDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowPicker(false)
    }
    
    if (selectedDate) {
      setTempDate(selectedDate)
      if (Platform.OS === 'android') {
        onValueChange(selectedDate)
      }
    }
  }

  const handleConfirm = () => {
    onValueChange(tempDate)
    setShowPicker(false)
  }

  const handleCancel = () => {
    setTempDate(value || new Date())
    setShowPicker(false)
  }

  const containerStyle: ViewStyle | ViewStyle[] = [
    styles.container,
    ...(Array.isArray(style) ? style : style ? [style] : []),
  ]

  const borderColor = errorText ? COLOR.ERROR : COLOR.BORDE

  return (
    <View style={containerStyle} testID={testID}>
      {label && <Text style={styles.label}>{label}</Text>}
      
      <Pressable
        onPress={() => !disabled && setShowPicker(true)}
        style={[
          styles.input,
          { borderColor },
          disabled && styles.inputDisabled,
        ]}
        accessibilityLabel={label}
        accessibilityRole="button"
        accessibilityState={{ disabled }}
      >
        <Icon
          name="calendar"
          size={18}
          color={disabled ? COLOR.INACTIVO : COLOR.SUBTEXTO}
          style={styles.icon}
        />
        <Text
          style={[
            styles.inputText,
            !value && styles.placeholderText,
            disabled && styles.textDisabled,
          ]}
        >
          {formatDate(value)}
        </Text>
      </Pressable>

      {errorText && <Text style={styles.error}>{errorText}</Text>}

      {/* Picker nativo de Android */}
      {showPicker && Platform.OS === 'android' && (
        <DateTimePicker
          value={tempDate}
          mode="date"
          display="default"
          onChange={handleDateChange}
          maximumDate={maximumDate}
          minimumDate={minimumDate}
        />
      )}

      {/* Modal para iOS */}
      {showPicker && Platform.OS === 'ios' && (
        <Modal
          visible={showPicker}
          transparent
          animationType="fade"
          onRequestClose={handleCancel}
        >
          <Pressable style={styles.modalOverlay} onPress={handleCancel}>
            <Pressable
              style={styles.modalContent}
              onPress={(e) => e.stopPropagation()}
            >
              <View style={styles.modalHeader}>
                <Pressable onPress={handleCancel} style={styles.modalButton}>
                  <Text style={styles.cancelText}>Cancelar</Text>
                </Pressable>
                <Text style={styles.modalTitle}>{label || 'Fecha'}</Text>
                <Pressable onPress={handleConfirm} style={styles.modalButton}>
                  <Text style={styles.confirmText}>Confirmar</Text>
                </Pressable>
              </View>

              <DateTimePicker
                value={tempDate}
                mode="date"
                display="spinner"
                onChange={handleDateChange}
                maximumDate={maximumDate}
                minimumDate={minimumDate}
                textColor={COLOR.TEXTO}
                style={styles.picker}
              />
            </Pressable>
          </Pressable>
        </Modal>
      )}
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
  },
  inputDisabled: {
    backgroundColor: COLOR.INACTIVO,
    opacity: 0.6,
  },
  icon: {
    marginRight: 10,
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
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLOR.BASE,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderWidth: 1,
    borderColor: COLOR.BORDE,
    paddingBottom: 20,
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
    fontSize: 16,
    fontWeight: '600',
    color: COLOR.TEXTO,
  },
  modalButton: {
    padding: 4,
    minWidth: 70,
  },
  cancelText: {
    fontSize: 15,
    color: COLOR.SUBTEXTO,
  },
  confirmText: {
    fontSize: 15,
    color: COLOR.ENFASIS,
    fontWeight: '600',
    textAlign: 'right',
  },
  picker: {
    height: 200,
  },
})

export default DatePicker
