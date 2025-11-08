import { COLOR } from '@/constants'
import React from 'react'
import { Text } from 'react-native'
import Screen from '@/components/ui/Screen'

const Placeholder = () => {
  return (
    <Screen style={styles.container}>
      <Text style={styles.text}>¡Próximamente!</Text>
      <Text style={styles.subText}>
        Esta sección está en desarrollo. ¡Mantente atento a las actualizaciones!
      </Text>
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
