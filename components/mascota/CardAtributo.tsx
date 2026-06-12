import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { useTranslation } from 'react-i18next'
import { COLOR } from '@/constants'
import Icon from '@/components/ui/Icon'

interface CardAtributoProps {
  opcion?: any
  atributo: any
  vacio?: boolean
}

/**
 * Card reutilizable para mostrar un atributo (comportamiento o compatibilidad).
 * Diseño uniforme: icono + descriptor/nombre + label.
 */
export const CardAtributo: React.FC<CardAtributoProps> = ({
  opcion,
  atributo,
  vacio = false,
}) => {
  const { t } = useTranslation()

  return (
    <View style={[styles.fieldCard, vacio && styles.fieldCardEmpty]}>
      {opcion ? (
        <>
          <Icon
            name={opcion.icon as any}
            size={28}
            color={COLOR.PRIMARIO}
            style={styles.cardIcon}
          />
          <Text style={styles.cardName} numberOfLines={2}>
            {opcion.descriptor ? t(opcion.descriptor) : t(opcion.nombre)}
          </Text>
          <Text style={styles.cardDesc} numberOfLines={2}>
            {t(atributo.labelKey)}
          </Text>
        </>
      ) : (
        <>
          <Icon
            name="question-circle"
            size={28}
            color={COLOR.SUBTEXTO}
            style={styles.cardIcon}
          />
          <Text style={styles.cardName} numberOfLines={2}>
            {t('mascotas:sin_definir')}
          </Text>
          <Text style={styles.cardDesc} numberOfLines={2}>
            {t(atributo.labelKey)}
          </Text>
        </>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  fieldCard: {
    paddingVertical: 14,
    paddingHorizontal: 10,
    backgroundColor: COLOR.SECUNDARIO,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: `${COLOR.PRIMARIO}30`,
    minHeight: 140,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 3,
    elevation: 1,
  },
  fieldCardEmpty: {
    borderColor: `${COLOR.BORDE}60`,
    opacity: 0.7,
  },
  cardIcon: {
    marginBottom: 10,
  },
  cardName: {
    fontSize: 14,
    fontWeight: '700',
    color: COLOR.TEXTO,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 4,
    letterSpacing: 0.2,
  },
  cardDesc: {
    fontSize: 12,
    fontWeight: '500',
    color: COLOR.SUBTEXTO,
    textAlign: 'center',
    lineHeight: 17,
    letterSpacing: 0.1,
  },
})
