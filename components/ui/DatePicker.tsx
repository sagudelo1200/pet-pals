import React, { useState, useMemo } from 'react'
import {
  StyleSheet,
  Text,
  View,
  ViewStyle,
  Modal,
  Pressable,
  ScrollView,
  FlatList,
} from 'react-native'
import { COLOR } from '@/constants'
import Icon from './Icon'
import { Calendar, LocaleConfig } from 'react-native-calendars'

// Configurar el calendario en español
const MESES = [
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
]

LocaleConfig.locales['es'] = {
  monthNames: MESES,
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
  onValueChange: (_date: Date) => void
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
 * Usa react-native-calendars para personalización completa con selector rápido de mes/año
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
  const [showYearSelector, setShowYearSelector] = useState(false)
  const [showMonthSelector, setShowMonthSelector] = useState(false)

  // Estado para controlar qué mes/año está mostrando el calendario
  const [currentDate, setCurrentDate] = useState(() => {
    const d = value || new Date()
    return {
      month: d.getMonth() + 1,
      year: d.getFullYear(),
    }
  })

  // Generar lista de años (dinámica según límites)
  const years = useMemo(() => {
    const list = []

    // Determinamos el año inicial (el mayor entre máximo o actual)
    const startYear = maximumDate
      ? maximumDate.getFullYear()
      : new Date().getFullYear()

    // Determinamos el año final (el menor entre mínimo o hace 40 años)
    const endYear = minimumDate
      ? minimumDate.getFullYear()
      : new Date().getFullYear() - 40

    // Si por error el rango es invertido, nos aseguramos de mostrar al menos el año actual
    const highest = Math.max(startYear, endYear)
    const lowest = Math.min(startYear, endYear)

    for (let i = highest; i >= lowest; i--) {
      list.push(i)
    }
    return list
  }, [minimumDate, maximumDate])

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
    setShowYearSelector(false)
    setShowMonthSelector(false)
  }

  const handleMonthSelect = (monthIndex: number) => {
    setCurrentDate(prev => ({ ...prev, month: monthIndex + 1 }))
    setShowMonthSelector(false)
  }

  const handleYearSelect = (year: number) => {
    setCurrentDate(prev => ({ ...prev, year }))
    setShowYearSelector(false)
  }

  const calendarCurrent = `${currentDate.year}-${currentDate.month
    .toString()
    .padStart(2, '0')}-01`

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
        onPress={() => {
          if (!disabled) {
            const d = value || new Date()
            setCurrentDate({
              month: d.getMonth() + 1,
              year: d.getFullYear(),
            })
            setShowPicker(true)
          }
        }}
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

      {/* Modal con calendario personalizado y selectors */}
      <Modal
        visible={showPicker}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setShowPicker(false)
          setShowYearSelector(false)
          setShowMonthSelector(false)
        }}
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
              <View>
                <Text style={styles.modalTitle}>
                  {label || 'Selecciona una fecha'}
                </Text>
                <View style={styles.headerSelectors}>
                  <Pressable
                    onPress={() => {
                      setShowMonthSelector(!showMonthSelector)
                      setShowYearSelector(false)
                    }}
                    style={styles.selectorBtn}
                  >
                    <Text style={styles.selectorText}>
                      {MESES[currentDate.month - 1]}
                    </Text>
                    <Icon
                      name={showMonthSelector ? 'chevron-up' : 'chevron-down'}
                      size={12}
                      color={COLOR.ENFASIS}
                    />
                  </Pressable>
                  <Pressable
                    onPress={() => {
                      setShowYearSelector(!showYearSelector)
                      setShowMonthSelector(false)
                    }}
                    style={styles.selectorBtn}
                  >
                    <Text style={styles.selectorText}>{currentDate.year}</Text>
                    <Icon
                      name={showYearSelector ? 'chevron-up' : 'chevron-down'}
                      size={12}
                      color={COLOR.ENFASIS}
                    />
                  </Pressable>
                </View>
              </View>
              <Pressable
                onPress={() => setShowPicker(false)}
                style={styles.closeButton}
                hitSlop={8}
              >
                <Icon name="times" size={20} color={COLOR.TEXTO} />
              </Pressable>
            </View>

            <View style={styles.contentBody}>
              {showMonthSelector ? (
                <View style={[styles.listContainer, { height: 360 }]}>
                  <ScrollView>
                    {MESES.map((mes, index) => (
                      <Pressable
                        key={mes}
                        onPress={() => handleMonthSelect(index)}
                        disabled={
                          (minimumDate &&
                            currentDate.year === minimumDate.getFullYear() &&
                            index < minimumDate.getMonth()) ||
                          (maximumDate &&
                            currentDate.year === maximumDate.getFullYear() &&
                            index > maximumDate.getMonth())
                        }
                        style={[
                          styles.listItem,
                          currentDate.month === index + 1 &&
                            styles.listItemSelected,
                          ((minimumDate &&
                            currentDate.year === minimumDate.getFullYear() &&
                            index < minimumDate.getMonth()) ||
                            (maximumDate &&
                              currentDate.year === maximumDate.getFullYear() &&
                              index > maximumDate.getMonth())) &&
                            styles.listItemDisabled,
                        ]}
                      >
                        <Text
                          style={[
                            styles.listItemText,
                            currentDate.month === index + 1 &&
                              styles.listItemTextSelected,
                            ((minimumDate &&
                              currentDate.year === minimumDate.getFullYear() &&
                              index < minimumDate.getMonth()) ||
                              (maximumDate &&
                                currentDate.year ===
                                  maximumDate.getFullYear() &&
                                index > maximumDate.getMonth())) &&
                              styles.listItemTextDisabled,
                          ]}
                        >
                          {mes}
                        </Text>
                      </Pressable>
                    ))}
                  </ScrollView>
                </View>
              ) : showYearSelector ? (
                <View style={[styles.listContainer, { height: 360 }]}>
                  <FlatList
                    data={years}
                    keyExtractor={item => item.toString()}
                    renderItem={({ item }) => (
                      <Pressable
                        onPress={() => handleYearSelect(item)}
                        style={[
                          styles.listItem,
                          currentDate.year === item && styles.listItemSelected,
                        ]}
                      >
                        <Text
                          style={[
                            styles.listItemText,
                            currentDate.year === item &&
                              styles.listItemTextSelected,
                          ]}
                        >
                          {item}
                        </Text>
                      </Pressable>
                    )}
                  />
                </View>
              ) : (
                <Calendar
                  current={calendarCurrent}
                  onDayPress={handleDayPress}
                  enableSwipeMonths={true}
                  displayLoadingIndicator={false}
                  hideExtraDays={false}
                  showSixWeeks={true}
                  onMonthChange={month => {
                    setCurrentDate({
                      month: month.month,
                      year: month.year,
                    })
                  }}
                  markedDates={markedDates}
                  maxDate={
                    maximumDate ? formatDateForCalendar(maximumDate) : undefined
                  }
                  minDate={
                    minimumDate ? formatDateForCalendar(minimumDate) : undefined
                  }
                  theme={{
                    calendarBackground: COLOR.BASE,
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
                    textMonthFontSize: 0.1, // Valor mínimo aceptado por Android para "ocultar" el texto
                    textDayHeaderFontSize: 13,
                    arrowColor: COLOR.ENFASIS,
                  }}
                  style={styles.calendar}
                />
              )}
            </View>
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
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: COLOR.BLOQUE,
    borderBottomWidth: 1,
    borderBottomColor: COLOR.BORDE,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLOR.TEXTO,
    marginBottom: 8,
  },
  headerSelectors: {
    flexDirection: 'row',
    gap: 10,
  },
  selectorBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLOR.BASE,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: COLOR.BORDE,
    gap: 6,
  },
  selectorText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLOR.TEXTO,
  },
  closeButton: {
    padding: 4,
    marginTop: -4,
  },
  contentBody: {
    minHeight: 360,
  },
  calendar: {
    borderRadius: 0,
  },
  listContainer: {
    backgroundColor: COLOR.BASE,
  },
  listItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLOR.BORDE,
    alignItems: 'center',
  },
  listItemSelected: {
    backgroundColor: COLOR.BLOQUE,
  },
  listItemDisabled: {
    backgroundColor: COLOR.BASE,
    opacity: 0.4,
  },
  listItemText: {
    fontSize: 16,
    color: COLOR.TEXTO,
  },
  listItemTextSelected: {
    color: COLOR.ENFASIS,
    fontWeight: '700',
  },
  listItemTextDisabled: {
    color: COLOR.INACTIVO,
  },
})

export default DatePicker
