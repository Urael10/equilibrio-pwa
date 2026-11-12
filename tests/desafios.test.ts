import { describe, expect, it } from 'vitest';
import { catalogo, niveles, plantillasDesafios } from '../src/content';
import {
  acreditar, elegirDesafios, etiquetaProgreso, evaluarDesafios, fraccionProgreso, hashFecha, mulberry32, valorMetrica,
} from '../src/engine/desafios';
import { evaluar } from '../src/engine/evaluar';
import { colocarAuto, planVacio } from '../src/engine/plan';
import { resolver } from '../src/engine/solver';
import type { Plan } from '../src/types';

const nivel = niveles[0];
const r = catalogo.reglas;

const planFuerza: Plan = {
  entreno: 'fuerza',
  comidas: {
    desayuno: ['leche', 'pan_integral', 'avena'],
    almuerzo: ['pechuga', 'lentejas', 'tofu', 'batata'],
    merienda: ['banana'],
    cena: ['huevos', 'garbanzos', 'arroz_integral', 'palta'],
  },
};
const evFuerza = evaluar(nivel, planFuerza, catalogo);
const evVacio = evaluar(nivel, planVacio(nivel), catalogo);

describe('selección determinista por fecha', () => {
  it('hashFecha y mulberry32 son estables', () => {
    expect(hashFecha('2026-11-10')).toBe(hashFecha('2026-11-10'));
    expect(hashFecha('2026-11-10')).not.toBe(hashFecha('2026-11-11'));
    const a = mulberry32(42);
    const b = mulberry32(42);
    for (let i = 0; i < 5; i++) expect(a()).toBe(b());
    const v = mulberry32(7)();
    expect(v).toBeGreaterThanOrEqual(0);
    expect(v).toBeLessThan(1);
  });

  it('la misma fecha da siempre los mismos desafíos, uno por tipo', () => {
    const a = elegirDesafios('2026-11-10', plantillasDesafios);
    expect(elegirDesafios('2026-11-10', plantillasDesafios)).toEqual(a);
    expect(a).toHaveLength(3);
    expect(a.map((id) => plantillasDesafios.find((p) => p.id === id)!.tipo)).toEqual(['macro', 'entrenamiento', 'habito']);
  });

  it('a lo largo de un mes los días varían y se usan todas las plantillas', () => {
    const usadas = new Set<string>();
    const combos = new Set<string>();
    for (let d = 1; d <= 30; d++) {
      const ids = elegirDesafios(`2026-11-${String(d).padStart(2, '0')}`, plantillasDesafios);
      ids.forEach((id) => usadas.add(id));
      combos.add(ids.join());
    }
    expect(combos.size).toBeGreaterThan(3);
    expect(usadas.size).toBe(plantillasDesafios.length);
  });

  it('sin plantillas de un tipo, lo omite sin romper', () => {
    const soloMacros = plantillasDesafios.filter((p) => p.tipo === 'macro');
    expect(elegirDesafios('2026-11-10', soloMacros)).toHaveLength(1);
    expect(elegirDesafios('2026-11-10', [])).toEqual([]);
  });
});

describe('métricas', () => {
  it('salen de la evaluación del plan', () => {
    expect(valorMetrica('proteina_g', evFuerza, r)).toBe(evFuerza.totales.p);
    expect(valorMetrica('fibra_g', evFuerza, r)).toBe(evFuerza.totales.fibra);
    expect(valorMetrica('macros_cerrados', evFuerza, r)).toBe(3);
    expect(valorMetrica('estrellas', evFuerza, r)).toBe(3);
    expect(valorMetrica('movimiento', evFuerza, r)).toBe(1);
    expect(valorMetrica('timing', evFuerza, r)).toBe(1);
    expect(valorMetrica('comidas_con_proteina', evFuerza, r)).toBeGreaterThanOrEqual(3);
    expect(valorMetrica('kcal_pct', evFuerza, r)).toBe(Math.round(evFuerza.completitud * 100));
  });

  it('timing es 0 si el entreno no lo exige y energia_activa es 0 sin movimiento', () => {
    const yoga = evaluar(nivel, { ...planFuerza, entreno: 'yoga' }, catalogo);
    expect(valorMetrica('timing', yoga, r)).toBe(0);
    const descanso = evaluar(nivel, { ...planFuerza, entreno: 'descanso' }, catalogo);
    expect(valorMetrica('energia_activa', descanso, r)).toBe(0);
    expect(valorMetrica('energia_activa', yoga, r)).toBe(yoga.energia.final);
  });

  it('macros_precisos cuenta los macros a ±5 % (borde inclusivo)', () => {
    const falso = (ratios: [number, number, number]) => ({
      ...evFuerza,
      macros: {
        p: { ...evFuerza.macros.p, meta: 100, ratio: ratios[0] },
        c: { ...evFuerza.macros.c, meta: 100, ratio: ratios[1] },
        f: { ...evFuerza.macros.f, meta: 100, ratio: ratios[2] },
      },
    });
    expect(valorMetrica('macros_precisos', falso([1.05, 0.95, 1.06]), r)).toBe(2);
    expect(valorMetrica('macros_precisos', falso([1, 1, 1]), r)).toBe(3);
    expect(valorMetrica('macros_precisos', falso([1.2, 0.8, 1.06]), r)).toBe(0);
  });
});

describe('evaluar y acreditar', () => {
  const ids = plantillasDesafios.map((p) => p.id);

  it('con el plan 3★ completa los desafíos que no piden más que eso', () => {
    const vista = evaluarDesafios(['macros_cerrados', 'timing_entreno', 'proteina_repartida'], plantillasDesafios, evFuerza, r);
    expect(vista.every((d) => d.completado)).toBe(true);
    expect(vista[0]).toMatchObject({ id: 'macros_cerrados', tipo: 'macro', objetivoCantidad: 3, xpRecompensa: 25, acreditado: false });
  });

  it('con el plan vacío no se completa nada, aunque la métrica ya valga (p. ej. movimiento)', () => {
    const conYoga = evaluar(nivel, { ...planVacio(nivel), entreno: 'yoga' }, catalogo);
    expect(valorMetrica('movimiento', conYoga, r)).toBe(1);
    expect(evaluarDesafios(ids, plantillasDesafios, conYoga, r).some((d) => d.completado)).toBe(false);
    expect(evaluarDesafios(ids, plantillasDesafios, evVacio, r).some((d) => d.completado)).toBe(false);
  });

  it('ignora ids que ya no existen en el contenido', () => {
    expect(evaluarDesafios(['no_existe', 'a_moverse'], plantillasDesafios, evFuerza, r)).toHaveLength(1);
  });

  it('marca como acreditados los que ya pagaron', () => {
    const vista = evaluarDesafios(['a_moverse'], plantillasDesafios, evFuerza, r, ['a_moverse']);
    expect(vista[0].acreditado).toBe(true);
  });

  it('acreditar paga una sola vez: es idempotente', () => {
    const vista = evaluarDesafios(['macros_cerrados', 'a_moverse'], plantillasDesafios, evFuerza, r);
    const primera = acreditar(vista, []);
    expect(primera.xp).toBe(25 + 10);
    expect(primera.nuevos.map((d) => d.id)).toEqual(['macros_cerrados', 'a_moverse']);
    const segunda = acreditar(vista, primera.acreditados);
    expect(segunda.xp).toBe(0);
    expect(segunda.nuevos).toEqual([]);
    expect(segunda.acreditados).toEqual(primera.acreditados);
  });

  it('acreditar no paga los incompletos y sí los que se completan después', () => {
    const parcial = evaluarDesafios(['macros_cerrados', 'a_moverse'], plantillasDesafios, evVacio, r);
    expect(acreditar(parcial, []).xp).toBe(0);
    const completo = evaluarDesafios(['macros_cerrados', 'a_moverse'], plantillasDesafios, evFuerza, r, ['a_moverse']);
    expect(acreditar(completo, ['a_moverse']).xp).toBe(25);
  });
});

describe('etiquetas de progreso', () => {
  it('cada métrica lleva su unidad', () => {
    expect(etiquetaProgreso('proteina_g', 62.4, 90)).toBe('62 / 90 g');
    expect(etiquetaProgreso('fibra_g', 12, 25)).toBe('12 / 25 g');
    expect(etiquetaProgreso('kcal_pct', 75, 90)).toBe('75 / 90 %');
    expect(etiquetaProgreso('macros_cerrados', 2, 3)).toBe('2 / 3 macros');
    expect(etiquetaProgreso('macros_precisos', 0, 2)).toBe('0 / 2 macros');
    expect(etiquetaProgreso('comidas_con_proteina', 1, 3)).toBe('1 / 3 comidas');
    expect(etiquetaProgreso('energia_activa', 37, 50)).toBe('37 / 50 de energía');
    expect(etiquetaProgreso('estrellas', 1, 3)).toBe('1 / 3 ★');
  });

  it('movimiento y timing son Listo / Pendiente', () => {
    expect(etiquetaProgreso('movimiento', 0, 1)).toBe('Pendiente');
    expect(etiquetaProgreso('movimiento', 1, 1)).toBe('Listo');
    expect(etiquetaProgreso('timing', 1, 1)).toBe('Listo');
  });

  it('un valor muy por encima del objetivo no desborda la etiqueta', () => {
    expect(etiquetaProgreso('proteina_g', 5000, 90)).toBe('900 / 90 g');
  });

  it('la fracción de la barra va de 0 a 1', () => {
    expect(fraccionProgreso(0, 90)).toBe(0);
    expect(fraccionProgreso(45, 90)).toBe(0.5);
    expect(fraccionProgreso(200, 90)).toBe(1);
    expect(fraccionProgreso(-3, 90)).toBe(0);
    expect(fraccionProgreso(5, 0)).toBe(0);
  });

  it('la vista de cada desafío trae su métrica', () => {
    const vista = evaluarDesafios(['fibra_dia'], plantillasDesafios, evFuerza, r);
    expect(vista[0].metrica).toBe('fibra_g');
  });
});

describe('alcanzabilidad en el nivel 1', () => {
  const cumple = (p: (typeof plantillasDesafios)[number], plan: Plan) =>
    valorMetrica(p.metrica, evaluar(nivel, plan, catalogo), r) >= p.objetivo;

  /**
   * Busca un plan válido que cumpla la plantilla: primero entre las soluciones de 3★ del solucionador (ya traen
   * comidas bien repartidas) y, si no alcanza, armando planes con la colocación automática.
   */
  function buscarPlan(plantillaId: string): Plan | null {
    const p = plantillasDesafios.find((x) => x.id === plantillaId)!;
    for (const sol of resolver(nivel, catalogo)) {
      if (sol.plan && cumple(p, sol.plan)) return sol.plan;
    }
    const mano = nivel.mano;
    for (let mask = 1; mask < 1 << mano.length; mask++) {
      const elegidos = mano.filter((_, i) => mask & (1 << i));
      if (elegidos.length > 14) continue;
      for (const entreno of nivel.entrenamientos) {
        let plan: Plan = { ...planVacio(nivel), entreno };
        let valido = true;
        for (const id of elegidos) {
          const res = colocarAuto(nivel, plan, id, null, catalogo);
          if (!res.ok) { valido = false; break; }
          plan = res.plan;
        }
        if (!valido) continue;
        if (cumple(p, plan)) return plan;
      }
    }
    return null;
  }

  for (const p of plantillasDesafios) {
    it(`«${p.titulo}» se puede cumplir con un plan válido`, () => {
      const plan = buscarPlan(p.id);
      expect(plan, p.id).not.toBeNull();
      const vista = evaluarDesafios([p.id], plantillasDesafios, evaluar(nivel, plan!, catalogo), r);
      expect(vista[0].completado).toBe(true);
    });
  }
});
