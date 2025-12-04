import React from 'react'
import { View, Text, TextInput as RNTextInput, StyleSheet } from 'react-native'
import { useTranslation } from 'react-i18next'
import { COLOR } from '@/constants'
import type { Mascota } from '@/models/Mascota'

interface SobreMiMascotaProps {
  mascota: Mascota
  isEditMode: boolean
  editedData: Partial<Mascota>
  onUpdateField: <K extends keyof Mascota>(field: K, value: Mascota[K]) => void
}

export const SobreMiMascota: React.FC<SobreMiMascotaProps> = ({
  mascota,
  isEditMode,
  editedData,
  onUpdateField,
}) => {
  const { t } = useTranslation()

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{t('mascotas:detalle.sobre_mi')}</Text>
      {isEditMode ? (
        <RNTextInput
          value={editedData.descripcion}
          onChangeText={text => onUpdateField('descripcion', text)}
          multiline
          numberOfLines={4}
          style={styles.textArea}
        />
      ) : (
        <Text style={styles.description}>
          {mascota.descripcion || t('mascotas:detalle.sin_descripcion')}
        </Text>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLOR.TEXTO,
    marginBottom: 12,
  },
  description: {
    fontSize: 15,
    color: COLOR.SUBTEXTO,
    lineHeight: 22,
  },
  textArea: {
    borderWidth: 1,
    borderColor: COLOR.BORDE,
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    color: COLOR.TEXTO,
    textAlignVertical: 'top',
    minHeight: 100,
  },
})
