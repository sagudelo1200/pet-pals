import { BaseCrudService } from './crud';
import { Paseo } from '../../models/Paseo';
import { CrudResult } from './types';

export class PaseoService {
  private static readonly COLLECTION = 'paseos';

  static async create(data: Omit<Paseo, 'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'updatedBy'>): Promise<CrudResult<Paseo>> {
    return BaseCrudService.create<Paseo>(this.COLLECTION, data);
  }

  static async getById(id: string): Promise<CrudResult<Paseo>> {
    return BaseCrudService.getById<Paseo>(this.COLLECTION, id);
  }

  static async update(id: string, data: Partial<Omit<Paseo, 'id' | 'createdAt' | 'createdBy'>>): Promise<CrudResult<Paseo>> {
    return BaseCrudService.update<Paseo>(this.COLLECTION, id, data);
  }

  static async delete(id: string): Promise<CrudResult<boolean>> {
    return BaseCrudService.delete(this.COLLECTION, id);
  }

  static async getAll(): Promise<CrudResult<Paseo[]>> {
    return BaseCrudService.getAll<Paseo>(this.COLLECTION);
  }

  // Métodos específicos
  static async getByPaseador(paseadorId: string): Promise<CrudResult<Paseo[]>> {
    return BaseCrudService.getWhere<Paseo>(this.COLLECTION, 'id_paseador', paseadorId);
  }

  static async getByMascota(mascotaId: string): Promise<CrudResult<Paseo[]>> {
    return BaseCrudService.getWhere<Paseo>(this.COLLECTION, 'id_mascota', mascotaId);
  }

  static async getByEstado(estado: string): Promise<CrudResult<Paseo[]>> {
    return BaseCrudService.getWhere<Paseo>(this.COLLECTION, 'estado', estado);
  }
}