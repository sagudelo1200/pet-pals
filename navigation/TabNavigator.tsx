import React from 'react';
import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Icon } from '@/components/ui';
import Dashboard from '@/screens/Dashboard';
import Mascotas from '@/screens/Mascotas';
import Paseos from '@/screens/Paseos';
import MiCuenta from '@/screens/MiCuenta';
import ColorDemo from '@/screens/ColorDemo';
import { RootTabParamList } from './types';
import { COLOR } from '@/constants';

const Tab = createBottomTabNavigator<RootTabParamList>();

// Tab Navigator principal de la aplicación
export default function TabNavigator(): React.ReactElement {
  const insets = useSafeAreaInsets();
  
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: true,
        headerStyle: {
          backgroundColor: COLOR.BLOQUE,
        },
        headerTintColor: COLOR.TEXTO,
        headerTitleStyle: {
          fontWeight: 'bold',
          fontSize: 18,
        },
        tabBarActiveTintColor: COLOR.ENFASIS,
        tabBarInactiveTintColor: COLOR.SUBTEXTO,
        tabBarStyle: {
          backgroundColor: COLOR.BLOQUE,
          borderTopWidth: 1,
          borderTopColor: COLOR.BORDE,
          paddingBottom: Platform.OS === 'ios' 
            ? Math.max(insets.bottom, 20) 
            : Math.max(insets.bottom + 5, 15),
          paddingTop: 5,
          height: Platform.OS === 'ios' 
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
        name='Inicio' 
        component={Dashboard}
        options={{
          title: 'Inicio',
          headerTitle: 'Pet Pals',
          tabBarIcon: ({ color, size }) => (
            <Icon name='home' size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen 
        name='Mascotas' 
        component={Mascotas}
        options={{
          title: 'Mascotas',
          headerTitle: 'Mascotas',
          tabBarIcon: ({ color, size }) => (
            <Icon name='paw' size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen 
        name='Paseos' 
        component={Paseos}
        options={{
          title: 'Paseos',
          headerTitle: 'Paseos',
          tabBarIcon: ({ color, size }) => (
            <Icon name='walking' size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name='Colors'
        component={ColorDemo}
        options={{
          title: 'Colores',
          headerTitle: 'Demo de Colores',
          tabBarIcon: ({ color, size }) => (
            <Icon name='palette' size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen 
        name='MiCuenta' 
        component={MiCuenta}
        options={{
          title: 'Mi Cuenta',
          headerTitle: 'Mi Cuenta',
          tabBarIcon: ({ color, size }) => (
            <Icon name='user' size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}