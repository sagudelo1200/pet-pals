import 'react-native-gesture-handler';

import { AppRegistry, Platform } from 'react-native';
import { registerRootComponent } from 'expo';
import App from './App';

// Función para obtener el nombre de la app
const getAppName = () => {
  if (Platform.OS === 'ios') {
    return 'main';
  }
  return 'petpals';
};

// Registrar el componente con diferentes nombres para compatibilidad
AppRegistry.registerComponent('main', () => App);
AppRegistry.registerComponent('petpals', () => App);
AppRegistry.registerComponent(getAppName(), () => App);

// Registrar también para Expo
registerRootComponent(App);
