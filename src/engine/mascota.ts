import type {
  DetalleMacro,
  Energia,
  EstadoMascota,
  EtapaMascota,
  MacroId,
  Personaje,
  ReglaId,
  ReglaResultado,
  Reglas,
  StatsMascota,
} from '../types';
import { clamp } from './util';

interface EntradaMascota {
  macros: Record<MacroId, DetalleMacro>;
  energia: Energia;
  reglas: Record<ReglaId, ReglaResultado>;
  completitud: number; // kcal / meta
}

const REGLAS_BIENESTAR: ReglaId[] = ['proteina_repartida', 'fibra', 'timing', 'movimiento'];

/**
 * Stats de la mascota a partir del plan del día:
 *  - nutrición: qué tan cerca quedaron los 3 macros de su meta (promedio de puntajes)
 *  - ánimo:     50% nutrición + 30% reglas de bienestar cumplidas + 20% energía sostenible
 *  - energía:   reserva tras entrenar (+ bono por buena recuperación)
 *  - estado:    hambrienta (<60% de las kcal) > cansada (energía <25) > según ánimo
 */
export function calcularMascota(e: EntradaMascota): StatsMascota {
  const nutricion = Math.round(
    (100 * (e.macros.p.puntaje + e.macros.c.puntaje + e.macros.f.puntaje)) / 3,
  );

  const aplicables = REGLAS_BIENESTAR.filter((id) => e.reglas[id].aplica);
  const cumplidas = aplicables.filter((id) => e.reglas[id].ok).length;
  const bienestar = aplicables.length ? cumplidas / aplicables.length : 1;

  const animo = Math.round(
    clamp(0.5 * nutricion + 0.3 * 100 * bienestar + 0.2 * (e.energia.sostenible ? 100 : 30), 0, 100),
  );

  let estado: EstadoMascota;
  if (e.completitud < 0.6) estado = 'hambrienta';
  else if (e.energia.final < 25) estado = 'cansada';
  else if (animo >= 85) estado = 'radiante';
  else if (animo >= 65) estado = 'contenta';
  else if (animo >= 40) estado = 'tranquila';
  else estado = 'bajon';

  return { energia: e.energia.final, nutricion, animo, estado };
}

// ---------- Evolución ----------

export function etapaPara(xp: number, etapas: EtapaMascota[]): EtapaMascota {
  let actual = etapas[0];
  for (const et of etapas) if (xp >= et.xpMin) actual = et;
  return actual;
}

export function progresoEtapa(xp: number, etapas: EtapaMascota[]) {
  const actual = etapaPara(xp, etapas);
  const idx = etapas.findIndex((e) => e.id === actual.id);
  const siguiente = etapas[idx + 1] ?? null;
  const pct = siguiente ? clamp((xp - actual.xpMin) / (siguiente.xpMin - actual.xpMin)) : 1;
  return { actual, siguiente, pct, indice: idx };
}

/** XP total = suma de la mejor cantidad de estrellas por nivel (no se puede farmear repitiendo). */
export function xpTotal(mejorEstrellasPorNivel: Record<string, number>, r: Reglas): number {
  return Object.values(mejorEstrellasPorNivel).reduce(
    (acc, estrellas) => acc + (r.xpPorEstrellas[Math.min(3, Math.max(0, estrellas))] ?? 0),
    0,
  );
}

// ---------- Compañeros ----------

/** Reglas cumplidas al cerrar un día (solo las que aplican ese día). */
export function reglasCumplidas(items: { regla: ReglaId; ok: boolean; aplica: boolean }[]): ReglaId[] {
  return items.filter((i) => i.aplica && i.ok).map((i) => i.regla);
}

/** Une los logros anteriores con los de hoy, sin repetir y en un orden estable. */
export function sumarLogros(previos: ReglaId[], hoy: ReglaId[]): ReglaId[] {
  return [...new Set([...previos, ...hoy])];
}

/** Compañeros cuyo logro ya se cumplió (el principal siempre está). */
export function desbloqueados(logros: ReglaId[], personajes: Personaje[]): Personaje[] {
  return personajes.filter((p) => !p.desbloqueo || logros.includes(p.desbloqueo.regla));
}

/** Los que se desbloquean por primera vez con los logros de hoy. */
export function nuevosCompaneros(previos: ReglaId[], hoy: ReglaId[], personajes: Personaje[]): Personaje[] {
  const antes = new Set(desbloqueados(previos, personajes).map((p) => p.id));
  return desbloqueados(sumarLogros(previos, hoy), personajes).filter((p) => !antes.has(p.id));
}

export function frasePara(estado: EstadoMascota, frases: Record<EstadoMascota, string[]>, semilla = 0): string {
  const lista = frases[estado];
  return lista[Math.abs(semilla) % lista.length];
}
