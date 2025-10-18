import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  FlatList, 
  Alert, 
  StyleSheet,
  RefreshControl,
  ActivityIndicator 
} from 'react-native';
import { MascotaService } from '../services/firebase/index';
import { Mascota } from '../models/Mascota';
import { useAuth } from '../services/context/AuthContext';

export const MascotasScreen: React.FC = () => {
  const [mascotas, setMascotas] = useState<Mascota[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { user } = useAuth();

  // Cargar mascotas al montar el componente
  useEffect(() => {
    if (user?.uid) {
      cargarMascotas();
    }
  }, [user?.uid]);

  const cargarMascotas = async () => {
    if (!user?.uid) return;
    
    setLoading(true);
    try {
      const resultado = await MascotaService.getByUsuario(user.uid);
      if (resultado.success) {
        setMascotas(resultado.data || []);
      } else {
        Alert.alert('Error', resultado.error || 'No se pudieron cargar las mascotas');
      }
    } catch (error) {
      Alert.alert('Error', 'Error de conexión');
      console.error('Error cargando mascotas:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await cargarMascotas();
    setRefreshing(false);
  };

  const crearMascotaEjemplo = async () => {
    if (!user?.uid) {
      Alert.alert('Error', 'Usuario no autenticado');
      return;
    }

    try {
      const nuevaMascota = {
        id_usuario: user.uid,
        nombre: `Mascota ${mascotas.length + 1}`,
        especie: "perro" as const,
        tamano: "mediano" as const,
        nivel_energia: "medio" as const,
        descripcion: "Mascota creada desde la app"
      };

      const resultado = await MascotaService.create(nuevaMascota);
      
      if (resultado.success) {
        Alert.alert('Éxito', 'Mascota creada correctamente');
        cargarMascotas(); // Recargar la lista
      } else {
        Alert.alert('Error', resultado.error || 'No se pudo crear la mascota');
      }
    } catch (error) {
      Alert.alert('Error', 'Error de conexión');
      console.error('Error creando mascota:', error);
    }
  };

  const eliminarMascota = async (mascotaId: string, nombre: string) => {
    Alert.alert(
      'Confirmar eliminación',
      `¿Estás seguro de eliminar a ${nombre}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              const resultado = await MascotaService.delete(mascotaId);
              if (resultado.success) {
                Alert.alert('Éxito', 'Mascota eliminada correctamente');
                cargarMascotas(); // Recargar la lista
              } else {
                Alert.alert('Error', resultado.error || 'No se pudo eliminar la mascota');
              }
            } catch (error) {
              Alert.alert('Error', 'Error de conexión');
              console.error('Error eliminando mascota:', error);
            }
          }
        }
      ]
    );
  };

  const renderMascota = ({ item }: { item: Mascota }) => (
    <View style={styles.mascotaCard}>
      <View style={styles.mascotaInfo}>
        <Text style={styles.mascotaNombre}>{item.nombre}</Text>
        <Text style={styles.mascotaDetalle}>Especie: {item.especie}</Text>
        <Text style={styles.mascotaDetalle}>
          Tamaño: {item.tamano || 'No especificado'}
        </Text>
        <Text style={styles.mascotaDetalle}>
          Energía: {item.nivel_energia || 'No especificado'}
        </Text>
        {item.descripcion && (
          <Text style={styles.mascotaDescripcion}>{item.descripcion}</Text>
        )}
      </View>
      
      <TouchableOpacity
        style={styles.deleteButton}
        onPress={() => eliminarMascota(item.id, item.nombre)}
      >
        <Text style={styles.deleteButtonText}>Eliminar</Text>
      </TouchableOpacity>
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyStateTitle}>No tienes mascotas registradas</Text>
      <Text style={styles.emptyStateSubtitle}>
        Crea tu primera mascota para comenzar
      </Text>
    </View>
  );

  const renderHeader = () => (
    <View style={styles.header}>
      <Text style={styles.title}>Mis Mascotas ({mascotas.length})</Text>
      
      <TouchableOpacity
        style={styles.createButton}
        onPress={crearMascotaEjemplo}
      >
        <Text style={styles.createButtonText}>Crear Mascota de Prueba</Text>
      </TouchableOpacity>
    </View>
  );

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Cargando mascotas...</Text>
      </View>
    );
  }

  if (!user?.uid) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Usuario no autenticado</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {renderHeader()}
      
      <FlatList
        data={mascotas}
        keyExtractor={(item) => item.id}
        renderItem={renderMascota}
        ListEmptyComponent={renderEmptyState}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#007AFF']}
          />
        }
        contentContainerStyle={mascotas.length === 0 ? styles.emptyContainer : undefined}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  errorText: {
    fontSize: 16,
    color: '#dc3545',
    textAlign: 'center',
  },
  header: {
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#212529',
    marginBottom: 16,
  },
  createButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
  },
  createButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  mascotaCard: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginVertical: 8,
    padding: 16,
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
  mascotaInfo: {
    marginBottom: 12,
  },
  mascotaNombre: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#212529',
    marginBottom: 8,
  },
  mascotaDetalle: {
    fontSize: 14,
    color: '#6c757d',
    marginBottom: 4,
  },
  mascotaDescripcion: {
    fontSize: 14,
    color: '#495057',
    marginTop: 8,
    fontStyle: 'italic',
  },
  deleteButton: {
    backgroundColor: '#dc3545',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  deleteButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyContainer: {
    flexGrow: 1,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#6c757d',
    textAlign: 'center',
    marginBottom: 8,
  },
  emptyStateSubtitle: {
    fontSize: 16,
    color: '#adb5bd',
    textAlign: 'center',
  },
});