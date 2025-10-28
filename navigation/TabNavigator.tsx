import React from 'react';
import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import Dashboard from '../screens/Dashboard';
import { RootTabParamList } from './types';

const Tab = createBottomTabNavigator<RootTabParamList>();

// Tab Navigator principal de la aplicación
export default function TabNavigator(): React.ReactElement {
  const insets = useSafeAreaInsets();
  
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: true,
        headerStyle: {
          backgroundColor: '#0066cc',
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: 'bold',
          fontSize: 18,
        },
        tabBarActiveTintColor: '#0066cc',
        tabBarInactiveTintColor: '#999',
        tabBarStyle: {
          backgroundColor: '#fff',
          borderTopWidth: 1,
          borderTopColor: '#e0e0e0',
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
            <Ionicons name='home' size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}