import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { useTranslation } from 'react-i18next'
import { COLOR } from '@/constants'
import Icon from '@/components/ui/Icon'
import Badge from '@/components/ui/Badge'
import type { Mascota } from '@/models/Mascota'

interface DetalleInfoMascotaProps {
  mascota: Mascota
}

export const DetalleInfoMascota: React.FC<DetalleInfoMascotaProps> = ({
  mascota,
}) => {
  const { t } = useTranslation()

  return (
    <View style={styles.detailsSection}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('mascotas:detalle.salud')}</Text>
        <View style={styles.tagsContainer}>
          {mascota.esterilizado && (
            <Badge
              label={t('mascotas:campos.esterilizado')}
              variant="exito"
              style={styles.tag}
            />
          )}
          {mascota.vacunas?.map((v, i) => (
            <Badge
              key={i}
              label={`${t('mascotas:detalle.vacuna')}${v.nombre}`}
              variant="info"
              style={styles.tag}
            />
          ))}
          {mascota.condiciones_salud?.map((c, i) => (
            <Badge key={i} label={c} variant="alerta" style={styles.tag} />
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          {t('mascotas:detalle.comportamiento')}
        </Text>
        <View style={styles.infoRow}>
          <Icon name="bolt" size={16} color={COLOR.ENFASIS} />
          <Text style={styles.infoLabel}>
            {t('mascotas:campos.nivel_energia')}:
          </Text>
          <Text style={styles.infoValue}>
            {t('mascotas:energia.' + mascota.nivel_energia)}
          </Text>
        </View>
      </View>

      {/* Espacio extra para scroll */}
      <View style={{ height: 60 }} />
    </View>
  )
}

const styles = StyleSheet.create({
  detailsSection: {
    // Contenido extra
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLOR.TEXTO,
    marginBottom: 12,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  tag: {
    marginVertical: 0,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  infoLabel: {
    fontSize: 14,
    color: COLOR.SUBTEXTO,
    marginLeft: 8,
    marginRight: 4,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: COLOR.TEXTO,
  },
})
