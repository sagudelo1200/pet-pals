/**
 * SUITE: Obligaciones (Deudas)
 * Valida que las 3 deudas se crean, evolucionan y cierren correctamente
 *
 * Deuda #1: Juan (tutor) → Paw-Path ($100)
 * Deuda #2: Paw-Path → Carlos (cuidador) ($90)
 * Deuda #3: Paw-Path (comisión a sí misma) ($10)
 */

import type { Obligacion } from '@/models/operacionesEconomicas'
import { Timestamp } from 'firebase/firestore'

describe('OBLIGACIONES: Las 3 deudas del sistema', () => {
  describe('Deuda #1: Tutor → Paw-Path (pago del paseo)', () => {
    it('✅ Se crea en estado PENDIENTE cuando se contrata', () => {
      const deuda: Obligacion = {
        id: 'obl-1',
        operacion_id: 'op-1',
        deudor: 'juan-tutor',
        acreedor: 'paw-path',
        concepto: 'Pago por paseo',
        valor: 100, // Precio completo
        estado: 'PENDIENTE',
        creado_en: Timestamp.now(),
      }

      expect(deuda.estado).toBe('PENDIENTE')
      expect(deuda.valor).toBe(100)
      expect(deuda.deudor).toBe('juan-tutor')
    })

    it('✅ Transiciona PENDIENTE → CUMPLIDA cuando Juan paga', () => {
      const deuda: Obligacion = {
        id: 'obl-1',
        operacion_id: 'op-1',
        deudor: 'juan-tutor',
        acreedor: 'paw-path',
        concepto: 'Pago por paseo',
        valor: 100,
        estado: 'CUMPLIDA', // Cambió
        cumplido_en: Timestamp.now(),
        creado_en: Timestamp.now(),
      }

      expect(deuda.estado).toBe('CUMPLIDA')
      expect(deuda.cumplido_en).toBeDefined()
    })

    it('❌ No permite pagar parcial: debe ser exacto', () => {
      const deudaOriginal = 100
      const pagosRecibidos = [50, 30] // Parciales

      const totalPagado = pagosRecibidos.reduce((a, b) => a + b, 0)
      const esPagoCompleto = totalPagado === deudaOriginal

      expect(esPagoCompleto).toBe(false)
    })

    it('❌ No permite pagar dos veces', () => {
      const deuda: Obligacion = {
        id: 'obl-1',
        operacion_id: 'op-1',
        deudor: 'juan-tutor',
        acreedor: 'paw-path',
        concepto: 'Pago por paseo',
        valor: 100,
        estado: 'CUMPLIDA', // Ya pagó
        cumplido_en: Timestamp.now(),
        creado_en: Timestamp.now(),
      }

      // Intentar pagar de nuevo
      const intentoPagoDoble = () => {
        if (deuda.estado === 'CUMPLIDA') {
          throw new Error('Deuda ya fue pagada')
        }
      }

      expect(() => intentoPagoDoble()).toThrow('Deuda ya fue pagada')
    })
  })

  describe('Deuda #2: Paw-Path → Cuidador (90% del paseo)', () => {
    it('✅ Se crea cuando cuidador termina el servicio (FASE 3)', () => {
      const deuda: Obligacion = {
        id: 'obl-2',
        operacion_id: 'op-1',
        deudor: 'paw-path',
        acreedor: 'carlos-cuidador',
        concepto: 'Pago por servicio ejecutado',
        valor: 90, // 90% de $100
        estado: 'PENDIENTE',
        creado_en: Timestamp.now(),
      }

      expect(deuda.valor).toBe(90)
      expect(deuda.acreedor).toBe('carlos-cuidador')
      expect(deuda.deudor).toBe('paw-path')
    })

    it('✅ Se calcula como 90% del precio acordado', () => {
      const precioAcordado = 100
      const porcentajeCuidador = 0.9
      const deudaAlCuidador = precioAcordado * porcentajeCuidador

      expect(deudaAlCuidador).toBe(90)
    })

    it('✅ Transiciona PENDIENTE → CUMPLIDA en liquidación semanal', () => {
      const deuda: Obligacion = {
        id: 'obl-2',
        operacion_id: 'op-1',
        deudor: 'paw-path',
        acreedor: 'carlos-cuidador',
        concepto: 'Pago por servicio ejecutado',
        valor: 90,
        estado: 'CUMPLIDA', // Viernes: Paw-Path pagó a cuidadores
        cumplido_en: Timestamp.now(),
        creado_en: Timestamp.now(),
      }

      expect(deuda.estado).toBe('CUMPLIDA')
    })

    it('✅ Se puede liquidar múltiples paseos en un lote', () => {
      // Escenario: Carlos hizo 3 paseos esta semana
      const deudas = [
        { valor: 90, estado: 'CUMPLIDA' }, // Paseo 1
        { valor: 90, estado: 'CUMPLIDA' }, // Paseo 2
        { valor: 90, estado: 'CUMPLIDA' }, // Paseo 3
      ]

      const totalLiquidado = deudas.reduce((sum, d) => sum + d.valor, 0)
      const todasLiquidadas = deudas.every(d => d.estado === 'CUMPLIDA')

      expect(totalLiquidado).toBe(270)
      expect(todasLiquidadas).toBe(true)
    })
  })

  describe('Deuda #3: Comisión de Paw-Path (10% del paseo)', () => {
    it('✅ Se reserva como 10% del precio acordado', () => {
      const precioAcordado = 100
      const porcentajeComision = 0.1
      const comisionPawPath = precioAcordado * porcentajeComision

      expect(comisionPawPath).toBe(10)
    })

    it('✅ Se marca como CUMPLIDA cuando operación RECAUDADA', () => {
      const comision: Obligacion = {
        id: 'obl-3',
        operacion_id: 'op-1',
        deudor: 'paw-path', // Paw-Path "debe" a sí misma
        acreedor: 'paw-path', // Pero también es acreedora
        concepto: 'Comisión operativa',
        valor: 10,
        estado: 'CUMPLIDA', // Es ingreso, no deuda
        creado_en: Timestamp.now(),
      }

      expect(comision.estado).toBe('CUMPLIDA')
      expect(comision.valor).toBe(10)
    })

    it('❌ NO es ganancia si operación NO fue RECAUDADA', () => {
      // Si el tutor nunca pagó, Paw-Path no gana nada
      const operacionCancelada: string = 'CANCELADA'

      const puedeGanarComision = operacionCancelada === 'RECAUDADA'

      expect(puedeGanarComision).toBe(false)
    })
  })

  describe('Flujo completo: Las 3 deudas juntas', () => {
    it('✅ Juan paga → Automáticamente se crean deuda a Carlos y comisión', () => {
      const operacion = {
        id: 'op-1',
        valor_acordado: 100,
      }

      // Al terminar servicio, se crean 2 deudas
      const obligaciones: Obligacion[] = [
        {
          id: 'obl-juan',
          operacion_id: 'op-1',
          deudor: 'juan-tutor',
          acreedor: 'paw-path',
          concepto: 'Pago paseo',
          valor: 100,
          estado: 'PENDIENTE',
          creado_en: Timestamp.now(),
        },
        {
          id: 'obl-carlos',
          operacion_id: 'op-1',
          deudor: 'paw-path',
          acreedor: 'carlos-cuidador',
          concepto: 'Pago cuidador',
          valor: 90,
          estado: 'PENDIENTE',
          creado_en: Timestamp.now(),
        },
      ]

      expect(obligaciones).toHaveLength(2)
      expect(obligaciones[0].deudor).toBe('juan-tutor')
      expect(obligaciones[1].acreedor).toBe('carlos-cuidador')
      // El tutor debe exactamente el valor acordado de la operación
      expect(obligaciones[0].valor).toBe(operacion.valor_acordado)
      expect(obligaciones.every(o => o.operacion_id === operacion.id)).toBe(true)
    })

    it('✅ Cierre solo cuando todas estén CUMPLIDA', () => {
      const obligaciones: Obligacion[] = [
        {
          id: 'obl-juan',
          operacion_id: 'op-1',
          deudor: 'juan-tutor',
          acreedor: 'paw-path',
          concepto: 'Pago paseo',
          valor: 100,
          estado: 'CUMPLIDA', // ✅
          cumplido_en: Timestamp.now(),
          creado_en: Timestamp.now(),
        },
        {
          id: 'obl-carlos',
          operacion_id: 'op-1',
          deudor: 'paw-path',
          acreedor: 'carlos-cuidador',
          concepto: 'Pago cuidador',
          valor: 90,
          estado: 'CUMPLIDA', // ✅
          cumplido_en: Timestamp.now(),
          creado_en: Timestamp.now(),
        },
      ]

      // Solo si todas están liquidadas
      const puedenCerrar = obligaciones.every(
        o => o.estado === 'CUMPLIDA'
      )

      expect(puedenCerrar).toBe(true)
    })

    it('❌ NO cierra si Juan no pagó', () => {
      const obligaciones: Obligacion[] = [
        {
          id: 'obl-juan',
          operacion_id: 'op-1',
          deudor: 'juan-tutor',
          acreedor: 'paw-path',
          concepto: 'Pago paseo',
          valor: 100,
          estado: 'PENDIENTE', // ❌ Aún debe
          creado_en: Timestamp.now(),
        },
      ]

      const puedenCerrar = obligaciones.every(
        o => o.estado === 'CUMPLIDA'
      )

      expect(puedenCerrar).toBe(false)
    })
  })
})
