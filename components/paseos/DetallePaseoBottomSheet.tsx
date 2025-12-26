import React from 'react'
import { Text, StyleSheet, View, ActivityIndicator } from 'react-native'
import { BottomSheet, Button, Icon, Avatar } from '@/components/ui'
import { COLOR } from '@/constants'
import { Paseo, ESTADOS_PASEO } from '@/models/Paseo'
import { useTranslation } from 'react-i18next'

interface Props {
  visible: boolean
  onClose: () => void
  title?: string
  paseo?: Paseo | null
}

const DetallePaseoBottomSheet: React.FC<Props> = ({
  visible,
  onClose,
  title,
  paseo,
}) => {
  const { t } = useTranslation()

  if (!paseo) return null

  const renderPendiente = () => (
    <View style={styles.content}>
      <View style={styles.iconContainer}>
        <Icon name="search" size={48} color={COLOR.PRIMARIO} />
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="small" color={COLOR.PRIMARIO} />
        </View>
      </View>

      <Text style={styles.statusTitle}>
        {t('paseos:estados.pendiente_titulo', 'Buscando cuidador...')}
      </Text>

      <Text style={styles.description}>
        {t(
          'paseos:estados.pendiente_desc',
          'Hemos notificado a los cuidadores cercanos. Te avisaremos en cuanto alguien acepte tu solicitud.'
        )}
      </Text>

      <View style={styles.actions}>
        <Button
          variant="contorno"
          title={t('common:acciones.cancelar_solicitud', 'Cancelar solicitud')}
          onPress={() => {
            // TODO: Implementar cancelación
            onClose()
          }}
          style={styles.cancelButton}
          textStyle={{ color: COLOR.ERROR }}
        />
      </View>
    </View>
  )

  const renderConfirmado = () => (
    <View style={styles.content}>
      <View style={styles.header}>
        <Text style={styles.statusTitle}>
          {t('paseos:estados.confirmado_titulo', '¡Paseo confirmado!')}
        </Text>
        <Text style={styles.description}>
          {t(
            'paseos:estados.confirmado_desc',
            'Tu cuidador ya ha aceptado la solicitud y se está preparando.'
          )}
        </Text>
      </View>

      <View style={styles.cuidadorCard}>
        <Avatar
          uri={paseo.cuidador_foto_visual}
          name={paseo.cuidador_nombre_visual || 'Cuidador'}
          size={64}
        />
        <View style={styles.cuidadorInfo}>
          <Text style={styles.cuidadorName}>
            {paseo.cuidador_nombre_visual ||
              t('common:cuidador_anonimo', 'Cuidador')}
          </Text>
          <View style={styles.ratingContainer}>
            <Icon name="star" size={16} color={COLOR.ALERTA} />
            <Text style={styles.ratingText}>4.9</Text>
          </View>
        </View>
      </View>

      <View style={styles.infoRow}>
        <View style={styles.infoItem}>
          <Icon name="calendar" size={20} color={COLOR.PRIMARIO} />
          <Text style={styles.infoText}>
            {new Date(paseo.fecha_hora_inicio).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </Text>
        </View>
        <View style={styles.infoItem}>
          <Icon name="paw" size={20} color={COLOR.PRIMARIO} />
          <Text style={styles.infoText}>
            {paseo.mascota_nombre_visual || t('common:mascota', 'Mascota')}
          </Text>
        </View>
      </View>

      <View style={styles.actions}>
        <Button
          variant="primario"
          title={t('common:acciones.contactar', 'Contactar')}
          icon="comment-dots"
          onPress={() => {
            // TODO: Implementar chat/llamada
          }}
          style={styles.actionButton}
        />
        <Button
          variant="contorno"
          title={t('common:acciones.ver_perfil', 'Ver perfil')}
          onPress={() => {
            // TODO: Navegar a perfil
          }}
        />
      </View>
    </View>
  )

  const renderContent = () => {
    switch (paseo.estado) {
      case ESTADOS_PASEO.PENDIENTE:
        return renderPendiente()
      case ESTADOS_PASEO.CONFIRMADO:
        return renderConfirmado()
      default:
        return <Text style={styles.title}>{title || ''}</Text>
    }
  }

  return (
    <BottomSheet visible={visible} onClose={onClose}>
      {renderContent()}
    </BottomSheet>
  )
}

const styles = StyleSheet.create({
  content: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 20,
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: `${COLOR.PRIMARIO}08`,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    position: 'relative',
  },
  loaderContainer: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: COLOR.BLOQUE,
    borderRadius: 20,
    padding: 8,
    elevation: 4,
    shadowColor: COLOR.SOMBRA,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  statusTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: COLOR.TEXTO,
    marginBottom: 12,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  description: {
    fontSize: 16,
    color: COLOR.SUBTEXTO,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
    paddingHorizontal: 10,
  },
  actions: {
    width: '100%',
    gap: 12,
  },
  cancelButton: {
    borderColor: `${COLOR.ERROR}50`,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: COLOR.TEXTO,
    marginBottom: 8,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  cuidadorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLOR.BLOQUE,
    padding: 20,
    borderRadius: 24,
    width: '100%',
    marginBottom: 24,
    shadowColor: COLOR.SOMBRA,
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 3,
    borderWidth: 1,
    borderColor: COLOR.BORDE,
  },
  cuidadorInfo: {
    marginLeft: 16,
    flex: 1,
  },
  cuidadorName: {
    fontSize: 18,
    fontWeight: '700',
    color: COLOR.TEXTO,
    marginBottom: 6,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${COLOR.ALERTA}15`,
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  ratingText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLOR.ALERTA,
    marginLeft: 4,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 32,
    gap: 12,
  },
  infoItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLOR.BLOQUE,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLOR.BORDE,
  },
  infoText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '600',
    color: COLOR.TEXTO,
  },
  actionButton: {
    marginBottom: 0,
  },
})

export default DetallePaseoBottomSheet
