import { describe, expect, it } from 'vitest';
import { banda, DIM_SEMANA as D, trazo, xDe, Y_MAX, yDe } from '../src/engine/grafico';
import type { PuntoSerie, RegistroDiario } from '../src/types';
import { letraDia, nombreDia, numeroDia } from '../src/engine/util';

const reg = (fecha: string, cum: Partial<RegistroDiario['cumplimiento']> = {}): RegistroDiario => ({
  fecha,
  nivelId: 'n01',
  estrellas: 2,
  totales: { p: 100, c: 230, f: 60, kcal: 1360, fibra: 25 },
  metas: { p: 100, c: 230, f: 60, kcal: 1360 },
  cumplimiento: { p: 100, c: 100, f: 100, kcal: 100, ...cum },
  energiaFinal: 50,
  xpGanada: 10,
  desafiosCompletados: [],
});
const serie = (valores: (number | null)[]): PuntoSerie[] =>
  valores.map((v, i) => ({ fecha: `2026-11-0${i + 1}`, registro: v === null ? null : reg(`2026-11-0${i + 1}`, { p: v }) }));

describe('geometría del gráfico', () => {
  it('el eje X reparte los días parejo entre los márgenes', () => {
    expect(xDe(0, 7, D)).toBe(D.izq);
    expect(xDe(6, 7, D)).toBe(D.ancho - D.der);
    expect(xDe(3, 7, D)).toBeCloseTo((D.izq + D.ancho - D.der) / 2, 1);
    expect(xDe(0, 1, D)).toBeCloseTo((D.izq + D.ancho - D.der) / 2, 1);
  });

  it('el eje Y va de 0 (abajo) a Y_MAX (arriba) y recorta lo que se sale', () => {
    expect(yDe(0, D)).toBe(D.alto - D.abajo);
    expect(yDe(Y_MAX, D)).toBe(D.arr);
    expect(yDe(999, D)).toBe(D.arr);
    expect(yDe(-20, D)).toBe(D.alto - D.abajo);
    expect(yDe(100, D)).toBeLessThan(yDe(50, D));
  });

  it('la banda 85–115 % queda entre esas alturas', () => {
    const b = banda(0.85, 1.15, D);
    expect(b.y).toBe(yDe(115, D));
    expect(b.y + b.alto).toBeCloseTo(yDe(85, D), 1);
    expect(b.alto).toBeGreaterThan(0);
  });
});

describe('trazos', () => {
  it('une los días seguidos en un solo camino', () => {
    const t = trazo(serie([90, 100, 110, null, null, null, null]), 'p', D);
    expect(t.puntos).toHaveLength(3);
    expect(t.caminos).toHaveLength(1);
    expect(t.caminos[0].startsWith('M')).toBe(true);
    expect(t.caminos[0].match(/L/g)).toHaveLength(2);
  });

  it('un día sin jugar corta la línea en dos tramos', () => {
    const t = trazo(serie([90, 100, null, 80, 85, null, null]), 'p', D);
    expect(t.caminos).toHaveLength(2);
    expect(t.puntos).toHaveLength(4);
  });

  it('un día suelto es un punto sin camino', () => {
    const t = trazo(serie([null, 100, null, null, null, null, null]), 'p', D);
    expect(t.puntos).toHaveLength(1);
    expect(t.caminos).toEqual([]);
  });

  it('sin días jugados no dibuja nada', () => {
    const t = trazo(serie([null, null, null, null, null, null, null]), 'p', D);
    expect(t.puntos).toEqual([]);
    expect(t.caminos).toEqual([]);
  });

  it('guarda el valor real aunque el dibujo se recorte', () => {
    const t = trazo(serie([400, null, null, null, null, null, null]), 'p', D);
    expect(t.puntos[0].valor).toBe(400);
    expect(t.puntos[0].y).toBe(D.arr);
  });

  it('cada clave lee su propio cumplimiento', () => {
    const s: PuntoSerie[] = [{ fecha: '2026-11-01', registro: reg('2026-11-01', { p: 50, c: 100, f: 150, kcal: 75 }) }];
    expect(trazo(s, 'p', D).puntos[0].valor).toBe(50);
    expect(trazo(s, 'c', D).puntos[0].valor).toBe(100);
    expect(trazo(s, 'f', D).puntos[0].valor).toBe(150);
    expect(trazo(s, 'kcal', D).puntos[0].valor).toBe(75);
  });
});

describe('etiquetas de día', () => {
  it('letra, nombre y número (10/11/2026 es martes)', () => {
    expect(letraDia('2026-11-10')).toBe('M');
    expect(nombreDia('2026-11-10')).toBe('martes');
    expect(letraDia('2026-11-11')).toBe('X'); // miércoles, para no confundirlo con el martes
    expect(nombreDia('2026-11-15')).toBe('domingo');
    expect(numeroDia('2026-11-07')).toBe(7);
  });
});
