import React from 'react';
import {
  StyleSheet,
  ScrollView,
  View,
  Alert,
  Platform,
} from 'react-native';
import { Text, Button } from 'galio-framework';
import { Ionicons } from '@expo/vector-icons';
import customTheme from '../constants/Theme';

const PerfilScreen: React.FC = () => {
  const handleLogout = () => {
    Alert.alert(
      'Cerrar Sesión',
      '¿Estás seguro de que quieres cerrar sesión?',
      [
        {
          text: 'Cancelar',
          style: 'cancel',
        },
        {
          text: 'Cerrar Sesión',
          style: 'destructive',
          onPress: () => {
            // Aquí implementar la lógica de logout
            console.log('Logout confirmado');
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Header del Perfil */}
        <View style={styles.headerSection}>
          <View style={styles.avatarContainer}>
            <Ionicons name="person-circle" size={120} color={customTheme.COLORS.PRIMARY} />
          </View>
          <Text h4 style={styles.userName}>Usuario Pet Pals</Text>
          <Text muted style={styles.userEmail}>usuario@petpals.com</Text>
        </View>

        {/* Sección de Estadísticas */}
        <View style={styles.statsSection}>
          <Text h5 style={styles.sectionTitle}>Mis Estadísticas</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Ionicons name="paw" size={30} color={customTheme.COLORS.PRIMARY} />
              <Text h4 style={styles.statNumber}>3</Text>
              <Text muted style={styles.statLabel}>Mascotas</Text>
            </View>
            <View style={styles.statCard}>
              <Ionicons name="walk" size={30} color={customTheme.COLORS.SUCCESS} />
              <Text h4 style={styles.statNumber}>12</Text>
              <Text muted style={styles.statLabel}>Paseos</Text>
            </View>
            <View style={styles.statCard}>
              <Ionicons name="star" size={30} color={customTheme.COLORS.WARNING} />
              <Text h4 style={styles.statNumber}>4.8</Text>
              <Text muted style={styles.statLabel}>Valoración</Text>
            </View>
          </View>
        </View>

        {/* Sección de Configuración */}
        <View style={styles.configSection}>
          <Text h5 style={styles.sectionTitle}>Configuración</Text>
          
          <View style={styles.menuItem}>
            <Ionicons name="person" size={24} color={customTheme.COLORS.MUTED} />
            <Text style={styles.menuText}>Editar Perfil</Text>
            <Ionicons name="chevron-forward" size={20} color={customTheme.COLORS.MUTED} />
          </View>

          <View style={styles.menuItem}>
            <Ionicons name="notifications" size={24} color={customTheme.COLORS.MUTED} />
            <Text style={styles.menuText}>Notificaciones</Text>
            <Ionicons name="chevron-forward" size={20} color={customTheme.COLORS.MUTED} />
          </View>

          <View style={styles.menuItem}>
            <Ionicons name="shield-checkmark" size={24} color={customTheme.COLORS.MUTED} />
            <Text style={styles.menuText}>Privacidad</Text>
            <Ionicons name="chevron-forward" size={20} color={customTheme.COLORS.MUTED} />
          </View>

          <View style={styles.menuItem}>
            <Ionicons name="help-circle" size={24} color={customTheme.COLORS.MUTED} />
            <Text style={styles.menuText}>Ayuda y Soporte</Text>
            <Ionicons name="chevron-forward" size={20} color={customTheme.COLORS.MUTED} />
          </View>
        </View>

        {/* Botón de Logout */}
        <View style={styles.logoutSection}>
          <Button
            color="error"
            size="large"
            style={styles.logoutButton}
            onPress={handleLogout}
          >
            <Text style={styles.logoutButtonText}>Cerrar Sesión</Text>
          </Button>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingBottom: Platform.OS === 'android' ? 120 : 30,
  },
  headerSection: {
    backgroundColor: '#fff',
    paddingVertical: 30,
    paddingHorizontal: 20,
    alignItems: 'center',
    marginBottom: 20,
  },
  avatarContainer: {
    marginBottom: 15,
  },
  userName: {
    marginBottom: 5,
    color: customTheme.COLORS.HEADER,
  },
  userEmail: {
    fontSize: 16,
  },
  statsSection: {
    backgroundColor: '#fff',
    padding: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    marginBottom: 20,
    color: customTheme.COLORS.HEADER,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statCard: {
    alignItems: 'center',
    flex: 1,
  },
  statNumber: {
    marginTop: 10,
    marginBottom: 5,
    color: customTheme.COLORS.HEADER,
  },
  statLabel: {
    fontSize: 14,
    textAlign: 'center',
  },
  configSection: {
    backgroundColor: '#fff',
    padding: 20,
    marginBottom: 20,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  menuText: {
    flex: 1,
    marginLeft: 15,
    fontSize: 16,
    color: customTheme.COLORS.HEADER,
  },
  logoutSection: {
    paddingHorizontal: 20,
  },
  logoutButton: {
    height: 50,
  },
  logoutButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default PerfilScreen;