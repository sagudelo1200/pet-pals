import React from 'react'
import {
  StyleSheet,
  View,
  Text,
  ActivityIndicator,
} from 'react-native'
import {
  useRoute,
  type RouteProp,
  useNavigation,
} from '@react-navigation/native'
import { COLOR } from '@/constants'
import { useDoc } from '@/hooks/useDoc'
import { Paseo } from '@/models/Paseo'
import { Button, Spacer } from '@/components/ui'
import type { AuthStackParamList } from '@/navigation/types'
import { PaseoFinalizadoCard } from '@/components/paseos/PaseoFinalizadoCard'

type RouteProps = RouteProp<AuthStackParamList, 'PaseoFinalizado'>

export default function PaseoFinalizado() {
  const route = useRoute<RouteProps>()
  const navigation = useNavigation<any>()
  const { paseoId } = route.params
  const { data: paseo, cargando: loading } = useDoc<Paseo>('paseos', paseoId)

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLOR.PRIMARIO} />
        <Text style={{ color: COLOR.TEXTO, marginTop: 20 }}>
          Cargando resumen...
        </Text>
      </View>
    )
  }

  if (!paseo) {
    return (
      <View style={styles.center}>
        <Text style={styles.subtitle}>
          No se encontró la información del paseo.
        </Text>
        <Spacer size={20} />
        <Button title="Volver" onPress={() => navigation.goBack()} />
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <View style={styles.contentContainer}>
        <PaseoFinalizadoCard
          mascotaNombre={paseo.mascota_nombre_visual}
          cuidadorNombre={paseo.cuidador_nombre_visual}
          onClose={() => navigation.navigate('TutorApp')}
          onRate={(r) => console.log('Rating screen:', r)}
        />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLOR.BASE,
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: COLOR.SUBTEXTO,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
})
