import React from 'react';
import { Dimensions } from 'react-native';
import { createStackNavigator } from '@react-navigation/stack';
import { createDrawerNavigator, DrawerContentComponentProps } from '@react-navigation/drawer';

import CustomDrawerContent from './Menu';
import Home from '../screens/Home';
import CrearMascota from '../screens/CrearMascota';
// Importar el nuevo AuthNavigator
import AuthNavigator from '../screens/AuthNavigator';

const { width } = Dimensions.get('screen')

// Param list para cada stack/drawer/tab
export type OnboardingStackParamList = {
  Onboarding: undefined
  App: undefined
  Auth: undefined // Nueva ruta para autenticación
}

export type RootDrawerParamList = {
  HomeDrawer: undefined
  ProfileDrawer: undefined
  AccountDrawer: undefined
  ElementsDrawer: undefined
  ArticlesDrawer: undefined
  SettingsDrawer: undefined
}

// crea los navegadores tipados
const Stack = createStackNavigator<OnboardingStackParamList>()
const Drawer = createDrawerNavigator<RootDrawerParamList>()


// drawer principal
function AppStack() {
  return (
    <Drawer.Navigator
      drawerContent={(props: DrawerContentComponentProps) => <CustomDrawerContent {...props} />}
      screenOptions={{
        headerShown: false,
        drawerStyle: {
          backgroundColor: 'red',
          width: width * 0.8
        }
      }}
    >
      <Drawer.Screen name='HomeDrawer' component={Home} />
    </Drawer.Navigator>
  )
}

// exporta el root navigator con Onboarding, Auth y App
export default function Views(): React.ReactElement {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name='Onboarding' component={AuthNavigator} />
      <Stack.Screen name='App' component={AppStack} />
      <Stack.Screen name='CrearMascota' component={CrearMascota} />
    </Stack.Navigator>
  )
}