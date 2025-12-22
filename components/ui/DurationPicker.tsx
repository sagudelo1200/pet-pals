import React, { useState } from 'react'
import {
  StyleSheet,
  Text,
  View,
  ViewStyle,
  Modal,
  Pressable,
  FlatList,
} from 'react-native'
import { COLOR } from '@/constants'
import Icon from './Icon'
import Chip from './Chip'
import Button from './Button'

interface DurationPickerProps {
  label?: string
  value?: number | null
  onValueChange: (duration: number) => void
  placeholder?: string
  style?: ViewStyle | ViewStyle[]
}

const formatDurationLabel = (
  duration?: number,
  placeholder = 'Selecciona duración'
) => {
  if (!duration) return placeholder
  return `${duration} min`
}

const DURATIONS = [45, 60, 90, 120]

const DurationPicker: React.FC<DurationPickerProps> = ({
  label,
  value,
  onValueChange,
  placeholder = 'Selecciona duración',
  style,
}) => {
  const [show, setShow] = useState(false)

  const containerStyle: ViewStyle | ViewStyle[] = [
    styles.container,
    ...(Array.isArray(style) ? style : style ? [style] : []),
  ]

  const apply = (duration: number) => {
    onValueChange(duration)
    setShow(false)
  }

  return (
    <View style={containerStyle}>
      {label && <Text style={styles.label}>{label}</Text>}

      <Pressable
        onPress={() => setShow(true)}
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
          {formatDurationLabel(value || undefined, placeholder)}
        </Text>
      </Pressable>

      <Modal
        visible={show}
        transparent
        animationType="fade"
        onRequestClose={() => setShow(false)}
        statusBarTranslucent
      >
        <Pressable style={styles.modalOverlay} onPress={() => setShow(false)}>
          <Pressable
            style={styles.modalContent}
            onPress={e => e.stopPropagation()}
          >
            <View style={styles.headerRow}>
              <Text style={styles.modalTitle}>
                {label || 'Selecciona duración'}
              </Text>
              <Pressable
                onPress={() => setShow(false)}
                style={styles.closeButton}
                hitSlop={8}
              >
                <Icon name="times" size={20} color={COLOR.TEXTO} />
              </Pressable>
            </View>

            <Text style={styles.sectionLabel}>Duración del paseo</Text>
            <FlatList
              data={DURATIONS}
              numColumns={2}
              keyExtractor={item => item.toString()}
              renderItem={({ item }) => (
                <View style={styles.chipWrap}>
                  <Chip
                    label={`${item} min`}
                    selected={item === value}
                    onPress={() => apply(item)}
                  />
                </View>
              )}
              contentContainerStyle={styles.listContent}
            />

            <View style={styles.modalActions}>
              <Button
                title="Cerrar"
                variant="bloque"
                onPress={() => setShow(false)}
                style={{ flex: 1 }}
              />
            </View>
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
  sectionLabel: {
    paddingHorizontal: 12,
    color: COLOR.SUBTEXTO,
    marginTop: 6,
    marginBottom: 8,
  },
  chipWrap: { padding: 8, width: '50%' },
  listContent: { paddingHorizontal: 8 },
  modalActions: { flexDirection: 'row', padding: 12 },
})

export default DurationPicker
