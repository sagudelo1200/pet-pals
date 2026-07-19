import React, { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import DatePicker from '@/components/ui/DatePicker'
import { ViewStyle } from 'react-native'

interface BirthDatePickerProps {
  value?: Date
  onValueChange: (_date: Date) => void
  label?: string
  placeholder?: string
  errorText?: string
  style?: ViewStyle | ViewStyle[]
  testID?: string
  disabled?: boolean
  minAge?: number // edad mínima (por defecto 18)
  maxAge?: number // edad máxima (por defecto 120)
}

/**
 * BirthDatePicker: Componente reutilizable para seleccionar fecha de nacimiento
 * Usa el mismo DatePicker visual del modal de solicitar paseo
 * Valida automáticamente que la edad esté dentro del rango permitido
 */
export const BirthDatePicker = ({
  value,
  onValueChange,
  label,
  placeholder,
  errorText,
  style,
  testID,
  disabled = false,
  minAge = 18,
  maxAge = 120,
}: BirthDatePickerProps) => {
  const { t } = useTranslation(['auth', 'comun'])

  // Calcular dates límite (hace minAge años y hace maxAge años)
  const { minimumDate, maximumDate } = useMemo(() => {
    const hoy = new Date()

    // Máximo: hace exactamente minAge años (persona de exactamente minAge años)
    const max = new Date(
      hoy.getFullYear() - minAge,
      hoy.getMonth(),
      hoy.getDate()
    )

    // Mínimo: hace exactamente maxAge años (persona de exactamente maxAge años)
    const min = new Date(
      hoy.getFullYear() - maxAge,
      hoy.getMonth(),
      hoy.getDate()
    )

    return { minimumDate: min, maximumDate: max }
  }, [minAge, maxAge])

  const defaultLabel =
    label || t('auth:registro.formulario.fechaNacimiento.label')
  const defaultPlaceholder =
    placeholder || t('auth:registro.formulario.fechaNacimiento.placeholder')

  return (
    <DatePicker
      label={defaultLabel}
      value={value}
      onValueChange={onValueChange}
      placeholder={defaultPlaceholder}
      errorText={errorText}
      style={style}
      testID={testID}
      disabled={disabled}
      minimumDate={minimumDate}
      maximumDate={maximumDate}
    />
  )
}
