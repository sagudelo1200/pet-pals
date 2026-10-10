import { Timestamp } from 'firebase/firestore'
import type {
  OperacionEconomica,
  EventoOperacionEconomica,
  MovimientoFinanciero,
  Obligacion,
} from '@/models/operacionesEconomicas'
import {
  validateI1,
  validateI2,
  validateI3,
  validateI4,
  validateI5,
} from '../invariantes'

const now = Timestamp.now()

describe('Invariantes Operaciones Económicas', () => {
  describe('I1: Composición Económica', () => {
    it('válido: suma correcta', () => {
      const op: OperacionEconomica = {
        id: 'op-1',
        tutor_id: 'tutor-1',
        valor_acordado: 50000,
        remuneracion_mandatario: 5000,
        recursos_administrados: 45000,
        estado: 'ENCARGADA',
        creado_en: now,
      }
      expect(validateI1(op)).toBe(true)
    })

    it('inválido: suma incorrecta', () => {
      const op: OperacionEconomica = {
        id: 'op-2',
        tutor_id: 'tutor-1',
        valor_acordado: 50000,
        remuneracion_mandatario: 4000,
        recursos_administrados: 45000,
        estado: 'ENCARGADA',
        creado_en: now,
      }
      expect(validateI1(op)).toBe(false)
    })
  })

  describe('I2: Trazabilidad', () => {
    it('válido: con operacion_id', () => {
      const mov: MovimientoFinanciero = {
        id: 'mov-1',
        operacion_id: 'op-1',
        tipo: 'RECAUDO',
        valor: 50000,
        sentido: 'ENTRADA',
        origen: 'WOMPI',
        referencia_origen: 'TXN-12345',
        creado_en: now,
      }
      expect(validateI2(mov)).toBe(true)
    })

    it('válido: con justificacion', () => {
      const mov: MovimientoFinanciero = {
        id: 'mov-2',
        justificacion: 'Comisión bancaria 2026-10-08',
        tipo: 'AJUSTE',
        valor: 500,
        sentido: 'SALIDA',
        origen: 'BANCO',
        referencia_origen: 'COM-999',
        creado_en: now,
      }
      expect(validateI2(mov)).toBe(true)
    })

    it('inválido: sin operacion_id ni justificacion', () => {
      const mov: MovimientoFinanciero = {
        id: 'mov-3',
        tipo: 'PAGO',
        valor: 10000,
        sentido: 'SALIDA',
        origen: 'STRIPE',
        referencia_origen: 'PAY-777',
        creado_en: now,
      }
      expect(validateI2(mov)).toBe(false)
    })
  })

  describe('I3: Consistencia de Estado', () => {
    it('válido: RECAUDADA con eventos correctos', () => {
      const op: OperacionEconomica = {
        id: 'op-3',
        tutor_id: 'tutor-1',
        valor_acordado: 50000,
        remuneracion_mandatario: 5000,
        recursos_administrados: 45000,
        estado: 'RECAUDADA',
        creado_en: now,
      }
      const eventos: EventoOperacionEconomica[] = [
        {
          id: 'evt-1',
          operacionId: 'op-3',
          tipo: 'OPERACION_ENCARGADA',
          detalle: 'Operación iniciada',
          timestamp: now,
        },
        {
          id: 'evt-2',
          operacionId: 'op-3',
          tipo: 'RECAUDO',
          detalle: 'Recaudo confirmado',
          timestamp: now,
        },
      ]
      expect(validateI3(op, eventos)).toBe(true)
    })

    it('inválido: RECAUDADA sin evento RECAUDO', () => {
      const op: OperacionEconomica = {
        id: 'op-4',
        tutorId: 'tutor-1',
        valorAcordado: 50000,
        remuneracionMandatario: 5000,
        recursosAdministradosEnEjecucion: 45000,
        estado: 'RECAUDADA',
        creadoEn: now,
      }
      const eventos: EventoOperacionEconomica[] = [
        {
          id: 'evt-3',
          operacionId: 'op-4',
          tipo: 'OPERACION_ENCARGADA',
          detalle: 'Operación iniciada',
          timestamp: now,
        },
      ]
      expect(validateI3(op, eventos)).toBe(false)
    })

    it('inválido: EJECUTADA sin evento SERVICIO_EJECUTADO', () => {
      const op: OperacionEconomica = {
        id: 'op-5',
        tutorId: 'tutor-1',
        valorAcordado: 50000,
        remuneracionMandatario: 5000,
        recursosAdministradosEnEjecucion: 45000,
        estado: 'EJECUTADA',
        creadoEn: now,
      }
      const eventos: EventoOperacionEconomica[] = [
        {
          id: 'evt-4',
          operacionId: 'op-5',
          tipo: 'OPERACION_ENCARGADA',
          detalle: 'Operación iniciada',
          timestamp: now,
        },
      ]
      expect(validateI3(op, eventos)).toBe(false)
    })
  })

  describe('I4: Unicidad de Efecto', () => {
    it('válido: movimientos sin duplicados', () => {
      const movs: MovimientoFinanciero[] = [
        {
          id: 'mov-4',
          operacionId: 'op-6',
          tipo: 'RECAUDO',
          valor: 50000,
          sentido: 'ENTRADA',
          origen: 'WOMPI',
          referenciaOrigen: 'TXN-111',
          creadoEn: now,
        },
        {
          id: 'mov-5',
          operacionId: 'op-6',
          tipo: 'PAGO',
          valor: 25000,
          sentido: 'SALIDA',
          origen: 'STRIPE',
          referenciaOrigen: 'PAY-222',
          creadoEn: now,
        },
      ]
      expect(validateI4(movs)).toBe(true)
    })

    it('inválido: movimientos con duplicados', () => {
      const movs: MovimientoFinanciero[] = [
        {
          id: 'mov-6',
          operacionId: 'op-7',
          tipo: 'RECAUDO',
          valor: 50000,
          sentido: 'ENTRADA',
          origen: 'WOMPI',
          referenciaOrigen: 'TXN-333',
          creadoEn: now,
        },
        {
          id: 'mov-7',
          operacionId: 'op-7',
          tipo: 'RECAUDO',
          valor: 50000,
          sentido: 'ENTRADA',
          origen: 'WOMPI',
          referenciaOrigen: 'TXN-333',
          creadoEn: now,
        },
      ]
      expect(validateI4(movs)).toBe(false)
    })
  })

  describe('I5: Cierre de Operación', () => {
    it('válido: CERRADA sin obligaciones', () => {
      const op: OperacionEconomica = {
        id: 'op-8',
        tutorId: 'tutor-1',
        valorAcordado: 50000,
        remuneracionMandatario: 5000,
        recursosAdministradosEnEjecucion: 45000,
        estado: 'CERRADA',
        creadoEn: now,
      }
      expect(validateI5(op, [])).toBe(true)
    })

    it('válido: CERRADA con obligación CUMPLIDA', () => {
      const op: OperacionEconomica = {
        id: 'op-9',
        tutorId: 'tutor-1',
        valorAcordado: 50000,
        remuneracionMandatario: 5000,
        recursosAdministradosEnEjecucion: 45000,
        estado: 'CERRADA',
        creadoEn: now,
      }
      const oblig: Obligacion[] = [
        {
          id: 'ob-1',
          operacionId: 'op-9',
          deudor: 'PAW-PATH',
          acreedor: 'cuidador-1',
          concepto: 'Pago por servicios',
          valor: 45000,
          estado: 'CUMPLIDA',
          creadoEn: now,
        },
      ]
      expect(validateI5(op, oblig)).toBe(true)
    })

    it('inválido: CERRADA con obligación PENDIENTE', () => {
      const op: OperacionEconomica = {
        id: 'op-10',
        tutorId: 'tutor-1',
        valorAcordado: 50000,
        remuneracionMandatario: 5000,
        recursosAdministradosEnEjecucion: 45000,
        estado: 'CERRADA',
        creadoEn: now,
      }
      const oblig: Obligacion[] = [
        {
          id: 'ob-2',
          operacionId: 'op-10',
          deudor: 'PAW-PATH',
          acreedor: 'cuidador-2',
          concepto: 'Pago por servicios',
          valor: 45000,
          estado: 'PENDIENTE',
          creadoEn: now,
        },
      ]
      expect(validateI5(op, oblig)).toBe(false)
    })
  })
})
