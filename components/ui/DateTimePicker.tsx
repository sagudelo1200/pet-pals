import React, { useState, useEffect } from 'react'
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
import DateTimePickerNative from '@react-native-community/datetimepicker'
import { Button } from '@/components/ui'

LocaleConfig.locales['es'] = LocaleConfig.locales['es'] || {}
LocaleConfig.locales['es'] = {
  ...LocaleConfig.locales['es'],
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

interface DateTimePickerProps {
  label?: string
  value?: Date
  onValueChange: (date: Date) => void
  placeholder?: string
  style?: ViewStyle | ViewStyle[]
  minimumDate?: Date
  maximumDate?: Date
}

const formatDateForCalendar = (date: Date): string => {
  const year = date.getFullYear()
  const month = (date.getMonth() + 1).toString().padStart(2, '0')
  const day = date.getDate().toString().padStart(2, '0')
  return `${year}-${month}-${day}`
}

const formatDateLabel = (
  date?: Date,
  placeholder = 'Selecciona fecha y hora'
) => {
  if (!date) return placeholder
  const d = date.getDate().toString().padStart(2, '0')
  const m = (date.getMonth() + 1).toString().padStart(2, '0')
  const y = date.getFullYear()
  const hh = date.getHours().toString().padStart(2, '0')
  const mm = date.getMinutes().toString().padStart(2, '0')
  return `${d}/${m}/${y} · ${hh}:${mm}`
}

const DateTimePicker: React.FC<DateTimePickerProps> = ({
  label,
  value,
  onValueChange,
  placeholder = 'Selecciona fecha y hora',
  style,
  minimumDate,
  maximumDate,
}) => {
  const [showPicker, setShowPicker] = useState(false)
  const [tempDate, setTempDate] = useState<Date>(value || new Date())
  const [showNativeTime, setShowNativeTime] = useState(false)

  useEffect(() => {
    if (value) setTempDate(value)
  }, [value])

  const markedDates = value
    ? {
        [formatDateForCalendar(value)]: {
          selected: true,
          selectedColor: COLOR.ENFASIS,
          selectedTextColor: COLOR.BASE,
        },
      }
    : {}

  const containerStyle: ViewStyle | ViewStyle[] = [
    styles.container,
    ...(Array.isArray(style) ? style : style ? [style] : []),
  ]

  const handleDayPress = (day: any) => {
    const selected = new Date(
      day.year,
      day.month - 1,
      day.day,
      tempDate.getHours(),
      tempDate.getMinutes()
    )
    setTempDate(selected)
  }

  const handleTimeChangeNative = (event: any, selected?: Date) => {
    setShowNativeTime(false)
    if (selected) {
      const combined = new Date(tempDate)
      combined.setHours(selected.getHours(), selected.getMinutes())
      setTempDate(combined)
    }
  }

  const apply = () => {
    onValueChange(new Date(tempDate))
    setShowPicker(false)
  }

  const setToday = () => {
    const now = new Date()
    const d = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      tempDate.getHours(),
      tempDate.getMinutes()
    )
    setTempDate(d)
  }

  const setTomorrow = () => {
    const now = new Date()
    const t = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() + 1,
      tempDate.getHours(),
      tempDate.getMinutes()
    )
    setTempDate(t)
  }

  return (
    <View style={containerStyle}>
      {label && <Text style={styles.label}>{label}</Text>}

      <Pressable
        onPress={() => setShowPicker(true)}
        style={[styles.input, { borderColor: COLOR.BORDE }]}
        accessibilityLabel={label}
        accessibilityRole="button"
      >
        <Icon
          name="calendar"
          size={18}
          color={COLOR.SUBTEXTO}
          containerStyle={styles.icon}
        />
        <Text style={[styles.inputText, !value && styles.placeholderText]}>
          {formatDateLabel(value, placeholder)}
        </Text>
      </Pressable>

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
            <View style={styles.headerRow}>
              <Text style={styles.modalTitle}>
                {label || 'Selecciona fecha y hora'}
              </Text>
              <Pressable
                onPress={() => setShowPicker(false)}
                style={styles.closeButton}
                hitSlop={8}
              >
                <Icon name="times" size={20} color={COLOR.TEXTO} />
              </Pressable>
            </View>

            <View style={styles.shortcutsRow}>
              <Button
                title="Hoy"
                variant="secundario"
                onPress={setToday}
                style={{ marginRight: 8 }}
              />
              <Button
                title="Mañana"
                variant="secundario"
                onPress={setTomorrow}
                style={{ marginRight: 8 }}
              />
              <Button
                title="Hora"
                variant="secundario"
                onPress={() => setShowNativeTime(true)}
              />
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

            <View style={styles.previewRow}>
              <Text style={styles.previewLabel}>Previsualización</Text>
              <Text style={styles.previewValue}>
                {formatDateLabel(tempDate)}
              </Text>
            </View>

            <View style={styles.modalActions}>
              <Button
                title="Cancelar"
                variant="bloque"
                onPress={() => setShowPicker(false)}
                style={{ flex: 1, marginRight: 8 }}
              />
              <Button
                title="Aceptar"
                variant="primario"
                onPress={apply}
                style={{ flex: 1 }}
              />
            </View>

            {showNativeTime && (
              <DateTimePickerNative
                value={tempDate}
                mode="time"
                is24Hour
                display="spinner"
                onChange={handleTimeChangeNative}
              />
            )}
          </Pressable>
        </Pressable>
      </Modal>
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
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: COLOR.BASE,
    borderRadius: 16,
    width: '100%',
    maxWidth: 420,
    borderWidth: 1,
    borderColor: COLOR.BORDE,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 8,
    overflow: 'hidden',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: COLOR.BLOQUE,
    borderBottomWidth: 1,
    borderBottomColor: COLOR.BORDE,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: COLOR.TEXTO },
  closeButton: { padding: 4 },
  shortcutsRow: {
    flexDirection: 'row',
    padding: 12,
    justifyContent: 'flex-start',
  },
  calendar: { borderRadius: 0 },
  previewRow: { padding: 12, borderTopWidth: 1, borderTopColor: COLOR.BORDE },
  previewLabel: { fontSize: 12, color: COLOR.SUBTEXTO },
  previewValue: { fontSize: 16, color: COLOR.TEXTO, fontWeight: '700' },
  modalActions: { flexDirection: 'row', padding: 12 },
})

export default DateTimePicker
