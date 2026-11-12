import type { PuntoSerie, RegistroDiario } from '../types';

/**
 * Geometría del gráfico semanal (SVG propio, cero dependencias). Pura: la pantalla solo dibuja lo que sale de acá.
 * Eje X: los días de la serie, parejos. Eje Y: % de cumplimiento de 0 a Y_MAX (la franja verde es la banda 85–115 %).
 */

export type ClaveSerie = keyof RegistroDiario['cumplimiento']; // 'p' | 'c' | 'f' | 'kcal'

export const Y_MAX = 150;

export interface Dim {
  ancho: number;
  alto: number;
  izq: number;
  der: number;
  arr: number;
  abajo: number;
}

export const DIM_SEMANA: Dim = { ancho: 340, alto: 190, izq: 34, der: 12, arr: 10, abajo: 8 };

const r1 = (n: number): number => Math.round(n * 10) / 10;

export function xDe(indice: number, n: number, d: Dim): number {
  const util = d.ancho - d.izq - d.der;
  return r1(n <= 1 ? d.izq + util / 2 : d.izq + (util * indice) / (n - 1));
}

/** Los valores fuera de 0..Y_MAX se recortan para que la línea nunca se salga del dibujo. */
export function yDe(pct: number, d: Dim): number {
  const util = d.alto - d.arr - d.abajo;
  const v = Math.min(Y_MAX, Math.max(0, pct));
  return r1(d.alto - d.abajo - (util * v) / Y_MAX);
}

export interface PuntoDibujo {
  x: number;
  y: number;
  fecha: string;
  valor: number; // % real (sin recortar)
}

export interface Trazo {
  puntos: PuntoDibujo[]; // todos los días jugados
  caminos: string[]; // un camino por tramo de días seguidos (un día suelto es solo un punto)
}

export function trazo(serie: PuntoSerie[], clave: ClaveSerie, d: Dim = DIM_SEMANA): Trazo {
  const puntos: PuntoDibujo[] = [];
  const caminos: string[] = [];
  let tramo: PuntoDibujo[] = [];
  const cerrar = () => {
    if (tramo.length >= 2) caminos.push(tramo.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x} ${p.y}`).join(' '));
    tramo = [];
  };
  serie.forEach((s, i) => {
    if (!s.registro) return cerrar();
    const valor = s.registro.cumplimiento[clave];
    const p = { x: xDe(i, serie.length, d), y: yDe(valor, d), fecha: s.fecha, valor };
    puntos.push(p);
    tramo.push(p);
  });
  cerrar();
  return { puntos, caminos };
}

/** Franja de la banda «cerrado» (85–115 %): y de arriba y alto del rectángulo. */
export function banda(min: number, max: number, d: Dim = DIM_SEMANA): { y: number; alto: number } {
  const arriba = yDe(max * 100, d);
  const abajo = yDe(min * 100, d);
  return { y: arriba, alto: r1(abajo - arriba) };
}

export const MARCAS_Y = [0, 50, 100, 150];
