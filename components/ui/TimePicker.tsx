import React, { useState } from 'react'
import {
  StyleSheet,
  Text,
  View,
  ViewStyle,
  Modal,
  Pressable,
  Platform,
} from 'react-native'
import { COLOR } from '@/constants'
import Icon from './Icon'
import DateTimePickerNative from '@react-native-community/datetimepicker'

interface TimePickerProps {
  label?: string
  value?: string | null
  // eslint-disable-next-line no-unused-vars
  onValueChange: (time: string) => void
  placeholder?: string
  style?: ViewStyle | ViewStyle[]
}

const formatTimeLabel = (time?: string, placeholder = 'Selecciona hora') => {
  if (!time) return placeholder
  return time
}

const parseTimeToDate = (timeString?: string | null): Date => {
  const now = new Date()
  if (!timeString) return now

  const [hh, mm] = timeString.split(':').map(Number)
  if (isNaN(hh) || isNaN(mm)) return now

  now.setHours(hh, mm, 0, 0)
  return now
}

const TimePicker: React.FC<TimePickerProps> = ({
  label,
  value,
  onValueChange,
  placeholder = 'Selecciona hora',
  style,
}) => {
  const [showPicker, setShowPicker] = useState(false)
  const [tempDate, setTempDate] = useState<Date>(parseTimeToDate(value))

  const containerStyle: ViewStyle | ViewStyle[] = [
    styles.container,
    ...(Array.isArray(style) ? style : style ? [style] : []),
  ]

  const handleOpen = () => {
    setTempDate(parseTimeToDate(value))
    setShowPicker(true)
  }

  const handleNativeChange = (_: any, selected?: Date) => {
    if (Platform.OS === 'android') {
      setShowPicker(false)
    }

    if (selected) {
      setTempDate(selected)
      if (Platform.OS === 'android') {
        const hh = selected.getHours().toString().padStart(2, '0')
        const mm = selected.getMinutes().toString().padStart(2, '0')
        onValueChange(`${hh}:${mm}`)
      }
    }
  }

  const handleConfirm = () => {
    const hh = tempDate.getHours().toString().padStart(2, '0')
    const mm = tempDate.getMinutes().toString().padStart(2, '0')
    onValueChange(`${hh}:${mm}`)
    setShowPicker(false)
  }

  const handleCancel = () => {
    setShowPicker(false)
  }

  return (
    <View style={containerStyle}>
      {label && <Text style={styles.label}>{label}</Text>}

      <Pressable
        onPress={handleOpen}
        style={[styles.input, { borderColor: COLOR.BORDE }]}
        accessibilityLabel={label}
        accessibilityRole="button"
      >
        <Icon
          name="clock"
          size={18}
          color={COLOR.SUBTEXTO}
          containerStyle={styles.icon}
        />
        <Text style={[styles.inputText, !value && styles.placeholderText]}>
          {formatTimeLabel(value || undefined, placeholder)}
        </Text>
      </Pressable>

      {Platform.OS === 'ios' ? (
        <Modal
          visible={showPicker}
          transparent
          animationType="slide"
          onRequestClose={handleCancel}
        >
          <Pressable style={styles.modalOverlay} onPress={handleCancel}>
            <Pressable
              style={styles.iosPickerContainer}
              onPress={e => e.stopPropagation()}
            >
              <View style={styles.iosHeader}>
                <Pressable onPress={handleCancel} hitSlop={8}>
                  <Text style={styles.iosCancelText}>Cancelar</Text>
                </Pressable>
                <Text style={styles.iosTitle}>
                  {label || 'Selecciona hora'}
                </Text>
                <Pressable onPress={handleConfirm} hitSlop={8}>
                  <Text style={styles.iosConfirmText}>Confirmar</Text>
                </Pressable>
              </View>
              <View style={styles.iosPickerWrapper}>
                <DateTimePickerNative
                  value={tempDate}
                  mode="time"
                  is24Hour
                  display="spinner"
                  onChange={handleNativeChange}
                  textColor={COLOR.TEXTO}
                  themeVariant="dark"
                  style={styles.iosPicker}
                />
              </View>
            </Pressable>
          </Pressable>
        </Modal>
      ) : showPicker ? (
        <DateTimePickerNative
          value={tempDate}
          mode="time"
          is24Hour
          display="spinner"
          onChange={handleNativeChange}
        />
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { marginBottom: 14 },
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
  icon: { marginRight: 10 },
  inputText: { flex: 1, fontSize: 15, color: COLOR.TEXTO },
  placeholderText: { color: COLOR.SUBTEXTO },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  iosPickerContainer: {
    backgroundColor: COLOR.BASE,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderWidth: 1,
    borderColor: COLOR.BORDE,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: -4 },
    shadowRadius: 12,
    elevation: 8,
  },
  iosHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: COLOR.BLOQUE,
    borderBottomWidth: 1,
    borderBottomColor: COLOR.BORDE,
  },
  iosTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLOR.TEXTO,
  },
  iosCancelText: {
    fontSize: 15,
    color: COLOR.SUBTEXTO,
  },
  iosConfirmText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLOR.PRIMARIO,
  },
  iosPickerWrapper: {
    backgroundColor: COLOR.BASE,
    paddingVertical: 8,
  },
  iosPicker: {
    height: 200,
  },
})

export default TimePicker
