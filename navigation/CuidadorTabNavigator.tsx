import { ReactElement } from 'react'
import { Platform, View, Text, StyleSheet } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { Icon } from '@/components/ui'
import Dashboard from '@/screens/cuidador/Dashboard'
import SolicitudesPaseos from '@/screens/cuidador/SolicitudesPaseos'
import Agenda from '@/screens/cuidador/Agenda'
import MiCuenta from '@/screens/comun/MiCuenta'
import { CuidadorTabParamList } from './types'
import { COLOR } from '@/constants'
import { useTranslation } from 'react-i18next'
import { useSolicitudesCuidador } from '@/hooks/cuidador/useSolicitudesCuidador'
import { useAgendaCuidador } from '@/hooks/cuidador/useAgendaCuidador'

const Tab = createBottomTabNavigator<CuidadorTabParamList>()

export default function CuidadorTabNavigator(): ReactElement {
  const insets = useSafeAreaInsets()
  const { t } = useTranslation()
  const { solicitudes } = useSolicitudesCuidador()
  const { proximos } = useAgendaCuidador()

  const solicitudesCount = solicitudes?.length || 0

  const agendaCount = proximos?.length || 0

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
        name="Dashboard"
        component={Dashboard}
        options={{
          title: t('cuidador:tabs.dashboard'),
          tabBarIcon: ({ color, size }) => (
            <Icon name="home" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Solicitudes"
        component={SolicitudesPaseos}
        options={{
          title: t('cuidador:tabs.solicitudes'),
          tabBarIcon: ({ color, size }) => (
            <View style={styles.iconWrapper}>
              <Icon name="bell" size={size} color={color} />
              {solicitudesCount > 0 && (
                <View style={styles.badgeContainer}>
                  <Text style={styles.badgeText}>{solicitudesCount}</Text>
                </View>
              )}
            </View>
          ),
        }}
      />
      <Tab.Screen
        name="Agenda"
        component={Agenda}
        options={{
          title: t('cuidador:tabs.agenda'),
          tabBarIcon: ({ color, size }) => (
            <View style={styles.iconWrapper}>
              <Icon name="calendar-alt" size={size} color={color} />
              {agendaCount > 0 && (
                <View style={styles.badgeContainer}>
                  <Text style={styles.badgeText}>{agendaCount}</Text>
                </View>
              )}
            </View>
          ),
        }}
      />
      <Tab.Screen
        name="MiCuenta"
        component={MiCuenta}
        options={{
          title: t('comun:tabs.mi_cuenta'),
          tabBarIcon: ({ color, size }) => (
            <Icon name="user" size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  )
}

const styles = StyleSheet.create({
  iconWrapper: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeContainer: {
    position: 'absolute',
    top: 2,
    right: -6,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 5,
    backgroundColor: COLOR.HUESO,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  badgeText: {
    color: COLOR.BASE,
    fontSize: 11,
    fontWeight: '700',
  },
})
