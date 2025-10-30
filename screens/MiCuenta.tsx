import { COLORS } from '@/constants/Theme';
import React, { useCallback } from 'react';
import { Alert, Platform, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '@/components';
import { useAuth } from '@/services/context/AuthContext';
import { useNavigation } from '@react-navigation/native';

const MiCuenta = () => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { logout, loading } = useAuth();

  // Altura del TabBar (replicando la lógica de TabNavigator) para evitar superposición
  const TAB_BAR_HEIGHT = Platform.OS === 'ios'
    ? Math.max(insets.bottom + 65, 85)
    : Math.max(insets.bottom + 60, 75);

  const handleLogout = useCallback(async () => {
    const result = await logout();
    if (result.success) {
      // Volver al flujo de autenticación
      navigation.reset({ index: 0, routes: [{ name: 'Auth' }] });
    } else {
      Alert.alert('No se pudo cerrar sesión', result.error || 'Intenta nuevamente.');
    }
  }, [logout, navigation]);

  return (
    <SafeAreaView style={[styles.container, { paddingBottom: TAB_BAR_HEIGHT }] }>
      <View style={styles.content}>
        <Text style={styles.text}>¡Mi Cuenta!</Text>
        <Text style={styles.subText}>
          Esta sección está en desarrollo. ¡Mantente atento a las actualizaciones!
        </Text>
      </View>

      <View style={styles.footer}>
        <Button
          style={styles.logoutButton as any}
          onPress={handleLogout}
          disabled={loading}
          color={'secondary'}
        >
          {loading ? 'Cerrando sesión…' : 'Cerrar sesión'}
        </Button>
      </View>
    </SafeAreaView>
  );
};

const styles = {
  container: {
    flex: 1,
    alignItems: 'center' as const,
    backgroundColor: COLORS.DEFAULT,
  },
  content: {
    flex: 1,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    paddingHorizontal: 20,
  },
  text: {
    fontSize: 24,
    fontWeight: 'bold' as 'bold',
    textAlign: 'center' as const,
    color: COLORS.TEXT,
  },
  subText: {
    fontSize: 16,
    textAlign: 'center' as const,
    marginTop: 10,
    color: COLORS.MUTED,
  },
  footer: {
    alignSelf: 'stretch' as const,
    padding: 20,
  },
  logoutButton: {
    alignSelf: 'stretch' as const,
  },
};

export default MiCuenta;
