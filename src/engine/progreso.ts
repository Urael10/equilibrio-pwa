import type { EtapaMascota, ProgresoNivel, Reglas } from '../types';
import { xpTotal } from './mascota';

/**
 * Economía de XP unificada (EGM). Un solo libro:
 *   XP total = estrellas (mejor por nivel, no se farmea repitiendo) + XP de desafíos (una vez por día y desafío).
 * El nivel sale de la XP total con umbrales acumulados ⌊100·(n−1)^1.5⌋: nivel 2 a 100 XP, nivel 3 a 282, nivel 6 a 1118.
 */

export const NIVEL_MAX = 50;

export function xpParaNivel(nivel: number): number {
  if (nivel <= 1) return 0;
  return Math.floor(100 * Math.pow(nivel - 1, 1.5) + 1e-9);
}

export function nivelPara(xp: number): number {
  let n = 1;
  while (n < NIVEL_MAX && xp >= xpParaNivel(n + 1)) n++;
  return n;
}

export function progresoNivel(xp: number): ProgresoNivel {
  const nivel = nivelPara(xp);
  const xpDesde = xpParaNivel(nivel);
  const xpHasta = nivel >= NIVEL_MAX ? null : xpParaNivel(nivel + 1);
  const pct = xpHasta === null ? 1 : Math.min(1, Math.max(0, (xp - xpDesde) / (xpHasta - xpDesde)));
  return { nivel, xpDesde, xpHasta, pct };
}

interface Libro {
  mejor: Record<string, number>;
  xpDesafios: number;
}

export function xpLibro(p: Libro, r: Reglas): number {
  return xpTotal(p.mejor, r) + Math.max(0, p.xpDesafios);
}

/** XP que suma una mejora de estrellas en un nivel (0 si no mejora). */
export function xpPorMejora(previas: number, nuevas: number, r: Reglas): number {
  const tope = (n: number) => r.xpPorEstrellas[Math.min(3, Math.max(0, n))] ?? 0;
  return Math.max(0, tope(nuevas) - tope(previas));
}

export interface InsigniaEtapa {
  etapa: EtapaMascota;
  alcanzada: boolean;
  actual: boolean; // la etapa en la que está hoy
  faltan: number; // XP que faltan para alcanzarla (0 si ya está)
}

/** Una insignia por etapa de la mascota: se gana al llegar a su XP y se queda para siempre. */
export function insigniasPorEtapa(xp: number, etapas: EtapaMascota[]): InsigniaEtapa[] {
  const alcanzadas = etapas.filter((e) => xp >= e.xpMin);
  const actualId = alcanzadas.length ? alcanzadas[alcanzadas.length - 1].id : etapas[0]?.id;
  return etapas.map((etapa) => ({
    etapa,
    alcanzada: xp >= etapa.xpMin,
    actual: etapa.id === actualId,
    faltan: Math.max(0, etapa.xpMin - xp),
  }));
}
