import { useState, useEffect, useCallback } from 'react';
import { ServicioMascota, ServicioAuth } from '@/services/firebase';
import type { Mascota } from '@/models/Mascota';

interface UseMascotasReturn {
  mascotas: Mascota[];
  loading: boolean;
  error: string | null;
  refrescar: () => Promise<void>;
  crear: (data: Partial<Mascota>) => Promise<void>;
  actualizar: (id: string, data: Partial<Mascota>) => Promise<void>;
  eliminar: (id: string) => Promise<void>;
}

export const useMascotas = (): UseMascotasReturn => {
  const [mascotas, setMascotas] = useState<Mascota[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cargarMascotas = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const user = ServicioAuth.obtenerUsuarioActual();
      if (!user?.uid) {
        setError('Usuario no autenticado');
        setMascotas([]);
        return;
      }
      const resultado = await ServicioMascota.obtenerPorUsuario(user.uid);
      if (resultado.success && resultado.data) {
        setMascotas(resultado.data);
      } else {
        setError(resultado.error || 'Error al cargar mascotas');
        setMascotas([]);
      }
    } catch (err) {
      setError('Error inesperado al cargar mascotas');
      setMascotas([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    cargarMascotas();
  }, [cargarMascotas]);

  const refrescar = useCallback(async () => {
    await cargarMascotas();
  }, [cargarMascotas]);

  const crear = useCallback(async (data: Partial<Mascota>) => {
    try {
      setLoading(true);
      setError(null);
      const resultado = await ServicioMascota.crear(data as Mascota);
      if (resultado.success) {
        await cargarMascotas();
      } else {
        setError(resultado.error || 'Error al crear mascota');
        throw new Error(resultado.error);
      }
    } catch (err) {
      setError('Error inesperado al crear mascota');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [cargarMascotas]);

  const actualizar = useCallback(async (id: string, data: Partial<Mascota>) => {
    try {
      setLoading(true);
      setError(null);
      const resultado = await ServicioMascota.actualizar(id, data);
      if (resultado.success) {
        await cargarMascotas();
      } else {
        setError(resultado.error || 'Error al actualizar mascota');
        throw new Error(resultado.error);
      }
    } catch (err) {
      setError('Error inesperado al actualizar mascota');
      throw err;
    } finally{
      setLoading(false);
    }
  }, [cargarMascotas]);

  const eliminar = useCallback(async (id: string) => {
    try {
      setLoading(true);
      setError(null);
      const resultado = await ServicioMascota.eliminar(id);
      if (resultado.success) {
        await cargarMascotas();
      } else {
        setError(resultado.error || 'Error al eliminar mascota');
        throw new Error(resultado.error);
      }
    } catch (err) {
      setError('Error inesperado al eliminar mascota');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [cargarMascotas]);

  return {
    mascotas,
    loading,
    error,
    refrescar,
    crear,
    actualizar,
    eliminar,
  };
};
