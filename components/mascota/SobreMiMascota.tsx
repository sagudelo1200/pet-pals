import React from 'react'
import { View, Text, TextInput as RNTextInput, StyleSheet } from 'react-native'
import { useTranslation } from 'react-i18next'
import { COLOR } from '@/constants'
import Card from '@/components/ui/Card'
import Icon from '@/components/ui/Icon'
import type { Mascota } from '@/models/Mascota'

interface SobreMiMascotaProps {
  mascota: Mascota
  isEditMode: boolean
  editedData: Partial<Mascota>
  // eslint-disable-next-line
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
    <Card style={styles.container} elevated>
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <Icon name="paw" size={20} color={COLOR.PRIMARIO} />
          <Text style={styles.sectionTitle}>
            {t('mascotas:detalle.sobre_mi')}
          </Text>
        </View>
      </View>

      {isEditMode ? (
        <RNTextInput
          value={editedData.descripcion || ''}
          onChangeText={text => onUpdateField('descripcion', text)}
          multiline
          numberOfLines={5}
          style={styles.textArea}
          placeholder={
            t('mascotas:placeholders.descripcion') ||
            'Cuéntanos más sobre tu mascota...'
          }
          placeholderTextColor={COLOR.SUBTEXTO}
        />
      ) : (
        <Text style={styles.description}>
          {mascota.descripcion && mascota.descripcion.trim()
            ? mascota.descripcion
            : t('mascotas:detalle.sin_descripcion')}
        </Text>
      )}
    </Card>
  )
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 3,
  },
  header: {
    marginBottom: 12,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLOR.TEXTO,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  description: {
    fontSize: 14,
    color: COLOR.SUBTEXTO,
    lineHeight: 22,
    fontWeight: '500',
    letterSpacing: 0.2,
  },
  textArea: {
    borderWidth: 1.5,
    borderColor: `${COLOR.PRIMARIO}30`,
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    color: COLOR.TEXTO,
    textAlignVertical: 'top',
    minHeight: 100,
    backgroundColor: COLOR.SECUNDARIO,
    fontWeight: '500',
  },
})
