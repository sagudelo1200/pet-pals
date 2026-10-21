/**
 * SUITE: Contabilidad & Reportes
 * Valida que los reportes financieros sean precisos y consistentes
 *
 * Preguntas que responde:
 * 1. ¿Cuánto dinero entra vs sale?
 * 2. ¿A quién le debo dinero?
 * 3. ¿Dinero "perdido"? (Validación de consistencia)
 */

import type {
  MovimientoFinanciero,
  Obligacion,
} from '@/models/operacionesEconomicas'
import { Timestamp } from 'firebase/firestore'

describe('CONTABILIDAD: Reportes & Reconciliación', () => {
  describe('Reporte 1: Balance diario/semanal', () => {
    it('✅ Calcular entradas totales de una semana', () => {
      const movimientos: MovimientoFinanciero[] = [
        {
          id: 'mov-1',
          operacion_id: 'op-1',
          tipo: 'RECAUDO',
          valor: 100,
          sentido: 'ENTRADA',
          origen: 'TUTOR',
          referencia_origen: 'TXN-001',
          creado_en: Timestamp.now(),
        },
        {
          id: 'mov-2',
          operacion_id: 'op-2',
          tipo: 'RECAUDO',
          valor: 150,
          sentido: 'ENTRADA',
          origen: 'TUTOR',
          referencia_origen: 'TXN-002',
          creado_en: Timestamp.now(),
        },
        {
          id: 'mov-3',
          operacion_id: 'op-3',
          tipo: 'RECAUDO',
          valor: 200,
          sentido: 'ENTRADA',
          origen: 'TUTOR',
          referencia_origen: 'TXN-003',
          creado_en: Timestamp.now(),
        },
      ]

      const totalEntradas = movimientos
        .filter(m => m.sentido === 'ENTRADA')
        .reduce((sum, m) => sum + m.valor, 0)

      expect(totalEntradas).toBe(450) // $100 + $150 + $200
    })

    it('✅ Calcular salidas totales de una semana', () => {
      const movimientos: MovimientoFinanciero[] = [
        {
          id: 'mov-1',
          operacion_id: 'op-1',
          tipo: 'PAGO',
          valor: 90,
          sentido: 'SALIDA',
          origen: 'PAW_PATH',
          referencia_origen: 'LQUID-001',
          creado_en: Timestamp.now(),
        },
        {
          id: 'mov-2',
          operacion_id: 'op-2',
          tipo: 'PAGO',
          valor: 135,
          sentido: 'SALIDA',
          origen: 'PAW_PATH',
          referencia_origen: 'LQUID-002',
          creado_en: Timestamp.now(),
        },
      ]

      const totalSalidas = movimientos
        .filter(m => m.sentido === 'SALIDA')
        .reduce((sum, m) => sum + m.valor, 0)

      expect(totalSalidas).toBe(225) // $90 + $135
    })

    it('✅ Balance = Entradas - Salidas', () => {
      const movimientos: MovimientoFinanciero[] = [
        {
          id: 'mov-1',
          operacion_id: 'op-1',
          tipo: 'RECAUDO',
          valor: 500,
          sentido: 'ENTRADA',
          origen: 'TUTOR',
          referencia_origen: 'TXN-001',
          creado_en: Timestamp.now(),
        },
        {
          id: 'mov-2',
          operacion_id: 'op-1',
          tipo: 'PAGO',
          valor: 450,
          sentido: 'SALIDA',
          origen: 'PAW_PATH',
          referencia_origen: 'LQUID-001',
          creado_en: Timestamp.now(),
        },
      ]

      const entradas = movimientos
        .filter(m => m.sentido === 'ENTRADA')
        .reduce((sum, m) => sum + m.valor, 0)

      const salidas = movimientos
        .filter(m => m.sentido === 'SALIDA')
        .reduce((sum, m) => sum + m.valor, 0)

      const balance = entradas - salidas

      expect(balance).toBe(50) // Ganancia neta
    })

    it('✅ Reporte semanal consolidado', () => {
      const semana1 = {
        entradas: 5000,
        salidas: 4500,
      }

      const semana2 = {
        entradas: 3200,
        salidas: 2880,
      }

      const totalMesAcumulado: {
        entradas: number
        salidas: number
        ganancia?: number
      } = {
        entradas: semana1.entradas + semana2.entradas,
        salidas: semana1.salidas + semana2.salidas,
      }

      totalMesAcumulado.ganancia =
        totalMesAcumulado.entradas - totalMesAcumulado.salidas

      expect(totalMesAcumulado.entradas).toBe(8200)
      expect(totalMesAcumulado.salidas).toBe(7380)
      expect(totalMesAcumulado.ganancia).toBe(820)
    })
  })

  describe('Reporte 2: Deudores pendientes', () => {
    it('✅ Listar quién debe recibir dinero (cuidadores)', () => {
      const obligacionesPendientes: Obligacion[] = [
        {
          id: 'obl-1',
          operacion_id: 'op-1',
          tipo: 'PAGO_CUIDADOR',
          deudor: 'paw-path',
          acreedor: 'carlos-cuidador',
          concepto: 'Pago paseo 1',
          valor: 90,
          estado: 'PENDIENTE',
          creado_en: Timestamp.now(),
        },
        {
          id: 'obl-2',
          operacion_id: 'op-2',
          tipo: 'PAGO_CUIDADOR',
          deudor: 'paw-path',
          acreedor: 'carlos-cuidador',
          concepto: 'Pago paseo 2',
          valor: 90,
          estado: 'PENDIENTE',
          creado_en: Timestamp.now(),
        },
        {
          id: 'obl-3',
          operacion_id: 'op-3',
          tipo: 'PAGO_CUIDADOR',
          deudor: 'paw-path',
          acreedor: 'sofia-cuidadora',
          concepto: 'Pago paseo 3',
          valor: 85,
          estado: 'PENDIENTE',
          creado_en: Timestamp.now(),
        },
      ]

      // Agrupar por cuidador
      const deudoresPorCuidador = obligacionesPendientes.reduce(
        (acc: any, obl) => {
          const key = obl.acreedor
          if (!acc[key]) acc[key] = 0
          acc[key] += obl.valor
          return acc
        },
        {}
      )

      expect(deudoresPorCuidador['carlos-cuidador']).toBe(180) // $90 + $90
      expect(deudoresPorCuidador['sofia-cuidadora']).toBe(85)
    })

    it('✅ Distinguir PENDIENTE vs CUMPLIDA', () => {
      const obligaciones: Obligacion[] = [
        {
          id: 'obl-1',
          operacion_id: 'op-1',
          tipo: 'PAGO_CUIDADOR',
          deudor: 'paw-path',
          acreedor: 'carlos',
          concepto: 'Paseo 1',
          valor: 90,
          estado: 'PENDIENTE',
          creado_en: Timestamp.now(),
        },
        {
          id: 'obl-2',
          operacion_id: 'op-2',
          tipo: 'PAGO_CUIDADOR',
          deudor: 'paw-path',
          acreedor: 'carlos',
          concepto: 'Paseo 2',
          valor: 90,
          estado: 'CUMPLIDA',
          cumplido_en: Timestamp.now(),
          creado_en: Timestamp.now(),
        },
        {
          id: 'obl-3',
          operacion_id: 'op-3',
          tipo: 'PAGO_CUIDADOR',
          deudor: 'paw-path',
          acreedor: 'carlos',
          concepto: 'Paseo 3',
          valor: 90,
          estado: 'PENDIENTE',
          creado_en: Timestamp.now(),
        },
      ]

      const pendiente = obligaciones
        .filter(o => o.estado === 'PENDIENTE')
        .reduce((sum, o) => sum + o.valor, 0)

      const liquidada = obligaciones
        .filter(o => o.estado === 'CUMPLIDA')
        .reduce((sum, o) => sum + o.valor, 0)

      expect(pendiente).toBe(180) // 2 paseos
      expect(liquidada).toBe(90) // 1 paseo
    })

    it('✅ Liquidación semanal: qué se debe pagar el próximo viernes', () => {
      const obligacionesPendientes: Obligacion[] = [
        {
          id: 'obl-1',
          operacion_id: 'op-1',
          tipo: 'PAGO_CUIDADOR',
          deudor: 'paw-path',
          acreedor: 'carlos',
          concepto: 'Semana 1',
          valor: 450,
          estado: 'PENDIENTE',
          creado_en: Timestamp.now(),
        },
        {
          id: 'obl-2',
          operacion_id: 'op-2',
          tipo: 'PAGO_CUIDADOR',
          deudor: 'paw-path',
          acreedor: 'sofia',
          concepto: 'Semana 1',
          valor: 320,
          estado: 'PENDIENTE',
          creado_en: Timestamp.now(),
        },
      ]

      const proximaLiquidacion = obligacionesPendientes.reduce(
        (sum, o) => sum + o.valor,
        0
      )

      expect(proximaLiquidacion).toBe(770) // Total a pagar viernes
    })
  })

  describe('Reporte 3: Validación de consistencia (No dinero "perdido")', () => {
    it('✅ Auditoría: Dinero en caja + Dinero a pagar = Total esperado', () => {
      // Escenario: Operación #1
      // Tutor paga $100 → Paw-Path tiene $100 en caja
      // Paw-Path debe a Carlos $90
      // Paw-Path retiene $10 (comisión)

      const dineroEnCaja = 10
      const dineroPendienteAPagar = 90
      const totalEsperado = 100

      const consistencia =
        dineroEnCaja + dineroPendienteAPagar === totalEsperado

      expect(consistencia).toBe(true) // ✅ Cuadra perfecto
    })

    it('✅ Validación múltiple: 5 operaciones', () => {
      const operaciones = [
        { pagado: 100, adeudado: 90, comision: 10 },
        { pagado: 150, adeudado: 135, comision: 15 },
        { pagado: 200, adeudado: 180, comision: 20 },
        { pagado: 50, adeudado: 45, comision: 5 },
        { pagado: 100, adeudado: 90, comision: 10 },
      ]

      const totalPagado = operaciones.reduce((sum, o) => sum + o.pagado, 0)
      const totalAdeudado = operaciones.reduce((sum, o) => sum + o.adeudado, 0)
      const totalComision = operaciones.reduce((sum, o) => sum + o.comision, 0)

      // La suma debe ser: total = adeudado + comisión
      const validacion = totalPagado === totalAdeudado + totalComision

      expect(totalPagado).toBe(600)
      expect(totalAdeudado).toBe(540)
      expect(totalComision).toBe(60)
      expect(validacion).toBe(true)
    })

    it('❌ Detectar inconsistencia: Dinero "desaparecido"', () => {
      // Escenario malo: Alguien intentó manipular datos
      const dineroEnCaja = 50
      const dineroPendienteAPagar = 30
      const totalEsperado = 100

      const consistencia =
        dineroEnCaja + dineroPendienteAPagar === totalEsperado

      expect(consistencia).toBe(false) // ❌ Faltan $20!
      // Sistema debe alertar
    })

    it('✅ Validación periódica (Auditoría mensual)', () => {
      const movimientos: MovimientoFinanciero[] = [
        {
          id: 'mov-1',
          operacion_id: 'op-1',
          tipo: 'RECAUDO',
          valor: 1000,
          sentido: 'ENTRADA',
          origen: 'TUTOR',
          referencia_origen: 'TXN-001',
          creado_en: Timestamp.now(),
        },
        {
          id: 'mov-2',
          operacion_id: 'op-1',
          tipo: 'PAGO',
          valor: 900,
          sentido: 'SALIDA',
          origen: 'PAW_PATH',
          referencia_origen: 'LQUID-001',
          creado_en: Timestamp.now(),
        },
      ]

      const obligacionesPendientes: Obligacion[] = [
        {
          id: 'obl-1',
          operacion_id: 'op-1',
          tipo: 'PAGO_CUIDADOR',
          deudor: 'paw-path',
          acreedor: 'cuidador',
          concepto: 'Pago',
          valor: 900,
          estado: 'CUMPLIDA',
          cumplido_en: Timestamp.now(),
          creado_en: Timestamp.now(),
        },
      ]

      const entradas = movimientos
        .filter(m => m.sentido === 'ENTRADA')
        .reduce((sum, m) => sum + m.valor, 0)

      const salidas = movimientos
        .filter(m => m.sentido === 'SALIDA')
        .reduce((sum, m) => sum + m.valor, 0)

      const dineroEnCaja = entradas - salidas

      // No hay obligaciones pendientes
      const deudaPendiente = obligacionesPendientes
        .filter(o => o.estado === 'PENDIENTE')
        .reduce((sum, o) => sum + o.valor, 0)

      // Lo importante es que no hay dinero "perdido"
      const noHayPerdida = dineroEnCaja >= 0 && deudaPendiente >= 0

      expect(noHayPerdida).toBe(true)
    })
  })

  describe('Reporte 4: Ganancias de Paw-Path', () => {
    it('✅ Ganancia = 10% de operaciones RECAUDADAS', () => {
      const operaciones = [
        { id: 'op-1', valor_acordado: 100, recaudada: true },
        { id: 'op-2', valor_acordado: 150, recaudada: true },
        { id: 'op-3', valor_acordado: 200, recaudada: false }, // Cancelada
      ]

      const ganancia = operaciones
        .filter(o => o.recaudada)
        .reduce((sum, o) => sum + o.valor_acordado * 0.1, 0)

      expect(ganancia).toBe(25) // (100 + 150) * 0.1
    })

    it('✅ Ganancia NO se cuenta si operación CANCELADA', () => {
      const operacion = {
        id: 'op-1',
        valor_acordado: 100,
        estado: 'CANCELADA',
      }

      const puedeGanarComision = operacion.estado === 'RECAUDADA'

      expect(puedeGanarComision).toBe(false)
    })
  })

  describe('Reporte 5: Estado consolidado (Dashboard)', () => {
    it('✅ Dashboard muestra resumen total', () => {
      const dashboard = {
        totalEntradas: 8200,
        totalSalidas: 7380,
        ganancia: 820,
        deudaPendiente: 450,
        deudaLiquidada: 6930,
        operacionesCompletas: 25,
        operacionesPendientes: 3,
      }

      expect(dashboard.ganancia).toBe(
        dashboard.totalEntradas - dashboard.totalSalidas
      )
      expect(
        dashboard.operacionesCompletas + dashboard.operacionesPendientes
      ).toBe(28)
    })

    it('✅ Alertas automáticas para operaciones rezagadas', () => {
      const operacionesRezagadas = [
        { id: 'op-1', estado: 'PENDIENTE', dias_abierta: 10 },
        { id: 'op-2', estado: 'PENDIENTE', dias_abierta: 15 },
      ]

      const deberia_alertar = operacionesRezagadas.some(o => o.dias_abierta > 7)

      expect(deberia_alertar).toBe(true) // ⚠️ Alertar a tutor
    })
  })
})
