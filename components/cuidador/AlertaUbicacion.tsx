import React from 'react'
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Platform,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { COLOR } from '@/constants'
import * as IntentLauncher from 'expo-intent-launcher'
import * as Linking from 'expo-linking'

interface Props {
  mensaje: string
}

export const AlertaUbicacion: React.FC<Props> = ({ mensaje }) => {
  const abrirAjustes = () => {
    if (Platform.OS === 'ios') {
      Linking.openURL('app-settings:')
    } else {
      IntentLauncher.startActivityAsync(
        IntentLauncher.ActivityAction.LOCATION_SOURCE_SETTINGS
      )
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Ionicons name="warning" size={20} color={COLOR.TEXTO} />
        <Text style={styles.text}>{mensaje}</Text>
      </View>
      <TouchableOpacity style={styles.button} onPress={abrirAjustes}>
        <Text style={styles.buttonText}>AJUSTES</Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLOR.ENFASIS,
    padding: 12,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 8,
  },
  text: {
    color: COLOR.TEXTO,
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
  button: {
    backgroundColor: `${COLOR.TEXTO}20`,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginLeft: 8,
  },
  buttonText: {
    color: COLOR.TEXTO,
    fontSize: 10,
    fontWeight: '800',
  },
})
