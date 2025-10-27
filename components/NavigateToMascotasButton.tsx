import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';

interface NavigateToMascotasProps {
  navigation: any;
}

export const NavigateToMascotasButton: React.FC<NavigateToMascotasProps> = ({ navigation }) => {
  const handlePress = () => {
    navigation.navigate('MascotasTab');
  };

  return (
    <TouchableOpacity style={styles.button} onPress={handlePress}>
      <Text style={styles.buttonText}>Ver Mis Mascotas</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    margin: 16,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});