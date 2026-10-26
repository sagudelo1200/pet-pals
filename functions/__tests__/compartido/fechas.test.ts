import {sumarMesesCalendario} from '../../src/compartido/fechas';

const iso = (d: Date) => d.toISOString().slice(0, 10);

describe('sumarMesesCalendario', () => {
  test('31 de enero + 1 mes = fin de febrero, no marzo', () => {
    expect(iso(sumarMesesCalendario(new Date('2026-01-31T00:00:00Z'), 1))).toBe('2026-02-28');
    expect(iso(sumarMesesCalendario(new Date('2028-01-31T00:00:00Z'), 1))).toBe('2028-02-29');
  });

  test('cruza el año', () => {
    expect(iso(sumarMesesCalendario(new Date('2026-11-15T00:00:00Z'), 3))).toBe('2027-02-15');
    expect(iso(sumarMesesCalendario(new Date('2026-01-31T00:00:00Z'), 12))).toBe('2027-01-31');
  });

  test('no modifica la fecha original', () => {
    const original = new Date('2026-05-10T00:00:00Z');
    sumarMesesCalendario(original, 6);
    expect(iso(original)).toBe('2026-05-10');
  });
});
