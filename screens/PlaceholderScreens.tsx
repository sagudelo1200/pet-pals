import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface PlaceholderScreenProps {
  title: string;
  description?: string;
  icon?: string;
}

const PlaceholderScreen: React.FC<PlaceholderScreenProps> = ({ 
  title, 
  description = 'Esta pantalla está en desarrollo',
  icon = '🚧'
}) => {
  return (
    <View style={styles.container}>
      <Text style={styles.icon}>{icon}</Text>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description}</Text>
      <Text style={styles.subtitle}>Próximamente disponible</Text>
    </View>
  );
};

// Componentes específicos para cada pantalla
export const ProfileScreen = () => (
  <PlaceholderScreen 
    title="Perfil" 
    description="Gestiona tu información personal"
    icon="👤"
  />
);

export const AccountScreen = () => (
  <PlaceholderScreen 
    title="Cuenta" 
    description="Configuración de tu cuenta"
    icon="⚙️"
  />
);

export const ElementsScreen = () => (
  <PlaceholderScreen 
    title="Elementos" 
    description="Componentes de la aplicación"
    icon="🧩"
  />
);

export const ArticlesScreen = () => (
  <PlaceholderScreen 
    title="Artículos" 
    description="Lee artículos sobre cuidado de mascotas"
    icon="📰"
  />
);

export const SettingsScreen = () => (
  <PlaceholderScreen 
    title="Configuración" 
    description="Ajustes de la aplicación"
    icon="⚙️"
  />
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 20,
  },
  icon: {
    fontSize: 80,
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 14,
    color: '#999',
    fontStyle: 'italic',
    textAlign: 'center',
  },
});