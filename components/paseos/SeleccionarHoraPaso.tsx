import React from 'react'
import { StyleSheet, View, Text } from 'react-native'
import { useTranslation } from 'react-i18next'
import { COLOR } from '@/constants'
import { Button } from '@/components/ui'
import TimePicker from '@/components/ui/TimePicker'
import DurationPicker from '@/components/ui/DurationPicker'

interface Props {
  horaInicial?: string | null
  duracionInicial?: number | null
  horaMinima?: string
  horaMaxima?: string
  onNext: (data: { hora: string; duracion: number }) => void
  onBack: () => void
}

export const SeleccionarHoraPaso = ({
  horaInicial,
  duracionInicial,
  horaMinima = '06:00',
  horaMaxima = '21:00',
  onNext,
  onBack,
}: Props) => {
  const { t } = useTranslation()
  const [hora, setHora] = React.useState<string | null>(horaInicial || null)
  const [duracion, setDuracion] = React.useState<number | null>(
    duracionInicial || null
  )

  const handleContinuar = () => {
    if (hora && duracion) {
      onNext({ hora, duracion })
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t('paseos:define_hora')}</Text>
      <Text style={styles.subtitle}>
        {t('paseos:cuidador_disponible_rango', {
          inicio: horaMinima,
          fin: horaMaxima,
        })}
      </Text>

      <View style={styles.section}>
        <TimePicker
          label={t('paseos:hora_inicio')}
          value={hora}
          onValueChange={setHora}
          placeholder={t('paseos:selecciona_hora')}
        />
        <DurationPicker
          label={t('paseos:duracion_paseo')}
          value={duracion}
          onValueChange={setDuracion}
          placeholder={t('paseos:selecciona_duracion')}
        />
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
          disabled={!hora || !duracion}
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
