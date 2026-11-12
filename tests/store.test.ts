import 'fake-indexeddb/auto';
import { beforeAll, describe, expect, it } from 'vitest';
import { catalogo } from '../src/content';

// El store usa runes de Svelte 5 (.svelte.ts) y toca window/navigator: se simulan lo mínimo.
beforeAll(() => {
  (globalThis as unknown as { window: unknown }).window = { scrollTo: () => {} };
});

const PLAN_3_ESTRELLAS = {
  entreno: 'fuerza',
  comidas: [
    ['desayuno', ['leche', 'pan_integral', 'avena']],
    ['almuerzo', ['pechuga', 'lentejas', 'tofu', 'batata']],
    ['merienda', ['banana']],
    ['cena', ['huevos', 'garbanzos', 'arroz_integral', 'palta']],
  ] as [string, string[]][],
};

describe('store: cierre del día', () => {
  it('suma estrellas + desafíos una sola vez por día y guarda el histórico', async () => {
    const { app } = await import('../src/state/store.svelte');
    const { fechaLocal } = await import('../src/engine/util');
    await app.iniciar();
    expect(app.xp).toBe(0);
    expect(app.nivelXp.nivel).toBe(1);
    expect(app.desafiosDia.ids).toHaveLength(3);
    expect(app.desafiosDia.fecha).toBe(fechaLocal());

    app.abrirNivel('n01');
    app.elegirEntrenamiento(PLAN_3_ESTRELLAS.entreno);
    for (const [comida, ids] of PLAN_3_ESTRELLAS.comidas) {
      app.seleccionar(comida);
      for (const id of ids) expect(app.colocar(id)).toBe(true);
    }
    expect(app.ev.estrellas).toBe(3);

    const pendientes = app.desafios.filter((d) => d.completado);
    const xpDesafios = pendientes.reduce((a, d) => a + d.xpRecompensa, 0);
    expect(xpDesafios).toBeGreaterThan(0);

    app.cerrarDia();
    const xpEstrellas = catalogo.reglas.xpPorEstrellas[3];
    expect(app.xp).toBe(xpEstrellas + xpDesafios);
    expect(app.desafiosNuevos.map((d) => d.id).sort()).toEqual(pendientes.map((d) => d.id).sort());
    expect(app.historial).toHaveLength(1);
    expect(app.historial[0]).toMatchObject({ fecha: app.fecha, estrellas: 3, xpGanada: xpEstrellas + xpDesafios });

    // Cerrar de nuevo el mismo día con el mismo plan no suma nada más: no se puede farmear.
    const antes = app.xp;
    app.cerrarDia();
    expect(app.xp).toBe(antes);
    expect(app.desafiosNuevos).toEqual([]);
    expect(app.historial).toHaveLength(1);
    expect(app.historial[0].xpGanada).toBe(xpEstrellas + xpDesafios);
    expect(app.semana.at(-1)?.registro?.estrellas).toBe(3);
  });

  it('«Empezar de cero» reinicia XP, histórico y desafíos pagados', async () => {
    const { app } = await import('../src/state/store.svelte');
    app.nuevaPartida();
    await new Promise((r) => setTimeout(r, 50));
    expect(app.xp).toBe(0);
    expect(app.historial).toEqual([]);
    expect(app.desafiosDia.acreditados).toEqual([]);
  });

  it('avisa la subida de nivel (y de etapa) al cerrar el día', async () => {
    const { app } = await import('../src/state/store.svelte');
    // Parte de 95 XP de desafíos: con las 60 XP de un 3★ se cruza el umbral del nivel 2 (100 XP) sin llegar al 3 (282).
    app.progreso = { ...app.progreso, xpDesafios: 95 };
    expect(app.nivelXp.nivel).toBe(1);
    app.abrirNivel('n01');
    app.elegirEntrenamiento(PLAN_3_ESTRELLAS.entreno);
    for (const [comida, ids] of PLAN_3_ESTRELLAS.comidas) {
      app.seleccionar(comida);
      for (const id of ids) app.colocar(id);
    }
    app.cerrarDia();
    expect(app.xpCierre).toBeGreaterThanOrEqual(60);
    expect(app.nivelXp.nivel).toBe(2);
    expect(app.subida).toEqual({ nivelAntes: 1, nivelAhora: 2, etapaNueva: null }); // Joven empieza en el nivel 3

    app.volverAlInicio();
    expect(app.subida).toBeNull();
    expect(app.xpCierre).toBe(0);
  });
});
