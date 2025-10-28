import React from 'react';
import {
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  View,
  Platform,
} from 'react-native';
import { theme, Text } from 'galio-framework';
import { useNavigation } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { RootTabParamList } from '../navigation/types';
import { argonTheme } from '../constants';

// Tipo para la navegación
type DashboardNavigationProp = BottomTabNavigationProp<RootTabParamList>;

// Componente principal del Dashboard
const Dashboard: React.FC = () => {
  const navigation = useNavigation<DashboardNavigationProp>();

  const handleMascotasPress = () => {
    navigation.navigate('Mascotas');
  };


  return (
    <View style={styles.container}>
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Header de bienvenida */}
        <View style={styles.header}>
          <Text style={styles.welcomeText}>¡Bienvenido a Pet Pals! 🐾</Text>
          <Text style={styles.subtitleText}>
            Gestiona a tus mascotas de forma fácil y rápida
          </Text>
        </View>

        {/* Botón principal para ir a Mascotas */}
        <TouchableOpacity 
          style={styles.mascotasButton}
          onPress={handleMascotasPress}
        >
          <Text style={styles.mascotasIcon}>🐕</Text>
          <Text style={styles.mascotasButtonText}>VER MIS MASCOTAS</Text>
          <Text style={styles.mascotasSubtext}>Administra y cuida a tus compañeros</Text>
        </TouchableOpacity>

        {/* Sección de estadísticas rápidas (placeholder para futuro) */}
        <View style={styles.statsContainer}>
          <Text style={styles.sectionTitle}>Resumen Rápido</Text>
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>🐾</Text>
              <Text style={styles.statLabel}>Próximamente</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>📊</Text>
              <Text style={styles.statLabel}>Estadísticas</Text>
            </View>
          </View>
        </View>

        {/* Sección de acceso rápido para futuras funciones */}
        <View style={styles.quickActionsContainer}>
          <Text style={styles.sectionTitle}>Acceso Rápido</Text>
          <Text style={styles.comingSoonText}>
            🚀 Más funciones próximamente...
          </Text>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: argonTheme.COLORS.DEFAULT,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: theme.SIZES.BASE,
    paddingBottom: Platform.OS === 'android' 
      ? 120  // Extra padding para Android tabs
      : theme.SIZES.BASE * 2,
  },
  header: {
    marginBottom: theme.SIZES.BASE * 2,
    alignItems: 'center',
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: argonTheme.COLORS.TEXT,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitleText: {
    fontSize: 16,
    color: argonTheme.COLORS.MUTED,
    textAlign: 'center',
  },
  mascotasButton: {
    backgroundColor: argonTheme.COLORS.PRIMARY,
    paddingVertical: 20,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: theme.SIZES.BASE * 2,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
  },
  mascotasIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  mascotasButtonText: {
    color: argonTheme.COLORS.BLACK,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  mascotasSubtext: {
    color: argonTheme.COLORS.BLACK,
    fontSize: 14,
    textAlign: 'center',
    opacity: 0.8,
  },
  statsContainer: {
    backgroundColor: argonTheme.COLORS.SECONDARY,
    padding: theme.SIZES.BASE,
    borderRadius: 12,
    marginBottom: theme.SIZES.BASE * 2,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: argonTheme.COLORS.TEXT,
    marginBottom: theme.SIZES.BASE,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    padding: theme.SIZES.BASE,
    backgroundColor: argonTheme.COLORS.BLOCK,
    borderRadius: 8,
    marginHorizontal: 4,
  },
  statNumber: {
    fontSize: 24,
    marginBottom: 4,
    color: argonTheme.COLORS.TEXT,
  },
  statLabel: {
    fontSize: 12,
    color: argonTheme.COLORS.MUTED,
    textAlign: 'center',
  },
  quickActionsContainer: {
    backgroundColor: argonTheme.COLORS.SECONDARY,
    padding: theme.SIZES.BASE,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  comingSoonText: {
    fontSize: 14,
    color: argonTheme.COLORS.MUTED,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  testButton: {
    backgroundColor: '#FF6B6B',
    padding: theme.SIZES.BASE * 1.5,
    borderRadius: 12,
    alignItems: 'center',
    marginVertical: theme.SIZES.BASE,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  testButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  testSubtext: {
    color: '#fff',
    fontSize: 12,
    opacity: 0.9,
  },
});

export default Dashboard;