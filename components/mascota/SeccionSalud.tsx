import React from 'react'
import { View, Text, StyleSheet, Pressable } from 'react-native'
import { useTranslation } from 'react-i18next'
import { COLOR } from '@/constants'
import Card from '@/components/ui/Card'
import Icon from '@/components/ui/Icon'
import { TextInput, DatePicker } from '@/components/ui'
import type { Mascota } from '@/models/Mascota'

interface SeccionSaludProps {
  mascota: Mascota
  isEditMode: boolean
  editedData: Partial<Mascota>
  // eslint-disable-next-line
  onUpdateField: <K extends keyof Mascota>(field: K, value: Mascota[K]) => void
}

/**
 * Sección de salud del perfil de mascota.
 * Muestra info de esterilizado, vacunas, alergias, condiciones de salud.
 * Corresponde al Nivel 4 (100%) de completitud
 */
export const SeccionSalud: React.FC<SeccionSaludProps> = ({
  mascota,
  isEditMode,
  editedData,
  onUpdateField,
}) => {
  const { t } = useTranslation()

  // Obtener valores actuales
  const esterilizado = isEditMode
    ? editedData.esterilizado
    : mascota.esterilizado
  const vacunas = isEditMode ? editedData.vacunas : mascota.vacunas
  const condicionesSalud = isEditMode
    ? editedData.condiciones_salud
    : mascota.condiciones_salud

  const handleAgregarVacuna = () => {
    const nuevasVacunas = [...(vacunas || []), { nombre: '' }]
    onUpdateField('vacunas', nuevasVacunas as any)
  }

  const handleEliminarVacuna = (index: number) => {
    const nuevasVacunas = (vacunas || []).filter((_, i) => i !== index)
    onUpdateField('vacunas', nuevasVacunas as any)
  }

  const handleActualizarVacuna = (
    index: number,
    campo: string,
    valor: string | Date
  ) => {
    const nuevasVacunas = [...(vacunas || [])]
    if (nuevasVacunas[index]) {
      nuevasVacunas[index] = {
        ...nuevasVacunas[index],
        [campo]: valor,
      }
      onUpdateField('vacunas', nuevasVacunas as any)
    }
  }

  return (
    <Card style={styles.container} elevated>
      <Text style={styles.sectionTitle}>{t('mascotas:detalle.salud')}</Text>

      {isEditMode ? (
        <View style={styles.editContainer}>
          {/* Esterilizado - Toggle */}
          <View style={styles.fieldGroup}>
            <View style={styles.fieldHeader}>
              <Text style={styles.fieldLabel}>
                {t('mascotas:campos.esterilizado')}
              </Text>
              <Pressable
                style={[
                  styles.toggleButton,
                  esterilizado && styles.toggleButtonActive,
                ]}
                onPress={() =>
                  onUpdateField('esterilizado', !esterilizado as any)
                }
              >
                <Icon
                  name={esterilizado ? 'check' : 'times'}
                  size={16}
                  color={esterilizado ? COLOR.EXITO : COLOR.ERROR}
                />
              </Pressable>
            </View>
          </View>

          {/* Vacunas - Lista editable */}
          <View style={[styles.fieldGroup, { marginTop: 16 }]}>
            <View style={styles.fieldHeader}>
              <Text style={styles.fieldLabel}>
                {t('mascotas:detalle.vacuna')}
              </Text>
              <Pressable style={styles.addButton} onPress={handleAgregarVacuna}>
                <Icon name="plus" size={16} color={COLOR.PRIMARIO} />
              </Pressable>
            </View>

            {vacunas && vacunas.length > 0 ? (
              <View style={styles.vacunasList}>
                {vacunas.map((vacuna, index) => (
                  <View key={index} style={styles.vacunaItem}>
                    <View style={styles.vacunaContent}>
                      <TextInput
                        placeholder={t('mascotas:placeholders.nombre_vacuna')}
                        value={vacuna.nombre || ''}
                        onChangeText={text =>
                          handleActualizarVacuna(index, 'nombre', text)
                        }
                        style={styles.vacunaInput}
                      />
                      <DatePicker
                        label={
                          t('mascotas:campos.fecha_vacuna') ||
                          'Fecha (opcional)'
                        }
                        value={vacuna.fecha}
                        onValueChange={date =>
                          handleActualizarVacuna(index, 'fecha', date)
                        }
                        style={styles.vacunaDateInput}
                      />
                    </View>
                    <Pressable
                      style={styles.deleteButton}
                      onPress={() => handleEliminarVacuna(index)}
                    >
                      <Icon name="trash" size={16} color={COLOR.ERROR} />
                    </Pressable>
                  </View>
                ))}
              </View>
            ) : (
              <Text style={styles.emptyText}>{t('mascotas:sin_definir')}</Text>
            )}
          </View>

          {/* Condiciones de salud - Tags/Pills */}
          <View style={[styles.fieldGroup, { marginTop: 16 }]}>
            <Text style={styles.fieldLabel}>
              {t('mascotas:campos.condiciones_salud')}
            </Text>
            <TextInput
              placeholder={t('mascotas:placeholders.condiciones_salud')}
              value={condicionesSalud?.join(', ') || ''}
              onChangeText={text =>
                onUpdateField(
                  'condiciones_salud',
                  text
                    .split(',')
                    .map(s => s.trim())
                    .filter(Boolean) as any
                )
              }
              multiline
              style={styles.textAreaInput}
            />
          </View>
        </View>
      ) : (
        <View style={styles.viewContainer}>
          {/* Estado - Check/X */}
          <View style={styles.healthSection}>
            <Text style={styles.subsectionTitle}>Estado</Text>
            <View style={styles.statusRow}>
              <View style={styles.statusItem}>
                <Icon
                  name={esterilizado ? 'check-circle' : 'times-circle'}
                  size={24}
                  color={esterilizado ? COLOR.EXITO : COLOR.ALERTA}
                />
                <Text
                  style={[
                    styles.statusLabel,
                    { color: esterilizado ? COLOR.EXITO : COLOR.ALERTA },
                  ]}
                >
                  {t('mascotas:campos.esterilizado')}
                </Text>
              </View>
            </View>
          </View>

          {/* Vacunas - Pills */}
          {vacunas && vacunas.length > 0 ? (
            <View style={styles.healthSection}>
              <Text style={styles.subsectionTitle}>
                Vacunas ({vacunas.length})
              </Text>
              <View style={styles.pillsContainer}>
                {vacunas.map((vacuna, index) => (
                  <View key={index} style={styles.pill}>
                    <Icon name="check" size={12} color={COLOR.EXITO} />
                    <Text style={styles.pillText} numberOfLines={1}>
                      {vacuna.nombre}
                    </Text>
                    {vacuna.fecha && (
                      <Text style={styles.pillDate}>
                        {new Date(vacuna.fecha).toLocaleDateString('es-CO', {
                          month: 'short',
                          year: 'numeric',
                        })}
                      </Text>
                    )}
                  </View>
                ))}
              </View>
            </View>
          ) : null}

          {/* Condiciones de salud */}
          {condicionesSalud && condicionesSalud.length > 0 ? (
            <View style={styles.healthSection}>
              <Text style={styles.subsectionTitle}>Condiciones Médicas</Text>
              <View style={styles.conditionsContainer}>
                {condicionesSalud.map((c, i) => (
                  <View key={i} style={styles.conditionTag}>
                    <Icon name="alert-circle" size={12} color={COLOR.ALERTA} />
                    <Text style={styles.conditionText}>{c}</Text>
                  </View>
                ))}
              </View>
            </View>
          ) : null}
        </View>
      )}
    </Card>
  )
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLOR.TEXTO,
    marginBottom: 14,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  editContainer: {
    gap: 0,
  },
  viewContainer: {
    gap: 16,
  },
  healthSection: {
    gap: 8,
  },
  subsectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: COLOR.TEXTO,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  statusRow: {
    flexDirection: 'row',
    gap: 12,
    flexWrap: 'wrap',
  },
  statusItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: `${COLOR.SECUNDARIO}`,
    borderWidth: 1,
    borderColor: `${COLOR.BORDE}40`,
  },
  statusLabel: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  pillsContainer: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: `${COLOR.EXITO}15`,
    borderRadius: 16,
    borderWidth: 0.5,
    borderColor: `${COLOR.EXITO}40`,
  },
  pillText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLOR.EXITO,
    maxWidth: 120,
  },
  pillDate: {
    fontSize: 10,
    fontWeight: '500',
    color: `${COLOR.EXITO}`,
    opacity: 0.7,
  },
  conditionsContainer: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  conditionTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: `${COLOR.ALERTA}15`,
    borderRadius: 16,
    borderWidth: 0.5,
    borderColor: `${COLOR.ALERTA}40`,
  },
  conditionText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLOR.ALERTA,
  },
  fieldGroup: {
    paddingBottom: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: COLOR.BORDE,
  },
  fieldHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: COLOR.TEXTO,
    letterSpacing: 0.3,
  },
  toggleButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: `${COLOR.ERROR}12`,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLOR.ERROR,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 3,
    elevation: 2,
  },
  toggleButtonActive: {
    backgroundColor: `${COLOR.EXITO}15`,
    borderColor: COLOR.EXITO,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    elevation: 3,
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: `${COLOR.PRIMARIO}15`,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: `${COLOR.PRIMARIO}40`,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 3,
    elevation: 2,
  },
  vacunasList: {
    gap: 12,
  },
  vacunaItem: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: COLOR.SECUNDARIO,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: `${COLOR.BORDE}80`,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 3,
    elevation: 1,
  },
  vacunaContent: {
    flex: 1,
    gap: 10,
  },
  vacunaInput: {
    flex: 1,
  },
  vacunaDateInput: {
    flex: 1,
  },
  deleteButton: {
    padding: 8,
    marginTop: 2,
    borderRadius: 8,
    backgroundColor: `${COLOR.ERROR}08`,
  },
  textAreaInput: {
    minHeight: 80,
    paddingVertical: 8,
    paddingHorizontal: 10,
    backgroundColor: COLOR.SECUNDARIO,
    borderRadius: 8,
    borderWidth: 0.5,
    borderColor: COLOR.BORDE,
    color: COLOR.TEXTO,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: COLOR.TEXTO,
    letterSpacing: 0.2,
  },
  emptyText: {
    fontSize: 13,
    color: COLOR.SUBTEXTO,
    fontStyle: 'italic',
  },
})
