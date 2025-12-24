import { COLOR } from '@/constants'
import React from 'react'
import { Text } from 'react-native'
import Screen from '@/components/ui/Screen'
import { useTranslation } from 'react-i18next'

const Placeholder = () => {
  const { t } = useTranslation()
  return (
    <Screen style={styles.container}>
      <Text style={styles.text}>{t('comun:proximamente')}</Text>
      <Text style={styles.subText}>{t('comun:en_desarrollo')}</Text>
    </Screen>
  )
}

const styles = {
  container: {
    flex: 1,
    alignItems: 'center' as const,
    backgroundColor: COLOR.BASE,
  },
  text: {
    fontSize: 24,
    fontWeight: 'bold' as 'bold',
    textAlign: 'center' as const,
    color: COLOR.TEXTO,
  },
  subText: {
    fontSize: 16,
    textAlign: 'center' as const,
    marginTop: 10,
    color: COLOR.SUBTEXTO,
  },
}

export default Placeholder
