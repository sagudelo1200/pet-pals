import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import TabNavigator from './TabNavigator';
import AuthNavigator from '../screens/AuthNavigator';
import { AuthStackParamList } from './types';

// Stack principal con autenticación
const Stack = createStackNavigator<AuthStackParamList>();

// Navegador principal: Auth → App (Tabs)
export default function RootNavigator(): React.ReactElement {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name='Auth' component={AuthNavigator} />
      <Stack.Screen name='App' component={TabNavigator} />
    </Stack.Navigator>
  );
}