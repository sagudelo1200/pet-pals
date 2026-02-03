import React from 'react'
import { StyleSheet, View, Text } from 'react-native'
import { useTranslation } from 'react-i18next'
import { COLOR } from '@/constants'
import { Button, DurationPicker, TimePicker } from '@/components/ui'
import DatePicker from '@/components/ui/DatePicker'
import { LogicMatching } from '@/logic/paseos/matching'

interface Props {
  fechaInicial?: Date | null
  horaInicial?: string | null
  duracionInicial?: number | null
  onNext: (_fecha: Date, _hora: string, _duracion: number) => void
  onBack: () => void
}

export const SeleccionarFechaPaso = ({
  fechaInicial,
  horaInicial,
  duracionInicial,
  onNext,
  onBack,
}: Props) => {
  const { t } = useTranslation()
  const [fecha, setFecha] = React.useState<Date | undefined>(
    fechaInicial || undefined
  )
  const [hora, setHora] = React.useState<string | null>(horaInicial || null)
  const [duracion, setDuracion] = React.useState<number | null>(
    duracionInicial || null
  )

  const handleContinuar = () => {
    if (fecha && hora && duracion) {
      onNext(fecha, hora, duracion)
    }
  }

  const { minDate, maxDate } = React.useMemo(() => {
    const min = new Date()
    const max = new Date()
    max.setDate(max.getDate() + LogicMatching.MAX_DIAS_ANTICIPACION)

    // Si ya pasó la hora máxima de servicio (22:30), hoy ya no es válido.
    // Usamos un margen pequeño para que no se vea "disponible" algo que no se puede agendar.
    const [hMax, mMax] =
      LogicMatching.HORA_MAXIMA_SERVICIO.split(':').map(Number)
    const limiteHoy = new Date()
    limiteHoy.setHours(hMax, mMax, 0, 0)

    if (new Date() > limiteHoy) {
      min.setDate(min.getDate() + 1)
    }

    return { minDate: min, maxDate: max }
  }, [])

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t('paseos:cuando_sera_paseo')}</Text>
      <Text style={styles.subtitle}>
        {t('paseos:elige_dia_ver_cuidadores')}
      </Text>

      <View style={styles.section}>
        <DatePicker
          label={t('paseos:fecha_paseo')}
          value={fecha}
          onValueChange={setFecha}
          placeholder={t('paseos:selecciona_fecha')}
          minimumDate={minDate}
          maximumDate={maxDate}
        />

        <View style={{ flexDirection: 'row', gap: 12 }}>
          <View style={{ flex: 1 }}>
            <TimePicker
              label={t('paseos:hora_inicio')}
              value={hora}
              onValueChange={setHora}
              placeholder={t('paseos:selecciona_hora')}
            />
          </View>
          <View style={{ flex: 1 }}>
            <DurationPicker
              label={t('paseos:duracion_paseo')}
              value={duracion}
              onValueChange={setDuracion}
              placeholder={t('paseos:selecciona_duracion')}
            />
          </View>
        </View>
      </View>

      <View style={styles.actions}>
        <Button
          title={t('comun:atras')}
          variant="bloque"
          onPress={onBack}
          style={{ flex: 1 }}
        />
        <Button
          title={t('comun:continuar')}
          variant="primario"
          onPress={handleContinuar}
          disabled={!fecha || !hora || !duracion}
          style={{ flex: 1 }}
        />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLOR.TEXTO,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: COLOR.SUBTEXTO,
    marginBottom: 24,
    textAlign: 'center',
  },
  section: {
    marginBottom: 24,
    gap: 16,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
})
