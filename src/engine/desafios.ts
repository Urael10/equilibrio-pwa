import type {
  DesafioDiario,
  Evaluacion,
  MacroId,
  MetricaDesafio,
  PlantillaDesafio,
  Reglas,
  TipoDesafio,
} from '../types';
import { fmt } from './util';

/**
 * Desafíos diarios (EGM). Puro y determinista:
 *  - cada fecha elige siempre los mismos desafíos (semilla = fecha), sin servidor;
 *  - el progreso sale de la Evaluacion del plan actual, así que no hay un segundo cálculo que se desincronice;
 *  - el XP se acredita una sola vez por fecha y desafío (acreditar es idempotente).
 */

export const TIPOS_DESAFIO: TipoDesafio[] = ['macro', 'entrenamiento', 'habito'];
const MACROS: MacroId[] = ['p', 'c', 'f'];

/** FNV-1a de 32 bits. */
export function hashFecha(texto: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < texto.length; i++) {
    h ^= texto.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** mulberry32: generador pseudoaleatorio con semilla. */
export function mulberry32(semilla: number): () => number {
  let a = semilla >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Un desafío de cada tipo (si hay plantillas de ese tipo), elegido por la semilla de la fecha. */
export function elegirDesafios(fecha: string, plantillas: PlantillaDesafio[]): string[] {
  const azar = mulberry32(hashFecha(fecha));
  const ids: string[] = [];
  for (const tipo of TIPOS_DESAFIO) {
    const lista = plantillas.filter((p) => p.tipo === tipo);
    if (lista.length) ids.push(lista[Math.floor(azar() * lista.length)].id);
  }
  return ids;
}

export function valorMetrica(metrica: MetricaDesafio, ev: Evaluacion, r: Reglas): number {
  switch (metrica) {
    case 'proteina_g':
      return ev.totales.p;
    case 'carbs_g':
      return ev.totales.c;
    case 'grasas_g':
      return ev.totales.f;
    case 'fibra_g':
      return ev.totales.fibra;
    case 'macros_cerrados':
      return MACROS.filter((k) => ev.macros[k].estado === 'cerrado').length;
    case 'macros_precisos':
      return MACROS.filter((k) => ev.macros[k].meta > 0 && Math.abs(ev.macros[k].ratio - 1) <= r.precisionMacros + 1e-9).length;
    case 'kcal_pct':
      return Math.round(ev.completitud * 100);
    case 'energia_activa':
      return ev.reglas.movimiento.ok ? ev.energia.final : 0;
    case 'comidas_con_proteina':
      return Number(ev.reglas.proteina_repartida.datos.n ?? 0);
    case 'movimiento':
      return ev.reglas.movimiento.ok ? 1 : 0;
    case 'timing':
      return ev.reglas.timing.aplica && ev.reglas.timing.ok ? 1 : 0;
    case 'estrellas':
      return ev.estrellas;
  }
}

/**
 * Vista de los desafíos del día para el plan actual. Con el plan vacío nada se completa
 * (un día sin comidas no es un día jugado), aunque la métrica ya valga algo, como el movimiento.
 */
export function evaluarDesafios(
  ids: string[],
  plantillas: PlantillaDesafio[],
  ev: Evaluacion,
  r: Reglas,
  acreditados: string[] = [],
): DesafioDiario[] {
  const jugado = ev.porcionesColocadas > 0;
  const vista: DesafioDiario[] = [];
  for (const id of ids) {
    const p = plantillas.find((x) => x.id === id);
    if (!p) continue;
    const valor = valorMetrica(p.metrica, ev, r);
    vista.push({
      id: p.id,
      titulo: p.titulo,
      descripcion: p.descripcion,
      tipo: p.tipo,
      metrica: p.metrica,
      objetivoCantidad: p.objetivo,
      progresoActual: valor,
      xpRecompensa: p.xp,
      completado: jugado && valor >= p.objetivo,
      acreditado: acreditados.includes(p.id),
    });
  }
  return vista;
}

export interface Acreditacion {
  nuevos: DesafioDiario[]; // los que pagan XP ahora
  xp: number;
  acreditados: string[]; // lista actualizada, sin repetidos
}

/** Idempotente: llamarla otra vez con el resultado anterior no suma nada. */
export function acreditar(vista: DesafioDiario[], yaAcreditados: string[]): Acreditacion {
  const nuevos = vista.filter((d) => d.completado && !yaAcreditados.includes(d.id));
  return {
    nuevos,
    xp: nuevos.reduce((a, d) => a + d.xpRecompensa, 0),
    acreditados: [...new Set([...yaAcreditados, ...nuevos.map((d) => d.id)])],
  };
}

/** Texto corto del avance, con la unidad de cada métrica («62 / 90 g», «2 / 3 macros», «Listo»). */
export function etiquetaProgreso(metrica: MetricaDesafio, valor: number, objetivo: number): string {
  const v = Math.min(valor, objetivo * 10);
  switch (metrica) {
    case 'proteina_g':
    case 'carbs_g':
    case 'grasas_g':
    case 'fibra_g':
      return `${fmt(v)} / ${fmt(objetivo)} g`;
    case 'kcal_pct':
      return `${fmt(v)} / ${fmt(objetivo)} %`;
    case 'macros_cerrados':
    case 'macros_precisos':
      return `${fmt(v)} / ${fmt(objetivo)} macros`;
    case 'comidas_con_proteina':
      return `${fmt(v)} / ${fmt(objetivo)} comidas`;
    case 'energia_activa':
      return `${fmt(v)} / ${fmt(objetivo)} de energía`;
    case 'estrellas':
      return `${fmt(v)} / ${fmt(objetivo)} ★`;
    case 'movimiento':
    case 'timing':
      return valor >= objetivo ? 'Listo' : 'Pendiente';
  }
}

/** Avance 0..1 para la barra. */
export function fraccionProgreso(valor: number, objetivo: number): number {
  return objetivo > 0 ? Math.min(1, Math.max(0, valor / objetivo)) : 0;
}
