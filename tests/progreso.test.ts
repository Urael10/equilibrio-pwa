import { describe, expect, it } from 'vitest';
import { catalogo, contenidoMascota } from '../src/content';
import { insigniasPorEtapa, NIVEL_MAX, nivelPara, progresoNivel, xpLibro, xpParaNivel, xpPorMejora } from '../src/engine/progreso';

const r = catalogo.reglas;

describe('niveles de XP', () => {
  it('umbrales acumulados ⌊100·(n−1)^1.5⌋', () => {
    expect(xpParaNivel(1)).toBe(0);
    expect(xpParaNivel(2)).toBe(100);
    expect(xpParaNivel(3)).toBe(282);
    expect(xpParaNivel(4)).toBe(519);
    expect(xpParaNivel(5)).toBe(800);
    expect(xpParaNivel(6)).toBe(1118);
    expect(xpParaNivel(10)).toBe(2700);
    expect(xpParaNivel(15)).toBe(5238);
  });

  it('los umbrales son estrictamente crecientes', () => {
    for (let n = 2; n <= NIVEL_MAX; n++) expect(xpParaNivel(n)).toBeGreaterThan(xpParaNivel(n - 1));
  });

  it('nivelPara respeta los bordes (inclusivos) y el máximo', () => {
    expect(nivelPara(0)).toBe(1);
    expect(nivelPara(99)).toBe(1);
    expect(nivelPara(100)).toBe(2);
    expect(nivelPara(281)).toBe(2);
    expect(nivelPara(282)).toBe(3);
    expect(nivelPara(1e9)).toBe(NIVEL_MAX);
    expect(nivelPara(-5)).toBe(1);
  });

  it('progresoNivel da el avance dentro del nivel', () => {
    const a = progresoNivel(0);
    expect(a).toMatchObject({ nivel: 1, xpDesde: 0, xpHasta: 100, pct: 0 });
    expect(progresoNivel(50).pct).toBeCloseTo(0.5, 10);
    const b = progresoNivel(100);
    expect(b).toMatchObject({ nivel: 2, xpDesde: 100, xpHasta: 282, pct: 0 });
    const max = progresoNivel(1e9);
    expect(max.xpHasta).toBeNull();
    expect(max.pct).toBe(1);
  });
});

describe('libro de XP unificado', () => {
  it('suma estrellas (mejor por nivel) y XP de desafíos', () => {
    expect(xpLibro({ mejor: { n01: 3 }, xpDesafios: 0 }, r)).toBe(60);
    expect(xpLibro({ mejor: { n01: 3 }, xpDesafios: 45 }, r)).toBe(105);
    expect(xpLibro({ mejor: {}, xpDesafios: 30 }, r)).toBe(30);
  });

  it('ignora una XP de desafíos negativa (dato corrupto)', () => {
    expect(xpLibro({ mejor: { n01: 1 }, xpDesafios: -50 }, r)).toBe(20);
  });

  it('xpPorMejora paga solo la diferencia y nunca es negativa', () => {
    expect(xpPorMejora(0, 3, r)).toBe(60);
    expect(xpPorMejora(1, 2, r)).toBe(20);
    expect(xpPorMejora(3, 3, r)).toBe(0);
    expect(xpPorMejora(3, 1, r)).toBe(0);
    expect(xpPorMejora(0, 99, r)).toBe(60);
  });

  it('con solo el nivel 1 las estrellas no alcanzan para nivel 2: hacen falta los desafíos', () => {
    expect(nivelPara(xpLibro({ mejor: { n01: 3 }, xpDesafios: 0 }, r))).toBe(1);
    expect(nivelPara(xpLibro({ mejor: { n01: 3 }, xpDesafios: 40 }, r))).toBe(2);
  });
});

describe('insignias por etapa', () => {
  const etapas = contenidoMascota.etapas;

  it('al empezar solo está lograda la primera y es la actual', () => {
    const i = insigniasPorEtapa(0, etapas);
    expect(i.map((x) => x.alcanzada)).toEqual([true, false, false]);
    expect(i.map((x) => x.actual)).toEqual([true, false, false]);
    expect(i[1].faltan).toBe(etapas[1].xpMin);
  });

  it('en el borde de una etapa ya cuenta (inclusivo) y pasa a ser la actual', () => {
    const i = insigniasPorEtapa(etapas[1].xpMin, etapas);
    expect(i.map((x) => x.alcanzada)).toEqual([true, true, false]);
    expect(i.map((x) => x.actual)).toEqual([false, true, false]);
    expect(i[2].faltan).toBe(etapas[2].xpMin - etapas[1].xpMin);
  });

  it('con mucha XP están todas y la actual es la última', () => {
    const i = insigniasPorEtapa(1e6, etapas);
    expect(i.every((x) => x.alcanzada && x.faltan === 0)).toBe(true);
    expect(i.filter((x) => x.actual).map((x) => x.etapa.id)).toEqual([etapas[etapas.length - 1].id]);
  });
});
