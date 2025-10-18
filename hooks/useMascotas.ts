import { useState, useEffect, useCallback } from 'react';
import { Alert } from 'react-native';
import { MascotaService } from '../services/firebase';
import { Mascota } from '../models/Mascota';
import { useAuth } from '../services/context/AuthContext';

/**
 * Custom Hook para manejar las mascotas del usuario
 */
export const useMascotas = () => {
  const [mascotas, setMascotas] = useState<Mascota[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  // Cargar mascotas
  const cargarMascotas = useCallback(async () => {
    if (!user?.uid) {
      setMascotas([]);
      setLoading(false);
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const resultado = await MascotaService.getByUsuario(user.uid);
      if (resultado.success) {
        setMascotas(resultado.data || []);
      } else {
        setError(resultado.error || 'No se pudieron cargar las mascotas');
        Alert.alert('Error', resultado.error || 'No se pudieron cargar las mascotas');
      }
    } catch (err: any) {
      const errorMsg = 'Error de conexión';
      setError(errorMsg);
      Alert.alert('Error', errorMsg);
      console.error('Error cargando mascotas:', err);
    } finally {
      setLoading(false);
    }
  }, [user?.uid]);

  // Crear nueva mascota
  const crearMascota = useCallback(async (mascotaData: Omit<Mascota, 'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'updatedBy'>) => {
    if (!user?.uid) {
      Alert.alert('Error', 'Usuario no autenticado');
      return false;
    }

    try {
      const resultado = await MascotaService.create(mascotaData);
      
      if (resultado.success) {
        Alert.alert('Éxito', 'Mascota creada correctamente');
        await cargarMascotas(); // Recargar lista
        return true;
      } else {
        Alert.alert('Error', resultado.error || 'No se pudo crear la mascota');
        return false;
      }
    } catch (err: any) {
      Alert.alert('Error', 'Error de conexión');
      console.error('Error creando mascota:', err);
      return false;
    }
  }, [user?.uid, cargarMascotas]);

  // Eliminar mascota
  const eliminarMascota = useCallback(async (mascotaId: string, nombre: string): Promise<boolean> => {
    return new Promise((resolve) => {
      Alert.alert(
        'Confirmar eliminación',
        `¿Estás seguro de eliminar a ${nombre}?`,
        [
          { 
            text: 'Cancelar', 
            style: 'cancel',
            onPress: () => resolve(false)
          },
          {
            text: 'Eliminar',
            style: 'destructive',
            onPress: async () => {
              try {
                const resultado = await MascotaService.delete(mascotaId);
                if (resultado.success) {
                  Alert.alert('Éxito', 'Mascota eliminada correctamente');
                  await cargarMascotas(); // Recargar lista
                  resolve(true);
                } else {
                  Alert.alert('Error', resultado.error || 'No se pudo eliminar la mascota');
                  resolve(false);
                }
              } catch (err: any) {
                Alert.alert('Error', 'Error de conexión');
                console.error('Error eliminando mascota:', err);
                resolve(false);
              }
            }
          }
        ]
      );
    });
  }, [cargarMascotas]);

  // Refresh (pull to refresh)
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await cargarMascotas();
    setRefreshing(false);
  }, [cargarMascotas]);

  // Crear mascota de ejemplo
  const crearMascotaEjemplo = useCallback(async () => {
    if (!user?.uid) return false;

    const nuevaMascota = {
      id_usuario: user.uid,
      nombre: `Mascota ${mascotas.length + 1}`,
      especie: 'perro' as const,
      tamano: 'mediano' as const,
      nivel_energia: 'medio' as const,
      descripcion: 'Mascota creada desde la app'
    };

    return await crearMascota(nuevaMascota);
  }, [user?.uid, mascotas.length, crearMascota]);

  // Cargar mascotas al montar o cambiar usuario
  useEffect(() => {
    cargarMascotas();
  }, [cargarMascotas]);

  return {
    // Estado
    mascotas,
    loading,
    refreshing,
    error,
    
    // Acciones
    cargarMascotas,
    crearMascota,
    crearMascotaEjemplo,
    eliminarMascota,
    onRefresh,
    
    // Información adicional
    totalMascotas: mascotas.length,
    hasMascotas: mascotas.length > 0
  };
};

/**
 * Hook simplificado para obtener solo las mascotas (sin acciones)
 */
export const useMascotasList = () => {
  const { mascotas, loading, error, cargarMascotas } = useMascotas();
  
  return {
    mascotas,
    loading,
    error,
    refresh: cargarMascotas
  };
};