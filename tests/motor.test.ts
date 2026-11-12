import { describe, expect, it } from 'vitest';
import { catalogo, contenidoMascota, niveles } from '../src/content';
import {
  energiaBase, estadoDeRatio, evaluar, kcalDe, metasDelDia, puntajeAgua, puntajeCalma, puntajeDeRatio, puntajeSueno,
} from '../src/engine/evaluar';
import { explicarCierre, pistaPara } from '../src/engine/explicar';
import { desbloqueados, etapaPara, nuevosCompaneros, progresoEtapa, reglasCumplidas, sumarLogros, xpTotal } from '../src/engine/mascota';
import {
  agregar, colocarAuto, comidasCompatibles, disponibles, elegirEntreno, planVacio, porcionesColocadas, quitar, sanearPlan, validarPlan,
} from '../src/engine/plan';
import { resolver, resumen } from '../src/engine/solver';
import { interpolar } from '../src/engine/util';
import type { Plan } from '../src/types';

const nivel = niveles[0];
const r = catalogo.reglas;

/** Plan de referencia con 3★ (Fuerza): lo valida el solucionador más abajo. */
const planFuerza: Plan = {
  entreno: 'fuerza',
  comidas: {
    desayuno: ['leche', 'pan_integral', 'avena'],
    almuerzo: ['pechuga', 'lentejas', 'tofu', 'batata'],
    merienda: ['banana'],
    cena: ['huevos', 'garbanzos', 'arroz_integral', 'palta'],
  },
};

describe('fórmulas base', () => {
  it('kcal por Atwater (4/4/9)', () => {
    expect(kcalDe({ p: 10, c: 10, f: 10 })).toBe(170);
  });

  it('puntajes de hábitos acotados 0..1', () => {
    expect(puntajeSueno(3, r)).toBe(0);
    expect(puntajeSueno(4, r)).toBe(0);
    expect(puntajeSueno(5.5, r)).toBeCloseTo(0.5, 10);
    expect(puntajeSueno(9, r)).toBe(1);
    expect(puntajeAgua(1, r)).toBeCloseTo(0.5, 10);
    expect(puntajeAgua(5, r)).toBe(1);
    expect(puntajeCalma(1)).toBe(0);
    expect(puntajeCalma(5)).toBe(1);
  });

  it('energía base del nivel 1', () => {
    const e = energiaBase(nivel.habitos, r);
    // sueño 6,5h → 0,8333; agua 1,4L → 0,7; calma 4 → 0,75
    expect(e.base).toBe(Math.round(100 * (0.45 * (2.5 / 3) + 0.3 * 0.7 + 0.25 * 0.75)));
    expect(e.base).toBe(77);
  });

  it('banda 85–115% con bordes inclusivos', () => {
    expect(estadoDeRatio(0.8499, r)).toBe('bajo');
    expect(estadoDeRatio(0.85, r)).toBe('cerrado');
    expect(estadoDeRatio(1.15, r)).toBe('cerrado');
    expect(estadoDeRatio(1.1501, r)).toBe('alto');
  });

  it('puntaje por ratio: 1 en la meta, 0 a ±50%', () => {
    expect(puntajeDeRatio(1)).toBe(1);
    expect(puntajeDeRatio(0.5)).toBe(0);
    expect(puntajeDeRatio(1.5)).toBe(0);
    expect(puntajeDeRatio(0.75)).toBeCloseTo(0.5, 10);
  });

  it('las metas suben con el entrenamiento', () => {
    expect(metasDelDia(nivel, 'descanso', catalogo).c).toBe(230);
    expect(metasDelDia(nivel, 'fuerza', catalogo)).toMatchObject({ p: 110, c: 260, f: 60 });
  });

  it('interpolar deja visible un marcador faltante', () => {
    expect(interpolar('{a} y {b}', { a: 1 })).toBe('1 y {b}');
  });
});

describe('plan: reglas de colocación', () => {
  it('rechaza alimentos fuera de su momento, repetidos y exceso de capacidad', () => {
    const vacio = planVacio(nivel);
    expect(agregar(nivel, vacio, 'cena', 'avena', catalogo).ok).toBe(false); // avena no va en la cena
    const a = agregar(nivel, vacio, 'desayuno', 'avena', catalogo);
    expect(a.ok).toBe(true);
    if (a.ok) expect(agregar(nivel, a.plan, 'merienda', 'avena', catalogo).ok).toBe(false); // repetido

    let p = vacio;
    for (const id of ['avena', 'leche', 'huevos']) {
      const x = agregar(nivel, p, 'desayuno', id, catalogo);
      expect(x.ok).toBe(true);
      if (x.ok) p = x.plan;
    }
    const lleno = agregar(nivel, p, 'desayuno', 'banana', catalogo);
    expect(lleno.ok).toBe(false);
  });

  it('colocarAuto prioriza la comida seleccionada y cae a otra compatible', () => {
    const vacio = planVacio(nivel);
    const a = colocarAuto(nivel, vacio, 'banana', 'merienda', catalogo);
    expect(a.ok && a.plan.comidas.merienda).toContain('banana');
    const b = colocarAuto(nivel, vacio, 'banana', 'cena', catalogo); // cena no compatible → primera compatible
    expect(b.ok && b.plan.comidas.desayuno).toContain('banana');
  });

  it('quitar, disponibles y contador', () => {
    const a = colocarAuto(nivel, planVacio(nivel), 'huevos', null, catalogo);
    expect(a.ok).toBe(true);
    if (!a.ok) return;
    expect(porcionesColocadas(a.plan)).toBe(1);
    expect(disponibles(nivel, a.plan)).not.toContain('huevos');
    expect(porcionesColocadas(quitar(a.plan, 'huevos'))).toBe(0);
  });

  it('elegirEntreno ignora ids no permitidos', () => {
    expect(elegirEntreno(nivel, planVacio(nivel), 'inexistente').entreno).toBe('descanso');
  });

  it('comidasCompatibles respeta momentos', () => {
    expect(comidasCompatibles(nivel, 'pechuga', catalogo)).toEqual(['almuerzo', 'cena']);
  });

  it('sanearPlan descarta datos corruptos sin romper', () => {
    const roto = {
      entreno: 'dragon',
      comidas: { desayuno: ['pechuga', 'avena', 'avena'], fantasma: ['huevos'] },
    } as unknown as Plan;
    const limpio = sanearPlan(nivel, roto, catalogo);
    expect(validarPlan(nivel, limpio, catalogo)).toEqual([]);
    expect(limpio.entreno).toBe('descanso');
    expect(limpio.comidas.desayuno).toEqual(['avena']);
    expect(sanearPlan(nivel, undefined, catalogo)).toEqual(planVacio(nivel));
  });
});

describe('evaluación del día', () => {
  it('plan vacío: 0★, mascota hambrienta', () => {
    const ev = evaluar(nivel, planVacio(nivel), catalogo);
    expect(ev.estrellas).toBe(0);
    expect(ev.macrosCerrados).toBe(false);
    expect(ev.mascota.estado).toBe('hambrienta');
    expect(ev.porcionesColocadas).toBe(0);
  });

  it('plan de referencia con Fuerza: 3★ y mascota feliz', () => {
    expect(validarPlan(nivel, planFuerza, catalogo)).toEqual([]);
    const ev = evaluar(nivel, planFuerza, catalogo);
    expect(ev.macrosCerrados).toBe(true);
    expect(ev.energia.sostenible).toBe(true);
    for (const id of ['proteina_repartida', 'fibra', 'timing', 'movimiento'] as const) {
      expect(ev.reglas[id].ok, id).toBe(true);
    }
    expect(ev.estrellas).toBe(3);
    expect(['radiante', 'contenta']).toContain(ev.mascota.estado);
  });

  it('trampa: el mismo plan con HIIT no es sostenible (máximo 1★ o menos)', () => {
    const ev = evaluar(nivel, { ...planFuerza, entreno: 'hiit' }, catalogo);
    expect(ev.energia.reserva).toBe(77 - 80);
    expect(ev.energia.sostenible).toBe(false);
    expect(ev.estrellas).toBeLessThanOrEqual(1);
  });

  it('sin timing: si falta combustible previo cae de 3★ a 2★', () => {
    const sinPre: Plan = { ...planFuerza, comidas: { ...planFuerza.comidas, merienda: [] } };
    const ev = evaluar(nivel, sinPre, catalogo);
    if (ev.macrosCerrados) {
      expect(ev.reglas.timing.ok).toBe(false);
      expect(ev.estrellas).toBeLessThan(3);
    } else {
      expect(ev.reglas.timing.ok).toBe(false);
    }
  });

  it('el estado cansada aparece con energía muy baja', () => {
    const ev = evaluar(nivel, { ...planFuerza, entreno: 'hiit' }, catalogo);
    expect(ev.energia.final).toBe(0);
    expect(ev.mascota.estado).toBe('cansada');
  });

  it('descanso no exige timing y no cuenta como movimiento', () => {
    const ev = evaluar(nivel, { entreno: 'descanso', comidas: planFuerza.comidas }, catalogo);
    expect(ev.reglas.timing.aplica).toBe(false);
    expect(ev.reglas.movimiento.ok).toBe(false);
  });
});

describe('explicación de cierre', () => {
  it('3★ explica cada regla con números reales y sin marcadores sin resolver', () => {
    const ev = evaluar(nivel, planFuerza, catalogo);
    const c = explicarCierre(nivel, ev, catalogo);
    expect(c.estrellas).toBe(3);
    expect(c.xpGanada).toBe(r.xpPorEstrellas[3]);
    expect(c.items).toHaveLength(6);
    for (const i of c.items) {
      expect(i.detalle, i.regla).not.toMatch(/\{\w+\}/);
      expect(i.leccion.length, i.regla).toBeGreaterThan(20);
    }
    expect(c.items.find((i) => i.regla === 'macros')!.detalle).toContain(String(Math.round(ev.totales.p)));
    expect(c.leccionDelDia).toBe(nivel.leccion);
  });

  it('en fallo, nombra el foco del próximo intento', () => {
    const ev = evaluar(nivel, { ...planFuerza, entreno: 'hiit' }, catalogo);
    const c = explicarCierre(nivel, ev, catalogo);
    expect(c.items.find((i) => i.regla === 'energia')!.ok).toBe(false);
    expect(c.siguiente).toMatch(/Foco/);
    for (const i of c.items) expect(i.detalle).not.toMatch(/\{\w+\}/);
  });

  it('con plan vacío todo el texto sigue resolviendo (sin marcadores)', () => {
    const ev = evaluar(nivel, planVacio(nivel), catalogo);
    const c = explicarCierre(nivel, ev, catalogo);
    expect(c.estrellas).toBe(0);
    for (const i of c.items) expect(i.detalle).not.toMatch(/\{\w+\}/);
  });
});

describe('pistas', () => {
  it('plan vacío: orienta sin resolver', () => {
    const ev = evaluar(nivel, planVacio(nivel), catalogo);
    expect(pistaPara(nivel, planVacio(nivel), ev, catalogo, 1).texto).toMatch(/Tocá/);
  });

  it('nivel 2 nombra un alimento concreto de la despensa', () => {
    const plan: Plan = { entreno: 'fuerza', comidas: { desayuno: ['avena'], almuerzo: [], merienda: [], cena: [] } };
    const ev = evaluar(nivel, plan, catalogo);
    const p1 = pistaPara(nivel, plan, ev, catalogo, 1);
    const p2 = pistaPara(nivel, plan, ev, catalogo, 2);
    expect(p1.texto).toMatch(/faltan/i);
    expect(p2.texto.length).toBeGreaterThan(p1.texto.length * 0.5);
    expect(p2.texto).toMatch(/aporta|mirá/);
  });

  it('con 3★ confirma que todo está en orden', () => {
    const ev = evaluar(nivel, planFuerza, catalogo);
    expect(pistaPara(nivel, planFuerza, ev, catalogo, 1).texto).toMatch(/en orden/);
  });
});

describe('mascota: evolución', () => {
  const et = [
    { id: 'a', nombre: 'A', nivelMin: 1, xpMin: 0, descripcion: '' },
    { id: 'b', nombre: 'B', nivelMin: 2, xpMin: 100, descripcion: '' },
    { id: 'c', nombre: 'C', nivelMin: 4, xpMin: 300, descripcion: '' },
  ];
  it('etapas y progreso', () => {
    expect(etapaPara(0, et).id).toBe('a');
    expect(etapaPara(100, et).id).toBe('b');
    expect(etapaPara(999, et).id).toBe('c');
    expect(progresoEtapa(50, et).pct).toBeCloseTo(0.5, 10);
    expect(progresoEtapa(500, et).siguiente).toBeNull();
  });
  it('xp usa la mejor marca por nivel (no se farmea)', () => {
    expect(xpTotal({ n01: 3 }, r)).toBe(60);
    expect(xpTotal({ n01: 1, n02: 2 }, r)).toBe(20 + 40);
    expect(xpTotal({ n01: 99 }, r)).toBe(60);
  });
});

describe('solucionador: el nivel 1 está bien diseñado', () => {
  const sols = resolver(nivel, catalogo);
  const res = resumen(sols);

  it('tiene solución de 3★, pero pocas (es un puzle)', () => {
    expect(res.porEstrellas[3]).toBeGreaterThanOrEqual(5);
    expect(res.porEstrellas[3]).toBeLessThanOrEqual(40);
  });

  it('hay más de un camino: al menos 2 entrenamientos distintos llevan a 3★', () => {
    expect(Object.keys(res.tresEstrellasPorEntreno).length).toBeGreaterThanOrEqual(2);
  });

  it('existe la trampa pedagógica: macros cerrados pero energía insostenible', () => {
    expect(res.porEstrellas[1]).toBeGreaterThan(0);
    expect(sols.filter((s) => s.estrellas === 1).every((s) => s.entreno === 'hiit')).toBe(true);
  });

  it('cada solución de 3★ del solver coincide con el evaluador real', () => {
    const tres = sols.filter((s) => s.estrellas === 3 && s.plan);
    expect(tres.length).toBeGreaterThan(0);
    for (const s of tres) {
      expect(validarPlan(nivel, s.plan!, catalogo), s.ids.join()).toEqual([]);
      expect(evaluar(nivel, s.plan!, catalogo).estrellas, s.ids.join()).toBe(3);
    }
  });

  it('cada solución de 1★ y 2★ coincide con el evaluador (macros cerrados)', () => {
    const muestra = sols.filter((s) => s.estrellas < 3);
    expect(muestra.length).toBeGreaterThan(0);
    // 1★ y 2★: llenamos con la mejor asignación posible y comprobamos solo macros y energía
    for (const s of muestra) {
      const plan: Plan = { entreno: s.entreno, comidas: Object.fromEntries(nivel.comidas.map((c) => [c.id, [] as string[]])) };
      for (const id of s.ids) {
        const comida = nivel.comidas.find((c) => catalogo.alimentos[id].momentos.includes(c.id) && (plan.comidas[c.id].length < c.capacidad));
        if (comida) plan.comidas[comida.id].push(id);
      }
      if (porcionesColocadas(plan) !== s.ids.length) continue; // la asignación greedy no encajó: se omite
      const ev = evaluar(nivel, plan, catalogo);
      expect(ev.macrosCerrados).toBe(true);
      expect(ev.energia.sostenible).toBe(s.estrellas !== 1);
    }
  });

  it('la solución de referencia usada en los tests figura entre las del solver', () => {
    const clave = [...Object.values(planFuerza.comidas).flat()].sort().join();
    expect(sols.some((s) => s.entreno === 'fuerza' && [...s.ids].sort().join() === clave && s.estrellas === 3)).toBe(true);
  });
});

describe('mascota: compañeros', () => {
  const { personajes } = contenidoMascota;
  const ids = (l: { id: string }[]) => l.map((p) => p.id);

  it('al empezar solo está el principal', () => {
    expect(ids(desbloqueados([], personajes))).toEqual(['cuernito']);
  });

  it('cada logro desbloquea a su compañero', () => {
    expect(ids(desbloqueados(['macros'], personajes))).toEqual(['cuernito', 'mochi']);
    expect(ids(desbloqueados(['energia', 'fibra'], personajes))).toEqual(['cuernito', 'nubi', 'pomelo']);
    expect(ids(desbloqueados(['timing', 'movimiento'], personajes))).toEqual(['cuernito']);
  });

  it('solo se anuncian los que se desbloquean por primera vez', () => {
    expect(ids(nuevosCompaneros([], ['macros', 'fibra'], personajes))).toEqual(['mochi', 'pomelo']);
    expect(ids(nuevosCompaneros(['macros'], ['macros', 'energia'], personajes))).toEqual(['nubi']);
    expect(nuevosCompaneros(['macros'], ['macros'], personajes)).toEqual([]);
  });

  it('los logros se suman sin repetir y solo cuentan las reglas que aplican y se cumplen', () => {
    expect(sumarLogros(['macros'], ['macros', 'fibra'])).toEqual(['macros', 'fibra']);
    const items = [
      { regla: 'macros' as const, ok: true, aplica: true },
      { regla: 'energia' as const, ok: false, aplica: true },
      { regla: 'timing' as const, ok: true, aplica: false },
    ];
    expect(reglasCumplidas(items)).toEqual(['macros']);
  });
});
