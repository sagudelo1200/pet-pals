import React from 'react';
import { Dimensions } from 'react-native';
import { createStackNavigator } from '@react-navigation/stack';
import { createDrawerNavigator, DrawerContentComponentProps } from '@react-navigation/drawer';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import CustomDrawerContent from './Menu';
import Home from '../screens/Home';
import Pro from '../screens/Pro';

const { width } = Dimensions.get('screen')

// Param list para cada stack/drawer/tab
export type OnboardingStackParamList = {
  Onboarding: undefined
  App: undefined
}

export type RootDrawerParamList = {
  HomeDrawer: undefined
  ProfileDrawer: undefined
  AccountDrawer: undefined
  ElementsDrawer: undefined
  ArticlesDrawer: undefined
  SettingsDrawer: undefined
}

export type HomeTabParamList = {
  Personal: undefined
  System: undefined
}

export type HomeStackParamList = {
  Home: undefined
  Beauty: undefined
  Product: undefined
  Gallery: undefined
  Chat: undefined
  Search: undefined
  Cart: undefined
  Notifications: undefined
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

// exporta el root navigator con Onboarding y App
export default function Views(): React.ReactElement {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name='Onboarding' component={Pro} />
      <Stack.Screen name='App' component={AppStack} />
    </Stack.Navigator>
  )
}