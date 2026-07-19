import React from 'react'
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'
import { useTranslation } from 'react-i18next'
import { Avatar, Icon } from '@/components/ui'
import { CuidadorAvatarButton } from '@/components/cuidador'
import { COLOR } from '@/constants'

interface Props {
  uri?: string | null
  name?: string
  size?: number
  rating?: number | null
  count?: number | null
  onChat?: () => void
  /**
   * ID del cuidador en Firestore. Si se proporciona, el avatar será clickeable
   * y abrirá el perfil completo del cuidador en un modal
   */
  cuidadorId?: string
}

const InfoCuidadorCard: React.FC<Props> = ({
  uri,
  name,
  size = 56,
  rating,
  count,
  onChat,
  cuidadorId,
}) => {
  const { t } = useTranslation()

  return (
    <View style={styles.container}>
      {cuidadorId ? (
        <CuidadorAvatarButton
          cuidadorId={cuidadorId}
          foto={uri}
          nombre={name || t('comun:cuidador_anonimo')}
          size={size}
        />
      ) : (
        <Avatar
          uri={uri}
          name={name || t('comun:cuidador_anonimo')}
          size={size}
        />
      )}
      <View style={styles.info}>
        <Text style={styles.label}>{t('paseos:detalle.cuidador')}</Text>
        <Text style={styles.name}>{name || t('comun:cuidador_anonimo')}</Text>
        <View style={styles.row}>
          <View style={styles.ratingContainer}>
            <Icon name="star" size={14} color={COLOR.ALERTA} />
            <Text style={styles.ratingText}>
              {rating != null ? Number(rating).toFixed(1) : t('comun:nuevo')}
            </Text>
          </View>
          {typeof count === 'number' && (
            <Text style={styles.countText}>
              • {count} {t('paseos:tarjeta.cuidador')}
            </Text>
          )}
        </View>
      </View>

      {onChat && (
        <TouchableOpacity style={styles.chatButton} onPress={onChat}>
          <Icon name="comment-dots" size={20} color={COLOR.PRIMARIO} />
        </TouchableOpacity>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${COLOR.TEXTO}08`,
    padding: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: `${COLOR.TEXTO}0D`,
  },
  info: { flex: 1, marginLeft: 12 },
  label: {
    fontSize: 10,
    color: COLOR.SUBTEXTO,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 2,
  },
  name: { color: COLOR.TEXTO, fontSize: 16, fontWeight: '700' },
  row: { flexDirection: 'row', alignItems: 'center', marginTop: 6 },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${COLOR.ALERTA}15`,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  ratingText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLOR.ALERTA,
    marginLeft: 6,
  },
  countText: { fontSize: 13, color: COLOR.SUBTEXTO, marginLeft: 10 },
  chatButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: `${COLOR.TEXTO}0D`,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
})

export default InfoCuidadorCard
