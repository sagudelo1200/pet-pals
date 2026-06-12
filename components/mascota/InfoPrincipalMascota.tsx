import React, { useMemo, useEffect } from 'react'
import { View, Text, StyleSheet, Pressable } from 'react-native'
import { useTranslation } from 'react-i18next'
import { COLOR } from '@/constants'
import { formatearEdadMascota } from '@/logic/mascotas/utilidades'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import Icon from '@/components/ui/Icon'
import { TextInput, DatePicker } from '@/components/ui'
import type { Mascota, TamanoMascota } from '@/models/Mascota'

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

  // Establecer Macho como default si no hay género definido
  useEffect(() => {
    if (isEditMode && !editedData.genero) {
      onUpdateField('genero', 'macho')
    }
  }, [isEditMode, editedData.genero, onUpdateField])

  // Opciones de tamaño
  const opcionesTamano = useMemo(
    () => [
      { label: t('mascotas:tamanos.pequeno'), value: 'pequeño', icon: 'paw' },
      { label: t('mascotas:tamanos.mediano'), value: 'mediano', icon: 'dog' },
      { label: t('mascotas:tamanos.grande'), value: 'grande', icon: 'horse' },
      {
        label: t('mascotas:tamanos.gigante'),
        value: 'gigante',
        icon: 'dragon',
      },
    ],
    [t]
  )

  return (
    <>
      {/* Card 1: Nombre y Raza */}
      <Card style={styles.card} elevated>
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
      </Card>

      {/* Card 2: Fecha de Nacimiento y Género */}
      <Card style={styles.card} elevated>
        <View style={styles.cardContent}>
          {isEditMode ? (
            <>
              <DatePicker
                label={t('mascotas:campos.fecha_nacimiento')}
                value={editedData.fecha_nacimiento}
                onValueChange={date => onUpdateField('fecha_nacimiento', date)}
              />
              <View>
                <Text style={styles.fieldLabel}>
                  {t('mascotas:campos.genero')}
                </Text>
                <View style={styles.genderButtonContainer}>
                  <Pressable
                    style={[
                      styles.genderButton,
                      editedData.genero === 'macho'
                        ? styles.genderButtonMachoActive
                        : styles.genderButtonMachoInactive,
                    ]}
                    onPress={() => onUpdateField('genero', 'macho')}
                  >
                    <Icon
                      name="dog"
                      size={editedData.genero === 'macho' ? 32 : 28}
                      color={
                        editedData.genero === 'macho' ? '#3498db' : '#7f8c8d'
                      }
                    />
                    <Text
                      style={[
                        styles.genderButtonLabel,
                        editedData.genero === 'macho' &&
                          styles.genderButtonLabelActive,
                      ]}
                    >
                      {t('mascotas:generos.macho')}
                    </Text>
                  </Pressable>
                  <Pressable
                    style={[
                      styles.genderButton,
                      editedData.genero === 'hembra'
                        ? styles.genderButtonHembraActive
                        : styles.genderButtonHembraInactive,
                    ]}
                    onPress={() => onUpdateField('genero', 'hembra')}
                  >
                    <Icon
                      name="dog"
                      size={editedData.genero === 'hembra' ? 32 : 28}
                      color={
                        editedData.genero === 'hembra' ? '#f06292' : '#7f8c8d'
                      }
                      style={{ transform: [{ scaleX: -1 }] }}
                    />
                    <Text
                      style={[
                        styles.genderButtonLabel,
                        editedData.genero === 'hembra' &&
                          styles.genderButtonLabelActive,
                      ]}
                    >
                      {t('mascotas:generos.hembra')}
                    </Text>
                  </Pressable>
                </View>
              </View>
            </>
          ) : (
            <View style={styles.viewRow}>
              <View style={styles.statContainer}>
                <Text style={styles.statLabel}>
                  {t('mascotas:campos.edad')}
                </Text>
                <Text style={styles.statValue}>
                  {formatearEdadMascota(mascota.fecha_nacimiento, t)}
                </Text>
              </View>
              <View
                style={[
                  styles.statContainer,
                  {
                    borderLeftWidth: 1,
                    borderLeftColor: `${COLOR.BORDE}40`,
                    paddingLeft: 16,
                  },
                ]}
              >
                <Text style={styles.statLabel}>
                  {t('mascotas:campos.genero')}
                </Text>
                <Text style={styles.statValue}>
                  {t('mascotas:generos.' + mascota.genero)}
                </Text>
              </View>
            </View>
          )}
        </View>
      </Card>

      {/* Card 3: Peso y Tamaño */}
      <Card style={styles.card} elevated>
        <View style={styles.cardContent}>
          {isEditMode ? (
            <>
              <TextInput
                label={t('mascotas:campos.peso') + ' (kg)'}
                value={editedData.peso?.toString()}
                onChangeText={text =>
                  onUpdateField('peso', parseFloat(text) || 0)
                }
                keyboardType="numeric"
              />
              <View>
                <Text style={styles.fieldLabel}>
                  {t('mascotas:campos.tamano')}
                </Text>
                <View style={styles.sizeButtonContainerCompact}>
                  {opcionesTamano.map(size => (
                    <Pressable
                      key={size.value}
                      style={[
                        styles.sizeButtonCompact,
                        editedData.tamano === size.value &&
                          styles.sizeButtonActive,
                      ]}
                      onPress={() =>
                        onUpdateField('tamano', size.value as TamanoMascota)
                      }
                    >
                      <Icon
                        name={size.icon}
                        size={20}
                        color={
                          editedData.tamano === size.value
                            ? COLOR.PRIMARIO
                            : COLOR.SUBTEXTO
                        }
                      />
                      <Text
                        style={[
                          styles.sizeButtonLabel,
                          editedData.tamano === size.value &&
                            styles.sizeButtonLabelActive,
                        ]}
                        numberOfLines={1}
                      >
                        {size.label}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            </>
          ) : (
            <View style={styles.viewRow}>
              <View style={styles.statContainer}>
                <Text style={styles.statLabel}>
                  {t('mascotas:campos.peso')}
                </Text>
                <Text style={styles.statValue}>
                  {mascota.peso} {t('mascotas:unidades.kg')}
                </Text>
              </View>
              <View
                style={[
                  styles.statContainer,
                  {
                    borderLeftWidth: 1,
                    borderLeftColor: `${COLOR.BORDE}40`,
                    paddingLeft: 16,
                  },
                ]}
              >
                <Text style={styles.statLabel}>
                  {t('mascotas:campos.tamano')}
                </Text>
                <Text style={styles.statValue}>
                  {t('mascotas:tamanos.' + (mascota.tamano || 'undefined'))}
                </Text>
              </View>
            </View>
          )}
        </View>
      </Card>
    </>
  )
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 3,
  },
  cardContent: {
    gap: 12,
    paddingBottom: 16,
  },
  mainInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 0,
  },
  name: {
    fontSize: 24,
    fontWeight: '800',
    color: COLOR.TEXTO,
    marginBottom: 2,
    letterSpacing: -0.3,
  },
  breed: {
    fontSize: 16,
    color: COLOR.SUBTEXTO,
    fontWeight: '500',
    letterSpacing: 0.1,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: COLOR.SUBTEXTO,
    marginBottom: 4,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  statValue: {
    fontSize: 15,
    fontWeight: '600',
    color: COLOR.TEXTO,
    letterSpacing: 0.1,
  },
  viewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  statContainer: {
    flex: 1,
    paddingRight: 16,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: COLOR.TEXTO,
    marginBottom: 8,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  genderButtonContainer: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'space-between',
  },
  genderButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  genderButtonLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLOR.SUBTEXTO,
    letterSpacing: 0.2,
  },
  genderButtonLabelActive: {
    color: COLOR.TEXTO,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  genderButtonMachoActive: {
    borderColor: '#3498db',
    backgroundColor: '#3498db25',
  },
  genderButtonMachoInactive: {
    borderColor: '#3498db40',
    backgroundColor: '#3498db08',
  },
  genderButtonHembraActive: {
    borderColor: '#f06292',
    backgroundColor: '#f0629225',
  },
  genderButtonHembraInactive: {
    borderColor: '#f0629240',
    backgroundColor: '#f0629208',
  },
  sizeButtonContainerCompact: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
  },
  sizeButtonCompact: {
    flex: 1,
    minWidth: '32%',
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: `${COLOR.BORDE}60`,
    backgroundColor: `${COLOR.SECUNDARIO}`,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  sizeButtonActive: {
    borderColor: COLOR.PRIMARIO,
    backgroundColor: `${COLOR.PRIMARIO}20`,
    borderWidth: 2,
  },
  sizeButtonIcon: {
    fontSize: 16,
  },
  sizeButtonLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: COLOR.SUBTEXTO,
    textAlign: 'center',
    letterSpacing: 0.1,
  },
  sizeButtonLabelActive: {
    color: COLOR.TEXTO,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
})
