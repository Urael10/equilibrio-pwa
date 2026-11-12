import type { Catalogo, Nivel, Plan } from '../types';
import { energiaBase, kcalDe, estadoDeRatio } from './evaluar';

/**
 * Solucionador por fuerza bruta. NO se usa en la app: sirve para garantizar en tests que cada
 * nivel tiene solución, cuántas hay y que las "trampas" (p. ej. HIIT con poca energía) fallan.
 */

export interface Solucion {
  entreno: string;
  ids: string[];
  estrellas: 1 | 2 | 3;
  plan?: Plan; // solo cuando estrellas === 3 (incluye una asignación válida a comidas)
}

interface Item { id: string; p: number; c: number; f: number; fibra: number; momentos: string[] }

export function resolver(nivel: Nivel, cat: Catalogo): Solucion[] {
  const r = cat.reglas;
  const items: Item[] = nivel.mano.map((id) => ({ ...cat.alimentos[id] }));
  const n = items.length;
  const capacidadTotal = nivel.comidas.reduce((a, c) => a + c.capacidad, 0);
  const eb = energiaBase(nivel.habitos, r).base;
  const salida: Solucion[] = [];

  for (let mask = 1; mask < 1 << n; mask++) {
    let cuenta = 0, p = 0, c = 0, f = 0, fibra = 0;
    for (let i = 0; i < n; i++) {
      if (mask & (1 << i)) {
        cuenta++;
        p += items[i].p; c += items[i].c; f += items[i].f; fibra += items[i].fibra;
      }
    }
    if (cuenta > capacidadTotal) continue;

    for (const eid of nivel.entrenamientos) {
      const e = cat.entrenamientos[eid];
      const metas = { p: nivel.metas.p + e.extra.p, c: nivel.metas.c + e.extra.c, f: nivel.metas.f + e.extra.f };
      if (
        estadoDeRatio(p / metas.p, r) !== 'cerrado' ||
        estadoDeRatio(c / metas.c, r) !== 'cerrado' ||
        estadoDeRatio(f / metas.f, r) !== 'cerrado'
      ) continue;
      void kcalDe;

      const elegidos = items.filter((_, i) => mask & (1 << i));
      const ids = elegidos.map((x) => x.id);
      const sostenible = eb - e.costo >= r.reservaMinima;
      if (!sostenible) { salida.push({ entreno: eid, ids, estrellas: 1 }); continue; }

      if (fibra < r.fibraMinima || !e.movimiento) { salida.push({ entreno: eid, ids, estrellas: 2 }); continue; }

      const asignacion = asignar(nivel, elegidos, e.combustiblePre, e.reparacionPost, e.movimiento, r.proteinaPorComida, r.comidasConProteina);
      if (asignacion) {
        salida.push({ entreno: eid, ids, estrellas: 3, plan: { entreno: eid, comidas: asignacion } });
      } else {
        salida.push({ entreno: eid, ids, estrellas: 2 });
      }
    }
  }
  return salida;
}

function asignar(
  nivel: Nivel,
  elegidos: Item[],
  preMeta: number,
  postMeta: number,
  movimiento: boolean,
  umbralProt: number,
  minComidasProt: number,
): Record<string, string[]> | null {
  const comidas = nivel.comidas;
  const m = comidas.length;
  const preIdx = comidas.findIndex((c) => c.id === nivel.entrenoPor.pre);
  const postIdx = comidas.findIndex((c) => c.id === nivel.entrenoPor.post);
  const exigeTiming = movimiento && (preMeta > 0 || postMeta > 0);

  // más proteína primero → poda temprana
  const orden = [...elegidos].sort((a, b) => b.p - a.p);
  const cupo = comidas.map((c) => c.capacidad);
  const prot = new Array(m).fill(0);
  const carb = new Array(m).fill(0);
  const asign: number[] = new Array(orden.length).fill(-1);

  const rec = (i: number): boolean => {
    if (i === orden.length) {
      const conProt = prot.filter((x) => x >= umbralProt).length;
      if (conProt < minComidasProt) return false;
      if (exigeTiming && (carb[preIdx] < preMeta || prot[postIdx] < postMeta)) return false;
      return true;
    }
    const it = orden[i];
    for (let k = 0; k < m; k++) {
      if (cupo[k] === 0 || !it.momentos.includes(comidas[k].id)) continue;
      cupo[k]--; prot[k] += it.p; carb[k] += it.c; asign[i] = k;
      if (rec(i + 1)) return true;
      cupo[k]++; prot[k] -= it.p; carb[k] -= it.c;
    }
    return false;
  };

  if (!rec(0)) return null;
  const res: Record<string, string[]> = Object.fromEntries(comidas.map((c) => [c.id, [] as string[]]));
  orden.forEach((it, i) => res[comidas[asign[i]].id].push(it.id));
  return res;
}

export function resumen(sols: Solucion[]) {
  const porEstrellas = { 1: 0, 2: 0, 3: 0 };
  const porEntreno: Record<string, number> = {};
  for (const s of sols) {
    porEstrellas[s.estrellas]++;
    if (s.estrellas === 3) porEntreno[s.entreno] = (porEntreno[s.entreno] ?? 0) + 1;
  }
  return { porEstrellas, tresEstrellasPorEntreno: porEntreno };
}
