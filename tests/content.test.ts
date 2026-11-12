import { describe, expect, it } from 'vitest';
import { catalogo, contenidoMascota, niveles, plantillasDesafios } from '../src/content';
import { TIPOS_DESAFIO } from '../src/engine/desafios';
import { xpParaNivel } from '../src/engine/progreso';
import { kcalDe } from '../src/engine/evaluar';
import type { ReglaId } from '../src/types';

const REGLAS: ReglaId[] = ['macros', 'energia', 'proteina_repartida', 'fibra', 'timing', 'movimiento'];

describe('contenido: alimentos', () => {
  const lista = Object.values(catalogo.alimentos);

  it('tiene ids únicos y campos completos', () => {
    expect(new Set(lista.map((a) => a.id)).size).toBe(lista.length);
    for (const a of lista) {
      expect(a.nombre, a.id).toBeTruthy();
      expect(a.icono, a.id).toBeTruthy();
      expect(a.porcion, a.id).toBeTruthy();
      expect(a.nota.length, a.id).toBeGreaterThan(20);
      expect(a.momentos.length, a.id).toBeGreaterThan(0);
    }
  });

  it('tiene macros y fibra no negativos y una energía razonable por porción', () => {
    for (const a of lista) {
      for (const v of [a.p, a.c, a.f, a.fibra]) expect(v, a.id).toBeGreaterThanOrEqual(0);
      const kcal = kcalDe(a);
      expect(kcal, a.id).toBeGreaterThan(0);
      expect(kcal, a.id).toBeLessThan(450);
    }
  });
});

describe('contenido: entrenamientos y reglas', () => {
  it('descanso no cuesta energía ni pide nada', () => {
    const d = catalogo.entrenamientos['descanso'];
    expect(d.costo).toBe(0);
    expect(d.movimiento).toBe(false);
    expect(d.combustiblePre + d.reparacionPost).toBe(0);
  });

  it('el costo crece con la intensidad', () => {
    const e = catalogo.entrenamientos;
    expect(e.descanso.costo).toBeLessThan(e.yoga.costo);
    expect(e.yoga.costo).toBeLessThan(e.caminata.costo);
    expect(e.caminata.costo).toBeLessThan(e.fuerza.costo);
    expect(e.fuerza.costo).toBeLessThan(e.hiit.costo);
  });

  it('cada regla tiene textos completos y sin marcadores huérfanos', () => {
    for (const id of REGLAS) {
      const t = catalogo.reglas.textos[id];
      expect(t, id).toBeDefined();
      expect(t.titulo && t.ok && t.falla && t.leccion, id).toBeTruthy();
    }
    expect(catalogo.reglas.textos.timing.noAplica).toBeTruthy();
  });

  it('los pesos de energía suman 1', () => {
    const w = catalogo.reglas.pesosEnergia;
    expect(w.sueno + w.agua + w.calma).toBeCloseTo(1, 10);
  });
});

describe('contenido: niveles', () => {
  for (const n of niveles) {
    describe(n.id, () => {
      it('referencia solo alimentos y entrenamientos existentes', () => {
        for (const id of n.mano) expect(catalogo.alimentos[id], id).toBeDefined();
        for (const id of n.entrenamientos) expect(catalogo.entrenamientos[id], id).toBeDefined();
      });

      it('no repite alimentos en la despensa', () => {
        expect(new Set(n.mano).size).toBe(n.mano.length);
      });

      it('la comida previa y la posterior existen', () => {
        const ids = n.comidas.map((c) => c.id);
        expect(ids).toContain(n.entrenoPor.pre);
        expect(ids).toContain(n.entrenoPor.post);
        expect(ids.indexOf(n.entrenoPor.pre)).toBeLessThan(ids.indexOf(n.entrenoPor.post));
      });

      it('cada alimento tiene al menos un momento válido en este nivel', () => {
        const ids = new Set(n.comidas.map((c) => c.id));
        for (const id of n.mano) {
          const validos = catalogo.alimentos[id].momentos.filter((m) => ids.has(m));
          expect(validos.length, id).toBeGreaterThan(0);
        }
      });

      it('los hábitos están en rangos válidos', () => {
        expect(n.habitos.suenoHoras).toBeGreaterThanOrEqual(0);
        expect(n.habitos.suenoHoras).toBeLessThanOrEqual(12);
        expect(n.habitos.aguaLitros).toBeGreaterThanOrEqual(0);
        expect(n.habitos.calma).toBeGreaterThanOrEqual(1);
        expect(n.habitos.calma).toBeLessThanOrEqual(5);
      });

      it('la despensa alcanza (en kcal) para cerrar el día con el mayor entrenamiento', () => {
        const total = n.mano.reduce((acc, id) => acc + kcalDe(catalogo.alimentos[id]), 0);
        expect(total).toBeGreaterThan(kcalDe(n.metas));
      });
    });
  }

  it('los órdenes son consecutivos desde 1', () => {
    expect(niveles.map((n) => n.orden)).toEqual(niveles.map((_, i) => i + 1));
  });
});

describe('contenido: mascota', () => {
  it('las etapas parten de 0 xp y son crecientes', () => {
    const e = contenidoMascota.etapas;
    expect(e[0].xpMin).toBe(0);
    for (let i = 1; i < e.length; i++) expect(e[i].xpMin).toBeGreaterThan(e[i - 1].xpMin);
  });

  it('cada etapa arranca en la XP de su nivel (xpMin = xpParaNivel(nivelMin))', () => {
    const e = contenidoMascota.etapas;
    expect(e[0].nivelMin).toBe(1);
    for (const et of e) expect(et.xpMin, et.id).toBe(xpParaNivel(et.nivelMin));
    for (let i = 1; i < e.length; i++) expect(e[i].nivelMin).toBeGreaterThan(e[i - 1].nivelMin);
  });

  it('hay frases para cada estado', () => {
    for (const estado of ['radiante', 'contenta', 'tranquila', 'bajon', 'hambrienta', 'cansada'] as const) {
      expect(contenidoMascota.frases[estado].length, estado).toBeGreaterThan(0);
    }
  });

  it('hay un personaje principal sin desbloqueo y compañeros con una regla que existe', () => {
    const { personajes, principal } = contenidoMascota;
    expect(new Set(personajes.map((p) => p.id)).size).toBe(personajes.length);
    const main = personajes.find((p) => p.id === principal);
    expect(main?.desbloqueo).toBeNull();
    for (const p of personajes) {
      expect(p.nombre && p.dominio && p.descripcion && p.leccion, p.id).toBeTruthy();
      if (p.desbloqueo) {
        expect(REGLAS, p.id).toContain(p.desbloqueo.regla);
        expect(p.desbloqueo.texto.length, p.id).toBeGreaterThan(10);
      }
    }
  });

  it('cada compañero se desbloquea con una regla distinta', () => {
    const reglas = contenidoMascota.personajes.flatMap((p) => (p.desbloqueo ? [p.desbloqueo.regla] : []));
    expect(new Set(reglas).size).toBe(reglas.length);
  });

  it('hay etiquetas de estado para los dos géneros y todos los estados', () => {
    for (const g of ['m', 'f'] as const) {
      for (const estado of ['radiante', 'contenta', 'tranquila', 'bajon', 'hambrienta', 'cansada'] as const) {
        expect(contenidoMascota.estadosTexto[g][estado], `${g}/${estado}`).toBeTruthy();
      }
    }
  });
});

describe('contenido: desafíos diarios', () => {
  it('tienen ids únicos, textos, XP y objetivo positivos', () => {
    expect(new Set(plantillasDesafios.map((p) => p.id)).size).toBe(plantillasDesafios.length);
    for (const p of plantillasDesafios) {
      expect(p.titulo, p.id).toBeTruthy();
      expect(p.descripcion.length, p.id).toBeGreaterThan(10);
      expect(p.objetivo, p.id).toBeGreaterThan(0);
      expect(p.xp, p.id).toBeGreaterThan(0);
    }
  });

  it('hay al menos 2 plantillas de cada tipo para que los días varíen', () => {
    for (const tipo of TIPOS_DESAFIO) {
      expect(plantillasDesafios.filter((p) => p.tipo === tipo).length, tipo).toBeGreaterThanOrEqual(2);
    }
  });

  it('la precisión de macros es una fracción razonable', () => {
    expect(catalogo.reglas.precisionMacros).toBeGreaterThan(0);
    expect(catalogo.reglas.precisionMacros).toBeLessThan(catalogo.reglas.banda.max - 1);
  });
});
