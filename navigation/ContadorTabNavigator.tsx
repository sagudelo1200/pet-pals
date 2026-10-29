import React from 'react'
import { Platform } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTranslation } from 'react-i18next'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import ContadorEconomia from '@/screens/contador/ContadorEconomia'
import MiCuenta from '@/screens/comun/MiCuenta'
import { Icon } from '@/components/ui'
import { COLOR } from '@/constants'
import type { ContadorTabParamList } from './types'

const Tab = createBottomTabNavigator<ContadorTabParamList>()

/** Contador: consulta la economía en solo lectura y su cuenta. */
const ContadorTabNavigator: React.FC = () => {
  const insets = useSafeAreaInsets()
  const { t } = useTranslation('admin')

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: COLOR.ENFASIS,
        tabBarInactiveTintColor: COLOR.SUBTEXTO,
        tabBarStyle: {
          backgroundColor: COLOR.BLOQUE,
          borderTopWidth: 1,
          borderTopColor: COLOR.BORDE,
          paddingBottom:
            Platform.OS === 'ios'
              ? Math.max(insets.bottom, 20)
              : Math.max(insets.bottom + 5, 15),
          paddingTop: 5,
          height:
            Platform.OS === 'ios'
              ? Math.max(insets.bottom + 65, 85)
              : Math.max(insets.bottom + 60, 75),
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
        },
      }}
    >
      <Tab.Screen
        name="ContadorEconomia"
        component={ContadorEconomia}
        options={{
          tabBarLabel: t('tabs.economia'),
          tabBarIcon: ({ color, size }) => (
            <Icon name="dollar-sign" color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="MiCuenta"
        component={MiCuenta}
        options={{
          tabBarLabel: t('tabs.mi_cuenta'),
          tabBarIcon: ({ color, size }) => (
            <Icon name="user" color={color} size={size} />
          ),
        }}
      />
    </Tab.Navigator>
  )
}

export default ContadorTabNavigator
