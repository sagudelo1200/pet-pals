import { useState, useCallback } from 'react';
import type { Mascota } from '@/models/Mascota';

interface UseFormularioMascotaReturn {
  pasoActual: number;
  datosMascota: Partial<Mascota>;
  siguientePaso: () => void;
  pasoAnterior: () => void;
  actualizarCampo: (campo: keyof Mascota, valor: any) => void;
  validarPasoActual: () => boolean;
  reiniciar: () => void;
  totalPasos: number;
}

const TOTAL_PASOS = 4; // nombre, raza, edad, foto

export const useFormularioMascota = (
  mascotaInicial?: Mascota
): UseFormularioMascotaReturn => {
  const [pasoActual, setPasoActual] = useState(1);
  const [datosMascota, setDatosMascota] = useState<Partial<Mascota>>({
    especie: 'perro', // Por defecto siempre perro
    activo: true,
    ...mascotaInicial,
  });

  const actualizarCampo = useCallback((campo: keyof Mascota, valor: any) => {
    setDatosMascota((prev) => ({
      ...prev,
      [campo]: valor,
    }));
  }, []);

  const validarPasoActual = useCallback((): boolean => {
    switch (pasoActual) {
      case 1: // Nombre
        return !!datosMascota.nombre && datosMascota.nombre.trim().length > 0;
      case 2: // Raza (opcional)
        return true;
      case 3: // Edad (opcional)
        return true;
      case 4: // Foto (opcional)
        return true;
      default:
        return false;
    }
  }, [pasoActual, datosMascota]);

  const siguientePaso = useCallback(() => {
    if (pasoActual < TOTAL_PASOS && validarPasoActual()) {
      setPasoActual((prev) => prev + 1);
    }
  }, [pasoActual, validarPasoActual]);

  const pasoAnterior = useCallback(() => {
    if (pasoActual > 1) {
      setPasoActual((prev) => prev - 1);
    }
  }, [pasoActual]);

  const reiniciar = useCallback(() => {
    setPasoActual(1);
    setDatosMascota({
      especie: 'perro',
      activo: true,
    });
  }, []);

  return {
    pasoActual,
    datosMascota,
    siguientePaso,
    pasoAnterior,
    actualizarCampo,
    validarPasoActual,
    reiniciar,
    totalPasos: TOTAL_PASOS,
  };
};
