import React, { useState } from 'react'
import { StyleSheet, View, Text, Alert, Image, ScrollView } from 'react-native'
import { useTranslation } from 'react-i18next'
import { COLOR } from '@/constants'
import { Button, Card, Icon } from '@/components/ui'
import Switch from '@/components/ui/Switch'
import { useConfirmarPaseo } from '@/hooks/paseos/useConfirmarPaseo'
import { PetAvatar } from '@/components/ui/PetAvatar'

interface Props {
  mascotaIds: string[]
  fecha: Date | null
  hora: string | null
  duracion: number | null
  cuidadorId: string | null
  esCompartido: boolean
  onCompartidoChange: (value: boolean) => void
  onConfirm: () => void
  onBack: () => void
}

export const ConfirmarPaseoPaso = ({
  mascotaIds,
  fecha,
  hora,
  duracion,
  cuidadorId,
  esCompartido,
  onCompartidoChange,
  onConfirm,
  onBack,
}: Props) => {
  const { t } = useTranslation()
  const { mascotas, cuidador, total, loading, error, confirmarReserva } =
    useConfirmarPaseo({
      mascotaIds,
      cuidadorId,
      fecha,
      hora,
      duracion,
      esCompartido,
    })

  const COMPARTIDO_DISCOUNT = 0.15 // 15% descuento para paseos compartidos
  const subtotal = total
  const descuento = esCompartido ? subtotal * COMPARTIDO_DISCOUNT : 0
  const totalConDescuento = subtotal - descuento

  const handleConfirmar = async () => {
    const success = await confirmarReserva()
    if (success) {
      Alert.alert(
        t('paseos:pasos.confirmar.exito_titulo'),
        t('paseos:pasos.confirmar.exito_msg', {
          name:
            cuidador?.nombre ||
            t(
              'paseos:pasos.confirmar.solicitud_abierta_nombre',
              'Solicitud Abierta'
            ),
        }),
        [{ text: 'OK', onPress: onConfirm }]
      )
    } else if (error) {
      Alert.alert('Error', error)
    }
  }

  const formatDate = (date: Date | null) => {
    if (!date) return ''
    return date.toLocaleDateString() // Simplificado por ahora
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t('paseos:pasos.confirmar.titulo')}</Text>

      <Card style={styles.card} elevated>
        {/* Sección Mascotas */}
        <View style={styles.section}>
          <Text style={styles.label}>
            {t('paseos:pasos.confirmar.resumen_mascotas')}
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.petsRow}
            style={styles.petsScroll}
          >
            {mascotas.map(pet => (
              <View key={pet.id} style={styles.petItem}>
                <PetAvatar uri={pet.foto} size="medium" />
                <Text style={styles.petName}>{pet.nombre}</Text>
              </View>
            ))}
          </ScrollView>
        </View>

        <View style={styles.divider} />

        {/* Sección Fecha y Hora */}
        <View style={styles.section}>
          <Text style={styles.label}>
            {t('paseos:pasos.confirmar.resumen_fecha')}
          </Text>
          <View style={styles.row}>
            <View style={{ width: 20, alignItems: 'center', marginRight: 8 }}>
              <Icon name="calendar" size={16} color={COLOR.PRIMARIO} />
            </View>
            <Text style={styles.value}>
              {formatDate(fecha)} - {hora} ({duracion || 60} min)
            </Text>
          </View>
        </View>

        <View style={styles.divider} />

        {/* Sección Cuidador */}
        <View style={styles.section}>
          <Text style={styles.label}>
            {t('paseos:pasos.confirmar.resumen_cuidador')}
          </Text>
          <View style={styles.row}>
            {cuidador ? (
              <>
                <Image
                  source={{ uri: cuidador.imagen }}
                  style={styles.avatarMini}
                />
                <Text style={styles.value}>{cuidador.nombre}</Text>
              </>
            ) : (
              <>
                <View
                  style={[
                    styles.avatarMini,
                    {
                      backgroundColor: 'rgba(42, 134, 168, 0.2)',
                      justifyContent: 'center',
                      alignItems: 'center',
                      borderWidth: 1,
                      borderColor: COLOR.INFO,
                    },
                  ]}
                >
                  <Icon name="bullhorn" size={16} color={COLOR.INFO} />
                </View>
                <Text style={styles.value}>
                  {t(
                    'paseos:pasos.confirmar.solicitud_abierta_nombre',
                    'Solicitud Abierta'
                  )}
                </Text>
              </>
            )}
          </View>
        </View>

        <View style={styles.divider} />

        {/* Paseo Compartido Option - Always visible savings banner */}
        <View style={styles.section}>
          <View style={styles.savingsBanner}>
            <Icon
              name={esCompartido ? 'check-circle' : 'star'}
              size={14}
              color={COLOR.EXITO}
            />
            <Text style={styles.savingsText}>
              {t('paseos:pasos.confirmar.ahorro_mensaje', {
                descuento: Math.round(COMPARTIDO_DISCOUNT * 100),
              })}
            </Text>
          </View>
          <View style={{ marginTop: 8 }}>
            <Switch
              value={esCompartido}
              onValueChange={onCompartidoChange}
              label={t('paseos:pasos.confirmar.paseo_compartido_label')}
              description={t('paseos:pasos.confirmar.paseo_compartido_desc')}
            />
          </View>
        </View>

        <View style={styles.divider} />

        {/* Price Breakdown */}
        <View style={styles.priceSection}>
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>
              {t('paseos:pasos.confirmar.costo_servicio')}
            </Text>
            <Text style={styles.priceValue}>${subtotal.toLocaleString()}</Text>
          </View>
          {esCompartido && (
            <View style={styles.priceRow}>
              <Text style={[styles.priceLabel, styles.discountText]}>
                {t('paseos:pasos.confirmar.descuento_compartido')}
              </Text>
              <Text style={[styles.priceValue, styles.discountText]}>
                -${descuento.toLocaleString()}
              </Text>
            </View>
          )}
        </View>

        {/* Total Price */}
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>
            {t('paseos:pasos.confirmar.total')}
          </Text>
          <Text style={styles.totalValue}>
            ${totalConDescuento.toLocaleString()}
          </Text>
        </View>
      </Card>

      <View style={styles.actions}>
        <Button
          title={t('comun:atras')}
          variant="bloque"
          onPress={onBack}
          disabled={loading}
          style={{ flex: 1 }}
        />
        <Button
          title={loading ? '...' : t('paseos:pasos.confirmar.btn_confirmar')}
          variant="primario"
          onPress={handleConfirmar}
          loading={loading}
          style={{ flex: 1 }}
        />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    padding: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: COLOR.TEXTO,
    textAlign: 'center',
    marginBottom: 12,
  },
  card: {
    padding: 12,
    backgroundColor: COLOR.BLOQUE, // Fixed COLOR
    borderRadius: 12,
  },
  section: {
    marginBottom: 8,
  },
  label: {
    fontSize: 10,
    color: COLOR.SUBTEXTO,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontWeight: '600',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  value: {
    fontSize: 14,
    color: COLOR.TEXTO,
    fontWeight: '500',
  },
  petsRow: {
    flexDirection: 'row',
    gap: 8,
    paddingRight: 8,
  },
  petsScroll: {
    flexGrow: 0,
  },
  petItem: {
    alignItems: 'center',
  },
  petName: {
    fontSize: 11,
    color: COLOR.TEXTO,
    marginTop: 3,
  },
  avatarMini: {
    width: 20,
    height: 20,
    borderRadius: 10,
    marginRight: 6,
  },
  divider: {
    height: 1,
    backgroundColor: COLOR.BORDE,
    marginVertical: 8,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
    paddingTop: 8,
    borderTopWidth: 2,
    borderTopColor: COLOR.BORDE,
  },
  totalLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: COLOR.TEXTO,
  },
  totalValue: {
    fontSize: 18,
    fontWeight: '700',
    color: COLOR.PRIMARIO,
  },
  savingsBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(76, 175, 80, 0.15)',
    padding: 10,
    borderRadius: 8,
    marginTop: 6,
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(76, 175, 80, 0.3)',
  },
  savingsText: {
    fontSize: 12,
    color: COLOR.EXITO,
    fontWeight: '700',
    flex: 1,
  },
  priceSection: {
    marginBottom: 6,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  priceLabel: {
    fontSize: 13,
    color: COLOR.SUBTEXTO,
  },
  priceValue: {
    fontSize: 13,
    color: COLOR.TEXTO,
    fontWeight: '500',
  },
  discountText: {
    color: COLOR.EXITO,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
})
