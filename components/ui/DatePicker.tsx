import React, { useState } from 'react'
import {
  StyleSheet,
  Text,
  View,
  ViewStyle,
  Modal,
  Pressable,
} from 'react-native'
import { COLOR } from '@/constants'
import Icon from './Icon'
import { Calendar, LocaleConfig } from 'react-native-calendars'

// Configurar el calendario en español
LocaleConfig.locales['es'] = {
  monthNames: [
    'Enero',
    'Febrero',
    'Marzo',
    'Abril',
    'Mayo',
    'Junio',
    'Julio',
    'Agosto',
    'Septiembre',
    'Octubre',
    'Noviembre',
    'Diciembre',
  ],
  monthNamesShort: [
    'Ene',
    'Feb',
    'Mar',
    'Abr',
    'May',
    'Jun',
    'Jul',
    'Ago',
    'Sep',
    'Oct',
    'Nov',
    'Dic',
  ],
  dayNames: [
    'Domingo',
    'Lunes',
    'Martes',
    'Miércoles',
    'Jueves',
    'Viernes',
    'Sábado',
  ],
  dayNamesShort: ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'],
  today: 'Hoy',
}
LocaleConfig.defaultLocale = 'es'

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
 * Usa react-native-calendars para personalización completa
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

  const formatDate = (date?: Date): string => {
    if (!date) return placeholder

    const day = date.getDate().toString().padStart(2, '0')
    const month = (date.getMonth() + 1).toString().padStart(2, '0')
    const year = date.getFullYear()

    return `${day}/${month}/${year}`
  }

  const formatDateForCalendar = (date: Date): string => {
    const year = date.getFullYear()
    const month = (date.getMonth() + 1).toString().padStart(2, '0')
    const day = date.getDate().toString().padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  const handleDayPress = (day: any) => {
    const selectedDate = new Date(day.year, day.month - 1, day.day)
    onValueChange(selectedDate)
    setShowPicker(false)
  }

  const containerStyle: ViewStyle | ViewStyle[] = [
    styles.container,
    ...(Array.isArray(style) ? style : style ? [style] : []),
  ]

  const borderColor = errorText ? COLOR.ERROR : COLOR.BORDE

  const markedDates = value
    ? {
        [formatDateForCalendar(value)]: {
          selected: true,
          selectedColor: COLOR.ENFASIS,
          selectedTextColor: COLOR.BASE,
        },
      }
    : {}

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
          containerStyle={styles.icon}
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

      {/* Modal con calendario personalizado */}
      <Modal
        visible={showPicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowPicker(false)}
        statusBarTranslucent
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowPicker(false)}
        >
          <Pressable
            style={styles.modalContent}
            onPress={e => e.stopPropagation()}
          >
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {label || 'Selecciona una fecha'}
              </Text>
              <Pressable
                onPress={() => setShowPicker(false)}
                style={styles.closeButton}
                hitSlop={8}
              >
                <Icon name="times" size={20} color={COLOR.TEXTO} />
              </Pressable>
            </View>

            <Calendar
              current={value ? formatDateForCalendar(value) : undefined}
              onDayPress={handleDayPress}
              markedDates={markedDates}
              maxDate={
                maximumDate ? formatDateForCalendar(maximumDate) : undefined
              }
              minDate={
                minimumDate ? formatDateForCalendar(minimumDate) : undefined
              }
              theme={{
                calendarBackground: COLOR.SECUNDARIO,
                textSectionTitleColor: COLOR.SUBTEXTO,
                selectedDayBackgroundColor: COLOR.ENFASIS,
                selectedDayTextColor: COLOR.BASE,
                todayTextColor: COLOR.ENFASIS,
                dayTextColor: COLOR.TEXTO,
                textDisabledColor: COLOR.INACTIVO,
                monthTextColor: COLOR.TEXTO,
                indicatorColor: COLOR.ENFASIS,
                textDayFontWeight: '400',
                textMonthFontWeight: '700',
                textDayHeaderFontWeight: '600',
                textDayFontSize: 15,
                textMonthFontSize: 18,
                textDayHeaderFontSize: 13,
                arrowColor: COLOR.ENFASIS,
              }}
              style={styles.calendar}
            />
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
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: COLOR.BASE,
    borderRadius: 16,
    width: '100%',
    maxWidth: 400,
    borderWidth: 1,
    borderColor: COLOR.BORDE,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 8,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: COLOR.BLOQUE,
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
  calendar: {
    borderRadius: 0,
  },
})

export default DatePicker
