import 'fake-indexeddb/auto';
import { beforeAll, describe, expect, it } from 'vitest';
import { render } from 'svelte/server';

// Humo de renderizado (SSR): comprueba que las pantallas arman su HTML con el store real, sin errores de runtime.
beforeAll(() => {
  (globalThis as unknown as { window: unknown }).window = { scrollTo: () => {} };
});

describe('tarjeta de desafíos', () => {
  it('muestra los 3 desafíos del día con barra de progreso, XP y su avance', async () => {
    const { app } = await import('../src/state/store.svelte');
    const { default: DesafiosCard } = await import('../src/components/DesafiosCard.svelte');
    await app.iniciar();
    const { body } = render(DesafiosCard, { props: {} });
    expect(body).toContain('Desafíos de hoy');
    expect((body.match(/role="progressbar"/g) ?? []).length).toBe(3);
    for (const d of app.desafios) {
      expect(body).toContain(d.titulo);
      expect(body).toContain(d.descripcion);
    }
    expect(body).toContain('XP');
  });

  it('la variante compacta omite las descripciones', async () => {
    const { app } = await import('../src/state/store.svelte');
    const { default: DesafiosCard } = await import('../src/components/DesafiosCard.svelte');
    const { body } = render(DesafiosCard, { props: { compacta: true } });
    for (const d of app.desafios) {
      expect(body).toContain(d.titulo);
      expect(body).not.toContain(d.descripcion);
    }
  });

  it('Home y Juego incluyen la tarjeta', async () => {
    const { app } = await import('../src/state/store.svelte');
    const { default: Home } = await import('../src/screens/Home.svelte');
    const { default: Juego } = await import('../src/screens/Juego.svelte');
    expect(render(Home, { props: {} }).body).toContain('Desafíos de hoy');
    app.abrirNivel('n01');
    expect(render(Juego, { props: {} }).body).toContain('Desafíos de hoy');
  });
});

describe('galería', () => {
  it('sin días jugados el historial invita a cerrar el primero y muestra las insignias', async () => {
    const { app } = await import('../src/state/store.svelte');
    const { default: Galeria } = await import('../src/screens/Galeria.svelte');
    app.nuevaPartida();
    await new Promise((r) => setTimeout(r, 50));
    const { body } = render(Galeria, { props: {} });
    expect(body).toContain('Historial');
    expect(body).toContain('Personajes');
    expect(body).toContain('Todavía no cerraste ningún día');
    expect(body).toContain('Insignias de evolución');
    expect(body).toContain('0 / 7 días jugados');
    expect(body).not.toContain('<svg viewBox="0 0 340');
  });

  it('después de cerrar un día dibuja el gráfico, el detalle del día y la racha', async () => {
    const { app } = await import('../src/state/store.svelte');
    const { default: Galeria } = await import('../src/screens/Galeria.svelte');
    app.abrirNivel('n01');
    app.elegirEntrenamiento('fuerza');
    for (const [comida, ids] of [
      ['desayuno', ['leche', 'pan_integral', 'avena']],
      ['almuerzo', ['pechuga', 'lentejas', 'tofu', 'batata']],
      ['merienda', ['banana']],
      ['cena', ['huevos', 'garbanzos', 'arroz_integral', 'palta']],
    ] as [string, string[]][]) {
      app.seleccionar(comida);
      for (const id of ids) app.colocar(id);
    }
    app.cerrarDia();
    const { body } = render(Galeria, { props: {} });
    expect(body).toContain('1 / 7 días jugados');
    expect(body).toContain('<svg viewBox="0 0 340');
    expect(body).toContain('role="img"');
    expect(body).toContain('día seguido');
    expect(body).toContain('Proteína');
    expect(body).toContain('banda 85–115 %');
    expect(body).toContain('★');
    expect(body).toMatch(/\+\d+ XP<\/span> ese día/);
  });

  it('la pestaña Personajes conserva la revisión de personajes', async () => {
    const { default: Revision } = await import('../src/components/PersonajesRevision.svelte');
    const { body } = render(Revision, { props: {} });
    expect(body).toContain('4 personajes · 3 etapas · 6 estados');
    for (const n of ['Cuernito', 'Mochi', 'Nubi', 'Pomelo']) expect(body).toContain(n);
    for (const e of ['Radiante', 'Bajón', 'Hambre']) expect(body).toContain(e);
  });
});
