import React from 'react'
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native'
import { useTranslation } from 'react-i18next'
import { COLOR } from '@/constants'
import { Button } from '@/components/ui'
import DatePicker from '@/components/ui/DatePicker'
import Chip from '@/components/ui/Chip'
import { useFechaHora } from '@/hooks/paseos/useFechaHora'

interface Props {
  initialDate?: Date | null
  initialTime?: string | null
  onNext: (data: { fecha: Date; hora: string }) => void
  onBack: (data?: { fecha: Date | null; hora: string | null }) => void
}

export const FechaHoraPaso = ({ initialDate, initialTime, onNext, onBack }: Props) => {
  const { t } = useTranslation()
  const { 
    fecha, 
    periodo, 
    hora, 
    slotsPorPeriodo, 
    seleccionarFecha, 
    seleccionarPeriodo, 
    seleccionarHora, 
    esValido 
  } = useFechaHora({ initialDate, initialTime })

  const handleContinuar = () => {
    if (fecha && hora) {
      onNext({ fecha, hora })
    }
  }

  const PeriodoItem = ({ id, label, icon }: { id: any, label: string, icon?: string }) => {
    const isSelected = periodo === id
    return (
      <TouchableOpacity 
        style={[styles.statItem, isSelected && styles.statItemSelected]}
        onPress={() => seleccionarPeriodo(id)}
      >
        <Text style={[styles.statLabel, isSelected && styles.textSelected]}>{label}</Text>
        {/* Placeholder or indicator */}
        <View style={[styles.dot, isSelected && styles.dotSelected]} />
      </TouchableOpacity>
    )
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        {t('paseos:pasos.fecha_hora.titulo')}
      </Text>

      <View style={styles.section}>
        <DatePicker
          label={t('paseos:pasos.fecha_hora.fecha_label')}
          value={fecha}
          onValueChange={seleccionarFecha}
          placeholder={t('paseos:pasos.fecha_hora.placeholder_fecha')}
          minimumDate={new Date()}
        />
      </View>

      <View style={styles.section}>
        <Text style={[styles.label, { fontWeight: '600' }]}>
          {t('paseos:pasos.fecha_hora.hora_label')}
        </Text>
        
        {/* Stats Row Styled Selector */}
        <View style={styles.statsRow}>
          <PeriodoItem id="manana" label="Mañana" />
          <View style={styles.statDivider} />
          <PeriodoItem id="tarde" label="Tarde" />
          <View style={styles.statDivider} />
          <PeriodoItem id="noche" label="Noche" />
        </View>

        {/* Time Slots Area */}
        {periodo && (
          <View style={styles.slotsContainer}>
            <Text style={styles.slotsTitle}>Horarios disponibles</Text>
            <View style={styles.chipsContainer}>
              {slotsPorPeriodo[periodo].map((h) => (
                <Chip
                  key={h}
                  label={h}
                  selected={hora === h}
                  onPress={() => seleccionarHora(h)}
                  style={styles.chip}
                />
              ))}
            </View>
          </View>
        )}
      </View>

      <View style={styles.actions}>
        <Button
          title={t('comun:atras')}
          variant="bloque"
          onPress={() => onBack({ fecha: fecha || null, hora: hora || null })}
          style={{ flex: 1 }}
        />
        <Button
          title={t('comun:continuar')}
          variant="primario"
          onPress={handleContinuar}
          disabled={!esValido}
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
  label: {
    fontSize: 13,
    color: COLOR.SUBTEXTO,
    marginBottom: 8,
  },
  // Stats Row Styles
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLOR.SECUNDARIO,
    borderRadius: 8,
    padding: 12,
    width: '100%',
    marginBottom: 16,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
    paddingVertical: 8,
  },
  statItemSelected: {
    backgroundColor: 'rgba(29, 143, 115, 0.1)', // Subtle highlight
    borderRadius: 6,
  },
  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: COLOR.BORDE,
  },
  statLabel: {
    fontSize: 14,
    color: COLOR.SUBTEXTO,
    fontWeight: '600',
    marginBottom: 4,
  },
  textSelected: {
    color: COLOR.PRIMARIO,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'transparent',
  },
  dotSelected: {
    backgroundColor: COLOR.PRIMARIO,
  },
  // Slots
  slotsContainer: {
    marginTop: 8,
    padding: 12,
    backgroundColor: COLOR.BLOQUE,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLOR.BORDE,
  },
  slotsTitle: {
    fontSize: 12,
    color: COLOR.SUBTEXTO,
    marginBottom: 12,
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    marginBottom: 0,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
})
