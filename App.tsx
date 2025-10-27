import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { GalioProvider } from 'galio-framework';
import { AuthProvider } from './services/context/AuthContext';
import { RootNavigator } from './navigation';

// Componente principal - Solo configuración global
export default function App(): React.ReactElement {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <GalioProvider>
          <NavigationContainer>
            <RootNavigator />
          </NavigationContainer>
        </GalioProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
