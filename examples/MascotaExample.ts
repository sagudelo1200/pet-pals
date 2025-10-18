import { MascotaService } from '../services/firebase/index';
import { Mascota, EspecieMascota, GeneroMascota, TamanoMascota, NivelEnergia } from '../models/Mascota';

// Ejemplo de uso del CRUD con Mascota
export class MascotaController {
  
  /**
   * Crear una nueva mascota
   */
  static async crearMascota(userId: string) {
    // Los datos que enviarías desde el formulario
    const datosMascota = {
      id_usuario: userId,
      nombre: 'Firulais',
      especie: 'perro' as EspecieMascota,
      raza: 'Golden Retriever',
      fecha_nacimiento: new Date('2020-05-15'),
      genero: 'macho' as GeneroMascota,
      tamano: 'grande' as TamanoMascota,
      peso: 30,
      esterilizado: true,
      nivel_energia: 'alto' as NivelEnergia,
      descripcion: 'Perro muy juguetón y amigable'
    };

    const resultado = await MascotaService.create(datosMascota);
    
    if (resultado.success) {
      console.log('Mascota creada:', resultado.data);
      return resultado.data;
    } else {
      console.error('Error:', resultado.error);
      return null;
    }
  }

  /**
   * Obtener todas las mascotas de un usuario
   */
  static async obtenerMascotasUsuario(userId: string) {
    const resultado = await MascotaService.getByUsuario(userId);
    
    if (resultado.success) {
      console.log('Mascotas encontradas:', resultado.data?.length);
      return resultado.data || [];
    } else {
      console.error('Error:', resultado.error);
      return [];
    }
  }

  /**
   * Actualizar datos de una mascota
   */
  static async actualizarMascota(mascotaId: string, nuevoDatos: Partial<Mascota>) {
    const resultado = await MascotaService.update(mascotaId, nuevoDatos);
    
    if (resultado.success) {
      console.log('Mascota actualizada:', resultado.data);
      return resultado.data;
    } else {
      console.error('Error:', resultado.error);
      return null;
    }
  }

  /**
   * Ejemplo de actualización específica - cambiar peso
   */
  static async actualizarPeso(mascotaId: string, nuevoPeso: number) {
    return this.actualizarMascota(mascotaId, { peso: nuevoPeso });
  }

  /**
   * Ejemplo de actualización específica - agregar vacuna
   */
  static async agregarVacuna(mascotaId: string, nombreVacuna: string) {
    // Primero obtenemos la mascota actual
    const mascotaActual = await MascotaService.getById(mascotaId);
    
    if (!mascotaActual.success || !mascotaActual.data) {
      console.error('No se encontró la mascota');
      return null;
    }

    // Agregamos la nueva vacuna
    const vacunasActuales = mascotaActual.data.vacunas || [];
    const nuevasVacunas = [
      ...vacunasActuales,
      {
        nombre: nombreVacuna,
        fecha: new Date()
      }
    ];

    return this.actualizarMascota(mascotaId, { vacunas: nuevasVacunas });
  }

  /**
   * Eliminar una mascota
   */
  static async eliminarMascota(mascotaId: string) {
    const resultado = await MascotaService.delete(mascotaId);
    
    if (resultado.success) {
      console.log('Mascota eliminada exitosamente');
      return true;
    } else {
      console.error('Error:', resultado.error);
      return false;
    }
  }

  /**
   * Buscar mascotas por tamaño
   */
  static async buscarPorTamano(tamano: TamanoMascota) {
    const resultado = await MascotaService.getByTamano(tamano);
    
    if (resultado.success) {
      console.log(`Mascotas de tamaño ${tamano}:`, resultado.data?.length);
      return resultado.data || [];
    } else {
      console.error('Error:', resultado.error);
      return [];
    }
  }
}

// Ejemplo de uso en un componente React
export const ejemploDeUso = async () => {
  const userId = 'usuario123';
  
  try {
    // 1. Crear una mascota
    const nuevaMascota = await MascotaController.crearMascota(userId);
    if (!nuevaMascota) return;

    // 2. Obtener todas las mascotas del usuario
    const mascotas = await MascotaController.obtenerMascotasUsuario(userId);
    console.log('Total mascotas:', mascotas.length);

    // 3. Actualizar el peso de la mascota
    await MascotaController.actualizarPeso(nuevaMascota.id, 32);

    // 4. Agregar una vacuna
    await MascotaController.agregarVacuna(nuevaMascota.id, 'Rabia');

    // 5. Buscar mascotas grandes
    const mascotasGrandes = await MascotaController.buscarPorTamano('grande');
    console.log('Mascotas grandes:', mascotasGrandes.length);

  } catch (error) {
    console.error('Error en el ejemplo:', error);
  }
};