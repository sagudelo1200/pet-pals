import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { useTranslation } from 'react-i18next'
import { COLOR } from '@/constants'
import { formatearEdadMascota } from '@/logic/mascotas/utilidades'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import { TextInput, DatePicker } from '@/components/ui'
import type { Mascota } from '@/models/Mascota'

interface InfoPrincipalMascotaProps {
  mascota: Mascota
  isEditMode: boolean
  editedData: Partial<Mascota>
  // eslint-disable-next-line
  onUpdateField: <K extends keyof Mascota>(field: K, value: Mascota[K]) => void
}

export const InfoPrincipalMascota: React.FC<InfoPrincipalMascotaProps> = ({
  mascota,
  isEditMode,
  editedData,
  onUpdateField,
}) => {
  const { t } = useTranslation()

  return (
    <Card style={styles.mainCard} elevated>
      <View style={styles.mainInfo}>
        <View style={{ flex: 1, marginRight: 10 }}>
          {isEditMode ? (
            <>
              <View style={{ marginBottom: 12 }}>
                <TextInput
                  label={t('mascotas:campos.nombre')}
                  value={editedData.nombre}
                  onChangeText={text => onUpdateField('nombre', text)}
                />
              </View>
              <TextInput
                label={t('mascotas:campos.raza')}
                value={editedData.raza}
                onChangeText={text => onUpdateField('raza', text)}
              />
            </>
          ) : (
            <>
              <Text style={styles.name}>{mascota.nombre}</Text>
              <Text style={styles.breed}>
                {mascota.raza || t('mascotas:tipos.' + mascota.especie)}
              </Text>
            </>
          )}
        </View>
        {!isEditMode && (
          <Badge
            label={t('mascotas:generos.' + mascota.genero)}
            variant={mascota.genero === 'macho' ? 'info' : 'exito'}
            size="sm"
          />
        )}
      </View>

      {isEditMode ? (
        <View key="edit-stats" style={styles.statsContainerEdit}>
          <View style={styles.inputWrapper}>
            <DatePicker
              label={t('mascotas:campos.fecha_nacimiento')}
              value={editedData.fecha_nacimiento}
              onValueChange={date => onUpdateField('fecha_nacimiento', date)}
            />
          </View>
          <View style={styles.inputWrapper}>
            <TextInput
              label={t('mascotas:campos.peso') + ' (kg)'}
              value={editedData.peso?.toString()}
              onChangeText={text =>
                onUpdateField('peso', parseFloat(text) || 0)
              }
              keyboardType="numeric"
            />
          </View>
        </View>
      ) : (
        <View key="view-stats" style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>{t('mascotas:campos.edad')}</Text>
            <Text
              style={styles.statValue}
              numberOfLines={1}
              adjustsFontSizeToFit
            >
              {formatearEdadMascota(mascota.fecha_nacimiento, t)}
            </Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>{t('mascotas:campos.peso')}</Text>
            <Text
              style={styles.statValue}
              numberOfLines={1}
              adjustsFontSizeToFit
            >
              {mascota.peso} kg
            </Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>{t('mascotas:campos.tamano')}</Text>
            <Text
              style={styles.statValue}
              numberOfLines={1}
              adjustsFontSizeToFit
            >
              {t('mascotas:tamanos.' + mascota.tamano?.replace(' ', '_'))}
            </Text>
          </View>
        </View>
      )}
    </Card>
  )
}

const styles = StyleSheet.create({
  mainCard: {
    marginBottom: 24,
  },
  mainInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  name: {
    fontSize: 24,
    fontWeight: '700',
    color: COLOR.TEXTO,
    marginBottom: 4,
  },
  breed: {
    fontSize: 16,
    color: COLOR.SUBTEXTO,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLOR.SECUNDARIO,
    borderRadius: 8,
    padding: 12,
    width: '100%',
  },
  statsContainerEdit: {
    flexDirection: 'column',
    gap: 16,
    backgroundColor: COLOR.SECUNDARIO,
    borderRadius: 8,
    padding: 12,
    width: '100%',
  },
  inputWrapper: {
    width: '100%',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: COLOR.BORDE,
  },
  statLabel: {
    fontSize: 12,
    color: COLOR.SUBTEXTO,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 14,
    fontWeight: '600',
    color: COLOR.TEXTO,
  },
})
