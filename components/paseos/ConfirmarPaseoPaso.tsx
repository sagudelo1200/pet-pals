import React, { useState } from 'react'
import { StyleSheet, View, Text, Alert, Image, ScrollView } from 'react-native'
import { useTranslation } from 'react-i18next'
import { COLOR } from '@/constants'
import { Button, Card, Icon } from '@/components/ui'
import { useConfirmarPaseo } from '@/hooks/paseos/useConfirmarPaseo'
import { PetAvatar } from '@/components/ui/PetAvatar'

interface Props {
  petIds: string[]
  fecha: Date | null
  hora: string | null
  walkerId: string | null
  onConfirm: () => void
  onBack: () => void
}

export const ConfirmarPaseoPaso = ({ petIds, fecha, hora, walkerId, onConfirm, onBack }: Props) => {
  const { t } = useTranslation()
  const { mascotas, cuidador, total, loading, error, confirmarReserva } = useConfirmarPaseo({ petIds, walkerId, fecha, hora })

  const handleConfirmar = async () => {
    const success = await confirmarReserva()
    if (success) {
      Alert.alert(
        t('paseos:pasos.confirmar.exito_titulo'),
        t('paseos:pasos.confirmar.exito_msg', { name: cuidador?.nombre || 'Tutor' }),
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
      <Text style={styles.title}>
        {t('paseos:pasos.confirmar.titulo')}
      </Text>

      <Card style={styles.card} elevated>
        {/* Sección Mascotas */}
        <View style={styles.section}>
          <Text style={styles.label}>{t('paseos:pasos.confirmar.resumen_mascotas')}</Text>
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
          <Text style={styles.label}>{t('paseos:pasos.confirmar.resumen_fecha')}</Text>
          <View style={styles.row}>
            <View style={{ width: 20, alignItems: 'center', marginRight: 8 }}>
              <Icon name="calendar" size={16} color={COLOR.PRIMARIO} />
            </View>
            <Text style={styles.value}>{formatDate(fecha)} - {hora}</Text>
          </View>
        </View>

        <View style={styles.divider} />

        {/* Sección Cuidador */}
        <View style={styles.section}>
          <Text style={styles.label}>{t('paseos:pasos.confirmar.resumen_cuidador')}</Text>
          <View style={styles.row}>
             {cuidador && (
               <>
                 <Image source={{ uri: cuidador.imagen }} style={styles.avatarMini} />
                 <Text style={styles.value}>{cuidador.nombre}</Text>
               </>
             )}
          </View>
        </View>

        <View style={styles.divider} />

        {/* Total Price */}
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>{t('paseos:pasos.confirmar.total')}</Text>
          <Text style={styles.totalValue}>${total.toLocaleString()}</Text>
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
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: COLOR.TEXTO,
    textAlign: 'center',
    marginBottom: 16,
  },
  card: {
    padding: 16,
    backgroundColor: COLOR.BLOQUE, // Fixed COLOR
    borderRadius: 16,
  },
  section: {
    marginBottom: 12,
  },
  label: {
    fontSize: 12,
    color: COLOR.SUBTEXTO,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  value: {
    fontSize: 16,
    color: COLOR.TEXTO,
    fontWeight: '500',
  },
  petsRow: {
    flexDirection: 'row',
    gap: 12,
    paddingRight: 16, // Padding for last item
  },
  petsScroll: {
    flexGrow: 0, // Don't take all space if not needed
  },
  petItem: {
    alignItems: 'center',
  },
  petName: {
    fontSize: 12,
    color: COLOR.TEXTO,
    marginTop: 4,
  },
  avatarMini: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginRight: 8,
  },
  divider: {
    height: 1,
    backgroundColor: COLOR.BORDE,
    marginVertical: 12,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLOR.TEXTO,
  },
  totalValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLOR.PRIMARIO,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
})
