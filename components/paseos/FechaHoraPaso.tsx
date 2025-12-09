import React from 'react'
import { StyleSheet, View, Text } from 'react-native'
import { useTranslation } from 'react-i18next'
import { COLOR } from '@/constants'
import { Button } from '@/components/ui'
import DatePicker from '@/components/ui/DatePicker'
import TimePicker from '@/components/ui/TimePicker'
import DurationPicker from '@/components/ui/DurationPicker'
import { useFechaHora } from '@/hooks/paseos/useFechaHora'

interface Props {
  initialDate?: Date | null
  initialTime?: string | null
  initialDuration?: number | null
  onNext: (data: { fecha: Date; hora: string; duracion: number }) => void
  onBack: (data?: {
    fecha: Date | null
    hora: string | null
    duracion: number | null
  }) => void
}

export const FechaHoraPaso = ({
  initialDate,
  initialTime,
  initialDuration,
  onNext,
  onBack,
}: Props) => {
  const { t } = useTranslation()
  const { fecha, hora, seleccionarFecha, seleccionarHora, esValido } =
    useFechaHora({ initialDate, initialTime })
  const [duracion, setDuracion] = React.useState<number | null>(
    initialDuration || null
  )

  const handleContinuar = () => {
    if (fecha && hora && duracion) {
      onNext({ fecha, hora, duracion })
    }
  }

  const handleDateChange = (dt: Date) => {
    seleccionarFecha(dt)
  }

  const handleTimeChange = (t: string) => {
    seleccionarHora(t)
  }

  const handleDurationChange = (d: number) => {
    setDuracion(d)
  }

  const isValid = esValido && duracion !== null

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t('paseos:pasos.fecha_hora.titulo')}</Text>

      <View style={styles.section}>
        <DatePicker
          label={t('paseos:pasos.fecha_hora.fecha_label')}
          value={fecha}
          onValueChange={handleDateChange}
          placeholder={t('paseos:pasos.fecha_hora.placeholder_fecha')}
          minimumDate={new Date()}
        />

        <View style={styles.row}>
          <TimePicker
            label={t('paseos:pasos.fecha_hora.hora_label')}
            value={hora || null}
            onValueChange={handleTimeChange}
            placeholder={
              t('paseos:pasos.fecha_hora.placeholder_hora') || 'Selecciona hora'
            }
            style={styles.halfInput}
          />
          <DurationPicker
            label={t('paseos:pasos.fecha_hora.duracion_label')}
            value={duracion}
            onValueChange={handleDurationChange}
            placeholder={
              t('paseos:pasos.fecha_hora.placeholder_duracion') || 'Duración'
            }
            style={styles.halfInput}
          />
        </View>
      </View>

      <View style={styles.actions}>
        <Button
          title={t('comun:atras')}
          variant="bloque"
          onPress={() =>
            onBack({ fecha: fecha || null, hora: hora || null, duracion })
          }
          style={{ flex: 1 }}
        />
        <Button
          title={t('comun:continuar')}
          variant="primario"
          onPress={handleContinuar}
          disabled={!isValid}
          style={{ flex: 1 }}
        />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: COLOR.TEXTO,
    textAlign: 'center',
    marginBottom: 24,
  },
  section: {
    marginBottom: 24,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  halfInput: {
    flex: 1,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
})
