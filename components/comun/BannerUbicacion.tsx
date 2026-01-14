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
  style?: any
}

export const BannerUbicacion: React.FC<Props> = ({ mensaje, style }) => {
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
    <View style={[styles.container, style]}>
      <View style={styles.content}>
        <Ionicons name="alert-circle" size={22} color={COLOR.TEXTO} />
        <Text style={[styles.text, { color: COLOR.TEXTO }]}>{mensaje}</Text>
      </View>
      <TouchableOpacity style={styles.button} onPress={abrirAjustes}>
        <Text style={styles.buttonText}>AJUSTES</Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLOR.ERROR,
    padding: 14,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 10,
  },
  text: {
    fontSize: 13,
    fontWeight: '700',
    flex: 1,
  },
  button: {
    backgroundColor: `${COLOR.TEXTO}33`,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    marginLeft: 10,
  },
  buttonText: {
    color: COLOR.TEXTO,
    fontSize: 11,
    fontWeight: '900',
  },
})
