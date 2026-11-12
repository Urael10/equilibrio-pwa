import type { Evaluacion, PuntoSerie, RegistroDiario } from '../types';
import { sumarDias, ultimosDias } from './util';

/** Histórico diario (EGM): un registro por fecha, con lo necesario para graficar el cumplimiento. */

const pct = (ratio: number): number => Math.round(ratio * 100);

interface EntradaRegistro {
  fecha: string;
  nivelId: string;
  ev: Evaluacion;
  xpGanada: number;
  desafiosCompletados: string[];
}

export function crearRegistro(e: EntradaRegistro): RegistroDiario {
  const { ev } = e;
  return {
    fecha: e.fecha,
    nivelId: e.nivelId,
    estrellas: ev.estrellas,
    totales: { p: ev.totales.p, c: ev.totales.c, f: ev.totales.f, kcal: Math.round(ev.totales.kcal), fibra: ev.totales.fibra },
    metas: { p: ev.metas.p, c: ev.metas.c, f: ev.metas.f, kcal: Math.round(ev.metas.kcal) },
    cumplimiento: {
      p: pct(ev.macros.p.ratio),
      c: pct(ev.macros.c.ratio),
      f: pct(ev.macros.f.ratio),
      kcal: pct(ev.completitud),
    },
    energiaFinal: ev.energia.final,
    xpGanada: Math.max(0, Math.round(e.xpGanada)),
    desafiosCompletados: [...new Set(e.desafiosCompletados)],
  };
}

/**
 * Si el día se cierra más de una vez, el registro conserva el mejor intento (más estrellas; a igualdad, el más
 * reciente), suma la XP ganada y une los desafíos completados.
 */
export function fusionarRegistros(previo: RegistroDiario | undefined, nuevo: RegistroDiario): RegistroDiario {
  if (!previo) return nuevo;
  const base = nuevo.estrellas >= previo.estrellas ? nuevo : previo;
  return {
    ...base,
    xpGanada: previo.xpGanada + nuevo.xpGanada,
    desafiosCompletados: [...new Set([...previo.desafiosCompletados, ...nuevo.desafiosCompletados])],
  };
}

/** Los últimos `dias` días hasta `hasta` (inclusive), con null en los días sin registro. */
export function serieUltimosDias(registros: RegistroDiario[], hasta: string, dias = 7): PuntoSerie[] {
  const porFecha = new Map(registros.map((r) => [r.fecha, r]));
  return ultimosDias(hasta, dias).map((fecha) => ({ fecha, registro: porFecha.get(fecha) ?? null }));
}

/** Promedio del cumplimiento (%) de los días jugados de la serie; null si no hay ninguno. */
export function promedioCumplimiento(serie: PuntoSerie[]): RegistroDiario['cumplimiento'] | null {
  const jugados = serie.map((s) => s.registro).filter((r): r is RegistroDiario => r !== null);
  if (!jugados.length) return null;
  const media = (k: keyof RegistroDiario['cumplimiento']) =>
    Math.round(jugados.reduce((a, r) => a + r.cumplimiento[k], 0) / jugados.length);
  return { p: media('p'), c: media('c'), f: media('f'), kcal: media('kcal') };
}

/** XP que sumó la serie (solo días jugados). */
export function xpDeLaSerie(serie: PuntoSerie[]): number {
  return serie.reduce((a, s) => a + (s.registro?.xpGanada ?? 0), 0);
}

/**
 * Días seguidos jugados que terminan hoy. Si hoy todavía no se jugó, la racha sigue viva desde ayer
 * (no se corta hasta que pasa un día entero sin jugar).
 */
export function rachaActual(registros: RegistroDiario[], hoy: string): number {
  const fechas = new Set(registros.map((r) => r.fecha));
  let dia = fechas.has(hoy) ? hoy : sumarDias(hoy, -1);
  let racha = 0;
  while (fechas.has(dia)) {
    racha++;
    dia = sumarDias(dia, -1);
  }
  return racha;
}
