import React from 'react';
import { Dimensions, TouchableOpacity } from 'react-native';
import { createStackNavigator } from '@react-navigation/stack';
import { createDrawerNavigator, DrawerContentComponentProps } from '@react-navigation/drawer';
import { Ionicons } from '@expo/vector-icons';

import CustomDrawerContent from './Menu';
import Home from '../screens/Home';
import { MascotasScreen } from '../screens/MascotasScreen';
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

// Param list para cada stack/drawer/tab - Pet Pals MVP
export type AuthStackParamList = {
  Auth: undefined
  App: undefined
}

export type RootDrawerParamList = {
  HomeDrawer: undefined
  MascotasDrawer: undefined
}

// crea los navegadores tipados
const Stack = createStackNavigator<AuthStackParamList>();
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
    </Drawer.Navigator>
  );
}

// exporta el root navigator con Auth y App - Pet Pals MVP
export default function Views(): React.ReactElement {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name='Auth' component={AuthNavigator} />
      <Stack.Screen name='App' component={AppStack} />
    </Stack.Navigator>
  );
}