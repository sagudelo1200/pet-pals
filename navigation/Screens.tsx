import React from 'react';
import { Dimensions, TouchableOpacity } from 'react-native';
import { createStackNavigator } from '@react-navigation/stack';
import { createDrawerNavigator, DrawerContentComponentProps } from '@react-navigation/drawer';
import { Ionicons } from '@expo/vector-icons';

import CustomDrawerContent from './Menu';
import Home from '../screens/Home';
import CrearMascota from '../screens/CrearMascota';
import { MascotasScreen } from '../screens/MascotasScreen';
import LoadingExampleScreen from '../screens/LoadingExampleScreen';
import { 
  ProfileScreen, 
  AccountScreen, 
  ElementsScreen, 
  ArticlesScreen, 
  SettingsScreen 
} from '../screens/PlaceholderScreens';
// Importar el nuevo AuthNavigator
import AuthNavigator from '../screens/AuthNavigator';

const { width } = Dimensions.get('screen');

// Componente para el botón del drawer
const DrawerToggleButton = ({ onPress }: { onPress: () => void }) => (
  <TouchableOpacity 
    onPress={onPress}
    style={{ marginLeft: 15, padding: 5 }}
  >
    <Ionicons name="menu" size={24} color="#fff" />
  </TouchableOpacity>
);

// Param list para cada stack/drawer/tab
export type OnboardingStackParamList = {
  Onboarding: undefined
  App: undefined
  Auth: undefined // Nueva ruta para autenticación
  CrearMascota: undefined
  MascotasScreen: undefined
  LoadingExample: undefined // Nueva ruta para ejemplos de loading
  Profile: undefined
  Account: undefined
  Elements: undefined
  Articles: undefined
  Settings: undefined
}

export type RootDrawerParamList = {
  HomeDrawer: undefined
  ProfileDrawer: undefined
  AccountDrawer: undefined
  ElementsDrawer: undefined
  ArticlesDrawer: undefined
  SettingsDrawer: undefined
  MascotasDrawer: undefined
  LoadingExampleDrawer: undefined // Nueva entrada en el drawer
  Profile: undefined
  Account: undefined
  Elements: undefined
  Articles: undefined
  Settings: undefined

}

// crea los navegadores tipados
const Stack = createStackNavigator<OnboardingStackParamList>();
const Drawer = createDrawerNavigator<RootDrawerParamList>();


// drawer principal
function AppStack() {
  return (
    <Drawer.Navigator
      drawerContent={(props: DrawerContentComponentProps) => <CustomDrawerContent {...props} />}
      screenOptions={{
        headerShown: true,
        headerStyle: {
          backgroundColor: '#0066cc',
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
        drawerStyle: {
          backgroundColor: '#fff',
          width: width * 0.8
        },
        swipeEnabled: true,
        drawerPosition: 'left',
      }}
    >
      <Drawer.Screen 
        name='HomeDrawer' 
        component={Home}
        options={({ navigation }) => ({
          title: 'Inicio',
          headerTitle: 'Pet Pals - Inicio',
          headerLeft: () => (
            <DrawerToggleButton onPress={() => navigation.openDrawer()} />
          ),
        })}
      />
      <Drawer.Screen 
        name='MascotasDrawer' 
        component={MascotasScreen}
        options={({ navigation }) => ({
          title: 'Mis Mascotas',
          headerTitle: 'Pet Pals - Mascotas',
          headerLeft: () => (
            <DrawerToggleButton onPress={() => navigation.openDrawer()} />
          ),
        })}
      />
      <Drawer.Screen 
        name='LoadingExampleDrawer' 
        component={LoadingExampleScreen}
        options={({ navigation }) => ({
          title: 'Loading Examples',
          headerTitle: 'Pet Pals - Loading Examples',
          headerLeft: () => (
            <DrawerToggleButton onPress={() => navigation.openDrawer()} />
          ),
        })}
      />
      <Drawer.Screen 
        name='ProfileDrawer' 
        component={ProfileScreen}
        options={({ navigation }) => ({
          title: 'Profile',
          headerTitle: 'Pet Pals - Perfil',
          headerLeft: () => (
            <DrawerToggleButton onPress={() => navigation.openDrawer()} />
          ),
        })}
      />
      <Drawer.Screen 
        name='AccountDrawer' 
        component={AccountScreen}
        options={({ navigation }) => ({
          title: 'Account',
          headerTitle: 'Pet Pals - Cuenta',
          headerLeft: () => (
            <DrawerToggleButton onPress={() => navigation.openDrawer()} />
          ),
        })}
      />
      <Drawer.Screen 
        name='ElementsDrawer' 
        component={ElementsScreen}
        options={({ navigation }) => ({
          title: 'Elements',
          headerTitle: 'Pet Pals - Elementos',
          headerLeft: () => (
            <DrawerToggleButton onPress={() => navigation.openDrawer()} />
          ),
        })}
      />
      <Drawer.Screen 
        name='ArticlesDrawer' 
        component={ArticlesScreen}
        options={({ navigation }) => ({
          title: 'Articles',
          headerTitle: 'Pet Pals - Artículos',
          headerLeft: () => (
            <DrawerToggleButton onPress={() => navigation.openDrawer()} />
          ),
        })}
      />
      <Drawer.Screen 
        name='SettingsDrawer' 
        component={SettingsScreen}
        options={({ navigation }) => ({
          title: 'Settings',
          headerTitle: 'Pet Pals - Configuración',
          headerLeft: () => (
            <DrawerToggleButton onPress={() => navigation.openDrawer()} />
          ),
        })}
      />
    </Drawer.Navigator>
  );
}

// exporta el root navigator con Onboarding, Auth y App
export default function Views(): React.ReactElement {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name='Onboarding' component={AuthNavigator} />
      <Stack.Screen name='App' component={AppStack} />
      <Stack.Screen name='CrearMascota' component={CrearMascota} />
      <Stack.Screen name='MascotasScreen' component={MascotasScreen} />
      <Stack.Screen name='LoadingExample' component={LoadingExampleScreen} />
      <Stack.Screen name='Profile' component={ProfileScreen} />
      <Stack.Screen name='Account' component={AccountScreen} />
      <Stack.Screen name='Elements' component={ElementsScreen} />
      <Stack.Screen name='Articles' component={ArticlesScreen} />
      <Stack.Screen name='Settings' component={SettingsScreen} />
    </Stack.Navigator>
  );
}