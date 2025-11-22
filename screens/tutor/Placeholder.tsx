import { COLOR } from '@/constants'
import React from 'react'
import { Text, Alert } from 'react-native'
import { Card, Button, Spacer } from '@/components/ui'
import Screen from '@/components/ui/Screen'

const Placeholder = () => {
  return (
    <Screen
      scroll
      style={styles.container}
      contentContainerStyle={{ padding: 16 }}
    >
      <Text style={styles.text}>¡Próximamente!</Text>
      <Text style={styles.subText}>
        Esta sección está en desarrollo. ¡Mantente atento a las actualizaciones!
      </Text>
      <Spacer size={12} />

      <Card title="Bloque de prueba" subtitle="Componentes UI">
        <Button
          title="Probar alerta"
          onPress={() => Alert.alert('Demo', 'Esto es una alerta de prueba')}
          fullWidth
        />
        <Spacer size={8} />
        <Button
          title="Otra acción"
          variant="info"
          onPress={() => {}}
          fullWidth
        />
      </Card>
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
