import React from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { useTranslation } from 'react-i18next'
import { COLOR } from '@/constants'
import { useNoLeidas } from '@/context/NotificacionesContext'
import { LIMITE_CONTADOR } from '@/services/firebase/firestore/colecciones/notificacion'
import Icon from './Icon'

/** Campana del header: abre la bandeja y muestra cuántos avisos faltan por leer. */
export const CampanaNotificaciones: React.FC = () => {
  const { t } = useTranslation()
  const navigation = useNavigation<any>()
  const noLeidas = useNoLeidas()
  const texto = noLeidas >= LIMITE_CONTADOR ? '99+' : String(noLeidas)

  return (
    <Pressable
      onPress={() => navigation.navigate('Notificaciones')}
      style={styles.boton}
      accessibilityRole="button"
      accessibilityLabel={t('notificaciones:campana', { count: noLeidas })}
      testID="campana-notificaciones"
    >
      <Icon name="bell" size={22} color={COLOR.TEXTO} />
      {noLeidas > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeTexto}>{texto}</Text>
        </View>
      )}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  boton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badge: {
    position: 'absolute',
    top: 2,
    right: 0,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    backgroundColor: COLOR.ERROR,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeTexto: {
    color: COLOR.TEXTO,
    fontSize: 10,
    fontWeight: '700',
  },
})

export default CampanaNotificaciones
