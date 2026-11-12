import type { Catalogo, Nivel, Plan } from '../types';

export const ENTRENO_INICIAL = 'descanso';

export function planVacio(nivel: Nivel): Plan {
  return {
    entreno: ENTRENO_INICIAL,
    comidas: Object.fromEntries(nivel.comidas.map((c) => [c.id, [] as string[]])),
  };
}

export function idsUsados(plan: Plan): string[] {
  return Object.values(plan.comidas).flat();
}

export function porcionesColocadas(plan: Plan): number {
  return idsUsados(plan).length;
}

export function disponibles(nivel: Nivel, plan: Plan): string[] {
  const usados = new Set(idsUsados(plan));
  return nivel.mano.filter((id) => !usados.has(id));
}

export type ResultadoPlan = { ok: true; plan: Plan } | { ok: false; error: string };

/** Comidas del nivel donde tiene sentido colocar ese alimento. */
export function comidasCompatibles(nivel: Nivel, alimentoId: string, cat: Catalogo): string[] {
  const a = cat.alimentos[alimentoId];
  if (!a) return [];
  return nivel.comidas.filter((c) => a.momentos.includes(c.id)).map((c) => c.id);
}

export function agregar(
  nivel: Nivel,
  plan: Plan,
  comidaId: string,
  alimentoId: string,
  cat: Catalogo,
): ResultadoPlan {
  const comida = nivel.comidas.find((c) => c.id === comidaId);
  if (!comida) return { ok: false, error: 'Esa comida no existe en este nivel.' };
  if (!nivel.mano.includes(alimentoId)) return { ok: false, error: 'Ese alimento no está en la despensa.' };
  const alimento = cat.alimentos[alimentoId];
  if (!alimento) return { ok: false, error: 'Alimento desconocido.' };
  if (!alimento.momentos.includes(comidaId)) {
    return { ok: false, error: `${alimento.nombre} no va bien en ${comida.nombre.toLowerCase()}. Probá en otra comida.` };
  }
  if (idsUsados(plan).includes(alimentoId)) return { ok: false, error: 'Ese alimento ya está en el plato.' };
  const actual = plan.comidas[comidaId] ?? [];
  if (actual.length >= comida.capacidad) {
    return { ok: false, error: `${comida.nombre} ya está completo (${comida.capacidad} porciones).` };
  }
  return {
    ok: true,
    plan: { ...plan, comidas: { ...plan.comidas, [comidaId]: [...actual, alimentoId] } },
  };
}

/**
 * Coloca un alimento donde corresponde: en la comida seleccionada si es compatible y tiene lugar;
 * si no, en la primera comida compatible con lugar.
 */
export function colocarAuto(
  nivel: Nivel,
  plan: Plan,
  alimentoId: string,
  seleccionada: string | null,
  cat: Catalogo,
): ResultadoPlan {
  const compatibles = comidasCompatibles(nivel, alimentoId, cat);
  const orden = seleccionada && compatibles.includes(seleccionada)
    ? [seleccionada, ...compatibles.filter((c) => c !== seleccionada)]
    : compatibles;
  let ultimoError = 'No hay lugar para este alimento.';
  for (const comidaId of orden) {
    const r = agregar(nivel, plan, comidaId, alimentoId, cat);
    if (r.ok) return r;
    ultimoError = r.error;
  }
  if (orden.length > 0) {
    const nombres = orden.map((id) => nivel.comidas.find((c) => c.id === id)?.nombre.toLowerCase()).join(' y ');
    return { ok: false, error: `Las comidas donde va (${nombres}) ya están completas. Sacá algo para hacer lugar.` };
  }
  return { ok: false, error: ultimoError };
}

export function quitar(plan: Plan, alimentoId: string): Plan {
  const comidas: Record<string, string[]> = {};
  for (const [id, lista] of Object.entries(plan.comidas)) {
    comidas[id] = lista.filter((a) => a !== alimentoId);
  }
  return { ...plan, comidas };
}

export function elegirEntreno(nivel: Nivel, plan: Plan, entrenoId: string): Plan {
  return nivel.entrenamientos.includes(entrenoId) ? { ...plan, entreno: entrenoId } : plan;
}

/** Valida estructura completa de un plan (p. ej. uno restaurado desde IndexedDB). */
export function validarPlan(nivel: Nivel, plan: Plan, cat: Catalogo): string[] {
  const errores: string[] = [];
  if (!nivel.entrenamientos.includes(plan.entreno)) errores.push(`Entrenamiento inválido: ${plan.entreno}`);
  const vistos = new Set<string>();
  for (const comida of nivel.comidas) {
    const lista = plan.comidas[comida.id] ?? [];
    if (lista.length > comida.capacidad) errores.push(`${comida.id} excede su capacidad`);
    for (const a of lista) {
      if (!nivel.mano.includes(a)) errores.push(`${a} no está en la despensa`);
      if (!cat.alimentos[a]?.momentos.includes(comida.id)) errores.push(`${a} no corresponde a ${comida.id}`);
      if (vistos.has(a)) errores.push(`${a} repetido`);
      vistos.add(a);
    }
  }
  for (const id of Object.keys(plan.comidas)) {
    if (!nivel.comidas.some((c) => c.id === id)) errores.push(`Comida desconocida: ${id}`);
  }
  return errores;
}

/** Devuelve un plan seguro: descarta lo inválido en lugar de romper la partida guardada. */
export function sanearPlan(nivel: Nivel, plan: Plan | undefined, cat: Catalogo): Plan {
  const base = planVacio(nivel);
  if (!plan || typeof plan !== 'object') return base;
  let saneado: Plan = elegirEntreno(nivel, base, String(plan.entreno));
  for (const comida of nivel.comidas) {
    for (const a of plan.comidas?.[comida.id] ?? []) {
      const r = agregar(nivel, saneado, comida.id, a, cat);
      if (r.ok) saneado = r.plan;
    }
  }
  return saneado;
}
