import React, { useState } from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { LoadingScreen } from '../components';

/**
 * Ejemplo de componente que demuestra el uso del LoadingScreen
 */
const LoadingExampleScreen: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [currentMessageType, setCurrentMessageType] = useState<'general' | 'pets' | 'auth' | 'walks' | 'custom'>('general');
  const [currentMessage, setCurrentMessage] = useState<string | undefined>(undefined);

  // Función de ejemplo que simula una operación asíncrona
  const simulateOperation = async (duration: number = 2000) => {
    return new Promise(resolve => setTimeout(resolve, duration));
  };

  // Ejemplo 1: Loading general
  const handleGeneralLoading = async () => {
    setIsLoading(true);
    setCurrentMessageType('general');
    setCurrentMessage(undefined);
    await simulateOperation(2000);
    setIsLoading(false);
  };

  // Ejemplo 2: Loading con mensaje personalizado
  const handleCustomMessage = async () => {
    setIsLoading(true);
    setCurrentMessageType('custom');
    setCurrentMessage('🔥 Procesando información súper importante...');
    await simulateOperation(2000);
    setIsLoading(false);
  };

  // Ejemplo 3: Loading de mascotas
  const handlePetsLoading = async () => {
    setIsLoading(true);
    setCurrentMessageType('pets');
    setCurrentMessage(undefined);
    await simulateOperation(3000);
    setIsLoading(false);
  };

  // Ejemplo 4: Loading de autenticación
  const handleAuthLoading = async () => {
    setIsLoading(true);
    setCurrentMessageType('auth');
    setCurrentMessage(undefined);
    await simulateOperation(1500);
    setIsLoading(false);
  };

  // Ejemplo 5: Loading de paseos
  const handleWalkLoading = async () => {
    setIsLoading(true);
    setCurrentMessageType('walks');
    setCurrentMessage(undefined);
    await simulateOperation(2500);
    setIsLoading(false);
  };

  if (isLoading) {
    return (
      <LoadingScreen 
        messageType={currentMessageType}
        message={currentMessage}
        spinnerColor="#0066cc"
      />
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Ejemplos de LoadingScreen</Text>
      
      <TouchableOpacity style={styles.button} onPress={handleGeneralLoading}>
        <Text style={styles.buttonText}>🔄 Loading General</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.button} onPress={handleCustomMessage}>
        <Text style={styles.buttonText}>✨ Mensaje Personalizado</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.button} onPress={handlePetsLoading}>
        <Text style={styles.buttonText}>🐾 Loading de Mascotas</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.button} onPress={handleAuthLoading}>
        <Text style={styles.buttonText}>🔐 Loading de Auth</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.button} onPress={handleWalkLoading}>
        <Text style={styles.buttonText}>🚶‍♂️ Loading de Paseos</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 30,
    color: '#333',
  },
  button: {
    backgroundColor: '#0066cc',
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default LoadingExampleScreen;