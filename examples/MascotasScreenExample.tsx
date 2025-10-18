import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, FlatList, Alert } from 'react-native';
import { MascotaService } from '../services/firebase/index';
import { Mascota } from '../models/Mascota';

interface Props {
  userId: string;
}

export const MascotasScreen: React.FC<Props> = ({ userId }) => {
  const [mascotas, setMascotas] = useState<Mascota[]>([]);
  const [loading, setLoading] = useState(true);

  // Cargar mascotas al montar el componente
  useEffect(() => {
    cargarMascotas();
  }, [userId]);

  const cargarMascotas = async () => {
    setLoading(true);
    try {
      const resultado = await MascotaService.getByUsuario(userId);
      if (resultado.success) {
        setMascotas(resultado.data || []);
      } else {
        Alert.alert('Error', resultado.error || 'No se pudieron cargar las mascotas');
      }
    } catch (error) {
      Alert.alert('Error', 'Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  const crearMascotaEjemplo = async () => {
    try {
      const nuevaMascota = {
        id_usuario: userId,
        nombre: "Nueva Mascota",
        especie: "perro" as const,
        tamano: "mediano" as const,
        nivel_energia: "medio" as const
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
    }
  };

  const eliminarMascota = async (mascotaId: string, nombre: string) => {
    Alert.alert(
      'Confirmar',
      `¿Estás seguro de eliminar a ${nombre}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            const resultado = await MascotaService.delete(mascotaId);
            if (resultado.success) {
              Alert.alert('Éxito', 'Mascota eliminada');
              cargarMascotas(); // Recargar la lista
            } else {
              Alert.alert('Error', resultado.error || 'No se pudo eliminar');
            }
          }
        }
      ]
    );
  };

  const renderMascota = ({ item }: { item: Mascota }) => (
    <View style={{ padding: 16, borderBottomWidth: 1, borderColor: '#eee' }}>
      <Text style={{ fontSize: 18, fontWeight: 'bold' }}>{item.nombre}</Text>
      <Text>Especie: {item.especie}</Text>
      <Text>Tamaño: {item.tamano || 'No especificado'}</Text>
      <Text>Energía: {item.nivel_energia || 'No especificado'}</Text>
      
      <TouchableOpacity
        style={{ marginTop: 8, backgroundColor: 'red', padding: 8, borderRadius: 4 }}
        onPress={() => eliminarMascota(item.id, item.nombre)}
      >
        <Text style={{ color: 'white', textAlign: 'center' }}>Eliminar</Text>
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text>Cargando mascotas...</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, padding: 16 }}>
      <Text style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 16 }}>
        Mis Mascotas ({mascotas.length})
      </Text>

      <TouchableOpacity
        style={{ backgroundColor: 'blue', padding: 12, borderRadius: 8, marginBottom: 16 }}
        onPress={crearMascotaEjemplo}
      >
        <Text style={{ color: 'white', textAlign: 'center', fontWeight: 'bold' }}>
          Crear Mascota de Ejemplo
        </Text>
      </TouchableOpacity>

      {mascotas.length === 0 ? (
        <Text style={{ textAlign: 'center', marginTop: 32, fontSize: 16, color: '#666' }}>
          No tienes mascotas registradas
        </Text>
      ) : (
        <FlatList
          data={mascotas}
          keyExtractor={(item) => item.id}
          renderItem={renderMascota}
          refreshing={loading}
          onRefresh={cargarMascotas}
        />
      )}
    </View>
  );
};