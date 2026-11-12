import { describe, expect, it } from 'vitest';
import { catalogo, niveles } from '../src/content';
import { evaluar } from '../src/engine/evaluar';
import { crearRegistro, fusionarRegistros, promedioCumplimiento, rachaActual, serieUltimosDias, xpDeLaSerie } from '../src/engine/historial';
import { fechaLocal, sumarDias, ultimosDias } from '../src/engine/util';
import type { Plan, RegistroDiario } from '../src/types';

const nivel = niveles[0];
const plan: Plan = {
  entreno: 'fuerza',
  comidas: {
    desayuno: ['leche', 'pan_integral', 'avena'],
    almuerzo: ['pechuga', 'lentejas', 'tofu', 'batata'],
    merienda: ['banana'],
    cena: ['huevos', 'garbanzos', 'arroz_integral', 'palta'],
  },
};
const ev = evaluar(nivel, plan, catalogo);

const reg = (fecha: string, extra: Partial<RegistroDiario> = {}): RegistroDiario => ({
  ...crearRegistro({ fecha, nivelId: 'n01', ev, xpGanada: 10, desafiosCompletados: [] }),
  ...extra,
});

describe('fechas locales', () => {
  it('fechaLocal usa los componentes locales, con ceros a la izquierda', () => {
    expect(fechaLocal(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05');
    expect(fechaLocal(new Date(2026, 10, 10, 0, 1))).toBe('2026-11-10');
  });

  it('sumarDias cruza meses y años', () => {
    expect(sumarDias('2026-11-10', 1)).toBe('2026-11-11');
    expect(sumarDias('2026-11-30', 1)).toBe('2026-12-01');
    expect(sumarDias('2026-01-01', -1)).toBe('2025-12-31');
    expect(sumarDias('2028-02-28', 1)).toBe('2028-02-29');
  });

  it('ultimosDias termina en la fecha dada y es ascendente', () => {
    expect(ultimosDias('2026-11-10', 3)).toEqual(['2026-11-08', '2026-11-09', '2026-11-10']);
    expect(ultimosDias('2026-03-02', 7)).toHaveLength(7);
    expect(ultimosDias('2026-03-02', 7)[0]).toBe('2026-02-24');
  });
});

describe('registro diario', () => {
  it('guarda totales, metas y el cumplimiento en % de cada macro y de las kcal', () => {
    const r = crearRegistro({ fecha: '2026-11-10', nivelId: 'n01', ev, xpGanada: 85.4, desafiosCompletados: ['a', 'a', 'b'] });
    expect(r.fecha).toBe('2026-11-10');
    expect(r.estrellas).toBe(3);
    expect(r.cumplimiento.p).toBe(Math.round(ev.macros.p.ratio * 100));
    expect(r.cumplimiento.kcal).toBe(Math.round(ev.completitud * 100));
    expect(r.metas.kcal).toBe(Math.round(ev.metas.kcal));
    expect(r.xpGanada).toBe(85);
    expect(r.desafiosCompletados).toEqual(['a', 'b']);
  });

  it('es JSON puro (se puede guardar en IndexedDB)', () => {
    const r = reg('2026-11-10');
    expect(JSON.parse(JSON.stringify(r))).toEqual(r);
  });

  it('fusionar: sin previo devuelve el nuevo', () => {
    const n = reg('2026-11-10');
    expect(fusionarRegistros(undefined, n)).toBe(n);
  });

  it('fusionar: gana el intento con más estrellas, suma XP y une desafíos', () => {
    const previo = reg('2026-11-10', { estrellas: 3, xpGanada: 60, desafiosCompletados: ['a'] });
    const peor = reg('2026-11-10', { estrellas: 1, xpGanada: 15, desafiosCompletados: ['b'], energiaFinal: 1 });
    const f = fusionarRegistros(previo, peor);
    expect(f.estrellas).toBe(3);
    expect(f.energiaFinal).toBe(previo.energiaFinal);
    expect(f.xpGanada).toBe(75);
    expect(f.desafiosCompletados).toEqual(['a', 'b']);
  });

  it('fusionar: a igualdad de estrellas gana el más reciente', () => {
    const previo = reg('2026-11-10', { estrellas: 2, energiaFinal: 10 });
    const nuevo = reg('2026-11-10', { estrellas: 2, energiaFinal: 90 });
    expect(fusionarRegistros(previo, nuevo).energiaFinal).toBe(90);
  });
});

describe('serie de los últimos días', () => {
  const registros = [reg('2026-11-08', { cumplimiento: { p: 80, c: 100, f: 90, kcal: 90 } }), reg('2026-11-10', { cumplimiento: { p: 100, c: 100, f: 110, kcal: 100 } })];

  it('rellena con null los días sin registro y respeta el orden', () => {
    const s = serieUltimosDias(registros, '2026-11-10', 7);
    expect(s).toHaveLength(7);
    expect(s.map((x) => x.fecha)[0]).toBe('2026-11-04');
    expect(s[6].registro?.fecha).toBe('2026-11-10');
    expect(s[5].registro).toBeNull();
    expect(s[4].registro?.fecha).toBe('2026-11-08');
  });

  it('deja afuera lo que queda fuera de la ventana', () => {
    const s = serieUltimosDias([reg('2026-10-01')], '2026-11-10', 7);
    expect(s.every((x) => x.registro === null)).toBe(true);
  });

  it('promedia solo los días jugados; sin ninguno devuelve null', () => {
    expect(promedioCumplimiento(serieUltimosDias(registros, '2026-11-10', 7))).toEqual({ p: 90, c: 100, f: 100, kcal: 95 });
    expect(promedioCumplimiento(serieUltimosDias([], '2026-11-10', 7))).toBeNull();
  });
});

describe('racha y XP de la semana', () => {
  const dias = (...fechas: string[]) => fechas.map((f) => reg(f));

  it('cuenta los días seguidos que terminan hoy', () => {
    expect(rachaActual(dias('2026-11-08', '2026-11-09', '2026-11-10'), '2026-11-10')).toBe(3);
    expect(rachaActual(dias('2026-11-10'), '2026-11-10')).toBe(1);
  });

  it('si hoy todavía no se jugó, la racha sigue viva desde ayer', () => {
    expect(rachaActual(dias('2026-11-08', '2026-11-09'), '2026-11-10')).toBe(2);
  });

  it('un día sin jugar la corta', () => {
    expect(rachaActual(dias('2026-11-07', '2026-11-09', '2026-11-10'), '2026-11-10')).toBe(2);
    expect(rachaActual(dias('2026-11-07', '2026-11-08'), '2026-11-10')).toBe(0);
    expect(rachaActual([], '2026-11-10')).toBe(0);
  });

  it('cruza el cambio de mes', () => {
    expect(rachaActual(dias('2026-10-31', '2026-11-01', '2026-11-02'), '2026-11-02')).toBe(3);
  });

  it('suma la XP de los días jugados de la serie', () => {
    const serie = serieUltimosDias([reg('2026-11-09', { xpGanada: 30 }), reg('2026-11-10', { xpGanada: 12 })], '2026-11-10', 7);
    expect(xpDeLaSerie(serie)).toBe(42);
    expect(xpDeLaSerie(serieUltimosDias([], '2026-11-10', 7))).toBe(0);
  });
});
