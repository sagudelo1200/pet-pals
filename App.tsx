import React from 'react';
import { Platform } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { GalioProvider } from 'galio-framework';
import { AuthProvider } from './services/context/AuthContext';
import Dashboard from './screens/Dashboard';
import AuthNavigator from './screens/AuthNavigator';
import { MascotasScreen } from './screens/MascotasScreen';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

// AppStack con Tab Navigator optimizado para iOS y Android con Safe Area
function AppStack() {
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
        name='AppTab' 
        component={Dashboard}
        options={{
          title: 'Inicio',
          headerTitle: 'Pet Pals',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name='home' size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen 
        name='MascotasTab' 
        component={MascotasScreen}
        options={{
          title: 'Mis Mascotas',
          headerTitle: 'Pet Pals',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name='paw' size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

export default function App(): React.ReactElement {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <GalioProvider>
          <NavigationContainer>
            <Stack.Navigator screenOptions={{ headerShown: false }}>
              <Stack.Screen name='Auth' component={AuthNavigator} />
              <Stack.Screen name='App' component={AppStack} />
            </Stack.Navigator>
          </NavigationContainer>
        </GalioProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
