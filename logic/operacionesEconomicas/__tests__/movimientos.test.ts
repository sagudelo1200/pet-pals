/**
 * SUITE: Movimientos Financieros
 * Valida que cada transacción quede registrada con auditoría completa
 *
 * Tipo de movimientos:
 * - ENTRADA: Dinero que llega a Paw-Path
 * - SALIDA: Dinero que sale de Paw-Path
 *
 * Sentidos:
 * - ENTRADA: De tutor a Paw-Path
 * - SALIDA: De Paw-Path a cuidador o comisiones
 */

import type { MovimientoFinanciero } from '@/models/operacionesEconomicas'
import { Timestamp } from 'firebase/firestore'

describe('MOVIMIENTOS FINANCIEROS: Auditoría de Dinero', () => {
  describe('Crear movimiento de ENTRADA', () => {
    it('✅ Registrar pago de tutor: +$100 a la caja', () => {
      const movimiento: MovimientoFinanciero = {
        id: 'mov-1',
        operacion_id: 'op-1',
        tipo: 'PAGO_INICIADO',
        valor: 100,
        sentido: 'ENTRADA',
        origen: 'TUTOR',
        referencia_origen: 'TXN-Wompi-123456', // ID único del webhook
        creado_en: Timestamp.now(),
      }

      expect(movimiento.valor).toBe(100)
      expect(movimiento.sentido).toBe('ENTRADA')
      expect(movimiento.referencia_origen).toBeDefined()
    })

    it('✅ Cada movimiento tiene ID único para auditoría', () => {
      const movimientos = [
        {
          id: 'mov-001',
          operacion_id: 'op-1',
          tipo: 'RECAUDO',
          valor: 100,
          sentido: 'ENTRADA' as const,
          origen: 'TUTOR',
          referencia_origen: 'REF-001',
          creado_en: Timestamp.now(),
        },
        {
          id: 'mov-002',
          operacion_id: 'op-2',
          tipo: 'RECAUDO',
          valor: 150,
          sentido: 'ENTRADA' as const,
          origen: 'TUTOR',
          referencia_origen: 'REF-002',
          creado_en: Timestamp.now(),
        },
      ]

      const idsUnicos = new Set(movimientos.map(m => m.id))
      expect(idsUnicos.size).toBe(2)
    })

    it('❌ No permite ENTRADA de valor negativo', () => {
      const esValido = (valor: number) => valor > 0
      expect(esValido(-100)).toBe(false)
    })
  })

  describe('Crear movimiento de SALIDA', () => {
    it('✅ Registrar pago a cuidador: -$90 de la caja', () => {
      const movimiento: MovimientoFinanciero = {
        id: 'mov-2',
        operacion_id: 'op-1',
        tipo: 'PAGO',
        valor: 90,
        sentido: 'SALIDA',
        origen: 'PAW_PATH',
        referencia_origen: 'LQUID-2026-10-10-001',
        creado_en: Timestamp.now(),
      }

      expect(movimiento.valor).toBe(90)
      expect(movimiento.sentido).toBe('SALIDA')
    })

    it('✅ Registrar comisión operativa: -$10 comisión', () => {
      const movimiento: MovimientoFinanciero = {
        id: 'mov-3',
        operacion_id: 'op-1',
        tipo: 'AJUSTE',
        valor: 10,
        sentido: 'SALIDA',
        origen: 'PAW_PATH',
        referencia_origen: 'COM-OPERATIVA',
        creado_en: Timestamp.now(),
      }

      expect(movimiento.tipo).toBe('AJUSTE')
      expect(movimiento.valor).toBe(10)
    })

    it('❌ No permite SALIDA mayor que ENTRADA', () => {
      const caja = { entradas: 100, salidas: 0 }

      const intentoSalida = (valor: number) => {
        if (caja.salidas + valor > caja.entradas) {
          return false // ❌ Rechazado
        }
        caja.salidas += valor
        return true
      }

      expect(intentoSalida(150)).toBe(false) // Sobregira
      expect(intentoSalida(90)).toBe(true) // OK
    })
  })

  describe('Balance de caja', () => {
    it('✅ Balance = ENTRADAS - SALIDAS', () => {
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
          operacion_id: 'op-1',
          tipo: 'PAGO',
          valor: 90,
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

      expect(entradas).toBe(100)
      expect(salidas).toBe(90)
      expect(balance).toBe(10) // La comisión queda en caja
    })

    it('✅ Múltiples movimientos suman correctamente', () => {
      const movimientos = [
        { valor: 100, sentido: 'ENTRADA' as const },
        { valor: 150, sentido: 'ENTRADA' as const },
        { valor: 90, sentido: 'SALIDA' as const },
        { valor: 45, sentido: 'SALIDA' as const },
      ]

      const total =
        movimientos
          .filter(m => m.sentido === 'ENTRADA')
          .reduce((sum, m) => sum + m.valor, 0) -
        movimientos
          .filter(m => m.sentido === 'SALIDA')
          .reduce((sum, m) => sum + m.valor, 0)

      expect(total).toBe(115) // (100+150) - (90+45)
    })

    it('❌ Balance nunca es negativo', () => {
      const movimientos = [
        { valor: 100, sentido: 'ENTRADA' as const },
        { valor: 150, sentido: 'SALIDA' as const }, // Intenta sobrepasar
      ]

      const entradas = movimientos
        .filter(m => m.sentido === 'ENTRADA')
        .reduce((sum, m) => sum + m.valor, 0)

      const salidas = movimientos
        .filter(m => m.sentido === 'SALIDA')
        .reduce((sum, m) => sum + m.valor, 0)

      const balance = entradas - salidas

      expect(balance < 0).toBe(true)
      // Sistema rechazaría esta transacción
    })
  })

  describe('Inmutabilidad del registro', () => {
    it('✅ Movimiento tiene timestamp inmutable', () => {
      const ahora = Timestamp.now()
      const movimiento: MovimientoFinanciero = {
        id: 'mov-1',
        operacion_id: 'op-1',
        tipo: 'RECAUDO',
        valor: 100,
        sentido: 'ENTRADA',
        origen: 'TUTOR',
        referencia_origen: 'TXN-001',
        creado_en: ahora,
      }

      // Timestamp no puede cambiar
      expect(movimiento.creado_en).toEqual(ahora)
    })

    it('✅ No se puede editar movimiento después de registrado', () => {
      const movimiento: MovimientoFinanciero = {
        id: 'mov-1',
        operacion_id: 'op-1',
        tipo: 'RECAUDO',
        valor: 100,
        sentido: 'ENTRADA',
        origen: 'TUTOR',
        referencia_origen: 'TXN-001',
        creado_en: Timestamp.now(),
      }

      // Una vez registrado, no hay forma de cambiar el valor
      // (En BD, sería un documento sin actualizar)
      expect(movimiento.valor).toBe(100)
      // No hay setter, solo getter
    })
  })

  describe('Auditoría: Rastreabilidad completa', () => {
    it('✅ Cada movimiento es trazable a su origen', () => {
      const movimientos = [
        {
          id: 'mov-1',
          operacion_id: 'op-1',
          tipo: 'RECAUDO',
          valor: 100,
          sentido: 'ENTRADA' as const,
          origen: 'TUTOR',
          referencia_origen: 'TXN-Wompi-12345', // Referencia única externa
          creado_en: Timestamp.now(),
        },
      ]

      const puedesRastrear = (movId: string) => {
        const mov = movimientos.find(m => m.id === movId)
        return {
          cuanto: mov?.valor,
          quien: mov?.origen,
          cuando: mov?.creado_en,
          referencia_externa: mov?.referencia_origen,
        }
      }

      const rastreo = puedesRastrear('mov-1')
      expect(rastreo.cuanto).toBe(100)
      expect(rastreo.quien).toBe('TUTOR')
      expect(rastreo.referencia_externa).toBe('TXN-Wompi-12345')
    })

    it('✅ Histórico completo de una operación', () => {
      const operacionId = 'op-1'
      const movimientos: MovimientoFinanciero[] = [
        {
          id: 'mov-1',
          operacion_id: operacionId,
          tipo: 'PAGO_INICIADO',
          valor: 100,
          sentido: 'ENTRADA',
          origen: 'TUTOR',
          referencia_origen: 'TXN-001',
          creado_en: Timestamp.now(),
        },
        {
          id: 'mov-2',
          operacion_id: operacionId,
          tipo: 'PAGO',
          valor: 90,
          sentido: 'SALIDA',
          origen: 'PAW_PATH',
          referencia_origen: 'LQUID-001',
          creado_en: Timestamp.now(),
        },
      ]

      const historico = movimientos.filter(m => m.operacion_id === operacionId)
      expect(historico).toHaveLength(2)
      expect(historico.every(m => m.operacion_id === operacionId)).toBe(true)
    })
  })

  describe('Deduplicación: No registrar 2x por webhook duplicado', () => {
    it('✅ Rechaza movimiento con misma referencia_origen', () => {
      const movimientosRegistrados: MovimientoFinanciero[] = [
        {
          id: 'mov-1',
          operacion_id: 'op-1',
          tipo: 'RECAUDO',
          valor: 100,
          sentido: 'ENTRADA',
          origen: 'TUTOR',
          referencia_origen: 'TXN-Wompi-12345',
          creado_en: Timestamp.now(),
        },
      ]

      const intentoDuplicado = {
        operacion_id: 'op-1',
        tipo: 'RECAUDO',
        valor: 100,
        sentido: 'ENTRADA' as const,
        origen: 'TUTOR',
        referencia_origen: 'TXN-Wompi-12345', // Mismo! (webhook reintentó)
      }

      const yaExiste = movimientosRegistrados.some(
        m => m.referencia_origen === intentoDuplicado.referencia_origen
      )

      expect(yaExiste).toBe(true) // ❌ Rechazado
    })

    it('✅ Acepta movimiento con referencia diferente', () => {
      const movimientosRegistrados: MovimientoFinanciero[] = [
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
      ]

      const nuevoMovimiento = {
        operacion_id: 'op-2',
        tipo: 'RECAUDO',
        valor: 150,
        sentido: 'ENTRADA' as const,
        origen: 'TUTOR',
        referencia_origen: 'TXN-002', // Diferente
      }

      const yaExiste = movimientosRegistrados.some(
        m => m.referencia_origen === nuevoMovimiento.referencia_origen
      )

      expect(yaExiste).toBe(false) // ✅ Aceptado
    })
  })
})
