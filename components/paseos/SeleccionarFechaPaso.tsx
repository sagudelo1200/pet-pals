import React from 'react'
import { StyleSheet, View, Text } from 'react-native'
import { useTranslation } from 'react-i18next'
import { COLOR } from '@/constants'
import { Button } from '@/components/ui'
import DatePicker from '@/components/ui/DatePicker'

interface Props {
  fechaInicial?: Date | null
  onNext: (fecha: Date) => void
  onBack: () => void
}

export const SeleccionarFechaPaso = ({
  fechaInicial,
  onNext,
  onBack,
}: Props) => {
  const { t } = useTranslation()
  const [fecha, setFecha] = React.useState<Date | undefined>(
    fechaInicial || undefined
  )

  const handleContinuar = () => {
    if (fecha) {
      onNext(fecha)
    }
  }

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
          minimumDate={new Date()}
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
          disabled={!fecha}
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
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
})
